# Database Schema & Entity Relationship Diagram
## Samira Traders NoSQL Firestore Schema Specifications

---

### 1. NoSQL Collection Structure

Firestore is configured as a document database where entities are stored in root-level collections. Below are the precise schemas for each collection.

#### 1.1 `users`
Represents employees, sales reps, and managers.
```json
{
  "uid": "string (Primary Identifier)",
  "name": "string (Full Name)",
  "email": "string (System email, e.g., sr_rahim@samirabms.com)",
  "username": "string (Unique login handle, e.g., sr_rahim)",
  "role": "string (admin | manager | sr | dsr)",
  "password": "string (Plaintext/encrypted fallback)",
  "createdAt": "string (ISO Timestamp)"
}
```

#### 1.2 `products` (Inventory items)
```json
{
  "id": "string (Unique identifier)",
  "name": "string (Product display name)",
  "sku": "string (Stock Keeping Unit ID)",
  "stockQty": "number (Current physical units in stock)",
  "unitPrice": "number (Selling price per unit)",
  "costPrice": "number (Average cost purchase price per unit)",
  "minStockLimit": "number (Safety stock alert value)"
}
```

#### 1.3 `sales` (Sales Transactions)
```json
{
  "id": "string (Unique invoice identifier)",
  "invoiceNo": "string (Generated invoice sequence, e.g., INV-0041)",
  "customerId": "string (Linked customer ID)",
  "customerName": "string (Denormalized name for zero-join reads)",
  "srId": "string (Sales representative who booked the sale)",
  "srName": "string",
  "items": [
    {
      "productId": "string",
      "productName": "string",
      "qty": "number",
      "price": "number",
      "total": "number"
    }
  ],
  "totalAmount": "number (Total value of invoice)",
  "discount": "number",
  "netAmount": "number (totalAmount - discount)",
  "status": "string (pending | delivered | cancelled)",
  "createdAt": "string (ISO Timestamp)"
}
```

#### 1.4 `collections` (Financial Collections/Receipts)
```json
{
  "id": "string",
  "collectionNo": "string (e.g., COL-0082)",
  "invoiceId": "string (Optional reference)",
  "customerId": "string",
  "customerName": "string",
  "srId": "string",
  "amountReceived": "number",
  "paymentMethod": "string (Cash | Cheque | bKash | Nagad)",
  "chequeNo": "string (optional)",
  "status": "string (approved | pending | returned)",
  "collectedAt": "string (ISO Timestamp)"
}
```

#### 1.5 `supplierClaims` (Damaged returns or stock shortages)
```json
{
  "id": "string",
  "supplierName": "string",
  "claimDate": "string (ISO Date)",
  "amount": "number (Claim financial value)",
  "reason": "string",
  "status": "string (pending | settled | rejected)"
}
```

#### 1.6 `accounts` (Liquid cash/bank accounts ledger balances)
```json
{
  "id": "string",
  "accountName": "string (e.g., Main Drawer Cash, DBBL Bank Account)",
  "type": "string (cash | bank | investment)",
  "balance": "number (Current real-time balance)",
  "lastTransactionDate": "string (ISO Timestamp)"
}
```

---

### 2. Entity Relationship Diagram (ERD)

Because Firestore is NoSQL, relationships are maintained using referencing keys (`customerId`, `srId`, etc.) and selective denormalization (e.g. duplicating `customerName` directly on sales invoices to minimize join lag).

```
 +-------------+               +-------------+               +------------------+
 |    users    | 1             |    sales    | 1             |   collections    |
 |  (Employees)|<--------------+ (Invoices)  +-------------->| (Cash Receipts)  |
 +------+------+               +------+------+               +--------+---------+
        | 1                           | *                             | *
        |                             |                               |
        | *                           v 1                             v 1
 +------+------+               +------+------+               +--------+---------+
 | Route Logs  |               |  Customers  |               |     Accounts     |
 | (Visits DB) |               |  (Ledgers)  |               | (Cash/Bank DB)   |
 +-------------+               +-------------+               +------------------+
```

*   **User to Sales (1:N)**: A Sales Representative (`srId` in `sales`) books multiple invoices.
*   **Customer to Sales (1:N)**: A single customer accounts receivable ledger accumulates multiple unpaid invoices.
*   **Sales to Collections (1:N)**: Customers make partial or full collection payments against outstanding invoices over time.
*   **Collections to Accounts (N:1)**: Cash collected flows into specific general ledger asset accounts (Cash Hand or Bank Balances).
