# SnapLink — 阅后即焚链接分享

私密链接分享平台：输入文本生成一次性链接，支持**最大查看次数**与**过期时间**，到期或达到次数后内容自动销毁，数据不可恢复。

## 功能

- 📝 输入文本生成专属链接
- 🔢 最大查看次数（1 / 3 / 5 / 10 / 20 / 50 次）
- ⏱️ 过期时间（5 分钟 / 1 小时 / 1 天 / 永不过期）
- 🔗 访问链接时展示剩余次数与倒计时
- 📊 用尽或过期后数据从数据库彻底删除
- 🌐 中英文切换

## 技术栈

| 类型   | 技术                               |
| ------ | ---------------------------------- |
| 框架   | Next.js 14 (App Router)            |
| 样式   | Tailwind CSS                       |
| 数据库 | PostgreSQL（Neon / 任意 Postgres） |
| 部署   | Vercel                             |

## 本地运行

```bash
# 克隆
git clone <repo-url>
cd SnapLink

# 安装依赖
npm install

# 配置环境变量（见下方）
cp .env.example .env.local
# 编辑 .env.local，填入 POSTGRES_URL 或 DATABASE_URL

# 启动
npm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000)。

## 环境变量

| 变量                             | 说明                                    |
| -------------------------------- | --------------------------------------- |
| `POSTGRES_URL` 或 `DATABASE_URL` | Postgres 连接串（必填，否则应用会报错） |

示例（Neon）：

```
POSTGRES_URL=postgresql://user:password@host/verceldb?sslmode=require
```

本地开发使用 `.env.development.local`，部署到 Vercel 时在项目 **Settings → Environment Variables** 中配置同名变量。

## 数据库

- 使用 **Neon** 或任意 Postgres 均可。
- 表名：`links`，首次创建链接或访问 `/api/status` 时会自动建表。
- 在 Neon Console 中选对 **Branch** 和 **数据库名**（如 `verceldb`），在 SQL Editor 执行 `SELECT * FROM public.links;` 可查看数据。

## 部署到 Vercel

1. 将仓库推送到 GitHub，在 [Vercel](https://vercel.com/new) 导入项目。
2. 在 **Settings → Environment Variables** 添加 `POSTGRES_URL` 或 `DATABASE_URL`。
3. **Build & Development Settings** 中 **Output Directory** 留空（Next.js 无需填写）。
4. 部署完成后，在 Vercel 项目里配置的数据库连接会生效。

## 项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── links/           # POST 创建链接
│   │   │   ├── [id]/        # GET 查看并消耗一次 / meta 取剩余次数
│   │   │   └── count/       # GET 当前库 links 条数（排查用）
│   │   ├── status/          # GET 数据库连接状态
│   │   └── debug-db/        # GET 当前连接的库名/host（排查用）
│   ├── v/[id]/              # 查看页：剩余次数、倒计时、查看内容
│   ├── layout.tsx
│   ├── page.tsx             # 首页：创建链接
│   └── globals.css
├── components/
│   ├── LangProvider.tsx     # 中/英切换
│   └── DonateModal.tsx      # 打赏弹窗
└── lib/
    ├── db.ts                # Postgres 连接与 links 表读写
    ├── donate-config.ts     # 打赏链接/收款码配置
    └── messages.ts          # 中英文文案
```

## 打赏

首页页脚有「打赏」入口，点击后弹出打赏弹窗。在 `src/lib/donate-config.ts` 中配置：

- `afdian`：爱发电链接（填写后显示「前往打赏」按钮）
- `wechatTipImage`：微信赞赏码图片 URL
- `alipayTipImage`：支付宝收款码图片 URL
- `other`：其他打赏链接（如 Ko-fi）

留空则不显示对应入口；全部留空时弹窗会提示「请在 donate-config.ts 中配置」。

## 脚本

| 命令            | 说明             |
| --------------- | ---------------- |
| `npm run dev`   | 本地开发         |
| `npm run build` | 生产构建         |
| `npm run start` | 本地运行生产构建 |
| `npm run lint`  | 运行 ESLint      |

## License

MIT
