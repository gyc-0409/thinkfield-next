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