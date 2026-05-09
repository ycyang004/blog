import { useEffect, useRef, useState } from 'react'
import { toast, Toaster } from 'sonner'
import { useAuthStore } from './hooks/use-auth'
import { useAboutEditorStore } from './stores/about-store'
import { loadConfigSection, saveConfigSection } from './services/save-config-section'
import { readFileAsText } from '@/lib/file-utils'
import type { AboutConfig, TechStackItem } from '@interfaces/site'

// ─────────────────────────────────────── Tech Stack Edit Modal ───────────────────────────────────────

function TechEditModal({ item, isNew, onSave, onCancel }: {
  item: TechStackItem; isNew: boolean
  onSave: (data: Partial<TechStackItem>) => void; onCancel: () => void
}) {
  const [form, setForm] = useState<Partial<TechStackItem>>({ ...item })
  const set = (k: keyof TechStackItem, v: string) => setForm((f) => ({ ...f, [k]: v }))

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
        <div className="text-base font-bold text-primary mb-4">{isNew ? '添加技术' : '编辑技术'}</div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-base-content/60 mb-1 block">名称 *</label>
            <input className="input input-sm input-bordered w-full bg-base-100" value={form.name || ''}
              onChange={(e) => set('name', e.target.value)} placeholder="如: React, TypeScript" autoFocus />
          </div>
          <div>
            <label className="text-xs font-medium text-base-content/60 mb-1 block">图标 (simple-icons 名称)</label>
            <input className="input input-sm input-bordered w-full bg-base-100" value={form.icon || ''}
              onChange={(e) => set('icon', e.target.value)} placeholder="如: simple-icons:react" />
          </div>
          <div>
            <label className="text-xs font-medium text-base-content/60 mb-1 block">颜色</label>
            <div className="flex gap-2 items-center">
              <input className="input input-sm input-bordered flex-1 bg-base-100 font-mono text-xs" value={form.color || ''}
                onChange={(e) => set('color', e.target.value)} placeholder="如: oklch(0.7 0.2 200)" />
              <div className="w-8 h-8 rounded-full border border-base-300 shrink-0" style={{ backgroundColor: form.color || '#ccc' }} />
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

// ─────────────────────────────────────── Main ───────────────────────────────────────

export function AboutEditor({ initialData }: { initialData: AboutConfig }) {
  const {
    data, editMode, isDirty, loading, saving,
    initData, setEditMode, setLoading, setSaving, setIsDirty,
    updateField, updateBio, addBio, removeBio, moveBio,
    updateTechItem, addTechItem, removeTechItem, moveTechItem,
    updateAboutSiteIntro, addAboutSiteSection, updateAboutSiteSectionTitle,
    removeAboutSiteSection, moveAboutSiteSection,
    addAboutSiteItem, updateAboutSiteItem, removeAboutSiteItem, moveAboutSiteItem,
  } = useAboutEditorStore()

  const { isAuth, setPrivateKey } = useAuthStore()
  const keyInputRef = useRef<HTMLInputElement>(null)
  const [remoteFetched, setRemoteFetched] = useState(false)
  const [techEditIndex, setTechEditIndex] = useState<number | null>(null)
  const [techAddOpen, setTechAddOpen] = useState(false)

  useEffect(() => { initData(initialData) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRemote = async () => {
    if (remoteFetched) return
    try {
      setLoading(true)
      const remote = await loadConfigSection<AboutConfig>('about')
      if (remote && remote.name) {
        // mergeRemote only replaces if not dirty, which is fine
        useAboutEditorStore.getState().mergeRemote(remote)
      }
      setRemoteFetched(true)
    } catch { /* optional */ } finally { setLoading(false) }
  }

  const handleEnterEdit = () => { setEditMode(true); fetchRemote() }

  const handleSave = async () => {
    if (!window.confirm('确定保存关于页面配置到 GitHub 仓库吗？')) return
    try {
      setSaving(true)
      const tid = toast.loading('正在保存...')
      await saveConfigSection('about', data, (msg) => toast.loading(msg, { id: tid }))
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

  // Resolve tech edit modal
  let techModal: { index: number | null; item: TechStackItem; isNew: boolean } | null = null
  if (techAddOpen) {
    techModal = { index: null, item: { name: '', icon: '', color: '' }, isNew: true }
  } else if (techEditIndex !== null && techEditIndex < data.techStack.length) {
    techModal = { index: techEditIndex, item: data.techStack[techEditIndex], isNew: false }
  }

  if (loading && !data.name) {
    return <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg text-primary" /></div>
  }

  return (
    <div className="min-h-screen bg-base-200/30 -mt-8 pt-8 pb-20 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <Toaster richColors position="top-center" duration={4000} />
      <input ref={keyInputRef} type="file" accept=".pem" className="hidden"
        onChange={async (e) => { const f = e.target.files?.[0]; if (f) await onChooseKey(f); if (e.currentTarget) e.currentTarget.value = '' }} />

      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header with edit toggle */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div></div>
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
                编辑页面
              </button>
            )}
          </div>
        </div>

        {/* Auth prompt */}
        {editMode && !isAuth && (
          <div className="alert alert-warning rounded-2xl text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            <span>编辑内容已保存在本地。请导入私钥后保存到 GitHub。</span>
            <button className="btn btn-xs btn-warning" onClick={handleImportKey}>导入密钥</button>
          </div>
        )}

        <div className="bg-base-100 rounded-3xl p-4 md:p-8 shadow-lg border border-base-200">
          <div className="space-y-10 mb-8">
            {/* Profile Section */}
            <section className="flex flex-col md:flex-row gap-8 items-center md:items-start">
              <div className="avatar relative group/profile">
                <div className={`w-32 h-32 md:w-40 md:h-40 rounded-xl ring ring-primary ring-offset-base-100 ring-offset-2 overflow-hidden ${editMode ? 'ring-2 ring-primary/50' : ''}`}>
                  <img src={data.avatar || 'https://github.com/kobaridev.png'} alt={data.name} width="160" height="160" loading="eager" />
                </div>
                {editMode && (
                  <button className="absolute -bottom-1 left-1/2 -translate-x-1/2 btn btn-xs btn-primary"
                    onClick={() => { const url = window.prompt('头像 URL:', data.avatar); if (url !== null) updateField('avatar', url) }}>
                    修改头像
                  </button>
                )}
              </div>

              <div className="flex-1 text-center md:text-left">
                {editMode ? (
                  <div className="space-y-2">
                    <input className="text-3xl md:text-4xl font-bold mb-2 w-full bg-base-200 rounded-lg px-3 py-1 input input-sm input-bordered"
                      value={data.name} onChange={(e) => updateField('name', e.target.value)} />
                    <input className="text-xl text-base-content/80 mb-4 w-full bg-base-200 rounded-lg px-3 py-1 input input-sm input-bordered"
                      value={data.title} onChange={(e) => updateField('title', e.target.value)} />
                    <input className="text-sm w-full bg-base-200 rounded-lg px-3 py-1 input input-sm input-bordered font-mono"
                      value={data.github} onChange={(e) => updateField('github', e.target.value)} placeholder="GitHub 用户名" />
                  </div>
                ) : (
                  <>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">{data.name || '未命名'}</h1>
                    <p className="text-xl text-base-content/80 mb-4">{data.title}</p>
                  </>
                )}

                <div className="flex flex-wrap gap-3 justify-center md:justify-start mb-6">
                  <a href={`https://github.com/${data.github}`} target="_blank" rel="noopener noreferrer"
                    className="btn btn-sm btn-outline gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
                    <span>GitHub</span>
                  </a>
                  <a href="https://twitter.com/xzz_ya" target="_blank" rel="noopener noreferrer"
                    className="btn btn-sm btn-outline gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
                    <span>Twitter</span>
                  </a>
                  <a href="mailto:xzzya03@outlook.com" className="btn btn-sm btn-outline gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    <span>Email</span>
                  </a>
                </div>

                {/* Bio */}
                <div className="text-base-content/80 leading-relaxed space-y-2">
                  {editMode ? (
                    <div className="space-y-2">
                      {data.bio.map((line, idx) => (
                        <div key={idx} className="flex gap-1">
                          <textarea className="flex-1 textarea textarea-bordered textarea-sm bg-base-200 text-sm"
                            value={line} onChange={(e) => updateBio(idx, e.target.value)} rows={2} />
                          <div className="flex flex-col gap-0.5">
                            <button className="btn btn-xs btn-ghost btn-square" onClick={() => moveBio(idx, 'up')} disabled={idx === 0}>↑</button>
                            <button className="btn btn-xs btn-ghost btn-square" onClick={() => moveBio(idx, 'down')} disabled={idx === data.bio.length - 1}>↓</button>
                            <button className="btn btn-xs btn-ghost btn-square text-error" onClick={() => removeBio(idx)}>✕</button>
                          </div>
                        </div>
                      ))}
                      <button className="btn btn-xs btn-outline border-dashed" onClick={addBio}>+ 添加段落</button>
                    </div>
                  ) : (
                    data.bio.map((line, idx) => <p key={idx}>{line}</p>)
                  )}
                </div>
              </div>
            </section>

            {/* About This Site — editable */}
            <section>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                <span>关于本站</span>
              </h2>

              {editMode ? (
                <div className="space-y-6">
                  {/* Intro */}
                  <div>
                    <label className="text-xs font-medium text-base-content/60 mb-1 block">简介</label>
                    <textarea className="textarea textarea-bordered textarea-sm w-full bg-base-200 text-sm"
                      value={data.aboutSite?.intro || ''}
                      onChange={(e) => updateAboutSiteIntro(e.target.value)}
                      rows={3} placeholder="关于本站的介绍文字..." />
                  </div>

                  {/* Sections */}
                  {(data.aboutSite?.sections || []).map((section, si) => (
                    <div key={si} className="bg-base-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <input className="input input-sm input-bordered flex-1 bg-base-100 font-bold text-sm"
                          value={section.title}
                          onChange={(e) => updateAboutSiteSectionTitle(si, e.target.value)}
                          placeholder="段落标题" />
                        <button className="btn btn-xs btn-ghost btn-square" onClick={() => moveAboutSiteSection(si, 'up')} disabled={si === 0}>↑</button>
                        <button className="btn btn-xs btn-ghost btn-square" onClick={() => moveAboutSiteSection(si, 'down')} disabled={si === (data.aboutSite?.sections?.length || 1) - 1}>↓</button>
                        <button className="btn btn-xs btn-ghost btn-square text-error" onClick={() => removeAboutSiteSection(si)}>✕</button>
                      </div>

                      {/* Section items */}
                      <div className="space-y-2 pl-2">
                        {section.items.map((item, ii) => (
                          <div key={ii} className="flex gap-1">
                            <input className="input input-sm input-bordered flex-1 bg-base-100 text-sm"
                              value={item}
                              onChange={(e) => updateAboutSiteItem(si, ii, e.target.value)}
                              placeholder="列表项内容..." />
                            <button className="btn btn-xs btn-ghost btn-square" onClick={() => moveAboutSiteItem(si, ii, 'up')} disabled={ii === 0}>↑</button>
                            <button className="btn btn-xs btn-ghost btn-square" onClick={() => moveAboutSiteItem(si, ii, 'down')} disabled={ii === section.items.length - 1}>↓</button>
                            <button className="btn btn-xs btn-ghost btn-square text-error" onClick={() => removeAboutSiteItem(si, ii)}>✕</button>
                          </div>
                        ))}
                        <button className="btn btn-xs btn-outline border-dashed" onClick={() => addAboutSiteItem(si)}>+ 添加列表项</button>
                      </div>
                    </div>
                  ))}

                  <button className="btn btn-sm btn-outline border-dashed w-full" onClick={addAboutSiteSection}>
                    + 添加段落
                  </button>
                </div>
              ) : (
                <div className="prose prose-base dark:prose-invert max-w-none">
                  {data.aboutSite?.intro && <p>{data.aboutSite.intro}</p>}
                  {(data.aboutSite?.sections || []).map((section, si) => (
                    <div key={si}>
                      <h3 className="text-xl font-bold mt-4 mb-2">{section.title}</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {section.items.map((item, ii) => (
                          <li key={ii}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Tech Stack */}
            <section>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                <span>技术栈</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {data.techStack.map((tech, idx) => (
                  <div key={idx}
                    className={`relative flex flex-col items-center justify-center p-4 bg-base-200 rounded-lg transition-colors ${editMode ? 'hover:bg-base-300 cursor-pointer ring-1 ring-base-300' : ''}`}
                    onClick={() => editMode && setTechEditIndex(idx)}>
                    {editMode && (
                      <button className="absolute -top-1.5 -right-1.5 btn btn-circle btn-xs btn-error btn-outline"
                        onClick={(e) => { e.stopPropagation(); removeTechItem(idx) }}>✕</button>
                    )}
                    <div className="text-3xl mb-2" style={{ color: tech.color || '#888' }}>
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold"
                        style={{ backgroundColor: (tech.color || '#888') + '20', color: tech.color || '#888' }}>
                        {tech.name.charAt(0)}
                      </div>
                    </div>
                    <span className="text-sm font-medium">{tech.name}</span>
                    {editMode && (
                      <div className="flex gap-0.5 mt-1">
                        <button className="btn btn-xs btn-ghost" onClick={(e) => { e.stopPropagation(); moveTechItem(idx, 'up') }} disabled={idx === 0}>↑</button>
                        <button className="btn btn-xs btn-ghost" onClick={(e) => { e.stopPropagation(); moveTechItem(idx, 'down') }} disabled={idx === data.techStack.length - 1}>↓</button>
                      </div>
                    )}
                  </div>
                ))}
                {editMode && (
                  <button className="flex flex-col items-center justify-center p-4 bg-base-200 rounded-lg border-2 border-dashed border-base-300 hover:border-primary hover:text-primary transition-colors min-h-[100px]"
                    onClick={() => setTechAddOpen(true)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    <span className="text-sm mt-1">添加</span>
                  </button>
                )}
              </div>
            </section>
          </div>
        </div>

        <div className="divider my-6">
          <svg className="w-12 h-12 text-primary/50" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
        </div>
      </div>

      {techModal && (
        <TechEditModal item={techModal.item} isNew={techModal.isNew}
          onSave={(item) => {
            if (techModal.index !== null) {
              updateTechItem(techModal.index, item)
            } else {
              addTechItem(item as TechStackItem)
            }
            setTechEditIndex(null)
            setTechAddOpen(false)
          }}
          onCancel={() => { setTechEditIndex(null); setTechAddOpen(false) }} />
      )}
    </div>
  )
}
