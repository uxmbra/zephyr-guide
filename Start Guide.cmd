@echo off
setlocal
title Zephyr RP - Local Guide
pushd "%~dp0" || exit /b 1
set "GUIDE_NODE="
for /f "delims=" %%N in ('where node.exe 2^>nul') do if not defined GUIDE_NODE set "GUIDE_NODE=%%N"
if not defined GUIDE_NODE if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" set "GUIDE_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not defined GUIDE_NODE (
  echo Node.js was not found. Install Node.js LTS from https://nodejs.org and try again.
  echo Instructions: ..\zephyr-storage\docs\LOCAL-SERVER.md
  pause
  popd
  exit /b 1
)
"%GUIDE_NODE%" "%~dp0server.mjs"
if errorlevel 1 pause
popd
endlocal
