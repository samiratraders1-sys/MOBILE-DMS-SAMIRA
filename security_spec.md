# Security Specification for samira-traders-dms

## Data Invariants
- Products must have a name, price, and stock level >= 0.
- Sales must be linked to a date and have a valid status.
- Only authenticated users can access the distribution data.

## The Dirty Dozen (Test Cases)
1. Unauthenticated user attempts to read products. (DENY)
2. Unauthenticated user attempts to create a sale. (DENY)
3. Authenticated user attempts to delete a product without permissions. (DENY if we had roles)
4. Creating a product with a negative stock level. (DENY)
5. Creating a product without a name. (DENY)
6. Updating a product's SKU to an invalid format. (DENY)
7. Customer creation without a name. (DENY)
8. Sale record with total amount less than 0. (DENY)
9. Tampering with the `createdAt` timestamp. (DENY)
10. Anonymous users reading customer list. (DENY)
11. Updating a product's immutable ID field. (DENY)
12. Attempting to list all users' private settings (if any). (DENY)

## Test Suite Plan
Use `firestore.rules.test.ts` to verify these gates.
