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

# Function to validate SQLite file has data
validate_cache() {
    local file="$1"

    # Check if file exists and has size > 0
    if [ ! -s "$file" ]; then
        echo "ERROR: File is empty or doesn't exist"
        return 1
    fi

    # Check if it's a valid SQLite file (starts with "SQLite format")
    if ! head -c 16 "$file" | grep -q "SQLite format"; then
        echo "ERROR: Not a valid SQLite file"
        echo "First 100 bytes of file:"
        head -c 100 "$file"
        return 1
    fi

    # Check if it has data in metrics_daily_store table
    local count=$(sqlite3 "$file" "SELECT COUNT(*) FROM metrics_daily_store;" 2>/dev/null)
    if [ -z "$count" ] || [ "$count" -eq 0 ]; then
        echo "ERROR: SQLite file has no data in metrics_daily_store"
        return 1
    fi

    echo "Valid SQLite file with $count records in metrics_daily_store"
    return 0
}

# Check if cache file already exists and is valid
if [ -f "$CACHE_FILE" ]; then
    echo "Cache file exists, validating..."
    if validate_cache "$CACHE_FILE"; then
        echo "Existing cache is valid, skipping download"
        ls -lh "$CACHE_FILE"
        exit 0
    else
        echo "Existing cache is invalid, will re-download"
        rm -f "$CACHE_FILE"
    fi
fi

echo "Cache file not found or invalid, downloading from Google Drive..."
echo "IMPORTANT: Make sure the Google Drive file is shared as 'Anyone with the link'"

# Use the direct usercontent URL (works for large files without virus scan warning)
DOWNLOAD_URL="https://drive.usercontent.google.com/download?id=${GDRIVE_FILE_ID}&export=download&confirm=t"

echo "Downloading from: $DOWNLOAD_URL"
echo "This may take several minutes for large files..."

# Download with progress bar (-#) and follow redirects (-L)
curl -# -L -o "$CACHE_FILE" "$DOWNLOAD_URL"

if [ $? -ne 0 ]; then
    echo "ERROR: curl command failed"
    rm -f "$CACHE_FILE"
    exit 1
fi

echo "Download complete. File info:"
ls -lh "$CACHE_FILE"
file "$CACHE_FILE"

# Validate downloaded file
if validate_cache "$CACHE_FILE"; then
    echo "=== Cache download successful ==="
    exit 0
else
    echo ""
    echo "=========================================="
    echo "ERROR: Downloaded file is not valid!"
    echo "=========================================="
    echo ""
    echo "This usually means one of:"
    echo "1. Google Drive file is not shared publicly"
    echo "   -> Go to Google Drive, right-click the file"
    echo "   -> Share -> 'Anyone with the link' -> Viewer"
    echo ""
    echo "2. File ID is incorrect"
    echo "   -> Current File ID: $GDRIVE_FILE_ID"
    echo ""
    echo "3. Google Drive returned an error page"
    echo "   -> Check the file content above"
    echo ""
    rm -f "$CACHE_FILE"
    exit 1
fi
