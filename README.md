# AssetFlow

Enterprise asset management system built with Node.js, Express, PostgreSQL, React, and Next.js. AssetFlow provides comprehensive tracking, allocation, maintenance scheduling, booking, and auditing capabilities for organizational assets.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Database Setup](#database-setup)
  - [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [User Roles](#user-roles)
- [Security](#security)
- [Development](#development)
- [Deployment](#deployment)
- [License](#license)

## Features

### Core Functionality

- **Asset Management**: Register, track, and manage organizational assets with detailed metadata, categories, and lifecycle status tracking
- **Asset Allocation**: Assign assets to employees or departments with expected return dates and condition tracking
- **Transfer Management**: Request, approve, and process asset transfers between users with full audit trail
- **Resource Booking**: Reserve shared assets with calendar-based scheduling and conflict prevention
- **Maintenance Tracking**: Create, assign, and track maintenance requests with priority levels and resolution workflows
- **Audit Management**: Conduct periodic physical audits with discrepancy reporting and verification workflows
- **Activity Logging**: Comprehensive audit trail of all system actions with user attribution
- **Notifications**: Real-time user notifications for assignments, approvals, and system events
- **Reporting & Analytics**: Utilization metrics, maintenance frequency, idle assets, and departmental insights

### User Experience

- Role-based access control (Admin, Asset Manager, Department Head, Employee)
- Responsive web interface optimized for desktop and tablet
- Real-time dashboard with KPIs and recent activity
- Advanced filtering and search capabilities
- Bulk operations support
- Export functionality for reporting

## Tech Stack

### Backend

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.x
- **Database**: PostgreSQL 12+
- **Authentication**: JWT with refresh token rotation
- **Validation**: express-validator
- **Security**: Helmet, CORS, bcrypt, rate limiting
- **Logging**: Winston + Morgan

### Frontend

- **Framework**: Next.js 16.x (React 19)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 4.x
- **State Management**: React Context API
- **HTTP Client**: Native Fetch API
- **Build Tool**: Turbopack

## Architecture

AssetFlow follows a three-tier architecture:

1. **Presentation Layer** (Next.js frontend): Server-side rendered React application with client-side routing
2. **Application Layer** (Express backend): RESTful API with JWT authentication and role-based authorization
3. **Data Layer** (PostgreSQL): Normalized relational database with referential integrity and triggers

### Key Design Patterns

- **Repository Pattern**: Models abstract database operations
- **Controller Pattern**: Controllers handle HTTP request/response logic
- **Middleware Chain**: Authentication, authorization, validation, and error handling
- **Service Layer**: AuthService encapsulates authentication business logic
- **Activity Logger**: Centralized audit logging utility

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- PostgreSQL 12.x or higher
- npm or yarn package manager
- Git

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd odoo-assetflow
```

2. Install backend dependencies:

```bash
cd backend
npm install
```

3. Install frontend dependencies:

```bash
cd ../frontend
npm install
```

### Database Setup

1. Create a PostgreSQL database:

```sql
CREATE DATABASE odoo_db;
```

2. Run migrations to create tables:

```bash
cd backend
npm run db:migrate
```

3. (Optional) Seed the database with sample data:

```bash
npm run db:seed
```

### Environment Configuration

1. Copy the example environment file:

```bash
cd backend
cp .env.example .env
```

2. Configure the `.env` file with your settings:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=odoo_db
DB_USER=postgres
DB_PASSWORD=your_secure_password

# JWT Secrets (generate strong random strings)
JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here

# Application
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000
```

3. For production, set `NODE_ENV=production` and use HTTPS-enabled `CLIENT_URL`.

## Running the Application

### Development Mode

1. Start the backend server:

```bash
cd backend
npm run dev
```

The API will be available at `http://localhost:5000`

2. In a separate terminal, start the frontend:

```bash
cd frontend
npm run dev
```

The application will be available at `http://localhost:3000`

### Production Mode

1. Build the frontend:

```bash
cd frontend
npm run build
```

2. Start both services:

```bash
# Backend
cd backend
npm start

# Frontend (in another terminal)
cd frontend
npm start
```

## Project Structure

```
odoo-assetflow/
├── backend/
│   ├── src/
│   │   ├── config/          # Database and environment configuration
│   │   ├── controllers/     # Request handlers
│   │   ├── database/        # Migration and seed scripts
│   │   ├── middleware/      # Auth, validation, error handling
│   │   ├── models/          # Data access layer
│   │   ├── routes/          # API route definitions
│   │   ├── services/        # Business logic services
│   │   ├── utils/           # Utilities and helpers
│   │   ├── app.js           # Express app configuration
│   │   └── server.js        # Server entry point
│   ├── .env.example         # Environment template
│   └── package.json
│
└── frontend/
    ├── app/
    │   ├── components/      # Reusable UI components
    │   ├── lib/             # API client, types, utilities
    │   ├── screens/         # Page-level components
    │   ├── globals.css      # Global styles
    │   └── layout.tsx       # Root layout
    ├── public/              # Static assets
    └── package.json
```

## API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - Authenticate and receive tokens
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Invalidate current session
- `POST /api/auth/logout-all` - Invalidate all sessions
- `GET /api/auth/me` - Get current user profile

### Resource Endpoints

All endpoints require authentication via Bearer token in the Authorization header.

- `/api/assets` - Asset CRUD and status management
- `/api/allocations` - Asset allocation and returns
- `/api/allocations/transfers` - Transfer requests
- `/api/bookings` - Resource booking and scheduling
- `/api/maintenance` - Maintenance request management
- `/api/audits` - Audit cycle management
- `/api/departments` - Department administration
- `/api/categories` - Asset category management
- `/api/employees` - Employee management (admin only)
- `/api/notifications` - User notifications
- `/api/activity-logs` - System activity logs (admin/manager)
- `/api/reports` - Analytics and reporting
- `/api/dashboard` - Dashboard KPIs and metrics

See `backend/postman_collection.json` for detailed API documentation.

## User Roles

AssetFlow implements four role levels with hierarchical permissions:

### Admin

- Full system access
- User and role management
- Department and category configuration
- All asset operations
- Access to activity logs and audit trails

### Asset Manager

- Asset lifecycle management (create, update, allocate, retire)
- Approve/reject maintenance and transfer requests
- Access to reports and analytics
- Cannot manage users or system configuration

### Department Head

- View assets in their department
- Submit and approve transfer requests for department assets
- View reports for department
- Request maintenance
- Book resources

### Employee

- View assigned assets
- Request transfers
- Submit maintenance requests
- Book available resources
- View personal notifications

## Security

AssetFlow implements multiple security layers:

- **Authentication**: JWT-based authentication with short-lived access tokens (15 minutes) and secure refresh tokens (7 days)
- **Authorization**: Role-based access control enforced at route and controller level
- **Password Security**: Bcrypt hashing with salt rounds
- **Rate Limiting**: Request throttling to prevent brute-force attacks (disabled in development)
- **Input Validation**: express-validator for request body validation
- **SQL Injection Prevention**: Parameterized queries via node-postgres
- **XSS Protection**: Helmet middleware with secure headers
- **CSRF Protection**: SameSite cookie policy
- **Secure Cookies**: HttpOnly, Secure flags in production
- **CORS**: Configurable origin whitelist

## Development

### Code Quality

Run ESLint to check code quality:

```bash
# Backend
cd backend
npm run lint

# Frontend
cd frontend
npm run lint
```

### Database Migrations

To add new tables or modify schema:

1. Edit `backend/src/database/migrate.js`
2. Run migration: `npm run db:migrate`

### Adding New Features

1. Create model in `backend/src/models/`
2. Create controller in `backend/src/controllers/`
3. Define routes in `backend/src/routes/`
4. Register routes in `backend/src/routes/index.js`
5. Update frontend API client in `frontend/app/lib/api.ts`
6. Add TypeScript types in `frontend/app/lib/types.ts`

## Deployment

### Backend Deployment

1. Set production environment variables
2. Ensure PostgreSQL is accessible
3. Run migrations: `npm run db:migrate`
4. Build not required (Node.js runs source directly)
5. Start with process manager (PM2, systemd):

```bash
pm2 start src/server.js --name assetflow-api
```

### Frontend Deployment

1. Build production bundle:

```bash
npm run build
```

2. Serve with Node.js:

```bash
npm start
```

Or deploy to Vercel/Netlify for automatic deployments.

### Environment Checklist

- [ ] `NODE_ENV=production`
- [ ] Strong JWT secrets (min 32 characters)
- [ ] Secure database credentials
- [ ] HTTPS enabled (`CLIENT_URL` uses https://)
- [ ] Rate limiting enabled
- [ ] Database backups configured
- [ ] Error monitoring (Sentry, etc.)
- [ ] Log aggregation (CloudWatch, Datadog, etc.)

## License

Proprietary - All rights reserved
