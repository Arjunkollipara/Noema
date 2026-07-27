# Noema

> **A living knowledge graph that models how understanding evolves.**
>
> Noema doesn't store what you know.
> It models **how you came to know it.**

---

## Why Noema?

Most learning systems optimize for **remembering information**.

Noema optimizes for **building understanding**.

Traditional note-taking apps treat knowledge as static documents.
Flashcards treat learning as isolated facts.
Chatbots answer questions and immediately forget the conversation.

Human learning doesn't work that way.

Understanding grows gradually.
Ideas reinforce one another.
Misconceptions collapse together before they separate.
Old beliefs are rewritten by new experiences.

Noema is built around that process.

Instead of organizing information into folders or pages, every concept becomes a node inside a continuously evolving knowledge graph that reflects your own mental model.

The graph changes as you learn.

---

## Core Philosophy

Learning is not accumulation.

Learning is reconstruction.

Every conversation should leave the learner with a slightly different internal model than before.

Noema therefore models learning as an evolving system instead of a transcript.

Each concept remembers:

- how your understanding has evolved
- the misconceptions you held
- the questions that moved you forward
- which concepts reinforced one another
- what remains unresolved
- how confident your understanding appears to be

Instead of storing conversations, Noema stores conceptual change.

---

# Features

## Living Knowledge Graph

Every concept becomes a node.

Relationships emerge naturally as ideas connect through learning instead of manual organization.

The graph continuously reorganizes itself as your understanding grows.

---

## Socratic Teaching

Instead of giving immediate answers, Noema teaches by asking questions.

The system attempts to discover

- what you already understand
- where misconceptions exist
- what assumption is missing
- what question would produce the next insight

The objective is not correctness.

The objective is understanding.

---

## Persistent Conceptual Memory

Unlike ordinary chatbots, Noema remembers concepts—not conversations.

Each node maintains a persistent evolving internal state including

- conceptual summary
- understanding frontier
- misconceptions
- confidence
- learning history

As your understanding changes, the node changes.

---

## Concept Evolution

Nodes improve over time.

Background synthesis continuously rewrites concept summaries by integrating new understanding from later conversations.

Older explanations become richer instead of simply growing longer.

---

## Memory Decay

Understanding weakens when neglected.

Nodes naturally decay according to configurable forgetting curves inspired by cognitive psychology.

Frequently revisited concepts strengthen.

Forgotten concepts slowly fade toward the graph's edges.

The visualization reflects memory rather than chronology.

---

## Frontier Discovery

Whenever Noema detects a missing dependency, it proposes a new concept to explore.

Learning therefore expands naturally instead of requiring manual planning.

Example

```
Transformer
    ↓
Attention Mechanism
    ↓
Query / Key / Value
    ↓
Dot Product Similarity
    ↓
Vector Spaces
```

The graph grows through curiosity.

---

## Graph Visualization

The graph is designed to represent understanding rather than storage.

Visual properties communicate learning state.

- Brighter nodes represent stronger understanding
- Faded nodes indicate decayed memory
- Stronger relationships appear thicker
- Central concepts naturally migrate inward
- Weak concepts drift toward the perimeter

The visualization is intended to become a map of the learner's mind.

---

# Architecture

Noema is organized into independent services.

```
                        +-------------------+
                        |     React UI      |
                        +---------+---------+
                                  |
                                  |
                          Nginx Reverse Proxy
                                  |
      -------------------------------------------------------
      |                      |                     |
      |                      |                     |
+-------------+      +----------------+    +---------------+
|   Express   |----->|     MySQL      |    |     Redis     |
|   Backend   |      | Knowledge Graph|    | Cache/Queues  |
+------+------+      +----------------+    +---------------+
       |
       |
       +--------------------------+
                                  |
                           +--------------+
                           |    Qdrant    |
                           | Vector Store |
                           +--------------+
                                  |
                           Embeddings / Search
                                  |
                      Groq API or Local Ollama
```

---

# Technology Stack

## Frontend

- React
- Vite
- D3.js

---

## Backend

- Node.js
- Express

---

## Storage

- MySQL
- Redis
- Qdrant Vector Database

---

## AI

Supports both cloud and local inference.

### Cloud

- Groq

### Local

- Ollama

Switch providers using environment variables.

---

# Repository Structure

```
noema/

├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── db/
│   │   ├── memory/
│   │   └── graph/
│   │
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   ├── components/
│   └── assets/
│
├── nginx/
│
├── docker/
│
├── docker-compose.yml
│
└── README.md
```

---

# Running Locally

Clone the repository.

```bash
git clone https://github.com/Arjunkollipara/Noema.git

cd noema
```

Create an environment file.

```bash
cp .env.example .env
```

Configure your LLM provider.

```env
GROQ_API_KEY=your_api_key

LLM_PROVIDER=groq
```

or

```env
LLM_PROVIDER=ollama

OLLAMA_MODEL=llama3
```

Start the complete stack.

```bash
docker compose up --build
```

Open

```
http://localhost
```

---

# Development

Backend

```bash
cd backend

npm install

npm run dev
```

Frontend

```bash
cd frontend

npm install

npm run dev
```

---

# Current Research

Current development focuses on making Noema model understanding instead of conversations.

Recent work includes

- Persistent Conceptual Continuity (MVI)
- Background Concept Synthesis
- Memory Decay
- Frontier Generation
- Knowledge Graph Evolution

Future work includes

- Digital Self
- Thinking Fingerprint
- Learning Style Modeling
- Misconception Detection
- Adaptive Socratic Question Generation
- Cross-domain Concept Transfer
- Graph-based Reasoning

---

# Design Principles

Noema is built around several guiding ideas.

- Understanding is more valuable than memorization.
- Knowledge is relational.
- Conversations should permanently improve the learner.
- Concepts should evolve instead of accumulating history.
- The graph should represent cognition rather than files.

---

# Roadmap

- [x] Interactive knowledge graph
- [x] Socratic tutoring
- [x] Persistent concept memory
- [x] Background synthesis worker
- [x] Memory decay engine
- [x] Frontier generation
- [ ] Thinking fingerprint
- [ ] Digital Self
- [ ] Personalized pedagogy
- [ ] Cross-concept reasoning
- [ ] Multi-user collaborative learning

---

# Inspiration

Noema draws inspiration from work across several disciplines.

- Constructivist Learning Theory
- Socratic Dialogue
- Knowledge Graphs
- Cognitive Psychology
- Human Memory Research
- Large Language Models
- Spaced Repetition
- Semantic Networks

---

# Contributing

Noema is an active research project.

Issues, discussions, ideas, and pull requests are welcome.

---

# License

MIT License

---

> **Knowledge is not collected.**
>
> **It is cultivated, reinforced, forgotten, and rediscovered.**
>
> **Noema exists to model that journey.**

---

Created by **Arjun Kollipara**.