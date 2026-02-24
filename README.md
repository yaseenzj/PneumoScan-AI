# Emergency Chest X-Ray Screening 🫁
A complete hackathon-ready Deep Learning pipeline and Streamlit Web Application to classify Chest X-Rays as either NORMAL or PNEUMONIA using Transfer Learning on Kaggle's Chest X-Ray Images Dataset.

## Features
* **PyTorch + ResNet18 Transfer Learning**: Highly accurate binary classifier optimized for fast convergence.
* **Streamlit UI**: An intuitive, beautiful web application for drag-and-drop X-ray diagnosis.
* **Evaluation Pipeline**: Generates confusion matrix and a full classification report.

---

## 🚀 Getting Started

### 1. Project Structure
Ensure the Kaggle dataset is located in the `archive/chest_xray` directory.
Your project directory should look like this:

```
yen_hackathon/
│
├── archive/
│   └── chest_xray/
│       ├── train/
│       ├── val/
│       └── test/
│
├── src/
│   ├── dataset.py
│   ├── model.py
│   ├── train.py
│   └── evaluate.py
│
├── app.py
├── requirements.txt
└── README.md
```

### 2. Install Dependencies
Make sure you have an environment with Python >= 3.9 and install the dependencies:
```bash
pip install -r requirements.txt
```

### 3. Training the Model
To train the model on your dataset, run the following command:
```bash
python src/train.py --data_dir archive/chest_xray --epochs 5 --batch_size 32
```
This will train the model and save the best weights to `models/best_model.pth`.

*(Note: If you have a powerful GPU, it will detect `cuda` automatically. Otherwise, it will train on `cpu`, which may take some time.)*

### 4. Evaluating the Model
Evaluate the model against the `test` data fold to generate classification metrics and a confusion matrix:
```bash
python src/evaluate.py --data_dir archive/chest_xray --model_path models/best_model.pth
```
The confusion matrix will be saved to `results/confusion_matrix.png`.

### 5. Running the Web Application
Launch the interactive web UI to test standard image uploads:
```bash
streamlit run app.py
```
This will open a local web server (typically `http://localhost:8501`) where you can drag and drop test X-ray images.

---
**Disclaimer:** Built for hackathon demonstration. Always trust a certified healthcare professional.
