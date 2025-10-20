#!/bin/bash

echo "🔧 Fixing Time Capsule dependencies..."

# Clean node_modules and lock files
echo "📦 Cleaning node_modules and lock files..."
rm -rf node_modules
rm -f package-lock.json
rm -f yarn.lock

# Clear npm cache
echo "🧹 Clearing npm cache..."
npm cache clean --force

# Clear Expo cache
echo "🗑️ Clearing Expo cache..."
npx expo start --clear --non-interactive &
sleep 2
pkill -f "expo start"

# Install dependencies
echo "📥 Installing dependencies..."
npm install

# Additional expo-specific fixes
echo "🔍 Installing Expo CLI globally..."
npm install -g @expo/cli@latest

# Rebuild native directories if needed
echo "🔨 Rebuilding native directories..."
npx expo prebuild --clear --non-interactive

echo "✅ Dependencies fixed! Try running 'npm start' now."