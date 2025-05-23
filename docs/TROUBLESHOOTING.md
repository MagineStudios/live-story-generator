# 🔧 Troubleshooting Guide

## Claude Desktop Issues

### 🚫 "MCP icon not showing"

**Symptoms:**
- No 🔧 icon in Claude Desktop chat
- Can't access Figma features

**Solutions:**
1. **Enable Developer Mode**
   - Claude → Settings → Developer → Enable Developer Mode
   - Restart Claude Desktop completely (Cmd+Q / Alt+F4)

2. **Check Config File**
   ```bash
   # macOS
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
   
   # Windows
   type %APPDATA%\Claude\claude_desktop_config.json
   ```
   
3. **Validate JSON**
   - Copy your config to [jsonlint.com](https://jsonlint.com)
   - Fix any syntax errors
   - Common issue: Missing comma or quotes

### 🚫 "Could not attach to MCP server"

**Solutions:**
1. **Verify Node.js Installation**
   ```bash
   node --version
   npm --version
   which node  # Should show path
   ```

2. **Test MCP Server Manually**
   ```bash
   npx figma-developer-mcp --help
   ```

3. **Check Figma Token**
   - No spaces before/after token
   - Token hasn't expired
   - Has read-only permissions

### 🚫 "Failed to fetch Figma data"

**Solutions:**
1. **Verify File Access**
   - Ensure you have view access to the Figma file
   - Try opening the URL in browser first

2. **Check Token Permissions**
   - Regenerate token with all read permissions
   - Test with a public Figma file first

3. **Use Specific Node ID**
   ```
   # Instead of: figma.com/file/ABC123/Design
   # Use: figma.com/file/ABC123/Design?node-id=1:2
   ```

## Cursor Issues

### 🚫 "No AI features available"

**Solutions:**
1. **Check Authentication**
   - Sign out and sign back in
   - Verify subscription status

2. **Reset AI Settings**
   - Cmd+Shift+P → "Cursor: Reset AI Settings"
   - Restart Cursor

3. **Check Usage Limits**
   - Free tier has limits
   - Check Settings → Account → Usage

### 🚫 "Can't edit files directly"

**Solutions:**
1. **Trust Workspace**
   - When prompted, select "Trust"
   - Or: File → Trust Workspace

2. **Use Correct Syntax**
   ```
   ✅ "@workspace create a new file"
   ✅ "@file update this component"
   ❌ "create a new file" (missing prefix)
   ```

3. **Check Permissions**
   ```bash
   # Make files writable
   chmod -R u+w .
   ```

### 🚫 "MCP not working in Cursor"

**Note:** Cursor's MCP support is experimental. Alternative approach:

1. **Use Claude Desktop for Figma**
2. **Copy code to Cursor**
3. **Use Cursor's native AI for editing**

## Common Setup Mistakes

### ❌ Wrong Config Path

**macOS Users:**
```bash
# Wrong
~/.claude/config.json

# Correct
~/Library/Application\ Support/Claude/claude_desktop_config.json
```

### ❌ Invalid JSON Format

**Wrong:**
```json
{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": ["figma-developer-mcp" "--stdio"] // Missing comma
    }
  }
}
```

**Correct:**
```json
{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": ["figma-developer-mcp", "--stdio"]
    }
  }
}
```

### ❌ Token in Wrong Place

**Wrong:**
```json
"args": ["figma-developer-mcp", "--stdio", "YOUR_TOKEN"]
```

**Correct:**
```json
"args": ["figma-developer-mcp", "--stdio", "--figma-api-key=YOUR_TOKEN"]
```

## Platform-Specific Issues

### macOS

**"npx: command not found"**
```bash
# If using nvm
echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Or create symlink
sudo ln -s $(which npx) /usr/local/bin/npx
```

### Windows

**"Cannot find module"**
1. Run as Administrator
2. Clear npm cache:
   ```cmd
   npm cache clean --force
   ```
3. Reinstall globally:
   ```cmd
   npm install -g figma-developer-mcp
   ```

### Linux

**Permission Issues**
```bash
# Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

## Quick Diagnostic Commands

```bash
# Check everything is installed
node --version
npm --version
npx --version

# Test Figma MCP
npx figma-developer-mcp --version

# Find Claude config
# macOS
ls -la ~/Library/Application\ Support/Claude/

# Windows (in PowerShell)
dir $env:APPDATA\Claude\

# Test manual MCP connection
npx figma-developer-mcp --stdio --figma-api-key=YOUR_TOKEN
```

## Still Having Issues?

1. **Collect Logs**
   - Claude: Developer → View MCP Logs
   - Cursor: View → Output → Extension Host

2. **Try the Scripts**
   ```bash
   # macOS/Linux
   ./scripts/setup-figma-mcp.sh
   
   # Windows
   scripts\setup-figma-mcp.bat
   ```

3. **Ask for Help**
   - Include your OS version
   - Copy error messages
   - Share config (without token!)

---

💡 **Pro Tip**: When in doubt, restart both Claude Desktop and Cursor. Many issues are resolved with a fresh start!
