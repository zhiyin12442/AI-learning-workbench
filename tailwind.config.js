/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'app-bg': '#E4E9F2',
        'workspace-bg': '#F7F8FA',
        'card': '#FFFFFF',
        'ink': '#1F2937',
        'ink-soft': '#6B7280',
        'ink-faint': '#9CA3AF',
        'line': '#F3F4F6',
        'primary': '#286ED3',
        'primary-light': '#5196EA',
        'accent': '#4D3EB4',
        'success': '#10B981',
        'warning': '#F59E0B',
        'danger': '#EF4444',
        'folder-lime': '#84CC16',
        'folder-violet': '#A78BFA',
        'folder-sky': '#38BDF8',
      },
      boxShadow: {
        // 统一卡片静态阴影：在浅灰背景上清晰可见，所有卡片常驻显示，不随悬停变化。
        // ⚠️ 令牌名必须叫 'card-shadow' 而非 'card'——颜色表里已有 'card'(白)，
        // 重名会让 shadow-card 被 Tailwind 解析成 shadow 颜色工具类(白色阴影)而完全隐形
        'card-shadow': '0 4px 12px rgba(0,0,0,0.08)',
        // 主容器阴影（双层柔和）
        'app': '0 10px 40px rgba(0,0,0,0.08), 0 2px 10px rgba(0,0,0,0.04)',
        // 侧边栏激活项阴影：保持常驻静态（与其他卡片区分）
        'nav-active': '0 4px 12px rgba(0,0,0,0.06)',
        // 弹窗遮罩上的浮层
        'modal': '0 8px 24px rgba(17,24,39,0.10), 0 24px 64px -12px rgba(17,24,39,0.18)',
      },
      borderRadius: {
        // 与截图一致的卡片圆角
        'card': '12px',
        'app': '20px',
      },
      spacing: {
        'card-pad': '20px',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
