"""Superposiciones Grad-CAM para modelos de tamizaje ConvNeXt."""

from __future__ import annotations

import base64
import io

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image

from config import DEVICE, IMG_SIZE
from dataset import val_transform


def _target_layer(model):
    return model.stages[-1].blocks[-1]


def generate_gradcam_overlay(model, pil_image: Image.Image) -> str | None:
    """Devuelve una URL de datos JPEG con el mapa de calor mezclado sobre el estudio."""
    model.eval()
    rgb = pil_image.convert('RGB').resize((IMG_SIZE, IMG_SIZE))
    tensor = val_transform(rgb).unsqueeze(0).to(DEVICE)
    tensor = tensor.requires_grad_(True)

    activations: list[torch.Tensor] = []
    gradients: list[torch.Tensor] = []

    def forward_hook(_module, _inp, out):
        activations.append(out)

    def backward_hook(_module, _grad_in, grad_out):
        gradients.append(grad_out[0])

    layer = _target_layer(model)
    fh = layer.register_forward_hook(forward_hook)
    bh = layer.register_full_backward_hook(backward_hook)

    try:
        model.zero_grad(set_to_none=True)
        logit = model(tensor)
        score = torch.sigmoid(logit).squeeze()
        score.backward(retain_graph=False)

        if not activations or not gradients:
            return None

        acts = activations[0]
        grads = gradients[0]
        weights = grads.mean(dim=(2, 3), keepdim=True)
        cam = (weights * acts).sum(dim=1, keepdim=True)
        cam = F.relu(cam)
        cam = F.interpolate(
            cam,
            size=(IMG_SIZE, IMG_SIZE),
            mode='bilinear',
            align_corners=False,
        )
        cam_np = cam.squeeze().detach().cpu().numpy()
        cam_np = (cam_np - cam_np.min()) / (cam_np.max() - cam_np.min() + 1e-8)

        img_np = np.array(rgb, dtype=np.float32) / 255.0
        heat = np.stack([cam_np, cam_np * 0.25, 1.0 - cam_np], axis=-1)
        blended = np.clip(img_np * 0.5 + heat * 0.5, 0, 1)

        out = Image.fromarray((blended * 255).astype(np.uint8))
        buf = io.BytesIO()
        out.save(buf, format='JPEG', quality=88)
        encoded = base64.b64encode(buf.getvalue()).decode('ascii')
        return f'data:image/jpeg;base64,{encoded}'
    except Exception:
        return None
    finally:
        fh.remove()
        bh.remove()
        model.zero_grad(set_to_none=True)
