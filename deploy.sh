#!/bin/bash

# Exit upon any error
set -e

echo "🚀 Starting PX-Studio & labs-api Update & Deployment..."

echo "📥 Pulling latest changes from Git repository..."
git pull origin main

echo "🛑 Stopping existing containers..."
docker compose down

echo "🏗️ Building and starting new containers..."
docker compose up -d --build

echo "✅ PX-Studio successfully deployed and running in background!"
