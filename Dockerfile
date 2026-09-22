FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Set permissions and create data folder for SQLite
RUN mkdir -p /app/data && chmod -R 777 /app/data

# Default port for Hugging Face Spaces is 7860
ENV PORT=7860
ENV HOST=0.0.0.0
EXPOSE 7860

# Start server
CMD ["python", "main.py"]
