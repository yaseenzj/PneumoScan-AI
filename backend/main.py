from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import torch
from torchvision import transforms
from PIL import Image
import io
import base64
import numpy as np
import matplotlib.pyplot as plt
import os
from pydantic import BaseModel
import sys

# Add 'src' to path for local module imports
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))
from model import PneumoniaClassifier

app = FastAPI(
    title="PneumoScan AI - Diagnostic Backend",
    description="ML-powered API for pneumonia detection in chest radiographs"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictRequest(BaseModel):
    image: str

# Model initialization
device = torch.device('cpu') 
model = PneumoniaClassifier(num_classes=2).to(device)
model_path = os.path.join(os.path.dirname(__file__), 'models', 'best_model.pth')

try:
    model.load_state_dict(torch.load(model_path, map_location=device, weights_only=True))
    model.eval()
    print("Model loaded successfully")
except Exception as e:
    print(f"Error loading model: {e}")

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

@app.post("/predict")
async def predict(req: PredictRequest):
    try:
        image_b64 = req.image
        if image_b64.startswith("data:image"):
            image_b64 = image_b64.split(",")[1]

        image_bytes = base64.b64decode(image_b64)
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        img_np = np.array(img).astype(np.float32)
        r, g, b = img_np[:,:,0], img_np[:,:,1], img_np[:,:,2]
        
        color_variation = np.mean([np.abs(r-g), np.abs(r-b), np.abs(g-b)])
        if color_variation > 10:
             return {"error": "Invalid Image. The uploaded file appears to be a color photograph or illustration, not a clinical Radiograph (X-Ray)."}
            
        contrast = np.std(img_np)
        if contrast < 10:
             return {"error": "Invalid Image. The uploaded file is blank or lacks the contrast of a real X-Ray scan."}

        img_t = transform(img).unsqueeze(0)

        label, p_pneu, p_norm, zone = model.predict(img_t.to(device))

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

        return {
            "result": "Pneumonia" if label == "PNEUMONIA" else "Normal",
            "confidence": float(p_pneu if label == "PNEUMONIA" else p_norm),
            "heatmap": f"data:image/png;base64,{heatmap_b64}"
        }

    except Exception as e:
        return {"error": str(e)}

@app.get("/health")
def health():
    return {"status": "ok"}
