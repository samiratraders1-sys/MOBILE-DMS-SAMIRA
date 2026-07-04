import React, { useState, useMemo, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, PieChart, Pie } from 'recharts';
import { FileSearch, Calendar, Download, TrendingUp, AlertTriangle, Gift, ShoppingCart, ArrowRight, Printer, Share2, FileText, Check, DollarSign } from "lucide-react";
import { formatCurrency } from "../lib/utils";
import { toFloat } from "../lib/math";
import CustomerGroupReportsView from "./CustomerGroupReportsView";
import ProfitLossView from "./ProfitLossView";
import DailyCashBookView from "./DailyCashBookView";
import PaymentHistoryView from "./PaymentHistoryView";

const CHART_COLORS = [
  "#4F46E5", // Indigo
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EC4899", // Pink
  "#8B5CF6", // Violet
  "#EF4444", // Red
  "#06B6D4", // Cyan
  "#6366F1"  // Accent Indigo
];

interface ReportsViewProps {
  summaries: any[];
  products: any[];
  suppliers: any[];
  addPayment: (payment: any) => any;
  staff?: any[];
  sales?: any[];
  purchases?: any[];
  payments?: any[];
  customers?: any[];
  customerGroups?: any[];
  accounts?: any[];
  transfers?: any[];
  subDbShipments?: any[];
  removePayment?: (id: string) => Promise<void>;
  role?: string;
  user?: any;
  initialTab?: "sales" | "damage" | "free" | "discount" | "sr-daily" | "monthly-review" | "customer-groups" | "valuation" | "pnl" | "daily-cash-book" | "payment-history";
}

