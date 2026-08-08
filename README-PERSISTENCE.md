# ByteAI — Multi-clinic persistence

ByteAI now supports database-backed authentication, clinic isolation, durable
studies, screening history, clinical reports, and patient access.

## Roles

- **Master** — global access, clinic creation, administrator/patient creation,
  and the complete screening workspace.
- **Administrator** — access to assigned clinics, patient creation, upload,
  screening, review, and export.
- **Patient** — read-only access to their own finalized studies and reports.

Permissions are enforced by FastAPI. Hiding a frontend control is never treated
as authorization.

## Local database setup

SQLite is the zero-configuration development fallback. For the intended
PostgreSQL setup:

```powershell
Copy-Item .env.example .env
```

Set `DATABASE_URL` in `.env`:

```text
DATABASE_URL=postgresql+psycopg://byteai:password@127.0.0.1:5432/byteai
```

The application reads normal environment variables. If your shell does not load
`.env` automatically, set them before running:

```powershell
$env:DATABASE_URL="postgresql+psycopg://byteai:password@127.0.0.1:5432/byteai"
.\.venv\Scripts\python -m alembic upgrade head
```

For local SQLite development:

```powershell
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
.\.venv\Scripts\python -m alembic upgrade head
```

Important: if `DATABASE_URL` is left pointing at a temporary file such as
`migration-check.db`, login will fail against an empty database even though
`byteai-dev.db` still holds your real accounts. Clear `DATABASE_URL` before
`npm run dev:all` unless you intentionally selected PostgreSQL.

## Create the first Master

No credentials are hardcoded in source code.

```powershell
$env:BYTEAI_MASTER_EMAIL="you@example.com"
$env:BYTEAI_MASTER_PASSWORD="use-a-long-random-password"
$env:BYTEAI_MASTER_NAME="Your Name"
.\.venv\Scripts\python -m api.seed_master
```

Then start ByteAI:

```powershell
npm run dev:all
```

Sign in with the seeded email/password. Create a clinic from **Control Master**,
then create an administrator or patient and assign them to that clinic.

## Persisted workflow

`POST /api/studies/screen` performs the durable workflow:

1. Verify the authenticated user and clinic membership.
2. Save the uploaded DICOM/PNG/JPG to private storage.
3. Create a `study` linked to clinic, patient, uploader, and stored file.
4. Run the existing inference pipeline.
5. Store an immutable screening run and one finding row per condition.
6. Create the report draft and append an audit event.

Report edits, final review, and export are server-backed. Browser
`localStorage` remains only for non-clinical preferences and legacy Master
folder imports.

## Private file storage

Development defaults to:

```text
STORAGE_BACKEND=local
STORAGE_ROOT=.byteai-storage
```

PostgreSQL stores only file metadata and opaque storage keys. It does not store
DICOM/PNG/JPG bytes.

### Azure Blob Storage

Install dependencies from `requirements-web.txt`, then configure:

```text
STORAGE_BACKEND=azure
AZURE_STORAGE_CONNECTION_STRING=<secret>
AZURE_STORAGE_CONTAINER=byteai-private
```

The container must remain private. In Azure production:

- Use Azure Database for PostgreSQL with TLS required.
- Prefer Managed Identity and Key Vault over connection strings.
- Restrict database and storage networking to the application.
- Enable database backups, point-in-time restore, Blob soft delete, and
  retention policies.
- Set `SECURE_COOKIES=true` and serve only over HTTPS.
- Select an Azure region and retention policy appropriate for applicable
  patient-data and privacy requirements.

## Migrations

```powershell
# Apply
.\.venv\Scripts\python -m alembic upgrade head

# Create a future migration after changing models
.\.venv\Scripts\python -m alembic revision --autogenerate -m "describe change"

# Inspect current revision
.\.venv\Scripts\python -m alembic current
```

Production deployments must run migrations before starting the new application
version. Alembic is the application schema source of truth; startup and the
Master seed command do not create tables.

## Security notes

- Passwords use Argon2id.
- Authentication uses random, revocable, HttpOnly session cookies.
- State-changing requests require a matching CSRF cookie/header pair.
- Patients only receive finalized reports for studies assigned to their user.
- Clinic administrators cannot query another clinic.
- Local folder browsing and path screening are Master-only development tools.
- DICOM metadata can contain protected health information; never log raw
  metadata or place storage containers on public access.

## Tests

```powershell
.\.venv\Scripts\python -m pip install -r requirements-dev.txt
.\.venv\Scripts\python -m pytest -q
cd frontend
npm test
npm run build
```

The test suite verifies migrations, cross-clinic and cross-patient denial,
path import, session revocation, cleanup, canonical API payloads, and the
durable upload → screening → report → patient visibility workflow.
