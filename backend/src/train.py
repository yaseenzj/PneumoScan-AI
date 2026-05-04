import os
import argparse
import torch
import torch.nn as nn
import torch.optim as optim
from torch.optim import lr_scheduler
from tqdm import tqdm
from dataset import get_data_loaders
from model import PneumoniaClassifier


def train_model(data_dir, epochs=5, batch_size=32, lr=0.001):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    train_loader, val_loader, _, classes = get_data_loaders(data_dir, batch_size=batch_size)
    print(f"Classes: {classes}")

    model = PneumoniaClassifier(num_classes=len(classes), freeze_backbone=True).to(device)

    # ── Only train the zone attention + classifier head ───────────────────
    trainable_params = list(model.zone_attention.parameters()) + \
                       list(model.classifier.parameters())
    print(f"Trainable parameters: {sum(p.numel() for p in trainable_params):,}")

    # ── Class weights: NORMAL=0.4, PNEUMONIA=0.6 (slightly upweight pneumonia
    #    to counter dataset imbalance, but keep conservative threshold in place)
    class_weights = torch.tensor([0.4, 0.6], dtype=torch.float32).to(device)
    criterion = nn.CrossEntropyLoss(weight=class_weights)

    optimizer = optim.Adam(trainable_params, lr=lr)
    scheduler = lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    best_val_acc = 0.0
    os.makedirs('models', exist_ok=True)
    best_model_path = 'models/best_model.pth'

    for epoch in range(epochs):
        print(f"\nEpoch {epoch + 1}/{epochs}")
        print("-" * 10)

        for phase in ['train', 'val']:
            if phase == 'train':
                model.train()
                dataloader = train_loader
            else:
                model.eval()
                dataloader = val_loader

            running_loss = 0.0
            running_corrects = 0

            pbar = tqdm(dataloader, desc=phase)
            for inputs, labels in pbar:
                inputs = inputs.to(device)
                labels = labels.to(device)

                optimizer.zero_grad()

                with torch.set_grad_enabled(phase == 'train'):
                    logits = model(inputs)
                    _, preds = torch.max(logits, 1)
                    loss = criterion(logits, labels)

                    if phase == 'train':
                        loss.backward()
                        optimizer.step()

                running_loss += loss.item() * inputs.size(0)
                running_corrects += torch.sum(preds == labels.data)
                pbar.set_postfix({'loss': f'{loss.item():.4f}'})

            if phase == 'train':
                scheduler.step()

            epoch_loss = running_loss / len(dataloader.dataset)
            epoch_acc  = running_corrects.double() / len(dataloader.dataset)
            print(f"  {phase:5s} | loss: {epoch_loss:.4f} | acc: {epoch_acc:.4f}")

            if phase == 'val' and epoch_acc > best_val_acc:
                best_val_acc = epoch_acc
                torch.save(model.state_dict(), best_model_path)
                print(f"  ✔ New best model saved  (val_acc={best_val_acc:.4f})")

    # Print learned zone weights for inspection
    zone = model.zone_attention.zone_weight.detach().cpu()
    print("\nLearned zone weight map (rows = top→bottom lung):")
    print(zone.round(decimals=3))
    print(f"\nTraining complete. Best val acc: {best_val_acc:.4f}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Train Pneumonia Classifier with Spatial Zone Attention")
    parser.add_argument('--data_dir',   type=str,   required=True)
    parser.add_argument('--epochs',     type=int,   default=5)
    parser.add_argument('--batch_size', type=int,   default=32)
    parser.add_argument('--lr',         type=float, default=0.001)
    args = parser.parse_args()

    train_model(args.data_dir, epochs=args.epochs, batch_size=args.batch_size, lr=args.lr)
