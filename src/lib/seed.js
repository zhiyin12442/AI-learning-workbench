// 演示用种子数据（未配置 Supabase 时使用，配置后会被云端数据替代）
const today = new Date()
const d = (offset) => {
  const dt = new Date(today)
  dt.setDate(dt.getDate() + offset)
  return dt.toISOString().slice(0, 10)
}

export const DEMO_USER = { id: 'demo-user', email: 'jonathan@nexdo.app', name: 'Jonathan' }

export const AVATARS = [
  'https://i.pravatar.cc/64?img=12',
  'https://i.pravatar.cc/64?img=32',
  'https://i.pravatar.cc/64?img=59',
  'https://i.pravatar.cc/64?img=15',
  'https://i.pravatar.cc/64?img=68',
]

export const ACTIVITIES = [
  { user: '张伟', avatar: AVATARS[0], action: '标记《React Hooks 深入解析》为进行中', project: '前端知识体系', time: '今天 13.11.2025' },
  { user: '李南', avatar: AVATARS[1], action: '完成了概念「闭包与作用域」的整理', project: '前端知识体系', time: '今天 13.11.2025' },
  { user: 'Ethan', avatar: AVATARS[2], action: '完成了任务「搭建 Supabase 数据表」', project: 'AI 学习工作台', time: '昨天 12.11.2025' },
  { user: '王超', avatar: AVATARS[3], action: '正在复盘「AI 辅助编程的三个心得」', project: 'AI 学习工作台', time: '昨天 12.11.2025' },
  { user: 'Mason', avatar: AVATARS[4], action: '取消了任务「调研 vector database」', project: 'RAG 知识库项目', time: '昨天 12.11.2025' },
  { user: '林小雨', avatar: AVATARS[1], action: '标记任务「部署到 Vercel」为受阻', project: 'RAG 知识库项目', time: '11.11.2025' },
]

