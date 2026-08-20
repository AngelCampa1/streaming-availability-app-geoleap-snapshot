#!/bin/bash

# Android Install Helper Script for Git Bash on Windows
# This script installs the debug APK to connected device/emulator

set -e

cd "$(dirname "$0")/../mobile/android"

echo "📱 Installing Android APK using PowerShell..."
echo "📍 Current directory: $(pwd)"
echo ""

# Check if gradlew.bat exists
if [ ! -f "gradlew.bat" ]; then
    echo "❌ Error: gradlew.bat not found!"
    echo "Please ensure you're running this from the project root."
    exit 1
fi

# Run gradle install via PowerShell
powershell.exe -Command ".\gradlew.bat installDebug"

echo ""
echo "✅ Installation complete!"
echo "📱 App installed on device/emulator"
