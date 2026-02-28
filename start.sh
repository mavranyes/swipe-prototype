#!/bin/bash
# Quick start script for GroupMe Swipe Prototype

echo "🚀 Starting GroupMe Swipe Prototype..."
echo ""
echo "This script starts a local HTTP server required for the GroupMe API."
echo "CORS restrictions prevent file:// protocol from accessing external APIs."
echo ""

# Check if Python is available
if command -v python3 &> /dev/null; then
    echo "Starting local server on http://localhost:8000"
    echo "Press Ctrl+C to stop"
    echo ""
    cd "$(dirname "$0")"
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    echo "Starting local server on http://localhost:8000"
    echo "Press Ctrl+C to stop"
    echo ""
    cd "$(dirname "$0")"
    python -m http.server 8000
else
    echo "❌ Python not found. Please install Python or start a server manually:"
    echo ""
    echo "  Using Node.js:"
    echo "    npx http-server"
    echo ""
    echo "  Using Ruby:"
    echo "    ruby -run -ehttpd . -p 8000"
    echo ""
    echo "  Using PHP:"
    echo "    php -S localhost:8000"
    exit 1
fi
