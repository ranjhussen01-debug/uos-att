@echo off
title UOS Attendance System - Firebase Live
color 0a
echo ================================================================
echo   UOS Attendance System (Firebase: uosattendance-df9e3)
echo ================================================================
echo.
echo Starting backend server on http://localhost:3000 ...
echo.

start "" "http://localhost:3000"
node server.js

pause
