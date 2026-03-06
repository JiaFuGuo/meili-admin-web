# 美丽人生 · 管理后台（网页版）

在浏览器中打开管理后台，功能与小程序内「管理后台」一致：用户列表、线索审核、身份变更审核、黑名单查看，以及超级管理员的设权操作。**登录方式：微信扫码**（使用已具管理员身份的小程序账号扫码确认），无需密钥。

---

## 使用 Vercel 部署（推荐）

在你当前 CloudBase 免费套餐下，无法配置安全域名/跨域/HTTP 触发等能力，因此推荐直接把网页端（页面 + BFF 接口）部署到 Vercel；浏览器访问 Vercel 的同域接口，不会遇到 CORS 问题。

### 前置条件

1. 已部署云函数 **webAuth**。
2. 云数据库已创建集合 **webLoginTickets**。
3. 小程序 **AppID**、**AppSecret**、云开发 **环境 ID**。

### 环境变量（Vercel）

在 Vercel 项目 **Settings → Environment Variables** 中配置：

| 变量名 | 说明 |
|--------|------|
| `WX_APPID` | 小程序 AppID |
| `WX_SECRET` | 小程序 AppSecret |
| `WX_CLOUD_ENV` | 云开发环境 ID（本项目为 `cloudbase-8g3sixud42e06058`） |
| `JWT_SECRET` | 可选，不填则使用 WX_SECRET |

### 部署步骤

1. 将项目或仅 `admin-web` 目录关联到 Vercel。
2. 配置上述环境变量。
3. 部署后访问 `https://你的项目.vercel.app`。此时前端会请求同域下的 `/api/*`（Vercel 的 serverless 接口），扫码登录即可。

### 本地调试

```bash
npm i -g vercel
cd admin-web
vercel dev
```

需配置环境变量（如 `.env.local` 或从 Vercel 拉取）。

---

## 安全说明

- 仅**已在云数据库 users 中具备 admin 或 superAdmin 角色**的微信用户，扫码后才能完成登录。
- 网页端登录态为 JWT，有效期 7 天；请勿将 WX_SECRET、JWT_SECRET 提交到代码库。
