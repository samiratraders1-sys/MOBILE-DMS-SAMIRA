# Software Requirement Specification (SRS)
## Samira Traders Distribution Management System (DMS)

---

### 1. Introduction

#### 1.1 Document Purpose
This document specifies the software requirements for the **Samira Traders Distribution Management System (DMS)**. It details functional and non-functional requirements, interfaces, and architecture tailored to fast-moving consumer goods (FMCG) distribution in Bangladesh.

#### 1.2 Intended Audience
This document is designed for system administrators, engineers, software architects, and managerial stakeholders of Samira Traders to understand and verify the scope and execution rules of the system.

#### 1.3 System Overview
Samira Traders DMS is an offline-resilient, full-stack ERP and distribution tracking platform. The core operating philosophy is:
> *"Less menu, less clicks, less data entry, maximum automation, and zero duplicate ledger entry."*

The system features real-time financial tracking, inventory management, dynamic sales rep (SR) routing, automated reconciliation, OCR physical-voucher scanning, and role-based access control (RBAC).

---

### 2. General Description

#### 2.1 Product Perspective
The system operates as a single-page web application with an integrated custom Node.js Express server backend and a persistent Firebase Firestore cloud database. For extreme network resilience, the platform incorporates offline-resilient data-layer stashing via local state syncer routines.

#### 2.2 User Classes and Characteristics
*   **Admin / Owner**: Complete system oversight, ledger modifications, investment management, and global audit capabilities.
*   **Manager / Accountant**: Stock updates, purchase ledger postings, claims management, and cash/bank reconciliation.
*   **Sales Representative (SR)**: Route visit logs, customer order booking, collection logging, and GPS location tracking.
*   **Delivery Representative (DSR)**: Delivery route fulfillments, invoice cash collection, and stock returns processing.

#### 2.3 Operating Constraints
The application runs in modern evergreen web browsers (Chrome, Safari, Edge) and must render beautifully on both mobile/handheld devices (for SRs/DSRs in the field) and high-density desktop dashboards (for owners/managers).

---

### 3. Functional Requirements

#### 3.1 Authentication & Security (RBAC)
*   **Dual-Tab Interface**: Secure and seamless tabbed toggle for logging in or registering new accounts.
*   **Fallback Persistence**: Handles missing network connectivity gracefully by storing registered credentials to `localStorage` (`local_users`) and syncing when online.
*   **Card Quick Scan**: Supports employee QR/barcode identification cards using the client camera to bypass typing.
*   **Role-Based Access Control**: Pages, action buttons, and operational metrics are dynamically restricted according to the active role (Admin, Manager, SR, DSR).

#### 3.2 Real-Time Business Dashboard (BI Engine)
*   **Total Sales Tracker**: Accumulates all delivery challans and completed sales transactions.
*   **Total Collections**: Tracks real-time cash, cheque, and mobile financial services (bKash/Nagad) receipts.
*   **Inventory Valuation**: Dynamically recalculates current warehouse asset value based on moving average costs.
*   **Outstanding Customer Dues**: Real-time accounts receivable ledger summary.
*   **Cash on Hand & Bank Balances**: Tracks liquid capital across multiple physical drawers and bank checking accounts.
*   **Pending Supplier Claims**: Logs claims against damaged items or wrong dispatches.
*   **Net Profit for the Period**: Auto-calculates revenue minus cost of goods sold (COGS) and overhead expenses.
*   **Business Investment**: Monitors initial and subsequent capital injections by partners.
*   **Data Export Suite**: Direct formatting and downloading of spreadsheet (CSV/Excel) and document (PDF) versions of any report.

#### 3.3 Inventory & Distribution (Distribution Engine)
*   **Purchase & Supply Ledger**: Direct ledger inputs without double-entry overhead.
*   **Challan & Invoice Tracking**: Real-time stock deductions upon delivery confirmation.
*   **SR Route Mapping**: Geolocation-aware route sheets mapping physical retail points to individual SRs.

#### 3.4 'Scan Document' Feature (AI OCR)
*   **Camera Integration**: Direct capture of supplier delivery receipts, invoices, or challans.
*   **OCR Engine**: Feeds raw image frames to `/api/ai/ocr` to perform optical character recognition.
*   **Automated Ledger Ingestion**: Converts OCR output directly into inventory line-items or outstanding claims to eliminate manual typing.

---

### 4. Non-Functional Requirements

#### 4.1 Performance & Real-Time Sync
*   **UI Snappiness**: Under 100ms reaction times for filters and state changes.
*   **Calculations**: Heavy KPI calculations are memoized using React `useMemo` hooks to prevent browser stutter on large datasets.

#### 4.2 Security & Data Integrity
*   No plain-text storage of credentials in remote transit.
*   Validation rules strictly block duplicate transaction IDs to protect financial audit trails.

#### 4.3 Internationalization & Usability
*   Supports bilingual elements (Bengali & English) to accommodate varying literacy levels of field delivery workers.
