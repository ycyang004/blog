import { create } from 'zustand'
import type { NavCategory, NavItem } from '@interfaces/site'

export interface NavEditorState {
  // Data
  categories: NavCategory[]
  originalCategories: NavCategory[]
  selectedCategoryIndex: number

  // UI state
  isDirty: boolean
  loading: boolean
  saving: boolean
  error: string | null

  // Category editing
  editingCategory: { index: number; data: Partial<NavCategory> } | null

  // Item editing
  editingItem: { catIndex: number; itemIndex: number; data: Partial<NavItem> } | null
  addingItemToCategory: number | null

  // Actions
  setCategories: (categories: NavCategory[]) => void
  setOriginalCategories: (categories: NavCategory[]) => void
  selectCategory: (index: number) => void
  setLoading: (loading: boolean) => void
  setSaving: (saving: boolean) => void
  setError: (error: string | null) => void
  setIsDirty: (dirty: boolean) => void

  // Category actions
  startEditCategory: (index: number) => void
  cancelEditCategory: () => void
  saveEditCategory: () => void
  updateEditingCategoryData: (data: Partial<NavCategory>) => void
  addCategory: () => void
  deleteCategory: (index: number) => void
  moveCategory: (index: number, direction: 'up' | 'down') => void

  // Item actions
  startAddItem: (catIndex: number) => void
  startEditItem: (catIndex: number, itemIndex: number) => void
  cancelEditItem: () => void
  saveEditItem: () => void
  updateEditingItemData: (data: Partial<NavItem>) => void
  deleteItem: (catIndex: number, itemIndex: number) => void
  moveItem: (catIndex: number, itemIndex: number, direction: 'up' | 'down') => void
}

function generateId(): string {
  return 'NAV' + Date.now().toString(36).toUpperCase()
}

const defaultNewCategory: Partial<NavCategory> = {
  title: '',
  icon: 'lucide:bookmark',
  items: [],
}

const defaultNewItem: Partial<NavItem> = {
  name: '',
  avatar: '',
  description: '',
  url: '',
  category: '',
  badge: '',
  badgeIcon: 'lucide:award',
  badgeColor: 'primary',
}

export const useNavEditorStore = create<NavEditorState>((set, get) => ({
  categories: [],
  originalCategories: [],
  selectedCategoryIndex: -1,
  isDirty: false,
  loading: false,
  saving: false,
  error: null,
  editingCategory: null,
  editingItem: null,
  addingItemToCategory: null,

  setCategories: (categories) => set({ categories }),
  setOriginalCategories: (originalCategories) => set({ originalCategories }),
  selectCategory: (index) => set({ selectedCategoryIndex: index }),
  setLoading: (loading) => set({ loading }),
  setSaving: (saving) => set({ saving }),
  setError: (error) => set({ error }),
  setIsDirty: (dirty) => set({ isDirty: dirty }),

  // Category actions
  startEditCategory: (index) => {
    const cat = get().categories[index]
    if (!cat) return
    set({ editingCategory: { index, data: { ...cat } } })
  },
  cancelEditCategory: () => set({ editingCategory: null }),

  saveEditCategory: () => {
    const { editingCategory, categories } = get()
    if (!editingCategory) return
    const newCategories = [...categories]
    newCategories[editingCategory.index] = {
      ...newCategories[editingCategory.index],
      ...editingCategory.data,
    } as NavCategory
    set({ categories: newCategories, editingCategory: null, isDirty: true })
  },

  updateEditingCategoryData: (data: Partial<NavCategory>) => {
    const { editingCategory } = get()
    if (!editingCategory) return
    set({ editingCategory: { ...editingCategory, data: { ...editingCategory.data, ...data } } })
  },

  addCategory: () => {
    const newCategories = [...get().categories, { ...defaultNewCategory, title: '新分类', items: [] } as NavCategory]
    set({
      categories: newCategories,
      selectedCategoryIndex: newCategories.length - 1,
      isDirty: true,
      editingCategory: { index: newCategories.length - 1, data: { ...defaultNewCategory, title: '新分类' } },
    })
  },

  deleteCategory: (index) => {
    const newCategories = [...get().categories]
    newCategories.splice(index, 1)
    set({
      categories: newCategories,
      selectedCategoryIndex: Math.min(get().selectedCategoryIndex, newCategories.length - 1),
      isDirty: true,
    })
  },

  moveCategory: (index, direction) => {
    const newCategories = [...get().categories]
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= newCategories.length) return
    ;[newCategories[index], newCategories[target]] = [newCategories[target], newCategories[index]]
    set({
      categories: newCategories,
      selectedCategoryIndex: target,
      isDirty: true,
    })
  },

  // Item actions
  startAddItem: (catIndex) => {
    set({
      addingItemToCategory: catIndex,
      editingItem: { catIndex, itemIndex: -1, data: { ...defaultNewItem } },
    })
  },

  startEditItem: (catIndex, itemIndex) => {
    const item = get().categories[catIndex]?.items[itemIndex]
    if (!item) return
    set({ editingItem: { catIndex, itemIndex, data: { ...item } }, addingItemToCategory: null })
  },

  cancelEditItem: () => set({ editingItem: null, addingItemToCategory: null }),

  saveEditItem: () => {
    const { editingItem, categories, addingItemToCategory } = get()
    if (!editingItem) return

    const newCategories = [...categories]
    const cat = { ...newCategories[editingItem.catIndex] }
    const items = [...cat.items]

    if (addingItemToCategory !== null) {
      items.push({ ...editingItem.data, id: editingItem.data.id || generateId() } as NavItem)
    } else {
      items[editingItem.itemIndex] = { ...items[editingItem.itemIndex], ...editingItem.data }
    }

    cat.items = items
    newCategories[editingItem.catIndex] = cat
    set({ categories: newCategories, editingItem: null, addingItemToCategory: null, isDirty: true })
  },

  updateEditingItemData: (data: Partial<NavItem>) => {
    const { editingItem } = get()
    if (!editingItem) return
    set({ editingItem: { ...editingItem, data: { ...editingItem.data, ...data } } })
  },

  deleteItem: (catIndex, itemIndex) => {
    const newCategories = [...get().categories]
    const cat = { ...newCategories[catIndex] }
    const items = [...cat.items]
    items.splice(itemIndex, 1)
    cat.items = items
    newCategories[catIndex] = cat
    set({ categories: newCategories, isDirty: true })
  },

  moveItem: (catIndex, itemIndex, direction) => {
    const newCategories = [...get().categories]
    const cat = { ...newCategories[catIndex] }
    const items = [...cat.items]
    const target = direction === 'up' ? itemIndex - 1 : itemIndex + 1
    if (target < 0 || target >= items.length) return
    ;[items[itemIndex], items[target]] = [items[target], items[itemIndex]]
    cat.items = items
    newCategories[catIndex] = cat
    set({ categories: newCategories, isDirty: true })
  },
}))
