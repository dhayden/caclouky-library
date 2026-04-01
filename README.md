# Caclouky Library

A church library management system built with ASP.NET Core 9, Angular 18, and SQL Server.

## Features

- **Book catalog** with search, genre filtering, and cover art
- **Role-based access** — Admin, Minister, and General Assembly roles
- **Restricted books** — Minister-only titles hidden from General Assembly members
- **Reservations** — members can reserve books and manage their queue
- **Checkouts** — admin/minister staff can check books in and out with due dates and late fees
- **Member management** — admins can create and manage member accounts
- **JWT authentication** with secure, stateless sessions

## Tech Stack

| Layer    | Technology                                              |
|----------|---------------------------------------------------------|
| API      | ASP.NET Core 9, Entity Framework Core, ASP.NET Identity |
| Frontend | Angular 18 (SSR), Angular Material                     |
| Database | SQL Server (Express for local dev)                     |
| Auth     | JWT Bearer tokens, role-based policies                 |
| Deploy   | Docker Compose, nginx reverse proxy                    |

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Git

### Run with Docker

```bash
git clone https://github.com/dhayden/caclouky-library.git
cd caclouky-library

# Copy and fill in your secrets — never commit .env
cp .env.example .env
# Edit .env: set SA_PASSWORD and JWT_KEY before continuing

docker compose up --build
```

The app will be available at **http://localhost**.

### Local Development (without Docker)

**Requirements:** .NET 9 SDK, Node.js 20+, SQL Server Express

1. **API**
   ```bash
   cd api
   cp appsettings.Example.json appsettings.json
   # Edit appsettings.json — set your connection string and JWT config
   dotnet run
   # Runs on http://localhost:5000
   ```

2. **Frontend**
   ```bash
   cd web/caclouky-web
   npm install
   npx ng serve --port 4201
   # Runs on http://localhost:4201
   ```

## Configuration

All secrets live in a `.env` file (gitignored — never committed). Copy `.env.example` to get started:

| Variable      | Description                                           |
|---------------|-------------------------------------------------------|
| `SA_PASSWORD` | SQL Server SA password (strong password required)     |
| `JWT_KEY`     | JWT signing secret (minimum 32 characters)            |
| `JWT_ISSUER`  | Token issuer (e.g. `https://caclouky.org`)            |
| `JWT_AUDIENCE`| Token audience (e.g. `https://caclouky.org`)         |
| `APP_URL`     | Public app URL used for CORS                          |

## Roles

| Role             | Access                                                    |
|------------------|-----------------------------------------------------------|
| `Admin`          | Full access — member management, all books, checkouts     |
| `Minister`       | All books including restricted, can manage checkouts      |
| `GeneralAssembly`| Non-restricted books only, self-service reservations      |

## Project Structure

```
caclouky-library/
├── api/                    # ASP.NET Core 9 Web API
│   ├── Controllers/
│   ├── Models/
│   ├── Data/
│   └── Migrations/
├── web/caclouky-web/       # Angular 18 frontend
│   └── src/app/
│       ├── core/           # Auth service, interceptors, guards
│       └── features/       # Catalog, admin, member pages
├── docker-compose.yml
├── .env.example            # Secret template — copy to .env
└── .gitignore              # .env and appsettings.json are excluded
```
