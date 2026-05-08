import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ProjectItem } from '@interfaces/site'

const defaultNewItem: ProjectItem = {
  name: '',
  avatar: '',
  description: '',
  url: '',
  badge: '',
}

export interface ProjectEditorState {
  items: ProjectItem[]
  initialized: boolean
  editMode: boolean
  isDirty: boolean
  loading: boolean
  saving: boolean
  editingItemKey: string | null

  initData: (items: ProjectItem[]) => void
  mergeRemote: (remote: ProjectItem[]) => void
  setItems: (items: ProjectItem[]) => void
  setEditMode: (on: boolean) => void
  setLoading: (v: boolean) => void
  setSaving: (v: boolean) => void
  setIsDirty: (v: boolean) => void

  startEditItem: (index: number) => void
  cancelEditItem: () => void
  saveItemEdit: (index: number | null, data: Partial<ProjectItem>) => void
  deleteItem: (index: number) => void
  moveItem: (index: number, direction: 'up' | 'down') => void
}

export const useProjectEditorStore = create<ProjectEditorState>()(
  persist(
    (set, get) => ({
      items: [],
      initialized: false,
      editMode: false,
      isDirty: false,
      loading: false,
      saving: false,
      editingItemKey: null,

      initData: (items) => {
        const { isDirty, initialized } = get()
        if (!initialized && !isDirty) {
          set({ items, initialized: true })
        } else if (!initialized && isDirty) {
          set({ initialized: true })
        }
      },

      mergeRemote: (remote) => {
        const { isDirty, items } = get()
        if (!isDirty) { set({ items: remote }); return }
        const localNames = new Set(items.map((i) => i.name))
        const extraRemote = remote.filter((i) => !localNames.has(i.name))
        set({ items: [...items, ...extraRemote] })
      },

      setItems: (items) => set({ items }),
      setEditMode: (on) => set({ editMode: on }),
      setLoading: (v) => set({ loading: v }),
      setSaving: (v) => set({ saving: v }),
      setIsDirty: (v) => set({ isDirty: v }),

      startEditItem: (index) => set({ editingItemKey: String(index) }),
      cancelEditItem: () => set({ editingItemKey: null }),

      saveItemEdit: (index, data) => {
        const items = [...get().items]
        if (index === null || index < 0) {
          items.push({ ...defaultNewItem, ...data } as ProjectItem)
        } else {
          items[index] = { ...items[index], ...data }
        }
        set({ items, editingItemKey: null, isDirty: true })
      },

      deleteItem: (index) => {
        const items = [...get().items]
        items.splice(index, 1)
        set({ items, isDirty: true, editingItemKey: null })
      },

      moveItem: (index, direction) => {
        const items = [...get().items]
        const target = direction === 'up' ? index - 1 : index + 1
        if (target < 0 || target >= items.length) return
        ;[items[index], items[target]] = [items[target], items[index]]
        set({ items, isDirty: true })
      },
    }),
    {
      name: 'ryuchan-project-editor',
      partialize: (state) => ({ items: state.items, isDirty: state.isDirty }),
    }
  )
)
