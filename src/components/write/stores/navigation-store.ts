import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { NavCategory, NavItem } from '@interfaces/site'

function generateId(): string {
  return 'NAV' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6)
}

const defaultNewCategory: Omit<NavCategory, 'items'> & { items: NavItem[] } = {
  title: '新分类',
  icon: 'lucide:bookmark',
  items: [],
}

const defaultNewItem: Omit<NavItem, 'id'> = {
  name: '',
  avatar: '',
  description: '',
  url: '',
  category: '',
  badge: '',
  badgeIcon: 'lucide:award',
  badgeColor: 'primary',
}

export interface NavEditorState {
  categories: NavCategory[]
  initialized: boolean   // true after initData() or first remote fetch

  editMode: boolean
  isDirty: boolean
  loading: boolean
  saving: boolean
  error: string | null

  editingCategoryIndex: number | null
  editingCardKey: string | null
  addingItemToCategory: number | null

  // Init with server-provided data (from Astro build)
  initData: (categories: NavCategory[]) => void

  // Merge remote data (from GitHub API) with local edits
  mergeRemote: (remote: NavCategory[]) => void

  setCategories: (categories: NavCategory[]) => void
  setEditMode: (on: boolean) => void
  setLoading: (v: boolean) => void
  setSaving: (v: boolean) => void
  setError: (e: string | null) => void
  setIsDirty: (v: boolean) => void

  startEditCategory: (index: number) => void
  cancelEditCategory: () => void
  saveCategoryEdit: (index: number, data: { title: string; icon: string }) => void
  addCategory: () => void
  deleteCategory: (index: number) => void
  moveCategory: (index: number, direction: 'up' | 'down') => void

  startEditCard: (catIndex: number, itemIndex: number) => void
  cancelEditCard: () => void
  saveCardEdit: (catIndex: number, itemIndex: number | null, data: Partial<NavItem>) => void

  deleteItem: (catIndex: number, itemIndex: number) => void
  moveItem: (catIndex: number, itemIndex: number, direction: 'up' | 'down') => void
}

export const useNavEditorStore = create<NavEditorState>()(
  persist(
    (set, get) => ({
      categories: [],
      initialized: false,
      editMode: false,
      isDirty: false,
      loading: false,
      saving: false,
      error: null,
      editingCategoryIndex: null,
      editingCardKey: null,
      addingItemToCategory: null,

      initData: (categories) => {
        const { isDirty, initialized } = get()
        // Only set from server data if we haven't initialized yet AND there are no local edits
        if (!initialized && !isDirty) {
          set({ categories, initialized: true })
        } else if (!initialized && isDirty) {
          // Has local edits from a previous session — merge
          set({ initialized: true })
        }
      },

      mergeRemote: (remote) => {
        const { isDirty, categories } = get()
        if (!isDirty) {
          set({ categories: remote })
          return
        }
        const merged = remote.map((remoteCat) => {
          const localCat = categories.find((c) => c.title === remoteCat.title)
          if (localCat) {
            const localItemNames = new Set(localCat.items.map((i) => i.name))
            const extraRemoteItems = remoteCat.items.filter((i) => !localItemNames.has(i.name))
            return { ...localCat, items: [...localCat.items, ...extraRemoteItems] }
          }
          return remoteCat
        })
        const remoteTitles = new Set(remote.map((c) => c.title))
        for (const localCat of categories) {
          if (!remoteTitles.has(localCat.title)) merged.push(localCat)
        }
        set({ categories: merged })
      },

      setCategories: (categories) => set({ categories }),
      setEditMode: (on) => set({ editMode: on }),
      setLoading: (v) => set({ loading: v }),
      setSaving: (v) => set({ saving: v }),
      setError: (e) => set({ error: e }),
      setIsDirty: (v) => set({ isDirty: v }),

      startEditCategory: (index) => set({ editingCategoryIndex: index }),
      cancelEditCategory: () => set({ editingCategoryIndex: null }),

      saveCategoryEdit: (index, data) => {
        const categories = [...get().categories]
        categories[index] = { ...categories[index], title: data.title, icon: data.icon }
        set({ categories, editingCategoryIndex: null, isDirty: true })
      },

      addCategory: () => {
        const categories = [...get().categories, { ...defaultNewCategory, items: [] }]
        set({ categories, isDirty: true, editingCategoryIndex: categories.length - 1 })
      },

      deleteCategory: (index) => {
        const categories = [...get().categories]
        categories.splice(index, 1)
        set({ categories, isDirty: true, editingCategoryIndex: null, editingCardKey: null })
      },

      moveCategory: (index, direction) => {
        const categories = [...get().categories]
        const target = direction === 'up' ? index - 1 : index + 1
        if (target < 0 || target >= categories.length) return
        ;[categories[index], categories[target]] = [categories[target], categories[index]]
        set({ categories, isDirty: true })
      },

      startEditCard: (catIndex, itemIndex) => {
        set({ editingCardKey: `${catIndex}-${itemIndex}`, editingCategoryIndex: null })
      },

      cancelEditCard: () => set({ editingCardKey: null }),

      saveCardEdit: (catIndex, itemIndex, data) => {
        const categories = [...get().categories]
        const cat = { ...categories[catIndex] }
        const items = [...cat.items]
        if (itemIndex === null || itemIndex < 0) {
          items.push({ ...defaultNewItem, ...data, id: data.id || generateId() } as NavItem)
        } else {
          items[itemIndex] = { ...items[itemIndex], ...data }
        }
        cat.items = items
        categories[catIndex] = cat
        set({ categories, editingCardKey: null, isDirty: true })
      },

      deleteItem: (catIndex, itemIndex) => {
        const categories = [...get().categories]
        const cat = { ...categories[catIndex] }
        cat.items = [...cat.items]
        cat.items.splice(itemIndex, 1)
        categories[catIndex] = cat
        set({ categories, isDirty: true, editingCardKey: null })
      },

      moveItem: (catIndex, itemIndex, direction) => {
        const categories = [...get().categories]
        const cat = { ...categories[catIndex] }
        const items = [...cat.items]
        const target = direction === 'up' ? itemIndex - 1 : itemIndex + 1
        if (target < 0 || target >= items.length) return
        ;[items[itemIndex], items[target]] = [items[target], items[itemIndex]]
        cat.items = items
        categories[catIndex] = cat
        set({ categories, isDirty: true })
      },
    }),
    {
      name: 'ryuchan-nav-editor',
      partialize: (state) => ({
        categories: state.categories,
        isDirty: state.isDirty,
      }),
    }
  )
)
