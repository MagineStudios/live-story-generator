# 🎯 Figma + AI Quick Reference Card

## 🚀 Setup Checklist
- [ ] Node.js installed (v18+)
- [ ] Claude Desktop installed
- [ ] Cursor IDE installed
- [ ] Figma API token generated
- [ ] MCP configured in Claude Desktop
- [ ] Project repository cloned

## 🔧 Claude Desktop MCP Configuration

**Config Location:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**Config Content:**
```json
{
  "mcpServers": {
    "Framelink Figma MCP": {
      "command": "npx",
      "args": ["figma-developer-mcp", "--stdio", "--figma-api-key=YOUR_TOKEN"]
    }
  }
}
```

## 🎨 Essential Commands

### Claude Desktop (Best for Analysis)
```
"Analyze this Figma design: [URL]"
"What components are in this design?"
"Extract the design system"
"Generate React components for all screens"
```

### Cursor (Best for Implementation)
```
"@workspace create component from this Figma: [URL]"
"@file update this component with hover states"
"Fix TypeScript errors"
"Add Framer Motion animations"
```

## 📏 Figma URL Formats
```
# Entire file
figma.com/file/FILE_ID/NAME

# Specific frame
figma.com/file/FILE_ID/NAME?node-id=NODE_ID

# Prototype view
figma.com/proto/FILE_ID/NAME?node-id=NODE_ID
```

## 🔄 The Perfect Workflow

1. **Claude Desktop**: Analyze & Generate
   ```
   You: "Analyze this design: [URL]"
   Claude: [Describes components and structure]
   
   You: "Generate React components"
   Claude: [Creates initial code]
   ```

2. **Cursor**: Refine & Integrate
   ```
   You: "@workspace add this to components/"
   Cursor: [Creates files directly]
   
   You: "Add our standard animations"
   Cursor: [Updates code in place]
   ```

## ⚡ Quick Shortcuts

### Claude Desktop
- New chat: `Cmd+N` (Mac) / `Ctrl+N` (Win)
- Settings: `Cmd+,` (Mac) / `Ctrl+,` (Win)
- View MCP servers: Click 🔧 icon

### Cursor
- AI Chat: `Cmd+L` (Mac) / `Ctrl+L` (Win)
- AI Edit: `Cmd+K` (Mac) / `Ctrl+K` (Win)
- Terminal: `Cmd+J` (Mac) / `Ctrl+J` (Win)

## 🐛 Quick Fixes

### Claude Desktop Issues

**MCP not showing?**
1. Enable Developer mode in settings
2. Restart Claude Desktop completely
3. Check config file syntax

**Can't connect to Figma?**
```bash
# Verify Node.js
which node
node --version

# Check token (no spaces!)
# Regenerate if needed
```

### Cursor Issues

**No AI features?**
1. Sign in to Cursor account
2. Check Settings → AI → Enabled
3. Verify API limits not exceeded

**Can't edit files?**
- Trust workspace when prompted
- Check file permissions
- Use @workspace or @file prefixes

## 💡 Pro Tips

1. **Start in Claude Desktop** for design understanding
2. **Move to Cursor** for implementation
3. **Use both together** for complex features
4. **Reference existing code**: "Use our Button component"
5. **Be specific**: "Match exact Figma spacing"

## 📊 Tool Comparison

| Feature | Claude Desktop | Cursor |
|---------|---------------|---------|
| Figma Analysis | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Visual Understanding | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| Code Generation | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Direct File Editing | ❌ | ⭐⭐⭐⭐⭐ |
| Refactoring | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Terminal Integration | ❌ | ⭐⭐⭐⭐⭐ |

## 🚨 Common Mistakes to Avoid

1. **Don't skip Claude Desktop** - Better design analysis
2. **Don't copy-paste everything** - Use Cursor's @workspace
3. **Don't ignore TypeScript** - Let AI add types
4. **Don't rush** - Iterate for quality

---
💡 **Remember**: This is the future Dreamweaver promised - AI that understands both design AND code!

**Quick Setup**: Run `./scripts/setup-figma-mcp.sh` (Mac/Linux) or `setup-figma-mcp.bat` (Windows)