export default function ReportsView({ 
  summaries, 
  products, 
  suppliers, 
  addPayment, 
  staff = [],
  sales = [],
  purchases = [],
  payments = [],
  customers = [],
  customerGroups = [],
  accounts = [],
  transfers = [],
  subDbShipments = [],
  removePayment = async () => {},
  role = "admin",
  user = null,
  initialTab = "sales"
}: ReportsViewProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [selectedDetail, setSelectedDetail] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"sales" | "damage" | "free" | "discount" | "sr-daily" | "monthly-review" | "customer-groups" | "valuation" | "pnl" | "daily-cash-book" | "payment-history">(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // New states for SR Daily free & sales splitting
  const [selectedSR, setSelectedSR] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedValuationDate, setSelectedValuationDate] = useState(() => "2026-06-07"); // Default anchor date or today

  // Memoized Inventory Valuation Data Calculation
  const valuationData = useMemo(() => {
    const selectedDateStr = selectedValuationDate;
    
    // 1. Initialize maps
    const prodSalesVal: Record<string, number> = {};
    const prodDamageVal: Record<string, number> = {};
    const prodSalesQty: Record<string, number> = {};
    const prodDamageQty: Record<string, number> = {};

    // A) Process POS Sales
    (sales || []).forEach(sale => {
      if (!sale || typeof sale !== 'object' || !sale.date || typeof sale.date !== 'string') return;
      if (!sale.date.startsWith(selectedDateStr)) return;
      if (sale.status === "rejected" || sale.approved === false) return;

      const items = sale.items || [];
      items.forEach((item: any) => {
        if (!item || typeof item !== 'object') return;
        const qty = Number(item.qty || item.quantity || 0);
        const price = Number(item.price || 0);
        const pId = item.id || item.productId;
        if (pId) {
          prodSalesQty[pId] = (prodSalesQty[pId] || 0) + qty;
          prodSalesVal[pId] = (prodSalesVal[pId] || 0) + (qty * price);
        }
      });
    });

    // B) Process Route Delivery Summaries (Settled)
    (summaries || []).forEach(s => {
      if (!s || typeof s !== 'object' || s.status !== "settled" || s.approved === false) return;
      const sDate = s.settlementDate || s.date;
      if (!sDate || !sDate.startsWith(selectedDateStr)) return;

      // Sales Items
      const items = s.items || [];
      items.forEach((item: any) => {
        if (!item || typeof item !== 'object') return;
        const totalSold = Math.max(0, Number(item.soldQty !== undefined ? item.soldQty : (item.totalPieces - (item.returns || 0))));
        const sellPrice = Number(item.price || 0);
        const pId = item.productId;
        if (pId) {
          prodSalesQty[pId] = (prodSalesQty[pId] || 0) + totalSold;
          prodSalesVal[pId] = (prodSalesVal[pId] || 0) + (totalSold * sellPrice);
        }
      });

      // Damage Items
      const dItems = s.damageItems || [];
      dItems.forEach((d: any) => {
        if (!d || typeof d !== 'object') return;
        const qty = Number(d.quantity || 0);
        const price = Number(d.price || d.sellPrice || 0);
        const pId = d.productId;
        if (pId) {
          prodDamageQty[pId] = (prodDamageQty[pId] || 0) + qty;
          prodDamageVal[pId] = (prodDamageVal[pId] || 0) + (qty * price);
        }
      });
    });

    let totalSalesSum = 0;
    let totalDamageSum = 0;

    const itemsList = (products || []).map(p => {
      const salesQty = prodSalesQty[p.id] || 0;
      const salesVal = prodSalesVal[p.id] || 0;
      const damageQty = prodDamageQty[p.id] || 0;
      const damageVal = prodDamageVal[p.id] || 0;
      const closingVal = salesVal + damageVal;

      totalSalesSum += salesVal;
      totalDamageSum += damageVal;

      return {
        id: p.id,
        name: p.name,
        sku: p.sku || "N/A",
        price: p.price || 0,
        stock: p.stock || 0,
        salesQty,
        salesVal,
        damageQty,
        damageVal,
        closingVal
      };
    }).filter(item => item.salesQty > 0 || item.damageQty > 0 || item.stock > 0);

    const totalClosingSum = totalSalesSum + totalDamageSum;

    return {
      itemsList,
      totalSalesSum,
      totalDamageSum,
      totalClosingSum
    };
  }, [sales, summaries, products, selectedValuationDate]);

  // Monthly financial review states & calculations
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mm}`; // default to current year-month
  });

  const monthlyFinancialStats = useMemo(() => {
    const yearMonth = selectedMonth; // e.g. "2026-06"
    if (!yearMonth) {
      return {
        salesTotal: 0,
        posSalesTotal: 0,
        routeSalesTotal: 0,
        purchaseTotal: 0,
        expenseTotal: 0,
        netMargin: 0,
        purchaseBreakdown: [],
        expenseBreakdown: [],
        monthSalesCount: 0,
        routeSettlementCount: 0
      };
    }

    // 1. Filter POS sales for this month
    const monthSales = (sales || []).filter(s => 
      s.date && s.date.startsWith(yearMonth) && 
      s.status !== "rejected" && 
      s.approved !== false
    );

    // 2. Filter settled DSR summaries for this month
    const monthSummaries = (summaries || []).filter(s => {
      const sDate = s.settlementDate || s.date;
      return s.status === "settled" && s.approved && sDate && sDate.startsWith(yearMonth);
    });

    // 3. Filter purchases for this month
    const monthPurchases = (purchases || []).filter(p => 
      p.date && p.date.startsWith(yearMonth)
    );

    // 4. Filter payments (expenses) for this month
    const monthPayments = (payments || []).filter(p => 
      p.date && p.date.startsWith(yearMonth) && 
      p.status !== "rejected" &&
      p.approved !== false
    );

    // ---- SALES REVENUE CALCULATION ----
    let posSalesTotal = 0;
    let routeSalesTotal = 0;

    // POS sales calculations
    monthSales.forEach(sale => {
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach((item: any) => {
          const qty = toFloat(item.qty || item.quantity || 0);
          const price = toFloat(item.price || 0);
          posSalesTotal += qty * price;
        });
      } else {
        posSalesTotal += toFloat(sale.total || 0);
      }
    });

    // Route settlements calculations
    monthSummaries.forEach(s => {
      const freeQtyMap: Record<string, number> = {};
      (s.freeItems || []).forEach((f: any) => {
        const qty = Number(f.quantity || 0);
        freeQtyMap[f.productId] = (freeQtyMap[f.productId] || 0) + qty;
      });

      const items = s.items || [];
      items.forEach((item: any) => {
        const totalSold = Math.max(0, toFloat(item.soldQty !== undefined ? item.soldQty : (item.totalPieces - (item.returns || 0))));
        const freeQty = toFloat(freeQtyMap[item.productId] || 0);
        const netSold = Math.max(0, totalSold - freeQty);
        const sellPrice = toFloat(item.price || 0);
        routeSalesTotal += netSold * sellPrice;
      });
    });

    const salesTotal = posSalesTotal + routeSalesTotal;

    // ---- PURCHASES CALCULATION ----
    let purchaseTotal = 0;
    const purchaseBreakdown: any[] = [];
    monthPurchases.forEach(p => {
      const amt = Number(p.total || 0);
      purchaseTotal += amt;
      const suppName = suppliers.find(su => su.id === p.supplierId)?.name || p.supplierId || "অজানা সাপ্লায়ার";
      purchaseBreakdown.push({
        date: p.date,
        invoiceId: p.invoiceId || "N/A",
        supplierName: suppName,
        amount: amt
      });
    });

    // ---- EXPENSES CALCULATION ----
    let expenseTotal = 0;
    const expenseBreakdownMap: Record<string, number> = {};

    // General outflow payments (exclude Supplier Payment)
    monthPayments.forEach(p => {
      if (p.type === 'out') {
        if (p.category === "Supplier Payment" || p.category === "সাপ্লায়ার পেমেন্ট") {
          return;
        }
        const amt = toFloat(p.amount || 0);
        expenseTotal += amt;
        const cat = p.category || "অন্যান্য খরচ";
        expenseBreakdownMap[cat] = (expenseBreakdownMap[cat] || 0) + amt;
      }
    });

    // Route summary expenses
    monthSummaries.forEach(s => {
      const routeExp = (s.expenses || []).reduce((acc: number, e: any) => acc + toFloat(e.amount || 0), 0);
      expenseTotal += routeExp;
      (s.expenses || []).forEach((e: any) => {
        const typeLabel = e.description || e.type || "রুট পরিচালনা খরচ";
        const amt = toFloat(e.amount || 0);
        expenseBreakdownMap[typeLabel] = (expenseBreakdownMap[typeLabel] || 0) + amt;
      });
    });

    const expenseBreakdown = Object.entries(expenseBreakdownMap).map(([title, val]) => ({
      title,
      amount: val
    }));

    // ---- CATEGORY SALES CALCULATION ----
    const categorySalesMap: Record<string, number> = {};

    monthSales.forEach(sale => {
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach((item: any) => {
          const qty = Number(item.qty || item.quantity || 0);
          const price = Number(item.price || 0);
          const prodId = item.productId || item.id;
          const prod = (products || []).find(p => p.id === prodId);
          const cat = prod?.category || "General";
          categorySalesMap[cat] = (categorySalesMap[cat] || 0) + (qty * price);
        });
      } else {
        categorySalesMap["General"] = (categorySalesMap["General"] || 0) + Number(sale.total || 0);
      }
    });

    monthSummaries.forEach(s => {
      const freeQtyMap: Record<string, number> = {};
      (s.freeItems || []).forEach((f: any) => {
        const qty = Number(f.quantity || 0);
        freeQtyMap[f.productId] = (freeQtyMap[f.productId] || 0) + qty;
      });

      const items = s.items || [];
      items.forEach((item: any) => {
        const totalSold = Math.max(0, Number(item.soldQty !== undefined ? item.soldQty : (item.totalPieces - (item.returns || 0))));
        const freeQty = freeQtyMap[item.productId] || 0;
        const netSold = Math.max(0, totalSold - freeQty);
        const sellPrice = Number(item.price || 0);
        const prodId = item.productId;
        const prod = (products || []).find(p => p.id === prodId);
        const cat = prod?.category || "General";
        categorySalesMap[cat] = (categorySalesMap[cat] || 0) + (netSold * sellPrice);
      });
    });

    const categorySalesData = Object.entries(categorySalesMap)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);

    const netMargin = salesTotal - purchaseTotal - expenseTotal;

    // ---- COLLECTIONS REVENUE CALCULATION ----
    let routeCollectionsTotal = 0;
    let directCollectionsTotal = 0;

    // 1. Route collections (from settled Summaries representing money received)
    monthSummaries.forEach(s => {
      const sumPaid = (s.payments || []).reduce((val: number, item: any) => val + Number(item.amount || 0), 0);
      routeCollectionsTotal += sumPaid;
    });

    // 2. Direct payments-in (collections)
    monthPayments.forEach(p => {
      if (p.type === 'in') {
        directCollectionsTotal += Number(p.amount || 0);
      }
    });

    const collectionsTotal = routeCollectionsTotal + directCollectionsTotal;

    return {
      salesTotal,
      posSalesTotal,
      routeSalesTotal,
      purchaseTotal,
      expenseTotal,
      netMargin,
      purchaseBreakdown,
      expenseBreakdown,
      categorySalesData,
      monthSalesCount: monthSales.length,
      routeSettlementCount: monthSummaries.length,
      routeCollectionsTotal,
      directCollectionsTotal,
      collectionsTotal
    };
  }, [selectedMonth, sales, summaries, purchases, payments, suppliers, products]);

  const getBengaliMonthName = (monthStr: string) => {
    if (!monthStr) return "";
    const [year, month] = monthStr.split("-");
    const months = [
      "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
      "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
    ];
    const idx = parseInt(month, 10) - 1;
    return `${months[idx]}, ${year}`;
  };

  const handlePrintMonthlyReportPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("পপ-আপ রিডাইরেক্ট ব্লক করা আছে, অনুগ্রহ করে আপনার ব্রাউজারের পপ-আপ সেটিংস পরিবর্তন করুন।");
      return;
    }

    const monthLabel = getBengaliMonthName(selectedMonth);
    const {
      salesTotal,
      posSalesTotal,
      routeSalesTotal,
      purchaseTotal,
      expenseTotal,
      netMargin,
      purchaseBreakdown,
      expenseBreakdown,
      monthSalesCount,
      routeSettlementCount,
      routeCollectionsTotal,
      directCollectionsTotal,
      collectionsTotal
    } = monthlyFinancialStats;

    const formattedSales = formatCurrency(salesTotal);
    const formattedPOS = formatCurrency(posSalesTotal);
    const formattedRoute = formatCurrency(routeSalesTotal);
    const formattedPurchase = formatCurrency(purchaseTotal);
    const formattedExpense = formatCurrency(expenseTotal);
    const formattedNet = formatCurrency(netMargin);
    const formattedCollections = formatCurrency(collectionsTotal);
    const formattedRouteCollections = formatCurrency(routeCollectionsTotal);
    const formattedDirectCollections = formatCurrency(directCollectionsTotal);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>মাসিক আর্থিক পর্যালোচনা রিপোর্ট - ${monthLabel}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
            body { 
              font-family: 'Hind Siliguri', 'Inter', sans-serif;
              color: #1e293b;
              margin: 40px;
              background-color: #ffffff;
              line-height: 1.5;
            }
            .header {
              text-align: center;
              border-bottom: 2px dashed #94a3b8;
              padding-bottom: 15px;
              margin-bottom: 25px;
            }
            .company {
              font-size: 26px;
              font-weight: 700;
              color: #0f172a;
              margin: 0;
            }
            .subtitle {
              font-size: 14px;
              color: #475569;
              margin: 4px 0 0 0;
              font-weight: 500;
              letter-spacing: 0.5px;
            }
            .report-info {
              text-align: center;
              font-size: 16px;
              font-weight: bold;
              background-color: #f1f5f9;
              border-radius: 8px;
              padding: 10px;
              margin-top: 15px;
              color: #0f172a;
            }
            .meta-grid {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              color: #64748b;
              margin-top: 20px;
              margin-bottom: 30px;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 10px;
            }
            .grid-cards {
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              gap: 12px;
              margin-bottom: 35px;
            }
            .card {
              border: 1px solid #cbd5e1;
              border-radius: 12px;
              padding: 15px;
              text-align: center;
              background-color: #f8fafc;
            }
            .card-title {
              font-size: 11px;
              font-weight: bold;
              color: #64748b;
              text-transform: uppercase;
              margin-bottom: 6px;
            }
            .card-value {
              font-size: 18px;
              font-weight: bold;
              color: #0f172a;
            }
            .text-indigo { color: #4f46e5; }
            .text-amber { color: #d97706; }
            .text-rose { color: #be123c; }
            .text-emerald { color: #047857; }
            
            .section-title {
              font-size: 14px;
              font-weight: bold;
              color: #1e293b;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 6px;
              margin-top: 30px;
              margin-bottom: 15px;
              text-transform: uppercase;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
              margin-bottom: 25px;
            }
            th {
              background-color: #f8fafc;
              color: #475569;
              font-weight: 600;
              text-align: left;
              padding: 10px 12px;
              border-bottom: 1px solid #cbd5e1;
            }
            td {
              padding: 10px 12px;
              border-bottom: 1px solid #e2e8f0;
            }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .font-mono { font-family: monospace; font-size: 13px; }
            
            .footer-notes {
              margin-top: 60px;
              font-size: 11px;
              color: #64748b;
              border-top: 1px dashed #cbd5e1;
              padding-top: 15px;
              text-align: center;
            }
            .signature-area {
              display: flex;
              justify-content: space-between;
              margin-top: 80px;
            }
            .sig-line {
              width: 180px;
              border-top: 1px solid #64748b;
              text-align: center;
              padding-top: 5px;
              font-size: 11px;
              color: #334155;
              font-weight: bold;
            }
            @media print {
              body { margin: 20px; }
              input, button { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="company">সমীরা ট্রেডার্স (Samira Traders)</h1>
            <p class="subtitle">মাসিক ফিন্যান্সিয়াল রিভিউ ও হিসাব পর্যালোচনা</p>
            <div class="report-info">মাসিক আর্থিক বিবরণী রিপোর্ট: ${monthLabel}</div>
          </div>

          <div class="meta-grid">
            <div>প্রস্তুতকরণের তারিখ: ${new Date().toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div>উৎস: ড্যাশবোর্ড ও ক্লাউড ডাটাবেজ • সমীরা ট্রেডার্স</div>
          </div>

          <div class="grid-cards">
            <div class="card">
              <div class="card-title">মোট নিট বিক্রয়</div>
              <div class="card-value text-indigo">${formattedSales}</div>
            </div>
            <div class="card">
              <div class="card-title">মোট পণ্য ক্রয়</div>
              <div class="card-value text-amber">${formattedPurchase}</div>
            </div>
            <div class="card">
              <div class="card-title">মোট ক্যাশ কালেকশন</div>
              <div class="card-value" style="color: #2563eb;">${formattedCollections}</div>
            </div>
            <div class="card">
              <div class="card-title">মোট পরিচালনা ব্যয়</div>
              <div class="card-value text-rose">${formattedExpense}</div>
            </div>
            <div class="card">
              <div class="card-title">নিট লাভ/উদ্বৃত্ত</div>
              <div class="card-value text-emerald">${formattedNet}</div>
            </div>
          </div>

          <!-- 1. SALES SUMMARY SECTION -->
          <h2 class="section-title">১. বিক্রয় সারসংক্ষেপ (Sales Analysis)</h2>
          <table>
            <thead>
              <tr>
                <th>বিক্রয় খাত (Sales Channel)</th>
                <th class="text-right">লেনদেন সংখ্যা</th>
                <th class="text-right">বিক্রয় পরিমাণ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>ক্যাশ কাউন্টার / রিটেইল বিক্রয় (Retail POS Sales)</td>
                <td class="text-right font-mono">${monthSalesCount} টি ইনভয়েস</td>
                <td class="text-right font-bold text-indigo">${formattedPOS}</td>
              </tr>
              <tr>
                <td>রুট ডেলিভারি ও ডিস্ট্রিবিউশন সেল (DSR Routes Settlement)</td>
                <td class="text-right font-mono">${routeSettlementCount} টি রুট সেটেলমেন্ট</td>
                <td class="text-right font-bold text-indigo">${formattedRoute}</td>
              </tr>
              <tr class="font-bold bg-slate-50">
                <td>সর্বমোট নিট বিক্রয়</td>
                <td class="text-right">---</td>
                <td class="text-right text-indigo font-mono text-bold">${formattedSales}</td>
              </tr>
            </tbody>
          </table>

          <!-- 2. COLLECTIONS SUMMARY SECTION -->
          <h2 class="section-title">২. ক্যাশ কালেকশন সারসংক্ষেপ (Cash Collections Analysis)</h2>
          <table>
            <thead>
              <tr>
                <th>কালেকশন উৎস (Collection Source)</th>
                <th class="text-right">খতিয়ান বিবরণ</th>
                <th class="text-right">সংগৃহীত পরিমাণ (Collected Amount)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>রুট ডেলিভারি / ডিস্ট্রিবিউশন কালেকশন (Route Settlements)</td>
                <td class="text-right font-mono">${routeSettlementCount} টি রুট সেটেলমেন্ট</td>
                <td class="text-right font-bold" style="color: #047857;">${formattedRouteCollections}</td>
              </tr>
              <tr>
                <td>সরাসরি কাস্টমার জমা ও ক্যাশ কালেকশন (Direct Cash Receipts)</td>
                <td class="text-right font-mono">ইনওয়ার্ড কাস্টমার পেমেন্টস</td>
                <td class="text-right font-bold" style="color: #047857;">${formattedDirectCollections}</td>
              </tr>
              <tr class="font-bold bg-slate-50">
                <td>সর্বমোট সংগৃহীত ক্যাশ ফান্ড (Total Collections)</td>
                <td class="text-right">---</td>
                <td class="text-right font-bold" style="color: #059669; font-family: monospace; font-size: 13px;">${formattedCollections}</td>
              </tr>
            </tbody>
          </table>

          <!-- 3. EXPENSES SUMMARY SECTION -->
          <h2 class="section-title">৩. ব্যয় খাত বিশ্লেষণ (Operating Expenses)</h2>
          <table>
            <thead>
              <tr>
                <th>ব্যয়ের খাত (Expense Category)</th>
                <th class="text-right">পরিমাণ (Amount)</th>
              </tr>
            </thead>
            <tbody>
              ${expenseBreakdown.length === 0 
                ? '<tr><td colspan="2" class="text-center">কোনো খরচের রেকর্ড পাওয়া যায়নি</td></tr>' 
                : expenseBreakdown.map(e => `
                  <tr>
                    <td class="font-bold">${e.title}</td>
                    <td class="text-right font-mono font-bold text-rose">${formatCurrency(e.amount)}</td>
                  </tr>
                `).join('')
              }
              <tr class="font-bold bg-slate-50">
                <td>মোট পরিচালনা ব্যয়</td>
                <td class="text-right font-mono text-rose text-bold">${formattedExpense}</td>
              </tr>
            </tbody>
          </table>

          <!-- 4. PURCHASES DETAIL SECTION -->
          <h2 class="section-title">৪. ক্রয়কৃত পণ্য ইনভয়েস তালিকা (Stock Purchases)</h2>
          <table>
            <thead>
              <tr>
                <th>তারিখ</th>
                <th>ক্রয় ইনভয়েস নং</th>
                <th>সাপ্লায়ারের নাম</th>
                <th class="text-right">ক্রয় মূল্য</th>
              </tr>
            </thead>
            <tbody>
              ${purchaseBreakdown.length === 0 
                ? '<tr><td colspan="4" class="text-center">এই মাসে কোনো পণ্য ক্রয় ইনভয়েস পাওয়া যায়নি।</td></tr>' 
                : purchaseBreakdown.map(p => `
                  <tr>
                    <td class="font-mono">${p.date}</td>
                    <td class="font-mono">${p.invoiceId}</td>
                    <td class="font-bold">${p.supplierName}</td>
                    <td class="text-right font-mono text-amber font-bold">${formatCurrency(p.amount)}</td>
                  </tr>
                `).join('')
              }
              <tr class="font-bold bg-slate-50">
                <td colspan="3">সর্বমোট পণ্য স্টক ক্রয় মূল্য</td>
                <td class="text-right font-mono text-amber text-bold">${formattedPurchase}</td>
              </tr>
            </tbody>
          </table>

          <!-- 5. SIGNATURES AND REVIEWS -->
          <div class="signature-area">
            <div class="sig-line">প্রস্তুতকারী (Accountant/Manager)</div>
            <div class="sig-line">পরিচালক (Authorized Director)</div>
          </div>

          <div class="footer-notes">
            <p>প্রিন্ট ও জেনারেট করার সময়: ${new Date().toLocaleString()}</p>
            <p>সমীরা ট্রেডার্স অটো-ক্যালকুলেশন ড্যাশবোর্ড দ্বারা জেনারেটকৃত। ভুলত্রুটি সংশোধনযোগ্য।</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadMonthlyFinancialCSV = () => {
    const monthLabel = getBengaliMonthName(selectedMonth);
    const {
      salesTotal,
      posSalesTotal,
      routeSalesTotal,
      purchaseTotal,
      expenseTotal,
      netMargin,
      collectionsTotal,
      routeCollectionsTotal,
      directCollectionsTotal
    } = monthlyFinancialStats;

    const headers = ["सूचक/খাত (Indicator / Category)", "मूल्य/টাকা (Value in BDT)"];
    const rows = [
      ["সর্বমোট নিট বিক্রয় (Net Sales Total)", salesTotal],
      ["-- ক্যাশ কাউন্টার বিক্রয় (POS Sales)", posSalesTotal],
      ["-- এসআর রুট ডিস্ট্রিবিউশন বিক্রয় (Route Sales)", routeSalesTotal],
      ["সর্বমোট প্রোডাক্ট ক্রয় (Total Stock Purchases)", purchaseTotal],
      ["সর্বমোট ক্যাশ কালেকশন (Total Cash Collections)", collectionsTotal],
      ["-- এসআর রুট কালেকশন (Route Collections)", routeCollectionsTotal],
      ["-- সরাসরি কাস্টমার ক্যাশ রিসিভ (Direct Receipts)", directCollectionsTotal],
      ["সর্বমোট পরিচালনা ব্যয় (Operating Expenses)", expenseTotal],
      ["মাসিক নিট লাভ/উদ্বৃত্ত (Net Operating Position)", netMargin]
    ];

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].map(e => e.map(val => `"${val}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `monthly_financial_report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const settledSummaries = useMemo(() => {
    return summaries.filter(s => {
      if (s.status !== "settled") return false;
      const sDate = new Date(s.settlementDate || s.date);
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      return sDate >= start && sDate <= end;
    });
  }, [summaries, startDate, endDate]);

  const summarizedData = useMemo(() => {
      if (activeTab === 'sr-daily') return [];
      const data: any = {};
      settledSummaries.forEach(s => {
          let processingItems: any[] = [];
          
          if (activeTab === 'sales') {
            processingItems = s.items.map((i: any) => ({
                productId: i.productId,
                qty: i.totalPieces - (i.returns || 0),
                val: (i.totalPieces - (i.returns || 0)) * (i.price || 0)
            }));
          } else if (activeTab === 'damage') {
            processingItems = (s.damageItems || []).map((i: any) => ({
                productId: i.productId,
                qty: i.quantity,
                val: i.quantity * (i.price || 0)
            }));
          } else if (activeTab === 'free') {
            processingItems = (s.freeItems || []).map((i: any) => ({
                productId: i.productId,
                qty: i.quantity,
                val: i.quantity * (products.find(p => p.id === i.productId)?.price || 0)
            }));
          } else if (activeTab === 'discount') {
            processingItems = (s.discountItems || []).map((i: any) => ({
                productId: i.productId,
                qty: 1,
                val: i.amount
            }));
          }
          
          processingItems.forEach(item => {
              const product = products.find(p => p.id === item.productId);
              if (!product) return;
              
              if (selectedSupplier && product.supplierId !== selectedSupplier) return;

              const pId = item.productId;
              if (!data[pId]) data[pId] = { name: product.name, qty: 0, val: 0, details: [] };
              
              if (item.qty > 0) {
                  data[pId].qty += item.qty;
                  data[pId].val += item.val;
                  data[pId].details.push({ date: s.date, qty: item.qty, val: item.val, route: s.routeId });
              }
          });
      });
      return Object.values(data).filter((d: any) => d.val > 0 || d.qty > 0);
  }, [settledSummaries, activeTab, products, selectedSupplier]);

  const handleDownloadExcel = () => {
    const headers = ["পণ্যের নাম (Product Name)", "মোট পরিমাণ/সংখ্যা (Total Qty)", "মোট মূল্য (Total Value)"];
    const rows = summarizedData.map(d => [
      d.name,
      d.qty,
      d.val
    ]);
    const totalQty = summarizedData.reduce((acc: number, d: any) => acc + d.qty, 0);
    const totalVal = summarizedData.reduce((acc: number, d: any) => acc + d.val, 0);
    rows.push(["মোট (Total)", totalQty, totalVal]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].map(e => e.map(val => `"${val}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    const typeLabel = activeTab === 'sales' ? 'বিক্রয়' : activeTab === 'damage' ? 'ড্যামেজ' : activeTab === 'free' ? 'ফ্রি_গিফট' : 'ডিসকাউন্ট';
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `product_report_${typeLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleWhatsAppShare = () => {
    const typeLabel = activeTab === 'sales' ? 'বিক্রয়' : activeTab === 'damage' ? 'ড্যামেজ' : activeTab === 'free' ? 'ফ্রি_গিফট' : 'ডিসকাউন্ট';
    const totalQty = summarizedData.reduce((acc: number, d: any) => acc + d.qty, 0);
    const totalVal = summarizedData.reduce((acc: number, d: any) => acc + d.val, 0);
    
    let text = `📦 *বিস্তারিত প্রোডাক্ট রিপোর্ট (${typeLabel})*\n`;
    text += `📅 পিরিয়ড: ${startDate || "শুরু"} থেকে ${endDate || "আজ"}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    summarizedData.forEach(d => {
      text += `• *${d.name}*: ${d.qty} পিস | ${formatCurrency(d.val)}\n`;
    });
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `*মোট পরিমাণ:* ${totalQty} পিস\n`;
    text += `*মোট মূল্য:* ${formatCurrency(totalVal)}\n`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  // Compute Daily SR Grouped data by Supplier
  const srGroupedData = useMemo(() => {
    if (!selectedSR || activeTab !== "sr-daily") return {};

    const matchedSummaries = summaries.filter(s => {
      return s.status === "settled" && 
             (s.date === selectedDate || s.settlementDate === selectedDate) &&
             s.dsrId === selectedSR;
    });

    const groups: Record<string, { 
      items: any[]; 
      totalQty: number; 
      totalFree: number; 
      totalVal: number; 
    }> = {};

    matchedSummaries.forEach(s => {
      // 1. Core items
      (s.items || []).forEach((item: any) => {
        const prod = products.find(p => p.id === item.productId);
        if (!prod) return;
        
        const supp = suppliers.find(su => su.id === prod.supplierId);
        const supplierName = supp ? supp.name : "অন্যান্য / Unknown Supplier";

        if (!groups[supplierName]) {
          groups[supplierName] = { items: [], totalQty: 0, totalFree: 0, totalVal: 0 };
        }

        const returns = item.returns || 0;
        const netPieces = item.totalPieces - returns - (item.free || 0);
        const val = netPieces * (item.price || prod.price || 0);

        const existing = groups[supplierName].items.find(it => it.productId === item.productId);
        if (existing) {
          existing.qty += netPieces;
          existing.val += val;
        } else {
          groups[supplierName].items.push({
            productId: item.productId,
            name: prod.name,
            qty: netPieces,
            freeQty: 0,
            val
          });
        }
      });

      // 2. Free items
      (s.freeItems || []).forEach((f: any) => {
        const prod = products.find(p => p.id === f.productId);
        if (!prod) return;

        const supp = suppliers.find(su => su.id === prod.supplierId);
        const supplierName = supp ? supp.name : "অন্যান্য / Unknown Supplier";

        if (!groups[supplierName]) {
          groups[supplierName] = { items: [], totalQty: 0, totalFree: 0, totalVal: 0 };
        }

        const freeQty = Number(f.quantity || 0);

        const existing = groups[supplierName].items.find(it => it.productId === f.productId);
        if (existing) {
          existing.freeQty += freeQty;
        } else {
          groups[supplierName].items.push({
            productId: f.productId,
            name: prod.name,
            qty: 0,
            freeQty,
            val: 0
          });
        }
      });
    });

    // Compute totals for each supplier group
    Object.keys(groups).forEach(suppName => {
      const g = groups[suppName];
      g.totalQty = g.items.reduce((sum, item) => sum + item.qty, 0);
      g.totalFree = g.items.reduce((sum, item) => sum + item.freeQty, 0);
      g.totalVal = g.items.reduce((sum, item) => sum + item.val, 0);
    });

    return groups;
  }, [selectedSR, selectedDate, summaries, products, suppliers, activeTab]);

  const selectedSRProfile = useMemo(() => {
    return (staff || []).find(s => s.id === selectedSR);
  }, [selectedSR, staff]);

  const handleShareSRReport = () => {
    if (!selectedSRProfile) {
      alert("অনুগ্রহ করে একটি এসআর সিলেক্ট করুন!");
      return;
    }
    let text = `📋 *দৈনিক এসআর ফ্রি ও সেলস রিপোর্ট*\n`;
    text += `👤 *এসআর নাম:* ${selectedSRProfile.name}\n`;
    text += `📅 *তারিখ:* ${selectedDate}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    Object.entries(srGroupedData).forEach(([supplierName, data]: [string, any]) => {
      text += `🏢 *সাপ্লায়ার: ${supplierName}*\n`;
      text += `-------------------------------------\n`;
      data.items.forEach((item: any) => {
        text += `• ${item.name}: বিক্রি ${item.qty} পিস | ফ্রি ${item.freeQty} পিস | মূল্য ${formatCurrency(item.val)}\n`;
      });
      text += `*মোট:* বিক্রি ${data.totalQty} পিস | ফ্রি ${data.totalFree} পিস | মূল্য ${formatCurrency(data.totalVal)}\n\n`;
    });

    const grandSales = Object.values(srGroupedData).reduce((sum: number, d: any) => sum + Number(d.totalQty || 0), 0) as number;
    const grandFree = Object.values(srGroupedData).reduce((sum: number, d: any) => sum + Number(d.totalFree || 0), 0) as number;
    const grandVal = Object.values(srGroupedData).reduce((sum: number, d: any) => sum + Number(d.totalVal || 0), 0) as number;

    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🌟 *সর্বমোট বিক্রয়:* ${grandSales} পিস\n`;
    text += `🎁 *সর্বমোট ফ্রি গিফট:* ${grandFree} পিস\n`;
    text += `💰 *সর্বমোট মূল্য:* ${formatCurrency(grandVal)}\n`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleDownloadSRReport = () => {
    if (!selectedSRProfile) {
      alert("অনুগ্রহ করে একটি এসআর সিলেক্ট করুন!");
      return;
    }
    const headers = ["সাপ্লায়ার (Supplier)", "পণ্যের নাম (Product)", "বিক্রি পরিমাণ (Sold Qty)", "ফ্রি পরিমাণ (Free Qty)", "মোট মূল্য (Total Value)"];
    const rows: any[] = [];

    Object.entries(srGroupedData).forEach(([supplierName, data]: [string, any]) => {
      data.items.forEach((item: any) => {
        rows.push([
          supplierName,
          item.name,
          item.qty,
          item.freeQty,
          item.val
        ]);
      });
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].map(e => e.map(val => `"${val}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SR_Report_${selectedSRProfile.name}_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">বিস্তারিত প্রোডাক্ট ও স্পেশাল রিপোর্ট</h2>
        </div>
        {activeTab !== 'sr-daily' ? (
          <div className="flex flex-wrap gap-2 items-center">
             <select className="border border-gray-200 rounded-xl p-2.5 text-sm font-sans bg-white" value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)}>
               <option value="">সকল সাপ্লায়ার</option>
               {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
             </select>
             <input type="date" className="border border-gray-200 rounded-xl p-2.5 text-sm font-sans" value={startDate} onChange={e => setStartDate(e.target.value)} />
             <input type="date" className="border border-gray-200 rounded-xl p-2.5 text-sm font-sans" value={endDate} onChange={e => setEndDate(e.target.value)} />
             <button onClick={() => window.print()} className="px-4 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-black cursor-pointer"><Printer className="w-4 h-4" /> প্রিন্ট</button>
             <button onClick={handleDownloadExcel} className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center gap-1.5 hover:bg-emerald-700 cursor-pointer"><Download className="w-4 h-4" /> এক্সেল ডাউনলোড</button>
             <button onClick={handleWhatsAppShare} className="px-4 py-2.5 bg-green-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 hover:bg-green-600 cursor-pointer"><Share2 className="w-4 h-4" /> হোয়াটসঅ্যাপে শেয়ার</button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 items-center">
            <select 
              className="border border-gray-200 rounded-xl p-2.5 text-sm font-sans bg-white font-bold" 
              value={selectedSR} 
              onChange={e => setSelectedSR(e.target.value)}
            >
              <option value="">এসআর নির্বাচন করুন (Select SR)</option>
              {(staff || []).map((s: any) => (
                <option key={s.id} value={s.id}>{s.name} ({s.role || "SR"})</option>
              ))}
            </select>
            <input 
              type="date" 
              className="border border-gray-200 rounded-xl p-2.5 text-sm font-sans font-bold" 
              value={selectedDate} 
              onChange={e => setSelectedDate(e.target.value)} 
            />
            {selectedSR && (
              <>
                <button onClick={handleDownloadSRReport} className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center gap-1.5 hover:bg-emerald-700 cursor-pointer"><Download className="w-4 h-4" /> রিপোর্ট ডাউনলোড (Excel)</button>
                <button onClick={handleShareSRReport} className="px-4 py-2.5 bg-green-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 hover:bg-green-600 cursor-pointer"><Share2 className="w-4 h-4" /> হোয়াটসঅ্যাপে শেয়ার দিন</button>
              </>
            )}
          </div>
        )}
      </div>

       <div className="flex gap-2 overflow-x-auto pb-2">
            {(['sales', 'damage', 'free', 'discount', 'sr-daily', 'customer-groups', 'valuation', 'monthly-review', 'pnl', 'daily-cash-book', 'payment-history'] as const).map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-600'}`}
                >
                    {tab === 'sales' ? 'বিক্রয়' : tab === 'damage' ? 'ড্যামেজ' : tab === 'free' ? 'ফ্রি/গিফট' : tab === 'discount' ? 'ডিসকাউন্ট' : tab === 'sr-daily' ? 'এসআর ডেইলি ফ্রি ও সেলস' : tab === 'customer-groups' ? 'কাস্টমার গ্রুপ রিপোর্ট' : tab === 'valuation' ? 'ইনভেন্টরি ভ্যালুয়েশন' : tab === 'pnl' ? 'লাভ-ক্ষতি রিপোর্ট' : tab === 'daily-cash-book' ? 'দৈনিক ক্যাশ বুক' : tab === 'payment-history' ? 'পেমেন্ট লেনদেন খতিয়ান' : 'মাসিক আর্থিক পর্যালোচনা'}
                </button>
            ))}
       </div>

        {activeTab === 'valuation' ? (
          <div className="space-y-6 animate-in fade-in duration-300 font-sans">
            {/* Header and Control Bar */}
            <div className="bg-white p-6 rounded-3xl border shadow-xs flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-950 text-md">মজুদ মূল্যায়ন ও অবসান রিপোর্ট (Inventory Valuation Report)</h3>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">Closing Sales Value = (Today's Sales Value) + (Today's Damage Value)</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 border p-1 px-3 rounded-2xl shadow-inner">
                <span className="text-xs text-gray-500 font-bold">তারিখ নির্বাচন:</span>
                <input
                  type="date"
                  className="border-0 bg-transparent text-sm font-black text-slate-850 focus:ring-0 cursor-pointer outline-none border-b-2 border-dashed border-emerald-300"
                  value={selectedValuationDate}
                  onChange={(e) => setSelectedValuationDate(e.target.value)}
                />
              </div>
            </div>

            {/* Summary Bento Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Sales Value Box */}
              <div className="bg-white p-5 rounded-3xl border shadow-xs flex flex-col justify-between">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">আজকের সর্বমোট বিক্রয়মূল্য (Today's Sales Value)</p>
                <div className="flex justify-between items-baseline mt-4">
                  <span className="text-2xl font-black text-slate-900">{formatCurrency(valuationData.totalSalesSum)}</span>
                  <span className="text-xs text-emerald-600 font-extrabold bg-emerald-50 px-2.5 py-1 rounded-full">চলতি হিসাব</span>
                </div>
              </div>

              {/* Damage Return Value Box */}
              <div className="bg-white p-5 rounded-3xl border shadow-xs flex flex-col justify-between">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">আজকের নষ্ট/ড্যামেজ রিটার্ন মূল্য (Today's Damage Value)</p>
                <div className="flex justify-between items-baseline mt-4">
                  <span className="text-2xl font-black text-rose-600">{formatCurrency(valuationData.totalDamageSum)}</span>
                  <span className="text-xs text-rose-600 font-extrabold bg-rose-50 px-2.5 py-1 rounded-full">ড্যামেজ স্টক</span>
                </div>
              </div>

              {/* Closing Inventory Sales Value Box */}
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 rounded-3xl text-white shadow-md flex flex-col justify-between">
                <p className="text-[10px] text-emerald-100 font-black uppercase tracking-wider">ইনভেন্টরি অবসান বিক্রয় মূল্য (Closing Valuation)</p>
                <div className="flex justify-between items-baseline mt-4">
                  <span className="text-3xl font-black">{formatCurrency(valuationData.totalClosingSum)}</span>
                  <span className="text-xs text-white font-extrabold bg-emerald-700/40 px-2.5 py-1 rounded-full">ফলাফল</span>
                </div>
              </div>
            </div>

            {/* Accounting Note */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-850 font-medium leading-relaxed font-sans">
              ⚠️ <strong>হিসাবরক্ষণ তথ্য:</strong> সংশ্লিষ্ট নষ্ট ও ড্যামেজ হওয়া পণ্যগুলো মূল হিসাবের নিরাপত্তা রক্ষায় সম্পূর্ণ আলাদা রেজিস্টারে ট্র্যাকিং করা হচ্ছে। এগুলো সরাসরি ব্যবসার প্রধান লাভ-ক্ষতি (Profit & Loss / P&L) বিবরণীকে প্রভাবিত করে না।
            </div>

            {/* Valuation Breakdown Table */}
            <div className="bg-white rounded-3xl border shadow-xs overflow-hidden">
              <div className="p-5 border-b flex justify-between items-center bg-gray-50">
                <h4 className="font-extrabold text-slate-900 text-sm">পণ্যভিত্তিক অবসান মূল্যায়ন বিবরণী ({valuationData.itemsList.length} টি আইটেম)</h4>
                <button
                  onClick={() => {
                    const headers = ["পণ্যের নাম (Product Name)", "SKU", "রেট (Price)", "বিক্রয় সংখ্যা (Sales Qty)", "বিক্রয় মূল্য (Sales Value)", "ড্যামেজ সংখ্যা (Damage Qty)", "ড্যামেজ মূল্য (Damage Value)", "অবসান মূল্যায়ন (Closing Valuation)"];
                    const rows = valuationData.itemsList.map(item => [
                      item.name,
                      item.sku,
                      item.price,
                      item.salesQty,
                      item.salesVal,
                      item.damageQty,
                      item.damageVal,
                      item.closingVal
                    ]);
                    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].map(e => e.map(val => `"${val}"`).join(",")).join("\n");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", `inventory_valuation_report_${selectedValuationDate}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" /> এক্সেল রপ্তানি (Export CSV)
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#F8F9FA] text-[10px] uppercase font-bold text-[#ADB5BD] border-b">
                    <tr>
                      <th className="px-6 py-4">পণ্যের নাম</th>
                      <th className="px-6 py-4 text-center">SKU</th>
                      <th className="px-6 py-4 text-right">বিক্রয় রেট</th>
                      <th className="px-6 py-4 text-center">বিক্রয় (পিস্)</th>
                      <th className="px-6 py-4 text-right">বিক্রয় মূল্য</th>
                      <th className="px-6 py-4 text-center text-rose-600">ড্যামেজ (পিস্)</th>
                      <th className="px-6 py-4 text-right text-rose-600">ড্যামেজ মূল্য</th>
                      <th className="px-6 py-4 text-right font-black text-emerald-700">অবসান বিক্রয়মূল্য (Closing)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs text-[#212529] font-bold">
                    {valuationData.itemsList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-gray-400 font-semibold leading-relaxed">
                          এই তারিখে কোনো বিক্রয় বা ড্যামেজ ফেরতের হিসাব পাওয়া যায়নি।
                        </td>
                      </tr>
                    ) : (
                      valuationData.itemsList.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                           <td className="px-6 py-4 font-extrabold text-gray-900">{item.name}</td>
                           <td className="px-6 py-4 text-center font-mono text-gray-400 text-[10px]">{item.sku}</td>
                           <td className="px-6 py-4 text-right font-mono">{formatCurrency(item.price)}</td>
                           <td className="px-6 py-4 text-center font-mono">{item.salesQty}</td>
                           <td className="px-6 py-4 text-right font-mono text-slate-800">{formatCurrency(item.salesVal)}</td>
                           <td className="px-6 py-4 text-center font-mono text-rose-550">{item.damageQty}</td>
                           <td className="px-6 py-4 text-right font-mono text-rose-600">{formatCurrency(item.damageVal)}</td>
                           <td className="px-6 py-4 text-right font-mono font-black text-emerald-600 bg-emerald-50/30">{formatCurrency(item.closingVal)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : activeTab === 'customer-groups' ? (
          <CustomerGroupReportsView customers={customers} customerGroups={customerGroups} sales={sales} />
        ) : activeTab === 'monthly-review' ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Control & Header Row inside Tab */}
            <div className="bg-white p-6 rounded-3xl border shadow-xs flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-650 rounded-2xl">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-950 text-md">মাসিক আর্থিক পর্যালোচনা বোর্ড (Monthly Financial Review)</h3>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">সব হিসাব মিলিয়ে মাস অবসান রিপোর্ট ও প্রিন্ট বিবরণী</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 items-center font-sans">
                <div className="flex items-center gap-2 bg-slate-50 border p-1 px-3 rounded-2xl shadow-inner">
                  <span className="text-xs text-gray-500 font-bold">মাস নির্বাচন করুন:</span>
                  <input
                    type="month"
                    className="border-0 bg-transparent text-sm font-black text-slate-800 focus:ring-0 cursor-pointer outline-none border-b-2 border-dashed border-indigo-300"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleDownloadMonthlyFinancialCSV}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-md transition-all hover:scale-[1.01] active:scale-95"
                  title="ডাউনলোড এক্সেল রিপোর্ট"
                >
                  <Download className="w-4 h-4" /> ডাউনলোড এক্সেল (Export)
                </button>
                <button
                  onClick={handlePrintMonthlyReportPDF}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-2xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-md transition-all hover:scale-[1.01] active:scale-95"
                >
                  <Printer className="w-4 h-4" /> পিডিএফ রিপোর্ট প্রিন্ট (Print PDF)
                </button>
              </div>
            </div>

            {/* Monthly Bento Stats cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 font-sans">
              {/* Sales Card */}
              <div className="bg-white p-5 rounded-3xl border shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">সর্বমোট নিট বিক্রয়</p>
                  <p className="text-xl font-black text-indigo-600">{formatCurrency(monthlyFinancialStats.salesTotal)}</p>
                  <p className="text-[9px] text-gray-450 font-bold leading-normal">
                    POS: {formatCurrency(monthlyFinancialStats.posSalesTotal)} <br />
                    রুট: {formatCurrency(monthlyFinancialStats.routeSalesTotal)}
                  </p>
                </div>
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>

              {/* Purchase Card */}
              <div className="bg-white p-5 rounded-3xl border shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">সর্বমোট পণ্য স্টক ক্রয়</p>
                  <p className="text-xl font-black text-amber-600">{formatCurrency(monthlyFinancialStats.purchaseTotal)}</p>
                  <p className="text-[9px] text-gray-450 font-bold">মোট ইনভয়েস: {monthlyFinancialStats.purchaseBreakdown.length} টি</p>
                </div>
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                  <ShoppingCart className="w-5 h-5" />
                </div>
              </div>

              {/* Collections Card (Total Cash Received) */}
              <div className="bg-white p-5 rounded-3xl border shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">সর্বমোট ক্যাশ কালেকশন</p>
                  <p className="text-xl font-black text-blue-600">{formatCurrency(monthlyFinancialStats.collectionsTotal)}</p>
                  <p className="text-[9px] text-gray-450 font-bold leading-normal">
                    রুট: {formatCurrency(monthlyFinancialStats.routeCollectionsTotal)} <br />
                    সরাসরি: {formatCurrency(monthlyFinancialStats.directCollectionsTotal)}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>

              {/* Expenses Card */}
              <div className="bg-white p-5 rounded-3xl border shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">সর্বমোট পরিচালনা ব্যয়</p>
                  <p className="text-xl font-black text-rose-600">{formatCurrency(monthlyFinancialStats.expenseTotal)}</p>
                  <p className="text-[9px] text-gray-450 font-bold">মোট ব্যয় খাত: {monthlyFinancialStats.expenseBreakdown.length} টি</p>
                </div>
                <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>

              {/* Net Operating Balance */}
              <div className="bg-white p-5 rounded-3xl border shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">মাসিক নিট উদ্বৃত্ত/লাভ</p>
                  <p className={`text-xl font-black ${monthlyFinancialStats.netMargin >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {formatCurrency(monthlyFinancialStats.netMargin)}
                  </p>
                  <p className="text-[9px] text-gray-450 font-bold">নিট রেভিনিউ সারপ্লাস</p>
                </div>
                <div className={`p-3 rounded-2xl ${monthlyFinancialStats.netMargin >= 0 ? "bg-emerald-50 text-emerald-650" : "bg-rose-50 text-rose-650"}`}>
                  <FileText className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Grid for detailed lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-sans">
              {/* Left Column: Expense Breakdowns and Sales analytics */}
              <div className="space-y-6">
                {/* Expense details card */}
                <div className="bg-white p-6 rounded-3xl border shadow-xs">
                  <h4 className="font-extrabold text-slate-805 text-sm mb-4 border-b pb-2 flex justify-between">
                    <span>📋 ব্যয় খাত বিশ্লেষণ (Operating Expenses Breakdown)</span>
                    <span className="text-rose-600 font-black">{formatCurrency(monthlyFinancialStats.expenseTotal)}</span>
                  </h4>
                  {monthlyFinancialStats.expenseBreakdown.length === 0 ? (
                    <p className="text-center text-xs text-gray-400 py-6 font-bold">এই মাসে কোনো পরিচালনা ব্যয়ের হিসাব পাওয়া যায়নি।</p>
                  ) : (
                    <div className="space-y-2.5">
                      {monthlyFinancialStats.expenseBreakdown.map((exp, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-slate-50 p-2.5 px-4 rounded-2xl text-xs font-bold text-slate-700">
                          <span>{exp.title}</span>
                          <span className="font-black text-slate-950 font-mono">{formatCurrency(exp.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sales Breakdown detail */}
                <div className="bg-white p-6 rounded-3xl border shadow-xs">
                  <h4 className="font-extrabold text-slate-805 text-sm mb-4 border-b pb-2">📦 বিক্রয় খাত সারসংক্ষেপ (Sales Breakdown Analysis)</h4>
                  <div className="space-y-3 font-bold text-xs text-slate-700">
                    <div className="flex justify-between border-b pb-2">
                      <span>কাউন্টার ক্যাশ সেলস (Direct Retail POS):</span>
                      <span className="text-slate-900 font-mono font-bold">{formatCurrency(monthlyFinancialStats.posSalesTotal)} ({monthlyFinancialStats.monthSalesCount} টি ইনভয়েস)</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span>রুট ডেলিভারি / এসআর সরবরাহ (Route settlements):</span>
                      <span className="text-slate-900 font-mono font-bold">{formatCurrency(monthlyFinancialStats.routeSalesTotal)} ({monthlyFinancialStats.routeSettlementCount} টি রুট)</span>
                    </div>
                    <div className="flex justify-between pt-1 text-slate-950 text-sm font-extrabold">
                      <span>সর্বমোট নিট বিক্রয়:</span>
                      <span className="text-indigo-600 font-mono font-black">{formatCurrency(monthlyFinancialStats.salesTotal)}</span>
                    </div>
                  </div>
                </div>

                {/* Product Category Sales distribution Pie Chart */}
                <div className="bg-white p-6 rounded-3xl border shadow-xs">
                  <h4 className="font-extrabold text-slate-805 text-sm mb-4 border-b pb-2 flex justify-between items-center">
                    <span>📊 পণ্য ক্যাটাগরি বিক্রয় বন্টন (Category Sales Distribution)</span>
                    <span className="text-xs bg-indigo-50 text-indigo-700 font-extrabold px-2.5 py-1 rounded-full">চলতি মাস</span>
                  </h4>

                  {(!monthlyFinancialStats.categorySalesData || monthlyFinancialStats.categorySalesData.length === 0) ? (
                    <p className="text-center text-xs text-gray-400 py-12 font-bold">এই মাসে কোনো ক্যাটাগরির বিক্রয় পাওয়া যায়নি।</p>
                  ) : (
                    <div className="space-y-4">
                      {/* Pie Chart display inside a nice responsive container */}
                      <div className="h-64 sm:h-72 w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={monthlyFinancialStats.categorySalesData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={85}
                              paddingAngle={4}
                            >
                              {monthlyFinancialStats.categorySalesData.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: any) => [formatCurrency(Number(value || 0)), "বিক্রয়"]}
                              contentStyle={{ background: "#ffffff", border: "1px solid #E9ECEF", borderRadius: "12px", fontSize: "11px", fontWeight: "bold" }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Elegant visual legends with exact amounts and percentages */}
                      <div className="grid grid-cols-2 gap-2 text-xs font-bold font-sans">
                        {monthlyFinancialStats.categorySalesData.map((item: any, index: number) => {
                          const catSalesArr = monthlyFinancialStats.categorySalesData || [];
                          const totalSales = catSalesArr.reduce((acc: number, curr: any) => acc + (curr.value || 0), 0);
                          const percentage = totalSales > 0 ? ((item.value / totalSales) * 100).toFixed(1) : "0.0";
                          const color = CHART_COLORS[index % CHART_COLORS.length];
                          return (
                            <div key={item.name} className="flex flex-col p-2.5 bg-slate-50 border border-slate-100 rounded-2xl justify-between">
                              <div className="flex items-center gap-1.5 mb-1 text-slate-700">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                <span className="truncate max-w-[125px] font-black">{item.name}</span>
                              </div>
                              <div className="flex items-baseline justify-between pl-4">
                                <span className="text-[11px] font-black text-slate-950 font-mono">{formatCurrency(item.value)}</span>
                                <span className="text-[10px] text-indigo-650 font-extrabold font-mono">{percentage}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Supplier Purchases details */}
              <div className="bg-white p-6 rounded-3xl border shadow-xs">
                <h4 className="font-extrabold text-slate-850 text-sm mb-4 border-b pb-2 flex justify-between">
                  <span>🏢 মাসে ক্রয়কৃত স্টক তালিকা (Purchase Bills)</span>
                  <span className="text-amber-600 font-black">{formatCurrency(monthlyFinancialStats.purchaseTotal)}</span>
                </h4>
                {monthlyFinancialStats.purchaseBreakdown.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 py-12 font-bold">এই মাসে কোনো পণ্য বা স্টক ক্রয়ের রেকর্ড পাওয়া যায়নি।</p>
                ) : (
                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="text-gray-400 font-bold border-b text-[10px] uppercase font-bold text-[#ADB5BD]">
                          <th className="pb-2">তারিখ</th>
                          <th className="pb-2">ইনভয়েস</th>
                          <th className="pb-2">সাপ্লায়ার</th>
                          <th className="pb-2 text-right">মূল্য টাকা</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-bold text-slate-705">
                        {monthlyFinancialStats.purchaseBreakdown.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 font-mono text-[11px] text-gray-500 whitespace-nowrap">{p.date}</td>
                            <td className="py-2.5 font-mono text-[11px] font-bold text-gray-800 whitespace-nowrap">{p.invoiceId}</td>
                            <td className="py-2.5 max-w-[120px] truncate">{p.supplierName}</td>
                            <td className="py-2.5 text-right font-mono font-bold text-slate-950 whitespace-nowrap">{formatCurrency(p.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'pnl' ? (
          <ProfitLossView 
             sales={sales}
             purchases={purchases}
             payments={payments}
             summaries={summaries}
             products={products}
             subDbShipments={subDbShipments}
          />
        ) : activeTab === 'daily-cash-book' ? (
          <DailyCashBookView
            accounts={accounts}
            payments={payments}
            transfers={transfers}
            summaries={summaries}
            customers={customers}
            suppliers={suppliers}
            staff={staff}
            role={role}
            user={user}
          />
        ) : activeTab === 'payment-history' ? (
          <PaymentHistoryView
            payments={payments}
            customers={customers}
            suppliers={suppliers}
            staff={staff}
            accounts={accounts}
            removePayment={removePayment}
            addPayment={addPayment}
            role={role}
            user={user}
          />
        ) : (activeTab === 'sales' || activeTab === 'damage' || activeTab === 'free' || activeTab === 'discount') ? (
          <div className="bg-white rounded-3xl border shadow-sm overflow-x-auto animate-in fade-in duration-350">
            <table className="w-full text-left border-collapse">
             <thead className="bg-[#F8F9FA] text-[10px] uppercase font-bold text-[#ADB5BD]">
               <tr>
                 <th className="px-6 py-4">পণ্যের নাম</th>
                 <th className="px-6 py-4 text-right">মোট পরিমাণ/সংখ্যা</th>
                 <th className="px-6 py-4 text-right">মোট মূল্য</th>
                 <th className="px-6 py-4">Action</th>
               </tr>
             </thead>
             <tbody className="divide-y">
               {summarizedData.map((d: any, i) => (
                 <tr key={i} className="hover:bg-gray-50">
                   <td className="px-6 py-4 font-bold text-gray-950">{d.name}</td>
                   <td className="px-6 py-4 text-right font-mono">{d.qty}</td>
                   <td className="px-6 py-4 text-right font-mono font-bold text-gray-950">{formatCurrency(d.val)}</td>
                   <td className="px-6 py-4">
                       <button 
                           className="text-indigo-600 font-bold text-xs hover:underline" 
                           onClick={() => setSelectedDetail(d)}
                       >
                           বিস্তারিত
                       </button>
                   </td>
                 </tr>
               ))}
               <tr className="bg-gray-50 font-black">
                   <td className="px-6 py-4 text-gray-950">মোট</td>
                   <td className="px-6 py-4 text-right text-gray-950">{summarizedData.reduce((acc: number, d: any) => acc + d.qty, 0)}</td>
                   <td className="px-6 py-4 text-right text-gray-950">{formatCurrency(summarizedData.reduce((acc: number, d: any) => acc + d.val, 0))}</td>
                   <td className="px-6 py-4"></td>
               </tr>
             </tbody>
           </table>
         </div>
       ) : (
         <div className="space-y-6 animate-in fade-in duration-350">
           {!selectedSR ? (
             <div className="bg-white py-16 text-center rounded-3xl border text-gray-400 font-bold text-lg">
               ⚠️ অনুগ্রহ করে উপরে থেকে একজন এসআর (SR) এবং সংশ্লিষ্ট তারিখ নির্বাচন করুন!
             </div>
           ) : Object.keys(srGroupedData).length === 0 ? (
             <div className="bg-white py-16 text-center rounded-3xl border text-gray-400 font-bold text-lg">
               📭 এই এসআর-এর জন্য উক্ত তারিখে কোনো সেলস বা ফ্রি বিতরণের সেটেল্ড ডাটা খুঁজে পাওয়া যায়নি।
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {Object.entries(srGroupedData).map(([supplierName, group]: [string, any]) => (
                 <div key={supplierName} className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col justify-between">
                   <div>
                     <h3 className="text-xl font-bold text-gray-950 border-b pb-3 mb-4 flex justify-between items-center">
                       <span>🏢 {supplierName}</span>
                     </h3>
                     <div className="overflow-x-auto">
                       <table className="w-full text-sm">
                         <thead>
                           <tr className="text-xs text-gray-400 font-bold border-b text-left">
                             <th className="pb-2">পণ্যের নাম</th>
                             <th className="pb-2 text-right">বিক্রি (পিস)</th>
                             <th className="pb-2 text-right">ফ্রি (পিস)</th>
                             <th className="pb-2 text-right">মোট টাকা</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y">
                           {group.items.map((item: any, idx: number) => (
                             <tr key={idx} className="hover:bg-gray-50">
                               <td className="py-2.5 font-bold text-gray-900">{item.name}</td>
                               <td className="py-2.5 text-right font-mono font-bold text-blue-600">{item.qty}</td>
                               <td className="py-2.5 text-right font-mono font-bold text-green-600">{item.freeQty}</td>
                               <td className="py-2.5 text-right font-mono font-semibold text-gray-950">{formatCurrency(item.val)}</td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     </div>
                   </div>
                   <div className="bg-gray-50 p-4 rounded-2xl mt-4 space-y-1 text-xs font-bold text-gray-700">
                     <div className="flex justify-between">
                       <span>মোট বিক্রি:</span>
                       <span className="text-blue-600 text-sm">{group.totalQty} পিস</span>
                     </div>
                     <div className="flex justify-between">
                       <span>মোট ফ্রি গিফট:</span>
                       <span className="text-green-600 text-sm">{group.totalFree} পিস</span>
                     </div>
                     <div className="flex justify-between border-t pt-1 font-extrabold text-sm text-gray-950">
                       <span>মোট মূল্য:</span>
                       <span>{formatCurrency(group.totalVal)}</span>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           )}
         </div>
       )}

      {selectedDetail && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                  <h3 className="text-xl font-bold mb-4">{selectedDetail.name} - বিস্তারিত ইতিহাস</h3>
                  <div className="space-y-4">
                      {selectedDetail.details.map((det: any, idx: number) => (
                          <div key={idx} className="flex justify-between border-b pb-2 text-sm">
                              <span>তারিখ: {det.date} (রোড: {det.route})</span>
                              <span className="font-bold">{det.qty} পিস - {formatCurrency(det.val)}</span>
                          </div>
                      ))}
                      <div className="flex justify-end pt-4 gap-2">
                          <button onClick={() => setSelectedDetail(null)} className="px-4 py-2 bg-gray-200 rounded-xl text-sm font-bold">বন্ধ</button>
                          <button 
                            onClick={async () => {
                                const product = products.find(p => p.name === selectedDetail.name);
                                if (!product || !product.supplierId) { alert("সাপ্লায়ার তথ্য পাওয়া যায়নি"); return; }
                                await addPayment({
                                    entityId: product.supplierId,
                                    amount: selectedDetail.val,
                                    method: "Return",
                                    type: "out",
                                    date: new Date().toISOString().split('T')[0],
                                    description: `Return of ${selectedDetail.name} (${selectedDetail.qty} pcs)`
                                });
                                alert("সাপ্লায়ার রিটার্ন সফলভাবে সম্পন্ন হয়েছে!");
                                setSelectedDetail(null);
                            }} 
                            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold"
                          >
                            সাপ্লায়ার রিটার্ন/এ্যাকশন
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
