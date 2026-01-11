#!/bin/bash

# Deployment script for bnos.space website
# Deploys static website files to /var/www/bnos.space/html/

set -e  # Exit on error

# Trap errors and exit to prevent terminal from closing immediately
cleanup_on_error() {
    exit_code=$?
    if [ $exit_code -ne 0 ]; then
        echo ""
        echo "❌ Error occurred! (Exit code: $exit_code)"
        echo "Check the output above for details."
        echo ""
        read -p "Press Enter to close..."
    fi
}

trap cleanup_on_error EXIT ERR

# Load environment variables from .env file
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "   Please create a .env file with SITE_SERVER, SITE_PORT, and SITE_REMOTE_PATH variables."
    exit 1
fi

echo "📋 Loading configuration from .env file..."
export $(grep -v '^#' .env | grep -E '^SITE_' | xargs)

# Validate required variables
if [ -z "$SITE_SERVER" ] || [ -z "$SITE_PORT" ] || [ -z "$SITE_REMOTE_PATH" ]; then
    echo "❌ Error: Missing required environment variables"
    echo "   Please ensure SITE_SERVER, SITE_PORT, and SITE_REMOTE_PATH are set in .env"
    exit 1
fi

# Options
CLEANUP_REMOTE_ZIPS=true  # Remove zip files from server after extraction
CLEANUP_LOCAL_ZIPS=true   # Remove local zip files after upload

WEBSITE_DIR="docs/bnos.space"
ZIP_FILE="bnos-site.zip"

echo "🚀 Starting BNOS website deployment..."
echo "📍 Target: ${SITE_SERVER}:${SITE_REMOTE_PATH}"
echo ""

# Step 1: Validate website directory exists
echo "🔍 Checking website directory..."
if [ ! -d "$WEBSITE_DIR" ]; then
    echo "❌ Error: Website directory not found: $WEBSITE_DIR"
    exit 1
fi
echo "✓ Website directory found"

# Step 2: Create zip file (excluding macOS metadata and git files)
echo ""
echo "📦 Creating website archive..."
cd "$WEBSITE_DIR"
zip -r -X -q "../../${ZIP_FILE}" . -x "*.git*" -x "*__MACOSX*" -x "*.DS_Store"
cd ../..
echo "✓ Archive created: ${ZIP_FILE}"

# Step 3: Upload to server
echo ""
echo "⬆️  Uploading to ${SITE_SERVER}..."
scp -P "${SITE_PORT}" -q "${ZIP_FILE}" "${SITE_SERVER}:${SITE_REMOTE_PATH}/"
echo "✓ Upload complete"

# Step 4: Extract on server
echo ""
echo "📂 Extracting files on server..."
ssh -p "${SITE_PORT}" "${SITE_SERVER}" "cd ${SITE_REMOTE_PATH} && \
    unzip -o -q ${ZIP_FILE} && \
    rm -rf __MACOSX"
echo "✓ Files extracted"

# Step 5: Set proper permissions
echo ""
echo "🔐 Setting permissions..."
ssh -p "${SITE_PORT}" "${SITE_SERVER}" "cd ${SITE_REMOTE_PATH} && \
    find . -type d -exec chmod 755 {} \; && \
    find . -type f -exec chmod 644 {} \;"
echo "✓ Permissions set"

# Step 6: Cleanup remote zip files (if enabled)
if [ "$CLEANUP_REMOTE_ZIPS" = true ]; then
    echo ""
    echo "🧹 Cleaning up remote zip files..."
    ssh -p "${SITE_PORT}" "${SITE_SERVER}" "cd ${SITE_REMOTE_PATH} && rm -f ${ZIP_FILE}"
    echo "✓ Remote cleanup complete"
fi

# Step 7: Cleanup local zip files (if enabled)
if [ "$CLEANUP_LOCAL_ZIPS" = true ]; then
    echo ""
    echo "🧹 Cleaning up local zip files..."
    rm -f "${ZIP_FILE}"
    echo "✓ Local cleanup complete"
fi

echo ""
echo "✅ Deployment complete!"
echo "📍 Website deployed to: ${SITE_SERVER}:${SITE_REMOTE_PATH}/"
echo "🌐 Visit: https://bnos.space"
echo ""
read -p "Press Enter to close..."
