# BillFlow — Frontend Integration Test Suites (202 Checks)

The frontend test suites are located in `frontend/tests/`. They execute against the live FastAPI backend to verify the frontend service layer, token persistence, error handling, and API integration.

---

## 1. Test Runner & Verification Command

Execute all seven integration suites sequentially via the cross-platform runner:
```bash
cd frontend
npm test
# or:
node tests/run-all-tests.mjs
```

### Execution Summary
```
===============================================================
--- FINAL TEST EXECUTION SUMMARY ---
===============================================================
- [PASS] Stage 8A: Auth Integration (10.66s)
- [PASS] Stage 8B: Client Integration (35.04s)
- [PASS] Stage 8C: Invoice Integration (62.04s)
- [PASS] Stage 8D: Public Invoice Integration (28.05s)
- [PASS] Stage 8E: Dashboard Integration (27.83s)
- [PASS] Stage 8F: Settings Integration (81.70s)
- [PASS] Stage 8G: Full-Stack QA & Audit (60.45s)
---------------------------------------------------------------
Suites Summary: 7 passed, 0 failed out of 7
===============================================================
```
**Total Verified Assertions**: **202 / 202 Checks Passed (100% PASS)**

---

## 2. Test Suites Breakdown

| Suite Script | Stage | Checks | Scope Verified |
| :--- | :--- | :---: | :--- |
| `tests/test-auth-integration.ts` | **Stage 8A** | 15 / 15 | Token lifecycle, signup, login, /me, automatic session wipe on 401 |
| `tests/test-client-integration.ts` | **Stage 8B** | 21 / 21 | Client CRUD, search by name/email/company/phone, tenant isolation |
| `tests/test-invoice-integration.ts` | **Stage 8C** | 37 / 37 | Line items, calculations, status state machine, filters, sort |
| `tests/test-public-invoice-integration.ts`| **Stage 8D** | 27 / 27 | Unauthenticated public view, privacy sanitization, simulated payment |
| `tests/test-dashboard-integration.ts` | **Stage 8E** | 25 / 25 | KPI cards, 6/12-month revenue timeline, overdue alert counts |
| `tests/test-settings-integration.ts` | **Stage 8F** | 39 / 39 | Business profile, invoice defaults, Supabase logo uploads & deletion |
| `tests/test-fullstack-qa.ts` | **Stage 8G** | 38 / 38 | End-to-end full-system regression audit across all 9 core capabilities |
| **Total** | **7 Suites** | **202 / 202** | **Complete Full-Stack Frontend Service Verification** |

---

## 3. Individual Test Suite Commands

Individual integration suites can be executed via dedicated `package.json` scripts:
```bash
cd frontend

npm run test:auth        # Run Stage 8A Auth Integration (15 checks)
npm run test:clients     # Run Stage 8B Client Integration (21 checks)
npm run test:invoices    # Run Stage 8C Invoice Integration (37 checks)
npm run test:public      # Run Stage 8D Public Portal Integration (27 checks)
npm run test:dashboard   # Run Stage 8E Dashboard Integration (25 checks)
npm run test:settings    # Run Stage 8F Settings & Storage Integration (39 checks)
npm run test:fullstack   # Run Stage 8G Comprehensive End-to-End QA (38 checks)
```
