@echo off
setlocal enabledelayedexpansion

echo ========================================
echo 🚀 Figma to Code AI Workflow Setup
echo ========================================
echo.

REM Check if Node.js is installed
echo 📋 Checking prerequisites...
where node >nul 2>nul
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install it from https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js %NODE_VERSION% is installed
echo.

REM Set config path for Windows
set "CONFIG_PATH=%APPDATA%\Claude\claude_desktop_config.json"
echo 🖥️  Windows configuration detected
echo.

REM Check if Claude Desktop is installed (basic check)
if not exist "%LOCALAPPDATA%\Programs\Claude\Claude.exe" (
    echo ⚠️  Claude Desktop might not be installed.
    echo    Please install it from https://claude.ai/download
    echo.
)

REM Get Figma API token
echo 🔑 Figma API Token Setup
echo ------------------------
echo To get your Figma API token:
echo 1. Go to https://figma.com
echo 2. Click profile icon → Settings
echo 3. Find 'Personal access tokens'
echo 4. Generate a new token with 'Read-only' access
echo.
set /p FIGMA_TOKEN="Enter your Figma API token: "

if "%FIGMA_TOKEN%"=="" (
    echo ❌ No token provided. Exiting...
    pause
    exit /b 1
)

REM Create config directory if it doesn't exist
for %%i in ("%CONFIG_PATH%") do set "CONFIG_DIR=%%~dpi"
if not exist "%CONFIG_DIR%" (
    echo 📁 Creating config directory...
    mkdir "%CONFIG_DIR%"
)

REM Check if config exists
echo.
echo 📝 Creating Claude Desktop configuration...

if exist "%CONFIG_PATH%" (
    echo ⚠️  Existing configuration found!
    echo Choose an option:
    echo 1) Backup existing and create new
    echo 2) View existing config
    echo 3) Cancel
    set /p CHOICE="Your choice (1-3): "
    
    if "!CHOICE!"=="1" (
        copy "%CONFIG_PATH%" "%CONFIG_PATH%.backup.%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.json" >nul
        echo ✅ Backup created
    ) else if "!CHOICE!"=="2" (
        echo.
        echo Current configuration:
        type "%CONFIG_PATH%"
        echo.
        pause
    ) else (
        echo ❌ Setup cancelled
        pause
        exit /b 0
    )
)

REM Create the configuration
echo Creating configuration file...
(
echo {
echo   "mcpServers": {
echo     "Framelink Figma MCP": {
echo       "command": "npx",
echo       "args": ["figma-developer-mcp", "--stdio", "--figma-api-key=%FIGMA_TOKEN%"]
echo     }
echo   }
echo }
) > "%CONFIG_PATH%"

echo ✅ Configuration created successfully!
echo.
echo ==========================================
echo 🎉 Setup Complete!
echo ==========================================
echo.
echo Next steps:
echo 1. Restart Claude Desktop completely
echo 2. Look for the MCP icon in the chat interface
echo 3. Test with: 'Can you connect to Figma and verify access?'
echo.
echo 📍 Config location: %CONFIG_PATH%
echo.
echo 🚀 Ready to convert Figma designs to code!
echo.

REM Optional: Open Cursor download
set /p INSTALL_CURSOR="Would you like to download Cursor IDE? (y/n): "
if /i "%INSTALL_CURSOR%"=="y" (
    echo 🌐 Opening Cursor download page...
    start https://cursor.com
)

echo.
echo Happy coding! 🎨 → 🤖 → 💻
echo.
pause
