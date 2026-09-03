# BillFlow — Backend Technical Documentation

This section documents the BillFlow backend service, built with **FastAPI**, **SQLAlchemy 2.0**, **PostgreSQL**, and **Pydantic v2**.

---

## Documents in this Section

- **[Development Stages](./development-stages.md)**  
  Detailed chronicle of the 7 backend development stages, including objectives, architecture, files created/modified, endpoints, database impact, security, tests, and results.

- **[API Structure](./api-structure.md)**  
  FastAPI router hierarchy, dependency injection mechanisms, exception filters, and route controller organization.

- **[Database Models](./database-models.md)**  
  Detailed attribute-by-attribute documentation of SQLAlchemy 2.0 entities (`User`, `Client`, `Invoice`, `InvoiceItem`, `BusinessSettings`), foreign keys, and indexes.

- **[Data Flow](./data-flow.md)**  
  Internal request execution pipeline, dependency injection, authoritative decimal calculation flow, public invoice security sanitization, and concurrent row locking.
