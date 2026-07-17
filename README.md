
# AssetFlow

A full-stack enterprise asset management system. AssetFlow gives organizations complete control over the lifecycle of physical assets — from registration and allocation through maintenance, booking, auditing, and retirement — with a role-based access model and a real-time dashboard.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Features](#features)
- [Project Structure](#project-structure)
- [User Roles and Permissions](#user-roles-and-permissions)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Frontend Screens](#frontend-screens)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
  - [Running with Docker (recommended)](#running-with-docker-recommended)
  - [Running locally without Docker](#running-locally-without-docker)
- [Default Seed Accounts](#default-seed-accounts)
- [Security](#security)
- [Development Notes](#development-notes)

---
<img width="1746" height="787" alt="Screenshot 2026-07-12 171057" src="https://github.com/user-attachments/assets/3b5cd1cd-f3c4-4490-aac0-b1c78517f025" />
<img width="1917" height="917" alt="Screenshot 2026-07-12 171220" src="https://github.com/user-attachments/assets/eff5a03b-cd5c-4652-bdff-add3fb115e7c" />
<img width="1886" height="893" alt="Screenshot 2026-07-12 171200" src="https://github.com/user-attachments/assets/28af2f6a-1ea6-40dc-957f-08046c4062ac" />
<img width="1911" height="892" alt="Screenshot 2026-07-12 171137" src="https://github.com/user-attachments/assets/e20234cc-c1f5-4834-823a-d69a227b741e" />

## Overview

AssetFlow is built around a simple idea: every physical asset in an organization has a lifecycle, and every stage of that lifecycle should be tracked, authorized, and auditable.

The system handles:

- Asset registration with auto-generated tags (AF-0001, AF-0002, ...)
- Allocation to users or departments with expected return tracking
- Transfer requests between users and departments with an approval workflow
- Time-slot booking for shared resources such as meeting rooms and equipment
- A full maintenance pipeline from submission through technician assignment to resolution
- Periodic audit cycles with per-item verification and discrepancy reporting
- Role-based notifications and a full activity log

---

## Tech Stack

### Backend

| Concern | Technology |
|---|---|
| Runtime | Node.js 20 LTS |
| Framework | Express.js 4.x (ES Modules) |
| Database | PostgreSQL 16 |
| Authentication | JWT access tokens (15 min) + httpOnly refresh tokens (7 days) |
| Validation | express-validator |
| Password hashing | bcryptjs (12 rounds) |
| Security headers | Helmet |
| CORS | cors |
| Rate limiting | express-rate-limit |
| Logging | Winston + Morgan |
| Compression | compression |

### Frontend

| Concern | Technology |
|---|---|
| Framework | Next.js 16.x (standalone output) |
| UI library | React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + custom CSS design system |
| HTTP client | Native Fetch API with typed wrapper |
| State | React Context (auth + toast) |
| Build tool | Turbopack |

### Infrastructure

| Concern | Technology |
|---|---|
| Containerization | Docker |
| Orchestration | Docker Compose |
| Database image | postgres:16-alpine |
| App images | node:20-alpine (multi-stage builds) |

---

## Architecture

```
Browser
  |
  | HTTP  (port 3000)
  v
Next.js Frontend  (standalone Node server)
  |
  | HTTP  (port 5000, internal: backend:5000)
  v
Express API Backend
  |
  | TCP  (port 5432, internal: db:5432)
  v
PostgreSQL Database
```

All three services run in an isolated bridge network (`assetflow_net`). The frontend communicates with the backend using `NEXT_PUBLIC_API_URL`, which is baked into the client bundle at build time. The backend communicates with PostgreSQL through a connection pool (`pg.Pool`, min 2, max 10 connections).

### Request lifecycle

1. Client sends a request with `Authorization: Bearer <access_token>`
2. `authenticate` middleware verifies the JWT and attaches `req.user`
3. `authorize(...roles)` middleware checks `req.user.role` against allowed roles
4. `express-validator` validates and sanitizes the request body/query
5. Controller calls Model methods (parameterized SQL queries via `pg`)
6. `ApiResponse.success` or `ApiError` shapes the response uniformly
7. `errorHandler` catches any thrown errors and maps them to HTTP status codes (including PostgreSQL constraint codes `23505`, `23503`)

---

## Features

### Asset Management
- Register assets with auto-incremented tags, categories, condition, location, cost, and serial number
- Filter and search by status, category, and free text
- Full lifecycle status transitions: available, allocated, reserved, under maintenance, lost, retired, disposed
- Per-asset history combining allocation and maintenance records
- Bookable flag for shared resources

### Allocation and Transfer
- Allocate assets directly to a user or department
- Track expected return dates and flag overdue allocations
- Conflict detection: prevents double-allocation of an already-allocated asset
- Transfer request workflow: request, approve, reject — with automatic allocation swap on approval
- Return workflow: captures return condition and notes, flips asset back to available

### Resource Booking
- Calendar view per asset showing all bookings by time slot
- Conflict prevention: rejects overlapping bookings for the same asset
- Booking status lifecycle: upcoming, ongoing, completed, cancelled

### Maintenance
- Six-stage pipeline: pending, approved, rejected, technician assigned, in progress, resolved
- Priority levels: low, medium, high, critical
- Technician assignment by user ID
- Resolution notes and timestamp tracking
- Asset is automatically set to `under_maintenance` on approval, restored on resolution

### Audit Cycles
- Create named audit cycles scoped to a department with a date range
- Add and remove auditors (users assigned to the cycle)
- Add assets to a cycle as audit items
- Verify each item as `verified`, `missing`, or `damaged`
- Discrepancy report endpoint returns only non-verified items
- Close a cycle to lock it

### Dashboard
- Real-time KPIs: available, allocated, under-maintenance asset counts; active bookings; pending transfers; overdue and upcoming returns; maintenance by status
- Recent activity feed (last N actions)
- Overdue allocations list with days-overdue calculation

### Reports and Analytics
- Asset utilization by department (allocated / total, utilization %)
- Most used assets by booking count (current month)
- Idle assets not used in the last N days
- Maintenance frequency per asset
- Assets due for attention (poor/damaged condition or 4+ years old)
- Booking heatmap (bookings by day-of-week and hour-of-day)
- Department-wise allocation summary with employee-to-asset ratios
- Full export payload combining all report data

### Notifications
- Automatic notifications on: asset assignment, maintenance approved/rejected, booking confirmed/cancelled, transfer approved/rejected, overdue return, audit discrepancy
- Per-user inbox with read/unread state
- Mark individual or all as read, delete notifications

### Activity Logs
- Every mutating action writes a structured log entry (actor, action type, entity type, entity ID, description, metadata, IP address)
- Queryable by entity type and entity ID
- Restricted to admin and asset_manager roles

---

## Project Structure

```
odoo-assetflow/
|
|-- docker-compose.yml         # Four-service orchestration
|-- .env.example               # All required environment variables
|
|-- backend/
|   |-- Dockerfile             # Two-stage: deps + runner
|   |-- .dockerignore
|   |-- package.json           # ESM, Node >=18
|   |-- src/
|       |-- server.js          # Entry point, graceful shutdown
|       |-- app.js             # Express setup, middleware chain
|       |-- config/
|       |   |-- db.js          # pg.Pool, query helper, connectDB
|       |   |-- env.js         # Validated env with required-field check
|       |-- controllers/       # One file per domain
|       |   |-- authController.js
|       |   |-- assetController.js
|       |   |-- allocationController.js
|       |   |-- bookingController.js
|       |   |-- maintenanceController.js
|       |   |-- auditController.js
|       |   |-- dashboardController.js
|       |   |-- reportController.js
|       |   |-- notificationController.js
|       |   |-- departmentController.js
|       |   |-- assetCategoryController.js
|       |   |-- employeeController.js
|       |-- models/            # SQL query layer, no ORM
|       |   |-- userModel.js
|       |   |-- assetModel.js
|       |   |-- allocationModel.js
|       |   |-- transferModel.js
|       |   |-- bookingModel.js
|       |   |-- maintenanceModel.js
|       |   |-- auditModel.js
|       |   |-- notificationModel.js
|       |   |-- activityLogModel.js
|       |   |-- departmentModel.js
|       |   |-- assetCategoryModel.js
|       |   |-- refreshTokenModel.js
|       |-- routes/            # Route definitions with validation
|       |-- middleware/
|       |   |-- authenticate.js   # JWT verification, sets req.user
|       |   |-- authorize.js      # Role check, must follow authenticate
|       |   |-- validate.js       # express-validator result handler
|       |   |-- rateLimiter.js    # apiLimiter + authLimiter (off in dev)
|       |   |-- errorHandler.js   # Global error handler, maps PG codes
|       |   |-- notFound.js       # 404 handler
|       |-- services/
|       |   |-- authService.js    # Login, register, token rotation
|       |-- utils/
|       |   |-- ApiError.js       # Operational error class
|       |   |-- ApiResponse.js    # Uniform success/error response shape
|       |   |-- activityLogger.js # Convenience wrapper for log writes
|       |   |-- logger.js         # Winston instance
|       |-- database/
|           |-- migrate.js        # Idempotent schema migrations (15 steps)
|           |-- seed.js           # Realistic demo data
|
|-- frontend/
    |-- Dockerfile             # Three-stage: deps + builder + runner
    |-- .dockerignore
    |-- next.config.ts         # output: standalone
    |-- package.json
    |-- app/
        |-- layout.tsx         # Root layout, AuthProvider, ToastProvider
        |-- globals.css        # Full custom design system (CSS variables, components)
        |-- lib/
        |   |-- api.ts         # Typed fetch wrapper, all API client functions
        |   |-- types.ts       # All TypeScript interfaces and type aliases
        |   |-- auth-context.tsx  # useAuth hook, login/logout/register
        |   |-- validation.ts  # Pure validation functions, no dependencies
        |-- components/
        |   |-- AppShell.tsx   # Sidebar navigation, routing, notification badge
        |   |-- ui/
        |       |-- Badge.tsx      # AssetStatusBadge, RoleBadge, DeptStatusBadge
        |       |-- FormField.tsx  # Input, Select, Textarea with error display
        |       |-- Modal.tsx      # Overlay modal with close button
        |       |-- Spinner.tsx    # Loading spinner, fullPage variant
        |       |-- Table.tsx      # Generic typed table, EmptyState component
        |       |-- Toast.tsx      # Toast notification system, useToast hook
        |-- screens/
            |-- DashboardScreen.tsx      # KPI cards, activity feed, overdue table
            |-- AssetsScreen.tsx         # Asset list, filter, register modal, detail drawer
            |-- AllocationScreen.tsx     # Allocate, return, transfer request workflows
            |-- BookingScreen.tsx        # Time-slot calendar, create/cancel bookings
            |-- MaintenanceScreen.tsx    # Kanban-style pipeline, raise request modal
            |-- AuditScreen.tsx          # Cycle management, item verification
            |-- ReportsScreen.tsx        # Bar chart, line chart, idle/used/dept tables
            |-- OrgScreen.tsx            # Departments, categories, employees management
            |-- NotificationsScreen.tsx  # Notification inbox, activity log table
```

---

## User Roles and Permissions

| Action | admin | asset_manager | department_head | employee |
|---|:---:|:---:|:---:|:---:|
| Register / update / delete assets | Yes | Yes | No | No |
| Allocate and return assets | Yes | Yes | No | No |
| Approve / reject transfers | Yes | Yes | Yes | No |
| Request transfers | Yes | Yes | Yes | Yes |
| Create bookings | Yes | Yes | Yes | Yes |
| Cancel own bookings | Yes | Yes | Yes | Yes |
| Submit maintenance requests | Yes | Yes | Yes | Yes |
| Approve / assign / resolve maintenance | Yes | Yes | No | No |
| Create audit cycles | Yes | Yes | No | No |
| Verify audit items | Yes | Yes | Yes | No |
| View reports | Yes | Yes | Yes | No |
| View activity logs | Yes | Yes | No | No |
| Manage departments and categories | Yes | No | No | No |
| Manage users and roles | Yes | No | No | No |

---

## API Reference

All endpoints are prefixed with `/api`. All protected endpoints require:

```
Authorization: Bearer <access_token>
```

### Health

```
GET  /api/health
```

### Authentication

```
POST /api/auth/register          Public. Rate limited (20 req / 15 min in prod).
POST /api/auth/login             Public. Rate limited.
POST /api/auth/refresh           Public. Uses httpOnly refresh token cookie.
GET  /api/auth/me                Protected. Returns current user profile.
POST /api/auth/logout            Protected. Revokes current refresh token.
POST /api/auth/logout-all        Protected. Revokes all refresh tokens for user.
```

### Employees

```
GET    /api/employees                    admin, asset_manager
GET    /api/employees/:id                Authenticated
PATCH  /api/employees/:id                Update name, phone, department_id
PATCH  /api/employees/:id/role           admin only
PATCH  /api/employees/:id/status         admin only
```

### Departments

```
GET    /api/departments                  Authenticated
GET    /api/departments/:id              Authenticated
POST   /api/departments                  admin
PUT    /api/departments/:id              admin
DELETE /api/departments/:id              admin
```

### Asset Categories

```
GET    /api/categories                   Authenticated
GET    /api/categories/:id               Authenticated
POST   /api/categories                   admin, asset_manager
PUT    /api/categories/:id               admin, asset_manager
DELETE /api/categories/:id              admin, asset_manager
```

### Assets

```
GET    /api/assets                       Authenticated. Filters: status, category_id, department_id, search, is_bookable. Returns paginated { assets, total, limit, offset }.
GET    /api/assets/:id                   Authenticated
GET    /api/assets/:id/history           Authenticated. Combined allocation + maintenance history.
POST   /api/assets                       admin, asset_manager
PUT    /api/assets/:id                   admin, asset_manager
PATCH  /api/assets/:id/status            admin, asset_manager. Direct lifecycle transitions only.
DELETE /api/assets/:id                   admin, asset_manager. Blocked if allocated or under maintenance.
```

### Allocations

```
GET    /api/allocations                  admin, asset_manager, department_head. Filters: user_id, dept_id, is_active, overdue.
GET    /api/allocations/:id              Authenticated
POST   /api/allocations                  admin, asset_manager. Body: asset_id, assigned_to_user?, assigned_to_dept?, expected_return_at?
POST   /api/allocations/:id/return       admin, asset_manager. Body: return_condition?, return_notes?
```

### Transfers

```
GET    /api/allocations/transfers        admin, asset_manager, department_head. Filters: asset_id, status, requested_by.
GET    /api/allocations/transfers/:id    Authenticated
POST   /api/allocations/transfers        Authenticated. Body: asset_id, to_user_id?, to_dept_id?, reason?
PATCH  /api/allocations/transfers/:id/approve    admin, asset_manager, department_head
PATCH  /api/allocations/transfers/:id/reject     admin, asset_manager, department_head. Body: rejection_note?
```

### Bookings

```
GET    /api/bookings                     Authenticated. Filters: booked_by, status.
GET    /api/bookings/:id                 Authenticated
GET    /api/bookings/asset/:assetId/calendar     Authenticated. Returns all bookings for calendar view.
POST   /api/bookings                     Authenticated. Body: asset_id, start_time, end_time, title?, notes?, dept_id?
PUT    /api/bookings/:id                 Authenticated. Body: start_time?, end_time?, title?, notes?
PATCH  /api/bookings/:id/cancel          Authenticated. Body: cancel_reason?
```

### Maintenance

```
GET    /api/maintenance                  Authenticated. Filters: status, priority.
GET    /api/maintenance/:id              Authenticated
POST   /api/maintenance                  Authenticated. Body: asset_id, issue_desc, priority?, photo_url?
PATCH  /api/maintenance/:id/approve      admin, asset_manager
PATCH  /api/maintenance/:id/reject       admin, asset_manager. Body: rejection_note?
PATCH  /api/maintenance/:id/assign       admin, asset_manager. Body: assigned_to (user UUID)
PATCH  /api/maintenance/:id/start        admin, asset_manager
PATCH  /api/maintenance/:id/resolve      admin, asset_manager. Body: resolution_note?
```

### Audits

```
GET    /api/audits                       admin, asset_manager, department_head. Filter: status.
GET    /api/audits/:id                   Authenticated
GET    /api/audits/:id/discrepancies     Authenticated. Returns only unverified items.
POST   /api/audits                       admin, asset_manager. Body: title, start_date, end_date, scope_dept?, scope_location?, notes?
POST   /api/audits/:id/auditors          admin, asset_manager. Body: user_id
DELETE /api/audits/:id/auditors/:userId  admin, asset_manager
POST   /api/audits/:id/items             admin, asset_manager. Body: asset_id, expected_location?
PATCH  /api/audits/:id/items/:itemId/verify     Authenticated. Body: verification (verified|missing|damaged), notes?
POST   /api/audits/:id/close             admin, asset_manager
```

### Dashboard

```
GET    /api/dashboard/kpis               Authenticated. Returns asset counts, booking, transfer, allocation, and maintenance KPIs.
GET    /api/dashboard/recent-activity    Authenticated. Query: limit (default 10).
GET    /api/dashboard/overdue-allocations    Authenticated. Returns allocations past expected_return_at.
```

### Reports

All report endpoints require: admin, asset_manager, or department_head.

```
GET    /api/reports/utilization          Asset utilization % by department.
GET    /api/reports/most-used            Top 20 assets by booking count this month.
GET    /api/reports/idle                 Assets not used in last N days. Query: days (default 30).
GET    /api/reports/maintenance-frequency    Top 30 assets by maintenance request count.
GET    /api/reports/due-attention        Assets in poor/damaged condition or 4+ years old.
GET    /api/reports/booking-heatmap      Booking counts by day-of-week and hour. Query: asset_id?
GET    /api/reports/dept-allocation      Department summary: allocated count, employee count, ratio.
GET    /api/reports/export               Full combined report payload.
```

### Notifications

```
GET    /api/notifications                Authenticated. Filters: is_read, type. Returns { notifications, unread_count }.
PATCH  /api/notifications/read-all       Authenticated
PATCH  /api/notifications/:id/read       Authenticated
DELETE /api/notifications/:id            Authenticated
```

### Activity Logs

```
GET    /api/activity-logs                admin, asset_manager. Filter: entity_type.
GET    /api/activity-logs/entity/:type/:id   admin, asset_manager. Logs for a specific entity.
```

---

## Database Schema

Fifteen migration steps (all idempotent, safe to re-run):

| Table | Purpose |
|---|---|
| `users` | All system users with role, department, and active flag |
| `refresh_tokens` | Hashed refresh tokens with expiry and revocation flag |
| `departments` | Hierarchical departments (parent_id self-reference) with head assignment |
| `asset_categories` | Categories with JSONB custom field definitions |
| `assets` | Full asset record with auto-tag sequence (`asset_tag_seq`) |
| `allocations` | Asset-to-user/department assignments with return tracking |
| `transfer_requests` | Pending/approved/rejected transfer workflow |
| `bookings` | Time-slot reservations with conflict enforcement |
| `maintenance_requests` | Six-stage maintenance pipeline |
| `audit_cycles` | Named audit sessions with date range and department scope |
| `audit_auditors` | Junction table: which users are assigned to an audit cycle |
| `audit_items` | Per-asset verification records within a cycle |
| `notifications` | Per-user notification inbox with type and read state |
| `activity_logs` | Immutable audit trail for all mutating actions |

All mutable tables have an `updated_at` trigger that fires `set_updated_at()` on every UPDATE.

---

## Frontend Screens

| Screen | Route (rendered by AppShell) | Description |
|---|---|---|
| Dashboard | Default / home | KPI grid, recent activity feed, overdue allocation table |
| Assets | Assets tab | Paginated asset table, category/status filter chips, register modal, detail drawer |
| Allocation & Transfer | Allocation tab | Allocate to user/department, return workflow, transfer request list with approve/reject |
| Resource Booking | Booking tab | Bookable asset selector, 24-hour day calendar, create and cancel bookings |
| Maintenance | Maintenance tab | Kanban board by status, raise request modal, approve/assign/resolve actions |
| Audit | Audit tab | Create cycles, manage auditors, add items, verify per-item, discrepancy view |
| Reports | Reports tab | Bar chart (utilization), line chart (maintenance frequency), idle/most-used/dept tables |
| Organization | Organization tab | Tabs for Departments, Categories, Employees with add/edit/delete and role management |
| Notifications | Notifications tab | Notification inbox with type filters, activity log table (admin/manager only) |

---

## Environment Variables

Copy `.env.example` to `.env` in the project root before running with Docker Compose.

| Variable | Required | Default | Description |
|---|:---:|---|---|
| `DB_NAME` | Yes | `odoo_db` | PostgreSQL database name |
| `DB_USER` | Yes | `postgres` | PostgreSQL user |
| `DB_PASSWORD` | Yes | — | PostgreSQL password |
| `DB_HOST` | Yes (backend) | `db` (Docker) | Database hostname |
| `DB_PORT` | No | `5432` | Database port |
| `DB_POOL_MIN` | No | `2` | Connection pool minimum |
| `DB_POOL_MAX` | No | `10` | Connection pool maximum |
| `JWT_ACCESS_SECRET` | Yes | — | Secret for signing access tokens (min 32 chars recommended) |
| `JWT_REFRESH_SECRET` | Yes | — | Secret for signing refresh tokens (must differ from access secret) |
| `JWT_ACCESS_EXPIRES_IN` | No | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token lifetime |
| `COOKIE_SECRET` | Yes | — | Secret for signed cookies |
| `CLIENT_URL` | No | `http://localhost:3000` | Allowed CORS origin |
| `PORT` | No | `5000` | Backend server port |
| `NODE_ENV` | No | `development` | Set to `production` in Docker |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limit window in milliseconds (15 min) |
| `RATE_LIMIT_MAX` | No | `100` | Max requests per window (general) |
| `NEXT_PUBLIC_API_URL` | Yes (build arg) | `http://localhost:5000/api` | Backend API URL baked into the browser bundle |

> Rate limiting is automatically disabled when `NODE_ENV=development`.

---

## Getting Started

### Running with Docker (recommended)

Prerequisites: Docker Desktop (or Docker Engine + Compose plugin).

```bash
# 1. Clone the repository
git clone <repository-url>
cd odoo-assetflow

# 2. Create your environment file
cp .env.example .env
```

Open `.env` and set the four required secrets:

```env
DB_PASSWORD=your_secure_password
JWT_ACCESS_SECRET=a_random_string_of_at_least_32_characters
JWT_REFRESH_SECRET=a_different_random_string_of_at_least_32_characters
COOKIE_SECRET=another_random_string_of_at_least_32_characters
```

```bash
# 3. Build images and start all services
docker compose up --build

# 4. (Optional) Seed the database with demo data
docker compose exec backend node src/database/seed.js
```

Services start in order: PostgreSQL becomes healthy, then the migration runner applies the schema and exits, then the backend starts, then the frontend starts.

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000/api |
| Health check | http://localhost:5000/api/health |
| PostgreSQL | localhost:5432 (host access for tooling) |

To stop and remove containers:

```bash
docker compose down          # keeps the database volume
docker compose down -v       # also removes the database volume
```

To rebuild after code changes:

```bash
docker compose up --build
```

---

### Running locally without Docker

Prerequisites: Node.js 20+, PostgreSQL 16.

**Backend**

```bash
cd backend
cp .env.example .env
# Edit .env: set DB_HOST=localhost and all required secrets

npm install

# Create the database in PostgreSQL first
# psql -U postgres -c "CREATE DATABASE odoo_db;"

npm run db:migrate    # Apply schema
npm run db:seed       # (Optional) Load demo data
npm run dev           # Starts with nodemon on port 5000
```

**Frontend**

```bash
cd frontend
# Create a .env.local file
echo "NEXT_PUBLIC_API_URL=http://localhost:5000/api" > .env.local

npm install
npm run dev           # Starts on port 3000
```

---

## Default Seed Accounts

After running `npm run db:seed` (or `docker compose exec backend node src/database/seed.js`):

| Name | Email | Password | Role |
|---|---|---|---|
| Super Admin | admin@assetflow.com | Admin@1234 | admin |
| Raj Mehta | raj@assetflow.com | Manager@1234 | asset_manager |
| Priya Shah | priya@assetflow.com | Manager@1234 | asset_manager |
| Aditi Rao | aditi@assetflow.com | Head@1234 | department_head |
| Rohan Mehta | rohan@assetflow.com | Head@1234 | department_head |
| Sana Iqbal | sana@assetflow.com | Head@1234 | department_head |
| Arjun Nair | arjun@assetflow.com | Employee@1234 | employee |
| Meena Pillai | meena@assetflow.com | Employee@1234 | employee |
| Vikram Das | vikram@assetflow.com | Employee@1234 | employee |
| Divya Kumar | divya@assetflow.com | Employee@1234 | employee |

The seed also creates 5 departments, 5 asset categories, 15 assets (AF-0001 through AF-0015), 2 active allocations, 1 maintenance request, 3 bookings, and 1 open audit cycle.

> Change all seed passwords before deploying to any shared environment.

---

## Security

- **JWT rotation**: Access tokens expire in 15 minutes. Refresh tokens are stored as bcrypt hashes in the database and rotated on every use.
- **httpOnly cookies**: The refresh token is stored in an httpOnly, Secure, SameSite=Strict cookie — not accessible to JavaScript.
- **Password policy**: Minimum 8 characters, at least one uppercase letter, at least one digit.
- **Rate limiting**: Auth endpoints are limited to 20 requests per 15 minutes per IP in production. The general API limiter applies across all `/api` routes. Both limiters are disabled in development.
- **Input validation**: All request bodies and query parameters are validated and sanitized by express-validator before reaching controllers.
- **SQL injection**: All queries use parameterized statements via node-postgres. No string interpolation in SQL.
- **Security headers**: Helmet sets `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, and other hardening headers.
- **CORS**: Only the configured `CLIENT_URL` origin is allowed, with credentials.
- **Non-root containers**: Both the backend and frontend Docker images run as a non-root user (`assetflow`).
- **Error masking**: Stack traces and internal error messages are never sent to the client in production. Only operational `ApiError` messages are forwarded.

---

## Development Notes

**Adding a new resource**

1. Write a migration SQL block in `backend/src/database/migrate.js`
2. Create `backend/src/models/newResourceModel.js` with parameterized query functions
3. Create `backend/src/controllers/newResourceController.js`
4. Create `backend/src/routes/newResourceRoutes.js` with validation rules
5. Register the router in `backend/src/routes/index.js`
6. Add TypeScript types to `frontend/app/lib/types.ts`
7. Add API client functions to `frontend/app/lib/api.ts`
8. Create a screen in `frontend/app/screens/NewResourceScreen.tsx`
9. Add the navigation link to `frontend/app/components/AppShell.tsx`

**Response shape**

Every backend response follows one of two shapes:

```json
{ "success": true,  "data": <payload>, "message": "optional string" }
{ "success": false, "message": "error description", "errors": [] }
```

**Paginated responses**

The assets and employees list endpoints return:

```json
{ "data": { "assets": [], "total": 0, "limit": 50, "offset": 0 } }
{ "data": { "users":  [], "total": 0, "limit": 50, "offset": 0 } }
```

All other list endpoints return a plain array in `data`.

**Lint**

```bash
cd backend  && npm run lint
cd frontend && npm run lint
```
