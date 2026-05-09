import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AboutConfig, AboutSiteSection, TechStackItem } from '@interfaces/site'

export interface AboutEditorState {
  data: AboutConfig
  initialized: boolean
  editMode: boolean
  isDirty: boolean
  loading: boolean
  saving: boolean

  initData: (data: AboutConfig) => void
  mergeRemote: (remote: AboutConfig) => void
  setEditMode: (on: boolean) => void
  setLoading: (v: boolean) => void
  setSaving: (v: boolean) => void
  setIsDirty: (v: boolean) => void

  updateField: <K extends keyof AboutConfig>(key: K, value: AboutConfig[K]) => void
  updateBio: (index: number, value: string) => void
  addBio: () => void
  removeBio: (index: number) => void
  moveBio: (index: number, direction: 'up' | 'down') => void

  updateTechItem: (index: number, data: Partial<TechStackItem>) => void
  addTechItem: (item: TechStackItem) => void
  removeTechItem: (index: number) => void
  moveTechItem: (index: number, direction: 'up' | 'down') => void

  // AboutSite actions
  updateAboutSiteIntro: (intro: string) => void
  addAboutSiteSection: () => void
  updateAboutSiteSectionTitle: (index: number, title: string) => void
  removeAboutSiteSection: (index: number) => void
  moveAboutSiteSection: (index: number, direction: 'up' | 'down') => void
  addAboutSiteItem: (sectionIndex: number) => void
  updateAboutSiteItem: (sectionIndex: number, itemIndex: number, value: string) => void
  removeAboutSiteItem: (sectionIndex: number, itemIndex: number) => void
  moveAboutSiteItem: (sectionIndex: number, itemIndex: number, direction: 'up' | 'down') => void
}

const defaultAboutSite = {
  intro: '',
  sections: [] as AboutSiteSection[],
}

const defaultData: AboutConfig = {
  name: '',
  title: '',
  avatar: '',
  bio: [],
  github: '',
  techStack: [],
  aboutSite: defaultAboutSite,
}

function ensureAboutSite(data: AboutConfig) {
  if (!data.aboutSite) {
    return { ...data, aboutSite: { ...defaultAboutSite } }
  }
  return data
}

