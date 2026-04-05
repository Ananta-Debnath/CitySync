# CitySync

A utility management system for Dhaka city covering electricity (DESCO), water (WASA), and gas (Titas). Supports consumer self-service, field worker operations, and admin/employee dashboards.

**Stack:** React · Node.js/Express · PostgreSQL · Socket.IO · Tailwind CSS

---

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- A Gemini API key (for AI assistant)
- A Cloudinary account (for avatar uploads)

---

## 1. Database Setup

Open **psql** (or pgAdmin) connected to a `postgres` superuser, then run the scripts in this order:

```bash
# Connect to psql
psql -U postgres

# Create the database
CREATE DATABASE "CitySync";
\c CitySync
```

Run the following scripts in order from the `Database/` folder:

| # | File | Purpose |
|---|------|---------|
| 1 | `Create_Table.pgsql` | Schema — all tables |
| 2 | `Functions_Triggers.pgsql` | DB functions and triggers |
| 3 | `Set_Regions.pgsql` | 20 Dhaka thanas |
| 4 | `Set_Utilities.pgsql` | DESCO / WASA / Titas utilities |
| 5 | `Set_Payment_Methods.pgsql` | Banks and mobile banking |
| 6 | `Entry.pgsql` | Core reference data |

```bash
# Example — run each file from the Database/ directory
psql -U postgres -d CitySync -f Create_Table.pgsql
psql -U postgres -d CitySync -f Functions_Triggers.pgsql
psql -U postgres -d CitySync -f Set_Regions.pgsql
psql -U postgres -d CitySync -f Set_Utilities.pgsql
psql -U postgres -d CitySync -f Set_Payment_Methods.pgsql
psql -U postgres -d CitySync -f Entry.pgsql
```

### Optional: Seed sample data

The `Database/DATA/` folder contains a full dataset (8 consumers, 2 employees, 25 field workers, 24 months of readings, bills, payments, complaints). Run in this order:

```bash
cd Database/DATA
psql -U postgres -d CitySync -f 00_regions.pgsql
psql -U postgres -d CitySync -f 01_reference.pgsql
psql -U postgres -d CitySync -f 02_utilities.pgsql
psql -U postgres -d CitySync -f 03_tariffs.pgsql
psql -U postgres -d CitySync -f 04_people.pgsql
psql -U postgres -d CitySync -f 05_meters_connections.pgsql
psql -U postgres -d CitySync -f 06_readings_usage.pgsql
psql -U postgres -d CitySync -f 07_bills_payments.pgsql
psql -U postgres -d CitySync -f 08_prepaid.pgsql
psql -U postgres -d CitySync -f 09_applications.pgsql
psql -U postgres -d CitySync -f 10_complaints.pgsql
```

> See `Database/DATA/00_README.sql` for a full description of the seed data, key IDs, and verification queries.

---

## 2. Backend Setup

```bash
cd Backend
npm install
cp .env.example .env
```

Edit `.env` with your values:

```env
PORT=5000

DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=CitySync

JWT_SECRET=your_jwt_secret

GEMINI_API_KEY=your_gemini_api_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_secret

# Set to true and fill DATABASE_URL to use Neon (cloud Postgres) instead
USE_NEON=false
DATABASE_URL=
```

Start the server:

```bash
npm run dev      # development (nodemon)
npm start        # production
```

Backend runs at `http://localhost:5000`.

---

## 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
```

Edit `.env`:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_CLOUDINARY_CLOUD_NAME=your_cloud_name
REACT_APP_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

Start the app:

```bash
npm start
```

Frontend runs at `http://localhost:3000`.

---

## Default Accounts (seed data)

All seed accounts share the password **`12345678`**.

| Role | Email | Password |
|------|-------|----------|
| Consumer (showcase) | rahim.uddin@gmail.com | 12345678 |
| Employee | `jahangir.kabir@desco.gov.bd` | 12345678 |
| Employee | `salma.chowdhury@desco.gov.bd` | 12345678 |
| Field Worker | `delwar.mia@desco.gov.bd` *(+ 24 others)* | 12345678 |
