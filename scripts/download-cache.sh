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

# Check if cache file already exists and is valid SQLite
if [ -f "$CACHE_FILE" ]; then
    FILE_SIZE=$(stat -f%z "$CACHE_FILE" 2>/dev/null || stat -c%s "$CACHE_FILE" 2>/dev/null || echo "0")
    echo "Existing cache file size: $FILE_SIZE bytes"

    # Check if it starts with SQLite header and is > 1MB (valid cache should be ~1.5GB)
    if head -c 16 "$CACHE_FILE" 2>/dev/null | grep -q "SQLite format" && [ "$FILE_SIZE" -gt 1000000 ]; then
        echo "Existing cache is valid SQLite (size > 1MB), skipping download"
        ls -lh "$CACHE_FILE"
        exit 0
    else
        echo "Existing cache is invalid or too small, will re-download"
        rm -f "$CACHE_FILE"
    fi
fi

echo "Cache file not found or invalid, downloading from Google Drive..."
echo "File ID: $GDRIVE_FILE_ID"

# Use the direct usercontent URL (works for large files without virus scan warning)
DOWNLOAD_URL="https://drive.usercontent.google.com/download?id=${GDRIVE_FILE_ID}&export=download&confirm=t"

echo "Downloading from: $DOWNLOAD_URL"
echo "This may take several minutes for large files (~1.5GB)..."

# Download with follow redirects (-L), show errors (-S), fail on HTTP errors (-f)
curl -L -S -f -o "$CACHE_FILE" "$DOWNLOAD_URL"
CURL_EXIT=$?

if [ $CURL_EXIT -ne 0 ]; then
    echo "ERROR: curl failed with exit code $CURL_EXIT"
    rm -f "$CACHE_FILE"
    exit 1
fi

echo "Download complete. File info:"
ls -lh "$CACHE_FILE"

# Quick validation: check SQLite header
if head -c 16 "$CACHE_FILE" 2>/dev/null | grep -q "SQLite format"; then
    echo "=== Valid SQLite file downloaded successfully ==="
    exit 0
else
    echo "ERROR: Downloaded file is not a valid SQLite database"
    echo "First 100 bytes:"
    head -c 100 "$CACHE_FILE" | cat -v
    rm -f "$CACHE_FILE"
    exit 1
fi
