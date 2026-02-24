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

    # Load data
    train_loader, val_loader, _, classes = get_data_loaders(data_dir, batch_size=batch_size)
    print(f"Classes found: {classes}")

    # Initialize model, loss, optimizer
    model = PneumoniaClassifier(num_classes=len(classes)).to(device)
    
    # Class weights for imbalanced data (more pneumonia than normal in the dataset)
    # Using simple weighted random sampler or weighted cross entropy loss 
    # Here we use standard CrossEntropyLoss for simplicity but might need adjustment for extreme imbalance
    criterion = nn.CrossEntropyLoss()
    
    # Only train the final layers
    optimizer = optim.Adam(model.backbone.fc.parameters(), lr=lr)
    scheduler = lr_scheduler.StepLR(optimizer, step_size=3, gamma=0.1)

    best_val_acc = 0.0
    os.makedirs('models', exist_ok=True)
    best_model_path = 'models/best_model.pth'

    for epoch in range(epochs):
        print(f"\nEpoch {epoch+1}/{epochs}")
        print("-" * 10)

        # Each epoch has a training and validation phase
        for phase in ['train', 'val']:
            if phase == 'train':
                model.train()  # Set model to training mode
                dataloader = train_loader
            else:
                model.eval()   # Set model to evaluate mode
                dataloader = val_loader

            running_loss = 0.0
            running_corrects = 0

            # Iterate over data
            pbar = tqdm(dataloader, desc=f"{phase}")
            for inputs, labels in pbar:
                inputs = inputs.to(device)
                labels = labels.to(device)

                optimizer.zero_grad()

                # Forward pass
                with torch.set_grad_enabled(phase == 'train'):
                    outputs = model(inputs)
                    _, preds = torch.max(outputs, 1)
                    loss = criterion(outputs, labels)

                    # Backward + optimize only if in training phase
                    if phase == 'train':
                        loss.backward()
                        optimizer.step()

                # Statistics
                running_loss += loss.item() * inputs.size(0)
                running_corrects += torch.sum(preds == labels.data)
                
                pbar.set_postfix({'loss': loss.item()})

            if phase == 'train':
                scheduler.step()

            epoch_loss = running_loss / len(dataloader.dataset)
            epoch_acc = running_corrects.double() / len(dataloader.dataset)

            print(f"{phase} Loss: {epoch_loss:.4f} Acc: {epoch_acc:.4f}")

            # Deep copy the model if it's the best
            if phase == 'val' and epoch_acc > best_val_acc:
                best_val_acc = epoch_acc
                torch.save(model.state_dict(), best_model_path)
                print(f"Saved new best model with Val Acc: {best_val_acc:.4f}")

    print("Training complete.")
    print(f"Best Val Acc: {best_val_acc:.4f}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Train Pneumonia Classifier")
    parser.add_argument('--data_dir', type=str, required=True, help='Path to dataset directory (containing train, val, test)')
    parser.add_argument('--epochs', type=int, default=5, help='Number of epochs')
    parser.add_argument('--batch_size', type=int, default=32, help='Batch size')
    args = parser.parse_args()
    
    train_model(args.data_dir, epochs=args.epochs, batch_size=args.batch_size)
