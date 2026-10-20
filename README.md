# 晨的博客

> Ciallo～(∠・ω<)⌒★

你好，我是晨，一名全栈开发者与开源爱好者。这里是我的个人博客，记录技术实践、数据分析、建站折腾与生活中的灵感。

[个人博客](https://blog.lamby.de5.net/) ·
[GitHub](https://github.com/ycyang004) ·
[RSS](https://blog.lamby.de5.net/rss.xml)

## 关于我

- 专注于前端开发、用户体验设计与全栈应用实践
- 喜欢探索新技术，也享受用代码解决实际问题
- 持续维护自己的博客、图床、生图工作台与内网服务
- 相信开源、分享和长期积累的价值

## 博客功能

- **Astro 静态站点**：快速加载、响应式布局与良好的 SEO 基础
- **文章系统**：分类、标签、归档、阅读时长、目录、RSS 与站点地图
- **全文搜索**：使用 Pagefind 生成本地搜索索引
- **音乐播放器**：支持网易云歌单切换、歌词与译文显示
- **匿名点赞**：基于 Supabase 保存点赞状态，无需登录
- **登录评论**：评论公开可见，登录后可发布和删除自己的评论
- **邮箱限制**：注册仅允许 QQ 邮箱和 Gmail 邮箱
- **个性化资料**：支持自定义称号、头像光效和称号光效
- **在线配置**：通过 GitHub App 在浏览器中维护站点和音乐配置
- **自动部署**：代码提交后由 Vercel 自动构建和发布

## 我的项目

| 项目 | 说明 | 地址 |
| --- | --- | --- |
| 晨的博客 | 使用 Astro 构建的个人站点 | [blog.lamby.de5.net](https://blog.lamby.de5.net/) |
| 图床 | 基于 Cloudflare Pages 的图片托管服务 | [img.lamby.de5.net](https://img.lamby.de5.net/) |
| CreatePicture | 基于云端模型 API 的 AI 生图工作台 | [draw.lamby.de5.net](https://draw.lamby.de5.net/) |
| OpenList | 个人文件与资源管理入口 | [openlist.lamby.de5.net](https://openlist.lamby.de5.net/) |
| 域名邮箱 | 自建域名邮箱服务 | [email.yycc.de5.net](https://email.yycc.de5.net/) |

> `draw.lamby.de5.net` 运行在本机服务上，通过 Cloudflare Tunnel 对外提供访问。

## 技术栈

- **前端**：Astro、React、Vue、TypeScript、JavaScript、Tailwind CSS、daisyUI
- **后端与服务**：Node.js、Nitro、Supabase、Cloudflare Pages、Cloudflare Tunnel
- **工具与部署**：Git、GitHub、Vercel、Docker、Python

## 本地运行

环境要求：

- Node.js `22.12+`
- pnpm

```bash
pnpm install
pnpm dev
```

开发地址默认为 `http://localhost:4321/`。

常用命令：

```bash
pnpm check   # Astro 类型检查
pnpm build   # 类型检查、生产构建与搜索索引
pnpm preview # 本地预览生产构建
```

## 环境变量

将 `.env.example` 复制为 `.env`，按需填写以下配置：

```dotenv
PUBLIC_GITHUB_OWNER=ycyang004
PUBLIC_GITHUB_REPO=blog
PUBLIC_GITHUB_BRANCH=main
PUBLIC_GITHUB_APP_ID=

PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

点赞接口还需要在部署平台配置服务端变量：

```dotenv
SUPABASE_URL=
SUPABASE_SECRET_KEY=
```

`SUPABASE_SECRET_KEY` 只能保存在 Vercel 等服务端环境中，不要提交到仓库或暴露给浏览器。

## 项目结构

```text
.
├─ api/                    # Vercel 服务端接口
├─ public/                 # 静态资源
├─ src/
│  ├─ components/          # Astro 与 React 组件
│  ├─ content/blog/        # Markdown 文章
│  ├─ layouts/             # 页面布局
│  ├─ pages/               # 路由页面
│  ├─ styles/              # 全局样式
│  └─ config.ts            # 站点配置加载
├─ ryuchan.config.yaml     # 博客主配置
└─ vercel.json             # 部署与安全响应头
```

## 部署

站点使用 Vercel 自动部署：

1. 推送代码到 GitHub `main` 分支
2. Vercel 自动执行生产构建
3. 博客通过 `https://blog.lamby.de5.net` 访问

配置页位于 `/config/`，保存配置前需要导入 GitHub App 私钥。文章编辑器位于 `/write/`。

## 致谢与许可

本项目基于 [RyuChan](https://github.com/kobaridev/RyuChan) 进行个人化改造，感谢原模板作者与相关开源项目。

本项目采用 [MIT License](./LICENSE)。
