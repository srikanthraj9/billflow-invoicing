# BillFlow — Architecture Documentation

This section provides a deep technical architectural overview of the BillFlow platform.

---

## Documents in this Section

- **[System Architecture](./system-architecture.md)**  
  High-level system topology, decoupled client-server architecture, layer responsibilities, Supabase Storage integration, and public invoice flows.

- **[Application Flow](./application-flow.md)**  
  Detailed lifecycle diagrams and step-by-step walkthroughs for Landing, Authentication, Clients, Invoices, Public Invoices, Payment Settlement, Dashboard Analytics, and Settings.

- **[Frontend Architecture](./frontend-architecture.md)**  
  Next.js 16 App Router structure, component architecture, service layer abstraction, API client interceptors, and client-side state handling.

- **[Backend Architecture](./backend-architecture.md)**  
  FastAPI application design, request processing pipeline, dependency injection, service-oriented domain architecture, and exception handling.

- **[Database Architecture](./database-architecture.md)**  
  Relational PostgreSQL data model, Entity-Relationship Diagram (ERD), table structures, foreign key constraints (RESTRICT vs CASCADE), indexing strategy, and Alembic migrations.

- **[API Architecture](./api-architecture.md)**  
  Authoritative REST API directory covering all endpoint groups: `/api/health`, `/api/auth`, `/api/clients`, `/api/invoices`, `/api/public`, `/api/dashboard`, and `/api/settings`.
