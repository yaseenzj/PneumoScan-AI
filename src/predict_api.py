import sys
import json
import base64
import io
import torch
import warnings
from PIL import Image
from torchvision import transforms
import os

# Ensure local imports work correctly by adding the directory to sys.path
sys.path.append(os.path.dirname(__file__))
from model import PneumoniaClassifier

warnings.filterwarnings('ignore')

def main():
    try:
        # Read base64 from stdin
        input_data = sys.stdin.read().strip()
        if not input_data:
            print(json.dumps({"error": "No input data provided."}))
            sys.exit(1)

        # Parse JSON
        req = json.loads(input_data)
        image_b64 = req.get("image", "")

        if image_b64.startswith("data:image"):
            image_b64 = image_b64.split(",")[1]

        image_bytes = base64.b64decode(image_b64)
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        import numpy as np
        img_np = np.array(img).astype(np.float32)
        r, g, b = img_np[:,:,0], img_np[:,:,1], img_np[:,:,2]
        
        # Check 1: Is it Grayscale? (X-Rays have identical RGB channels)
        # A cat emoji or color photo will have high variation here.
        color_variation = np.mean([np.abs(r-g), np.abs(r-b), np.abs(g-b)])
        if color_variation > 10:
            print(json.dumps({"error": "Invalid Image. The uploaded file appears to be a color photograph or illustration, not a clinical Radiograph (X-Ray)."}))
            sys.exit(0)
            
        # Check 2: Does it have shapes and contrast? (Blank images/solid boxes have ~0 std dev)
        contrast = np.std(img_np)
        if contrast < 10:
            print(json.dumps({"error": "Invalid Image. The uploaded file is blank or lacks the contrast of a real X-Ray scan."}))
            sys.exit(0)

        # Transform (same as used in dataset.py)
        transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

        img_t = transform(img).unsqueeze(0)

        # Load model and set device
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        model = PneumoniaClassifier(num_classes=2).to(device)
        
        # Determine model path
        model_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'best_model.pth')
        
        if os.path.exists(model_path):
            model.load_state_dict(torch.load(model_path, map_location=device, weights_only=True))
        else:
            print(json.dumps({"error": f"Model not found at {model_path}"}))
            sys.exit(1)

        model.eval()

        label, p_pneu, p_norm, zone = model.predict(img_t.to(device))

        import matplotlib.pyplot as plt
        import numpy as np
        
        zone_np = zone.numpy()
        z_min, z_max = zone_np.min(), zone_np.max()
        if z_max > z_min:
            zone_norm = (zone_np - z_min) / (z_max - z_min)
        else:
            zone_norm = zone_np * 0
            
        fig, ax = plt.subplots(figsize=(2,2), dpi=112)
        ax.imshow(zone_norm, cmap='jet', interpolation='bicubic')
        ax.axis('off')
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight', pad_inches=0, transparent=True)
        buf.seek(0)
        heatmap_b64 = base64.b64encode(buf.read()).decode('utf-8')
        plt.close(fig)

        # Output JSON result for Next.js to intercept
        print(json.dumps({
            "result": "Pneumonia" if label == "PNEUMONIA" else "Normal",
            "confidence": p_pneu if label == "PNEUMONIA" else p_norm,
            "heatmap": f"data:image/png;base64,{heatmap_b64}"
        }))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    main()