export const SEED = {
  concepts: [
    { id: 'c1', group_name: '前端知识', name: '闭包与作用域', description: '闭包是指函数能够记住并访问其词法作用域，即使函数在其作用域之外执行。常用于私有变量、柯里化和回调。', tags: ['JavaScript', '基础'], created_at: d(-30) },
    { id: 'c2', group_name: '前端知识', name: 'React Fiber 架构', description: 'Fiber 是 React 16 引入的协调引擎，将渲染拆分为可中断的小任务单元，支持时间切片与优先级调度。', tags: ['React', '源码'], created_at: d(-25) },
    { id: 'c3', group_name: '前端知识', name: 'CSS 容器查询', description: '@container 让组件根据父容器尺寸而非视口响应式变化，适合组件库与设计系统场景。', tags: ['CSS'], created_at: d(-20) },
    { id: 'c4', group_name: '后端知识', name: '数据库索引原理', description: 'B+ 树索引将数据按序存储，叶子节点链表遍历适合范围查询；联合索引遵循最左前缀匹配。', tags: ['数据库', '性能'], created_at: d(-18) },
    { id: 'c5', group_name: '后端知识', name: 'JWT 与 Session 对比', description: 'JWT 无状态、适合分布式；Session 有状态、便于主动失效。选型取决于是否需要服务端撤销能力。', tags: ['认证'], created_at: d(-12) },
    { id: 'c6', group_name: 'AI 概念', name: 'Embedding 向量', description: '将文本映射为高维向量，语义相近的文本距离更近，是语义检索与 RAG 的基石。', tags: ['AI', 'RAG'], created_at: d(-9) },
    { id: 'c7', group_name: 'AI 概念', name: 'RAG 检索增强生成', description: '先检索知识库片段再交给 LLM 生成答案，可缓解幻觉并支持私有知识。', tags: ['AI', 'RAG'], created_at: d(-5) },
    { id: 'c8', group_name: 'AI 概念', name: 'Prompt few-shot 技巧', description: '通过在提示词中给出少量示例，引导模型输出格式与风格，比零样本更稳定。', tags: ['AI', 'Prompt'], created_at: d(-2) },
  ],
  study_logs: [
    { id: 's1', video_name: 'React Hooks 深入解析', study_date: d(0), platform: 'B站', topic: '前端', duration_minutes: 45, note: 'useEffect 依赖数组与闭包陷阱', skill_installed: true, created_at: d(0) },
    { id: 's2', video_name: 'Tailwind CSS 设计系统实战', study_date: d(0), platform: 'YouTube', topic: '前端', duration_minutes: 38, note: '设计 token 落地方式', skill_installed: false, created_at: d(0) },
    { id: 's3', video_name: 'Supabase Row Level Security 详解', study_date: d(-1), platform: 'B站', topic: '后端', duration_minutes: 52, note: 'policy 的 using 与 with check 区别', skill_installed: true, created_at: d(-1) },
    { id: 's4', video_name: 'RAG 系统从零搭建', study_date: d(-2), platform: '慕课网', topic: 'AI', duration_minutes: 66, note: 'chunk 策略对召回率影响很大', skill_installed: false, created_at: d(-2) },
    { id: 's5', video_name: 'Vite 插件机制剖析', study_date: d(-3), platform: 'B站', topic: '工程化', duration_minutes: 40, note: '', skill_installed: false, created_at: d(-3) },
    { id: 's6', video_name: '大模型 Agent 入门', study_date: d(-4), platform: 'YouTube', topic: 'AI', duration_minutes: 58, note: '工具调用循环', skill_installed: true, created_at: d(-4) },
    { id: 's7', video_name: 'TypeScript 类型体操精选', study_date: d(-6), platform: 'B站', topic: '前端', duration_minutes: 47, note: '', skill_installed: false, created_at: d(-6) },
    { id: 's8', video_name: 'PostgreSQL 查询优化', study_date: d(-7), platform: '极客时间', topic: '后端', duration_minutes: 35, note: 'explain analyze 实操', skill_installed: false, created_at: d(-7) },
    { id: 's9', video_name: 'React Server Components 讲解', study_date: d(-8), platform: 'YouTube', topic: '前端', duration_minutes: 62, note: '', skill_installed: false, created_at: d(-8) },
    { id: 's10', video_name: 'Embedding 模型选型指南', study_date: d(-10), platform: 'B站', topic: 'AI', duration_minutes: 29, note: 'bge 与 openai 对比', skill_installed: false, created_at: d(-10) },
    { id: 's11', video_name: '前端性能优化全景图', study_date: d(-12), platform: '慕课网', topic: '前端', duration_minutes: 71, note: '', skill_installed: false, created_at: d(-12) },
    { id: 's12', video_name: '微前端方案对比', study_date: d(-14), platform: 'B站', topic: '架构', duration_minutes: 44, note: '', skill_installed: false, created_at: d(-14) },
  ],
  resources: [
    { id: 'r1', category: 'skill', name: 'supabase-schema-designer', url: 'https://github.com/topics/supabase', description: '快速设计带 RLS 的表结构', installed: true, created_at: d(-20) },
    { id: 'r2', category: 'skill', name: 'tailwind-tokens-sync', url: 'https://tailwindcss.com/docs/configuration', description: '设计 token 与 Tailwind 配置同步', installed: true, created_at: d(-18) },
    { id: 'r3', category: 'skill', name: 'rag-pipeline-starter', url: 'https://github.com/vercel/ai', description: 'RAG 检索问答最小可用流水线', installed: false, created_at: d(-10) },
    { id: 'r4', category: 'skill', name: 'vite-pwa-kit', url: 'https://vite-pwa-org.netlify.app/', description: 'Vite 项目一键 PWA 化', installed: false, created_at: d(-6) },
    { id: 'r5', category: 'project', name: 'shadcn/ui', url: 'https://ui.shadcn.com/', description: '可复制粘贴的组件源码库，学习组件设计', installed: false, created_at: d(-15) },
    { id: 'r6', category: 'project', name: 'excalidraw', url: 'https://github.com/excalidraw/excalidraw', description: '白板应用架构与 Canvas 渲染方案', installed: false, created_at: d(-9) },
    { id: 'r7', category: 'website', name: 'MDN Web Docs', url: 'https://developer.mozilla.org/zh-CN/', description: 'Web 标准权威文档', installed: false, created_at: d(-30) },
    { id: 'r8', category: 'website', name: 'react.dev', url: 'https://react.dev/', description: 'React 官方新文档，含交互式教程', installed: false, created_at: d(-22) },
  ],
  project_ideas: [
    {
      id: 'p1', name: 'AI 学习工作台', status: '进行中', goal: '把概念、视频、资源、项目、复盘集中在一个工作台里管理学习闭环。',
      stack: ['React', 'Tailwind', 'Supabase'], required_skills: ['supabase-schema-designer', 'tailwind-tokens-sync'],
      steps: [{ text: '设计数据模型与 RLS 策略', done: true }, { text: '实现 Dashboard 总览', done: true }, { text: '实现六大板块页面', done: true }, { text: '接入 Supabase 认证与同步', done: false }, { text: '响应式与 iPad 适配', done: false }],
      reference_links: ['https://react.dev/', 'https://supabase.com/docs'],
      notes: '先跑通本地演示模式，再无缝切到云端。', archived: false, pinned: true, created_at: d(-25), updated_at: d(0),
    },
    {
      id: 'p2', name: 'RAG 知识库助手', status: '进行中', goal: '基于个人笔记构建一个可问答的私有知识库。',
      stack: ['Next.js', 'pgvector', 'OpenAI'], required_skills: ['rag-pipeline-starter'],
      steps: [{ text: '调研 embedding 方案', done: true }, { text: '实现文档切片与入库', done: false }, { text: '实现检索问答 UI', done: false }],
      reference_links: ['https://js.langchain.com/'], notes: '', archived: false, pinned: false, created_at: d(-12), updated_at: d(-3),
    },
    {
      id: 'p3', name: '个人博客重构', status: '未开始', goal: '用 VitePress 重构博客并加入深色模式与全文搜索。',
      stack: ['VitePress'], required_skills: [], steps: [{ text: '梳理旧文章结构', done: false }], reference_links: [], notes: '', archived: false, pinned: false, created_at: d(-8), updated_at: d(-8),
    },
    {
      id: 'p4', name: '打卡热力图小组件', status: '已完成', goal: '做一个类似 GitHub contributions 的学习打卡热力图。',
      stack: ['React', 'date-fns'], required_skills: [], steps: [{ text: '设计数据结构', done: true }, { text: '渲染 12 周网格', done: true }], reference_links: [], notes: '已沉淀为可复用组件。', archived: false, pinned: false, created_at: d(-40), updated_at: d(-5),
    },
  ],
  reviews: [
    { id: 'v1', title: 'AI 辅助编程的三个心得', body: '1. 提示词里给足上下文，比反复追问高效；2. 让 AI 先出方案再写码，减少返工；3. 关键逻辑一定自己过一遍，AI 的自信不等于正确。', source: '自己', linked_items: ['AI 学习工作台'], tags: ['AI', '方法'], mood: '收获很大', created_at: d(-4), updated_at: d(-4) },
    { id: 'v2', title: '看视频学习的效率陷阱', body: '只看不练等于没学。以后每条学习记录强制关联一个动手产出：一段代码、一篇笔记或一个 demo。', source: '自己', linked_items: ['学习记录'], tags: ['学习方法'], mood: '有触动', created_at: d(-11), updated_at: d(-11) },
    { id: 'v3', title: '同事分享的 RLS 踩坑记录', body: 'RLS 策略只写 using 不写 with check 时，insert 会被默认策略拦截。所有 for all 策略建议两个子句都显式声明。', source: '他人', linked_items: ['AI 学习工作台'], tags: ['Supabase', '安全'], mood: '实用', created_at: d(-16), updated_at: d(-16) },
  ],
}
