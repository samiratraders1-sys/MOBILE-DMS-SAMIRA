# Business Rules & Accounting Rules
## Samira Traders Enterprise Operations Guide

---

### 1. Business & Distribution Rules

#### 1.1 Distribution & Order Cycle
*   **SR Territory Locking**: Sales Representatives (SRs) must only book orders for customers belonging to their assigned territory/route on the designated route day.
*   **Delivery Credit Limit**: If a customer's total outstanding balance exceeds their authorized credit limit, the system blocks the creation of new sales invoices until a collection receipt is approved.
*   **Stock Lock Control**: The system strictly forbids back-dated sales orders that exceed the available stock. Inventory quantity cannot fall below zero.

#### 1.2 Sales Rep (SR) Collection Cycles
*   **Daily Cash Up**: Field SRs must physically deposit all cash and cheque collections to the manager at the warehouse before 7:00 PM daily.
*   **Pending Verification**: Collections are marked as `pending` until verified by the accountant, upon which they transition to `approved` and instantly reduce customer dues.

---

### 2. Accounting & Ledger Rules

Samira Traders operates under the fundamental GAAP double-entry framework, simplified into a **"Zero-Duplication"** automatic transaction poster.

#### 2.1 Double-Entry Transaction Mapping Table

| Real-world System Event | Primary Ledger Debited | Secondary Ledger Credited | Impact on Real-Time Dashboard |
| :--- | :--- | :--- | :--- |
| **Sales Invoice Created** | Accounts Receivable (Dues) | Sales Income | Total Sales increases; Dues increases |
| **DSR Cash Collection Approved** | Cash on Hand / Bank | Accounts Receivable (Dues) | Cash/Bank increases; Dues decreases; Total Collections increases |
| **Supplier Claim Filed** | Supplier Claims Receivable | Inventory Asset Value | Claims increases; Inventory decreases |
| **Partner Capital Injected** | Bank / Cash on Hand | Partner Capital (Investment) | Cash/Bank increases; Investment increases |
| **Delivery Expenses Logged** | Delivery Expenses | Cash on Hand | Cash decreases; Net Profit decreases |

#### 2.2 Dashboard Accounting Formulas

Real-time calculation formulas are strictly automated without duplicative manual reporting:

1.  **Current Inventory Asset Value**:
    $$\text{Inventory Value} = \sum_{i} (\text{stockQty}_{i} \times \text{costPrice}_{i})$$

2.  **Period Net Profit**:
    $$\text{Net Profit} = \text{Total Revenue (Delivered Sales)} - \text{Cost of Goods Sold (COGS)} - \text{Overhead Expenses}$$
    *Where $\text{COGS} = \sum (\text{Qty Sold} \times \text{costPrice})$*

3.  **Accounts Receivable (Outstanding Dues)**:
    $$\text{Outstanding Dues} = \sum (\text{Invoice Net Amounts}) - \sum (\text{Approved Cash Receipts})$$

4.  **Liquid Funds**:
    $$\text{Liquid Capital} = \text{Cash Ledger Balance} + \text{Bank Ledger Balances}$$
