# Deploy RFP Analyzer Pro

## ⚡ One-Click Deploy to Vercel

Click the button below — Vercel will fork the repo, build, and give you a live URL in ~60 seconds:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FYOUR_GITHUB_USERNAME%2Frfp-analyzer-pro&project-name=rfp-analyzer-pro&repository-name=rfp-analyzer-pro&build-command=npm+run+build&install-command=npm+install+--legacy-peer-deps&output-directory=.next)

> **Replace `YOUR_GITHUB_USERNAME`** with your GitHub handle after pushing the repo (see Step 1 below).

---

## Step-by-Step (5 minutes total)

### 1. Push to GitHub

```bash
cd rfp-analyzer-pro
git init
git add .
git commit -m "chore: initial production build"
gh repo create rfp-analyzer-pro --public --push
```

> **No GitHub CLI?** Create the repo at https://github.com/new, then:
> ```bash
> git remote add origin https://github.com/YOUR_USERNAME/rfp-analyzer-pro.git
> git push -u origin main
> ```

### 2. Deploy to Vercel (one click)

1. Go to https://vercel.com/new
2. Click **"Import Git Repository"**
3. Select **rfp-analyzer-pro**
4. Vercel auto-detects Next.js — just click **Deploy**

**Or** use the Vercel CLI:

```bash
npm i -g vercel
vercel --prod
```

### 3. Your live URL

Vercel assigns a URL like:

```
https://rfp-analyzer-pro.vercel.app
```

Subsequent `git push` to `main` triggers an automatic redeploy.

---

## Environment Variables (optional)

| Variable | Purpose | Required? |
|---|---|---|
| `OPENAI_API_KEY` | Real LLM document parsing | No (demo mode works without it) |
| `NEXT_PUBLIC_APP_URL` | OG / metadata base URL | No |

Set them in **Vercel Dashboard → Settings → Environment Variables** or via:

```bash
vercel env add OPENAI_API_KEY
```

---

## Build Health

| Check | Status |
|---|---|
| `npm run build` | ✅ Passes |
| TypeScript | ✅ 0 errors |
| ESLint | ✅ 0 errors (69 warnings — unused imports, not blockers) |
| Bundle | ✅ Static `/` + 3 dynamic API routes |

---

## Alternative Platforms

| Platform | Command / Link |
|---|---|
| **Netlify** | `netlify deploy --prod --dir .next` |
| **Railway** | https://railway.app/new → Import from GitHub |
| **Render** | https://render.com/deploy → New Web Service → GitHub |
| **Docker** | See below |

### Docker (self-hosted)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install --legacy-peer-deps && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t rfp-analyzer-pro .
docker run -p 3000:3000 rfp-analyzer-pro
```
