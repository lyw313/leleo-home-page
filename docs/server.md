# 后端说明（leleo-server）

## 技术栈

- Node.js + Express
- PostgreSQL + Prisma（宝塔生产推荐）
- 本地无数据库时可 `FORCE_JSON_STORE=1`，数据写在 `server/data/*.json`

## 本地启动

```bash
# 终端 1：API
cd server
cp .env.example .env   # 首次
# 编辑 .env：本地可保留 FORCE_JSON_STORE=1
npm install
npm run dev            # http://localhost:8787

# 终端 2：前端（已代理 /api → 8787）
npm run dev            # http://localhost:5173
```

## 接 PostgreSQL

1. 宝塔或 Docker 安装 PG：`docker compose up -d`
2. `.env` 填写 `DATABASE_URL`，去掉 `FORCE_JSON_STORE`
3. `cd server && npx prisma db push && npx prisma generate`
4. `npm run start`

## 主要接口

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/health` | 否 | 存活 |
| POST | `/api/auth/login` | 否 | `{ password }` |
| POST | `/api/auth/logout` | Cookie | 退出 |
| GET | `/api/auth/me` | Cookie | 是否管理员 |
| GET/PUT | `/api/blog` | PUT 需登录 | `{ posts, folders }` |
| GET/PUT | `/api/planner` | PUT 需登录 | 计划本 |
| GET/PUT | `/api/world` | PUT 需登录 | 我的世界 |
| GET/PUT | `/api/profile` | PUT 需登录 | 个人资料 |
| POST | `/api/uploads` | 登录 | multipart `file` |

管理员密码：环境变量 `ADMIN_PASSWORD`（不要再依赖前端 `config.js` 明文作为唯一校验；迁移期前端仍可本地兜底）。
