#!/bin/bash
# Render Build Script for Admin Panel Backend
# This script runs in the root directory of the repository

echo "Building WildMind Admin Panel Backend..."

# Navigate to backend directory
cd packages/admin-backend

# Install dependencies
echo "Installing dependencies..."
npm install

# Build TypeScript
echo "Building TypeScript..."
npm run build

echo "Build completed successfully!"

