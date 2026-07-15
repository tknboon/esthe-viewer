@echo off
setlocal

set "ROOT=%~dp0"
set "HOOKS_DIR=%ROOT%.git\hooks"

if not exist "%HOOKS_DIR%" (
  echo Git hooks directory was not found.
  exit /b 1
)

copy /Y "%ROOT%.githooks\pre-commit" "%HOOKS_DIR%\pre-commit" >nul
if errorlevel 1 (
  echo Failed to install the pre-commit hook.
  exit /b 1
)

echo Pre-commit hook installed.
exit /b 0
