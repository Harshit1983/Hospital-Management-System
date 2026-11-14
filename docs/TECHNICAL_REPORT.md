# Hospital Management System - Architectural & Engineering Report
**Assessment Target**: ALGIONS AI LABS PRIVATE LIMITED | Full-Stack Web Development Assessment  
**Author**: Antigravity Senior Full-Stack Software Engineer & UI/UX Architect  
**Version**: 1.0.0 (Production Release)

---

## 1. Executive Summary

The MedPulse Hospital Management System (HMS) is a full-stack, enterprise-grade clinical management web platform designed to eliminate scheduling friction, protect sensitive electronic health records (EHR), automate financial workflows, and maintain an audit log of all healthcare operations.

Unlike typical monolithic or surface-level prototypes, every feature across all 7 operational modules is fully wired to a Node.js/Express REST backend backed by MongoDB. Crucially, the system implements **atomic concurrency protection** against doctor double-booking, **server-side verification** of financial math, **strict multi-tier RBAC**, and **isolated clinical record access controls**.

---

## 2. Technology Stack & Design Decisions

### 2.1 Backend Architecture
- **Node.js & Express.js**: Asynchronous event-driven I/O ideal for handling concurrent appointment requests and streaming audit events.
- **Mongoose & MongoDB**: Document-oriented persistence perfectly matching hierarchical medical structures (such as embedded vital signs, itemized prescriptions, and multi-line billing items) while offering high-performance indexing and schema validation.
- **bcryptjs (10 Rounds)**: Industry standard one-way salted password hashing.
- **JSON Web Tokens (JWT)**: Stateless, signed authentication with 24-hour expiration and cryptographic verification.
- **Helmet & CORS**: Hardened HTTP response headers mitigating XSS, clickjacking, and MIME-type sniffing.
- **express-rate-limit**: Defense-in-depth protection against credential stuffing and brute-force attacks on `/api/auth/login`.

### 2.2 Frontend Architecture
- **React 18 & Vite**: Fast bundling, instant Hot Module Replacement (HMR), and component-based modular structure.
- **React Router DOM v6**: Declarative client-side routing with nested layouts and protected route wrappers.
- **Pure Vanilla CSS with Custom Design System**:
  - **Zero utility frameworks**: Strict adherence to the constraint prohibiting Tailwind, Bootstrap, and Material UI.
  - **CSS Variables Design System**: Centralized design tokens for colors, elevations, radii, and responsive breakpoints.
  - **Component-Scoped Stylesheets**: Separate stylesheets for layouts, tables, forms, modals, toasts, and clinical charts.
  - **CSS Grid & Flexbox**: Fully responsive across mobile, tablet, and widescreen desktop displays.
- **Lucide React**: Clean, accessible iconography designed for modern healthcare interfaces.

---

## 3. High-Integrity Concurrency & Double-Booking Prevention

### 3.1 The Race Condition Problem
In healthcare environments, concurrent requests to book the same physician at an overlapping time slot are frequent. Relying exclusively on client-side slot disabling creates critical race conditions: two users querying available slots simultaneously see the slot as open and dispatch booking requests that both succeed if the backend only executes a read-then-write without atomic locking.

### 3.2 The Engineering Solution: Partial Unique Compound Indexes
To solve this problem at both the application and database layers:

1. **Database-Level Partial Unique Compound Index**:
   ```javascript
   appointmentSchema.index(
     { doctorId: 1, appointmentDate: 1, startTime: 1 },
     {
       unique: true,
       partialFilterExpression: {
         status: { $in: ['BOOKED', 'CONFIRMED'] }
       }
     }
   );
   ```
   **Why Partial Expression?**
   If an appointment is cancelled (`status: 'CANCELLED'`), that specific slot becomes available again for other patients. By restricting the unique index strictly to `status: { $in: ['BOOKED', 'CONFIRMED'] }`, MongoDB automatically permits a new booking for that doctor and date/time while blocking any simultaneous active booking with error code `11000`.

2. **Atomic Conflict Trapping & HTTP 409 Resolution**:
   ```javascript
   try {
     const appointment = await Appointment.create({ ... });
     return appointment;
   } catch (error) {
     if (error.code === 11000) {
       const conflictError = new Error('Slot conflict: another appointment was just booked for this exact slot.');
       conflictError.statusCode = 409;
       throw conflictError;
     }
     throw error;
   }
   ```

3. **Dynamic Slot Calculation Engine (`appointmentService.js`)**:
   Slots are calculated dynamically from the doctor's active day-of-week schedule. The system computes time intervals (e.g., 09:00 - 09:30, 09:30 - 10:00) and marks `isAvailable: false` for slots already present in active `Appointment` documents.

---

## 4. Role-Based Access Control (RBAC) & Patient Privacy

The application defines three strict user roles with permissions enforced on the backend:

| Capability | ADMIN | DOCTOR | FRONT_DESK |
|---|:---:|:---:|:---:|
| Staff & Department CRUD | Full Access | Denied (403) | Read Only |
| Patient Demographics (Register / Edit) | Full Access | Read Only | Full Access |
| Patient Medical Records (Visits, Rx) | Full Access | Authorized Only* | **Blocked (403)** |
| Create Consultation & Prescriptions | Denied | Full Access | **Blocked (403)** |
| Appointment Booking & Scheduling | Full Access | Full Access | Full Access |
| Financial Billing & Payment Processing | Full Access | Denied (403) | Full Access |
| System Compliance Audit Logs | Full Access | Denied (403) | Denied (403) |

