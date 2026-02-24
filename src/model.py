import torch
import torch.nn as nn
from torchvision.models import resnet18, ResNet18_Weights

class PneumoniaClassifier(nn.Module):
    def __init__(self, num_classes=2, freeze_backbone=True):
        super(PneumoniaClassifier, self).__init__()
        # Load a pre-trained ResNet-18 model
        self.backbone = resnet18(weights=ResNet18_Weights.IMAGENET1K_V1)
        
        if freeze_backbone:
            for param in self.backbone.parameters():
                param.requires_grad = False
                
        # Replace the final fully connected layer for binary classification
        num_ftrs = self.backbone.fc.in_features
        self.backbone.fc = nn.Sequential(
            nn.Dropout(0.5),
            nn.Linear(num_ftrs, num_classes)
        )

    def forward(self, x):
        return self.backbone(x)

if __name__ == '__main__':
    model = PneumoniaClassifier()
    x = torch.randn(2, 3, 224, 224)
    out = model(x)
    print("Output shape:", out.shape)
