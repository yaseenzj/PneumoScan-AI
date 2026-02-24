import os
import argparse
import torch
from dataset import get_data_loaders
from model import PneumoniaClassifier
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
from tqdm import tqdm

def evaluate_model(data_dir, model_path, batch_size=32):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    # Load data
    _, _, test_loader, classes = get_data_loaders(data_dir, batch_size=batch_size)
    
    # Initialize model
    model = PneumoniaClassifier(num_classes=len(classes)).to(device)
    
    if os.path.exists(model_path):
        model.load_state_dict(torch.load(model_path, map_location=device, weights_only=True))
        print(f"Loaded model from {model_path}")
    else:
        print(f"Model file not found at {model_path}")
        return

    model.eval()

    all_preds = []
    all_labels = []

    print("Evaluating on test set...")
    with torch.no_grad():
        for inputs, labels in tqdm(test_loader):
            inputs = inputs.to(device)
            labels = labels.to(device)

            outputs = model(inputs)
            _, preds = torch.max(outputs, 1)

            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())

    print("\nClassification Report:")
    print(classification_report(all_labels, all_preds, target_names=classes))

    # Confusion Matrix
    cm = confusion_matrix(all_labels, all_preds)
    plt.figure(figsize=(8,6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=classes, yticklabels=classes)
    plt.ylabel('Actual')
    plt.xlabel('Predicted')
    plt.title('Confusion Matrix')
    os.makedirs('results', exist_ok=True)
    plt.savefig('results/confusion_matrix.png')
    print("Confusion matrix saved to results/confusion_matrix.png")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Evaluate Pneumonia Classifier")
    parser.add_argument('--data_dir', type=str, required=True, help='Path to dataset directory')
    parser.add_argument('--model_path', type=str, default='models/best_model.pth', help='Path to trained model')
    args = parser.parse_args()
    
    evaluate_model(args.data_dir, args.model_path)
