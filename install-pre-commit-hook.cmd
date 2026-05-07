@echo off
setlocal

set "ROOT=%~dp0"
set "HOOKS_DIR=%ROOT%.git\hooks"

if not exist "%HOOKS_DIR%" (
  echo .git\hooks が見つかりませんでした。
  exit /b 1
)

copy /Y "%ROOT%.githooks\pre-commit" "%HOOKS_DIR%\pre-commit" >nul
if errorlevel 1 (
  echo pre-commit のコピーに失敗しました。
  exit /b 1
)

echo pre-commit hook を設定しました。
exit /b 0
