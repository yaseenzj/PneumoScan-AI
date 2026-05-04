FROM python:3.10-slim

WORKDIR /app

# Install dependencies needed for compiling some python packages like matplotlib
RUN apt-get update && apt-get install -y gcc g++ libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*

COPY requirements-api.txt .

# Install CPU-only torch to save massive amounts of space and memory
RUN pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements-api.txt

COPY . .

# Expose port for Render/Railway etc.
ENV PORT=8000
EXPOSE 8000

# Start API
CMD uvicorn fastapi_app:app --host 0.0.0.0 --port ${PORT:-8000}
