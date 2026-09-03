# BillFlow — Quality Assurance & Testing Documentation

This section provides complete documentation of the testing strategy, test suites, security validations, and verified regression results across the BillFlow platform.

---

## Documents in this Section

- **[Testing Strategy](./test-strategy.md)**  
  Layered testing pyramid, test environments, execution tools, and quality gates across static analysis, unit tests, integration tests, and full-stack audits.

- **[Backend Tests](./backend-tests.md)**  
  The 128 automated Pytest test cases covering authentication, client isolation, decimal finance, state transitions, public portal, and Supabase logo storage.

- **[Frontend Tests](./frontend-tests.md)**  
  The 7 TypeScript integration test suites (`frontend/tests/`) exercising real browser APIs, token lifecycle, and service layers with 202 assertions.

- **[Integration Tests](./integration-tests.md)**  
  End-to-end full-stack integration verification between Next.js, FastAPI, PostgreSQL, and Supabase Storage.

- **[Security Tests](./security-tests.md)**  
  Comprehensive audit of tenant isolation, tampering prevention, bcrypt hashing, stateless JWT expiry, public privacy sanitization, and concurrent row locking.

- **[Stage 8G QA Report](./qa-report.md)**  
  Final full-stack QA audit report confirming 100% passing status across 330 total automated checks and deployment readiness.
