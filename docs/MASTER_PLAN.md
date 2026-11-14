# Hospital Management System - Master Development Plan
**Organization**: ALGIONS AI LABS PRIVATE LIMITED | Full-Stack Web Development Assessment  
**Author**: Antigravity Senior Full-Stack Engineer & UI/UX Architect

---

## 1. Executive Summary & Architecture Overview

The Hospital Management System (HMS) is an enterprise-grade, secure, role-based healthcare web application. It connects administrative, clinical, and reception workflows into a cohesive system backed by MongoDB, Express.js, Node.js, and React (Vite) styled with pure Vanilla CSS, Grid, and Flexbox.

### Architectural Pillars
- **Strict Role-Based Access Control (RBAC)**: Enforced at the database and API gateway levels (`ADMIN`, `DOCTOR`, `FRONT_DESK`).
- **Atomic Concurrency & Anti-Double-Booking**: High-integrity scheduling preventing race conditions and slot overlapping.
- **Protected Clinical Records**: Strict isolation between administrative/billing tasks and sensitive consultation notes and prescriptions.
- **Complete Financial Auditability**: Invoices with itemized subtotal, tax, discount calculations, and simulated payment reconciliation with duplicate prevention.
- **Compliance & Traceability**: Comprehensive audit logging tracking all sensitive operations.

---

## 2. Directory Layout & Modular Structure

```
c:\Users\karan\OneDrive\Desktop\hos\
├── backend/
│   ├── config/             # DB connection, env variables, constants
│   ├── controllers/        # Request handlers per domain
│   ├── middleware/         # Auth, RBAC, error handler, rate limiter, audit
│   ├── models/             # 11 Mongoose schemas with indexes & validation
│   ├── routes/             # REST API routes
│   ├── services/           # Business logic (scheduling, payments, audit)
│   ├── validators/         # Input sanitization and schema validators
│   ├── utils/              # Response formatter, token helpers, slot generator
│   ├── tests/              # Jest & Supertest automated test suites
│   ├── seeders/            # Deterministic, realistic hospital database seeder
│   ├── docs/               # Swagger / OpenAPI specification
│   ├── app.js              # Express app configuration
│   ├── server.js           # Server bootstrap & cluster/port listener
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── assets/         # Branding, icons, placeholders
│   │   ├── components/     # Reusable UI: Modal, Table, Toast, StatsCard, Badge, Skeleton, Confirm
│   │   ├── pages/          # Dashboard, Patients, Doctors, Appointments, Visits, Billing, Reports, Audit
│   │   ├── layouts/        # DashboardLayout, AuthLayout, Sidebar, Topbar, Breadcrumbs
│   │   ├── services/       # Axios API client modules
│   │   ├── context/        # AuthContext, ToastContext, ThemeContext
│   │   ├── hooks/          # Custom hooks (useAuth, useFetch, useDebounce)
│   │   ├── routes/         # Protected routes & role-based routing
│   │   ├── styles/         # Vanilla CSS modules, design tokens, responsive breakpoints
│   │   ├── utils/          # Date formatting, currency, status helpers
│   │   ├── App.jsx         # App router and providers
│   │   └── main.jsx
│   └── package.json
├── docs/
│   ├── ER_DIAGRAM.md       # Mermaid ER Diagram & data dictionary
│   └── TECHNICAL_REPORT.md # Technical report and architectural evaluation
├── .gitignore
├── README.md
└── .env.example
```

---

## 3. Database Entities & Relationships (11 Collections)

1. **User**: `name`, `email` (unique index), `passwordHash`, `role` (ADMIN, DOCTOR, FRONT_DESK), `isActive`.
2. **Patient**: `patientId` (unique index), `name`, `dateOfBirth`, `gender`, `phone`, `email`, `address`, `emergencyContact`, `isActive`.
3. **Doctor**: `userId` (ref User), `doctorId` (unique), `specialization`, `departmentId` (ref Department), `qualification`, `consultationFee`, `workingSchedule`, `isAvailable`.
4. **Department**: `name` (unique), `description`, `location`, `isActive`.
5. **Appointment**: `patientId`, `doctorId`, `departmentId`, `appointmentDate`, `startTime`, `endTime`, `reason`, `status` (`BOOKED`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`), `createdBy`. Compound indexes to enforce slot integrity.
6. **Visit**: `appointmentId` (unique ref), `patientId`, `doctorId`, `consultationNotes`, `visitDate`, `followUpDate`.
7. **Prescription**: `visitId`, `patientId`, `doctorId`, `medicines` array, `instructions`.
8. **DiagnosticReport**: `visitId`, `patientId`, `reportType`, `reportDate`, `fileMetadata`, `status`.
9. **Invoice**: `invoiceNumber` (unique), `patientId`, `appointmentId`, `items` array, `subtotal`, `tax`, `discount`, `totalAmount`, `paymentStatus`.
10. **Payment**: `invoiceId`, `patientId`, `amount`, `paymentMethod` (`CASH`, `CARD_SIMULATED`, `UPI_SIMULATED`), `transactionReference` (idempotency key), `status`, `paidAt`.
11. **AuditLog**: `userId`, `action`, `entityType`, `entityId`, `timestamp`, `details`.

---

## 4. Phase-by-Phase Implementation Roadmap

| Phase | Core Deliverables | Testing & Validation |
|---|---|---|
| **Phase 1** | Backend initialization, MongoDB connection, 11 Mongoose models, JWT Auth, RBAC middleware, Frontend Vite setup with Vanilla CSS design system, Responsive Sidebar & Topbar | Auth API tests, Login/Logout verification |
| **Phase 2** | Patient CRUD, Doctor CRUD, Department CRUD, Frontend management tables, search, filters & pagination | Schema validation, Role permission tests |
| **Phase 3** | Doctor schedule slot engine, Appointment booking wizard (8-step flow), Double-booking & atomic concurrency guard, Rescheduling/Cancellation | Concurrency race condition tests, slot re-availability tests |
| **Phase 4** | Doctor workspace, clinical visit logging, symptoms, prescriptions, diagnostic metadata, strict Doctor-only access | Clinical data isolation tests (Front Desk / Admin block) |
| **Phase 5** | Billing system, automated invoice calculation, simulated payments (Cash, Card, UPI), duplicate payment idempotency guard | Invoice math validation, payment reconciliation tests |
| **Phase 6** | Real-time analytics dashboard, revenue aggregates, audit logging interceptor, multi-criteria reports export | Audit trail logging tests, aggregate query speed |
| **Phase 7** | Automated test suite (Jest + Supertest), Swagger UI documentation, Mermaid ER diagram, README.md & Technical Report | End-to-end verification, responsive UI check across viewports |