export const useAboutEditorStore = create<AboutEditorState>()(
  persist(
    (set, get) => ({
      data: { ...defaultData },
      initialized: false,
      editMode: false,
      isDirty: false,
      loading: false,
      saving: false,

      initData: (data) => {
        const { isDirty, initialized } = get()
        if (!initialized && !isDirty) {
          set({ data: ensureAboutSite(data), initialized: true })
        } else if (!initialized && isDirty) {
          set({ initialized: true })
        }
      },

      mergeRemote: (remote) => {
        const { isDirty } = get()
        if (!isDirty) { set({ data: ensureAboutSite(remote) }); return }
      },

      setEditMode: (on) => set({ editMode: on }),
      setLoading: (v) => set({ loading: v }),
      setSaving: (v) => set({ saving: v }),
      setIsDirty: (v) => set({ isDirty: v }),

      updateField: (key, value) => {
        const data = { ...get().data, [key]: value }
        set({ data, isDirty: true })
      },

      updateBio: (index, value) => {
        const data = { ...get().data, bio: [...get().data.bio] }
        data.bio[index] = value
        set({ data, isDirty: true })
      },
      addBio: () => {
        const data = { ...get().data, bio: [...get().data.bio, ''] }
        set({ data, isDirty: true })
      },
      removeBio: (index) => {
        const data = { ...get().data, bio: [...get().data.bio] }
        data.bio.splice(index, 1)
        set({ data, isDirty: true })
      },
      moveBio: (index, direction) => {
        const data = { ...get().data, bio: [...get().data.bio] }
        const target = direction === 'up' ? index - 1 : index + 1
        if (target < 0 || target >= data.bio.length) return
        ;[data.bio[index], data.bio[target]] = [data.bio[target], data.bio[index]]
        set({ data, isDirty: true })
      },

      updateTechItem: (index, data) => {
        const techStack = [...get().data.techStack]
        techStack[index] = { ...techStack[index], ...data }
        set({ data: { ...get().data, techStack }, isDirty: true })
      },
      addTechItem: (item) => {
        set({ data: { ...get().data, techStack: [...get().data.techStack, item] }, isDirty: true })
      },
      removeTechItem: (index) => {
        const techStack = [...get().data.techStack]
        techStack.splice(index, 1)
        set({ data: { ...get().data, techStack }, isDirty: true })
      },
      moveTechItem: (index, direction) => {
        const techStack = [...get().data.techStack]
        const target = direction === 'up' ? index - 1 : index + 1
        if (target < 0 || target >= techStack.length) return
        ;[techStack[index], techStack[target]] = [techStack[target], techStack[index]]
        set({ data: { ...get().data, techStack }, isDirty: true })
      },

      // AboutSite actions
      updateAboutSiteIntro: (intro) => {
        const data = ensureAboutSite(get().data)
        data.aboutSite.intro = intro
        set({ data, isDirty: true })
      },
      addAboutSiteSection: () => {
        const data = ensureAboutSite(get().data)
        data.aboutSite.sections = [...data.aboutSite.sections, { title: '', items: [] }]
        set({ data, isDirty: true })
      },
      updateAboutSiteSectionTitle: (index, title) => {
        const data = ensureAboutSite(get().data)
        const sections = [...data.aboutSite.sections]
        sections[index] = { ...sections[index], title }
        data.aboutSite.sections = sections
        set({ data, isDirty: true })
      },
      removeAboutSiteSection: (index) => {
        const data = ensureAboutSite(get().data)
        const sections = [...data.aboutSite.sections]
        sections.splice(index, 1)
        data.aboutSite.sections = sections
        set({ data, isDirty: true })
      },
      moveAboutSiteSection: (index, direction) => {
        const data = ensureAboutSite(get().data)
        const sections = [...data.aboutSite.sections]
        const target = direction === 'up' ? index - 1 : index + 1
        if (target < 0 || target >= sections.length) return
        ;[sections[index], sections[target]] = [sections[target], sections[index]]
        data.aboutSite.sections = sections
        set({ data, isDirty: true })
      },
      addAboutSiteItem: (sectionIndex) => {
        const data = ensureAboutSite(get().data)
        const sections = [...data.aboutSite.sections]
        sections[sectionIndex] = { ...sections[sectionIndex], items: [...sections[sectionIndex].items, ''] }
        data.aboutSite.sections = sections
        set({ data, isDirty: true })
      },
      updateAboutSiteItem: (sectionIndex, itemIndex, value) => {
        const data = ensureAboutSite(get().data)
        const sections = [...data.aboutSite.sections]
        const items = [...sections[sectionIndex].items]
        items[itemIndex] = value
        sections[sectionIndex] = { ...sections[sectionIndex], items }
        data.aboutSite.sections = sections
        set({ data, isDirty: true })
      },
      removeAboutSiteItem: (sectionIndex, itemIndex) => {
        const data = ensureAboutSite(get().data)
        const sections = [...data.aboutSite.sections]
        const items = [...sections[sectionIndex].items]
        items.splice(itemIndex, 1)
        sections[sectionIndex] = { ...sections[sectionIndex], items }
        data.aboutSite.sections = sections
        set({ data, isDirty: true })
      },
      moveAboutSiteItem: (sectionIndex, itemIndex, direction) => {
        const data = ensureAboutSite(get().data)
        const sections = [...data.aboutSite.sections]
        const items = [...sections[sectionIndex].items]
        const target = direction === 'up' ? itemIndex - 1 : itemIndex + 1
        if (target < 0 || target >= items.length) return
        ;[items[itemIndex], items[target]] = [items[target], items[itemIndex]]
        sections[sectionIndex] = { ...sections[sectionIndex], items }
        data.aboutSite.sections = sections
        set({ data, isDirty: true })
      },
    }),
    {
      name: 'ryuchan-about-editor',
      partialize: (state) => ({ data: state.data, isDirty: state.isDirty }),
    }
  )
)
