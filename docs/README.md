# BillFlow Documentation

Welcome to the technical documentation system for the **BillFlow** SaaS invoicing platform. This documentation is organized to guide engineers, technical reviewers, and maintainers from high-level system concepts down to granular code, database models, test results, and local environment setup.

---

## Documentation Directory

The documentation is structured into six core areas:

```
docs/
├── architecture/         # System design, application flows, layer responsibilities
├── frontend/             # Next.js App Router, design system, components, data flow
├── backend/              # FastAPI service, routers, database models, schemas
├── testing/              # QA reports, test strategy, Pytest & integration suites
├── setup/                # Local installation, environment variables, database setup
└── development/          # Project history, development workflow, deployment readiness
```

---

## Navigational Guide: When to Read Each Section

### 1. [Architecture Documentation](./architecture/README.md)
> **Read when**: You need to understand how the entire system operates end-to-end, how frontend and backend communicate, how database entities relate, and how critical architectural guarantees (multi-tenant isolation, decimal financial precision, public portal security) are enforced.
- [System Architecture](./architecture/system-architecture.md) — High-level components and responsibilities.
- [Application Flow](./architecture/application-flow.md) — Step-by-step user journeys and data pathways.
- [Frontend Architecture](./architecture/frontend-architecture.md) — Next.js 16 structure and design.
- [Backend Architecture](./architecture/backend-architecture.md) — FastAPI service layers and lifecycle.
- [Database Architecture](./architecture/database-architecture.md) — PostgreSQL schema, constraints, ERD.
- [API Architecture](./architecture/api-architecture.md) — REST endpoint groups and specifications.

### 2. [Frontend Documentation](./frontend/README.md)
> **Read when**: You are developing UI features, updating React components, adjusting styling tokens, or integrating client-side services.
- [Development Stages](./frontend/development-stages.md) — Frontend evolution from Stage 1 to Stage 10.
- [Design System](./frontend/design-system.md) — Typography, color tokens, dark mode, accessible primitives.
- [Component Architecture](./frontend/component-architecture.md) — Layout, dashboard, client, and invoice components.
- [Data Flow](./frontend/data-flow.md) — State management, API client interceptors, and data normalization.

### 3. [Backend Documentation](./backend/README.md)
> **Read when**: You are working on FastAPI route handlers, database schemas, Pydantic serialization, business logic, or Supabase storage.
- [Development Stages](./backend/development-stages.md) — Backend evolution from Stage 1 to Stage 7.
- [API Structure](./backend/api-structure.md) — Router organization and dependency injection.
- [Database Models](./backend/database-models.md) — SQLAlchemy ORM entities, attributes, and relationships.
- [Data Flow](./backend/data-flow.md) — Request lifecycle, decimal math engine, and row locking.

### 4. [Testing Documentation](./testing/README.md)
> **Read when**: You are running tests, verifying bug fixes, or auditing system quality assurance metrics.
- [Test Strategy](./testing/test-strategy.md) — Testing pyramid and quality assurance principles.
- [Backend Tests](./testing/backend-tests.md) — 128 Pytest test cases and assertions.
- [Frontend Tests](./testing/frontend-tests.md) — 7 integration and full-stack test suites.
- [Integration Tests](./testing/integration-tests.md) — End-to-end frontend-to-backend verification.
- [Security Tests](./testing/security-tests.md) — Tenant isolation, tampering, and public privacy audit.
- [QA Report](./testing/qa-report.md) — Final Stage 8G QA audit results and compliance matrix.

### 5. [Setup Documentation](./setup/README.md)
> **Read when**: You are onboarding as a new developer or setting up the application locally.
- [Getting Started](./setup/getting-started.md) — Step-by-step local setup instructions.
- [Environment Configuration](./setup/environment.md) — Variable reference and template definitions.
- [Database Setup](./setup/database-setup.md) — PostgreSQL connection, pooling, and Alembic migrations.

### 6. [Development Documentation](./development/README.md)
> **Read when**: You want to understand the project history, team workflow, or production deployment prerequisites.
- [Project History](./development/project-history.md) — Evolution of the BillFlow platform.
- [Development Workflow](./development/development-workflow.md) — Code standards, planning, and review process.
- [Deployment Readiness](./development/deployment-readiness.md) — Pre-production checklist and verified milestones.
