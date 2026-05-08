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

/**
 * Load a specific section from ryuchan.config.yaml
 */
export async function loadConfigSection<T>(section: string): Promise<T> {
  try {
    let token: string | undefined
    try { token = await getAuthToken() } catch { /* public access */ }

    const content = await readTextFileFromRepo(
      token,
      GITHUB_CONFIG.OWNER,
      GITHUB_CONFIG.REPO,
      'ryuchan.config.yaml',
      GITHUB_CONFIG.BRANCH
    )
    if (!content) throw new Error('Config file not found')
    const config = yaml.load(content) as any
    return (config?.[section] ?? (section === 'about' ? {} : [])) as T
  } catch (error: any) {
    throw new Error(`Failed to load ${section} config: ` + error.message)
  }
}

/**
 * Save a specific section of ryuchan.config.yaml via GitHub API.
 * Re-reads the latest config, replaces the section, and commits.
 */
export async function saveConfigSection<T>(
  section: string,
  data: T,
  onProgress?: (msg: string) => void
): Promise<void> {
  const token = await getAuthToken()
  if (!token) throw new Error('未授权 - 请先导入私钥验证身份')

  // 1. Re-read the latest config
  onProgress?.('正在获取最新配置...')
  const currentContent = await readTextFileFromRepo(
    token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO,
    'ryuchan.config.yaml', GITHUB_CONFIG.BRANCH
  )
  if (!currentContent) throw new Error('Config file not found')

  // 2. Parse and replace the section
  const config = yaml.load(currentContent) as any
  config[section] = data

  // 3. Dump back to YAML
  const newContent = yaml.dump(config)
  const configBase64 = toBase64Utf8(newContent)

  // 4. Create blob
  onProgress?.('正在创建配置...')
  const { sha: configSha } = await createBlob(
    token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, configBase64, 'base64'
  )

  const treeItems: TreeItem[] = [{
    path: 'ryuchan.config.yaml', mode: '100644', type: 'blob', sha: configSha,
  }]

  // 5. Get current ref and base tree
  onProgress?.('正在获取分支信息...')
  const refName = `heads/${GITHUB_CONFIG.BRANCH}`
  const ref = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, refName)
  const commit = await getCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, ref.sha)
  const baseTreeSha = commit.tree.sha

  // 6. Create new tree
  onProgress?.('正在构建文件树...')
  const { sha: newTreeSha } = await createTree(
    token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, treeItems, baseTreeSha
  )

  // 7. Create commit
  onProgress?.('正在创建提交...')
  const { sha: newCommitSha } = await createCommit(
    token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO,
    `chore(${section}): update ${section} configuration`,
    newTreeSha, [ref.sha]
  )

  // 8. Update ref
  onProgress?.('正在推送...')
  await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, refName, newCommitSha)
}
