# 🎯 AI 面试助手 (Interview Agent)

一个模拟真实面试场景的全栈 Web 应用：**刷题 + AI 面试官 + 语音对话**，自适应 PC 和手机端。

## ✨ 功能

- **用户共建题库**：注册用户默认可加题，题目默认私有；设为公开后进入「题库广场」供所有人查看、点赞、拉取。
- **题库广场**：公开题按热度排序（管理员手动值 + 被拉取 + 点赞 + 浏览综合计算），方向 / 难度筛选。
- **拉取成为自己的**：把广场上的公开题复制一份到自己的题库，独立存在，原作者删题不影响副本。
- **智能刷题**：写下答案后对照参考答案，AI 当场点评打分。
- **模拟面试**：AI 扮演面试官，按目标岗位和级别逐轮提问、顺着回答追问，结束后给出结构化总评和评分。
- **语音对话**：支持语音作答（语音转文字）和面试官语音播报，更接近真实面试；不支持的浏览器自动退回文字输入。
- **记录回看**：练习与面试记录自动保存，随时回看 AI 反馈与评分。
- **权限与管理后台**：管理员可开关某用户的加题权限、下架公开题、调整题目热度。
- **响应式**：移动优先布局，手机和电脑都好用。

## 🛠 技术栈

| 维度 | 技术 |
|------|------|
| 框架 | Next.js 15 (App Router) + React 19 + TypeScript |
| 样式 | Tailwind CSS |
| 数据库 | Prisma + SQLite（开发）|
| 认证 | bcryptjs 密码哈希 + jose 签 JWT，httpOnly cookie |
| AI | DeepSeek（OpenAI 兼容接口），服务端代理 + 流式返回 |
| 语音 | 浏览器内置 Web Speech API（STT + TTS）|

## 🚀 本地运行

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env.local`，并填入你的配置：

```bash
cp .env.example .env.local
```

`.env.local` 内容：

```env
DEEPSEEK_API_KEY=sk-你的真实key      # 必填，AI 功能依赖它
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
JWT_SECRET=换成一段足够长的随机字符串
ADMIN_EMAIL=admin@example.com         # 用该邮箱注册即自动成为管理员
DATABASE_URL="file:./dev.db"
```

> **如何获取 DeepSeek API key**：访问 [platform.deepseek.com](https://platform.deepseek.com) 注册 → 创建 API Key → 充值少量额度（很便宜）。
> 没有 key 时应用仍可运行，但 AI 点评 / 面试功能会提示「未配置 key」。

> Prisma CLI 只读 `.env`，所以仓库里另有一个 `.env`（仅含 `DATABASE_URL`，已被 git 忽略）。

### 3. 初始化数据库并写入题库

```bash
npx prisma db push      # 创建表
npm run db:seed         # 写入起步题库（归属「官方题库」系统用户、默认公开）
```

### 4. 启动

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)，注册账号即可开始。

> **设置管理员**：用 `.env.local` 里 `ADMIN_EMAIL` 指定的邮箱注册，注册后即自动成为管理员；也可对已注册账号执行 `npm run set-admin <email>` 随时提升。管理员可进入 `/admin` 管理用户加题权限和公开题。

## 📜 常用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产构建 |
| `npm run start` | 启动生产服务 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run db:push` | 同步 schema 到数据库 |
| `npm run db:seed` | 写入种子题库 |
| `npm run set-admin <email>` | 把指定邮箱的已注册用户提升为管理员 |

## ☁️ 部署上线

> ⚠️ 本应用含数据库和服务端逻辑，**不能用 GitHub Pages** 部署（Pages 只能托管纯静态站点）。

推荐用 **Vercel**：

1. 把仓库导入 [Vercel](https://vercel.com)。
2. 在 Vercel 项目设置里配置环境变量（`DEEPSEEK_API_KEY`、`JWT_SECRET` 等）。
3. **生产环境把数据库从 SQLite 换成 Postgres**（如 Vercel Postgres / Neon / Supabase）：
   - 修改 `prisma/schema.prisma` 中 `datasource db` 的 `provider = "postgresql"`；
   - 把 `DATABASE_URL` 设为 Postgres 连接串；
   - 重新 `prisma db push` 并 seed。

> SQLite 是单文件数据库，不适合 Serverless 多实例的生产环境，因此上线务必切换到 Postgres。

## 🔒 安全说明

- DeepSeek API key 只在服务端使用，绝不下发到浏览器。
- 密码用 bcrypt 哈希存储；会话用 JWT 签名并存 httpOnly cookie。
- 所有涉及用户数据 / 调用大模型的接口都强制鉴权。
- `.env`、`.env.local`、`prisma/*.db` 均已被 git 忽略，不会入库。

## 📁 目录结构

```
src/
├── app/
│   ├── page.tsx                    落地页
│   ├── login / register            登录注册
│   ├── practice/                   我的题库列表 / 新建 / 单题练习 / 编辑
│   ├── explore/                    题库广场（公开题按热度排序）
│   ├── admin/                      管理后台（用户权限 / 公开题管理）
│   ├── interview/                  面试启动 & 对话页
│   ├── history/                    记录回看
│   └── api/
│       ├── auth/                   注册 / 登录 / 登出
│       ├── questions/              建题 / 改删 / 点赞 / 拉取
│       ├── admin/                  用户权限 / 公开题下架与热度
│       ├── practice/               刷题点评
│       └── interview/              面试对话(流式) / 总评
├── components/                     Navbar / 表单 / 题目操作 / 聊天 / 语音 hooks 等
├── lib/                            db / auth / session / deepseek / prompts / heat / directions
└── middleware.ts                   路由鉴权（仅校验登录态，不引入 Prisma）
prisma/
├── schema.prisma                   数据模型（User / Question / Like / View / 记录）
└── seed.ts                         种子题库
scripts/
└── set-admin.ts                    提升管理员脚本
```
