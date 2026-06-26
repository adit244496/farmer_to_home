#!/bin/bash
# Run this script on your EC2 instance after cloning the repo
set -e

echo "=== Farmer-to-Home EC2 Deployment ==="

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    OS="unknown"
fi

echo "Detected OS: $OS"

# 1. Install Docker
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."

    if [ "$OS" = "amzn" ]; then
        # Amazon Linux 2023
        sudo dnf install -y docker
        sudo systemctl start docker
        sudo systemctl enable docker
        sudo usermod -aG docker $USER
    elif [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        curl -fsSL https://get.docker.com | sh
        sudo usermod -aG docker $USER
    else
        echo "ERROR: Unsupported OS: $OS. Install Docker manually."
        exit 1
    fi

    echo "Docker installed."
fi

# Ensure Docker is running
sudo systemctl start docker 2>/dev/null || true

# 2. Install Docker Compose plugin
if ! docker compose version &> /dev/null; then
    echo "Installing Docker Compose..."

    if [ "$OS" = "amzn" ]; then
        sudo mkdir -p /usr/local/lib/docker/cli-plugins
        sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
            -o /usr/local/lib/docker/cli-plugins/docker-compose
        sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
    elif [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        sudo apt-get update && sudo apt-get install -y docker-compose-plugin
    fi
fi

# 3. Check .env.production exists
if [ ! -f ./backend/.env.production ]; then
    echo "ERROR: backend/.env.production not found!"
    echo "Create it from the template: cp backend/.env.example backend/.env.production"
    echo "Then fill in all CHANGE_ME values."
    exit 1
fi

# 4. Build and start services
echo "Building and starting services..."
sudo docker compose -f docker-compose.prod.yml up -d --build

# 5. Wait for postgres to be ready
echo "Waiting for database to be ready..."
sleep 15

# 6. Run migrations
echo "Running Alembic migrations..."
sudo docker compose -f docker-compose.prod.yml exec backend alembic upgrade head

echo ""
echo "=== Deployment complete! ==="
echo "Backend running at http://$(curl -s ifconfig.me)"
echo ""
echo "Next steps:"
echo "  1. Point your domain DNS to this IP: $(curl -s ifconfig.me)"
echo "  2. Run SSL setup: sudo docker compose -f docker-compose.prod.yml exec certbot certbot certonly ..."
