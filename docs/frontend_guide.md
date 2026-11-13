# Frontend Developer Guide

The `app2FrontEnd` application is built with React 19, TypeScript, and Vite. It is engineered to compile into a native desktop application utilizing Tauri v2.

## Technology Stack Use Cases

- **React 19**: Rendering complex data grids, maps, and dynamic forms.
- **Tailwind CSS 4**: Utility-first styling combined with **Lucide Icons** for a cohesive UI.
- **TanStack React Query v5**: Handles API fetching, caching, background synchronization, and loading states.
- **React Hook Form**: Form state management with strict type validation.
- **Tauri**: Bridging web technologies to the native OS OS filesystem (for DB logic, deep OS integration, or standalone execution without a browser).

## Core File Structure

Inside `src/`:
- `/components`: The bulk of the application UI. Contains granular views like:
  - `Sidebar.tsx` / `NavBar.tsx`: Application shell navigation.
  - `Clients.tsx`, `Terrains.tsx`, `Properties.tsx`: Data tables and CRUD views.
  - `FactureBuilder.tsx`: A complex custom tool for generating WYSIWYG receipts and exporting them.
  - `TerrainMap.tsx`: Digital twin and interactive SVG/polygon mapping component.
- `/lib`: Common utilities, API fetch wrappers (Axios or standard fetch with Sanctum injected headers), and generic helpers.
- `/providers`: Context boundaries, such as authentication context or theme contexts.

## Data Fetching Pattern

React Query simplifies Server State management. A typical pattern involves:
1. Defining an `axios` instance configured to pass the Sanctum Bearer token.
2. Using custom hooks (e.g., `useQuery(['clients'], fetchClients)`) inside components.
3. Using `useMutation` for `POST/PUT/DELETE` commands, followed by query invalidation (`queryClient.invalidateQueries({ queryKey: ['clients'] })`) to trigger UI updates without manual state synchronization.

## Document Exporting

One of the application's prominent features is generating native documents offline.
- Libraries like `jspdf` (for PDF), `docx` (for Word), and `xlsx` (Excel) build the files natively in the user's browser.
- `html-to-image` may supplement complex UI components being rasterized and appended to these generated documents.

## Running Locally

To work on UI changes in standard web browser:
```bash
npm install
npm run dev
```

To test the Desktop App Context:
```bash
npm run tauri dev
```
