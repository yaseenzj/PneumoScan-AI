import streamlit as st
import torch
import torch.nn.functional as F
from PIL import Image
from torchvision import transforms
from src.model import PneumoniaClassifier

st.set_page_config(page_title="Pneumonia Detection AI", layout="wide", page_icon="🫁")

# Cache model loading
@st.cache_resource
def load_model():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = PneumoniaClassifier(num_classes=2)
    try:
        model.load_state_dict(torch.load('models/best_model.pth', map_location=device, weights_only=True))
    except Exception as e:
        st.warning(f"Could not load trained model, showing using un-trained weights. Please train the model! Error: {e}")
    model.to(device)
    model.eval()
    return model, device

model, device = load_model()

# Image transforms (same as test_transforms in dataset.py)
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

st.title("🫁 Emergency Chest X-Ray Screening")
st.markdown("Upload a Chest X-ray image to instantly detect signs of **Pneumonia**.")

uploaded_file = st.file_uploader("Upload Chest X-ray", type=["jpg", "png", "jpeg"])

if uploaded_file is not None:
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Uploaded Image")
        image = Image.open(uploaded_file).convert('RGB')
        st.image(image, use_column_width=True)
    
    with col2:
        st.subheader("Analysis Results")
        
        # Preprocess and predict
        input_tensor = transform(image).unsqueeze(0).to(device)
        
        with torch.no_grad():
            output = model(input_tensor)
            probability = F.softmax(output, dim=1)[0]
            confidence, predicted = torch.max(probability, 0)
        
        classes = ['NORMAL', 'PNEUMONIA']
        prediction_label = classes[predicted.item()]
        conf_percentage = confidence.item() * 100
        
        # UI Polish based on prediction
        if prediction_label == 'PNEUMONIA':
            st.error(f"### 🚨 Detect: {prediction_label}")
            st.progress(int(conf_percentage))
            st.write(f"Confidence Level: **{conf_percentage:.2f}%**")
            st.markdown("⚠️ **Recommendation:** Immediate radiologist review is advised. Signs consistent with pneumonia detected.")
        else:
            st.success(f"### ✅ Result: {prediction_label}")
            st.progress(int(conf_percentage))
            st.write(f"Confidence Level: **{conf_percentage:.2f}%**")
            st.markdown("ℹ️ No clear signs of pneumonia detected by the AI. Routine screening advised.")
    
st.markdown("---")
st.markdown("*Disclaimer: This is an AI-assisted tool meant for hackathon demonstration. It does not provide medical diagnosis. Always consult a healthcare professional.*")
