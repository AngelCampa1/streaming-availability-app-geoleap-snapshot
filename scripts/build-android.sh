#!/bin/bash

# Android Build Helper Script for Git Bash on Windows
# This script uses PowerShell to execute gradle commands properly

set -e

cd "$(dirname "$0")/../mobile/android"

echo "🔨 Building Android APK using PowerShell..."
echo "📍 Current directory: $(pwd)"
echo ""

# Check if gradlew.bat exists
if [ ! -f "gradlew.bat" ]; then
    echo "❌ Error: gradlew.bat not found!"
    echo "Please ensure you're running this from the project root."
    exit 1
fi

# Run gradle build via PowerShell
powershell.exe -Command ".\gradlew.bat assembleDebug"

echo ""
echo "✅ Build complete!"
echo "📦 APK location: mobile/android/app/build/outputs/apk/debug/app-debug.apk"
