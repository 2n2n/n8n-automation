#!/bin/bash
# Start script for n8n Docker Compose stack

set -e

echo "🚀 Starting n8n with PostgreSQL..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found. Please copy .env.example to .env and configure it."
    exit 1
fi

# Start the stack
echo "📦 Pulling images and starting containers..."
docker compose up -d

echo "⏳ Waiting for services to be healthy..."
sleep 5

# Check service status
echo ""
echo "📊 Service status:"
docker compose ps

echo ""
echo "✅ n8n should be available at http://localhost:5678"
echo "📝 Check logs with: docker compose logs -f n8n"
echo ""
echo "🔐 Login credentials are in your .env file:"
echo "   Username: $(grep N8N_BASIC_AUTH_USER .env | cut -d '=' -f2)"
echo ""
