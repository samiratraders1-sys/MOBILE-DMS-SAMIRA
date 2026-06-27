import React, { useMemo, useState } from "react";
import { formatCurrency } from "../lib/utils";
import { Calendar, TrendingUp, DollarSign, Wallet, ArrowDownRight, ArrowUpRight, HelpCircle, Download, Share2, Printer } from "lucide-react";

interface PnLProps {
  sales: any[];
  purchases: any[];
  payments: any[];
  summaries: any[];
  products: any[];
  subDbShipments?: any[];
}

export default function ProfitLossView({ sales = [], purchases = [], payments = [], summaries = [], products = [], subDbShipments = [] }: PnLProps) {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const pnlSummary = useMemo(() => {
    // 1. Date ranges
    const startDateTime = startDate + "T00:00:00";
    const endDateTime = endDate + "T23:59:59";

    // Standard POS sales filtering (approved only)
    const filteredSales = sales.filter(s => 
      s.date >= startDate && 
      s.date <= endDate && 
      s.status !== "rejected" && 
      s.approved !== false
    );

    // DSR Settled Summaries filtering
    const filteredSummaries = summaries.filter(s => {
      const sDate = s.settlementDate || s.date;
      return s.status === "settled" && s.approved && sDate >= startDate && sDate <= endDate;
    });

    // Payments filtering
    const filteredPayments = payments.filter(p => 
      p.date >= startDate && 
      p.date <= endDate && 
      p.status !== "rejected" &&
      p.approved !== false
    );

    // 2. Compute Net Sales Revenue and COGS (Cost of Goods Sold)
    let totalSalesRevenue = 0;
    let totalCOGS = 0;
    let freeProductsQuantity = 0;
    let freeProductsValue = 0;

    // A) Process POS Sales
    filteredSales.forEach(sale => {
      const items = sale.items || [];
      items.forEach((item: any) => {
        const qty = Number(item.qty || item.quantity || 0);
        const sellPrice = Number(item.price || 0);

        // Lookup product cost in catalog
        const pId = item.id || item.productId;
        const catalogProd = products.find((p: any) => p.id === pId);
        const buyCost = Number(catalogProd?.cost || item.cost || 0);

        totalSalesRevenue += qty * sellPrice;
        totalCOGS += qty * buyCost;
      });
    });

    // B) Process Settled Route Summaries (subtracting free items for net calculation)
    filteredSummaries.forEach(s => {
      // Map free item quantities by product
      const freeQtyMap: Record<string, number> = {};
      (s.freeItems || []).forEach((f: any) => {
        const qty = Number(f.quantity || 0);
        freeQtyMap[f.productId] = (freeQtyMap[f.productId] || 0) + qty;
        freeProductsQuantity += qty;
        
        const catalogProd = products.find((p: any) => p.id === f.productId);
        freeProductsValue += qty * (catalogProd?.price || f.price || 0);
      });

      const items = s.items || [];
      items.forEach((item: any) => {
        const totalSold = Math.max(0, Number(item.soldQty !== undefined ? item.soldQty : (item.totalPieces - (item.returns || 0))));
        const freeQty = freeQtyMap[item.productId] || 0;

        // "ফ্রি বাদে নিট যে প্রোডাক্ট সেল হবে সেটি প্রফিট ক্যালকুলেশনে আসবে"
        const netSold = Math.max(0, totalSold - freeQty);

        const sellPrice = Number(item.price || 0);
        const catalogProd = products.find((p: any) => p.id === item.productId);
        const buyCost = Number(catalogProd?.cost || item.cost || 0);

        totalSalesRevenue += netSold * sellPrice;
        totalCOGS += netSold * buyCost;
      });
    });

    // 3. Process Payments into Other Incomes and Business Expenses
    const expenseByCategory: Record<string, number> = {};
    const incomeByCategory: Record<string, number> = {};

    filteredPayments.forEach(p => {
      const amount = Number(p.amount || 0);
      // Skip supplier payments since they represent stock assets and mapped in purchases/COGS
      if (p.category === "Supplier Payment" || p.category === "সাপ্লায়ার পেমেন্ট") {
        return;
      }

      if (p.type === 'out') {
        expenseByCategory[p.category || "অন্যান্য খরচ"] = (expenseByCategory[p.category || "অন্যান্য খরচ"] || 0) + amount;
      } else if (p.type === 'in') {
        // Skip Sub-DB Collection since that is cash inflow of balance due, not raw profit/income itself
        if (p.category === "Sub-DB Collection") return;
        incomeByCategory[p.category || "অন্যান্য সাধারণ আয়"] = (incomeByCategory[p.category || "অন্যান্য সাধারণ আয়"] || 0) + amount;
      }
    });

    // 4. Calculate Sub-DB Shipments Net Profit in date range
    const filteredSubDbShipments = subDbShipments.filter(s => 
      s.date >= startDate && s.date <= endDate
    );
    const totalSubDbProfit = filteredSubDbShipments.reduce((sum, s) => {
      return sum + Number(s.totalSubDbProfit || 0);
    }, 0);

    if (totalSubDbProfit > 0) {
      incomeByCategory["সাব-ডিবি ইনকাম (কার্টুন কমিশন ও গাড়ি ভাড়া)"] = totalSubDbProfit;
    }

    const totalExpenses = Object.values(expenseByCategory).reduce((a, b) => a + b, 0);
    const totalOthersIncome = Object.values(incomeByCategory).reduce((a, b) => a + b, 0);

    // Sales Gross Profit (পণ্য বিক্রয় লাভ)
    const salesGrossProfit = totalSalesRevenue - totalCOGS;

    // Total Revenue (Gross Profit + Others Income)
    const totalMarginWithOthers = salesGrossProfit + totalOthersIncome;

    // Net Profit
    const netProfit = totalMarginWithOthers - totalExpenses;

    return {
      salesRevenue: totalSalesRevenue,
      cogs: totalCOGS,
      salesGrossProfit,
      freeQty: freeProductsQuantity,
      freeVal: freeProductsValue,
      expenses: expenseByCategory,
      income: incomeByCategory,
      totalExpenses,
      totalOthersIncome,
      netProfit
    };
  }, [sales, summaries, payments, products, startDate, endDate]);

  const handleDownloadExcel = () => {
    const headers = ["বিবরণ (Particulars)", "পরিমাণ (Amount)"];
    const rows = [
      ["পণ্য বিক্রয়জনিত গ্রস লাভ (Gross Profit)", pnlSummary.salesGrossProfit],
      ["নীট বিক্রয় (Net Sales)", pnlSummary.salesRevenue],
      ["ক্রয়মূল্য (COGS)", pnlSummary.cogs],
      ["অন্যান্য সাধারণ আয় (Other Incomes)", pnlSummary.totalOthersIncome],
      ...Object.entries(pnlSummary.income).map(([cat, val]) => [`  - ${cat}`, val]),
      ["মোট পরিচালন ব্যয় (Total Expenses)", pnlSummary.totalExpenses],
      ...Object.entries(pnlSummary.expenses).map(([cat, val]) => [`  - ${cat}`, val]),
      ["মোট ফ্রি পণ্য দেওয়া হয়েছে (Free Qty)", pnlSummary.freeQty],
      ["সমতুল্য বাজার মূল্য (Free Value)", pnlSummary.freeVal],
      ["চূড়ান্ত লাভ-ক্ষতি (Net Profit/Loss)", pnlSummary.netProfit]
    ];

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].map(e => e.map(val => `"${val}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Profit_Loss_Report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleWhatsAppShare = () => {
    let text = `📊 *লাভ-ক্ষতি রিপোর্ট (Profit & Loss)*\n`;
    text += `📅 পিরিয়ড: ${startDate} থেকে ${endDate}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💰 *পণ্য বিক্রয়জনিত গ্রস লাভ:* ${formatCurrency(pnlSummary.salesGrossProfit)}\n`;
    text += `   - নীট বিক্রয়: ${formatCurrency(pnlSummary.salesRevenue)}\n`;
    text += `   - ক্রয়মূল্য (COGS): ${formatCurrency(pnlSummary.cogs)}\n`;
    text += `✨ *অন্যান্য সাধারণ আয়:* ${formatCurrency(pnlSummary.totalOthersIncome)}\n`;
    Object.entries(pnlSummary.income).forEach(([cat, val]) => {
      text += `   - ${cat}: ${formatCurrency(val as number)}\n`;
    });
    text += `🛑 *মোট পরিচালন ব্যয়:* -${formatCurrency(pnlSummary.totalExpenses)}\n`;
    Object.entries(pnlSummary.expenses).forEach(([cat, val]) => {
      text += `   - ${cat}: -${formatCurrency(val as number)}\n`;
    });
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📈 *চূড়ান্ত লাভ-ক্ষতি (Net Profit):* ${formatCurrency(pnlSummary.netProfit)}\n`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar / Header */}
      <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-xs flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-indigo-600" /> লাভ-ক্ষতি প্রতিবেদন (Profit & Loss)
          </h2>
          <p className="text-sm font-semibold text-gray-500 mt-1">
            পণ্য বিক্রয় লাভ, সাধারণ আয়, বেতন ও আনুষঙ্গিক খরচ সমন্বিত হিসাব
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          <div className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-2xl border border-gray-200">
            <Calendar className="w-4 h-4 text-gray-400 shrink-0 ml-1" />
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
              className="bg-transparent border-none text-xs font-bold text-gray-700 focus:outline-none focus:ring-0 cursor-pointer" 
            />
            <span className="text-gray-400 text-xs font-bold">থেকে</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
              className="bg-transparent border-none text-xs font-bold text-gray-700 focus:outline-none focus:ring-0 cursor-pointer" 
            />
          </div>
          <button onClick={() => window.print()} className="px-4 py-2.5 bg-gray-900 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 hover:bg-black cursor-pointer"><Printer className="w-4 h-4" /> প্রিন্ট</button>
          <button onClick={handleDownloadExcel} className="px-4 py-2.5 bg-emerald-600 text-white rounded-2xl text-xs font-black flex items-center gap-1.5 hover:bg-emerald-700 cursor-pointer"><Download className="w-4 h-4" /> এক্সেল ডাউনলোড</button>
          <button onClick={handleWhatsAppShare} className="px-4 py-2.5 bg-green-500 text-white rounded-2xl text-xs font-black flex items-center gap-1.5 hover:bg-green-600 cursor-pointer"><Share2 className="w-4 h-4" /> হোয়াটসঅ্যাপে শেয়ার</button>
        </div>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Gross Sales Margin Card */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">পণ্য বিক্রয়জনিত গ্রস লাভ</span>
              <span className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                <ArrowUpRight className="w-5 h-5" />
              </span>
            </div>
            <h3 className="text-3xl font-black text-emerald-600 tracking-tighter">
              {formatCurrency(pnlSummary.salesGrossProfit)}
            </h3>
          </div>
          <div className="border-t border-gray-50 pt-3 mt-4 flex justify-between text-xs font-bold text-gray-500">
            <span>নীট বিক্রয়: {formatCurrency(pnlSummary.salesRevenue)}</span>
            <span>ক্রয়মূল্য (COGS): {formatCurrency(pnlSummary.cogs)}</span>
          </div>
        </div>

        {/* Supplementary Incomes Card */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">অন্যান্য সাধারণ আয়</span>
              <span className="p-2 bg-blue-50 rounded-xl text-blue-600">
                <DollarSign className="w-5 h-5" />
              </span>
            </div>
            <h3 className="text-3xl font-black text-blue-600 tracking-tighter">
              {formatCurrency(pnlSummary.totalOthersIncome)}
            </h3>
          </div>
          <div className="border-t border-gray-50 pt-3 mt-4 text-xs font-bold text-gray-400">
            ডিলার কমিশন, কার্টুন ও সাধারণ আয়ের সমষ্টি
          </div>
        </div>

        {/* Operating Expenses Card */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">মোট পরিচালন ব্যয় (বেতনসহ)</span>
              <span className="p-2 bg-red-50 rounded-xl text-red-600">
                <ArrowDownRight className="w-5 h-5" />
              </span>
            </div>
            <h3 className="text-3xl font-black text-red-650 tracking-tighter">
              {formatCurrency(pnlSummary.totalExpenses)}
            </h3>
          </div>
          <div className="border-t border-gray-50 pt-3 mt-4 text-xs font-bold text-gray-400">
            বেতন, জ্বালানি বিল ও অন্যান্য অফিস খরচের সমষ্টি
          </div>
        </div>
      </div>

      {/* Net Profit Summary Panel */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden shadow-lg">
        {/* Abstract background decorative item */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-505/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div>
          <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">চুড়ান্ত ফলাফল (Net Profit/Loss)</span>
          <h2 className="text-4xl font-extrabold tracking-tighter mt-1 hover:scale-101 transition-all">
            {formatCurrency(pnlSummary.netProfit)}
          </h2>
          <p className="text-xs font-medium text-slate-400 mt-2">
            সর্বমোট লাভ ({formatCurrency(pnlSummary.salesGrossProfit + pnlSummary.totalOthersIncome)}) থেকে পরিচালন ব্যয় বিয়োগ করার পর নিট পরিমান।
          </p>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/50 p-4 rounded-2xl md:min-w-[280px]">
          <div className="text-xs font-bold text-slate-400 mb-2 flex items-center justify-between">
            <span>ফ্রি/উপহার পণ্য হিসাব (Exempted List):</span>
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="flex justify-between items-center text-sm">
            <span>মোট ফ্রি পণ্য দেওয়া হয়েছে:</span>
            <span className="font-extrabold text-indigo-300 font-mono">{pnlSummary.freeQty} টি</span>
          </div>
          <div className="flex justify-between items-center text-xs mt-1 text-slate-400">
            <span>সমতুল্য বাজার মূল্য:</span>
            <span className="font-bold text-slate-300">{formatCurrency(pnlSummary.freeVal)}</span>
          </div>
        </div>
      </div>

      {/* Detailed Side-by-Side Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses List */}
        <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-xs">
          <h3 className="font-extrabold text-base text-gray-950 mb-4 border-b border-gray-50 pb-3 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-red-500 rounded-sm" /> ধাপে ধাপে পরিচালন ব্যয়সমূহ (Expenses & Salaries)
          </h3>
          <div className="divide-y divide-gray-50 max-h-[350px] overflow-y-auto pr-2">
            {Object.entries(pnlSummary.expenses).length > 0 ? (
              Object.entries(pnlSummary.expenses).map(([category, amount]) => (
                <div key={category} className="flex justify-between items-center py-2.5">
                  <span className="text-sm text-gray-700 font-semibold">{category}</span>
                  <span className="text-sm font-extrabold text-red-650 font-mono">{formatCurrency(amount as number)}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-xs text-gray-400">
                এই সময়ের মাঝে কোনো খরচ বা বেতন এন্ট্রি পাওয়া যায়নি।
              </div>
            )}
          </div>
          <div className="border-t border-gray-100 pt-3 mt-4 flex justify-between font-black text-sm text-gray-900 bg-gray-50/50 p-3 rounded-2xl">
            <span>সর্বমোট পরিচালন ব্যয়</span>
            <span className="font-mono text-red-650">{formatCurrency(pnlSummary.totalExpenses)}</span>
          </div>
        </div>

        {/* Extra Income List */}
        <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-xs">
          <h3 className="font-extrabold text-base text-gray-950 mb-4 border-b border-gray-50 pb-3 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-indigo-500 rounded-sm" />আদার্স/অন্যান্য আয়ের খাতসমূহ (Supplementary Revenues)
          </h3>
          <div className="divide-y divide-gray-50 max-h-[350px] overflow-y-auto pr-2">
            {Object.entries(pnlSummary.income).length > 0 ? (
              Object.entries(pnlSummary.income).map(([category, amount]) => (
                <div key={category} className="flex justify-between items-center py-2.5">
                  <span className="text-sm text-gray-700 font-semibold">{category}</span>
                  <span className="text-sm font-extrabold text-indigo-600 font-mono">{formatCurrency(amount as number)}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-xs text-gray-400">
                এই সময়ের মাঝে কোনো বাড়তি আয় এন্ট্রি পাওয়া যায়নি।
              </div>
            )}
          </div>
          <div className="border-t border-gray-100 pt-3 mt-4 flex justify-between font-black text-sm text-gray-900 bg-indigo-50/20 p-3 rounded-2xl">
            <span>সর্বমোট অন্যান্য সাধারণ আয়</span>
            <span className="font-mono text-indigo-600">{formatCurrency(pnlSummary.totalOthersIncome)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
