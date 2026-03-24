# caclouky Library App

Full-stack library management system for [caclouky.org](https://caclouky.org).

## Stack
- **Backend**: ASP.NET Core 8, Entity Framework Core, SQL Server
- **Frontend**: Angular 17+, Angular Material
- **Auth**: ASP.NET Core Identity + JWT
- **Hosting**: Self-hosted / on-prem

## Repo structure
```
/api    → ASP.NET Core Web API
/web    → Angular SPA
/.github/workflows → CI/CD
```

## Quick start

### API
```bash
cd api
cp appsettings.Example.json appsettings.Development.json
# Edit connection string in appsettings.Development.json
dotnet ef database update
dotnet run
```

### Web
```bash
cd web
npm install
ng serve
```
