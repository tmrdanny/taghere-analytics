#!/bin/bash

# Ensure SQLite cache exists before starting the app
# Runs at startup time when /data disk is available

CACHE_FILE="${SQLITE_DB_PATH:-/data/cache.db}"

echo "=== Ensure Cache Script ==="
echo "Cache file: $CACHE_FILE"

# Check if cache file exists and has data
if [ -f "$CACHE_FILE" ]; then
    FILE_SIZE=$(stat -c%s "$CACHE_FILE" 2>/dev/null || stat -f%z "$CACHE_FILE" 2>/dev/null || echo "0")
    echo "Existing cache file size: $FILE_SIZE bytes"

    # If file is larger than 1MB, assume it has data
    if [ "$FILE_SIZE" -gt 1000000 ]; then
        echo "Cache file exists and appears valid (size > 1MB)"
        echo "Skipping cache build"
        exit 0
    else
        echo "Cache file exists but is too small, will rebuild"
        rm -f "$CACHE_FILE"
    fi
fi

echo ""
echo "Cache file not found or empty. Building from MongoDB..."
echo "This may take 5-15 minutes for 2 years of data..."
echo ""

# Run the cache build script
npx tsx scripts/build-cache.ts

BUILD_EXIT=$?

if [ $BUILD_EXIT -ne 0 ]; then
    echo "ERROR: Cache build failed with exit code $BUILD_EXIT"
    exit 1
fi

echo ""
echo "=== Cache build complete ==="
