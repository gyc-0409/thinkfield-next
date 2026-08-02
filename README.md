# 思辨场 (ThinkField)

面向本科生的教材讨论平台，支持文学和理学两类书籍，核心功能包括章节讨论、习题解答、LaTeX 公式渲染、用户投稿和管理员审核。

## 技术栈

- **前端**：Next.js 16 + React 19 + Tailwind CSS v4 + KaTeX
- **后端**：Next.js API Routes + iron-session + pg（直连 PostgreSQL）
- **外部服务**：Resend（邮箱验证码）
- **部署**：Railway

## 本地开发

### 1. 环境要求

- Node.js 20+
- PostgreSQL 数据库

### 2. 克隆并安装依赖

```bash
git clone <你的仓库地址>
cd thinkfield-next
npm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env.local`，填入实际值：

```bash
cp .env.example .env.local
```

| 变量 | 必须 | 说明 |
|------|------|------|
| `DATABASE_URL` | 是 | PostgreSQL 连接字符串 |
| `SESSION_PASSWORD` | 是 | 32 位以上随机字符串，用于加密 session cookie |
| `RESEND_API_KEY` | 注册时需要 | Resend 邮件 API 密钥 |
| `NODE_ENV` | 建议 | 本地设为 `development`，生产设为 `production` |

### 4. 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## Railway 部署

### 1. 创建服务

1. 在 Railway 创建 Web Service，连接本仓库
2. 添加 PostgreSQL 插件，并在 Web Service 中 **Link** 该数据库（自动生成 `DATABASE_URL`）

### 2. 配置 Variables

在 Web Service → **Variables** 中添加：

| 变量 | 必须 | 说明 |
|------|------|------|
| `DATABASE_URL` | 是 | Link PostgreSQL 后自动生成；手动复制时用 Private Network URL |
| `SESSION_PASSWORD` | 是 | 32 位以上随机字符串 |
| `NODE_ENV` | 建议 | 设为 `production` |
| `RESEND_API_KEY` | 注册时需要 | Resend 邮件 API 密钥 |

### 3. 诊断数据加载问题

部署后访问以下 URL 检查状态（将 `你的域名` 替换为 Railway 分配的地址）：

```
https://你的域名/api/test
https://你的域名/api/books/hot
https://你的域名/api/books?type=literature
```

| 结果 | 含义 |
|------|------|
| `/api/test` 返回 `{"success":true,"time":"..."}` | 数据库连接正常 |
| `/api/books/hot` 返回 JSON 数组 | 核心表可读，数据正常 |
| 返回 `{"error":"..."}` 500 | 查看 Deploy Logs 中的错误信息 |
| `relation "books" does not exist` | 连到了空库，需重新 Link 正确数据库或导入数据 |

Deploy Logs 中搜索 `[DB] 连接失败` 或 `缺少环境变量`。

## 常用命令

```bash
npm run dev    # 开发
npm run build  # 构建
npm run start  # 生产启动
npm run lint   # 代码检查
```
