---
name: Platziflix Project Overview
description: Greenfield video streaming educativo platform - stack, MVP scope, and architectural decisions
type: project
---

Platziflix is a greenfield educational video streaming platform. Started 2026-04-02.

**Stack**: FastAPI (Python) backend, Next.js (TypeScript) frontend, PostgreSQL + SQLAlchemy ORM.
**Pattern**: Clean Architecture — API (Router) -> Service -> Repository -> Database.
**Testing**: Testing pyramid (unit -> integration -> E2E).

**MVP Scope (6 modules)**:
1. Video catalog — list, search, filter by category
2. Authentication — registration, login, roles (user, admin)
3. Video player — streaming, progress tracking
4. User profiles — favorites, watch history
5. Admin panel — full CRUD for content (videos, categories)
6. Subscriptions/payments — plans, payment gateway integration

**Why:** Educational streaming platform for Platzi ecosystem.
**How to apply:** All architectural decisions should optimize for educational content delivery, progress tracking, and scalable video streaming.
