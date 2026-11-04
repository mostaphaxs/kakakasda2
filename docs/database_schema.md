# Database Schema Overview

The ImmoTrack ERP backend relies on a normalized relational database (via Eloquent ORM). Below is a high-level representation of the core schema and relationships.

## Core Entities & Relationships

### 1. Properties & Land
- **`terrains`**: The master entity representing a piece of land or an overarching construction project phase.
- **`biens`**: Individual units (Apartments, Shops, Villas) that belong to a `terrain`.
  - *Relationship*: A Terrain `hasMany` Biens.
- **`annex_units`**: Supplemental units like garages or storage rooms linked to a Bien or Terrain.

### 2. CRM & Sales
- **`clients`**: Stores primary buyer information (CIN, Name, Contacts).
- **`client_bien`** (Pivot Concept): A client can purchase multiple Biens, and a Bien can have an ownership lifecycle.
- **`factures` (Invoices)** & **`facture_items`**: 
  - *Relationship*: A Client `hasMany` Factures. A Facture `hasMany` Items.
- **`payments`**: Tracked payments linked to a Facture or a direct Bien reservation.

### 3. Construction & Project Monitoring
- **`suivi_historique`** / **`suivi_finitions`**: Logs milestones against specific `biens`.
- **`contractors`** / **`intervenants`**: Third-party businesses or independent professionals handling construction.
- **`contractor_payments`**: Tracking advances and final payouts to contractors.
- **`general_works`**: Logging large-scale tasks on the `terrain`.

### 4. Supply Chain & Expenses
- **`articles`**: The inventory catalog (e.g., Cement, Steel).
- **`suppliers`**: The vendors supplying the articles.
- **`purchase_invoices`** & **`purchase_invoice_items`**: Logging inbound costs.
  - *Relationship*: An Invoice belongs to a Supplier and maps to many Items/Articles.
- **`charges`**: Overhead day-to-day project expenses not strictly tied to a single physical asset.
- **`stock_tracking`**: Audit log of material exits and entries.

### 5. HR & Legal
- **`ouvriers`** & **`salaries`**: Worker tracking, linked to `ouvrier_missions` for daily/weekly attendance drops.
- **`contentieux`**: Legal cases or disputes tracking tied to a Client or a specific Bien.

## Soft Deletes
Critical transaction and financial tables utilize Laravel's `softDeletes` feature to ensure auditable financial history.
