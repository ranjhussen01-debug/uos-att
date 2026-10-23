@echo off
title Push UOS Attendance System to GitHub
color 0a

set "GIT_EXE=C:\Users\raway\AppData\Local\Programs\MinGit\cmd\git.exe"
if not exist "%GIT_EXE%" set "GIT_EXE=git"

"%GIT_EXE%" add .
"%GIT_EXE%" commit -m "UOS Attendance System with Firebase and Netlify" 2>nul
"%GIT_EXE%" branch -M main
"%GIT_EXE%" remote remove origin 2>nul
"%GIT_EXE%" remote add origin https://github.com/ranjhussen01-debug/uos-att.git
"%GIT_EXE%" push -u origin main --force

pause
