@echo off
cd /d "%~dp0"
set "LOG=%~dp0deploy.log.txt"

if exist "%LOG%" del "%LOG%" >nul 2>nul

echo [%date% %time%] ===== 开始发布 ===== > "%LOG%"
echo [说明] 若窗口一闪而过，请打开本文件夹里的 deploy.log.txt 查看结果。 >> "%LOG%"

REM 1) 检查 git
where git >nul 2>nul
if errorlevel 1 (
  echo [错误] 未检测到 Git。请先安装 Git for Windows：https://git-scm.com/download/win
  echo       安装时一路 Next，并勾选 Git Credential Manager 与 Add to PATH。
  pause
  exit /b 1
)
echo [OK] 检测到 Git。 >> "%LOG%"

REM 2) 配置 Git 身份（只需第一次）
git config --global user.email "zhiyin12442@users.noreply.github.com" 2>nul
git config --global user.name "zhiyin12442" 2>nul
git config --global credential.helper manager 2>nul

REM 3) 检查远程仓库是否已连接
git remote get-url origin >nul 2>nul
if errorlevel 1 (
  echo [错误] 尚未设置 GitHub 远程仓库（origin）。
  echo.
  echo   请先做一次（只需一次）：
  echo     1. 到 https://github.com/new 新建仓库（名字随意，如 nexdo-learning-workbench），
  echo        不要勾选 README/.gitignore（保持空仓库）。
  echo     2. 在本文件夹打开命令行，执行：
  echo        git remote add origin https://github.com/zhiyin12442/nexdo-learning-workbench.git
  echo     3. 再双击本 deploy.bat。
  echo.
  pause
  exit /b 1
)

REM 4) 暂存并提交
git add -A >> "%LOG%" 2>&1
git commit -m "update nexdo" >> "%LOG%" 2>&1
if errorlevel 1 (
  echo [提示] 没有新的改动可提交。
  echo.
  pause
  exit /b 1
)
echo [OK] 已提交本地改动。 >> "%LOG%"

REM 5) 推送到 GitHub（Cloudflare 连接该仓库后会自动构建并部署）
echo.
echo [正在] 推送到 GitHub...（首次会弹浏览器登录，登录一次后自动记住）
echo [正在] 推送到 GitHub... >> "%LOG%"
git push -f -u origin main >> "%LOG%" 2>&1
if errorlevel 1 (
  echo [失败] 推送失败。常见原因：
  echo   1. 首次需登录 GitHub：窗口可能弹出浏览器，用建仓库的账号登录一次即可。
  echo   2. 认证失败：到 https://github.com/settings/tokens 生成 Classic Token（勾 repo），
  echo      弹窗里用「GitHub 用户名 + 该 Token」登录。
  echo   3. 端口 22 被封：改用 HTTPS 方式（本机 HTTPS 上传此前不稳定时可重试）。
  echo   详见 deploy.log.txt。
  echo.
  pause
  exit /b 1
)

echo. >> "%LOG%"
echo [成功] 代码已推送到 GitHub，Cloudflare 会自动重新构建并部署。
echo ============================================================
echo   完成！GitHub 已收到新代码，Cloudflare 会在几十秒内自动部署。
echo.
echo   在设备上刷新网页，或把 App 从后台划掉再重开，即可看到最新版本。
echo ============================================================
echo.
pause
