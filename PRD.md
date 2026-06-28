# Product Requirements Document
## ADHD Likelihood Assessment Web Application

**Version:** 1.0  
**Status:** Draft — Pre-Development  
**Last Updated:** 2026-06-21

---

## Table of Contents

1. [Product Overview & Goals](#1-product-overview--goals)
2. [Target Users](#2-target-users)
3. [Core Data Collection — Gamified Assessment](#3-core-data-collection--gamified-assessment)
4. [Prediction Experience with Partial/Missing Modalities](#4-prediction-experience-with-partialmissing-modalities)
5. [Results & Reporting Page](#5-results--reporting-page)
6. [Information Architecture / User Flow](#6-information-architecture--user-flow)
7. [Data Privacy, Security & Compliance](#7-data-privacy-security--compliance)
8. [Technical Architecture](#8-technical-architecture)
9. [Success Metrics](#9-success-metrics)
10. [Open Questions & Risks](#10-open-questions--risks)
11. [Phase 1 / Phase 2 Scoping](#11-phase-1--phase-2-scoping)

---

## 1. Product Overview & Goals

### 1.1 Elevator Pitch

This application is a gamified, browser-based assessment tool that collects three types of behavioral and physiological data — sustained-attention performance (via a reaction-time mini-game), wrist accelerometer activity, and heart-rate variability — and feeds them into a trained multimodal deep learning model to return an informational ADHD-likelihood estimate. The product is designed around two parallel goals: giving curious adults a personalized and engaging way to explore whether their attentional patterns are consistent with ADHD-like traits, and continuously growing a high-quality labeled dataset that makes the underlying model progressively more accurate through an opt-in data-donation pipeline. Every piece of the UX is designed to maximize completion rate, data quality, and user trust simultaneously.

---

### 1.2 Non-Goals and Product Principles

> **CRITICAL PRODUCT PRINCIPLE — Disclaimer-First Design:**  
> This application is **not a clinical diagnostic tool**. It does **not** diagnose ADHD, does not constitute a medical opinion, and is **not a substitute for evaluation by a licensed clinician**. This disclaimer is not a footer footnote — it is a first-class UI element that appears on the landing page, before data collection begins, immediately before any prediction is shown, and on every results or share screen. Burying or visually minimizing this disclaimer is a product defect, not a cosmetic issue.

**Explicit non-goals:**

- **Not a medical device.** The model output is an informational likelihood estimate, not a diagnosis, a screening instrument validated for clinical use, or a recommendation for treatment.
- **Not a replacement for professional evaluation.** The app explicitly directs users toward qualified clinicians and provides resources for formal assessment.
- **Not designed for minors.** The app is scoped to adults (18+). Gating for underage users is required at signup.
- **Not a therapy or intervention platform.** No treatment advice, medication discussion, or self-management coaching is offered.
- **Not a real-time monitoring or alerting system.** Results are point-in-time snapshots and carry no ongoing clinical obligation.

---

### 1.3 Primary Goals

| Priority | Goal | Success Indicator |
|---|---|---|
| P0 | **Data collection engine:** Grow a high-quality, labeled dataset for model retraining by rewarding users who complete assessments and optionally donate their results. | Labeled session submission rate ≥ 20% of completed sessions |
| P0 | **Informational prediction:** Deliver a credible, non-alarmist ADHD-likelihood estimate to users who have completed at least one modality. | Prediction delivered to ≥ 70% of users who start an assessment |
| P1 | **Engagement and completion:** Design each data-collection module as a short, rewarding game-like experience so users complete multiple modalities rather than abandoning after one. | ≥ 40% of users complete 2 or more modalities in a single session |
| P2 | **Iterative improvement loop:** Allow users to return, add missing modalities, and receive an updated prediction with higher confidence. | ≥ 15% of returning users improve their prediction tier |

---

## 2. Target Users

### 2.1 Primary User Persona — Curious Adult

- Adults (18–55) who have wondered whether they have ADHD but have not pursued or cannot easily access a formal evaluation.
- Likely to have taken informal ADHD quizzes before; expect brevity but are willing to invest 10–20 minutes if the experience is engaging.
- Privacy-conscious: skeptical about sharing biometric data; need a clear value exchange (you give data → you get a result).
- May be currently undiagnosed, self-diagnosed, or recently diagnosed and looking for corroboration.

### 2.2 Secondary User Persona — Researcher / Clinician

- Researchers running screening studies at scale who want to collect CPT-II-analog and physiological data from participants remotely.
- Need exportable, structured data formats, study-scoped access, and bulk download.
- May need IRB-compliant consent flows (handled as a configuration option rather than the default UI).
- **Phase 2 scope.** Researcher accounts and study management are not MVP features.

### 2.3 Accessibility Requirements

ADHD assessments inherently risk creating barriers for users with the very traits being measured. The following accommodations are required, not optional:

| Impairment Type | Accommodation |
|---|---|
| Motor impairment | All game interactions must be fully keyboard-accessible (spacebar/enter as primary action key). Touch targets must be ≥ 44×44px. Pointer-event alternatives for fine motor difficulty. |
| Visual impairment | High-contrast mode toggle. All game stimuli must have WCAG 2.1 AA–compliant contrast. Screen reader compatibility for non-timed screens. |
| Slow reaction time (not impairment, just baseline) | The game must not penalize or exclude users with slow but consistent RTs; the model uses RT *variability* and patterns, not just absolute speed. |
| Unable to complete timed tasks | A **non-timed fallback path** must exist for the CPT-II module: users who cannot complete the reaction-time game can substitute a short validated self-report questionnaire (ASRS-style) as the sole CPT-II-analog input. This fallback produces lower-confidence input, flagged accordingly in results. |
| No wearable / no camera | Users who cannot provide activity or HRV data must always have a clear "skip this module" path, and the prediction must still be available based on whatever data was provided. |

---

## 3. Core Data Collection — Gamified Assessment

Each module is designed as a self-contained experience that can be completed in under 10 minutes, framed as a "challenge" rather than a test. Users should not feel like they are being evaluated; they should feel like they are playing a short game and learning something about themselves.

---

### 3.1 Module A: Attention Challenge (CPT-II Analog)

#### 3.1.1 Purpose and Framing

Framed to the user as: **"Focus Challenge — test your attention and reflexes in 6 minutes."**

Users are not told which specific mistakes are being tracked (to avoid behavioral bias), but a transparent **"What this measures"** expandable info panel is available at all times, stating: "This game measures how consistently you respond over time, how quickly you react, and whether your responses change as the challenge gets harder." No mention of omissions/commissions by name in the main UI.

#### 3.1.2 Game Mechanics — Go/No-Go Reaction Task

**Core mechanic:** A stimulus appears in the center of the screen. The user presses Space / taps the stimulus for **go** stimuli and withholds for **no-go** stimuli.

**Stimuli:**
- Go stimulus: A filled circle (default: blue). On each go trial, the circle appears for exactly **200ms** before it disappears. User must respond within a **1000ms response window** (response window starts at stimulus onset).
- No-go stimulus: An outlined circle (same size, same position, no fill). User must not respond during a **1000ms** window.
- Inter-stimulus interval (ISI): varies by block condition (see block structure below).
- Stimulus onset: stimulus appears centered on screen; no predictive cue.

**Ratio:** 80% go, 20% no-go (matching standard CPT-II distribution).

#### 3.1.3 Block Structure

The session is divided into **6 blocks**, each containing **30 trials** (180 trials total). Block and ISI conditions vary to produce the `block_change` and `isi_change` signals the model requires.

| Block | Trials | ISI | Go% | No-Go% | Notes |
|---|---|---|---|---|---|
| 1 (Warmup) | 30 | 1500ms | 80% | 20% | Slow, comfortable |
| 2 | 30 | 1500ms | 80% | 20% | Baseline |
| 3 | 30 | 1000ms | 80% | 20% | ISI shortens — vigilance demand increases |
| 4 | 30 | 1000ms | 80% | 20% | Sustained demand |
| 5 | 30 | 3500ms | 80% | 20% | ISI lengthens — boredom/inattention demand |
| 6 | 30 | 3500ms | 80% | 20% | Fatigue signal |

Each block is ~90 seconds. Total session wall-clock time: ~9 minutes with inter-block breaks. Inter-block break: 15-second countdown with animated rest prompt. Block transition is shown as a progress bar labeled "Round X of 6" to reinforce gamification.

#### 3.1.4 Raw Event Schema

Every trial is logged as a single event object and sent to the backend at session completion:

```
TrialEvent {
  trial_index: int           // 0–179
  block_index: int           // 0–5
  isi_ms: int                // actual ISI used for this trial
  stimulus_type: "go" | "nogo"
  stimulus_onset_ms: int     // epoch ms from session start
  response_given: bool
  response_time_ms: int | null  // null if no response; RT from stimulus onset
  is_perseveration: bool     // true if response arrived before stimulus onset (< 150ms after prior trial end)
}
```

#### 3.1.5 Feature Derivation — Raw Events → Model Input

The backend transforms collected `TrialEvent[]` arrays into the CPT-II-analog feature vector before model inference. All features should match T-score equivalents where possible (z-score normalised against the training dataset distribution); raw values are also stored.

| Model Feature | Derivation from TrialEvent[] |
|---|---|
| `omissions` | Count of `stimulus_type == "go"` AND `response_given == false` |
| `commissions` | Count of `stimulus_type == "nogo"` AND `response_given == true` |
| `hit_rt_mean` | Mean of `response_time_ms` for correct go trials only (non-null) |
| `hit_rt_sd` | Std dev of same set — directly maps to RT variability/SD feature |
| `detectability_d_prime` | Computed as Z(hit_rate) − Z(false_alarm_rate) where hit_rate = hits/go_trials, false_alarm_rate = commissions/nogo_trials |
| `perseverations` | Count of `is_perseveration == true` events |
| `block_change` | Linear regression slope of block-level error rate across blocks 1–6 (captures degradation over time) |
| `isi_change` | Difference in commission rate between short-ISI blocks (3–4) and long-ISI blocks (5–6) |
| `confidence_index_t` | Composite T-score: weighted sum of omissions_t, commissions_t, hit_rt_sd_t normalized to training distribution |

Minimum valid session: ≥ 100 valid go-trial responses (non-null RT). Sessions below this threshold are flagged as low-quality and the user is prompted to retry, but the data is still stored.

#### 3.1.6 Gamification Layer

- **Score:** Points awarded per correct go response (base: 10pts), with a streak multiplier (×1.5 at 5-streak, ×2.0 at 10-streak) for consecutive correct trials. Commissions and missed gos break the streak.
- **End-of-block summary:** Brief card showing "Caught: X / Missed: X / False alarms: X" with a relative bar ("Better than X% of players"). Framing is competitive/curious, not clinical.
- **Badges:** "Iron Focus" (0 omissions in a block), "Hair Trigger" (hit RT < 250ms average), "Rock Steady" (hit RT SD < 80ms).
- Scores and badges are visible in the user's progress dashboard but never labeled as diagnostic.

#### 3.1.7 Non-Timed Fallback

Users who opt out of the reaction-time game (via an "I'd prefer a questionnaire" option on the module intro screen) are presented a 15-item ASRS-v1.1-style self-report in swipe-card format. Responses map to a reduced feature set (`inattention_score`, `hyperactivity_score`). The model receives these as a degraded CPT-II input with a `source: "self_report"` flag that triggers lower-confidence inference. This path is clearly labeled: "Questionnaire mode — standard confidence."

---

### 3.2 Module B: Activity Data Collection

#### 3.2.1 Purpose

Collect multi-day wrist accelerometer time-series data sufficient for the model's TinyTCN activity encoder. The encoder requires fixed-length windowed segments; the minimum practical collection window is **3 consecutive days** of data to produce at least 1 reliable window after artifact rejection.

#### 3.2.2 Data Sources and Confidence Tiers

| Source | Method | Confidence Tier | Minimum Duration |
|---|---|---|---|
| Apple HealthKit (iOS) | HealthKit API, `HKQuantityTypeIdentifierStepCount` + raw accelerometer if available | **Standard** | 3 days of activity data |
| Google Fit / Android Health | Health Connect API, `STEPS_RECORD` + `EXERCISE_SESSION_RECORD` | **Standard** | 3 days |
| Device accelerometer (passive, in-app) | Browser `DeviceMotionEvent` API; user opens app daily and leaves tab open for ≥ 30 min/day | **Reduced** — short window, user compliance dependent | 3 × 30-minute sessions |
| Manual activity log | User self-reports daily activity level on a 5-point scale (Sedentary → Very Active) for 3+ days | **Low** — no raw signal, categorical proxy only | 3 days of entries |
| Skip / Not available | No activity data provided | **Absent** — prediction proceeds without this modality | — |

Activity data confidence level is stored as `activity_confidence_tier: "standard" | "reduced" | "low" | "absent"` and passed to the model service alongside the feature vector.

#### 3.2.3 Data Processing

All activity data collected via wearable/HealthKit/GoogleFit is:
1. Resampled to a uniform 30Hz equivalent (or nearest available) in 1-minute epoch bins.
2. Segmented into fixed-length windows of **512 time steps** (matching training data windowing) with 50% overlap.
3. Artifact-rejected: windows with >20% missing samples are dropped.
4. Normalized per-session (zero-mean, unit-variance).
5. Up to 20 valid windows are submitted; the median prediction across windows is used.

#### 3.2.4 UX Flow

1. Module intro screen: "Day-by-day activity patterns can reveal attention-related differences. Connect your wearable or let us track your movement for a few days."
2. If user grants HealthKit/GoogleFit permission: show a "Syncing — data collected over the last 7 days" state. If ≥3 days available: "Enough data — ready to analyze." If <3 days: "Keep the app installed and come back in X days."
3. If user declines wearable: offer in-app passive tracking or manual log.
4. Progress shown in main dashboard as "Activity: 2 of 3 days collected" with a calendar strip.
5. "Add later" option always visible — users can return to complete this module after completing others.

---

### 3.3 Module C: HRV Data Collection

#### 3.3.1 Purpose

Collect heart-rate variability time series sufficient for the model's TinyTCN HRV encoder. Same windowing constraints as activity; minimum recommended duration is a **5-minute resting HRV recording**.

#### 3.3.2 Data Sources and Confidence Tiers

| Source | Method | Confidence Tier | Minimum Duration |
|---|---|---|---|
| Apple HealthKit (iOS) | `HKQuantityTypeIdentifierHeartRateVariabilitySDNN` + R-R intervals | **Standard** | 5 min resting |
| Wearable (Polar, Garmin, Fitbit via OAuth) | Manufacturer API for R-R intervals | **Standard** | 5 min resting |
| Phone camera PPG | Guided finger-on-camera session using browser `getUserMedia` + photoplethysmography signal extraction | **Reduced** — signal quality varies significantly by lighting/device | 3 min guided session |
| Skip / Not available | No HRV data provided | **Absent** | — |

Note: Camera-based PPG is a **Phase 2 feature** due to the signal quality validation risk called out in Section 10. Phase 1 will only offer wearable/HealthKit paths and skip.

#### 3.3.3 Camera PPG UX Flow (Phase 2)

1. Intro card: "For a rough HRV reading, place your fingertip gently over your phone's rear camera. This takes about 3 minutes."
2. Real-time signal quality indicator (green/yellow/red): derived from signal-to-noise ratio of the raw PPG waveform. Red = instruct user to adjust finger pressure/lighting.
3. Countdown timer. If signal quality was "green" for ≥ 60% of the session: mark as valid. Otherwise: warn user and offer retry.
4. R-R intervals extracted server-side from the raw PPG signal using a validated peak-detection algorithm. SDNN and RMSSD computed and used as HRV feature input.

#### 3.3.4 HRV Data Confidence

HRV confidence tier is stored as `hrv_confidence_tier: "standard" | "reduced" | "absent"` and passed to the model service.

---

### 3.4 Module D: Self-Report Questionnaire

#### 3.4.1 Purpose

A short adaptive questionnaire that (a) collects demographic and contextual metadata to improve model generalizability, (b) provides supplementary ADHD screening signal via validated self-report items, and (c) establishes the baseline context the model needs to interpret predictions (e.g., age, sleep quality, recent stressors).

#### 3.4.2 Format

- **Card swipe / quick tap** format: one item per screen, never a scrolling form.
- **Frequency-based items** (never/rarely/sometimes/often/very often) displayed as a 5-position horizontal slider with emoji anchors.
- **Binary items** (yes/no) displayed as two large tap targets.
- Maximum **20 items** total. Estimated completion: 3–4 minutes.

#### 3.4.3 Item Categories

| Category | Example Items | Count |
|---|---|---|
| Demographic | Age range, biological sex (optional), education level | 3 |
| ASRS-analog attention | "How often do you have difficulty sustaining attention in tasks?" | 6 |
| ASRS-analog hyperactivity/impulsivity | "How often do you feel restless or fidgety?" | 6 |
| Contextual (confounders) | Sleep quality last week, stress level, caffeine/medication use today | 3 |
| Consent to data donation | Binary: "Would you like to share your results to help improve the model?" | 1 |
| Diagnosis status | "Have you ever been diagnosed with ADHD by a clinician?" (Optional; skip clearly available) | 1 |

#### 3.4.4 Data Model

```
QuestionnaireResponse {
  session_id: uuid
  age_range: "18-24" | "25-34" | "35-44" | "45-54" | "55+"
  sex: "male" | "female" | "nonbinary" | "prefer_not_to_say" | null
  education: "highschool" | "bachelors" | "graduate" | "other" | null
  asrs_inattention_score: int  // 0–24 (6 items × 0–4 scale)
  asrs_hyperactivity_score: int  // 0–24
  sleep_quality: 1 | 2 | 3 | 4 | 5  // 1=very poor, 5=excellent
  stress_level: 1 | 2 | 3 | 4 | 5
  confounders: string[]  // e.g., ["caffeine", "stimulant_medication", "sleep_deprived"]
  data_donation_consent: bool
  diagnosis_label: "adhd" | "no_adhd" | "unsure" | null  // only if user provides
  submitted_at: timestamp
}
```

---

### 3.5 Data Labeling for Model Retraining

#### 3.5.1 Consent Flow

Data donation is **strictly opt-in**. The opt-in is surfaced once, as the final card of the questionnaire (Module D). No dark patterns: no pre-checked boxes, no default-on toggle.

Consent screen copy (exact):
> "Would you like to contribute your assessment data to help improve this model for others?  
> Your activity, HRV, game performance, and questionnaire responses would be anonymized and added to a research dataset. Your name and contact details will never be included.  
> You can withdraw consent at any time from your account settings, which will remove your data from any future training runs."

Users who consent see their data tagged `training_eligible: true`. Users who do not consent still receive a prediction but their data is stored only for their own account (prediction history, not training pool).

#### 3.5.2 Diagnosis Label Submission

If a user reports a clinical diagnosis label (Section 3.4.3) AND consents to data donation, that session is entered into the high-value "labeled" training pool with `label_source: "self_reported_clinical"`. Sessions without a diagnosis label enter the pool with `label_source: "model_predicted"` (soft label from the model's own output — useful for semi-supervised retraining but lower quality).

#### 3.5.3 Label Verification Gate

To reduce label noise:
- Sessions where `diagnosis_label == "adhd"` but the model's prediction confidence is extremely low (e.g., <10th percentile) are flagged for human review before entering the training pool, not rejected outright.
- Sessions with implausible game data (e.g., 0 omissions AND 0 commissions across all 180 trials) are flagged as `validity: "suspect"` and excluded from training until reviewed.

---

## 4. Prediction Experience with Partial/Missing Modalities

### 4.1 Supported Modality Combinations

The model is designed to produce a meaningful output from any non-empty subset of the three modalities. All seven non-empty subsets are supported:

| Combination | Activity | HRV | CPT-II Game | Confidence Tier | Label |
|---|---|---|---|---|---|
| All three | ✓ | ✓ | ✓ | **High** | "Full assessment" |
| Activity + HRV | ✓ | ✓ | — | **Medium-High** | "Physiological assessment" |
| Activity + CPT-II | ✓ | — | ✓ | **Medium** | "Activity + attention" |
| HRV + CPT-II | — | ✓ | ✓ | **Medium** | "Physiological + attention" |
| Activity only | ✓ | — | — | **Low** | "Activity only" |
| HRV only | — | ✓ | — | **Low** | "HRV only" |
| CPT-II only | — | — | ✓ | **Medium-Low** | "Attention only" |
| None | — | — | — | — | No prediction available |

"CPT-II only" is Medium-Low rather than Low because the CPT-II game produces a richer direct signal for ADHD-related features than a single physiological channel alone.

### 4.2 Confidence / Completeness Indicator

A persistent **modality status bar** is shown:
- On the assessment dashboard (before prediction)
- On the prediction results screen
- On any share/export view

Visual design: three pill icons labeled "Activity," "HRV," and "Attention Game," each showing one of three states:
- **Completed** (filled pill, green checkmark)
- **In progress** (half-filled pill, clock icon)
- **Not collected** (empty pill, dashed border, neutral grey)

Below the pills: a single plain-language confidence label, e.g.:

> "Based on 1 of 3 data types · **Confidence: Low**  
> Add Activity or HRV data to improve your result."

This label uses the tier from Section 4.1 and is never absent from any screen showing a prediction.

### 4.3 Encouraging Additional Modalities (Without Forcing)

After showing the initial prediction, the results screen includes a **"Improve your result"** expansion panel that:
- Shows which modality or modalities are missing.
- Shows the projected confidence tier upgrade if that modality is added (e.g., "Adding Activity data would upgrade your result to **Medium** confidence").
- Contains a single CTA button: "Add Activity data" / "Take the Attention Challenge" / "Connect HRV sensor."
- Contains an equally prominent **"I'm done — keep this result"** secondary action. This path must never feel punishing or inferior.

The "Improve your result" panel is surfaced **once** per session per missing modality. It does not repeat on every page load or reappear on the dashboard unless the user explicitly navigates to "update my assessment."

### 4.4 Session Persistence — Returning to Add Modalities

User sessions are persistent. A user who completes the CPT-II game on Monday, then returns on Thursday after 3 days of wearable tracking, can:
1. Log back in and see their existing partial prediction with the "Activity: 0 of 3 days" status.
2. Grant HealthKit permission and sync their past 3 days of data.
3. Receive an updated prediction that incorporates all completed modalities.
4. Previous predictions are stored in their history (timestamped), not overwritten, so the user can see how their prediction changed as more data was added.

**Session state machine:**

```
SessionState {
  session_id: uuid
  user_id: uuid | null  // null = guest session (limited retention)
  status: "in_progress" | "partial_prediction" | "full_prediction"
  completed_modalities: ("activity" | "hrv" | "cpt_game")[]
  activity_confidence_tier: "standard" | "reduced" | "low" | "absent"
  hrv_confidence_tier: "standard" | "reduced" | "absent"
  cpt_source: "game" | "self_report" | "absent"
  predictions: PredictionResult[]  // append-only; new predictions added when modalities added
  created_at: timestamp
  last_updated_at: timestamp
  expires_at: timestamp | null  // null for authenticated users; 30 days for guests
}
```

### 4.5 Backend API Contract — Model Service

#### 4.5.1 Inference Request Payload

The backend sends one of the following payloads to the model inference service depending on which modalities are present. The model service handles missing modalities by zeroing out or bypassing the corresponding encoder branch (matching the trained model's architecture).

```json
POST /api/v1/infer

{
  "session_id": "uuid",
  "modalities": {
    "activity": {
      "present": true,
      "confidence_tier": "standard" | "reduced" | "low",
      "windows": [
        [0.12, -0.03, 0.87, ...]  // Array of float arrays, each of length 512
      ],
      "n_windows": 12
    },
    "hrv": {
      "present": true,
      "confidence_tier": "standard" | "reduced",
      "windows": [
        [0.45, 0.38, ...]  // Same windowing convention
      ],
      "n_windows": 4
    },
    "cpt": {
      "present": true,
      "source": "game" | "self_report",
      "features": {
        "omissions_t": 52.3,
        "commissions_t": 61.1,
        "hit_rt_mean_t": 48.7,
        "hit_rt_sd_t": 70.2,
        "detectability_d_prime": 2.14,
        "perseverations_t": 55.0,
        "block_change": 0.03,
        "isi_change": 0.12,
        "confidence_index_t": 58.6
      }
    }
  }
}
```

For absent modalities, the `present` field is `false` and all other fields are omitted.

#### 4.5.2 Inference Response Payload

```json
{
  "session_id": "uuid",
  "prediction": {
    "adhd_probability": 0.73,           // Float 0–1; model output
    "likelihood_band": "elevated",       // "low" | "moderate" | "elevated" | "high"
    "likelihood_band_label": "Elevated likelihood of ADHD-like traits",
    "modalities_used": ["activity", "cpt"],
    "confidence_tier": "medium",         // from Section 4.1 table
    "uncertainty_interval": [0.61, 0.84], // 80% credible interval if available
    "branch_contributions": {
      "activity_branch_probability": 0.68,
      "hrv_branch_probability": null,
      "cpt_branch_probability": 0.79
    }
  },
  "data_quality_flags": ["cpt_low_trial_count"],  // array; empty if clean
  "model_version": "1.2.0",
  "inferred_at": "2026-06-21T10:32:00Z"
}
```

**Likelihood band thresholds** (subject to calibration with labeled data):

| Band | Probability Range | Display Label |
|---|---|---|
| low | 0.00–0.30 | "Low indication of ADHD-like traits" |
| moderate | 0.30–0.55 | "Some indication of ADHD-like traits" |
| elevated | 0.55–0.75 | "Elevated indication of ADHD-like traits" |
| high | 0.75–1.00 | "Strong indication of ADHD-like traits" |

The raw `adhd_probability` value is **not shown to the user** directly. Only the `likelihood_band_label` and uncertainty interval are displayed, to reduce false precision.

---

## 5. Results & Reporting Page

### 5.1 Page Structure

The results page is divided into five visual zones, in order:

**Zone 1 — Disclaimer Banner (always visible, always first)**  
A persistent yellow/amber banner: "For informational purposes only — not a clinical diagnosis. Always consult a qualified clinician for a formal ADHD evaluation." This banner cannot be dismissed.

**Zone 2 — Likelihood Result Card**  
- Large, non-alarmist label: e.g., "Your attention patterns show **elevated ADHD-like traits**."
- Avoid clinical language like "positive" or "diagnosis" or "you have ADHD."
- Visual: a simple 4-band horizontal bar showing which band the user's result falls in, with their band highlighted. No percentages or raw probabilities.
- Confidence/completeness bar (from Section 4.2).
- Uncertainty range in plain language: e.g., "Based on the data available, the result could range from moderate to high."

**Zone 3 — Contributing Factors**  
Plain-language summary of what contributed to the result, one item per modality used. Examples:
- "Your reaction-time consistency showed higher-than-average variability across the session."
- "Your activity patterns over the past 3 days showed lower movement regularity compared to typical non-ADHD patterns."
- "Your self-report responses indicated frequent difficulty sustaining attention."
Do not expose raw model weights or feature-level T-scores to the user. These are stored internally and exportable to researchers via a separate API (Phase 2).

**Zone 4 — "Improve Your Result" Panel** (shown only if modalities are missing)  
Per Section 4.3.

**Zone 5 — Next Steps**  
- "Talk to a professional" CTA: links to CHADD clinician finder and ADDA resources.
- "Learn more about ADHD" link to reputable resources (CDC, NIMH).
- "Save my result" / "Export PDF" (Phase 2) buttons.
- "Share" button — generates a shareable card image that includes the band label, disclaimer, and app name. Raw probability is excluded from shares. Share card includes: "This is not a diagnosis."

### 5.2 Results Persistence

- **Authenticated users:** Results are saved to their account indefinitely unless they delete them. Each prediction is timestamped and listed in a "My History" section of the dashboard.
- **Guest users:** Results are accessible via a session-specific URL for 30 days. After 30 days, results and all associated raw data are permanently deleted. Guests are shown this expiry prominently and offered account creation to preserve results.

### 5.3 PDF Export (Phase 2)

The PDF report includes: likelihood band, confidence tier, modalities used, contributing factors, date of assessment, and a prominent one-page disclaimer. It does not include raw sensor data. It is formatted for the user to share with a clinician, not as a standalone clinical document.

---

## 6. Information Architecture / User Flow

### 6.1 Full User Flow (Text Diagram)

```
LANDING PAGE
 ├── Hero: "Discover your attention patterns" + Disclaimer Banner
 ├── CTA: "Start Free Assessment"
 └── Secondary: "Learn how it works" → explainer modal

    ↓

SIGN-UP / CONTINUE AS GUEST
 ├── Email + password signup (or OAuth: Google, Apple)
 ├── Age gate: "I confirm I am 18 or older"
 ├── Consent to terms / privacy policy (required)
 └── "Continue as Guest" → creates ephemeral session (30-day retention, prominently disclosed)

    ↓

ASSESSMENT DASHBOARD (main hub)
 ├── Three module cards: [Attention Challenge] [Activity Data] [HRV Data]
 │    Each card shows: status (Not started / In progress / Complete), estimated time, confidence impact
 ├── Questionnaire card: [Quick Survey — 3 min]
 ├── Overall progress bar: "0 of 4 modules complete"
 ├── "See my result (low confidence)" CTA — visible after ANY module is complete
 └── Persistent disclaimer strip at page bottom

    ↓ (user selects a module)

MODULE EXPERIENCE (one at a time)
 │
 ├── [A] ATTENTION CHALLENGE
 │    ├── Intro screen: framing, "What this measures" expandable, accessibility options
 │    ├── Practice round: 10 trials, unscored, "Get the hang of it"
 │    ├── 6 game blocks with inter-block breaks and running score
 │    ├── End screen: score, badges earned, "Back to dashboard"
 │    └── [Fallback] → QUESTIONNAIRE MODE (15-item ASRS-style cards)
 │
 ├── [B] ACTIVITY DATA
 │    ├── Option picker: [Connect Wearable] [Track in App] [Log Manually] [Skip]
 │    ├── [Connect Wearable] → HealthKit/GoogleFit OAuth flow → sync status screen
 │    ├── [Track in App] → passive tracking onboarding → daily reminder setup → 3-day progress
 │    ├── [Log Manually] → 3-day quick-entry form (one tap per day)
 │    └── All paths → "Back to dashboard" with updated status
 │
 ├── [C] HRV DATA
 │    ├── Option picker: [Connect Wearable/HealthKit] [Use Camera (Phase 2)] [Skip]
 │    ├── [Connect Wearable] → HealthKit/OAuth flow → sync
 │    └── [Skip] → "Activity" confidence tier: Absent — clearly labeled
 │
 └── [D] QUESTIONNAIRE
      ├── 20 swipe-cards (1 per screen)
      ├── Progress indicator: "Card 7 of 20"
      └── Final card: data donation consent (opt-in)

    ↓ (after any module complete; user clicks "See my result")

RESULTS PAGE
 ├── Disclaimer banner (permanent)
 ├── Likelihood result card
 ├── Contributing factors
 ├── "Improve your result" panel (if modalities missing)
 ├── Next steps / professional resources
 └── Save / Share options

    ↓ (returning user)

MY HISTORY (dashboard tab)
 ├── Timeline of past predictions (each with date, confidence tier, band)
 ├── "Update my assessment" → back to dashboard with existing data pre-filled
 └── "Delete all my data" → permanent deletion flow with confirmation
```

### 6.2 Guest Mode vs. Account Requirements

| Feature | Guest | Account |
|---|---|---|
| Complete all modules | ✓ | ✓ |
| See prediction | ✓ | ✓ |
| Results retained > 30 days | — | ✓ |
| Add modalities and update prediction later | Limited (session URL, 30 days) | ✓ (indefinite) |
| Export PDF | — | ✓ (Phase 2) |
| Data donation to training pool | ✓ (with explicit consent, anonymized) | ✓ |
| Delete all data | ✓ (immediate, session only) | ✓ (account deletion flow) |

**Guest-to-account conversion prompt:** Shown once, after results are displayed: "Create an account to save your results and add more data later. No spam — just your data, secured." Not a modal blocker; it's a contextual banner.

---

## 7. Data Privacy, Security & Compliance

### 7.1 Data Classification

All data collected by this application is treated as **sensitive personal health data**, regardless of formal regulatory classification. This is a conservative default that protects users even in ambiguous regulatory situations.

| Data Type | Sensitivity | Retention |
|---|---|---|
| Accelerometer / activity time series | Sensitive — behavioral biometric | Per user consent; default: until account deletion |
| HRV time series | Sensitive — physiological biometric | Same |
| CPT-II game event log | Sensitive — cognitive/behavioral | Same |
| Questionnaire responses | Sensitive — self-reported health | Same |
| Diagnosis labels (if provided) | Highly Sensitive — clinical | Separately permissioned; training pool opt-in only |
| Account email / authentication data | PII | Until account deletion |
| Prediction results | Sensitive — inferred health | Until account deletion or explicit deletion |

### 7.2 Security Requirements

- **Encryption in transit:** TLS 1.3 required for all API endpoints. No HTTP fallback.
- **Encryption at rest:** All health data fields encrypted at rest using AES-256 (or cloud KMS equivalent). Encryption keys managed separately from data storage.
- **Authentication:** OAuth 2.0 / PKCE for social login. Email/password with bcrypt hashing. JWT access tokens (15-min expiry) + rotating refresh tokens.
- **Data minimization:** Only collect the minimum fields required for inference. Raw sensor data is used for feature extraction and then optionally retained (subject to consent). If a user does not consent to data donation, raw sensor data is deleted after feature extraction at session completion.
- **Tenant isolation:** User data must be logically isolated at the database level. Cross-user data queries are prohibited outside the anonymized training pipeline.
- **Anonymization for training pool:** Any data entering the training pool has direct identifiers (email, user_id) replaced with a one-way hashed session identifier before storage. No re-linkage path.

### 7.3 User Rights

All users (guest and authenticated) have the following rights, exercisable from in-app settings:

- **Access:** Download all their stored data as JSON.
- **Deletion:** Delete their account and all associated data permanently. Deletion of data already contributed to the training pool replaces the record with a null/zeroed entry; the contribution slot is removed from future training runs.
- **Consent withdrawal:** Revoke data donation consent at any time. Does not delete past contributions but prevents future ones.
- **Correction:** Contact form for correcting questionnaire data (name not on a form-level field; applies to diagnosis labels).

### 7.4 Consent Screens

Three distinct consent checkboxes at signup, all ungrouped (no single "accept all"):
1. **Terms of Service** (required to use the app)
2. **Privacy Policy** (required to use the app)
3. **Data donation to model retraining** (optional, can be changed later)

A fourth consent is surfaced in-context during data collection for wearable/camera data: "Allow this app to access your [HealthKit / camera] data for this assessment." This is separate from the signup consent.

### 7.5 Regulatory Considerations (Open Flags — Not Resolved)

The following regulatory questions are identified here as open issues requiring legal review before launch:

- **FDA SaMD (Software as a Medical Device):** The app produces a prediction about a health condition. Whether this constitutes a medical device requiring FDA clearance or is exempt as a general wellness tool under FDA guidance is an unresolved question. The product principle of "not a diagnostic tool" is a deliberate design choice intended to position toward the wellness exemption, but this must be verified by counsel.
- **HIPAA:** The app is not a Covered Entity and likely does not currently require HIPAA compliance, but if partnerships with clinicians or health systems are pursued (Phase 2), a HIPAA compliance review is required.
- **GDPR / UK GDPR:** If any EU/UK users are served, health data processing requires a lawful basis beyond consent alone, a Data Protection Impact Assessment (DPIA), and a nominated Data Protection Officer. Geographic IP-based gating should be considered until this review is complete.
- **COPPA:** Strict age gate (18+) at account creation. No data may be collected from users under 13 under any circumstances. Mechanisms to detect and handle false age declarations are required.
- **CCPA:** If serving California residents, a "Do Not Sell My Personal Information" link and response process is required.

---

## 8. Technical Architecture

### 8.1 Overview

```
[Browser Client]
      │  HTTPS (TLS 1.3)
      ▼
[API Gateway / Load Balancer]
      │
      ├──► [Auth Service]  ← JWT issuance, OAuth 2.0
      │
      ├──► [Session Service]  ← Session state, modality status, CRUD
      │
      ├──► [Data Ingestion Service]
      │         ├── Game event ingestion (CPT-II raw events → feature extraction)
      │         ├── Wearable sync (HealthKit/GoogleFit adapter, windowing pipeline)
      │         └── HRV ingestion (raw R-R intervals → windowing)
      │
      ├──► [Inference Orchestrator]
      │         ├── Assembles modality payload per Section 4.5
      │         ├── Calls Model Inference Service
      │         └── Stores prediction result
      │
      └──► [Model Inference Service]  ← Isolated, stateless
                ├── PyTorch model loaded (TorchScript or ONNX export)
                ├── Per-modality-combination code path (7 branch variants)
                └── Returns prediction payload per Section 4.5.2

[Async / Background]
      ├── Wearable sync polling (for multi-day activity data)
      ├── Training data pipeline (anonymization → labeled pool → retraining trigger)
      └── Session expiry / guest data cleanup jobs
```

### 8.2 Frontend

- **Framework:** React (TypeScript). Server-side rendering for landing/results pages (for SEO and initial load performance).
- **Game engine:** The CPT-II mini-game must use `requestAnimationFrame`-based rendering with a dedicated canvas or WebGL layer — do not rely on CSS transitions for stimulus timing, as they are not reliable to <50ms precision. Game timing must be measured using `performance.now()`, not `Date.now()`.
- **Sensor access:** Web APIs: `DeviceMotionEvent` for in-browser accelerometer; `getUserMedia` for camera PPG (Phase 2); HealthKit via iOS WKWebView bridge (requires native wrapper); Google Health Connect via Android native wrapper.
- **State management:** Session state (modality completion, prediction results) stored in backend — not client-side localStorage — to support multi-device and resumable sessions.

### 8.3 Backend

- **Language/runtime:** Node.js (TypeScript) or Python, depending on team preference. The feature extraction pipeline (CPT-II game events → feature vector; sensor windowing) should be implemented in Python given its alignment with the ML stack.
- **Database:** PostgreSQL for structured data (accounts, sessions, predictions, questionnaire responses). Object storage (S3-compatible) for raw sensor time-series data.
- **Queue:** Async jobs (wearable sync, retraining pipeline triggers) via a message queue (e.g., Redis + BullMQ or SQS).

### 8.4 Model Serving

- **Export format:** PyTorch model exported to TorchScript or ONNX for production serving.
- **Serving infrastructure:** Stateless inference container (e.g., FastAPI + Uvicorn, or TorchServe). Scales horizontally.
- **Missing-modality handling:** Implemented server-side in the inference wrapper, not in the model itself. The inference service selects the correct forward pass branch based on which modalities are present in the payload. The model's encoder branches for absent modalities are bypassed (not zeroed — bypassed, matching training behavior).
- **Versioning:** Model version is returned in every inference response (Section 4.5.2). Old model versions are retained for 90 days to allow retroactive prediction recalculation if needed.

### 8.5 Wearable Integration

- **iOS/HealthKit:** Requires a native iOS wrapper (WKWebView app) to access HealthKit entitlements. This is a Phase 2 requirement unless the app ships as a native iOS web app from day one. Alternatively, Phase 1 can accept HealthKit CSV exports manually uploaded.
- **Google Health Connect:** Same — requires Android wrapper or manual export.
- **Phase 1 workaround for MVP:** Accept manual CSV upload of Apple Health export (`export.xml` or `ActivitySummary.csv`) and parse client-side.

### 8.6 Feature Extraction Pipeline

The feature extraction pipeline is a backend service that takes raw collected data and produces model-ready tensors:

1. **CPT-II:** Raw `TrialEvent[]` → feature derivation per Section 3.1.5 → T-score normalization → `CptFeatureVector`.
2. **Activity:** Raw accelerometer samples → resampling → windowing (512-step, 50% overlap) → z-score normalization → `ActivityWindowTensor[]`.
3. **HRV:** Raw R-R intervals → windowing (same convention) → normalization → `HrvWindowTensor[]`.

All normalization parameters (means, stds) are stored as model metadata alongside model weights and versioned together.

---

## 9. Success Metrics

### 9.1 Engagement & Completion

| Metric | Target (90 days post-launch) | Measurement Method |
|---|---|---|
| Module start rate | ≥ 80% of signups start ≥ 1 module | Event: `module_started` |
| CPT-II game completion rate | ≥ 65% of users who start the game complete all 6 blocks | Event: `cpt_game_completed` |
| 2+ modality completion rate | ≥ 40% of users complete ≥ 2 modalities | Session aggregate |
| Full 3-modality completion rate | ≥ 15% of users complete all 3 modalities | Session aggregate |
| Guest-to-account conversion | ≥ 25% of guests who reach results page create an account | Funnel event |

### 9.2 Data Quality

| Metric | Target | Measurement Method |
|---|---|---|
| Valid CPT-II sessions (≥100 go-responses) | ≥ 85% of completed game sessions | Backend validation flag |
| Activity windows per session (valid) | Mean ≥ 8 windows per standard-tier session | Feature extraction output |
| Training-eligible sessions (donated + consented) | ≥ 20% of all completed sessions | `training_eligible == true` count |
| Labeled sessions (clinical diagnosis provided) | ≥ 5% of all completed sessions | `label_source == "self_reported_clinical"` count |
| Suspected gaming/cheating rate | < 2% of game sessions flagged as `validity: "suspect"` | Automated validity flags |

### 9.3 Prediction & Model Quality

| Metric | Target | Measurement Method |
|---|---|---|
| Prediction delivery rate | ≥ 70% of users who start ≥ 1 module receive a prediction | Prediction issued vs. session started |
| Multi-modality prediction uplift | Users who add a 2nd modality see measurable confidence tier improvement | Before/after prediction comparison |
| Model retraining cadence | Sufficient labeled data for a retraining run every 90 days | Labeled session accumulation rate |

### 9.4 User Experience

| Metric | Target | Measurement Method |
|---|---|---|
| Results page disclaimer acknowledgement | Disclaimer rendered and visible for ≥ 3 seconds for ≥ 95% of results page views | Intersection Observer + analytics |
| "Talk to a professional" CTA click rate | ≥ 10% of results page views | Click event |
| Session abandonment point | Identify top 2 drop-off screens for optimization | Funnel analysis |

---

## 10. Open Questions & Risks

| ID | Category | Question / Risk | Severity | Owner |
|---|---|---|---|---|
| OQ-01 | Regulatory | Does the app's ADHD-likelihood output qualify as a Software as a Medical Device (SaMD) under FDA guidelines, or is it a general wellness tool? The "not a diagnosis" framing is deliberate but not definitively protective without legal review. | High | Legal |
| OQ-02 | Signal Quality | Camera-based PPG HRV extraction has highly variable quality across devices, ambient lighting, and skin tones. A robust quality validation protocol (and rejection threshold) must be established before shipping. Darkly-pigmented skin has documented lower PPG accuracy — equity implications must be addressed. | High | ML / Engineering |
| OQ-03 | Cold Start | What happens when a user denies all sensor permissions (camera, motion, wearable) and skips the CPT-II game? The product must gracefully handle "CPT-II questionnaire fallback only" as the minimum viable path and must not leave the user on a dead-end screen. | Medium | UX / Engineering |
| OQ-04 | Anti-Gaming | The CPT-II mini-game can be deliberately manipulated (e.g., always pressing, never pressing, random tapping at consistent speed). Current mitigation: `validity: "suspect"` flag for statistical outliers. More robust anti-gaming measures (e.g., response distribution analysis, honeypot no-go runs) should be designed before the training pipeline relies on this data heavily. | Medium | ML / Engineering |
| OQ-05 | Model Calibration | The likelihood band thresholds in Section 4.5.2 are placeholders. They must be calibrated against the labeled dataset once a sufficient number of labeled sessions are collected. Shipping with uncalibrated thresholds risks systematic over- or under-prediction. | High | ML |
| OQ-06 | Wearable OAuth | HealthKit and Google Health Connect require native app wrappers for production access. The Phase 1 "manual CSV export upload" workaround degrades UX significantly. Timeline for native app development must be resolved. | Medium | Engineering |
| OQ-07 | Data Retention — Training Pool | If a user withdraws data donation consent after their data has been used in a retraining run, it is practically impossible to "unlearn" from a trained model. The consent language must be precise about this limitation, and the data pipeline must stop using withdrawn data in *future* runs. | High | Legal / Engineering |
| OQ-08 | GDPR Applicability | If EU users access the app, GDPR Article 9 (special category health data) applies. Geographic gating or a separate GDPR-compliant deployment may be required before EU launch. | High | Legal |
| OQ-09 | Minimum Window Duration — Activity | The model was trained on a specific windowing scheme. Whether 3 × 30-minute in-app passive tracking sessions produce statistically valid windows comparable to 3 full days of wearable data has not been validated. This may need to be flagged as "experimental" in Phase 1. | Medium | ML |
| OQ-10 | Accessibility — CPT-II Timing | The 200ms stimulus duration and 1000ms response window were chosen to match CPT-II norms, but may be effectively inaccessible for users with motor delays. An adjustable timing mode (e.g., 400ms stimulus, 1500ms window) could be offered, but its impact on feature extraction validity must be assessed against the training data. | Medium | Accessibility / ML |
| OQ-11 | Pediatric Edge Case | Age gating at 18+ is required, but the app cannot prevent underage users from lying. A secondary signal (if available) and clear terms that data from underage users will be deleted if identified should be included. | Low | Legal |

---

## 11. Phase 1 / Phase 2 Scoping

### Phase 1 — MVP

**Goal:** Validate that the full assessment funnel works end-to-end, collect initial labeled data, and deliver a credible prediction to users who complete at least the CPT-II game module.

**In scope for Phase 1:**

| Feature | Notes |
|---|---|
| CPT-II attention game (all 6 blocks, full feature extraction) | Core MVP feature |
| Non-timed CPT-II fallback (ASRS-style questionnaire) | Required for accessibility |
| Short self-report questionnaire (Module D) | Provides supplementary signal and data donation consent |
| Prediction from CPT-II only, CPT-II + questionnaire | Minimum viable prediction path |
| All 7 modality-combination confidence tiers (infrastructure) | Even if only 1 is exercised in Phase 1 |
| Guest mode + account creation | Guest required for low-friction entry |
| Results page with disclaimer, likelihood band, contributing factors | Core output |
| "Improve your result" panel (UI only) | Links to Phase 2 modules as "coming soon" |
| Data donation consent + labeled session storage | Required to begin building training dataset |
| Account data deletion | Required for privacy compliance |
| Manual activity data CSV upload (HealthKit export) | Phase 1 workaround for wearable integration |
| Disclaimer patterns throughout app | Non-negotiable |

**Out of scope for Phase 1:**

- Native iOS/Android wrappers (HealthKit/Google Health Connect live sync)
- Camera-based PPG HRV collection
- In-app passive accelerometer tracking (multi-day)
- PDF export
- Researcher/study management accounts
- Retraining pipeline automation
- GDPR-compliant EU deployment

---

### Phase 2 — Expansion

**Goal:** Full multimodal data collection, wearable integration, model retraining pipeline, and expanded user features.

| Feature | Dependency / Notes |
|---|---|
| Native iOS app (HealthKit live sync) | Requires app store submission |
| Native Android app (Health Connect) | Requires app store submission |
| Camera-based PPG HRV (with quality validation) | OQ-02 must be resolved first |
| Automated model retraining pipeline | Requires sufficient labeled data (estimate: 500+ labeled sessions) |
| Returning user prediction update (add modalities, re-infer) | Session persistence infrastructure built in Phase 1; inference upgrade in Phase 2 |
| PDF result export | Requires PDF rendering service |
| Researcher/study management portal | Separate product track; IRB consent flow needed |
| GDPR-compliant EU deployment | OQ-08 must be resolved; may require separate infra region |
| Multi-language support | Depends on internationalization scope decision |
| Wearable OAuth integrations (Polar, Garmin, Fitbit) | Per-partner API agreements needed |
| Model calibration update (post labeled-data collection) | OQ-05; requires ≥ 200 labeled sessions for initial calibration |

---

*End of PRD v1.0*
