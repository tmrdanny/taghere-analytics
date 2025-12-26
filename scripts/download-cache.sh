#!/bin/bash

# Download SQLite cache from Google Drive if not exists
# This script runs before the app starts on Render

CACHE_DIR="${SQLITE_DB_PATH%/*}"
CACHE_FILE="${SQLITE_DB_PATH:-/data/cache.db}"
GDRIVE_FILE_ID="1vHkXU788eyq8qkortTPH8lZ2Kxo7DUfp"

echo "=== Cache Download Script ==="
echo "Cache directory: $CACHE_DIR"
echo "Cache file: $CACHE_FILE"

# Create cache directory if it doesn't exist
if [ ! -d "$CACHE_DIR" ]; then
    echo "Creating cache directory: $CACHE_DIR"
    mkdir -p "$CACHE_DIR"
fi

# Check if cache file already exists
if [ -f "$CACHE_FILE" ]; then
    echo "Cache file already exists, skipping download"
    ls -lh "$CACHE_FILE"
    exit 0
fi

echo "Cache file not found, downloading from Google Drive..."

# Download from Google Drive (handles large files with confirmation)
# Using the direct download URL format for large files
DOWNLOAD_URL="https://drive.google.com/uc?export=download&id=${GDRIVE_FILE_ID}&confirm=t"

echo "Downloading cache.db..."
curl -L -o "$CACHE_FILE" "$DOWNLOAD_URL"

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to download cache file"
    exit 1
fi

echo "Download complete. File size:"
ls -lh "$CACHE_FILE"

# Verify it's a valid SQLite file
if file "$CACHE_FILE" | grep -q "SQLite"; then
    echo "Valid SQLite database file confirmed"
else
    echo "WARNING: Downloaded file may not be a valid SQLite database"
    file "$CACHE_FILE"
fi

echo "=== Cache download completed ==="
