import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FriendItem, ShowcaseSite } from '@interfaces/site'

const defaultNewFriend: FriendItem = {
  name: '',
  avatar: '',
  description: '',
  url: '',
  badge: '',
}

export interface FriendEditorState {
  items: FriendItem[]
  sites: ShowcaseSite[]
  initialized: boolean
  editMode: boolean
  isDirty: boolean
  loading: boolean
  saving: boolean
  editingFriendKey: string | null
  editingSiteKey: string | null

  initData: (items: FriendItem[], sites: ShowcaseSite[]) => void
  mergeRemote: (items: FriendItem[], sites: ShowcaseSite[]) => void
  setEditMode: (on: boolean) => void
  setLoading: (v: boolean) => void
  setSaving: (v: boolean) => void
  setIsDirty: (v: boolean) => void

  // Friend items
  startEditFriend: (index: number) => void
  cancelEditFriend: () => void
  saveFriendEdit: (index: number | null, data: Partial<FriendItem>) => void
  deleteFriend: (index: number) => void
  moveFriend: (index: number, direction: 'up' | 'down') => void

  // Showcase sites
  startEditSite: (index: number) => void
  cancelEditSite: () => void
  saveSiteEdit: (index: number | null, data: Partial<ShowcaseSite>) => void
  deleteSite: (index: number) => void
  moveSite: (index: number, direction: 'up' | 'down') => void
}

export const useFriendEditorStore = create<FriendEditorState>()(
  persist(
    (set, get) => ({
      items: [],
      sites: [],
      initialized: false,
      editMode: false,
      isDirty: false,
      loading: false,
      saving: false,
      editingFriendKey: null,
      editingSiteKey: null,

      initData: (items, sites) => {
        const { isDirty, initialized } = get()
        if (!initialized && !isDirty) {
          set({ items, sites, initialized: true })
        } else if (!initialized && isDirty) {
          set({ initialized: true })
        }
      },

      mergeRemote: (items, sites) => {
        const { isDirty, items: localItems, sites: localSites } = get()
        if (!isDirty) { set({ items, sites }); return }
        const localNames = new Set(localItems.map((i) => i.name))
        const extraItems = items.filter((i) => !localNames.has(i.name))
        const localSiteUrls = new Set(localSites.map((s) => s.url))
        const extraSites = sites.filter((s) => !localSiteUrls.has(s.url))
        set({ items: [...localItems, ...extraItems], sites: [...localSites, ...extraSites] })
      },

      setEditMode: (on) => set({ editMode: on }),
      setLoading: (v) => set({ loading: v }),
      setSaving: (v) => set({ saving: v }),
      setIsDirty: (v) => set({ isDirty: v }),

      // Friend items
      startEditFriend: (index) => set({ editingFriendKey: String(index), editingSiteKey: null }),
      cancelEditFriend: () => set({ editingFriendKey: null }),
      saveFriendEdit: (index, data) => {
        const items = [...get().items]
        if (index === null || index < 0) {
          items.push({ ...defaultNewFriend, ...data } as FriendItem)
        } else {
          items[index] = { ...items[index], ...data }
        }
        set({ items, editingFriendKey: null, isDirty: true })
      },
      deleteFriend: (index) => {
        const items = [...get().items]
        items.splice(index, 1)
        set({ items, isDirty: true, editingFriendKey: null })
      },
      moveFriend: (index, direction) => {
        const items = [...get().items]
        const target = direction === 'up' ? index - 1 : index + 1
        if (target < 0 || target >= items.length) return
        ;[items[index], items[target]] = [items[target], items[index]]
        set({ items, isDirty: true })
      },

      // Showcase sites
      startEditSite: (index) => set({ editingSiteKey: String(index), editingFriendKey: null }),
      cancelEditSite: () => set({ editingSiteKey: null }),
      saveSiteEdit: (index, data) => {
        const sites = [...get().sites]
        if (index === null || index < 0) {
          sites.push({ name: data.name || '', url: data.url || '' })
        } else {
          sites[index] = { ...sites[index], ...data }
        }
        set({ sites, editingSiteKey: null, isDirty: true })
      },
      deleteSite: (index) => {
        const sites = [...get().sites]
        sites.splice(index, 1)
        set({ sites, isDirty: true, editingSiteKey: null })
      },
      moveSite: (index, direction) => {
        const sites = [...get().sites]
        const target = direction === 'up' ? index - 1 : index + 1
        if (target < 0 || target >= sites.length) return
        ;[sites[index], sites[target]] = [sites[target], sites[index]]
        set({ sites, isDirty: true })
      },
    }),
    {
      name: 'ryuchan-friend-editor',
      partialize: (state) => ({
        items: state.items,
        sites: state.sites,
        isDirty: state.isDirty,
      }),
    }
  )
)
