# Alzheimer's Functional & Behavioral Assessment Platform

A comprehensive full-stack web application for clinicians and caregivers to record, score, and track Alzheimer's progression using standardized assessment tools.

## 🎯 Features

- **Multi-role Support**: Clinician, Caregiver, Patient, and Admin roles
- **Patient Management**: Complete CRUD operations for patient records
- **Standardized Assessments**:
  - **GDS** (Geriatric Depression Scale) - 15 questions
  - **NPI** (Neuropsychiatric Inventory) - Domain-based scoring
  - **FAQ** (Functional Activities Questionnaire) - 10 items
  - **CDR** (Clinical Dementia Rating) - Box scores to global score
- **Auto-Scoring**: Server-side automated scoring algorithms
- **Progress Dashboard**: Interactive charts showing patient trends over time
- **PDF Reports**: Generate comprehensive assessment reports
- **Audit Logs**: Complete audit trail for all assessment operations

## 🏗️ Architecture

This is a monorepo managed by **Turborepo** with the following structure:

```
alzheimer-assessment-platform/
├── apps/
│   ├── web/          # Next.js 14 App Router frontend
│   └── api/          # Fastify/Hono API backend
├── packages/
│   ├── db/           # Prisma schema and client
│   ├── ui/           # Shared React components (shadcn-based)
│   └── types/        # Shared TypeScript types and scoring logic
```

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Fastify/Hono, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Validation**: Zod
- **Authentication**: JWT with refresh tokens, RBAC
- **Charts**: Recharts
- **PDF Generation**: react-pdf / pdf-lib
- **Runtime**: Bun (dev) / Node.js LTS (production)

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0 or Bun >= 1.0.0
- PostgreSQL database
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd alzheimer-assessment-platform
```

2. Install dependencies:
```bash
bun install
# or
npm install
```

3. Set up environment variables:
```bash
# Copy example env files
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

4. Set up the database:
```bash
cd packages/db
bunx prisma migrate dev
bunx prisma generate
```

5. Start development servers:
```bash
# From root directory
bun run dev
```

This will start:
- Web app: http://localhost:3000
- API: http://localhost:3001

## 📦 Monorepo Commands

```bash
# Development
bun run dev          # Start all apps in dev mode
bun run build        # Build all apps
bun run test         # Run all tests
bun run lint         # Lint all packages
bun run format       # Format code with Prettier

# Database
cd packages/db
bunx prisma migrate dev    # Run migrations
bunx prisma studio         # Open Prisma Studio
bunx prisma generate       # Generate Prisma Client
```

## 📊 Assessment Scoring

All scoring logic is standardized and isolated in `packages/types/scoring/`:

| Assessment | Format | Scoring |
|------------|--------|---------|
| **GDS** | 15 yes/no questions | 0-15 score + interpretation |
| **NPI** | Domain frequency × severity | Total score + domain breakdown |
| **FAQ** | 10 items rated 0-3 | Total 0-30 (higher = worse) |
| **CDR** | Box scores | Global score via official algorithm |

## 🔐 Security

- Password hashing with bcrypt
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC) middleware
- Comprehensive audit logs for all assessment operations
- Input validation with Zod schemas

## 📅 Development Roadmap

- [x] Initialize Turborepo structure
- [ ] Add Prisma & database models
- [ ] Implement authentication & roles
- [ ] Patient CRUD operations
- [ ] GDS assessment flow
- [ ] NPI, FAQ, CDR assessments
- [ ] Dashboard with charts
- [ ] PDF export functionality
- [ ] Deployment scripts

## 🧪 Testing

```bash
# Run all tests
bun run test

# Run tests for specific package
cd apps/web && bun test
cd packages/types && bun test
```

## 🚢 Deployment

Documentation for deployment will be added as the project progresses.

## 📝 Code Standards

- TypeScript everywhere
- Functional, modular structure
- Reusable components
- ESLint + Prettier + Husky + lint-staged
- JSDoc documentation for key functions
- Unit tests for scoring logic

## 🔮 Future Enhancements

- AI assistant for conversational assessments
- ML module for early progression detection
- AI summary of patient trends
- Voice-based questionnaire
- Offline-first/PWA mode
- ML microservice for predictions

## 📄 License

[Your License Here]

## 👥 Contributors

[Your Name/Team]
