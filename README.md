# HRM SaaS Platform

A comprehensive, multi-tenant Human Resource Management (HRM) system built with microservices architecture.

## Architecture Overview

This platform consists of **27 microservices** that handle all aspects of HR management:

```
                                    ┌─────────────────┐
                                    │   Frontend      │
                                    │   (React/Vite)  │
                                    └────────┬────────┘
                                             │
                                    ┌────────▼────────┐
                                    │   API Gateway   │
                                    │    (Port 3000)  │
                                    └────────┬────────┘
                                             │
        ┌────────────────────────────────────┼────────────────────────────────────┐
        │                                    │                                    │
┌───────▼───────┐  ┌───────▼───────┐  ┌─────▼─────┐  ┌───────▼───────┐  ┌───────▼───────┐
│ Auth Service  │  │Tenant Service │  │ Employee  │  │  Attendance   │  │ Leave Service │
│  (Port 3001)  │  │  (Port 3002)  │  │  Service  │  │   Service     │  │  (Port 3005)  │
└───────────────┘  └───────────────┘  │(Port 3003)│  │  (Port 3004)  │  └───────────────┘
                                      └───────────┘  └───────────────┘
```

## Tech Stack

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express.js 5
- **Language**: TypeScript
- **Database**: MongoDB 7.0
- **Message Broker**: RabbitMQ
- **Cache**: Redis 7
- **Containerization**: Docker & Docker Compose

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **State Management**: Redux Toolkit
- **UI Library**: Material-UI (MUI)
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod
- **i18n**: i18next

## Services

| Service | Port | Description |
|---------|------|-------------|
| API Gateway | 3000 | Request routing, authentication, rate limiting |
| Auth Service | 3001 | JWT authentication, user management, 2FA |
| Tenant Service | 3002 | Multi-tenant management, subscriptions |
| Employee Service | 3003 | Employee CRUD, departments, shifts |
| Attendance Service | 3004 | Check-in/out, shift tracking |
| Leave Service | 3005 | Leave requests, approvals, balances |
| Payroll Service | 3006 | Salary processing, tax calculations |
| Notification Service | 3007 | Email, SMS, in-app notifications |
| Reports Service | 3008 | Analytics dashboards, custom reports |
| WebSocket Service | 3009 | Real-time communications |
| Chat Service | 3010 | Internal messaging system |
| Analytics Service | 3011 | BI, KPIs, predictions |
| Document Service | 3012 | S3 storage, versioning, OCR |
| Integration Service | 3013 | Webhooks, API keys, third-party |
| Engagement Service | 3014 | Surveys, feedback, OKRs, recognition |
| AI Chatbot Service | 3015 | HR Assistant, NLP, OpenAI |
| AI/ML Service | 3016 | Resume parsing, skill matching |
| Workforce Service | 3017 | Headcount planning, succession |
| Recruitment Service | 3018 | Job postings, candidates, interviews |
| Localization Service | 3019 | Languages, currencies, translations |
| Benefits Service | 3020 | Benefits enrollment, wellness |
| Onboarding Service | 3021 | Employee onboarding workflows |
| Compliance Service | 3022 | Policy tracking, training, permits |
| Expense Service | 3023 | Expense reports, reimbursements |
| Timesheet Service | 3024 | Project time tracking, billing |
| Asset Service | 3025 | Equipment/asset management |
| Grievance Service | 3026 | Employee grievance handling |

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development)
- Git

### 1. Clone the Repository

```bash
git clone <repository-url>
cd HRM
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### 4. Access the Application

- **Frontend**: http://localhost:5173
- **API Gateway**: http://localhost:3000
- **RabbitMQ Management**: http://localhost:15672

### Default Credentials

After seeding the database:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@hrm.com | Admin@123 |
| Tenant Admin | admin@acme.com | Admin@123 |
| HR Manager | hr@acme.com | Hr@123456 |
| Employee | john.doe@acme.com | Employee@123 |

## Development

### Local Development Setup

```bash
# Install dependencies for a service
cd services/auth-service
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

### Database Seeding

```bash
node seed-all-dbs.js
```

## API Documentation

### Authentication

All protected endpoints require a Bearer token:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@hrm.com", "password": "Admin@123"}'
```

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/auth` | Authentication (login, register, refresh) |
| `/api/tenants` | Tenant management |
| `/api/employees` | Employee management |
| `/api/departments` | Department management |
| `/api/attendance` | Attendance tracking |
| `/api/leaves` | Leave management |
| `/api/payroll` | Payroll processing |
| `/api/recruitment` | Recruitment pipeline |
| `/api/benefits` | Benefits management |
| `/api/expenses` | Expense management |
| `/api/timesheets` | Timesheet tracking |
| `/api/documents` | Document management |
| `/api/chat` | Internal messaging |
| `/api/chatbot` | AI HR Assistant |

## Project Structure

```
HRM/
├── services/                 # Microservices
│   ├── api-gateway/         # API Gateway
│   ├── auth-service/        # Authentication
│   ├── employee-service/    # Employee management
│   └── ...                  # Other services
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── features/       # Redux slices
│   │   ├── services/       # API services
│   │   └── i18n/           # Internationalization
├── shared/                  # Shared types and utilities
├── tests/                   # Integration tests
├── docker-compose.yml       # Docker orchestration
└── .env.example            # Environment template
```

## Features

### Core HR
- Employee lifecycle management
- Department & organization structure
- Attendance tracking with geolocation
- Leave management with approval workflows
- Payroll processing with tax calculations

### Talent Management
- Recruitment pipeline
- Performance reviews (360-degree feedback)
- Training & development
- Succession planning

### Employee Experience
- Self-service portal
- AI-powered HR chatbot
- Internal chat & collaboration
- Surveys & feedback
- Recognition & rewards

### Compliance & Administration
- Policy management
- Document management with versioning
- Audit logging
- GDPR compliance tools
- Multi-language support

## Testing

```bash
# Run integration tests
cd tests
npm install
npm test
```

## Security

- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Multi-tenant data isolation
- Rate limiting on API endpoints
- Input validation and sanitization
- Audit logging for sensitive operations

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