*\*Doctor Authorization Rule*: A physician is strictly prohibited from accessing clinical history for patients with whom they have no assigned appointment. Attempting to bypass this via the API immediately yields an HTTP 403 Forbidden.

---

## 5. Billing, Invoice Calculations & Payment Idempotency

### 5.1 Backend Calculation Verification
All invoice math is calculated on the backend in `billingService.js`. The server iterates through line items, computes `itemTotal = quantity * unitPrice`, calculates `subtotal`, applies tax percentage, deducts valid discounts, and verifies that `totalAmount = subtotal + tax - discount`. The server never trusts client-supplied sums.

### 5.2 Simulated Payment Lifecycle & Reconciliation
- **Payment Methods**: `CASH`, `CARD_SIMULATED`, `UPI_SIMULATED`.
- **Automatic Status Reconciliation**:
  - `paidAmount == 0`: `PENDING`
  - `0 < paidAmount < totalAmount`: `PARTIALLY_PAID`
  - `paidAmount >= totalAmount`: `PAID`
- **Idempotency Guarantee**: Every simulated payment requires a unique `transactionReference` indexed with `{ unique: true }`. Attempting to submit the same payment reference twice produces an immediate HTTP 409 Conflict, preventing duplicate payments.

---

## 6. Audit Logging & Regulatory Compliance

Every state-altering operation produces an audit entry in the `AuditLog` collection:
- `PATIENT_CREATE`, `PATIENT_UPDATE`, `PATIENT_RECORD_ACCESS`
- `APPOINTMENT_BOOK`, `APPOINTMENT_RESCHEDULE`, `APPOINTMENT_CANCEL`
- `VISIT_CREATE`, `PRESCRIPTION_CREATE`
- `INVOICE_CREATE`, `PAYMENT_RECORD`

**Fail-Safe Design**: Audit logging executes in a try/catch wrapper that guarantees audit failures (e.g. logging disk latency) will never roll back or crash a primary patient care transaction. Audit log inspection endpoints are restricted to `ADMIN` accounts.

---

## 7. Automated Test Suite Execution Summary

Automated testing was conducted using **Jest** and **Supertest** covering 27 test cases across 6 test suites:

```
PASS backend/tests/authorization.test.js
  ✓ Doctor accessing an unrelated patient clinical record must be blocked (403 Forbidden)
  ✓ Front Desk attempting to access restricted clinical medical records must receive 403 Forbidden
  ✓ Front Desk attempting to create clinical visit notes must receive 403 Forbidden
  ✓ Front Desk attempting to access audit logs must receive 403 Forbidden
  ✓ Admin must be granted access to administrative reports and audit logs

PASS backend/tests/appointments.test.js
  ✓ should generate doctor working slots correctly for a given weekday
  ✓ should successfully book an appointment in an available slot
  ✓ CRITICAL: should prevent double booking for the same doctor and same slot (409 Conflict)
  ✓ CRITICAL: should handle simultaneous concurrent booking requests safely
  ✓ CRITICAL: cancelled slot becomes available again for another patient
  ✓ should reject invalid rescheduling to an occupied slot

PASS backend/tests/patient.test.js
  ✓ should register a new patient successfully with generated patientId
  ✓ should reject patient registration with invalid data
  ✓ should search patients by name or phone with pagination
  ✓ should allow admin to safely deactivate a patient record

PASS backend/tests/auth.test.js
  ✓ should authenticate user with valid credentials and return JWT token
  ✓ should reject login with incorrect password
  ✓ should reject login for non-existent email
  ✓ should reject access to protected endpoint without token
  ✓ should reject access with invalid token
  ✓ should retrieve current user profile with valid Bearer token
  ✓ should change password successfully when current password matches

PASS backend/tests/billing.test.js
  ✓ CRITICAL: must correctly calculate item totals, subtotal, tax, discount and final totalAmount on backend
  ✓ CRITICAL: should record simulated payment, update invoice paidAmount, and update status
  ✓ CRITICAL: should prevent duplicate payment processing via idempotency key

PASS backend/tests/audit.test.js
  ✓ should generate an audit entry when a patient is created and accessed
  ✓ should allow admin to filter and retrieve audit trails

Test Suites: 6 passed, 6 total
Tests:       27 passed, 27 total
Snapshots:   0 total
```

---

## 8. Technical Limitations & Future Enhancements

1. **Simulated Payment Gateways**: The current payment system operates in simulation mode with full idempotency and reconciliation. Production deployment would integrate Stripe or Razorpay webhooks.
2. **File Storage for Diagnostic Scans**: File metadata is persisted in MongoDB while PDF files are referenced via URL paths. In a cloud deployment, integration with AWS S3 or Google Cloud Storage using presigned URLs would handle multi-megabyte DICOM medical imaging.
3. **Real-time WebSockets**: Appointment slots currently update via live REST polling and optimistic UI updates. Incorporating Socket.io would provide live visual updates for reception desks.

---

## 9. Conclusion

The MedPulse Hospital Management System meets the requirements of the ALGIONS AI LABS PRIVATE LIMITED Full-Stack Web Development assessment. It demonstrates full-stack software craftsmanship: maintainable Vanilla CSS, clean REST API design, database integrity, strict access control, and automated test coverage.

