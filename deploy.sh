#!/bin/bash
# Run this script on your EC2 instance after cloning the repo
set -e

echo "=== Farmer-to-Home EC2 Deployment ==="

# 1. Install Docker
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo "Docker installed. Re-login or run: newgrp docker"
fi

# 2. Install Docker Compose
if ! command -v docker compose &> /dev/null; then
    echo "Installing Docker Compose..."
    sudo apt-get update && sudo apt-get install -y docker-compose-plugin
fi

# 3. Check .env.production exists
if [ ! -f ./backend/.env.production ]; then
    echo "ERROR: backend/.env.production not found!"
    echo "Copy backend/.env.production from your local machine and fill in real values."
    exit 1
fi

# 4. Build and start services
echo "Building and starting services..."
docker compose -f docker-compose.prod.yml up -d --build

# 5. Wait for postgres to be ready
echo "Waiting for database..."
sleep 10

# 6. Run migrations
echo "Running Alembic migrations..."
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head

echo ""
echo "=== Deployment complete! ==="
echo "Backend running at http://$(curl -s ifconfig.me):80"
echo ""
echo "Next: Set up SSL with Let's Encrypt (see README)"
