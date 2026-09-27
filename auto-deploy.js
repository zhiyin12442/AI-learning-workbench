#!/usr/bin/env node
/**
 * 自动监听部署脚本（进阶 / 可选）
 *
 * 作用：递归监听 src/ 目录，文件一改动就自动
 *      git add + commit + push，Cloudflare 随之自动重新构建并部署，
 *      实现「改完即上线」，连双击 deploy.bat 都不用。
 *
 * 使用方法（在你的电脑上）：
 *   1. 先运行一次 deploy.bat 完成 GitHub 登录（让系统记住凭证）
 *   2. 打开命令行，进入本文件夹，执行： node auto-deploy.js
 *   3. 保持窗口打开；以后在 WorkBuddy 里修改并保存 src 下的文件，会自动发布
 *   4. 按 Ctrl + C 停止
 *
 * 注意：
 *   - 本脚本依赖已缓存的 GitHub 登录凭证（Git Credential Manager）。
 *     若提示推送失败，请先运行一次 deploy.bat。
 *   - Cloudflare 会读取仓库里的 VITE_* 环境变量（在 Cloudflare 构建设置里配置），
 *     所以无需把 .env 提交到仓库。
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const WATCH_DIR = 'src';
const DEBOUNCE_MS = 4000;

function git(args) {
  const res = spawnSync('git', args, { encoding: 'utf8', stdio: 'inherit' });
  return res.status === 0;
}

function publish(changed) {
  console.log('\n[auto-deploy] 检测到改动：' + changed + '，准备发布...');
  if (!git(['add', '-A'])) { console.error('[auto-deploy] git add 失败'); return; }
  const msg = 'auto: ' + changed + ' @ ' + new Date().toLocaleString('zh-CN');
  if (!git(['commit', '-m', msg])) { console.error('[auto-deploy] 提交失败（可能没有改动）'); return; }
  if (git(['push', 'origin', 'main'])) {
    console.log('[auto-deploy] ✅ 已推送，Cloudflare 将自动构建并部署');
  } else {
    console.error('[auto-deploy] ❌ 推送失败，请先运行一次 deploy.bat 完成 GitHub 登录');
  }
}

// 递归监听目录
function watchDir(dir) {
  fs.readdir(dir, { withFileTypes: true }, (err, entries) => {
    if (err) return;
    entries.forEach((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        watchDir(full);
      } else if (entry.isFile()) {
        fs.watch(full, () => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => publish(full), DEBOUNCE_MS);
        });
      }
    });
  });
}

let timer = null;
if (!fs.existsSync(WATCH_DIR)) {
  console.error('[auto-deploy] 找不到 ' + WATCH_DIR + ' 目录');
  process.exit(1);
}
console.log('[auto-deploy] 监听中：' + path.resolve(WATCH_DIR) + '（含子目录）');
watchDir(WATCH_DIR);
console.log('\n[auto-deploy] 已启动监听。修改 src 下任意文件将自动发布。Ctrl+C 退出。');
