# Project: MyAmical (Real Estate & Construction Management System)

A comprehensive management system for real estate promotion and construction monitoring, built with a modern stack featuring a React/Tauri desktop application and a Laravel backend.

## 🏗️ Architecture

The project is divided into two main parts:
1.  **Backend (`app2BackEnd`)**: A RESTful API built with Laravel, handles data persistence, authentication, and document storage.
2.  **Frontend (`app2FrontEnd`)**: A React application powered by Vite and Tailwind CSS. It is integrated with Tauri to provide a native desktop experience.

## ✨ Core Features

### 🏢 Real Estate Management
- **Terrains**: Manage land plots with detailed information.
- **Biens (Units)**: Track apartments, shops, and other units. Configure pricing and status (Available, Reserved, Sold).
- **Annex Units**: Manage storage spaces, parking, etc.

### 👥 Client Relationship Management (CRM)
- **Client Profiles**: Comprehensive data collection (CIN, ICE, Address).
- **Document Management**: Upload and manage client documents (ID copies, contracts).
- **Property Assignment**: Link clients to specific properties and track their purchase history.

### 💰 Financial Management
- **Payments & Receipts**: Record and track client payments. Generate professional receipts.
- **Invoice Builder**: Custom tool to generate invoices with exports to **PDF, Word (DOCX), and Excel (XLSX)**.
- **Charges**: Track project overhead and administrative expenses.

### 🛠️ Construction & Project Tracking
- **Contractors (Entrepreneurs)**: Database of construction firms and partners.
- **Intervenants**: Management of individual sites workers/specialists.
- **Contractor Payments**: Track financial commitments and payments to builders.
- **Progress Tracking (Suivi)**: 
    - **Gros Oeuvre**: Structural work monitoring.
    - **Finition**: Finishing touches and interior work tracking per unit.
    - **Timeline/History**: Log of all important events during construction.

### 📦 Procurement & Logistics
- **Articles & Catalog**: Inventory of construction materials.
- **Suppliers**: Manage supplier contacts and relationship.
- **Purchase Invoices**: Log invoices from suppliers and link them to payments.
- **Stock Tracking**: Real-time inventory levels with low-stock alerts and exit tracking.

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 19 + TypeScript
- **State Management**: TanStack React Query (v5)
- **Styling**: Tailwind CSS 4 + Lucide Icons
- **Desktop Runtime**: Tauri (v2)
- **Forms**: React Hook Form
- **Exporting**: `docx`, `jspdf`, `xlsx`, `html-to-image`

### Backend
- **Framework**: Laravel 10/11
- **Auth**: Laravel Sanctum (Token-based)
- **Database**: SQL (PostgreSQL/MySQL) via Eloquent ORM
- **API**: RESTful API structure with standard CRUD Resources

## 🚀 Getting Started

### Backend Setup (`app2BackEnd`)
1.  Navigate to the directory: `cd app2BackEnd`
2.  Install dependencies: `composer install`
3.  Copy `.env.example` to `.env` and configure your database.
4.  Generate app key: `php artisan key:generate`
5.  Run migrations: `php artisan migrate`
6.  Start the server: `php artisan serve`

### Frontend Setup (`app2FrontEnd`)
1.  Navigate to the directory: `cd app2FrontEnd`
2.  Install dependencies: `npm install`
3.  Configure `.env` with `VITE_API_URL` pointing to your backend.
4.  Run in dev mode: `npm run dev`
5.  Run as desktop app: `npm run tauri dev`

## 📁 Project Structure

```text
APP2/
├── app2BackEnd/          # Laravel Backend
│   ├── app/              # Models, Controllers, Policies
│   ├── database/         # Migrations and Factories
│   └── routes/api.php    # API Endpoints
├── app2FrontEnd/         # React Frontend
│   ├── src/
│   │   ├── component/    # Feature-based components
│   │   ├── lib/          # API utilities and shared logic
│   │   └── providers/    # Context providers
│   └── src-tauri/        # Tauri desktop configuration
└── scripts/              # Useful automation scripts
```

## 🔒 Security & Performance
- **Authentication**: Secure token-based auth with Sanctum.
- **Data Validation**: Strict Laravel request validation and TypeScript types.
- **Performance**: Optimized React Query caching and lazy loading of components.
- **Exporting**: Client-side generation of documents for privacy and speed.
