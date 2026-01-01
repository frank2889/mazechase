#!/bin/bash
# DigitalOcean Droplet deployment script for MazeChase
# Run this on your DigitalOcean server after git pull

set -e

echo "🎮 Deploying MazeChase..."

# Update system
echo "📦 Updating system packages..."
sudo apt-get update -y

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    echo "🐳 Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Create app directory
APP_DIR="/opt/mazechase"
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Navigate to app directory
cd $APP_DIR

# Pull latest code (or clone if first time)
if [ -d ".git" ]; then
    echo "📥 Pulling latest code..."
    git pull origin main
else
    echo "📥 Cloning repository..."
    git clone YOUR_GIT_REPO_URL .
fi

# Create data directory
mkdir -p appdata

# Build and run with Docker Compose
echo "🔨 Building and starting containers..."
docker-compose down || true
docker-compose build --no-cache
docker-compose up -d

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Health check
echo "🏥 Running health check..."
if curl -s http://localhost:8080 > /dev/null; then
    echo "✅ MazeChase is running!"
    echo "🌐 Access at: http://$(curl -s ifconfig.me):8080"
else
    echo "❌ Health check failed. Checking logs..."
    docker-compose logs --tail=50
fi

echo ""
echo "📋 Useful commands:"
echo "  - View logs: docker-compose logs -f"
echo "  - Stop: docker-compose down"
echo "  - Restart: docker-compose restart"
echo "  - Update: git pull && docker-compose up -d --build"
