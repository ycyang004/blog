import { getAuthToken } from '@/lib/auth'
import { GITHUB_CONFIG } from '@/consts'
import {
  readTextFileFromRepo,
  toBase64Utf8,
  createBlob,
  createTree,
  createCommit,
  updateRef,
  getRef,
  getCommit,
  type TreeItem,
} from '@/lib/github-client'
import yaml from 'js-yaml'
import type { NavCategory } from '@interfaces/site'

/**
 * Load the full ryuchan.config.yaml from the repo and extract navigation section
 */
export async function loadNavigationConfig(): Promise<NavCategory[]> {
  try {
    let token: string | undefined
    try {
      token = await getAuthToken()
    } catch {
      // Try public access
    }

    const content = await readTextFileFromRepo(
      token,
      GITHUB_CONFIG.OWNER,
      GITHUB_CONFIG.REPO,
      'ryuchan.config.yaml',
      GITHUB_CONFIG.BRANCH
    )

    if (!content) {
      throw new Error('Config file not found')
    }

    const config = yaml.load(content) as any
    return config?.navigation?.categories ?? []
  } catch (error: any) {
    throw new Error('Failed to load navigation config: ' + error.message)
  }
}

/**
 * Save navigation categories by updating the navigation section in ryuchan.config.yaml
 * This re-reads the latest config, replaces the navigation section, and commits via Git API.
 */
export async function saveNavigationConfig(
  categories: NavCategory[],
  onProgress?: (msg: string) => void
): Promise<void> {
  const token = await getAuthToken()
  if (!token) throw new Error('未授权 - 请先导入私钥验证身份')

  // 1. Re-read the latest config from GitHub to avoid conflicts
  onProgress?.('正在获取最新配置...')
  const currentContent = await readTextFileFromRepo(
    token,
    GITHUB_CONFIG.OWNER,
    GITHUB_CONFIG.REPO,
    'ryuchan.config.yaml',
    GITHUB_CONFIG.BRANCH
  )

  if (!currentContent) throw new Error('Config file not found')

  // 2. Parse the config and replace the navigation section
  const config = yaml.load(currentContent) as any
  config.navigation = { categories }

  // 3. Dump back to YAML string
  const newContent = yaml.dump(config)

  // 4. Create blob for the config file
  onProgress?.('正在创建配置...')
  const configBase64 = toBase64Utf8(newContent)
  const { sha: configSha } = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, configBase64, 'base64')

  const treeItems: TreeItem[] = [
    {
      path: 'ryuchan.config.yaml',
      mode: '100644',
      type: 'blob',
      sha: configSha,
    },
  ]

  // 5. Get current ref and base tree
  onProgress?.('正在获取分支信息...')
  const refName = `heads/${GITHUB_CONFIG.BRANCH}`
  const ref = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, refName)
  const commit = await getCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, ref.sha)
  const baseTreeSha = commit.tree.sha

  // 6. Create new tree
  onProgress?.('正在构建文件树...')
  const { sha: newTreeSha } = await createTree(
    token,
    GITHUB_CONFIG.OWNER,
    GITHUB_CONFIG.REPO,
    treeItems,
    baseTreeSha
  )

  // 7. Create commit
  onProgress?.('正在创建提交...')
  const { sha: newCommitSha } = await createCommit(
    token,
    GITHUB_CONFIG.OWNER,
    GITHUB_CONFIG.REPO,
    'chore(navigation): update navigation configuration',
    newTreeSha,
    [ref.sha]
  )

  // 8. Update ref
  onProgress?.('正在推送...')
  await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, refName, newCommitSha)
}
