# API Reference

The ImmoTrack ERP backend is a RESTful API built on Laravel, exposing structured resources. Authentication is handled via **Laravel Sanctum**.

## Base Path
All API routes are prefixed by `/api` (default Laravel behavior) or consumed direct assuming `/` if using the front-controller approach. The authentication routes include:
- `POST /login`: Authenticate and obtain Sanctum token.
- `GET /clients/portal-login/{cin}`: Specialized lookup route.

## Core Resources


For most entities, standard **CRUD (Create, Read, Update, Delete)** operations are supported:

| Method   | Path                  | Description                     |
| -------- | --------------------- | ------------------------------- |
| `GET`    | `/{resource}`         | List all items (with pagination) |
| `POST`   | `/{resource}`         | Create a new item               |
| `GET`    | `/{resource}/{id}`    | Get details of a single item     |
| `PUT`    | `/{resource}/{id}`    | Update an existing item         |
| `DELETE` | `/{resource}/{id}`    | Delete an item                  |

### Available Standard Resources
- `/terrains` : Land or overall project plots.
- `/clients` : Client CRM profiles.
- `/charges` : Overhead and expense tracking.
- `/contractors` : Construction agencies.
- `/intervenants` : Handymen, supervisors.
- `/articles` : Materials inventory.
- `/suppliers` : Material providers.
- `/factures` : Client billing and invoices.
- `/ouvriers` & `/salaries` : Worker and HR management.

## Specialized Endpoints

### Biens (Property Units)
- `GET/POST/PUT/DELETE /biens`
- **Suivi (Progress Monitoring)**:
  - `GET /biens/{id}/suivi`: View construction progress.
  - `POST /biens/{id}/suivi/gros-oeuvre`: structural updates.
  - `POST /biens/{id}/suivi/finition`: interior/finish updates.

### Digital Twin / Maps
- `GET /terrain-map/{terrainId}`: Get vector data (SVG/Polygons) mapped to the terrain.
- `PUT /terrain-map/{terrainId}`: Update the plotted regions.

### Documents & Media
- `POST /clients/{id}/documents`: Upload a client document (CIN, contracts).
- `DELETE /clients/{id}/documents/{docId}`: Remove a client document.

*Note: Document serving often bypasses Sanctum via the `/sidecar-serve/{path}` endpoint to allow Tauri client fetching with standard HTML requests if necessary.*

### Billing / Invoices / Payments
- `POST /payments/{id}/cancel` & `/associate`: Payment lifecycle management.
- `apiResource('factures', ...)`: Standard interaction for full invoices.

## Request/Response Format
All payload submissions must use `application/json` (or `multipart/form-data` for file uploads). Standard Laravel responses include:
- `200 OK` or `201 Created` for success.
- `422 Unprocessable Entity` for Validation errors.
- `401 Unauthorized` / `403 Forbidden` for permissions.


