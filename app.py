import streamlit as st
import torch
import numpy as np
from PIL import Image, ImageFilter
from torchvision import transforms
from src.model import PneumoniaClassifier

# ─────────────────────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Emergency X-Ray AI Screening",
    layout="wide",
    page_icon="🫁",
)

st.markdown("""
<style>
html, body, [class*="css"] { font-family: 'Inter','Segoe UI',sans-serif; }
</style>
""", unsafe_allow_html=True)

# ─────────────────────────────────────────────────────────────────────────────
@st.cache_resource
def load_model():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = PneumoniaClassifier(num_classes=2)
    loaded = False
    try:
        model.load_state_dict(
            torch.load('models/best_model.pth', map_location=device, weights_only=True)
        )
        loaded = True
    except Exception:
        pass
    model.to(device)
    model.eval()
    return model, device, loaded

model, device, weights_loaded = load_model()

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

# ─────────────────────────────────────────────────────────────────────────────

def zone_heatmap_pil(zone_weight_map: torch.Tensor, image: Image.Image) -> Image.Image:
    """Overlay the 7x7 zone-weight map onto the X-ray using PIL only."""
    SIZE = 224
    zone_np = zone_weight_map.numpy().astype(np.float32)      # [7, 7]
    z_min, z_max = zone_np.min(), zone_np.max()
    zone_norm = (zone_np - z_min) / (z_max - z_min + 1e-8)   # [0, 1]

    # Upscale to 224x224
    zone_pil_small = Image.fromarray((zone_norm * 255).astype(np.uint8), mode='L')
    zone_pil = zone_pil_small.resize((SIZE, SIZE), Image.NEAREST)
    zone_pil = zone_pil.filter(ImageFilter.GaussianBlur(radius=8))

    # Build a coloured heat overlay: blue (low) -> red (high)
    zone_arr = np.array(zone_pil)                 # [224, 224] uint8
    r = zone_arr                                  # high weight -> red
    g = (255 - zone_arr // 2).astype(np.uint8)
    b = (255 - zone_arr).astype(np.uint8)         # low weight -> blue
    heat_rgb = np.stack([r, g, b], axis=-1)
    heat_img = Image.fromarray(heat_rgb, mode='RGB')

    # Blend with greyscale X-ray
    xray_gray = image.convert('L').resize((SIZE, SIZE)).convert('RGB')
    blended = Image.blend(xray_gray, heat_img, alpha=0.50)
    return blended


# ─────────────────────────────────────────────────────────────────────────────
st.title("🫁 Emergency Chest X-Ray Screening")
st.markdown(
    "Upload a Chest X-ray for **rapid AI-assisted pneumonia triage**. "
    "The model prioritises **lower-lung consolidation** and uses a conservative "
    "65% confidence gate — ambiguous cases default to **Not Pneumonia** for safe triage."
)

if not weights_loaded:
    st.warning(
        "No trained weights found at `models/best_model.pth`. "
        "Run `python src/train.py --data_dir archive/chest_xray` first.",
        icon="⚠️",
    )

st.divider()
uploaded_file = st.file_uploader(
    "Drop a chest X-ray image here (.jpg / .png)",
    type=["jpg", "jpeg", "png"],
)

if uploaded_file is not None:
    image = Image.open(uploaded_file).convert('RGB')
    input_tensor = transform(image).unsqueeze(0).to(device)

    label, pneumonia_p, normal_p, zone_map = model.predict(input_tensor)
    pneumonia_pct = pneumonia_p * 100
    normal_pct    = normal_p    * 100

    col_img, col_heat, col_res = st.columns([2, 2, 2.5])

    with col_img:
        st.subheader("Input X-Ray")
        st.image(image, use_column_width=True)

    with col_heat:
        st.subheader("AI Zone Attention")
        heat_img = zone_heatmap_pil(zone_map, image)
        st.image(heat_img, caption="Learnt zone weights overlaid on X-ray", use_column_width=True)

        # Zone weight metrics (no matplotlib needed)
        zone_np = zone_map.numpy()
        st.markdown("**Zone Attention Weights**")
        col_u, col_m, col_l = st.columns(3)
        with col_u:
            st.metric("Upper", f"{zone_np[0:2,:].mean():.3f}", delta=None)
        with col_m:
            st.metric("Middle", f"{zone_np[2:5,:].mean():.3f}", delta=None)
        with col_l:
            st.metric("Lower", f"{zone_np[5:7,:].mean():.3f}", delta=None)
        st.caption("Higher weight = stronger pneumonia signal from that zone")

    with col_res:
        st.subheader("Screening Decision")

        if label == 'PNEUMONIA':
            st.error("### 🚨 PNEUMONIA DETECTED")
            st.markdown(
                "> **Criteria met:** Lower-lung consolidation confidence exceeds clinical threshold.\n\n"
                "> ⚠️ **Action:** Flag for immediate radiologist review."
            )
        else:
            st.success("### ✅ NOT PNEUMONIA")
            st.markdown(
                "> **Criteria not met:** No dominant lower-lung consolidation detected.\n\n"
                "> ℹ️ **Action:** Continue routine monitoring."
            )

        st.markdown("---")
        st.markdown(f"**P(Pneumonia):** `{pneumonia_pct:.1f}%`")
        st.progress(min(int(pneumonia_pct), 100))

        st.markdown(f"**P(Not Pneumonia):** `{normal_pct:.1f}%`")
        st.progress(min(int(normal_pct), 100))

        threshold_pct = int(PneumoniaClassifier.PNEUMONIA_THRESHOLD * 100)
        st.info(
            f"**Decision Gate:** PNEUMONIA only if confidence ≥ {threshold_pct}%.  \n"
            "Ambiguous cases default to **Not Pneumonia** for safe emergency triage.",
            icon="ℹ️",
        )

st.divider()
st.caption(
    "⚕️ AI-assisted screening tool for demonstration. "
    "Does not provide clinical diagnosis — always consult a certified radiologist."
)
