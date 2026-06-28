"""
FocusLens — PyTorch Model Inference Server
FastAPI service that loads your trained multimodal ADHD model and serves predictions.

Start with:
    uvicorn model_server:app --host 0.0.0.0 --port 8000

Expects your model checkpoint at: ./checkpoints/model.pt
"""

import os
import math
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

app = FastAPI(title="FocusLens Model Server", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# ─── Model architecture (must match your training code exactly) ────────────────

class TinyTCN(nn.Module):
    """1D TCN encoder for activity and HRV time-series windows."""
    def __init__(self, in_channels: int = 1, hidden: int = 64, dropout: float = 0.2):
        super().__init__()
        self.net = nn.Sequential(
            nn.Conv1d(in_channels, hidden, kernel_size=7, padding=3),
            nn.BatchNorm1d(hidden),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Conv1d(hidden, hidden, kernel_size=5, padding=2),
            nn.BatchNorm1d(hidden),
            nn.ReLU(),
            nn.Dropout(dropout),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: [batch, channels, time]
        out = self.net(x)
        return out.mean(dim=-1)   # global average pool → [batch, hidden]


class MultimodalADHDModel(nn.Module):
    """
    Multimodal ADHD model with three branches (activity, HRV, CPT-II).
    Each branch produces an independent classification output.
    Missing branches are handled by zeroing their contribution.
    """
    def __init__(
        self,
        cpt_dim: int = 9,       # omissions_t, commissions_t, hit_rt_mean_t,
                                  # hit_rt_sd_t, d_prime, perseverations_t,
                                  # block_change, isi_change, confidence_index_t
        tcn_hidden: int = 64,
        clf_hidden: int = 128,
        n_classes: int = 2,
        dropout: float = 0.2,
    ):
        super().__init__()
        self.activity_encoder = TinyTCN(1, tcn_hidden, dropout)
        self.hrv_encoder      = TinyTCN(1, tcn_hidden, dropout)

        fusion_dim = tcn_hidden + cpt_dim   # 73

        # Per-branch classifier heads
        def make_head():
            return nn.Sequential(
                nn.Linear(fusion_dim, clf_hidden),
                nn.ReLU(),
                nn.Dropout(dropout),
                nn.Linear(clf_hidden, n_classes),
            )

        self.activity_head = make_head()
        self.hrv_head      = make_head()

        # CPT-only head (when no time-series available)
        self.cpt_head = nn.Sequential(
            nn.Linear(cpt_dim, clf_hidden),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(clf_hidden, n_classes),
        )

    def forward(
        self,
        cpt_features:    Optional[torch.Tensor] = None,   # [batch, 9]
        activity_windows: Optional[torch.Tensor] = None,  # [batch, 1, 512]
        hrv_windows:      Optional[torch.Tensor] = None,  # [batch, 1, 512]
    ):
        logits_list = []

        if activity_windows is not None and cpt_features is not None:
            act_emb = self.activity_encoder(activity_windows)         # [B, 64]
            act_fused = torch.cat([act_emb, cpt_features], dim=-1)   # [B, 73]
            logits_list.append(self.activity_head(act_fused))

        if hrv_windows is not None and cpt_features is not None:
            hrv_emb = self.hrv_encoder(hrv_windows)
            hrv_fused = torch.cat([hrv_emb, cpt_features], dim=-1)
            logits_list.append(self.hrv_head(hrv_fused))

        if cpt_features is not None and not logits_list:
            logits_list.append(self.cpt_head(cpt_features))

        if not logits_list:
            raise ValueError("At least one modality must be provided.")

        # Average logits across available branches
        stacked = torch.stack(logits_list, dim=0).mean(dim=0)   # [B, 2]
        return stacked


# ─── Load model checkpoint ────────────────────────────────────────────────────

CHECKPOINT_PATH = os.environ.get("MODEL_CHECKPOINT", "./checkpoints/model.pt")
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model: Optional[MultimodalADHDModel] = None

def load_model():
    global model
    if not os.path.exists(CHECKPOINT_PATH):
        print(f"⚠  No checkpoint found at {CHECKPOINT_PATH} — running in mock mode.")
        return

    print(f"Loading model from {CHECKPOINT_PATH} on {device}...")
    checkpoint = torch.load(CHECKPOINT_PATH, map_location=device)

    m = MultimodalADHDModel()
    # Handle both raw state_dict and wrapped checkpoint formats
    state = checkpoint.get("model_state_dict", checkpoint)
    m.load_state_dict(state)
    m.eval().to(device)
    model = m
    print("Model loaded successfully.")

load_model()


# ─── Request / Response schemas ───────────────────────────────────────────────

class CptFeatures(BaseModel):
    omissions_t:          float
    commissions_t:        float
    hit_rt_mean_t:        float
    hit_rt_sd_t:          float
    detectability_d_prime: float
    perseverations_t:     float
    block_change:         float
    isi_change:           float
    confidence_index_t:   float

class ModalityCpt(BaseModel):
    source: str = "game"      # "game" | "self_report"
    features: CptFeatures

class ModalityActivity(BaseModel):
    confidence_tier: str      # "standard" | "reduced" | "low"
    windows: List[List[float]]  # list of 512-length float arrays

class ModalityHrv(BaseModel):
    confidence_tier: str
    windows: List[List[float]]

class InferenceRequest(BaseModel):
    session_id: str
    cpt:      Optional[ModalityCpt]      = None
    activity: Optional[ModalityActivity] = None
    hrv:      Optional[ModalityHrv]      = None

class BranchContributions(BaseModel):
    cpt:      Optional[float] = None
    activity: Optional[float] = None
    hrv:      Optional[float] = None

class InferenceResponse(BaseModel):
    session_id:           str
    adhd_probability:     float
    likelihood_band:      str
    likelihood_band_label: str
    modalities_used:      List[str]
    confidence_tier:      str
    confidence_label:     str
    uncertainty_interval: List[float]
    branch_contributions: BranchContributions
    model_version:        str
    inferred_at:          str


# ─── Inference helpers ────────────────────────────────────────────────────────

CPT_FEATURE_ORDER = [
    "omissions_t", "commissions_t", "hit_rt_mean_t", "hit_rt_sd_t",
    "detectability_d_prime", "perseverations_t",
    "block_change", "isi_change", "confidence_index_t",
]

def cpt_to_tensor(features: CptFeatures) -> torch.Tensor:
    vals = [getattr(features, k) for k in CPT_FEATURE_ORDER]
    return torch.tensor(vals, dtype=torch.float32).unsqueeze(0).to(device)

def windows_to_tensor(windows: List[List[float]]) -> torch.Tensor:
    arr = np.array(windows, dtype=np.float32)   # [n_windows, 512]
    # Average across windows → single representative window
    avg = arr.mean(axis=0)                        # [512]
    return torch.tensor(avg).unsqueeze(0).unsqueeze(0).to(device)  # [1, 1, 512]

def get_band(p: float):
    if p < 0.30: return "low",      "Low indication of ADHD-like traits"
    if p < 0.55: return "moderate", "Some indication of ADHD-like traits"
    if p < 0.75: return "elevated", "Elevated indication of ADHD-like traits"
    return "high", "Strong indication of ADHD-like traits"

def get_confidence(mods: List[str]):
    n, has_cpt = len(mods), "cpt" in mods
    if n == 0:  return "low",         "No data collected"
    if n == 3:  return "high",        "Full assessment"
    if n == 2 and "activity" in mods and "hrv" in mods: return "medium-high", "Physiological assessment"
    if n == 2 and has_cpt: return "medium",     "Partial assessment"
    if has_cpt: return "medium-low",  "Attention only"
    return "low", "Single modality"


# ─── Mock inference (used when no checkpoint is loaded) ───────────────────────

def mock_infer(req: InferenceRequest) -> dict:
    """Fallback heuristic when no model checkpoint is present."""
    mods, logit = [], -0.4
    cpt_p = act_p = hrv_p = None

    if req.cpt:
        mods.append("cpt")
        f = req.cpt.features
        cpt_logit = (
            ((f.commissions_t - 50) / 10) * 0.50 +
            ((f.hit_rt_sd_t    - 50) / 10) * 0.45 +
            ((f.omissions_t    - 50) / 10) * 0.30 -
            (f.detectability_d_prime > 2) * 0.40
        )
        cpt_p = round(1 / (1 + math.exp(-cpt_logit)), 2)
        logit += cpt_logit * (0.6 if req.cpt.source == "self_report" else 1.0)

    if req.activity:
        mods.append("activity")
        act_logit = -0.1
        act_p = round(1 / (1 + math.exp(-act_logit)), 2)
        logit += act_logit * 0.3

    if req.hrv:
        mods.append("hrv")
        hrv_p = 0.45
        logit += 0.05

    prob = max(0.05, min(0.95, 1 / (1 + math.exp(-logit))))
    return {"prob": prob, "mods": mods, "cpt_p": cpt_p, "act_p": act_p, "hrv_p": hrv_p}


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None, "device": str(device)}

@app.post("/infer", response_model=InferenceResponse)
def infer(req: InferenceRequest):
    mods = []
    cpt_p = act_p = hrv_p = None

    if model is None:
        # No checkpoint — use mock heuristic
        r = mock_infer(req)
        prob, mods = r["prob"], r["mods"]
        cpt_p, act_p, hrv_p = r["cpt_p"], r["act_p"], r["hrv_p"]
        model_version = "mock"
    else:
        # Real model inference
        with torch.no_grad():
            cpt_t   = cpt_to_tensor(req.cpt.features)      if req.cpt      else None
            act_t   = windows_to_tensor(req.activity.windows) if req.activity else None
            hrv_t   = windows_to_tensor(req.hrv.windows)      if req.hrv      else None

            if req.cpt:      mods.append("cpt")
            if req.activity: mods.append("activity")
            if req.hrv:      mods.append("hrv")

            logits = model(cpt_features=cpt_t, activity_windows=act_t, hrv_windows=hrv_t)
            probs  = F.softmax(logits, dim=-1)
            prob   = float(probs[0, 1])   # probability of ADHD class

            # Per-branch probabilities (re-run each branch individually)
            if req.cpt and req.activity:
                act_logits = model(cpt_features=cpt_t, activity_windows=act_t)
                act_p = round(float(F.softmax(act_logits, dim=-1)[0, 1]), 2)
            if req.cpt and req.hrv:
                hrv_logits = model(cpt_features=cpt_t, hrv_windows=hrv_t)
                hrv_p = round(float(F.softmax(hrv_logits, dim=-1)[0, 1]), 2)
            if req.cpt:
                cpt_logits = model(cpt_features=cpt_t)
                cpt_p = round(float(F.softmax(cpt_logits, dim=-1)[0, 1]), 2)

        model_version = "1.0.0"

    prob = round(prob, 2)
    band, band_label = get_band(prob)
    tier, conf_label = get_confidence(mods)
    spread = 0.10 if len(mods) == 3 else 0.15 if len(mods) == 2 else 0.22

    return InferenceResponse(
        session_id=req.session_id,
        adhd_probability=prob,
        likelihood_band=band,
        likelihood_band_label=band_label,
        modalities_used=mods,
        confidence_tier=tier,
        confidence_label=conf_label,
        uncertainty_interval=[round(max(0.02, prob - spread), 2), round(min(0.98, prob + spread), 2)],
        branch_contributions=BranchContributions(cpt=cpt_p, activity=act_p, hrv=hrv_p),
        model_version=model_version,
        inferred_at=datetime.utcnow().isoformat() + "Z",
    )
