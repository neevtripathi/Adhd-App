"""
Run this script once to export your trained model checkpoint
into the format the model server expects.

Usage:
    python export_model.py --checkpoint /path/to/your/trained_model.pt

It will save the state_dict to:  ./checkpoints/model.pt
"""

import argparse
import os
import torch

def export(src_path: str, dst_path: str = "./checkpoints/model.pt"):
    os.makedirs(os.path.dirname(dst_path), exist_ok=True)

    print(f"Loading checkpoint from: {src_path}")
    ckpt = torch.load(src_path, map_location="cpu")

    # Handle common checkpoint formats
    if isinstance(ckpt, dict):
        if "model_state_dict" in ckpt:
            state = ckpt["model_state_dict"]
        elif "state_dict" in ckpt:
            state = ckpt["state_dict"]
        else:
            # Assume the dict IS the state_dict
            state = ckpt
    else:
        # It's already a model object — extract state dict
        state = ckpt.state_dict()

    torch.save({"model_state_dict": state}, dst_path)
    print(f"Saved to: {dst_path}")
    print("Keys in state_dict:")
    for k in list(state.keys())[:10]:
        print(f"  {k}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", required=True, help="Path to your trained .pt file")
    parser.add_argument("--out", default="./checkpoints/model.pt")
    args = parser.parse_args()
    export(args.checkpoint, args.out)
