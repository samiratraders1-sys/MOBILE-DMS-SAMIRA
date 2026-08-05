# High-Level System Architecture Design
## Samira Traders DMS Architecture Reference

---

### 1. Overview Diagram

```
                       +---------------------------------------+
                       |             Web Client                |
                       |       (React / Tailwind CSS / Vite)   |
                       +-------------------+-------------------+
                                           |
                    +----------------------+----------------------+
                    |                                             |
                    v (HTTPS / WebSockets)                        v (Offline Stacking)
        +-----------+-----------+                     +-----------+-----------+
        |   Express Server API  |                     |  Browser local_users  |
        |      (server.ts)      |                     |    & LocalStorage     |
        +-----------+-----------+                     +-----------------------+
                    |
                    v (Admin SDK / Auth APIs)
        +-----------+-----------+
        |   Firebase Cloud      |
        |  (Firestore / Auth)   |
        +-----------------------+
```

---

### 2. Architecture Layers

#### 2.1 Front-End Layer (Single Page Application)
*   **Engine**: React 18+ with Vite compiler.
*   **Styling**: Utility-first CSS using Tailwind CSS and lightweight custom fonts for premium Bengali readability.
*   **State Management**: Real-time reactive data hooks binding directly to Firestore collections.
*   **Animation**: `motion` layout and micro-transitions from `motion/react` to provide fluid transitions between operational screens.

#### 2.2 Offline Resilience Layer (LocalStorage Syncer)
*   To ensure zero disruption in weak-network distribution hubs, the application maintains a local mirror of critical records.
*   **Registration Stashing**: The client stores user credentials locally in `local_users` on registration. This ensures that in an offline or iframe network-restricted context, logins function instantly.
*   **Transaction Syncing**: Active orders are cached inside local queue arrays until connectivity is restored, preventing any data loss of distribution activities.

#### 2.3 Server Middleware Layer (NodeJS Express)
*   Runs on Node.js inside scalable Cloud Run container environments.
*   Exposes secure `/api/ai/ocr` server-side endpoints which safely parse scanner streams using Gemini API without exposing credentials.
*   Vite is embedded as development middleware, while production serving is handled from bundled static distribution builds.

#### 2.4 Cloud Database & Authentication (Firebase)
*   **Firebase Authentication**: Secures customer identities with built-in OAuth support.
*   **Cloud Firestore**: Highly parallel, real-time NoSQL database holding collections for `users`, `products`, `sales`, `collections`, `reconciliation`, and `claims`.

---

### 3. Core Process Flows

#### 3.1 Offline Resilient Authentication Flow
1.  **User Inputs Credentials**: Form is filled on Login/Registration tab.
2.  **Registration**:
    *   Creates a credentials record.
    *   Attempts Firebase Auth registration. If blocked or offline, auto-generates a secure local user ID.
    *   Saves newUser payload directly into `localStorage["local_users"]`.
3.  **Login**:
    *   Client scans `local_users` first. If a match exists, user gains instant access.
    *   If missing locally, client queries live Firestore and logs in via Firebase SDK.

#### 3.2 AI Document Scanning & Ingestion Flow
1.  **Capture**: User launches Scan Document tab, activating the device camera.
2.  **Transfer**: Captured frame is sent to server endpoint `/api/ai/ocr` as base64 payload.
3.  **Processing**: Express server proxies the frame to Gemini API with targeted instructions to extract invoice totals, invoice date, supplier name, and product table.
4.  **Ingestion**: Structured JSON returns to React client, pre-populating inventory purchase items.
