#!/bin/bash

# macOS Uninstall Cleanup Script for gscrape
# This script removes all application data when the app is uninstalled

echo "Cleaning up gscrape data..."

# Remove Application Support data
rm -rf "$HOME/Library/Application Support/gscrape"

# Remove Caches
rm -rf "$HOME/Library/Caches/gscrape"

# Remove Preferences
rm -f "$HOME/Library/Preferences/com.gscrape.app.plist"

# Remove Logs
rm -rf "$HOME/Library/Logs/gscrape"

echo "gscrape data cleanup complete"
