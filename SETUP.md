# 🚀 Project Setup Guide

## Initial Setup

Follow these steps to get your Alzheimer's Assessment Platform up and running:

### 1. Install Dependencies

```bash
# Using Bun (recommended)
bun install

# Or using npm
npm install
```

### 2. Setup Environment Variables

#### For the Web App (`apps/web/.env.local`):
```bash
cd apps/web
cp .env.example .env.local
```

Edit `.env.local` and configure:
- `API_URL`: Your API endpoint (default: http://localhost:3001)
- `NEXTAUTH_SECRET`: Generate a random secret
- `DATABASE_URL`: PostgreSQL connection string

#### For the API (`apps/api/.env`):
```bash
cd apps/api
cp .env.example .env
```

Edit `.env` and configure:
- `PORT`: API port (default: 3001)
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Generate a strong secret key
- `JWT_REFRESH_SECRET`: Generate another strong secret key
- `CORS_ORIGIN`: Frontend URL (default: http://localhost:3000)

### 3. Setup PostgreSQL Database

Make sure you have PostgreSQL installed and running.

Create a new database:
```bash
createdb alzheimer_db
```

Update your `DATABASE_URL` in both `.env` files:
```
DATABASE_URL="postgresql://username:password@localhost:5432/alzheimer_db"
```

### 4. Initialize Prisma Database

```bash
# Generate Prisma Client
cd packages/db
bunx prisma generate

# Run migrations
bunx prisma migrate dev --name init

# Seed the database with sample data
bun run db:seed
```

This will create:
- Admin user: `admin@alzheimer-app.com` / `admin123`
- Clinician: `clinician@alzheimer-app.com` / `clinician123`
- Caregiver: `caregiver@alzheimer-app.com` / `caregiver123`
- Sample patient

### 5. Install Husky Git Hooks

```bash
# From root directory
bun run prepare
```

### 6. Start Development Servers

From the root directory, start all services:

```bash
bun run dev
```

This will start:
- 🌐 **Web App**: http://localhost:3000
- ⚡ **API**: http://localhost:3001
- 📊 **API Health Check**: http://localhost:3001/health

## Development Workflow

### Working with Prisma

```bash
# Generate Prisma Client after schema changes
cd packages/db
bunx prisma generate

# Create a new migration
bunx prisma migrate dev --name your_migration_name

# Open Prisma Studio (GUI for database)
bunx prisma studio

# Reset database (⚠️ deletes all data)
bunx prisma migrate reset
```

### Adding New Dependencies

```bash
# Add to root workspace
bun add -D <package-name>

# Add to specific app/package
cd apps/web
bun add <package-name>

# Add to specific package
cd packages/types
bun add <package-name>
```

### Running Individual Apps

```bash
# Web app only
cd apps/web
bun run dev

# API only
cd apps/api
bun run dev
```

### Code Quality

```bash
# Lint all packages
bun run lint

# Format code
bun run format

# Type check (run from each package)
cd apps/web && bunx tsc --noEmit
cd apps/api && bunx tsc --noEmit
```

### Building for Production

```bash
# Build all apps and packages
bun run build

# Build specific app
cd apps/web && bun run build
cd apps/api && bun run build
```

### Running Production Build

```bash
# Start API in production mode
cd apps/api
bun run start

# Start Next.js in production mode
cd apps/web
bun run start
```

## Project Structure

```
alzheimer-assessment-platform/
├── apps/
│   ├── web/                      # Next.js 14 Frontend
│   │   ├── app/                  # App Router pages
│   │   ├── components/           # React components
│   │   ├── hooks/                # Custom React hooks
│   │   └── lib/                  # Utilities
│   │
│   └── api/                      # Fastify API Backend
│       └── src/
│           ├── modules/          # Feature modules
│           │   ├── auth/         # Authentication
│           │   ├── patients/     # Patient management
│           │   └── assessments/  # Assessment logic
│           ├── middleware/       # Auth & RBAC middleware
│           └── utils/            # Utilities
│
├── packages/
│   ├── db/                       # Prisma database package
│   │   ├── prisma/
│   │   │   ├── schema.prisma     # Database schema
│   │   │   └── seed.ts           # Seed data
│   │   └── client.ts             # Prisma client
│   │
│   ├── types/                    # Shared TypeScript types
│   │   ├── types/                # Common types
│   │   └── scoring/              # Assessment scoring logic
│   │       ├── gds.ts            # GDS scoring
│   │       ├── npi.ts            # NPI scoring
│   │       ├── faq.ts            # FAQ scoring
│   │       └── cdr.ts            # CDR scoring
│   │
│   └── ui/                       # Shared UI components
│       ├── components/           # shadcn-based components
│       └── lib/                  # UI utilities
│
├── .husky/                       # Git hooks
├── turbo.json                    # Turborepo config
└── package.json                  # Root package.json
```

## Assessment Scoring Implementation

All assessment scoring logic is implemented in `packages/types/scoring/`:

### GDS (Geriatric Depression Scale)
- **File**: `packages/types/scoring/gds.ts`
- **Function**: `calculateGDSScore(answers)`
- **Score Range**: 0-15
- **Interpretation**: Normal (0-4), Mild (5-8), Moderate (9-11), Severe (12-15)

### NPI (Neuropsychiatric Inventory)
- **File**: `packages/types/scoring/npi.ts`
- **Function**: `calculateNPIScore(domains)`
- **12 Domains**: Frequency (1-4) × Severity (1-3)
- **Returns**: Total score + domain breakdown

### FAQ (Functional Activities Questionnaire)
- **File**: `packages/types/scoring/faq.ts`
- **Function**: `calculateFAQScore(items)`
- **Score Range**: 0-30 (higher = worse)
- **10 Items**: Rated 0-3 each

### CDR (Clinical Dementia Rating)
- **File**: `packages/types/scoring/cdr.ts`
- **Function**: `calculateCDRScore(boxScores)`
- **6 Domains**: Box scores (0, 0.5, 1, 2, 3)
- **Returns**: Global CDR score using standard algorithm

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Patients
- `GET /api/patients` - Get all patients
- `GET /api/patients/:id` - Get patient by ID
- `POST /api/patients` - Create patient
- `PUT /api/patients/:id` - Update patient
- `DELETE /api/patients/:id` - Delete patient

### Assessments
- `GET /api/assessments/patient/:patientId` - Get all assessments for patient
- `POST /api/assessments/gds` - Create GDS assessment
- `POST /api/assessments/npi` - Create NPI assessment
- `POST /api/assessments/faq` - Create FAQ assessment
- `POST /api/assessments/cdr` - Create CDR assessment
- `GET /api/assessments/:id` - Get assessment by ID

## Database Schema

Key models in `packages/db/prisma/schema.prisma`:

- **User**: Clinicians, Caregivers, Admins, Patients
- **Patient**: Patient demographics and clinical info
- **Assessment**: Base assessment model
- **GDSAssessment**: GDS-specific data
- **NPIAssessment**: NPI-specific data
- **FAQAssessment**: FAQ-specific data
- **CDRAssessment**: CDR-specific data
- **AuditLog**: Audit trail for all actions
- **RefreshToken**: JWT refresh token management

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000 (web)
lsof -ti:3000 | xargs kill -9

# Kill process on port 3001 (api)
lsof -ti:3001 | xargs kill -9
```

### Prisma Client Not Found
```bash
cd packages/db
bunx prisma generate
```

### TypeScript Errors After Installing Dependencies
```bash
# Restart TypeScript server in VS Code
# Cmd/Ctrl + Shift + P -> "TypeScript: Restart TS Server"
```

### Database Connection Issues
- Ensure PostgreSQL is running
- Verify `DATABASE_URL` in `.env` files
- Check PostgreSQL credentials

## Next Steps

1. **Implement Authentication**: Complete the auth logic in `apps/api/src/modules/auth/`
2. **Build Assessment Forms**: Create UI forms in `apps/web/` for each assessment type
3. **Patient Dashboard**: Build patient list and detail views
4. **Charts & Analytics**: Add trend charts using recharts
5. **PDF Export**: Implement PDF generation for assessment reports
6. **Testing**: Add unit tests for scoring logic
7. **Deployment**: Set up deployment to your preferred platform

## Useful Commands Reference

```bash
# Development
bun run dev                    # Start all in dev mode
bun run build                  # Build all packages
bun run lint                   # Lint all packages
bun run format                 # Format code
bun run clean                  # Clean build artifacts

# Database
cd packages/db
bunx prisma studio             # Open database GUI
bunx prisma migrate dev        # Run migrations
bunx prisma generate           # Generate Prisma Client
bun run db:seed                # Seed database

# Testing (when implemented)
bun run test                   # Run all tests
```

## Support & Documentation

- [Turborepo Docs](https://turbo.build/repo/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [Fastify Docs](https://fastify.dev/)
- [Prisma Docs](https://www.prisma.io/docs)
- [shadcn/ui Docs](https://ui.shadcn.com/)

Happy coding! 🎉