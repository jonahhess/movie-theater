# System Architecture — High-Level Overview

Our system is built around a **MySQL database as the single source of truth**, with Redis providing high-performance, temporary state for the ticketing workflow.

The application is divided logically into three areas — **Main Site, Admin Site, and Tickets** — while initially sharing a common backend and frontend codebase. This keeps development and deployment simple while leaving the project structure ready to split into separate applications later if the requirements justify it.

---

## 1. System Components

### MySQL — Primary Database

MySQL is the **single source of truth for the entire system**.

It stores persistent application data such as:

- Movies
- Screenings
- Theaters
- Seats
- Tickets
- Users
- Concessions
- Orders
- Administrative data

Any data that must survive application restarts or server failures should ultimately be persisted in MySQL.

---

### Redis — Fast Temporary State

Redis is used for operations where extremely fast access and temporary state are important.

The primary use cases are:

1. **Ticketing / Seat Locking**
   - Temporarily locks seats while a customer completes the ticket purchase process.
   - Provides fast, near-real-time access to seat availability.
   - Prevents multiple customers from attempting to reserve the same seat simultaneously.

2. **Concession Ticket Lookup**
   - Provides fast ticket lookups when customers arrive at the concession area.
   - Avoids unnecessary repeated queries against the primary database for high-frequency lookups.

Redis is **not the source of truth**. Persistent data ultimately belongs in MySQL.

---

## 2. FastAPI Backend

The backend is built with **FastAPI**.

Conceptually, the backend exposes three applications:

### Main Site

The public content-oriented API.

```text
www.site.com/*
```

Its primary responsibility is providing content for the public-facing website.

---

### Admin Site

The administrative API.

```text
www.site.com/admin/*
```

Provides CRUD operations for managing the system's data.

Examples include:

- Creating and editing movies
- Managing screenings
- Managing theaters and seats
- Managing concessions
- Viewing orders and tickets
- Other administrative operations

The Admin API has significantly more write access than the public-facing API.

---

### Tickets Site

The specialized ticketing API.

```text
www.site.com/tickets/*
```

This API handles the ticket purchasing and reservation workflow.

Because ticketing requires temporary seat locks and very fast availability checks, this application makes extensive use of Redis.

---

## 3. Caddy — Reverse Proxy

Caddy sits in front of the FastAPI servers and acts as the application's **reverse proxy and TLS termination layer**.

Conceptually:

```text
                    ┌── Main API
                    │
Internet → Caddy ───┼── Admin API
                    │
                    └── Tickets API
```

Caddy determines which backend should handle a request based on its URL.

For example:

```text
/              → Main Site
/admin/*       → Admin Site
/tickets/*     → Tickets Site
```

Caddy also handles HTTPS/TLS for the application.

---

## 4. Cloudflare — Edge Network

Cloudflare sits in front of the application infrastructure.

```text
User
  ↓
Cloudflare
  ↓
Caddy
  ↓
FastAPI
```

Cloudflare provides several edge-level capabilities, including:

- Rate limiting
- DDoS protection
- Edge caching
- Static resource caching
- Traffic filtering
- TLS/HTTPS handling at the edge

The goal is to handle as much traffic as possible at the edge before requests reach our servers.

---

## 5. Next.js Frontends

The frontend is built with **Next.js**.

There are two logical frontend applications.

### Main Site

The public-facing website uses Next.js with **Static Site Generation (SSG)** where appropriate.

Because much of the site's content changes relatively infrequently, aggressively caching generated pages and static resources provides excellent performance.

The main site also contains the customer-facing ticketing experience.

---

### Admin Site

The administrative interface uses Next.js with **Server-Side Rendering (SSR)**.

Admin pages are generally dynamic and should not be aggressively cached because they display frequently changing data and require authenticated access.

Conceptually:

```text
Public Site
    ↓
Next.js / SSG
    ↓
FastAPI

Admin Site
    ↓
Next.js / SSR
    ↓
FastAPI
```

---

# Initial Development Architecture

At the beginning of development, we will prioritize **simplicity and speed of development over premature separation of services**.

Instead of immediately creating multiple independent backend and frontend projects, we will start with:

### One Backend

A single FastAPI project containing the three logical applications:

```text
backend/
├── main/
├── admin/
├── tickets/
└── shared/
```

The applications remain logically separated in the codebase, but they can be developed, tested, and deployed together.

### One Frontend

Similarly, we will start with a single Next.js project whose structure is prepared for future separation:

```text
frontend/
├── main/
├── admin/
├── tickets/
└── shared/
```

The exact directory structure may evolve as development progresses.

---

# Future Architecture

The initial architecture is intentionally designed so that components can be split later if needed.

For example, the single backend could eventually become:

```text
Main API
Admin API
Tickets API
```

and the frontend could similarly become independent applications:

```text
Main Frontend
Admin Frontend
Tickets Frontend
```

This separation should happen **only when there is a concrete reason to do so**, such as:

- Independent deployment requirements
- Different scaling requirements
- Different security boundaries
- Significantly different development workflows
- Performance requirements
- Team ownership boundaries
- Operational complexity that justifies the additional infrastructure

Until those requirements appear, keeping the applications together reduces unnecessary complexity.

---

# Overall Architecture

The initial system can therefore be viewed as:

```text
                         ┌──────────────────────┐
                         │        Users         │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │      Cloudflare      │
                         │ Rate Limit / Caching │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │        Caddy         │
                         │ Reverse Proxy / TLS  │
                         └──────────┬───────────┘
                                    │
                         ┌──────────┴──────────┐
                         │                     │
                         ▼                     ▼
                ┌─────────────────┐   ┌─────────────────┐
                │   Next.js       │   │    FastAPI      │
                │    Frontend     │   │     Backend     │
                └────────┬────────┘   └────────┬────────┘
                         │                     │
                         │              ┌──────┴──────┐
                         │              │             │
                         │              ▼             ▼
                         │        ┌───────────┐  ┌───────────┐
                         │        │   Redis   │  │   MySQL   │
                         │        │ Temporary │  │   Source  │
                         │        │   State   │  │  of Truth │
                         │        └───────────┘  └───────────┘
                         │
                         └──────────────────────────────┘
```

The key architectural principle is:

> **Keep the initial system simple, but organize the code so that it can be split when real requirements emerge.**

We should avoid introducing microservices or independently deployed applications simply because the system _might_ need them in the future. The initial goal is to get the complete system running locally, validate the architecture, and then split components based on actual requirements and observed behavior.
