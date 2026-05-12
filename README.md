# Noema

*A living knowledge graph for human learning.*

Noema captures how *you* came to understand something — not the polished version from a textbook, but the evolving mental map you built through curiosity, repetition, confusion, and insight.

Ideas become interconnected nodes in a personal knowledge graph. As concepts are revisited, they strengthen and glow brighter; when neglected, they gradually fade, reflecting the way memory naturally reinforces and decays over time.

Instead of storing information as static notes, Noema models learning as a living system:
dynamic, associative, and deeply personal.

## Core Idea

Most knowledge systems optimize for storage.
Noema optimizes for understanding.

It tracks:

* the paths between ideas
* the concepts that reinforced each other
* the moments where understanding shifted
* the patterns of recall and forgetting over time

The result is a graph that evolves alongside your thinking.

## Stack

* **Frontend:** React, Vite, D3
* **Backend:** Node.js, Express
* **Database:** MySQL 8.0
* **Cache Layer:** Redis
* **Vector Store:** Qdrant
* **LLM Integration:** Groq (cloud) / Ollama (local)
* **Infrastructure:** Docker, Nginx, GitHub Actions

## Running Locally

```bash
git clone <repo-url>
cd noema
cp .env.example .env
```

Add your `GROQ_API_KEY` to `.env`
(free keys available via [Groq Console](https://console.groq.com?utm_source=chatgpt.com))

Then start the stack:

```bash
docker compose up --build
```

Open:

```text
http://localhost
```

## Architecture

Noema runs as a distributed local stack composed of six Docker services orchestrated through Docker Compose and routed through Nginx.

* `/docker` → container definitions
* `/nginx` → reverse proxy configuration

The system is designed to support both cloud-hosted and fully local AI workflows.

## Status

Currently in active development.
Sprint 5 is focused on graph evolution, memory decay mechanics, and semantic retrieval.


Knowledge is not collected here — it is cultivated, reinforced, and remembered.
---

*Conceived and built by Arjun Kollipara — 2026*
