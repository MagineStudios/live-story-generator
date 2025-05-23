#!/bin/bash

# Figma to Code AI Workflow Setup Script
# This script helps set up the MCP configuration for Claude Desktop

echo "🚀 Figma to Code AI Workflow Setup"
echo "=================================="
echo ""

# Check if Node.js is installed
echo "📋 Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install it from https://nodejs.org"
    exit 1
fi

echo "✅ Node.js $(node --version) is installed"

# Detect OS
OS="unknown"
CONFIG_PATH=""

if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macOS"
    CONFIG_PATH="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
    OS="Windows"
    CONFIG_PATH="$APPDATA/Claude/claude_desktop_config.json"
else
    OS="Linux"
    CONFIG_PATH="$HOME/.config/Claude/claude_desktop_config.json"
fi

echo "🖥️  Detected OS: $OS"
echo ""

# Check if Claude Desktop is installed
if [[ "$OS" == "macOS" ]]; then
    if [[ ! -d "/Applications/Claude.app" ]]; then
        echo "⚠️  Claude Desktop not found. Please install it from https://claude.ai/download"
        echo ""
    fi
fi

# Get Figma API token
echo "🔑 Figma API Token Setup"
echo "------------------------"
echo "To get your Figma API token:"
echo "1. Go to https://figma.com"
echo "2. Click profile icon → Settings"
echo "3. Find 'Personal access tokens'"
echo "4. Generate a new token with 'Read-only' access"
echo ""
read -p "Enter your Figma API token: " FIGMA_TOKEN

if [[ -z "$FIGMA_TOKEN" ]]; then
    echo "❌ No token provided. Exiting..."
    exit 1
fi

# Create config directory if it doesn't exist
CONFIG_DIR=$(dirname "$CONFIG_PATH")
if [[ ! -d "$CONFIG_DIR" ]]; then
    echo "📁 Creating config directory..."
    mkdir -p "$CONFIG_DIR"
fi

# Create or update config file
echo ""
echo "📝 Creating Claude Desktop configuration..."

# Check if config exists and has content
if [[ -f "$CONFIG_PATH" ]] && [[ -s "$CONFIG_PATH" ]]; then
    echo "⚠️  Existing configuration found!"
    echo "Choose an option:"
    echo "1) Backup existing and create new"
    echo "2) Merge with existing (recommended)"
    echo "3) Cancel"
    read -p "Your choice (1-3): " CHOICE
    
    case $CHOICE in
        1)
            cp "$CONFIG_PATH" "$CONFIG_PATH.backup.$(date +%Y%m%d_%H%M%S)"
            echo "✅ Backup created"
            ;;
        2)
            echo "✅ Will merge with existing config"
            ;;
        3)
            echo "❌ Setup cancelled"
            exit 0
            ;;
        *)
            echo "❌ Invalid choice"
            exit 1
            ;;
    esac
fi

# Create the configuration
cat > "$CONFIG_PATH.tmp" << EOF
{
  "mcpServers": {
    "Framelink Figma MCP": {
      "command": "npx",
      "args": ["figma-developer-mcp", "--stdio", "--figma-api-key=$FIGMA_TOKEN"]
    }
  }
}
EOF

# If merging, handle it properly
if [[ "$CHOICE" == "2" ]] && [[ -f "$CONFIG_PATH" ]]; then
    echo "🔄 Merging configurations..."
    # This is a simple implementation - in production, use proper JSON merging
    echo "⚠️  Please manually merge the configurations"
    echo "Current config: $CONFIG_PATH"
    echo "New config: $CONFIG_PATH.tmp"
else
    mv "$CONFIG_PATH.tmp" "$CONFIG_PATH"
    echo "✅ Configuration created successfully!"
fi

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "Next steps:"
echo "1. Restart Claude Desktop completely"
echo "2. Look for the MCP icon (🔧) in the chat interface"
echo "3. Test with: 'Can you connect to Figma and verify access?'"
echo ""
echo "📍 Config location: $CONFIG_PATH"
echo ""
echo "🚀 Ready to convert Figma designs to code!"
echo ""

# Optional: Install Cursor
read -p "Would you like to download Cursor IDE? (y/n): " INSTALL_CURSOR
if [[ "$INSTALL_CURSOR" == "y" ]]; then
    echo "🌐 Opening Cursor download page..."
    if [[ "$OS" == "macOS" ]]; then
        open "https://cursor.com"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "https://cursor.com"
    else
        echo "Please visit https://cursor.com to download Cursor"
    fi
fi

echo ""
echo "Happy coding! 🎨 → 🤖 → 💻"
