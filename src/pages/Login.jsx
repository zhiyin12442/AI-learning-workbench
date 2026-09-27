import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('signin')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setMsg('')
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setMsg(error.message)
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) setMsg(error.message)
        else setMsg('注册成功，请查收确认邮件后登录。')
      }
    } finally {
      setBusy(false)
    }
  }

  const magic = async () => {
    setBusy(true); setMsg('')
    const { error } = await supabase.auth.signInWithOtp({ email })
    setMsg(error ? error.message : '魔术链接已发送，请查收邮箱。')
    setBusy(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="card w-full max-w-sm p-8">
        <div className="flex items-center gap-2.5 mb-6">
          <span className="w-9 h-9 rounded-[10px] bg-accent flex items-center justify-center">
            <ArrowUpRight size={18} className="text-white" strokeWidth={2.5} />
          </span>
          <span className="text-xl font-bold text-gray-900">Nexdo</span>
        </div>
        <h1 className="text-lg font-semibold text-gray-900 mb-1">登录你的学习工作台</h1>
        <p className="text-sm text-ink-soft mb-6">数据仅你可见，跨设备自动同步。</p>
        <form onSubmit={submit}>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="邮箱地址" className="w-full mb-3" />
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="密码（至少 6 位）" className="w-full mb-4" />
          <button disabled={busy} className="btn-primary w-full min-h-[44px] disabled:opacity-60">
            {busy ? '请稍候...' : mode === 'signin' ? '登录' : '注册'}
          </button>
        </form>
        <button onClick={magic} disabled={busy} className="btn-ghost w-full mt-3 min-h-[44px]">发送魔术链接登录</button>
        <button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} className="w-full text-center text-sm text-primary mt-5 min-h-[44px]">
          {mode === 'signin' ? '还没有账号？注册一个' : '已有账号？去登录'}
        </button>
        {msg && <p className="text-xs text-ink-soft mt-4 text-center">{msg}</p>}
      </div>
    </div>
  )
}
