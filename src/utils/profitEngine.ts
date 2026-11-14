export interface ProfitEngineInput {
  sales: any[];
  payments: any[];
  summaries: any[];
  products: any[];
  subDbShipments: any[];
  expenses?: any[]; // optional new shared expenses collection
  startDate?: string;
  endDate?: string;
}

export interface ProfitMetrics {
  salesRevenue: number;
  cogs: number;
  salesMargin: number;         // (Sales Revenue - COGS)
  subDepotCommission: number;  // Commission from sub-db shipments
  otherIncome: number;         // Other income from payments
  totalExpenses: number;       // Combined expenses
  netProfit: number;           // (Sales Margin + Sub Depot Commission + Other Income) - Total Expenses
}

/**
 * ProfitEngine calculates the real-time net profitability metrics using the formula:
 * Net Profit = (Sales Margin + Sub Depot Commission + Other Income) - Total Expenses
 */
export function calculateNetProfit({
  sales = [],
  payments = [],
  summaries = [],
  products = [],
  subDbShipments = [],
  expenses = [],
  startDate,
  endDate
}: ProfitEngineInput): ProfitMetrics {
  
  // 1. Filter POS sales
  const filteredSales = sales.filter(s => {
    if (s.status === "rejected" || s.approved === false) return false;
    if (startDate && s.date < startDate) return false;
    if (endDate && s.date > endDate) return false;
    return true;
  });

  // 2. Filter settled DSR summaries
  const filteredSummaries = summaries.filter(s => {
    const sDate = s.settlementDate || s.date || "";
    const isSettled = s.status === "settled" && s.approved !== false;
    if (!isSettled) return false;
    if (startDate && sDate < startDate) return false;
    if (endDate && sDate > endDate) return false;
    return true;
  });

  // 3. Filter payments (for other income or legacy expenses)
  const filteredPayments = payments.filter(p => {
    if (p.status === "rejected" || p.approved === false) return false;
    if (startDate && p.date < startDate) return false;
    if (endDate && p.date > endDate) return false;
    return true;
  });

  // 4. Filter new shared expenses
  const filteredExpenses = expenses.filter(e => {
    const eDate = e.date || "";
    if (startDate && eDate < startDate) return false;
    if (endDate && eDate > endDate) return false;
    return true;
  });

  // 5. Filter sub-db shipments for sub-depot commission
  const filteredSubDbShipments = subDbShipments.filter(s => {
    if (startDate && s.date < startDate) return false;
    if (endDate && s.date > endDate) return false;
    return true;
  });

  let totalSalesRevenue = 0;
  let totalCOGS = 0;

  // A) Calculate POS Sales Revenue & COGS
  filteredSales.forEach(sale => {
    const items = sale.items || [];
    items.forEach((item: any) => {
      const qty = Number(item.qty || item.quantity || 0);
      const sellPrice = Number(item.price || 0);
      
      const pId = item.id || item.productId;
      const catalogProd = products.find((p: any) => p.id === pId);
      // FIX: ক্যাটালগে খরচের ফিল্ড costPrice — আগে শুধু .cost দেখাত, ফলে COGS=০ হয়ে মুনাফা বাড়ত
      const buyCost = Number(catalogProd?.costPrice || catalogProd?.cost || item.cost || 0);

      totalSalesRevenue += qty * sellPrice;
      totalCOGS += qty * buyCost;
    });
  });

  // B) Calculate route summaries Sales Revenue & COGS (deducting free items as per business rule)
  filteredSummaries.forEach(s => {
    const freeQtyMap: Record<string, number> = {};
    (s.freeItems || []).forEach((f: any) => {
      const qty = Number(f.quantity || f.qty || 0);
      freeQtyMap[f.productId] = (freeQtyMap[f.productId] || 0) + qty;
    });

    const items = s.items || [];
    items.forEach((item: any) => {
      const totalSold = Math.max(0, Number(item.soldQty !== undefined ? item.soldQty : (item.totalPieces - (item.returns || 0))));
      const freeQty = freeQtyMap[item.productId] || 0;
      
      // Net sold is total sold minus free sample items
      const netSold = Math.max(0, totalSold - freeQty);
      const sellPrice = Number(item.price || 0);
      
      const catalogProd = products.find((p: any) => p.id === item.productId);
      // FIX: costPrice fallback (POS-এর মতোই)
      const buyCost = Number(catalogProd?.costPrice || catalogProd?.cost || item.cost || 0);

      totalSalesRevenue += netSold * sellPrice;
      totalCOGS += netSold * buyCost;
    });
  });

  // Calculate Sales Margin
  // FIX: ক্ষতি লুকানো হতো না — নেগেটিভ মার্জিন থাকলে সেটাই দেখাবে
  const salesMargin = totalSalesRevenue - totalCOGS;

  // C) Sub Depot Commission (represented by totalSubDbProfit in shipments)
  const subDepotCommission = filteredSubDbShipments.reduce((sum, s) => {
    return sum + Number(s.totalSubDbProfit || 0);
  }, 0);

  // D) Other Income
  // Type 'in', excluding "Sub-DB Collection" (which is balance recovery, not raw income)
  let otherIncome = filteredPayments
    .filter(p => p.type === "in" && p.category !== "Sub-DB Collection")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  // E) Total Expenses (DSR summaries route expenses + legacy out-payments + new shared expenses)
  let totalExpenses = 0;
  let salaryExpenses = 0;
  let operationalExpenses = 0;

  // 1. Add route-level local expenses from DSR summaries (these are operational costs)
  filteredSummaries.forEach(s => {
    const summaryRouteExp = (s.expenses || []).reduce((acc: number, e: any) => acc + Number(e.amount || 0), 0);
    operationalExpenses += summaryRouteExp;
  });

  // 2. Add payments with type === 'out' (excluding "Supplier Payment" as it goes to stock assets and handled via COGS)
  filteredPayments
    .filter(p => p.type === "out" && p.category !== "Supplier Payment" && p.category !== "সাপ্লায়ার পেমেন্ট")
    .forEach(p => {
      const cat = (p.category || "").toLowerCase();
      const desc = (p.description || "").toLowerCase();
      const isSalary = 
        cat.includes("salary") || 
        cat.includes("payroll") || 
        cat.includes("advance") || 
        cat.includes("debt") || 
        cat.includes("বেতন") || 
        cat.includes("পারিশ্রমিক") ||
        desc.includes("salary") || 
        desc.includes("বেতন");

      if (isSalary) {
        salaryExpenses += Number(p.amount || 0);
      } else {
        operationalExpenses += Number(p.amount || 0);
      }
    });

  // 3. Add new shared expenses collection entries (avoiding double counting if they are also in filteredPayments)
  filteredExpenses.forEach(e => {
    // If this expense is already in payments, do not double-count
    const isAlreadyCounted = filteredPayments.some(p => p.id === e.id || (p.createdAt && e.createdAt && p.createdAt === e.createdAt));
    if (!isAlreadyCounted) {
      const cat = (e.category || "").toLowerCase();
      const desc = (e.description || "").toLowerCase();
      const isSalary = 
        cat.includes("salary") || 
        cat.includes("payroll") || 
        cat.includes("advance") || 
        cat.includes("বেতন") || 
        cat.includes("পারিশ্রমিক") ||
        desc.includes("salary") || 
        desc.includes("বেতন");

      if (isSalary) {
        salaryExpenses += Number(e.amount || 0);
      } else {
        operationalExpenses += Number(e.amount || 0);
      }
    }
  });

  // Total Expenses is the sum of salaries and operational costs
  totalExpenses = salaryExpenses + operationalExpenses;

  // Net Profit formula: (Sales Margin + Sub Depot Commission + Other Income) - Total Expenses
  const netProfit = (salesMargin + subDepotCommission + otherIncome) - totalExpenses;

  return {
    salesRevenue: totalSalesRevenue,
    cogs: totalCOGS,
    salesMargin,
    subDepotCommission,
    otherIncome,
    totalExpenses,
    netProfit
  };
}
