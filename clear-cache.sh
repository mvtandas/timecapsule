#!/bin/bash

echo "🧹 Clearing all caches..."

# Stop any running Metro bundler
echo "📱 Stopping Expo/Metro..."
killall node 2>/dev/null || true

# Clear Metro bundler cache
echo "🗑️  Clearing Metro cache..."
rm -rf .expo
rm -rf node_modules/.cache

# Clear watchman cache
echo "⌚ Clearing Watchman..."
watchman watch-del-all 2>/dev/null || true

# Clear npm cache
echo "📦 Clearing npm cache..."
npm cache clean --force

echo "✅ All caches cleared!"
echo ""
echo "Now run:"
echo "  npm start -- --reset-cache"
echo ""

