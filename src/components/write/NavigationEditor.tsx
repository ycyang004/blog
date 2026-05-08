import { useEffect, useRef, useState } from 'react'
import { toast, Toaster } from 'sonner'
import { useAuthStore } from './hooks/use-auth'
import { useNavEditorStore } from './stores/navigation-store'
import { loadNavigationConfig, saveNavigationConfig } from './services/save-navigation'
import { readFileAsText } from '@/lib/file-utils'
import type { NavItem, NavCategory } from '@interfaces/site'

const ICON_PRESETS = [
  'lucide:code', 'lucide:server', 'lucide:image', 'lucide:bookmark',
  'lucide:star', 'lucide:heart', 'lucide:globe', 'lucide:zap',
  'lucide:rocket', 'lucide:shield', 'lucide:music', 'lucide:film',
  'lucide:book', 'lucide:palette', 'lucide:wrench', 'lucide:package',
  'lucide:link', 'lucide:award', 'lucide:thumbs-up', 'lucide:gift',
  'lucide:message-square', 'lucide:github', 'lucide:trash',
  'lucide:layout', 'lucide:file-code-2', 'lucide:box', 'lucide:bar-chart-3',
  'lucide:shield-check',
]

const BADGE_COLORS = [
  { label: '默认', value: 'primary' },
  { label: '玫瑰', value: 'rose' },
  { label: '天蓝', value: 'sky' },
  { label: '琥珀', value: 'amber' },
  { label: '翠绿', value: 'emerald' },
  { label: '紫罗兰', value: 'violet' },
  { label: '橘黄', value: 'orange' },
  { label: '粉红', value: 'pink' },
]

const COLOR_CLASSES: Record<string, string> = {
  primary: 'bg-primary/10 text-primary border-primary/20',
  rose: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  sky: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
  amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  violet: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  orange: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  pink: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
}

const CUTE_TAGS = [
  { icon: '✨', text: '宝藏资源', cls: 'text-amber-600 bg-amber-500/10 border-amber-500/20' },
  { icon: '❤️', text: '超级好用', cls: 'text-rose-600 bg-rose-500/10 border-rose-500/20' },
  { icon: '👍', text: '值得一试', cls: 'text-sky-600 bg-sky-500/10 border-sky-500/20' },
  { icon: '⚡', text: '效率神器', cls: 'text-violet-600 bg-violet-500/10 border-violet-500/20' },
  { icon: '🎉', text: '发现惊喜', cls: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' },
  { icon: '⭐', text: '五星推荐', cls: 'text-orange-600 bg-orange-500/10 border-orange-500/20' },
]

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0 }
  return Math.abs(h)
}

function hostname(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}

