@echo off
setlocal
title Zephyr RP - Publish Guide
pushd "%~dp0" || exit /b 1

where git.exe >nul 2>nul
if errorlevel 1 (
  echo Git was not found. Install Git for Windows from https://git-scm.com and try again.
  goto fail
)

set "GUIDE_NODE="
for /f "delims=" %%N in ('where node.exe 2^>nul') do if not defined GUIDE_NODE set "GUIDE_NODE=%%N"
if not defined GUIDE_NODE if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" set "GUIDE_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

echo.
echo Getting the latest version from GitHub...
git pull --rebase --autostash origin main
if errorlevel 1 (
  echo.
  echo Could not get the latest version. Nothing was published.
  goto fail
)

echo.
echo Changes to publish:
git status --short
set "CHANGED="
for /f "delims=" %%L in ('git status --porcelain') do set "CHANGED=1"

if defined GUIDE_NODE (
  echo.
  echo Running the tests...
  "%GUIDE_NODE%" --test tests/
  if errorlevel 1 (
    echo.
    echo The tests failed, so nothing was published. Fix the problem above and run this again.
    goto fail
  )
) else (
  echo.
  echo Node.js was not found, so the tests will only run on GitHub.
)

if not defined CHANGED goto push

echo.
set "MSG="
set /p "MSG=Describe your change (or press Enter for "Update guide"): "
if not defined MSG set "MSG=Update guide"
set "MSG=%MSG:"='%"

git add -A
git commit -q -m "%MSG%"
if errorlevel 1 (
  echo.
  echo The commit failed. Nothing was published.
  goto fail
)

:push
echo.
echo Publishing...
git push origin main
if errorlevel 1 (
  echo.
  echo The push failed. Your change is saved locally; run this again to retry.
  goto fail
)

echo.
echo Published. The live site updates in about a minute:
echo   https://uxmbra.github.io/zephyr-guide/
echo Progress and any errors: https://github.com/uxmbra/zephyr-guide/actions
echo.
pause
popd
exit /b 0

:fail
echo.
pause
popd
exit /b 1
