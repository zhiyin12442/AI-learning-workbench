@echo off
cd /d "%~dp0"
set "LOG=%~dp0deploy.log.txt"

if exist "%LOG%" del "%LOG%" >nul 2>nul

echo [%date% %time%] ===== deploy start ===== > "%LOG%"

REM 1) check git
where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git not found. Install Git for Windows: https://git-scm.com/download/win
  echo         Check "Git Credential Manager" and "Add to PATH" during install.
  pause
  exit /b 1
)
echo [OK] git found. >> "%LOG%"

REM 2) git identity (first time only)
git config --global user.email "zhiyin12442@users.noreply.github.com" 2>nul
git config --global user.name "zhiyin12442" 2>nul
git config --global credential.helper manager 2>nul

REM 3) check remote
git remote get-url origin >nul 2>nul
if errorlevel 1 (
  echo [ERROR] No remote "origin" set yet.
  echo.
  echo   Do this once:
  echo     1. Create an empty repo at https://github.com/new
  echo     2. Run: git remote add origin https://github.com/YOUR-NAME/YOUR-REPO.git
  echo     3. Run this deploy.bat again.
  echo.
  pause
  exit /b 1
)

REM 4) commit (continue even if nothing to commit)
git add -A >> "%LOG%" 2>&1
git commit -m "update nexdo" >> "%LOG%" 2>&1
if errorlevel 1 echo [INFO] Nothing new to commit, still pushing. >> "%LOG%"

REM 5) push to GitHub
echo.
echo [....] Pushing to GitHub... (first time: a browser window will pop up, log in once)
echo [....] Pushing to GitHub... >> "%LOG%"
git push -f -u origin main >> "%LOG%" 2>&1
if errorlevel 1 (
  echo [FAIL] Push failed. Common causes:
  echo   1. First-time login: a browser window should pop up, log in with your GitHub account.
  echo   2. Auth error: create a Classic Token at https://github.com/settings/tokens
  echo      with "repo" scope, then use GitHub username + token as password.
  echo   See deploy.log.txt for details.
  echo.
  pause
  exit /b 1
)

echo.
echo ============================================================
echo   DONE! Code pushed to GitHub.
echo   Cloudflare will auto-build and deploy in about a minute.
echo.
echo   Refresh the web page (or reopen the app) to see updates.
echo ============================================================
echo.
pause
