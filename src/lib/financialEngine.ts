import { LedgerTransaction } from './ledgerEngine';

export interface InvestmentParams {
  products: any[];
  stockMovements: any[];
  transactions: LedgerTransaction[];
  subDbs?: any[];
  suppliers?: any[];
  claims?: any[];
  assets?: {
    depositMoney?: number;
    furnitureTransport?: number;
    officeGodownAdvance?: number;
  };
}

export interface ProfitLossParams {
  sales: any[];
  purchases: any[];
  expenses: any[];
  stockMovements: any[];
  products: any[];
  incentives?: number;
  extraIncome?: number;
  subDbMarginProfit?: number;
}

/**
 * Total Investment Engine Calculation
 * Total Investment = Inventory Valuation (Fresh + Damage at cost) 
 *                   + Sub DB Receivables + Customer Dues + Manager Balance 
 *                   + DSR Dues + SR Dues + Unclaimed Free/Discounts + Unapproved Supplier Claims 
 *                   + Security Deposits + Furniture & Transport + Office Advance 
 *                   - Supplier/Customer Payables
 */
export const calculateTotalInvestment = (params: InvestmentParams) => {
  const { products, stockMovements, transactions, subDbs = [], claims = [], assets = {} } = params;

  // 1. Fresh & Damage Inventory Valuation at Cost
  let freshStockValuation = 0;
  let damageStockValuation = 0;

  products.forEach(p => {
    const freshQty = stockMovements
      .filter(m => m.productId === p.id && !m.isDamage)
      .reduce((sum, m) => sum + m.quantity, 0);

    const damageQty = stockMovements
      .filter(m => m.productId === p.id && m.isDamage)
      .reduce((sum, m) => sum + m.quantity, 0);

    const cost = p.costPrice || p.price || 0;
    if (freshQty > 0) freshStockValuation += (freshQty * cost);
    if (damageQty > 0) damageStockValuation += (damageQty * cost);
  });

  const totalInventoryValuation = freshStockValuation + damageStockValuation;

  // 2. Customer Dues
  let totalCustomerDues = 0;
  const customerTxs = transactions.filter(t => t.partyType === 'CUSTOMER');
  customerTxs.forEach(t => {
    if (['SALES', 'DUE', 'DEBIT', 'SHORT'].includes(t.type)) totalCustomerDues += t.amount;
    else if (['COLLECTION', 'RETURN', 'DISCOUNT', 'CREDIT', 'PAYMENT'].includes(t.type)) totalCustomerDues -= t.amount;
  });

  // 3. Sub DB Receivables
  let totalSubDbReceivables = 0;
  subDbs.forEach(s => {
    totalSubDbReceivables += (s.balance || s.due || 0);
  });

  // 4. Staff Dues (DSR, SR, Manager Short)
  let totalStaffDues = 0;
  const staffTxs = transactions.filter(t => t.partyType === 'STAFF');
  staffTxs.forEach(t => {
    if (['SHORT', 'DUE', 'DEBIT'].includes(t.type)) totalStaffDues += t.amount;
    else if (['COLLECTION', 'SALARY', 'TRANSFER', 'CREDIT', 'PAYMENT'].includes(t.type)) totalStaffDues -= t.amount;
  });

  // 5. Manager Cash in Hand
  let managerCash = 0;
  const cashTxs = transactions.filter(t => t.partyType === 'CASH_ACCOUNT');
  cashTxs.forEach(t => {
    if (['COLLECTION', 'PAYMENT', 'CREDIT'].includes(t.type)) managerCash += t.amount;
    else if (['TRANSFER', 'EXPENSE', 'DEBIT'].includes(t.type)) managerCash -= t.amount;
  });

  // 6. Unapproved Supplier Claims (Pending Supplier Adjustments)
  const pendingSupplierClaimsVal = claims
    .filter(c => c.status === 'pending')
    .reduce((sum, c) => sum + (c.amount || c.totalAmount || 0), 0);

  // 7. Fixed Assets & Advances
  const depositMoney = assets.depositMoney || 0;
  const furnitureTransport = assets.furnitureTransport || 0;
  const officeGodownAdvance = assets.officeGodownAdvance || 0;
  const totalAssetsAndAdvances = depositMoney + furnitureTransport + officeGodownAdvance;

  // 8. Less Supplier Payables (Liabilities)
  let totalSupplierPayables = 0;
  const supplierTxs = transactions.filter(t => t.partyType === 'SUPPLIER');
  supplierTxs.forEach(t => {
    if (['PURCHASE', 'CREDIT'].includes(t.type)) totalSupplierPayables += t.amount;
    else if (['PAYMENT', 'RETURN', 'DISCOUNT', 'DEBIT'].includes(t.type)) totalSupplierPayables -= t.amount;
  });

  const grossAssets = totalInventoryValuation 
                    + totalCustomerDues 
                    + totalSubDbReceivables 
                    + totalStaffDues 
                    + Math.max(0, managerCash)
                    + pendingSupplierClaimsVal 
                    + totalAssetsAndAdvances;

  const netInvestment = grossAssets - Math.max(0, totalSupplierPayables);

  return {
    freshStockValuation,
    damageStockValuation,
    totalInventoryValuation,
    totalCustomerDues,
    totalSubDbReceivables,
    totalStaffDues,
    managerCash,
    pendingSupplierClaimsVal,
    depositMoney,
    furnitureTransport,
    officeGodownAdvance,
    totalSupplierPayables,
    grossAssets,
    netInvestment
  };
};

/**
 * Profit & Loss Engine Calculation
 * Net Profit = Product Sales Profit + Sub DB Profit + Incentives + Extra Income - Total Expenses
 */
export const calculateNetProfitLoss = (params: ProfitLossParams) => {
  const { sales, expenses, products, incentives = 0, extraIncome = 0, subDbMarginProfit = 0 } = params;

  // 1. Gross Product Sales Revenue & Cost of Goods Sold (COGS)
  let grossSalesRevenue = 0;
  let cogs = 0;

  sales.forEach(s => {
    const revenue = s.totalAmount || s.grandTotal || 0;
    grossSalesRevenue += revenue;

    if (s.items && Array.isArray(s.items)) {
      s.items.forEach((item: any) => {
        const prod = products.find(p => p.id === item.productId);
        const costPrice = prod?.costPrice || prod?.price || item.unitCost || 0;
        const qty = item.qty || item.quantity || 0;
        cogs += (qty * costPrice);
      });
    }
  });

  const grossProductProfit = grossSalesRevenue - cogs;

  // 2. Total Business Expenses
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // 3. Total Income
  const totalIncome = grossProductProfit + subDbMarginProfit + incentives + extraIncome;

  // 4. Net Profit
  const netProfit = totalIncome - totalExpenses;

  return {
    grossSalesRevenue,
    cogs,
    grossProductProfit,
    subDbMarginProfit,
    incentives,
    extraIncome,
    totalIncome,
    totalExpenses,
    netProfit
  };
};

