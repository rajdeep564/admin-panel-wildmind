#!/bin/bash
# Render Build Script for Admin Panel Backend
# This script ensures all dependencies are installed correctly

set -e  # Exit on error

echo "Building WildMind Admin Panel Backend..."

# Navigate to backend directory (Render sets this as rootDir)
cd /opt/render/project/src/packages/admin-backend

# Install dependencies (including devDependencies for TypeScript types)
echo "Installing dependencies..."
npm install

# Build TypeScript
echo "Building TypeScript..."
npm run build

echo "Build completed successfully!"

