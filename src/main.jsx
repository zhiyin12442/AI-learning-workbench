import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { DataProvider } from './lib/store.jsx'
import './index.css'

// 注册 service worker：让 iPad / 手机主屏 PWA 每次都拉取线上最新代码
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const hadController = !!navigator.serviceWorker.controller
    navigator.serviceWorker
      .register('/sw.js')
      .then(() => {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!hadController) {
            // 首次激活：静默刷新一次以接管页面控制权，不弹提示
            window.location.reload()
            return
          }
          // 后续每次新部署：通知页面弹出「更新」提示
          window.dispatchEvent(new Event('nexdo:update-available'))
        })
      })
      .catch(() => {})
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <DataProvider>
        <App />
      </DataProvider>
    </BrowserRouter>
  </React.StrictMode>
)
