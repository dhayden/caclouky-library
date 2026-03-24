# caclouky Library — Developer Guide

## Prerequisites

| Tool | Version |
|------|---------|
| .NET SDK | 8.0+ |
| SQL Server | 2019+ (on-prem) |
| Node.js | 20+ |
| Angular CLI | `npm i -g @angular/cli` |
| Git | any recent |

---

## 1. Push to GitHub

```bash
cd /path/to/caclouky-library
git init
git remote add origin https://github.com/dhayden/caclouky-library.git
git add .
git commit -m "Initial scaffold: ASP.NET Core API + Angular frontend"
git branch -M main
git push -u origin main
```

---

## 2. Configure the API

```bash
cd api
cp appsettings.Example.json appsettings.Development.json
```

Edit `appsettings.Development.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=YOUR_SQL_SERVER;Database=CacloukyLibrary;Trusted_Connection=True;TrustServerCertificate=True;"
  },
  "Jwt": {
    "Key": "your-super-secret-key-must-be-at-least-32-characters",
    "Issuer": "https://caclouky.org",
    "Audience": "https://caclouky.org",
    "ExpiryMinutes": 60
  },
  "AllowedOrigins": ["http://localhost:4200", "https://caclouky.org"]
}
```

---

## 3. Run EF migrations

```bash
cd api
dotnet tool install --global dotnet-ef   # if not already installed
dotnet ef migrations add InitialCreate
dotnet ef database update
```

---

## 4. Seed an admin user (optional SQL)

```sql
-- After first `dotnet run`, roles are seeded automatically.
-- To promote a user to Admin role, find the user ID then run:
INSERT INTO AspNetUserRoles (UserId, RoleId)
SELECT u.Id, r.Id
FROM AspNetUsers u, AspNetRoles r
WHERE u.Email = 'admin@caclouky.org' AND r.Name = 'Admin';
```

---

## 5. Run the API

```bash
cd api
dotnet run
# API available at https://localhost:5001
# Swagger UI at https://localhost:5001/swagger
```

---

## 6. Initialize and run Angular

```bash
cd web
ng new caclouky-web --routing --style=scss --standalone
ng add @angular/material
# Copy generated src/app files from this repo into the new project
npm install
ng serve
# App available at http://localhost:4200
```

---

## Roles

| Role | Can do |
|------|--------|
| Member | Browse catalog, reserve books, view own history |
| Staff | All of Member + checkout/return books, mark reservations ready |
| Admin | All of Staff + manage members, delete books, promote users |

---

## API Endpoints Summary

### Auth
| Method | URL | Auth |
|--------|-----|------|
| POST | /api/auth/register | Public |
| POST | /api/auth/login | Public |

### Books
| Method | URL | Auth |
|--------|-----|------|
| GET | /api/books?search=&genre=&page= | Public |
| GET | /api/books/:id | Public |
| GET | /api/books/genres | Public |
| POST | /api/books | Staff/Admin |
| PUT | /api/books/:id | Staff/Admin |
| DELETE | /api/books/:id | Admin only |

### Checkouts
| Method | URL | Auth |
|--------|-----|------|
| GET | /api/checkouts | Authenticated |
| POST | /api/checkouts | Staff/Admin |
| PUT | /api/checkouts/:id/return | Staff/Admin |

### Reservations
| Method | URL | Auth |
|--------|-----|------|
| GET | /api/reservations | Authenticated |
| POST | /api/reservations | Authenticated |
| PUT | /api/reservations/:id/cancel | Owner or Staff/Admin |
| PUT | /api/reservations/:id/ready | Staff/Admin |

---

## Self-hosted deployment (IIS / Linux systemd)

### IIS (Windows)
1. Publish API: `dotnet publish -c Release -o ./publish`
2. Create IIS site pointing to `./publish`
3. Set app pool to "No Managed Code"
4. Install ASP.NET Core Hosting Bundle
5. Publish Angular: `ng build --configuration production`
6. Serve `dist/caclouky-web/browser` as a separate IIS site or via nginx reverse proxy

### Linux (systemd)
```ini
# /etc/systemd/system/caclouky-api.service
[Unit]
Description=Caclouky Library API

[Service]
WorkingDirectory=/var/www/caclouky-api
ExecStart=/usr/bin/dotnet CacloukyLibrary.dll
Restart=always
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://localhost:5000

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable caclouky-api
sudo systemctl start caclouky-api
```

Configure nginx to reverse-proxy `/api` to port 5000 and serve the Angular `dist` folder for everything else.
