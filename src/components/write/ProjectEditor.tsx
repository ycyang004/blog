import { useEffect, useRef, useState } from 'react'
import { toast, Toaster } from 'sonner'
import { useAuthStore } from './hooks/use-auth'
import { useProjectEditorStore } from './stores/project-store'
import { loadConfigSection, saveConfigSection } from './services/save-config-section'
import { readFileAsText } from '@/lib/file-utils'
import type { ProjectItem } from '@interfaces/site'

function hostname(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}

// ─────────────────────────────────────── Edit Modal ───────────────────────────────────────

function ItemEditModal({ item, isNew, onSave, onCancel }: {
  item: ProjectItem; isNew: boolean
  onSave: (data: Partial<ProjectItem>) => void; onCancel: () => void
}) {
  const [form, setForm] = useState<Partial<ProjectItem>>({ ...item })
  const set = (k: keyof ProjectItem, v: string) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-base-100 rounded-2xl border-2 border-primary shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="text-base font-bold text-primary mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
          </svg>
          {isNew ? '添加项目' : `编辑 "${item.name}"`}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-base-content/60 mb-1 block">名称 *</label>
            <input className="input input-sm input-bordered w-full bg-base-100" value={form.name || ''}
              onChange={(e) => set('name', e.target.value)} placeholder="项目名称" autoFocus />
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
            <label className="text-xs font-medium text-base-content/60 mb-1 block">徽章</label>
            <input className="input input-sm input-bordered w-full bg-base-100" value={form.badge || ''}
              onChange={(e) => set('badge', e.target.value)} placeholder="如: Web, Blog, Tool" />
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

// ─────────────────────────────────────── Card ───────────────────────────────────────

function ProjectCardView({ item, editMode, isEditing, onEdit, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: {
  item: ProjectItem; editMode: boolean; isEditing: boolean
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
        <div className={`relative h-full bg-base-100 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border ${isEditing ? 'border-primary ring-2 ring-primary/30 shadow-lg' : 'border-base-200 hover:border-primary/20'}`}>
          {item.badge && (
            <div className="absolute top-2 right-2 z-10">
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded bg-primary/10 text-primary border border-primary/20">{item.badge}</span>
            </div>
          )}
          <div className="p-4 flex flex-col h-full">
            <div className="flex items-start gap-3 mb-2">
              <div className="shrink-0">
                <div className="w-14 h-14 rounded-lg bg-base-200/50 p-1 group-hover:bg-primary/10 transition-colors duration-300">
                  <div className="w-full h-full rounded-md overflow-hidden">
                    {item.avatar ? (
                      <img src={item.avatar} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full bg-base-300 text-base-content/50">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <h3 className="font-bold text-base text-base-content group-hover:text-primary transition-colors truncate">{item.name || '未命名'}</h3>
                <div className="text-[10px] text-base-content/40 font-mono truncate">{hostname(item.url)}</div>
              </div>
            </div>
            <p className="text-xs text-base-content/70 line-clamp-2 leading-relaxed mb-2 flex-grow">{item.description}</p>
            <div className="flex items-center justify-between pt-2 border-t border-base-200/50 mt-auto">
              <div></div>
              <div className="text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-1">
                查看详情
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </div>
            </div>
          </div>
        </div>
      </a>
    </div>
  )
}

// ─────────────────────────────────────── Main ───────────────────────────────────────

export function ProjectEditor({ initialItems }: { initialItems: ProjectItem[] }) {
  const {
    items, editMode, isDirty, loading, saving, editingItemKey,
    initData, mergeRemote, setEditMode, setLoading, setSaving, setIsDirty,
    startEditItem, cancelEditItem, saveItemEdit,
    deleteItem, moveItem,
  } = useProjectEditorStore()

  const { isAuth, setPrivateKey } = useAuthStore()
  const keyInputRef = useRef<HTMLInputElement>(null)
  const [remoteFetched, setRemoteFetched] = useState(false)

  useEffect(() => { initData(initialItems) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRemote = async () => {
    if (remoteFetched) return
    try {
      setLoading(true)
      const remote = await loadConfigSection<ProjectItem[]>('project')
      mergeRemote(Array.isArray(remote) ? remote : (remote as any)?.items ?? [])
      setRemoteFetched(true)
    } catch { /* optional */ } finally { setLoading(false) }
  }

  const handleEnterEdit = () => { setEditMode(true); fetchRemote() }

  const handleSave = async () => {
    if (!window.confirm('确定保存项目配置到 GitHub 仓库吗？')) return
    try {
      setSaving(true)
      const tid = toast.loading('正在保存...')
      await saveConfigSection('project', { items }, (msg) => toast.loading(msg, { id: tid }))
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

  // Modal state
  let modalData: { index: number | null; item: ProjectItem; isNew: boolean } | null = null
  if (editMode && editingItemKey !== null) {
    if (editingItemKey === '--1') {
      modalData = { index: null, item: { name: '', avatar: '', description: '', url: '', badge: '' }, isNew: true }
    } else {
      const idx = parseInt(editingItemKey, 10)
      if (!isNaN(idx) && idx < items.length) {
        modalData = { index: idx, item: items[idx], isNew: false }
      }
    }
  }

  if (loading && items.length === 0) {
    return <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg text-primary" /></div>
  }

  return (
    <div className="min-h-screen bg-base-200/30 -mt-8 pt-8 pb-20 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <Toaster richColors position="top-center" duration={4000} />
      <input ref={keyInputRef} type="file" accept=".pem" className="hidden"
        onChange={async (e) => { const f = e.target.files?.[0]; if (f) await onChooseKey(f); if (e.currentTarget) e.currentTarget.value = '' }} />

      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              <span>My Projects</span>
            </h1>
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
                  编辑项目
                </button>
              )}
            </div>
          </div>
          <p className="text-base-content/70 text-lg mt-4">这里展示了我的一些个人项目、工具和实验性作品。</p>
        </div>

        {/* Auth prompt */}
        {editMode && !isAuth && (
          <div className="alert alert-warning rounded-2xl text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            <span>编辑内容已保存在本地。请导入私钥后保存到 GitHub。</span>
            <button className="btn btn-xs btn-warning" onClick={handleImportKey}>导入密钥</button>
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.length === 0 && !loading ? (
            <div className="col-span-full text-center py-20">
              <h3 className="text-lg font-medium text-base-content/40">暂无项目</h3>
              {editMode && <p className="mt-2 text-sm text-base-content/30">点击下方按钮添加第一个项目</p>}
            </div>
          ) : (
            items.map((item, idx) => {
              const isEditing = editMode && editingItemKey === String(idx)
              return (
                <div key={idx}>
                  <ProjectCardView item={item} editMode={editMode} isEditing={isEditing}
                    onEdit={() => startEditItem(idx)}
                    onDelete={() => { if (window.confirm('删除该项目？')) deleteItem(idx) }}
                    onMoveUp={() => moveItem(idx, 'up')}
                    onMoveDown={() => moveItem(idx, 'down')}
                    canMoveUp={idx > 0}
                    canMoveDown={idx < items.length - 1} />
                </div>
              )
            })
          )}
        </div>

        {editMode && (
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-sm btn-outline border-dashed border-2 text-base-content/50 hover:text-primary hover:border-primary rounded-full"
              onClick={() => useProjectEditorStore.setState({ editingItemKey: '--1' })}>+ 添加项目</button>
          </div>
        )}

        <a href="https://github.com/kobaridev?tab=repositories" target="_blank" rel="noopener noreferrer"
          className="btn btn-primary btn-outline gap-2 px-8 mx-auto block w-fit">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
          <span>View More on GitHub</span>
        </a>

        <div className="divider my-6">
          <svg className="w-12 h-12 text-primary/50" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
        </div>
      </div>

      {modalData && (
        <ItemEditModal item={modalData.item} isNew={modalData.isNew}
          onSave={(data) => saveItemEdit(modalData.index, data)}
          onCancel={cancelEditItem} />
      )}
    </div>
  )
}
