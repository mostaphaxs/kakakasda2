# ImmoTrack ERP Architecture Overview

ImmoTrack ERP is split into two distinct tiers: a Laravel 10/11 RESTful Backend and a React (Vite) + Tauri Frontend.

## 1. System Components

### 1.1 Backend (`app2BackEnd`)
- **Framework:** Laravel 10/11
- **Language:** PHP 8+
- **Database:** PostgreSQL or MySQL
- **Responsibilities:** 
  - Data persistence via Eloquent ORM.
  - Exposing REST API endpoints.
  - Business logic validation.
  - Authentication (Laravel Sanctum).

### 1.2 Frontend (`app2FrontEnd`)
- **Framework:** React 19 (TypeScript) with Vite
- **UI Library:** Tailwind CSS 4, Lucide Icons
- **State/Caching:** TanStack React Query (v5)
- **Desktop Wrapper:** Tauri (v2) provides a native desktop wrapper using Rust.
- **Responsibilities:**
  - Consuming the REST APIs.
  - Handling application state and UI rendering.
  - Client-side export functionality (`docx`, `jspdf`, `xlsx`).

## 2. Authentication & Security
- **Laravel Sanctum:** The application relies on Sanctum for SPA API authentication. Token-based auth is implemented for secure communication between the desktop client and backend endpoint.
- **Validation:** Type validation is enforced via TypeScript interfaces matching the Laravel validation rules.

## 3. Data Flow
1. User interacts with the **React Interface** (via Tauri desktop window).
2. The UI triggers a mutation or query via **React Query**.
3. A REST HTTP request is sent using fetch/axios to the **Laravel API**.
4. Laravel processes the request, interacts with the **Database**, and returns JSON.
5. React Query caches and updates the state. UI reflects the newest data.
