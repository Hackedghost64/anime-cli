@echo off
REM ==============================================================================
REM ⚡ SHINSEI ANIME-CLI · WINDOWS CMD INSTALLER LAUNCHER
REM ==============================================================================
echo Launching anime-cli Windows Installer via PowerShell...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-windows.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Installation finished with exit code %ERRORLEVEL%.
)
pause
