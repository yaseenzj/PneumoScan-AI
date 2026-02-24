import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision.models import resnet18, ResNet18_Weights

# ── Clinical Zone Configuration ─────────────────────────────────────────────
# Assuming 224x224 input → ResNet18 produces 7x7 spatial feature maps.
# Lung zones mapped to feature-map rows:
#   Upper zone  (rows 0-1) → pneumonia evidence weight 0.4  (cavities / nodules here → deprioritise)
#   Middle zone (rows 2-4) → pneumonia evidence weight 1.5  (some consolidation possible)
#   Lower zone  (rows 5-6) → pneumonia evidence weight 2.5  (high-density consolidation → strong signal)
FEATURE_MAP_H = 7
FEATURE_MAP_W = 7

def _build_zone_prior(H=FEATURE_MAP_H, W=FEATURE_MAP_W):
    """
    Returns an H×W weight matrix initialised with clinical zone priors.
    - Rows 0-1   → upper lung  (low weight: 0.40)
    - Rows 2-4   → middle lung (medium: 1.50)
    - Rows 5-6   → lower lung  (high:   2.50)
    """
    prior = torch.ones(H, W)
    prior[0:2, :] = 0.40   # upper zone – deprioritise
    prior[2:5, :] = 1.50   # middle zone – moderate
    prior[5:7, :] = 2.50   # lower zone  – strong pneumonia signal
    return prior


class SpatialZoneAttention(nn.Module):
    """
    Applies clinically-grounded spatial zone weighting to ResNet feature maps.

    A learnable weight matrix (initialised with zone priors) modulates the
    spatial feature map before global average pooling, steering the classifier
    to prioritise lower-lung consolidations and suppress upper-lung findings.
    """
    def __init__(self, H=FEATURE_MAP_H, W=FEATURE_MAP_W):
        super().__init__()
        prior = _build_zone_prior(H, W)
        # Make the zone map a learnable parameter so fine-tuning can adjust it,
        # but clamp values during inference to keep clinical semantics.
        self.zone_weight = nn.Parameter(prior.clone())

    def forward(self, feature_map: torch.Tensor) -> torch.Tensor:
        """
        Args:
            feature_map: [B, C, H, W] spatial features from ResNet backbone.
        Returns:
            weighted_pool: [B, C] – spatially weighted global average.
        """
        # Clamp so upper-zone weights never exceed lower-zone weights during training.
        with torch.no_grad():
            self.zone_weight.clamp_(min=0.1, max=5.0)

        # [1, 1, H, W] broadcast over batch & channel dimensions
        w = self.zone_weight.unsqueeze(0).unsqueeze(0)  # [1,1,H,W]
        weighted = feature_map * w                       # [B, C, H, W]
        # Weighted average pool → [B, C]
        pool = weighted.sum(dim=(2, 3)) / w.sum()
        return pool


class PneumoniaClassifier(nn.Module):
    """
    Binary chest X-ray classifier with clinically-grounded spatial attention.

    Architecture
    ────────────
    ResNet18 backbone (pre-trained on ImageNet)
      └─ spatial feature extraction (4D feature maps before avgpool)
      └─ SpatialZoneAttention  ← zone-weighted pooling
      └─ Dropout(0.5) + Linear → 2 logits

    Inference Semantics
    ───────────────────
    • Hard classify as PNEUMONIA only if P(pneumonia) > PNEUMONIA_THRESHOLD.
    • Conservative default: ambiguous cases → NOT PNEUMONIA.
    • Returns raw (logits, zone_weights) for downstream explainability.
    """
    # Conservative threshold: lower-lung consolidation must be clearly dominant.
    PNEUMONIA_THRESHOLD = 0.65

    def __init__(self, num_classes: int = 2, freeze_backbone: bool = True):
        super().__init__()
        backbone = resnet18(weights=ResNet18_Weights.IMAGENET1K_V1)

        # ── Strip the final avgpool + fc; we replace them ──────────────────
        self.feature_extractor = nn.Sequential(
            backbone.conv1,
            backbone.bn1,
            backbone.relu,
            backbone.maxpool,
            backbone.layer1,
            backbone.layer2,
            backbone.layer3,
            backbone.layer4,
        )  # output: [B, 512, 7, 7]

        if freeze_backbone:
            for param in self.feature_extractor.parameters():
                param.requires_grad = False

        # ── Spatial zone attention ────────────────────────────────────────
        self.zone_attention = SpatialZoneAttention()

        # ── Classifier head (only this + zone_attention are trainable) ────
        num_ftrs = 512  # ResNet18 final layer channels
        self.classifier = nn.Sequential(
            nn.Dropout(0.5),
            nn.Linear(num_ftrs, num_classes),
        )

    def forward(self, x: torch.Tensor):
        features = self.feature_extractor(x)    # [B, 512, 7, 7]
        pooled   = self.zone_attention(features) # [B, 512]
        logits   = self.classifier(pooled)       # [B, 2]
        return logits

    def predict(self, x: torch.Tensor):
        """
        Clinical inference with conservative threshold.

        Returns
        -------
        label       : 'PNEUMONIA' | 'NOT PNEUMONIA'
        pneumonia_p : float – probability of pneumonia (0-1)
        normal_p    : float – probability of normal/other (0-1)
        zone_map    : [H, W] tensor – current zone weight map for Grad-CAM display
        """
        self.eval()
        with torch.no_grad():
            logits = self.forward(x)
            probs  = F.softmax(logits, dim=1)[0]  # [2]

            # classes order from ImageFolder: NORMAL=0, PNEUMONIA=1
            normal_p    = probs[0].item()
            pneumonia_p = probs[1].item()

            # Conservative gate: only flag PNEUMONIA if clearly above threshold
            if pneumonia_p >= self.PNEUMONIA_THRESHOLD:
                label = 'PNEUMONIA'
            else:
                label = 'NOT PNEUMONIA'

            zone_map = self.zone_attention.zone_weight.detach().cpu()

        return label, pneumonia_p, normal_p, zone_map


if __name__ == '__main__':
    model = PneumoniaClassifier()
    x = torch.randn(2, 3, 224, 224)

    # Forward
    logits = model(x)
    print("Logits shape:", logits.shape)

    # Single-image predict
    label, p_pneu, p_norm, zone = model.predict(x[:1])
    print(f"Label: {label}  |  P(pneumonia)={p_pneu:.3f}  |  P(normal)={p_norm:.3f}")
    print("Zone weight map:\n", zone)
