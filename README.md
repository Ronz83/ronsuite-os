# RonSuite OS

Internal AI command center for Novelty Web Solutions (NWS). Multi-agent orchestration platform with autonomous task execution, semantic memory, and push notifications.

## Architecture

| Pillar | Technology | Role |
|--------|-----------|------|
| 🧠 The Architect | Antigravity | Strategic planning, code engineering, orchestration |
| ⚡ The Operator | Hermes Agent | Autonomous execution, 24/7 operations |
| 🔧 The Engine | Gemma 4 | Cost-free local inference (when deployed) |
| 🌐 The Bridge | ngrok | Development tunneling, webhook delivery |

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19
- **Styling:** Tailwind CSS v4 + Metallic UI design system
- **Database:** Self-hosted Supabase (db.noveltywebsolutions.com)
- **AI:** OpenRouter (multi-model), OpenAI (embeddings)
- **Deployment:** Dokploy (Docker Swarm + Traefik) on Hetzner

## Pages

| Page | Purpose |
|------|---------|
| `/dashboard` | Agent status, project cards, quick actions |
| `/hermes` | Head Master AI chat interface |
| `/board` | Operations task board |
| `/memory` | Brain/memory viewer and search |
| `/settings` | Configuration |

## Getting Started

```bash
cp .env.example .env.local  # Fill in your API keys
npm install
npm run dev
```

## Deployment

Deployed via Dokploy on Hetzner infrastructure. Push to `main` triggers auto-deploy.
