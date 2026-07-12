# BridgeSmart - Full-Stack AI Job Application Automation Platform

BridgeSmart is a high-performance, modular job application automation platform designed to search for matching job roles, parse resumes using AI, calculate ATS match compatibility, and submit applications to supported portals using official integrations/APIs v2 where allowed. 

---

## 🚀 Key Features

1. **User Identity & Security**: Secure JWT authentication and storage, Google OAuth 2.0 integration, and Fernet symmetric encryption to securely store job board developer tokens/credentials.
2. **AI Resume Parsing**: Drag-and-drop resume uploader (PDF/DOCX) that extracts text and uses OpenAI (or clean rule-based regex fallback) to structure a standard professional profile.
3. **ATS Scoring & Match Validation**: AI compares user resumes against job descriptions, calculating match percentages, listing missing technologies, and recommending resume improvements.
4. **Adaptive Portal Connectors**: A pluggable, unified adapter architecture supporting:
   - Indeed
   - TechFetch
   - Infosys Careers
   - JPMorgan Chase Careers
   - Capgemini Careers
   - Randstad
   - Apex Systems
   - OneBridge
   - Judge Group
   - Experis
5. **Background Task Queue**: Utilizes Celery and Redis to process resume extraction and job applications asynchronously, ensuring the UI remains snappy.
6. **Glassmorphic Analytics Dashboard**: A premium, state-of-the-art interface displaying real-time metrics, interactive matching charts (using Recharts), audit compliance trails, and custom threshold sliders.

---

## 🛠 Tech Stack

- **Backend**: Python 3.10, FastAPI, PostgreSQL, SQLAlchemy ORM, Celery, Redis, PyPDF2, python-docx, Cryptography
- **Frontend**: React 19, Tailwind CSS, Vite, Axios, Recharts, Lucide Icons
- **AI Engine**: OpenAI API (GPT models) & local fallback pattern classifiers

---

## 📦 Getting Started & Setup

### Prerequisites
- [Docker](https://www.docker.com/) & Docker Compose installed.
- Optional: OpenAI API Key (for high-fidelity AI matching; if omitted, local classifiers calculate scores).

### 1. Environment Configurations
Create a `.env` file in the root workspace (or configure inside `docker-compose.yml` directly):
```env
OPENAI_API_KEY=your_openai_api_key_here
SECRET_KEY=your_jwt_signing_secret_here
ENCRYPTION_KEY=your_fernet_credential_encryption_key
```

### 2. Run with Docker Compose
From the root workspace, run:
```bash
docker-compose up --build
```
This command automatically spins up:
- **PostgreSQL Database** (`db`): Port 5432
- **Redis Message Broker** (`redis`): Port 6379
- **FastAPI REST Server** (`backend`): Port 8000
- **Celery Worker** (`celery_worker`): Background processing
- **Vite React UI** (`frontend`): Port 5173

Once running, access the user interface at:
👉 **[http://localhost:5173](http://localhost:5173)**

And view the Swagger API docs at:
👉 **[http://localhost:8000/docs](http://localhost:8000/docs)**

---

## 🔌 API Documentation

### Authentication
* `POST /api/v1/auth/register` - Create user account
* `POST /api/v1/auth/login` - Authenticate with email/password and obtain JWT Token
* `GET /api/v1/auth/google-login-url` - Retrieve Google OAuth redirect URL

### Resume & AI Management
* `POST /api/v1/resume/upload` - Upload PDF/DOCX resume for AI parsing and profile synchronization
* `POST /api/v1/resume/match` - Run ATS alignment analysis between parsed resume and a job post
* `GET /api/v1/resume/parsed` - Retrieve current parsed details

### Job Operations
* `POST /api/v1/jobs/search` - Query portals (Indeed, TechFetch, etc.) for jobs
* `POST /api/v1/jobs/apply` - Automate application submission (validates score against threshold)

### Dashboard & Utilities
* `GET /api/v1/dashboard/` - Fetch applicant stats, recent applications, and average score
* `GET /api/v1/dashboard/logs` - Fetch system compliance audit logs
* `POST /api/v1/cover-letter/` - Generate custom cover letter for a job

---

## 🧪 Unit Tests

We have included automated endpoint tests. To execute them inside the backend environment, run:
```bash
# Executed inside the running backend container
docker-compose exec backend pytest
```

---

## 🛡 Compliance & Security Actions
- **Terms of Service Respect**: Automated account creation or application submission is performed only on portals where active developer credentials or official enterprise tokens are present. For all other instances, the adapter logs a pending state or processes mock integrations to prevent scraping blocks.
- **Credential Encryption**: All external OAuth/portal keys saved in database profiles are symmetrically encrypted using Fernet (AES-128 in CBC mode) before persistence.
- **Audit Trails**: Every automated action (search, match, submit, login) generates an immutable entry in the `logs` table, visible on the client's compliance panel.
