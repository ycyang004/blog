import { useEffect, useState, useRef } from 'react'
import { toast, Toaster } from 'sonner'
import { useAuthStore } from './hooks/use-auth'
import { useNavEditorStore } from './stores/navigation-store'
import { loadNavigationConfig, saveNavigationConfig } from './services/save-navigation'
import { readFileAsText } from '@/lib/file-utils'
import type { NavItem } from '@interfaces/site'

// Common icon presets for navigation categories
const ICON_PRESETS = [
  { label: 'Code', value: 'lucide:code' },
  { label: 'Server', value: 'lucide:server' },
  { label: 'Image', value: 'lucide:image' },
  { label: 'Bookmark', value: 'lucide:bookmark' },
  { label: 'Star', value: 'lucide:star' },
  { label: 'Heart', value: 'lucide:heart' },
  { label: 'Globe', value: 'lucide:globe' },
  { label: 'Zap', value: 'lucide:zap' },
  { label: 'Rocket', value: 'lucide:rocket' },
  { label: 'Shield', value: 'lucide:shield' },
  { label: 'Music', value: 'lucide:music' },
  { label: 'Film', value: 'lucide:film' },
  { label: 'Book', value: 'lucide:book' },
  { label: 'Palette', value: 'lucide:palette' },
  { label: 'Wrench', value: 'lucide:wrench' },
  { label: 'Package', value: 'lucide:package' },
  { label: 'Link', value: 'lucide:link' },
]

const BADGE_COLOR_PRESETS = [
  { label: '默认', value: 'primary' },
  { label: '玫瑰', value: 'rose' },
  { label: '天蓝', value: 'sky' },
  { label: '琥珀', value: 'amber' },
  { label: '翠绿', value: 'emerald' },
  { label: '紫罗兰', value: 'violet' },
  { label: '橘黄', value: 'orange' },
  { label: '粉红', value: 'pink' },
]

function MiniSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (val: string) => void
  options: { label: string; value: string }[]
}) {
  return (
    <div className="dropdown dropdown-hover w-full">
      <div tabIndex={0} className="btn btn-xs btn-ghost w-full justify-between text-left font-normal">
        <span className="truncate">{options.find((o) => o.value === value)?.label || value}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
      </div>
      <ul tabIndex={0} className="dropdown-content z-50 menu p-1 shadow-lg bg-base-100 rounded-xl border border-base-200 w-40 max-h-60 overflow-y-auto">
        {options.map((opt) => (
          <li key={opt.value}>
            <button
              className={`text-xs ${value === opt.value ? 'bg-primary/10 text-primary font-medium' : ''}`}
              onClick={() => onChange(opt.value)}
            >
              {opt.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Simple color swatch component
function ColorSwatch({ color, selected, onClick }: { color: string; selected: boolean; onClick: () => void }) {
  const isCssColor = /^[#]|rgb|hsl|var/.test(color)
  const preset = BADGE_COLOR_PRESETS.find((p) => p.value === color)

  const bgMap: Record<string, string> = {
    primary: 'bg-primary',
    rose: 'bg-rose-500',
    sky: 'bg-sky-500',
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-500',
    violet: 'bg-violet-500',
    orange: 'bg-orange-500',
    pink: 'bg-pink-500',
  }

  return (
    <button
      className={`w-6 h-6 rounded-full border-2 transition-all ${selected ? 'border-base-content scale-110 shadow-md' : 'border-transparent hover:scale-105'} ${isCssColor ? '' : bgMap[color] || 'bg-primary'}`}
      style={isCssColor ? { backgroundColor: color } : {}}
      onClick={onClick}
      title={preset?.label || color}
    />
  )
}

export function NavigationConfigPage() {
  const {
    categories,
    selectedCategoryIndex,
    isDirty,
    loading,
    saving,
    editingCategory,
    editingItem,
    addingItemToCategory,
    setCategories,
    setOriginalCategories,
    selectCategory,
    setLoading,
    setSaving,
    setError,
    setIsDirty,
    startEditCategory,
    cancelEditCategory,
    saveEditCategory,
    addCategory,
    deleteCategory,
    moveCategory,
    startAddItem,
    startEditItem,
    cancelEditItem,
    saveEditItem,
    deleteItem,
    moveItem,
    updateEditingCategoryData,
    updateEditingItemData,
  } = useNavEditorStore()

  const { isAuth, setPrivateKey } = useAuthStore()
  const keyInputRef = useRef<HTMLInputElement>(null)
  const [categoryForm, setCategoryForm] = useState<{ title: string; icon: string }>({ title: '', icon: 'lucide:bookmark' })
  const [itemForm, setItemForm] = useState<Partial<NavItem>>({})

  // Sync editing category form
  useEffect(() => {
    if (editingCategory) {
      setCategoryForm({
        title: editingCategory.data.title || '',
        icon: editingCategory.data.icon || 'lucide:bookmark',
      })
    }
  }, [editingCategory])

  // Sync editing item form
  useEffect(() => {
    if (editingItem) {
      setItemForm({ ...editingItem.data })
    }
  }, [editingItem])

  // Load config on auth
  useEffect(() => {
    loadConfig()
  }, [isAuth])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const cats = await loadNavigationConfig()
      setCategories(cats)
      setOriginalCategories(cats)
      setIsDirty(false)
      if (cats.length > 0 && selectedCategoryIndex < 0) {
        selectCategory(0)
      }
    } catch (error: any) {
      setError(error.message)
      toast.error('加载配置失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!window.confirm('确定保存导航配置吗？这将直接推送到 GitHub 仓库。')) {
      return
    }
    try {
      setSaving(true)
      const toastId = toast.loading('正在保存...')

      await saveNavigationConfig(categories, (msg) => {
        toast.loading(msg, { id: toastId })
      })

      setOriginalCategories([...categories])
      setIsDirty(false)
      toast.success('导航配置保存成功！', {
        id: toastId,
        description: '更改已推送到仓库，GitHub Actions 将会自动重新部署。',
      })
    } catch (error: any) {
      toast.error('保存失败', { description: error.message })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveCategory = () => {
    if (!editingCategory) return
    updateEditingCategoryData({ title: categoryForm.title, icon: categoryForm.icon })
    saveEditCategory()
  }

  const handleSaveItem = () => {
    if (!editingItem) return
    updateEditingItemData(itemForm)
    saveEditItem()
  }

  const handleImportKey = () => {
    keyInputRef.current?.click()
  }

  const onChoosePrivateKey = async (file: File) => {
    try {
      const pem = await readFileAsText(file)
      setPrivateKey(pem)
      toast.success('密钥导入成功')
    } catch {
      toast.error('密钥导入失败')
    }
  }

  const selectedCategory = categories[selectedCategoryIndex]

  return (
    <div className="w-full max-w-7xl mx-auto my-8 font-sans">
      <Toaster
        richColors
        position="top-center"
        toastOptions={{
          className: 'shadow-xl rounded-2xl border-2 border-primary/20 backdrop-blur-sm',
          style: {
            fontSize: '1rem',
            padding: '14px 20px',
            zIndex: '999999',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
          },
          duration: 5000,
          closeButton: false,
        }}
      />

      <input
        ref={keyInputRef}
        type="file"
        accept=".pem"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0]
          if (f) await onChoosePrivateKey(f)
          if (e.currentTarget) e.currentTarget.value = ''
        }}
      />

      <div className="rounded-3xl bg-base-100 shadow-2xl flex flex-col overflow-hidden border border-base-200 min-h-[700px]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-4 border-b border-base-200 bg-base-100/50 backdrop-blur-sm sticky top-0 z-10 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-primary rounded-full" />
            <h2 className="text-xl font-bold text-primary">导航配置</h2>
            {isDirty && (
              <span className="badge badge-warning badge-sm gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-warning-content animate-pulse" />
                未保存
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!isAuth && (
              <button onClick={handleImportKey} className="btn btn-sm btn-ghost bg-base-200 gap-1" title="导入密钥以解锁保存功能">
                <span>🔑</span>
                <span className="hidden sm:inline">验证</span>
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || loading || !isAuth || !isDirty}
              className="btn btn-sm btn-primary px-6 shadow-lg shadow-primary/20"
            >
              {saving ? '保存中...' : '保存配置'}
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex h-96 items-center justify-center text-base-content/50">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        ) : !isAuth && categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full flex-1 p-12 text-center space-y-6">
            <div className="w-24 h-24 bg-base-200 rounded-full flex items-center justify-center mb-4">
              <span className="text-4xl">🔒</span>
            </div>
            <h3 className="text-xl font-bold">需要身份验证</h3>
            <p className="text-base-content/60">请导入您的私钥以开始编辑导航配置</p>
            <button onClick={handleImportKey} className="btn btn-primary btn-wide shadow-lg shadow-primary/20">
              导入密钥 (.pem)
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row min-h-0">
            {/* Left: Category List */}
            <div className="lg:w-64 flex-shrink-0 border-r border-base-200 bg-base-200/30 flex flex-col">
              <div className="p-3 border-b border-base-200 flex items-center justify-between">
                <span className="text-sm font-semibold text-base-content/70">分类列表</span>
                <span className="text-xs text-base-content/40">{categories.length} 个</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {categories.length === 0 ? (
                  <div className="text-center text-base-content/40 text-xs py-8">
                    暂无分类，点击下方按钮创建
                  </div>
                ) : (
                  categories.map((cat, idx) => (
                    <div
                      key={idx}
                      className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                        selectedCategoryIndex === idx
                          ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm'
                          : 'hover:bg-base-100 text-base-content/70 border border-transparent'
                      }`}
                      onClick={() => selectCategory(idx)}
                    >
                      <span className="text-sm truncate flex-1">{cat.title}</span>
                      <span className="text-xs text-base-content/30">{cat.items.length}</span>
                      <div className="hidden group-hover:flex items-center gap-0.5">
                        <button
                          className="btn btn-xs btn-ghost btn-square"
                          onClick={(e) => { e.stopPropagation(); moveCategory(idx, 'up') }}
                          disabled={idx === 0}
                        >↑</button>
                        <button
                          className="btn btn-xs btn-ghost btn-square"
                          onClick={(e) => { e.stopPropagation(); moveCategory(idx, 'down') }}
                          disabled={idx === categories.length - 1}
                        >↓</button>
                        <button
                          className="btn btn-xs btn-ghost btn-square"
                          onClick={(e) => { e.stopPropagation(); startEditCategory(idx) }}
                        >✎</button>
                        <button
                          className="btn btn-xs btn-ghost btn-square text-error"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (window.confirm('确定删除该分类及其所有资源吗？')) deleteCategory(idx)
                          }}
                        >✕</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-2 border-t border-base-200">
                <button
                  onClick={addCategory}
                  className="btn btn-outline btn-sm w-full border-dashed border-2 text-base-content/50 hover:text-primary hover:border-primary hover:bg-primary/5"
                >
                  + 添加分类
                </button>
              </div>
            </div>

            {/* Center: Items List */}
            <div className="lg:w-80 flex-shrink-0 border-r border-base-200 flex flex-col">
              <div className="p-3 border-b border-base-200 flex items-center justify-between">
                <span className="text-sm font-semibold text-base-content/70">
                  {selectedCategory ? selectedCategory.title : '资源列表'}
                </span>
                {selectedCategory && (
                  <span className="text-xs text-base-content/40">{selectedCategory.items.length} 个</span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {!selectedCategory ? (
                  <div className="text-center text-base-content/40 text-xs py-8">
                    请选择一个分类
                  </div>
                ) : selectedCategory.items.length === 0 ? (
                  <div className="text-center text-base-content/40 text-xs py-8">
                    暂无资源
                  </div>
                ) : (
                  selectedCategory.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="group flex items-center gap-2 px-3 py-2 rounded-xl border border-transparent hover:bg-base-100 hover:border-base-200 transition-all"
                    >
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-base-200 flex-shrink-0">
                        {item.avatar ? (
                          <img src={item.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-base-content/30 text-xs">?</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{item.name}</div>
                        <div className="text-xs text-base-content/40 truncate">{item.url}</div>
                      </div>
                      <div className="hidden group-hover:flex items-center gap-0.5">
                        <button
                          className="btn btn-xs btn-ghost btn-square"
                          onClick={() => moveItem(selectedCategoryIndex, idx, 'up')}
                          disabled={idx === 0}
                        >↑</button>
                        <button
                          className="btn btn-xs btn-ghost btn-square"
                          onClick={() => moveItem(selectedCategoryIndex, idx, 'down')}
                          disabled={idx === selectedCategory.items.length - 1}
                        >↓</button>
                        <button
                          className="btn btn-xs btn-ghost btn-square"
                          onClick={() => startEditItem(selectedCategoryIndex, idx)}
                        >✎</button>
                        <button
                          className="btn btn-xs btn-ghost btn-square text-error"
                          onClick={() => {
                            if (window.confirm('确定删除该资源吗？')) deleteItem(selectedCategoryIndex, idx)
                          }}
                        >✕</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-2 border-t border-base-200">
                <button
                  onClick={() => selectedCategoryIndex >= 0 && startAddItem(selectedCategoryIndex)}
                  className="btn btn-outline btn-sm w-full border-dashed border-2 text-base-content/50 hover:text-primary hover:border-primary hover:bg-primary/5"
                  disabled={selectedCategoryIndex < 0}
                >
                  + 添加资源
                </button>
              </div>
            </div>

            {/* Right: Editor & Preview */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Editing Form */}
              {editingCategory && (
                <div className="p-4 border-b border-base-200 bg-base-200/20">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-primary">编辑分类</h4>
                    <button onClick={cancelEditCategory} className="btn btn-xs btn-ghost btn-square">✕</button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-base-content/60 mb-1 block">分类名称</label>
                      <input
                        type="text"
                        className="input input-sm input-bordered w-full bg-base-100 focus:border-primary"
                        value={categoryForm.title}
                        onChange={(e) => setCategoryForm((f) => ({ ...f, title: e.target.value }))}
                        placeholder="输入分类名称"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-base-content/60 mb-1 block">图标</label>
                      <MiniSelect
                        value={categoryForm.icon}
                        onChange={(v) => setCategoryForm((f) => ({ ...f, icon: v }))}
                        options={ICON_PRESETS}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={cancelEditCategory} className="btn btn-xs btn-ghost">取消</button>
                      <button onClick={handleSaveCategory} className="btn btn-xs btn-primary">保存</button>
                    </div>
                  </div>
                </div>
              )}

              {editingItem && (
                <div className="p-4 border-b border-base-200 bg-base-200/20">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-primary">
                      {addingItemToCategory !== null ? '添加资源' : '编辑资源'}
                    </h4>
                    <button onClick={cancelEditItem} className="btn btn-xs btn-ghost btn-square">✕</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-base-content/60 mb-1 block">名称 *</label>
                      <input
                        type="text"
                        className="input input-sm input-bordered w-full bg-base-100 focus:border-primary"
                        value={itemForm.name || ''}
                        onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="资源名称"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-base-content/60 mb-1 block">链接地址 *</label>
                      <input
                        type="text"
                        className="input input-sm input-bordered w-full bg-base-100 focus:border-primary"
                        value={itemForm.url || ''}
                        onChange={(e) => setItemForm((f) => ({ ...f, url: e.target.value }))}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-base-content/60 mb-1 block">头像地址</label>
                      <input
                        type="text"
                        className="input input-sm input-bordered w-full bg-base-100 focus:border-primary"
                        value={itemForm.avatar || ''}
                        onChange={(e) => setItemForm((f) => ({ ...f, avatar: e.target.value }))}
                        placeholder="https://... 图标URL"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-base-content/60 mb-1 block">描述</label>
                      <input
                        type="text"
                        className="input input-sm input-bordered w-full bg-base-100 focus:border-primary"
                        value={itemForm.description || ''}
                        onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))}
                        placeholder="简短描述"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-base-content/60 mb-1 block">子分类</label>
                      <input
                        type="text"
                        className="input input-sm input-bordered w-full bg-base-100 focus:border-primary"
                        value={itemForm.category || ''}
                        onChange={(e) => setItemForm((f) => ({ ...f, category: e.target.value }))}
                        placeholder="如：部署托管"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-base-content/60 mb-1 block">资源编号</label>
                      <input
                        type="text"
                        className="input input-sm input-bordered w-full bg-base-100 focus:border-primary"
                        value={itemForm.id || ''}
                        onChange={(e) => setItemForm((f) => ({ ...f, id: e.target.value }))}
                        placeholder="如：DEV001"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-base-content/60 mb-1 block">徽章文本</label>
                      <input
                        type="text"
                        className="input input-sm input-bordered w-full bg-base-100 focus:border-primary"
                        value={itemForm.badge || ''}
                        onChange={(e) => setItemForm((f) => ({ ...f, badge: e.target.value }))}
                        placeholder="留空则随机显示"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-base-content/60 mb-1 block">徽章图标</label>
                      <MiniSelect
                        value={itemForm.badgeIcon || 'lucide:award'}
                        onChange={(v) => setItemForm((f) => ({ ...f, badgeIcon: v }))}
                        options={ICON_PRESETS}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-base-content/60 mb-1 block">徽章颜色</label>
                      <div className="flex gap-1.5">
                        {BADGE_COLOR_PRESETS.map((preset) => (
                          <ColorSwatch
                            key={preset.value}
                            color={preset.value}
                            selected={itemForm.badgeColor === preset.value || (!itemForm.badgeColor && preset.value === 'primary')}
                            onClick={() => setItemForm((f) => ({ ...f, badgeColor: preset.value }))}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end mt-3">
                    <button onClick={cancelEditItem} className="btn btn-xs btn-ghost">取消</button>
                    <button onClick={handleSaveItem} className="btn btn-xs btn-primary">保存</button>
                  </div>
                </div>
              )}

              {/* Preview Panel */}
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">实时预览</span>
                </div>

                {categories.length === 0 ? (
                  <div className="text-center text-base-content/30 text-sm py-16">
                    添加分类和资源后将在此处显示预览
                  </div>
                ) : (
                  <div className="space-y-6">
                    {categories.map((cat, catIdx) => (
                      <div key={catIdx}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-sm font-bold text-base-content/80">{cat.title}</span>
                          <span className="text-xs text-base-content/30">({cat.items.length})</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                          {cat.items.map((item, itemIdx) => (
                            <div
                              key={itemIdx}
                              className="bg-base-100 rounded-xl border border-base-200 p-3 shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer"
                              onClick={() => {
                                selectCategory(catIdx)
                                startEditItem(catIdx, itemIdx)
                              }}
                            >
                              <div className="flex items-start gap-2.5">
                                <div className="w-8 h-8 rounded-lg overflow-hidden bg-base-200 flex-shrink-0">
                                  {item.avatar ? (
                                    <img src={item.avatar} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-base-content/30 text-xs">?</div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-semibold truncate">{item.name || '未命名'}</div>
                                  <div className="text-[10px] text-base-content/40 truncate">
                                    {item.url ? new URL(item.url).hostname : ''}
                                  </div>
                                  {item.badge && (
                                    <div className={`mt-1 inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0 rounded-md ${
                                      item.badgeColor === 'rose' ? 'bg-rose-500/10 text-rose-500' :
                                      item.badgeColor === 'sky' ? 'bg-sky-500/10 text-sky-500' :
                                      item.badgeColor === 'amber' ? 'bg-amber-500/10 text-amber-500' :
                                      item.badgeColor === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' :
                                      item.badgeColor === 'violet' ? 'bg-violet-500/10 text-violet-500' :
                                      item.badgeColor === 'orange' ? 'bg-orange-500/10 text-orange-500' :
                                      item.badgeColor === 'pink' ? 'bg-pink-500/10 text-pink-500' :
                                      'bg-primary/10 text-primary'
                                    }`}>
                                      {item.badge}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="mt-1.5 text-[10px] text-base-content/50 leading-tight line-clamp-2">
                                {item.description}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
