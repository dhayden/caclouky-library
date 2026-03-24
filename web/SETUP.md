# Angular Frontend Setup

## Initialize the project (run once)

```bash
cd web
ng new caclouky-web --routing --style=scss --standalone
ng add @angular/material

# Generate core structure
ng g module core
ng g module features/catalog
ng g module features/member
ng g module features/admin

# Services
ng g service core/services/auth
ng g service core/services/books
ng g service core/services/checkouts
ng g service core/services/reservations

# Guards
ng g guard core/guards/auth
ng g guard core/guards/role

# Key components
ng g component features/catalog/book-list
ng g component features/catalog/book-detail
ng g component features/catalog/book-search
ng g component features/member/my-checkouts
ng g component features/member/my-reservations
ng g component features/admin/admin-dashboard
ng g component features/admin/manage-books
ng g component features/admin/manage-members
ng g component features/admin/manage-checkouts
ng g component auth/login
ng g component auth/register
```

## environment.ts

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000/api'
};
```

## environment.prod.ts

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://caclouky.org/api'
};
```
