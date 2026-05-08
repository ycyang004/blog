import { useEffect, useRef, useState } from 'react'
import { toast, Toaster } from 'sonner'
import { useAuthStore } from './hooks/use-auth'
import { useFriendEditorStore } from './stores/friend-store'
import { loadConfigSection, saveConfigSection } from './services/save-config-section'
import { readFileAsText } from '@/lib/file-utils'
import type { FriendItem, ShowcaseSite } from '@interfaces/site'

function hostname(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}

// ─────────────────────────────────────── Friend Edit Modal ───────────────────────────────────────

function FriendEditModal({ item, isNew, onSave, onCancel }: {
  item: FriendItem; isNew: boolean
  onSave: (data: Partial<FriendItem>) => void; onCancel: () => void
}) {
  const [form, setForm] = useState<Partial<FriendItem>>({ ...item })
  const set = (k: keyof FriendItem, v: string) => setForm((f) => ({ ...f, [k]: v }))

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
          {isNew ? '添加友链' : `编辑 "${item.name}"`}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-base-content/60 mb-1 block">名称 *</label>
            <input className="input input-sm input-bordered w-full bg-base-100" value={form.name || ''}
              onChange={(e) => set('name', e.target.value)} placeholder="朋友的名字" autoFocus />
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
            <label className="text-xs font-medium text-base-content/60 mb-1 block">标签</label>
            <input className="input input-sm input-bordered w-full bg-base-100" value={form.badge || ''}
              onChange={(e) => set('badge', e.target.value)} placeholder="如: 邻居, 室友" />
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

// ─────────────────────────────────────── Site Edit Modal ───────────────────────────────────────

function SiteEditModal({ site, isNew, onSave, onCancel }: {
  site: ShowcaseSite; isNew: boolean
  onSave: (data: Partial<ShowcaseSite>) => void; onCancel: () => void
}) {
  const [form, setForm] = useState<Partial<ShowcaseSite>>({ ...site })
  const set = (k: keyof ShowcaseSite, v: string) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-base-100 rounded-2xl border-2 border-primary shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="text-base font-bold text-primary mb-4">{isNew ? '添加展示站点' : '编辑站点'}</div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-base-content/60 mb-1 block">名称 *</label>
            <input className="input input-sm input-bordered w-full bg-base-100" value={form.name || ''}
              onChange={(e) => set('name', e.target.value)} placeholder="站点名称" autoFocus />
          </div>
          <div>
            <label className="text-xs font-medium text-base-content/60 mb-1 block">链接 *</label>
            <input className="input input-sm input-bordered w-full bg-base-100" value={form.url || ''}
              onChange={(e) => set('url', e.target.value)} placeholder="https://..." />
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

// ─────────────────────────────────────── Friend Card ───────────────────────────────────────

function FriendCardView({ item, editMode, isEditing, onEdit, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: {
  item: FriendItem; editMode: boolean; isEditing: boolean
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
        <div className={`relative h-full bg-base-100 rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg border ${isEditing ? 'border-primary ring-2 ring-primary/30 shadow-lg' : 'border-base-200 hover:border-primary/30'}`}>
          {item.badge && (
            <div className="absolute top-2 right-2 z-10">
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded bg-primary/10 text-primary border border-primary/20">{item.badge}</span>
            </div>
          )}
          <div className="absolute bottom-2 right-2 z-10">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-base-content/30 group-hover:text-primary/50 transition-colors"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </div>
          <div className="flex items-center gap-4 h-full">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-full p-0.5 bg-base-100 ring-2 ring-base-200 group-hover:ring-primary/50 transition-all duration-500 group-hover:scale-105 shadow-sm">
                <div className="w-full h-full rounded-full overflow-hidden">
                  {item.avatar ? (
                    <img src={item.avatar} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full bg-base-200 text-base-content/50">
                      <span className="text-xl font-bold">{item.name?.charAt(0) || '?'}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 border-2 border-white dark:border-base-100 rounded-full shadow-sm group-hover:animate-pulse"></div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <h3 className="font-bold text-base text-base-content group-hover:text-primary transition-colors duration-300 truncate pr-2">{item.name || '未命名'}</h3>
              <p className="text-xs text-base-content/60 line-clamp-2 leading-relaxed mb-1.5">{item.description}</p>
              <div className="text-[10px] text-base-content/30 font-mono truncate group-hover:text-primary/60 transition-colors">{hostname(item.url)}</div>
            </div>
          </div>
        </div>
      </a>
    </div>
  )
}

// ─────────────────────────────────────── Main ───────────────────────────────────────

export function FriendEditor({ initialItems, initialSites }: { initialItems: FriendItem[]; initialSites: ShowcaseSite[] }) {
  const {
    items, sites, editMode, isDirty, loading, saving,
    editingFriendKey, editingSiteKey,
    initData, mergeRemote, setEditMode, setLoading, setSaving, setIsDirty,
    startEditFriend, cancelEditFriend, saveFriendEdit,
    deleteFriend, moveFriend,
    startEditSite, cancelEditSite, saveSiteEdit,
    deleteSite, moveSite,
  } = useFriendEditorStore()

  const { isAuth, setPrivateKey } = useAuthStore()
  const keyInputRef = useRef<HTMLInputElement>(null)
  const [remoteFetched, setRemoteFetched] = useState(false)

  useEffect(() => { initData(initialItems, initialSites) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRemote = async () => {
    if (remoteFetched) return
    try {
      setLoading(true)
      const remote = await loadConfigSection<any>('friend')
      mergeRemote(remote?.items ?? [], remote?.sites ?? [])
      setRemoteFetched(true)
    } catch { /* optional */ } finally { setLoading(false) }
  }

  const handleEnterEdit = () => { setEditMode(true); fetchRemote() }

  const handleSave = async () => {
    if (!window.confirm('确定保存友链配置到 GitHub 仓库吗？')) return
    try {
      setSaving(true)
      const tid = toast.loading('正在保存...')
      await saveConfigSection('friend', { items, sites }, (msg) => toast.loading(msg, { id: tid }))
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

  // Friend modal
  let friendModal: { index: number | null; item: FriendItem; isNew: boolean } | null = null
  if (editMode && editingFriendKey !== null) {
    if (editingFriendKey === '--1') {
      friendModal = { index: null, item: { name: '', avatar: '', description: '', url: '', badge: '' }, isNew: true }
    } else {
      const idx = parseInt(editingFriendKey, 10)
      if (!isNaN(idx) && idx < items.length) {
        friendModal = { index: idx, item: items[idx], isNew: false }
      }
    }
  }

  // Site modal
  let siteModal: { index: number | null; site: ShowcaseSite; isNew: boolean } | null = null
  if (editMode && editingSiteKey !== null) {
    if (editingSiteKey === '--1') {
      siteModal = { index: null, site: { name: '', url: '' }, isNew: true }
    } else {
      const idx = parseInt(editingSiteKey, 10)
      if (!isNaN(idx) && idx < sites.length) {
        siteModal = { index: idx, site: sites[idx], isNew: false }
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
        <div className="mb-10 animate-fade-in-up">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>Friends</span>
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
                  编辑友链
                </button>
              )}
            </div>
          </div>
          <p className="text-base-content/70 text-lg mt-4">记录那些珍贵的友谊，分享彼此的故事。</p>
        </div>

        {/* Auth prompt */}
        {editMode && !isAuth && (
          <div className="alert alert-warning rounded-2xl text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            <span>编辑内容已保存在本地。请导入私钥后保存到 GitHub。</span>
            <button className="btn btn-xs btn-warning" onClick={handleImportKey}>导入密钥</button>
          </div>
        )}

        {/* Friends Grid */}
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.length === 0 ? (
              <div className="col-span-full text-center py-10">
                <h3 className="text-lg font-medium text-base-content/40">暂无友链</h3>
              </div>
            ) : (
              items.map((item, idx) => {
                const isEditing = editMode && editingFriendKey === String(idx)
                return (
                  <div key={idx}>
                    <FriendCardView item={item} editMode={editMode} isEditing={isEditing}
                      onEdit={() => startEditFriend(idx)}
                      onDelete={() => { if (window.confirm('删除该友链？')) deleteFriend(idx) }}
                      onMoveUp={() => moveFriend(idx, 'up')}
                      onMoveDown={() => moveFriend(idx, 'down')}
                      canMoveUp={idx > 0}
                      canMoveDown={idx < items.length - 1} />
                  </div>
                )
              })
            )}
          </div>
          {editMode && (
            <div className="mt-4">
              <button className="btn btn-sm btn-outline border-dashed border-2 text-base-content/50 hover:text-primary hover:border-primary rounded-full"
                onClick={() => useFriendEditorStore.setState({ editingFriendKey: '--1' })}>+ 添加友链</button>
            </div>
          )}
        </div>

        {/* Showcase Sites */}
        <div className="bg-base-100 rounded-3xl p-6 md:p-8 shadow-lg border border-base-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-secondary"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                <span>Sites Using Ryuchan</span>
              </h2>
              <p className="text-base-content/70">这里展示了使用 Ryuchan 主题构建的网站。</p>
            </div>
            {!editMode && (
              <a href="https://github.com/kobaridev/Ryuchan/edit/main/src/pages/friend.astro" target="_blank" rel="noopener noreferrer"
                className="btn btn-primary btn-sm gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Your Site
              </a>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {sites.map((site, idx) => {
              const isEditing = editMode && editingSiteKey === String(idx)
              return (
                <div key={idx} className={`relative group/site ${isEditing ? 'ring-2 ring-primary/30 rounded-full' : ''}`}>
                  {editMode && (
                    <div className="absolute -top-2 -right-2 z-20 flex gap-0.5">
                      <button className="btn btn-circle btn-xs btn-primary" title="编辑" onClick={() => startEditSite(idx)}>✎</button>
                      <button className="btn btn-circle btn-xs btn-error btn-outline" title="删除" onClick={() => { if (window.confirm('删除该站点？')) deleteSite(idx) }}>✕</button>
                      <button className="btn btn-circle btn-xs btn-ghost bg-base-100/80" title="上移" onClick={() => moveSite(idx, 'up')} disabled={idx === 0}>↑</button>
                      <button className="btn btn-circle btn-xs btn-ghost bg-base-100/80" title="下移" onClick={() => moveSite(idx, 'down')} disabled={idx === sites.length - 1}>↓</button>
                    </div>
                  )}
                  <a href={editMode ? undefined : site.url} target={editMode ? undefined : '_blank'} rel={editMode ? undefined : 'noopener noreferrer'}
                    className={`btn btn-sm btn-outline gap-2 ${editMode ? 'pointer-events-none' : ''}`}>
                    <span className="flex h-3 w-3 items-center justify-center rounded-full bg-gray-200">
                      <span className="h-2 w-2 rounded-full bg-green-500"></span>
                    </span>
                    <span className="font-medium">{site.name}</span>
                  </a>
                </div>
              )
            })}
            {editMode && (
              <button className="btn btn-sm btn-outline border-dashed border-2 text-base-content/50 hover:text-primary hover:border-primary rounded-full"
                onClick={() => useFriendEditorStore.setState({ editingSiteKey: '--1' })}>+ 添加站点</button>
            )}
          </div>

          <div className="mt-6 p-4 bg-base-200/50 rounded-2xl text-sm text-base-content/60 flex gap-2 items-start">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <p>想要将你的网站添加到这里吗？编辑模式中可以管理展示站点，或通过 GitHub 提交 Pull Request。</p>
          </div>
        </div>

        <div className="divider my-6">
          <svg className="w-12 h-12 text-primary/50" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
        </div>
      </div>

      {friendModal && (
        <FriendEditModal item={friendModal.item} isNew={friendModal.isNew}
          onSave={(data) => saveFriendEdit(friendModal.index, data)}
          onCancel={cancelEditFriend} />
      )}
      {siteModal && (
        <SiteEditModal site={siteModal.site} isNew={siteModal.isNew}
          onSave={(data) => saveSiteEdit(siteModal.index, data)}
          onCancel={cancelEditSite} />
      )}
    </div>
  )
}
