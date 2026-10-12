@echo off
chcp 65001 >nul
title RadarTG - Local Server

echo ========================================================
echo               RadarTG Local Server
echo ========================================================
echo.

if not exist node_modules (
    echo [1/2] Installing dependencies, please wait...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed. Please check your Node.js installation.
        pause
        exit /b 1
    )
)

echo.
echo [2/2] Starting server at http://localhost:3000 ...
echo Database file: data\radar_database.json
echo Press Ctrl+C in this console to stop the server.
echo.

start "" "http://localhost:3000"

call npx --yes tsx server.ts

if errorlevel 1 (
    echo.
    echo [ERROR] Failed to run server.
    pause
)