// ─────────────────────────────────────── Sub-components ───────────────────────────────────────

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button type="button"
        className="input input-sm input-bordered w-full text-left text-sm flex items-center justify-between bg-base-100"
        onClick={() => setOpen(!open)}>
        <span className="truncate">{value}</span>
        <span className="text-base-content/30">▾</span>
      </button>
      {open && (
        <div className="absolute z-[60] mt-1 w-48 max-h-40 overflow-y-auto bg-base-100 border border-base-300 rounded-lg shadow-lg p-1 grid grid-cols-4 gap-0.5">
          {ICON_PRESETS.map((icon) => (
            <button key={icon} type="button"
              className={`text-xs p-1 rounded hover:bg-primary/10 truncate ${value === icon ? 'bg-primary/10 text-primary font-medium' : ''}`}
              onClick={() => { onChange(icon); setOpen(false) }} title={icon}>
              {icon.replace('lucide:', '')}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function CardEditModal({ item, isNew, onSave, onCancel }: {
  item: NavItem; isNew: boolean
  onSave: (data: Partial<NavItem>) => void; onCancel: () => void
}) {
  const [form, setForm] = useState<Partial<NavItem>>({ ...item })
  const set = (k: keyof NavItem, v: string) => setForm((f) => ({ ...f, [k]: v }))

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      {/* Modal */}
      <div className="relative bg-base-100 rounded-2xl border-2 border-primary shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="text-base font-bold text-primary mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
          </svg>
          {isNew ? `添加资源到 ${item.category || '分类'}` : `编辑 "${item.name}"`}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-base-content/60 mb-1 block">名称 *</label>
            <input className="input input-sm input-bordered w-full bg-base-100" value={form.name || ''}
              onChange={(e) => set('name', e.target.value)} placeholder="资源名称" autoFocus />
          </div>
          <div>
            <label className="text-xs font-medium text-base-content/60 mb-1 block">链接 *</label>
            <input className="input input-sm input-bordered w-full bg-base-100" value={form.url || ''}
              onChange={(e) => set('url', e.target.value)} placeholder="https://..." />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-base-content/60 mb-1 block">头像 URL</label>
            <input className="input input-sm input-bordered w-full bg-base-100" value={form.avatar || ''}
              onChange={(e) => set('avatar', e.target.value)} placeholder="https://..." />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-base-content/60 mb-1 block">描述</label>
            <input className="input input-sm input-bordered w-full bg-base-100" value={form.description || ''}
              onChange={(e) => set('description', e.target.value)} placeholder="简短描述" />
          </div>
          <div>
            <label className="text-xs font-medium text-base-content/60 mb-1 block">子分类</label>
            <input className="input input-sm input-bordered w-full bg-base-100" value={form.category || ''}
              onChange={(e) => set('category', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-base-content/60 mb-1 block">编号</label>
            <input className="input input-sm input-bordered w-full bg-base-100" value={form.id || ''}
              onChange={(e) => set('id', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-base-content/60 mb-1 block">徽章文本</label>
            <input className="input input-sm input-bordered w-full bg-base-100" value={form.badge || ''}
              onChange={(e) => set('badge', e.target.value)} placeholder="留空=随机" />
          </div>
          <div>
            <label className="text-xs font-medium text-base-content/60 mb-1 block">徽章图标</label>
            <IconPicker value={form.badgeIcon || 'lucide:award'} onChange={(v) => set('badgeIcon', v)} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-base-content/60 mb-1 block">徽章颜色</label>
            <div className="flex gap-1.5">
              {BADGE_COLORS.map((c) => (
                <button key={c.value} type="button"
                  className={`w-6 h-6 rounded-full border-2 transition-all ${(form.badgeColor || 'primary') === c.value ? 'border-base-content scale-110 ring-2 ring-base-content/20' : 'border-transparent'} ${c.value === 'primary' ? 'bg-primary' : `bg-${c.value}-500`}`}
                  onClick={() => set('badgeColor', c.value)} title={c.label} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-4 mt-2 border-t border-base-200">
          <button className="btn btn-sm btn-ghost" onClick={onCancel}>取消</button>
          <button className="btn btn-sm btn-primary" onClick={() => onSave(form)}>
            {isNew ? '添加' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CategoryEditForm({ title, icon, onSave, onCancel }: {
  title: string; icon: string; onSave: (d: { title: string; icon: string }) => void; onCancel: () => void
}) {
  const [t, setT] = useState(title)
  const [i, setI] = useState(icon)
  return (
    <div className="flex items-center gap-2 bg-base-100 border-2 border-primary rounded-xl p-2 shadow">
      <input className="input input-sm input-bordered flex-1 bg-base-100 font-bold text-sm" value={t}
        onChange={(e) => setT(e.target.value)} autoFocus />
      <div className="w-36"><IconPicker value={i} onChange={setI} /></div>
      <button className="btn btn-sm btn-ghost btn-square" onClick={onCancel}>✕</button>
      <button className="btn btn-sm btn-primary btn-square" onClick={() => onSave({ title: t, icon: i })}>✓</button>
    </div>
  )
}

function NavCard({ item, catTitle, editMode, isEditing, onEdit, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: {
  item: NavItem; catTitle: string; editMode: boolean; isEditing: boolean
  onEdit: () => void; onDelete: () => void; onMoveUp: () => void; onMoveDown: () => void
  canMoveUp: boolean; canMoveDown: boolean
}) {
  return (
    <div className="relative group/card h-full">
      {editMode && (
        <div className="absolute top-3 right-3 z-20 flex gap-1">
          <button className="btn btn-circle btn-xs btn-primary shadow-md" title="编辑" onClick={onEdit}>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
          </button>
          <button className="btn btn-circle btn-xs btn-error btn-outline shadow-md" title="删除" onClick={onDelete}>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
          <button className="btn btn-circle btn-xs btn-ghost bg-base-100/80" title="上移" onClick={onMoveUp} disabled={!canMoveUp}>↑</button>
          <button className="btn btn-circle btn-xs btn-ghost bg-base-100/80" title="下移" onClick={onMoveDown} disabled={!canMoveDown}>↓</button>
        </div>
      )}
      <a href={editMode ? undefined : item.url} target={editMode ? undefined : '_blank'}
        rel={editMode ? undefined : 'noopener noreferrer'}
        className={`group block h-full ${editMode ? 'pointer-events-none' : ''}`}>
        <div className={`relative h-full bg-base-100 rounded-[2rem] overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border ${isEditing ? 'border-primary ring-2 ring-primary/30 shadow-lg' : 'border-base-200 hover:border-primary/20'}`}>
          <div className="relative p-6 flex flex-col h-full">
            <div className="flex items-start gap-4 mb-2">
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-base-100 p-1 shadow-sm ring-1 ring-base-200">
                  {item.avatar ? (
                    <img src={item.avatar} alt={item.name} className="w-full h-full object-cover rounded-xl" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-base-content/30 text-lg rounded-xl bg-base-200">?</div>
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg text-base-content group-hover:text-primary transition-colors duration-300 truncate">{item.name || '未命名'}</h3>
                <div className="text-xs text-base-content/40 truncate font-mono mt-0.5">{hostname(item.url)}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 mb-2">
              {item.badge ? (
                <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl border ${COLOR_CLASSES[item.badgeColor || 'primary'] || COLOR_CLASSES.primary}`}>
                  {item.badgeIcon ? <span className="text-[11px]">{item.badgeIcon.replace('lucide:', '')}</span> : null}
                  {item.badge}
                </span>
              ) : (() => {
                const tag = CUTE_TAGS[hashStr(item.name) % CUTE_TAGS.length]
                return <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl border ${tag.cls}`}>{tag.icon} {tag.text}</span>
              })()}
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {item.category && <span className="px-3 py-1 text-xs font-medium rounded-full bg-base-200/50 text-base-content/60">{item.category}</span>}
              {item.id && <span className="px-3 py-1 text-xs font-medium rounded-full bg-base-200/50 text-base-content/60">{item.id}</span>}
            </div>
            <p className="text-sm text-base-content/70 leading-relaxed line-clamp-3 flex-grow">{item.description}</p>
          </div>
        </div>
      </a>
    </div>
  )
}

// ─────────────────────────────────────── Main component ───────────────────────────────────────

export function NavigationEditor({ initialCategories }: { initialCategories: NavCategory[] }) {
  const {
    categories, editMode, isDirty, loading, saving,
    editingCategoryIndex, editingCardKey,
    initData, mergeRemote, setEditMode, setLoading, setSaving, setIsDirty,
    startEditCategory, cancelEditCategory, saveCategoryEdit,
    addCategory, deleteCategory, moveCategory,
    startEditCard, cancelEditCard, saveCardEdit,
    deleteItem, moveItem,
  } = useNavEditorStore()

  const { isAuth, setPrivateKey } = useAuthStore()
  const keyInputRef = useRef<HTMLInputElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [remoteFetched, setRemoteFetched] = useState(false)

  // ── Hydrate store with server-provided data on mount ──────────
  useEffect(() => {
    initData(initialCategories)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch remote data from GitHub ─────────────────────────────
  const fetchRemote = async () => {
    if (remoteFetched) return
    try {
      setLoading(true)
      const remote = await loadNavigationConfig()
      mergeRemote(remote)
      setRemoteFetched(true)
    } catch {
      // Remote data is optional — local/server data is the fallback
    } finally { setLoading(false) }
  }

  // ── Enter edit mode ───────────────────────────────────────────
  const handleEnterEdit = () => {
    setEditMode(true)
    // Fetch latest from GitHub to merge with local edits
    fetchRemote()
  }

  // ── Save ──────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!window.confirm('确定保存导航配置到 GitHub 仓库吗？')) return
    try {
      setSaving(true)
      const tid = toast.loading('正在保存...')
      await saveNavigationConfig(categories, (msg) => toast.loading(msg, { id: tid }))
      setIsDirty(false)
      toast.success('保存成功！将自动部署。', { id: tid })
    } catch (e: any) {
      toast.error('保存失败: ' + e.message)
    } finally { setSaving(false) }
  }

  const handleImportKey = () => keyInputRef.current?.click()
  const onChooseKey = async (file: File) => {
    try {
      const pem = await readFileAsText(file)
      setPrivateKey(pem)
      toast.success('密钥导入成功')
    } catch { toast.error('密钥导入失败') }
  }

  // ── Filtered items ────────────────────────────────────────────
  const q = searchQuery.toLowerCase()
  const allItems = categories.flatMap((cat, catIdx) =>
    cat.items.map((item, itemIdx) => ({ cat, catIdx, item, itemIdx }))
  )
  const visibleItems = allItems.filter(({ cat, item }) => {
    const name = (item.name || '').toLowerCase()
    const desc = (item.description || '').toLowerCase()
    return (!q || name.includes(q) || desc.includes(q))
      && (activeCategory === 'all' || cat.title === activeCategory)
  })

  // ── Determine editing modal state ─────────────────────────────
  const editingKey = editingCardKey
  let modalData: { catIdx: number; itemIdx: number | null; item: NavItem; isNew: boolean } | null = null
  if (editMode && editingKey) {
    if (editingKey.endsWith('--1')) {
      // Adding new item
      const catIdx = parseInt(editingKey.replace('--1', ''), 10)
      if (!isNaN(catIdx) && catIdx < categories.length) {
        modalData = {
          catIdx,
          itemIdx: null,
          item: { name: '', avatar: '', description: '', url: '', category: categories[catIdx].title, badge: '', badgeIcon: 'lucide:award', badgeColor: 'primary' },
          isNew: true,
        }
      }
    } else {
      const parts = editingKey.split('-')
      if (parts.length === 2) {
        const catIdx = parseInt(parts[0], 10)
        const itemIdx = parseInt(parts[1], 10)
        if (!isNaN(catIdx) && !isNaN(itemIdx) && catIdx < categories.length && itemIdx < categories[catIdx].items.length) {
          modalData = {
            catIdx,
            itemIdx,
            item: categories[catIdx].items[itemIdx],
            isNew: false,
          }
        }
      }
    }
  }

  // ── Loading state ─────────────────────────────────────────────
  if (loading && categories.length === 0) {
    return <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg text-primary" /></div>
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="nav-container min-h-screen bg-base-200/30 -mt-8 pt-8 pb-20 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <Toaster richColors position="top-center" duration={4000} />
      <input ref={keyInputRef} type="file" accept=".pem" className="hidden"
        onChange={async (e) => { const f = e.target.files?.[0]; if (f) await onChooseKey(f); if (e.currentTarget) e.currentTarget.value = '' }} />

      <div className="max-w-7xl mx-auto space-y-10">

        {/* ── Search ──────────────────────────────────── */}
        <div className="relative max-w-2xl mx-auto mt-10">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-base-content/40 group-focus-within:text-primary transition-colors" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            </div>
            <input type="text"
              className="block w-full pl-11 pr-4 py-4 bg-base-100 border-none rounded-3xl text-base-content placeholder-base-content/40 focus:ring-2 focus:ring-primary/50 focus:bg-base-100 shadow-sm transition-all duration-300"
              placeholder="搜索资源..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>

        {/* ── Toolbar: category tabs + edit controls ───── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button className={`px-5 py-2 rounded-full text-sm transition-all shadow-md ${activeCategory === 'all' ? 'font-bold bg-primary text-primary-content' : 'font-medium bg-base-100 text-base-content/60 hover:bg-base-200 hover:text-primary hover:shadow-md'}`}
              onClick={() => setActiveCategory('all')}>全部</button>
            {categories.map((cat, idx) => (
              <div key={idx} className="relative inline-flex items-center gap-1">
                {editMode && editingCategoryIndex === idx ? (
                  <CategoryEditForm title={cat.title} icon={cat.icon}
                    onSave={(d) => saveCategoryEdit(idx, d)} onCancel={cancelEditCategory} />
                ) : (
                  <button className={`px-5 py-2 rounded-full text-sm transition-all shadow-md ${activeCategory === cat.title ? 'font-bold bg-primary text-primary-content' : 'font-medium bg-base-100 text-base-content/60 hover:bg-base-200 hover:text-primary hover:shadow-md'}`}
                    onClick={() => setActiveCategory(cat.title)}>{cat.title}</button>
                )}
                {editMode && editingCategoryIndex !== idx && (
                  <div className="flex gap-0.5 ml-1">
                    <button className="btn btn-xs btn-ghost btn-square text-base-content/40 hover:text-primary" onClick={() => startEditCategory(idx)}>✎</button>
                    <button className="btn btn-xs btn-ghost btn-square text-base-content/40 hover:text-error" onClick={() => { if (window.confirm('删除该分类及所有资源？')) deleteCategory(idx) }}>✕</button>
                    <button className="btn btn-xs btn-ghost btn-square text-base-content/30" onClick={() => moveCategory(idx, 'up')} disabled={idx === 0}>↑</button>
                    <button className="btn btn-xs btn-ghost btn-square text-base-content/30" onClick={() => moveCategory(idx, 'down')} disabled={idx === categories.length - 1}>↓</button>
                  </div>
                )}
              </div>
            ))}
            {editMode && editingCategoryIndex === null && (
              <button className="btn btn-xs btn-outline border-dashed border-2 text-base-content/50 hover:text-primary hover:border-primary rounded-full"
                onClick={addCategory}>+ 分类</button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isAuth && editMode && (
              <button onClick={handleImportKey} className="btn btn-xs btn-ghost bg-base-200 gap-1">🔑 验证</button>
            )}
            {editMode ? (
              <>
                {isDirty && <span className="badge badge-warning badge-xs animate-pulse">未保存</span>}
                <button className="btn btn-xs btn-primary" onClick={handleSave} disabled={saving || !isAuth}>{saving ? '保存中...' : '保存'}</button>
                <button className="btn btn-xs btn-ghost" onClick={() => setEditMode(false)}>退出编辑</button>
              </>
            ) : (
              <button className="btn btn-sm btn-primary rounded-full shadow-lg shadow-primary/20 gap-2" onClick={handleEnterEdit}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                编辑导航
              </button>
            )}
          </div>
        </div>

        {/* ── Auth prompt ──────────────────────────────── */}
        {editMode && !isAuth && (
          <div className="alert alert-warning rounded-2xl text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            <span>编辑内容已保存在本地。请导入私钥后保存到 GitHub。</span>
            <button className="btn btn-xs btn-warning" onClick={handleImportKey}>导入密钥</button>
          </div>
        )}

        {/* ── Resource grid ────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleItems.length === 0 ? (
            <div className="col-span-full text-center py-20">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-base-200 mb-4">
                <svg className="w-8 h-8 text-base-content/40" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              </div>
              <h3 className="text-lg font-medium text-base-content/40">未找到相关资源</h3>
              <p className="mt-2 text-sm text-base-content/30">请尝试更换关键词或分类</p>
            </div>
          ) : (
            visibleItems.map(({ cat, catIdx, item, itemIdx }) => {
              const cardKey = `${catIdx}-${itemIdx}`
              const isEditing = editMode && editingCardKey === cardKey

              return (
                <div key={cardKey}>
                  <NavCard item={item} catTitle={cat.title} editMode={editMode} isEditing={isEditing}
                    onEdit={() => startEditCard(catIdx, itemIdx)}
                    onDelete={() => { if (window.confirm('删除该资源？')) deleteItem(catIdx, itemIdx) }}
                    onMoveUp={() => moveItem(catIdx, itemIdx, 'up')}
                    onMoveDown={() => moveItem(catIdx, itemIdx, 'down')}
                    canMoveUp={itemIdx > 0}
                    canMoveDown={itemIdx < cat.items.length - 1} />
                </div>
              )
            })
          )}
        </div>

        {/* Add item buttons per category */}
        {editMode && categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {categories.map((cat, catIdx) => (
              <button key={catIdx} className="btn btn-xs btn-outline border-dashed border-2 text-base-content/50 hover:text-primary hover:border-primary rounded-full"
                onClick={() => useNavEditorStore.setState({ editingCardKey: `${catIdx}--1` })}>+ {cat.title}</button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {categories.length === 0 && !loading && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-base-200 mb-4">
              <svg className="w-8 h-8 text-base-content/30" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            </div>
            <h3 className="text-lg font-medium text-base-content/40">暂无导航资源</h3>
            {editMode && <button className="btn btn-primary btn-sm mt-4 rounded-full" onClick={addCategory}>+ 添加第一个分类</button>}
          </div>
        )}

        <div className="divider my-6">
          <svg className="w-12 h-12 text-primary/50" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
        </div>
      </div>

      {/* ── Edit Modal (rendered outside the grid) ──────── */}
      {modalData && (
        <CardEditModal
          item={modalData.item}
          isNew={modalData.isNew}
          onSave={(data) => saveCardEdit(modalData.catIdx, modalData.itemIdx, data)}
          onCancel={cancelEditCard}
        />
      )}
    </div>
  )
}
