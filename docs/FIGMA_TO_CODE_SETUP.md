# 🚀 Figma to Code AI Workflow Setup Guide

This guide will help you set up the revolutionary Figma → AI → Code workflow using Claude Desktop and Cursor IDE with MCP (Model Context Protocol).

## 📋 Prerequisites

- **macOS, Windows, or Linux** computer
- **Node.js** (v18 or higher)
- **Git** installed
- **Figma Account** with access to design files
- **Claude Pro subscription** ($20/month)

## 🛠️ Setup Process

### Step 1: Install Required Software

#### 1.1 Install Node.js
First, verify Node.js is installed:
```bash
node --version  # Should be v18 or higher
npm --version
npx --version
```

If not installed, download from [nodejs.org](https://nodejs.org/)

#### 1.2 Download Claude Desktop
1. Go to [claude.ai/download](https://claude.ai/download)
2. Download Claude Desktop for your OS
3. Install and sign in with your Claude account

#### 1.3 Download Cursor IDE
1. Go to [cursor.com](https://cursor.com)
2. Download Cursor for your OS
3. Install Cursor (it's a fork of VS Code with AI features)

### Step 2: Configure Claude Desktop with MCP

#### 2.1 Enable MCP in Claude Desktop
1. Open Claude Desktop
2. Go to **Claude → Settings** (Mac) or **File → Settings** (Windows/Linux)
3. Click on **Developer** tab
4. Enable **"Model Context Protocol (MCP)"**

#### 2.2 Get Your Figma API Token
1. Go to [Figma.com](https://www.figma.com)
2. Click your profile icon → **Settings**
3. Scroll to **Personal access tokens**
4. Click **"Generate new token"**
5. Name it "Claude MCP Integration"
6. Select **"Read-only"** access
7. **Copy the token immediately** (you won't see it again!)

#### 2.3 Create Claude Desktop Configuration

Find your Claude Desktop config file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

Create or edit this file with the following content:

```json
{
  "mcpServers": {
    "Framelink Figma MCP": {
      "command": "npx",
      "args": ["figma-developer-mcp", "--stdio", "--figma-api-key=YOUR_FIGMA_TOKEN_HERE"]
    }
  }
}
```

Replace `YOUR_FIGMA_TOKEN_HERE` with your actual Figma token.

#### 2.4 (Optional) Add More MCP Servers

For a complete setup like the example, you can add:

```json
{
  "mcpServers": {
    "Framelink Figma MCP": {
      "command": "npx",
      "args": ["figma-developer-mcp", "--stdio", "--figma-api-key=YOUR_FIGMA_TOKEN_HERE"]
    },
    "jetbrains": {
      "command": "npx",
      "args": ["-y", "@jetbrains/mcp-proxy"]
    }
  }
}
```

#### 2.5 Restart Claude Desktop
1. Completely quit Claude Desktop (Cmd+Q on Mac, Alt+F4 on Windows)
2. Reopen Claude Desktop
3. Look for the MCP icon (🔧) in the chat interface
4. Click it to see connected servers

### Step 3: Configure Cursor for Direct File Editing

#### 3.1 Enable Cursor's AI Features
1. Open Cursor
2. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
3. Type "Cursor: Settings" and select it
4. Ensure these are enabled:
   - **AI Autocomplete**: On
   - **Copilot++**: Enabled
   - **Chat**: Enabled

#### 3.2 Configure Cursor for MCP

In Cursor, you have two options for MCP:

**Option A: Built-in Chat (Recommended)**
1. Press `Cmd+L` (Mac) or `Ctrl+L` (Windows/Linux) to open chat
2. Click the settings gear in chat
3. Enable "Experimental Features"
4. Add MCP configuration:

```json
{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": ["figma-developer-mcp", "--stdio", "--figma-api-key=YOUR_FIGMA_TOKEN_HERE"]
    }
  }
}
```

**Option B: Use Claude Desktop + Cursor Together**
1. Use Claude Desktop for Figma analysis
2. Copy generated code
3. Use Cursor's AI to refine and edit directly

#### 3.3 Enable Cursor's Direct File Editing

1. In Cursor Settings, ensure these permissions are enabled:
   - **File System Access**: Allow
   - **Workspace Trust**: Enable
   - **Auto Save**: Enable (recommended)

2. For direct file manipulation in chat:
   - Use `@workspace` to reference your project
   - Use `@file` to reference specific files
   - Example: "@workspace create a new component based on this Figma design"

### Step 4: Verify Everything Works

#### 4.1 Test Claude Desktop MCP
1. Open Claude Desktop
2. Start a new chat
3. Look for the MCP icon (🔧)
4. Type: "Can you connect to Figma and verify access?"
5. You should see Claude use the Figma MCP tool

#### 4.2 Test Cursor Integration
1. Open your project in Cursor
2. Press `Cmd+L` (Mac) or `Ctrl+L` (Windows)
3. Type: "@workspace show me the current project structure"
4. Cursor should list your files

#### 4.3 Test the Full Workflow
1. In Claude Desktop: "Analyze this Figma design: [URL]"
2. In Claude Desktop: "Generate a React component for this"
3. In Cursor: Select the code and use `Cmd+K` to refine
4. Or in Cursor Chat: "@file:ComponentName.tsx update this component with [changes]"

## 🎨 The Complete Workflow

### Using Claude Desktop + Cursor

1. **Analyze in Claude Desktop**
   ```
   "Here's my Figma design: [URL]
   What components and styling do you see?"
   ```

2. **Generate in Claude Desktop**
   ```
   "Convert this to a React component with TypeScript and Tailwind"
   ```

3. **Refine in Cursor**
   - Copy code to Cursor
   - Select code and press `Cmd+K`
   - Or use chat: "@file update this with animations"

### Using Cursor Alone (with MCP)

1. **Open Cursor Chat** (`Cmd+L`)
2. **Direct Conversion**
   ```
   "@workspace create a new component from this Figma design: [URL]
   Save it as components/HeroSection.tsx"
   ```

## 💡 Pro Tips

### Claude Desktop Advantages
- Better Figma analysis with visual understanding
- More complex reasoning about design systems
- Can explain design decisions

### Cursor Advantages  
- Direct file editing without copy/paste
- Better code refactoring
- Integrated terminal and debugging

### Best Practice: Use Both!
1. **Claude Desktop**: For initial analysis and generation
2. **Cursor**: For refinement and integration

## 🔧 Troubleshooting

### Claude Desktop Issues

**MCP Icon Not Showing**
- Ensure Developer mode is enabled
- Check config file syntax (valid JSON)
- Restart Claude Desktop completely

**"Could not attach to MCP server"**
- Verify Node.js is installed: `which node`
- Check your Figma API token has no spaces
- Look at logs: Developer → View MCP Logs

### Cursor Issues

**No AI Features**
- Ensure you're signed in to Cursor
- Check Settings → AI → Enabled
- Verify API usage limits

**Can't Edit Files**
- Check workspace trust settings
- Ensure file permissions are correct
- Try: "Cursor: Reset Settings" from command palette

## 📚 Example Commands

### Claude Desktop (Better for Analysis)
```
"Analyze this complete Figma flow: [URL]"
"What's the design system being used?"
"Generate all components with proper hierarchy"
```

### Cursor (Better for Implementation)
```
"@workspace create all pages from this design"
"@file refactor this to use our UI components"
"Fix TypeScript errors in the current file"
```

## 🚀 Next Steps

1. Start with a simple component in Claude Desktop
2. Move the code to Cursor for refinement
3. Use Cursor's AI for iterations
4. Build entire flows combining both tools

## 🎯 Workflow Comparison

| Task | Claude Desktop | Cursor |
|------|---------------|---------|
| Figma Analysis | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Code Generation | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| File Editing | ⭐⭐ (copy/paste) | ⭐⭐⭐⭐⭐ |
| Refactoring | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Design Reasoning | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

## 📞 Support

- **Claude Desktop**: [claude.ai/help](https://claude.ai/help)
- **Cursor**: [cursor.com/support](https://cursor.com/support)
- **Figma MCP**: [github.com/figma-developer-mcp](https://github.com/figma-developer-mcp)
- **Internal**: Post in #engineering-ai channel

---

Welcome to the future where Dreamweaver's vision is finally real! 🎉

*Last updated: May 2025*
