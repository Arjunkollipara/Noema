# Noema

A living knowledge graph for personal learning.

Noema maps how you personally understood things — not what a textbook says,
but the path you took, the connections you made, and the understanding you built.
Nodes grow brighter when revisited and fade when forgotten, mirroring how memory works.

## Stack

- **Frontend:** React + Vite + D3
- **Backend:** Node.js + Express
- **Database:** MySQL 8.0
- **Cache:** Redis
- **Vector store:** Qdrant
- **LLM:** Groq (free tier) / Ollama (local)
- **Infrastructure:** Docker, Nginx, GitHub Actions

## Running locally

1. Clone the repo
2. Copy `.env.example` to `.env` and fill in your `GROQ_API_KEY`
   (free at https://console.groq.com)
3. Run `docker compose up --build`
4. Open http://localhost

## Architecture

Six Docker services orchestrated by Compose, proxied through Nginx.
See `/docker` for Dockerfiles and `/nginx` for proxy config.

## Status

Active development. Sprint 5 in progress.

---

*Conceived by Arjun Kollipara, 2026*