// 评论系统配置类型
export interface GiscusConfig {
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
  mapping?: string;
  lang?: string;
  inputPosition?: string;
  reactionsEnabled?: string;
  emitMetadata?: string;
  loading?: string;
}

export interface WalineConfig {
  serverURL: string;
  lang?: string;
  emoji?: string[];
  meta?: string[];
  requiredMeta?: string[];
  reaction?: boolean;
  pageview?: boolean;
}

export interface CommentsConfig {
  enable: boolean;
  type: 'giscus' | 'waline' | 'none';
  giscus?: GiscusConfig;
  waline?: WalineConfig;
}
export interface SubMenuItem {
  id: string;
  text: string;
  href: string;
  svg: string;
  target: string;
}

export interface MenuItem {
  id: string;
  text: string;
  href: string;
  svg: string;
  target: string;
  subItems?: SubMenuItem[];
}

export interface PageConfig {
  title: string;
  subtitle: string;
  typewriterTexts?: string[]; // 新增打字机文本配置  
}

export interface SocialIcon {
  href: string;
  ariaLabel: string;
  title: string;
  svg: string;
}

export interface BlogConfig {
  pageSize: number;
}

export interface TmdbConfig {
  apiKey: string;
  listId: string;
}

export interface BilibiliConfig {
  uid: string;
}

export interface GithubConfig {
  owner: string;
  repo: string;
  branch: string;
  appId: string;
  encryptKey: string;
}

export interface SiteConfig {
  tab: string;
  title: string;
  description: string;
  language: string;
  favicon: string;
  theme: {
    light: string;
    dark: string;
    code: string;
  };
  meting?: {
    server?: string;
    id?: string;
    br?: string;
    trans?: boolean;
    playlists?: {
      name: string;
      id: string;
    }[];
  };
  date_format: string;
  blog: BlogConfig;
  menu: MenuItem[];
  banner?: {
    images: string[];
    height: string;
    enableRandom?: boolean;
    randomUrl?: string;
    randomCount?: number;
  };
  pages?: {
    [key: string]: PageConfig;
  };
  icp?: string;
  icp_link?: string;
}

export interface UserConfig {
  name: string;
  description?: string;
  site: string;
  avatar: string;
  sidebar: {
    social: SocialIcon[];
  };
  footer: {
    social: SocialIcon[];
  };
}

export interface TranslationLabel {
  noTag: string;
  tagCard: string;
  tagPage: string;
  totalTags: string;
  noCategory: string;
  categoryCard: string;
  categoryPage: string;
  totalCategories: string;
  noPosts: string;
  archivePage: string;
  totalPosts: string;
  link: string;
  prevPage: string;
  nextPage: string;
  wordCount: string;
  readTime: string;
  share: string;
  shareCard: string;
  close: string;
  learnMore: string;
  allTags: string;
  allCategories: string;
  post: string;
  posts: string;
  tagDescription: string;
  categoryDescription: string;
  tagsPageDescription: string;
  categoriesPageDescription: string;
  archivesPageDescription: string;
  backToBlog: string;
}

export interface LanguageTranslation {
  label: TranslationLabel;
}

export interface Translations {
  [language: string]: LanguageTranslation;
}

export interface AnimeConfig {
  bilibili?: BilibiliConfig;
  tmdb?: TmdbConfig;
}

// 导航配置类型
export interface NavItem {
  name: string;
  avatar: string;
  description: string;
  url: string;
  category: string;
  id?: string;
  badge?: string;
  badgeIcon?: string;
  badgeColor?: string;
}

export interface NavCategory {
  title: string;
  icon: string;
  items: NavItem[];
}

export interface NavigationConfig {
  categories: NavCategory[];
}

// 项目配置类型
export interface ProjectItem {
  name: string;
  avatar: string;
  description: string;
  url: string;
  badge?: string;
}

export interface ProjectConfig {
  items: ProjectItem[];
}

// 友链配置类型
export interface FriendItem {
  name: string;
  avatar: string;
  description: string;
  url: string;
  badge?: string;
}

export interface ShowcaseSite {
  name: string;
  url: string;
}

export interface FriendConfig {
  items: FriendItem[];
  sites?: ShowcaseSite[];
}

// 关于页面配置类型
export interface TechStackItem {
  name: string;
  icon: string;
  color?: string;
}

export interface AboutSiteSection {
  title: string;
  items: string[];
}

export interface AboutSiteConfig {
  intro: string;
  sections: AboutSiteSection[];
}

export interface AboutConfig {
  name: string;
  title: string;
  avatar: string;
  bio: string[];
  github: string;
  techStack: TechStackItem[];
  aboutSite?: AboutSiteConfig;
}

import type { UmamiConfig } from "../config";
export interface Config {
  site: SiteConfig;
  user: UserConfig;
  umami?: UmamiConfig;
  comments?: CommentsConfig;
  anime?: AnimeConfig;
  github?: GithubConfig;
  navigation?: NavigationConfig;
  project?: ProjectConfig;
  friend?: FriendConfig;
  about?: AboutConfig;
}