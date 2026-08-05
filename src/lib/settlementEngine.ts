import { recordStockMovement } from './inventoryEngine';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

export interface DSRSettlementInput {
  summaryId: string;
  dsrId: string;
  dsrName: string;
  routeId: string;
  routeName?: string;
  date: string;
  assignedItems: { productId: string; productName: string; qty: number; unitPrice: number; unitCost: number; supplierId?: string }[];
  freshReturns: { productId: string; qty: number; unitPrice: number; unitCost: number }[];
  damageReturns: { productId: string; qty: number; unitPrice: number; unitCost: number }[];
  freeItems: { productId: string; qty: number; unitCost: number; supplierId?: string }[];
  productDiscounts: { productId: string; discountAmount: number; supplierId?: string }[];
  expenses: { category: string; amount: number; notes?: string }[];
  customerDues: { customerId: string; customerName: string; supplierId: string; supplierName?: string; amount: number; invoiceNo?: string }[];
  collectedCash: number;
  managerId: string;
  managerName?: string;
}

export const processMasterDSRSettlement = async (input: DSRSettlementInput) => {
  const companyId = localStorage.getItem("companyId") || undefined;
  const timestamp = Date.now();

  // 1. Calculate Gross Sales Value (Assigned Stock Value - Fresh Returns Value)
  let grossAssignedVal = 0;
  let freshReturnVal = 0;

  input.assignedItems.forEach(item => {
    grossAssignedVal += (item.qty * item.unitPrice);
  });

  input.freshReturns.forEach(item => {
    freshReturnVal += (item.qty * item.unitPrice);
  });

  const netStockOutVal = grossAssignedVal - freshReturnVal;

  // 2. Calculate Total Deductions
  const damageVal = input.damageReturns.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
  const freeItemsVal = input.freeItems.reduce((sum, item) => sum + (item.qty * item.unitCost), 0);
  const totalDiscountsVal = input.productDiscounts.reduce((sum, d) => sum + d.discountAmount, 0);
  const totalExpensesVal = input.expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalCustomerDuesVal = input.customerDues.reduce((sum, c) => sum + c.amount, 0);

  const totalDeductions = damageVal + freeItemsVal + totalDiscountsVal + totalExpensesVal + totalCustomerDuesVal;

  // 3. Net Cash Payable by DSR
  const netCashPayable = netStockOutVal - totalDeductions;
  const shortAmount = netCashPayable - input.collectedCash;

  // 4. Record Inventory Stock Movements
  // Fresh Returns -> Stock In (+)
  for (const item of input.freshReturns) {
    if (item.qty > 0) {
      await recordStockMovement(item.productId, 'FRESH_RETURN', item.qty, input.summaryId, false, item.unitCost, item.unitPrice);
    }
  }

  // Damage Returns -> Stock In (+ to Damage Stock)
  for (const item of input.damageReturns) {
    if (item.qty > 0) {
      await recordStockMovement(item.productId, 'DAMAGE_RETURN', item.qty, input.summaryId, true, item.unitCost, item.unitPrice);
    }
  }

  // 5. Create Ledger Postings
  const txsRef = collection(db, "transactions");

  // A) DSR Short Due (if any) -> DSR Ledger
  if (shortAmount > 0) {
    await addDoc(txsRef, {
      partyId: input.dsrId,
      partyType: 'STAFF',
      type: 'SHORT',
      amount: shortAmount,
      description: `DSR Settlement Short Balance (${input.routeName || 'Route'}) - Summary #${input.summaryId}`,
      ref: input.summaryId,
      date: input.date,
      timestamp,
      createdBy: input.dsrId,
      createdByName: input.dsrName,
      companyId
    });
  }

  // B) Customer Dues -> Customer Ledger (Supplier-wise split)
  for (const due of input.customerDues) {
    if (due.amount > 0) {
      await addDoc(txsRef, {
        partyId: due.customerId,
        partyType: 'CUSTOMER',
        type: 'DUE',
        amount: due.amount,
        description: `Credit Sale via DSR ${input.dsrName} (${input.routeName || ''}) - Invoice #${due.invoiceNo || input.summaryId}`,
        ref: input.summaryId,
        date: input.date,
        timestamp,
        supplierId: due.supplierId,
        supplierName: due.supplierName || 'General',
        createdBy: input.dsrId,
        createdByName: input.dsrName,
        companyId
      });
    }
  }

  // C) Expenses -> Expense Ledger
  for (const exp of input.expenses) {
    if (exp.amount > 0) {
      await addDoc(txsRef, {
        partyId: input.dsrId,
        partyType: 'STAFF',
        type: 'EXPENSE',
        amount: exp.amount,
        description: `DSR Expense: ${exp.category} ${exp.notes ? `(${exp.notes})` : ''}`,
        ref: input.summaryId,
        date: input.date,
        timestamp,
        createdBy: input.dsrId,
        createdByName: input.dsrName,
        companyId
      });
    }
  }

  // D) Cash Collection -> Manager Cash Account (Pending Admin Approval)
  if (input.collectedCash > 0) {
    await addDoc(txsRef, {
      partyId: input.managerId,
      partyType: 'CASH_ACCOUNT',
      type: 'COLLECTION',
      amount: input.collectedCash,
      description: `DSR Cash Settlement Collection from ${input.dsrName}`,
      ref: input.summaryId,
      date: input.date,
      timestamp,
      createdBy: input.dsrId,
      createdByName: input.dsrName,
      approved: false,
      companyId
    });
  }

  return {
    grossAssignedVal,
    freshReturnVal,
    netStockOutVal,
    damageVal,
    freeItemsVal,
    totalDiscountsVal,
    totalExpensesVal,
    totalCustomerDuesVal,
    netCashPayable,
    collectedCash: input.collectedCash,
    shortAmount
  };
};

