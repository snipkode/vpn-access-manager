#!/bin/bash

# VPN Access Frontend - Android Development Script
# Skip build and run dev mode directly

echo "🔧 VPN Access Frontend - Android Development Mode"
echo "=================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Set environment variables
export NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS="--max-old-space-size=2048"

echo -e "${BLUE}Note: Building on Android can be problematic.${NC}"
echo -e "${BLUE}Recommendation: Use development mode instead.${NC}"
echo ""

echo -e "${YELLOW}Options:${NC}"
echo "  1. Run development mode (recommended)"
echo "  2. Try production build (may fail on Android)"
echo "  3. Clean and try build"
echo ""
read -p "Choose option (1-3): " choice

case $choice in
    1)
        echo ""
        echo -e "${YELLOW}Starting development server...${NC}"
        echo ""
        npm run dev
        ;;
    2)
        echo ""
        echo -e "${YELLOW}Attempting production build...${NC}"
        echo "This may fail on Android ARM64 due to SWC issues."
        echo ""
        rm -rf .next
        npm run build
        ;;
    3)
        echo ""
        echo -e "${YELLOW}Cleaning cache and rebuilding...${NC}"
        rm -rf .next
        rm -rf node_modules/.cache
        rm -rf .eslintcache
        npm run build
        ;;
    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac
