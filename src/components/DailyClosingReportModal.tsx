import React, { useState, useMemo } from "react";
import { 
  X, 
  Printer, 
  User, 
  TrendingUp, 
  Package, 
  DollarSign, 
  ChevronDown, 
  ChevronRight, 
  Users, 
  CreditCard, 
  Gift, 
  Percent, 
  AlertTriangle, 
  Briefcase,
  FileText,
  ShieldCheck
} from "lucide-react";
import { formatCurrency } from "../lib/utils";

interface DailyClosingReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: any;
  products: any[];
  staff: any[];
  routes: any[];
  customers: any[];
  suppliers: any[];
}

export default function DailyClosingReportModal({
  isOpen,
  onClose,
  summary,
  products = [],
  staff = [],
  routes = [],
  customers = [],
  suppliers = []
}: DailyClosingReportModalProps) {
  
  // Interactive accordion states to toggle detailed views
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  if (!isOpen || !summary) return null;

  // Determine metadata
  const routeName = routes.find(r => r.id === summary.routeId)?.name || "Unknown Route";
  const dsrName = staff.find(st => st.id === summary.dsrId)?.name || "Unknown DSR";
  const date = summary.settlementDate || summary.date || new Date().toISOString().split('T')[0];

  // Raw values from summary
  const totalSalesValue = Number(summary.salesValue || 0);
  const totalFreeValue = Number(summary.totalFreeValue || 0);
  const totalDiscountValue = Number(summary.totalDiscountValue || 0);
  const totalDamageValue = Number(summary.totalDamageValue || 0);
  const totalExpenses = Number(summary.totalExpenses || 0);
  const totalCredits = Number(summary.totalCredits || 0);
  const totalPayments = Number(summary.totalPayments || 0);
  
  const dsrPayable = Number(summary.dsrPayable !== undefined ? summary.dsrPayable : (totalSalesValue - totalFreeValue - totalDiscountValue - totalDamageValue - totalExpenses - totalCredits));
  const dsrBalance = Number(summary.dsrBalance !== undefined ? summary.dsrBalance : (totalPayments - dsrPayable));

  // 1. Dynamic Supplier-wise Net Sales & Returns Calculation
  const supplierBreakdown = useMemo(() => {
    const breakdown: Record<string, { assigned: number; returned: number; netSales: number; returnRate: number }> = {};
    
    // Process items in this settlement
    (summary.items || []).forEach((item: any) => {
      const p = products.find(prod => prod.id === item.productId);
      const sId = p?.supplierId || "all";
      
      const price = Number(item.price || p?.price || 0);
      const totalPieces = Number(item.totalPieces || item.quantity || 0);
      const returns = Number(item.returns || 0);
      
      const assignedVal = totalPieces * price;
      const returnedVal = returns * price;
      const netVal = Math.max(0, totalPieces - returns) * price;

      if (!breakdown[sId]) {
        breakdown[sId] = { assigned: 0, returned: 0, netSales: 0, returnRate: 0 };
      }

      breakdown[sId].assigned += assignedVal;
      breakdown[sId].returned += returnedVal;
      breakdown[sId].netSales += netVal;
    });

    // Calculate rates
    return Object.entries(breakdown).map(([id, data]) => {
      const supp = suppliers.find(s => s.id === id);
      const rate = data.assigned > 0 ? (data.returned / data.assigned) * 100 : 0;
      return {
        supplierId: id,
        supplierName: supp ? (supp.company || supp.name) : "সাধারণ / সমস্ত সাপ্লায়ার",
        assigned: data.assigned,
        returned: data.returned,
        netSales: data.netSales,
        returnRate: rate
      };
    });
  }, [summary, products, suppliers]);

  // Total metrics
  const totalAssigned = supplierBreakdown.reduce((sum, item) => sum + item.assigned, 0);
  const totalReturned = supplierBreakdown.reduce((sum, item) => sum + item.returned, 0);
  const totalReturnRate = totalAssigned > 0 ? (totalReturned / totalAssigned) * 100 : 0;

  // 2. Dynamic Inventory Valuation
  const liveInventoryValue = useMemo(() => {
    return products.reduce((sum, p) => sum + ((Number(p.stock) || 0) * (Number(p.price) || 0)), 0);
  }, [products]);

  // Yesterday's derived inventory
  const derivedYesterdayInventoryValue = Math.max(0, liveInventoryValue + totalSalesValue - totalReturned);
  const closingInventoryValue = liveInventoryValue + totalDamageValue;

  // 3. Dynamic Customer Balance Reconciliation
  const totalOutstandingDue = useMemo(() => {
    return customers.reduce((sum, c) => sum + (Number(c.balance) || 0), 0);
  }, [customers]);

  const yesterdayTotalDue = Math.max(0, totalOutstandingDue - totalCredits + totalPayments);
  const closingCustomerDue = yesterdayTotalDue - totalPayments + totalCredits;

  // 4. Overall Liability
  const overallLiability = liveInventoryValue + totalOutstandingDue;

  // Trigger A4 Print function matching the exact formatted reporting
  const handlePrint = () => {
    const printContent = `
      <html>
        <head>
          <title>দিনের ক্লোজিং ও হিসাব নিকাশ রিপোর্ট - ${date}</title>
          <style>
            body { 
              font-family: 'Arial', sans-serif; 
              padding: 30px; 
              color: #1e293b;
              line-height: 1.5;
            }
            .header {
              text-align: center;
              border-bottom: 3px double #cbd5e1;
              padding-bottom: 12px;
              margin-bottom: 25px;
            }
            .brand {
              font-size: 26px;
              font-weight: 900;
              margin: 0;
              letter-spacing: 0.5px;
            }
            .subtitle {
              font-size: 13px;
              color: #64748b;
              margin: 4px 0 0 0;
              font-weight: 550;
            }
            .title-box {
              background: #f1f5f9;
              padding: 8px 15px;
              border-radius: 8px;
              display: inline-block;
              font-weight: 800;
              margin-top: 10px;
              font-size: 14px;
              color: #1e293b;
              border: 1px solid #e2e8f0;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
              margin-bottom: 25px;
              background-color: #f8fafc;
              padding: 15px;
              border-radius: 12px;
              border: 1px solid #e2e8f0;
              font-size: 12px;
            }
            .meta-item {
              line-height: 1.6;
            }
            .meta-label {
              color: #64748b;
              font-weight: bold;
              display: block;
              font-size: 10px;
              text-transform: uppercase;
            }
            .meta-val {
              font-weight: 850;
              color: #0f172a;
              font-size: 13px;
            }
            .section-title {
              font-size: 13px;
              font-weight: 900;
              text-transform: uppercase;
              color: #1e1b4b;
              margin-top: 25px;
              margin-bottom: 10px;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 6px;
              letter-spacing: 0.5px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 20px;
              font-size: 12px;
            }
            th, td { 
              border: 1px solid #cbd5e1; 
              padding: 8px 10px; 
              text-align: left; 
            }
            th { 
              background-color: #f8fafc; 
              font-weight: 800;
              color: #334155;
            }
            .num {
              text-align: right;
              font-family: monospace;
              font-weight: bold;
              font-size: 12px;
            }
            .bold-row {
              font-weight: 850;
              background-color: #f1f5f9;
            }
            .grid-2 {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
            }
            .summary-card {
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 15px;
              background: #fff;
              margin-bottom: 15px;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 6px 0;
              border-bottom: 1px dashed #f1f5f9;
              font-size: 11.5px;
            }
            .summary-row:last-child {
              border-bottom: none;
              font-weight: 850;
              font-size: 12.5px;
              padding-top: 10px;
              color: #0f172a;
            }
            .sign-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 50px;
              margin-top: 60px;
              text-align: center;
              font-size: 12px;
            }
            .sign-line {
              border-top: 1.5px solid #64748b;
              padding-top: 6px;
              font-weight: bold;
              color: #475569;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="brand">সমীরা ট্রেডার্স (Samira Traders)</h1>
            <p class="subtitle">প্রোপাইটর: আলহাজ্ব মোঃ জহিরুল ইসলাম | ড্রিম গেট, চড়পাড়া, ময়মনসিংহ</p>
            <div class="title-box">দিনের হিসাব ক্লোজিং ও রিকনসিলিয়েশন শীট</div>
          </div>

          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-label">তারিখ (Date)</span>
              <span class="meta-val">${date}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">রোড / রুট (Route)</span>
              <span class="meta-val">${routeName}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">ডিএসআর (DSR)</span>
              <span class="meta-val">${dsrName}</span>
            </div>
          </div>

          <div class="section-title">১. সাপ্লায়ার-ভিত্তিক বিক্রি ও রিটার্ন সমীকরণ</div>
          <table>
            <thead>
              <tr>
                <th>সাপ্লায়ার নাম</th>
                <th style="text-align: right;">অ্যাসাইন মূল্য (৳)</th>
                <th style="text-align: right;">ফেরত মূল্য (৳)</th>
                <th style="text-align: right;">নেট বিক্রি মূল্য (৳)</th>
                <th style="text-align: right;">রিটার্ন হার (%)</th>
              </tr>
            </thead>
            <tbody>
              ${supplierBreakdown.map(s => `
                <tr>
                  <td style="font-weight: bold;">${s.supplierName}</td>
                  <td class="num">${s.assigned.toLocaleString()} ৳</td>
                  <td class="num">${s.returned.toLocaleString()} ৳</td>
                  <td class="num" style="color: #059669; font-weight: 800;">${s.netSales.toLocaleString()} ৳</td>
                  <td class="num" style="color: ${s.returnRate > 15 ? '#dc2626' : '#475569'}">${s.returnRate.toFixed(1)}%</td>
                </tr>
              `).join('')}
              <tr class="bold-row">
                <td>সর্বমোট সমীকরণ (Total)</td>
                <td class="num">${totalAssigned.toLocaleString()} ৳</td>
                <td class="num">${totalReturned.toLocaleString()} ৳</td>
                <td class="num" style="color: #059669;">${totalSalesValue.toLocaleString()} ৳</td>
                <td class="num">${totalReturnRate.toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>

          <div class="grid-2">
            <div>
              <div class="section-title">২. ক্যাশ ও বিকেল সেটেলমেন্ট হিসাব</div>
              <div class="summary-card">
                <div class="summary-row">
                  <span>মোট বিক্রয় মূল্য (Total Sales Value)</span>
                  <span class="num">${totalSalesValue.toLocaleString()} ৳</span>
                </div>
                <div class="summary-row">
                  <span>মোট আদায় (Total Collection)</span>
                  <span class="num">+ ${totalPayments.toLocaleString()} ৳</span>
                </div>
                <div class="summary-row">
                  <span>মোট কাস্টমার বাকি (Credits/Baki)</span>
                  <span class="num">- ${totalCredits.toLocaleString()} ৳</span>
                </div>
                <div class="summary-row" style="color: #4f46e5;">
                  <span>মোট ফ্রী প্রোডাক্ট মূল্য (Free Value)</span>
                  <span class="num">- ${totalFreeValue.toLocaleString()} ৳</span>
                </div>
                <div class="summary-row" style="color: #db2777;">
                  <span>মোট ক্যাশ ডিসকাউন্ট (Discounts)</span>
                  <span class="num">- ${totalDiscountValue.toLocaleString()} ৳</span>
                </div>
                <div class="summary-row" style="color: #ca8a04;">
                  <span>মোট রাস্তার খরচ (Expenses)</span>
                  <span class="num">- ${totalExpenses.toLocaleString()} ৳</span>
                </div>
                <div class="summary-row" style="color: #dc2626;">
                  <span>মোট ড্যামেজ রিটার্ন (Damage Return)</span>
                  <span class="num">- ${totalDamageValue.toLocaleString()} ৳</span>
                </div>
                <div class="summary-row" style="background: #f8fafc; border-top: 1.5px solid #e2e8f0; margin-top: 8px;">
                  <span>ম্যানেজার প্রত্যাশিত ক্যাশ (Expected Cash)</span>
                  <span class="num" style="color: #059669; font-size: 13px;">${dsrPayable.toLocaleString()} ৳</span>
                </div>
                <div class="summary-row">
                  <span>আজকের ক্যাশ অন হ্যান্ড / ডিএসআর ব্যালেন্স</span>
                  <span class="num" style="color: ${dsrBalance < 0 ? '#dc2626' : '#2563eb'}; font-size: 14px;">${dsrBalance.toLocaleString()} ৳</span>
                </div>
              </div>
            </div>

            <div>
              <div class="section-title">৩. ইনভেন্টরি ও বকেয়া খতিয়ান রিকনসিলিয়েশন</div>
              <div class="summary-card">
                <h4 style="margin: 0 0 10px 0; font-size: 12px; color: #1e1b4b; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">স্টক ইনভেন্টরি ভ্যালুয়েশন</h4>
                <div class="summary-row">
                  <span>পূর্ববর্তী স্টক ভ্যালু (Yesterday Value)</span>
                  <span class="num">${derivedYesterdayInventoryValue.toLocaleString()} ৳</span>
                </div>
                <div class="summary-row">
                  <span>আজকের নিট সেলস স্টক মাইনাস</span>
                  <span class="num">- ${(totalSalesValue - totalReturned).toLocaleString()} ৳</span>
                </div>
                <div class="summary-row" style="color: #dc2626;">
                  <span>আজকের ড্যামেজ স্টক যোগ (+)</span>
                  <span class="num">+ ${totalDamageValue.toLocaleString()} ৳</span>
                </div>
                <div class="summary-row" style="font-weight: bold; background: #f8fafc; color: #0f172a;">
                  <span>আজকের সমাপনী স্টক ভ্যালু (Closing Stock)</span>
                  <span class="num">${closingInventoryValue.toLocaleString()} ৳</span>
                </div>
              </div>

              <div class="summary-card" style="margin-top: 15px;">
                <h4 style="margin: 0 0 10px 0; font-size: 12px; color: #1e1b4b; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">কাস্টমার বকেয়া খতিয়ান সমন্বয়</h4>
                <div class="summary-row">
                  <span>পূর্ববর্তী মোট বকেয়া (Yesterday Dues)</span>
                  <span class="num">${yesterdayTotalDue.toLocaleString()} ৳</span>
                </div>
                <div class="summary-row">
                  <span>আজকের আদায়কৃত পেমেন্ট (-)</span>
                  <span class="num">- ${totalPayments.toLocaleString()} ৳</span>
                </div>
                <div class="summary-row">
                  <span>আজকের নতুন বাকি এড (+)</span>
                  <span class="num">+ ${totalCredits.toLocaleString()} ৳</span>
                </div>
                <div class="summary-row" style="font-weight: bold; background: #f8fafc; color: #0f172a;">
                  <span>আজকের মোট সমাপনী বকেয়া (Closing Dues)</span>
                  <span class="num">${closingCustomerDue.toLocaleString()} ৳</span>
                </div>
              </div>
            </div>
          </div>

          <div class="section-title">৪. সর্বমোট ব্যবসায়িক দায়ভার (Total Liability)</div>
          <div class="summary-card" style="background-color: #f0fdf4; border: 1px solid #bbf7d0;">
            <div class="summary-row">
              <span style="font-size: 12px;">ম্যানেজার সমাপনী ইনভেন্টরি স্টক ভ্যালু</span>
              <span class="num">${closingInventoryValue.toLocaleString()} ৳</span>
            </div>
            <div class="summary-row">
              <span style="font-size: 12px;">আজকের মোট সমাপনী কাস্টমার বকেয়া</span>
              <span class="num">${closingCustomerDue.toLocaleString()} ৳</span>
            </div>
            <div class="summary-row" style="border-top: 1.5px solid #86efac; margin-top: 10px; font-size: 15px; color: #14532d; font-weight: 900;">
              <span>ম্যানেজারের সর্বমোট ব্যবসায়িক লায়াবিলিটি (Total Liability)</span>
              <span class="num">${overallLiability.toLocaleString()} ৳</span>
            </div>
          </div>

          <div class="sign-grid">
            <div class="meta-item">
              <div style="height: 40px;"></div>
              <p class="sign-line">ম্যানেজার স্বাক্ষর (Managers Signature)</p>
            </div>
            <div class="meta-item">
              <div style="height: 40px;"></div>
              <p class="sign-line">প্রোপাইটর স্বাক্ষর (Proprietor Signature)</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const win = window.open("", "_blank", "width=850,height=900");
    win?.document.write(printContent);
    win?.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-gray-100 flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header bar */}
        <div className="bg-indigo-950 text-white p-6 flex justify-between items-center shrink-0">
          <div>
            <h3 className="font-black text-base flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              দিনের ক্লোজিং ও চূড়ান্ত হিসাব নিকাশ রিপোর্ট
            </h3>
            <p className="text-[11px] text-indigo-200 mt-1 font-semibold">
              তারিখ: {date} | রুট: {routeName} | ডিএসআর: {dsrName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            >
              <Printer className="w-4 h-4" /> প্রিন্ট করুন (Print A4)
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/15 rounded-xl text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable container content */}
        <div className="p-6 overflow-y-auto space-y-6 bg-slate-50/50">
          
          {/* 1. Supplier Breakdown Table */}
          <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-xs">
            <h4 className="text-xs font-black text-[#1e1b4b] uppercase tracking-wider mb-3.5 flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <Package className="w-4 h-4 text-indigo-500" /> ১. সাপ্লায়ার-ভিত্তিক বিক্রি ও রিটার্ন রিকনসিলিয়েশন
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-100 font-extrabold uppercase text-gray-500">
                    <th className="px-4 py-3">সাপ্লায়ার</th>
                    <th className="px-4 py-3 text-right">অ্যাসাইন মূল্য</th>
                    <th className="px-4 py-3 text-right">ফেরত মূল্য</th>
                    <th className="px-4 py-3 text-right">নেট বিক্রি</th>
                    <th className="px-4 py-3 text-right">রিটার্ন রেট</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-semibold text-slate-700">
                  {supplierBreakdown.map(s => (
                    <tr key={s.supplierId} className="hover:bg-slate-50/40">
                      <td className="px-4 py-3 font-bold">{s.supplierName}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(s.assigned)}</td>
                      <td className="px-4 py-3 text-right font-mono text-red-500">-{formatCurrency(s.returned)}</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-600 font-black">{formatCurrency(s.netSales)}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${s.returnRate > 15 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-100 text-slate-600'}`}>
                          {s.returnRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-black border-t-2 border-slate-200">
                    <td className="px-4 py-3 text-slate-900">সর্বমোট (Total)</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(totalAssigned)}</td>
                    <td className="px-4 py-3 text-right font-mono text-red-500">-{formatCurrency(totalReturned)}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-600 font-extrabold">{formatCurrency(totalSalesValue)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-900">{totalReturnRate.toFixed(1)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Interactive Cash and Settlement Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Cash Closing Parameter Card */}
            <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-xs space-y-3.5">
              <h4 className="text-xs font-black text-[#1e1b4b] uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
                <DollarSign className="w-4 h-4 text-emerald-500" /> ২. ক্যাশ ও বিকেল সেটেলমেন্ট হিসাব
              </h4>
              <div className="space-y-2.5 text-xs font-bold text-slate-600">
                <div className="flex justify-between items-center py-0.5">
                  <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-slate-400" /> মোট বিক্রয় মূল্য (Total Sales)</span>
                  <span className="font-black font-mono">{formatCurrency(totalSalesValue)}</span>
                </div>

                {/* Interactive Accordions for click detailed checking */}
                <div className="border-t border-b border-gray-100/50 py-1 space-y-1">
                  
                  {/* Total Collection */}
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => toggleSection("collection")}
                      className="w-full flex justify-between items-center py-1 hover:text-[#1e1b4b] transition-colors"
                    >
                      <span className="flex items-center gap-1 text-emerald-600 font-black"><ChevronRight className={`w-3.5 h-3.5 transition-transform ${expandedSection === "collection" ? 'rotate-90' : ''}`} /> (+) মোট আদায় (Collection)</span>
                      <span className="font-black font-mono text-emerald-600">+ {formatCurrency(totalPayments)}</span>
                    </button>
                    {expandedSection === "collection" && (
                      <div className="bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-xl space-y-1 text-[10.5px] text-emerald-800 animate-in slide-in-from-top-1 duration-100">
                        {summary.payments && summary.payments.length > 0 ? (
                          summary.payments.map((p: any, i: number) => (
                            <div key={i} className="flex justify-between font-bold">
                              <span>আদায় রসিদ: {p.method}</span>
                              <span className="font-mono">{formatCurrency(p.amount)}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-center py-1 font-bold text-emerald-600/70">কোনো আদায়ের রেকর্ড নেই</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Customer Due */}
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => toggleSection("credits")}
                      className="w-full flex justify-between items-center py-1 hover:text-[#1e1b4b] transition-colors"
                    >
                      <span className="flex items-center gap-1 text-red-500 font-black"><ChevronRight className={`w-3.5 h-3.5 transition-transform ${expandedSection === "credits" ? 'rotate-90' : ''}`} /> (-) কাস্টমার বাকি (Due Dues)</span>
                      <span className="font-black font-mono text-red-500">- {formatCurrency(totalCredits)}</span>
                    </button>
                    {expandedSection === "credits" && (
                      <div className="bg-red-50/50 border border-red-100 p-2.5 rounded-xl space-y-1 text-[10.5px] text-red-800 animate-in slide-in-from-top-1 duration-100">
                        {summary.credits && summary.credits.length > 0 ? (
                          summary.credits.map((c: any, i: number) => {
                            const custObj = customers.find(x => x.id === c.customerId);
                            return (
                              <div key={i} className="flex justify-between font-bold">
                                <span>কাস্টমার: {custObj?.name || "Unknown"}</span>
                                <span className="font-mono">{formatCurrency(c.amount)}</span>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-center py-1 font-bold text-red-600/70">কোনো বকেয়া বাকির রেকর্ড নেই</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Free Products */}
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => toggleSection("free")}
                      className="w-full flex justify-between items-center py-1 hover:text-[#1e1b4b] transition-colors"
                    >
                      <span className="flex items-center gap-1 text-purple-600 font-black"><ChevronRight className={`w-3.5 h-3.5 transition-transform ${expandedSection === "free" ? 'rotate-90' : ''}`} /> (-) ফ্রী প্রোডাক্ট মূল্য (Free Value)</span>
                      <span className="font-black font-mono text-purple-600">- {formatCurrency(totalFreeValue)}</span>
                    </button>
                    {expandedSection === "free" && (
                      <div className="bg-purple-50/50 border border-purple-100 p-2.5 rounded-xl space-y-1 text-[10.5px] text-purple-800 animate-in slide-in-from-top-1 duration-100">
                        {summary.freeItems && summary.freeItems.length > 0 ? (
                          summary.freeItems.map((f: any, i: number) => {
                            const pObj = products.find(x => x.id === f.productId);
                            return (
                              <div key={i} className="flex justify-between font-bold">
                                <span>ফ্রি আইটেম: {pObj?.name || "Product"}</span>
                                <span className="font-mono">{f.quantity} pcs</span>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-center py-1 font-bold text-purple-600/70">কোনো ফ্রি প্রোডাক্টের রেকর্ড নেই</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Cash Discounts */}
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => toggleSection("discount")}
                      className="w-full flex justify-between items-center py-1 hover:text-[#1e1b4b] transition-colors"
                    >
                      <span className="flex items-center gap-1 text-pink-600 font-black"><ChevronRight className={`w-3.5 h-3.5 transition-transform ${expandedSection === "discount" ? 'rotate-90' : ''}`} /> (-) ক্যাশ ডিসকাউন্ট (Discounts)</span>
                      <span className="font-black font-mono text-pink-600">- {formatCurrency(totalDiscountValue)}</span>
                    </button>
                    {expandedSection === "discount" && (
                      <div className="bg-pink-50/50 border border-pink-100 p-2.5 rounded-xl space-y-1 text-[10.5px] text-pink-800 animate-in slide-in-from-top-1 duration-100">
                        {summary.discountItems && summary.discountItems.length > 0 ? (
                          summary.discountItems.map((d: any, i: number) => {
                            const pObj = products.find(x => x.id === d.productId);
                            return (
                              <div key={i} className="flex justify-between font-bold">
                                <span>ছাড়: {pObj?.name || "Product"}</span>
                                <span className="font-mono">{formatCurrency(d.amount)}</span>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-center py-1 font-bold text-pink-600/70">কোনো ক্যাশ ডিসকাউন্টের রেকর্ড নেই</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Route Expenses */}
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => toggleSection("expenses")}
                      className="w-full flex justify-between items-center py-1 hover:text-[#1e1b4b] transition-colors"
                    >
                      <span className="flex items-center gap-1 text-yellow-600 font-black"><ChevronRight className={`w-3.5 h-3.5 transition-transform ${expandedSection === "expenses" ? 'rotate-90' : ''}`} /> (-) মোট রাস্তার খরচ (Expenses)</span>
                      <span className="font-black font-mono text-yellow-600">- {formatCurrency(totalExpenses)}</span>
                    </button>
                    {expandedSection === "expenses" && (
                      <div className="bg-yellow-50/50 border border-yellow-150 p-2.5 rounded-xl space-y-1 text-[10.5px] text-yellow-800 animate-in slide-in-from-top-1 duration-100">
                        {summary.expenses && summary.expenses.length > 0 ? (
                          summary.expenses.map((e: any, i: number) => (
                            <div key={i} className="flex justify-between font-bold">
                              <span>খরচ খাত: {e.type}</span>
                              <span className="font-mono">{formatCurrency(e.amount)}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-center py-1 font-bold text-yellow-600/70">কোনো খরচের রেকর্ড নেই</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Damage Returns */}
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => toggleSection("damage")}
                      className="w-full flex justify-between items-center py-1 hover:text-[#1e1b4b] transition-colors"
                    >
                      <span className="flex items-center gap-1 text-red-600 font-black"><ChevronRight className={`w-3.5 h-3.5 transition-transform ${expandedSection === "damage" ? 'rotate-90' : ''}`} /> (-) ড্যামেজ রিটার্ন (Damages)</span>
                      <span className="font-black font-mono text-red-600">- {formatCurrency(totalDamageValue)}</span>
                    </button>
                    {expandedSection === "damage" && (
                      <div className="bg-red-50/50 border border-red-100 p-2.5 rounded-xl space-y-1 text-[10.5px] text-red-800 animate-in slide-in-from-top-1 duration-100">
                        {summary.damageItems && summary.damageItems.length > 0 ? (
                          summary.damageItems.map((d: any, i: number) => {
                            const pObj = products.find(x => x.id === d.productId);
                            return (
                              <div key={i} className="flex justify-between font-bold">
                                <span>ড্যামেজ পণ্য: {pObj?.name || "Product"}</span>
                                <span className="font-mono">{d.quantity} pcs</span>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-center py-1 font-bold text-red-600/70">কোনো ড্যামেজ রিটার্ন রেকর্ড নেই</p>
                        )}
                      </div>
                    )}
                  </div>

                </div>

                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-gray-150">
                  <span className="font-black text-[#1e1b4b]">ম্যানেজার প্রত্যাশিত ক্যাশ</span>
                  <span className="font-black font-mono text-emerald-600 text-sm">{formatCurrency(dsrPayable)}</span>
                </div>

                <div className="flex justify-between items-center bg-indigo-50/60 p-3 rounded-xl border border-indigo-100">
                  <span className="font-black text-indigo-950">আজকের ক্যাশ অন হ্যান্ড (DSR Balance)</span>
                  <span className={`font-black font-mono text-sm ${dsrBalance < 0 ? 'text-red-600' : 'text-indigo-600'}`}>{formatCurrency(dsrBalance)}</span>
                </div>
              </div>
            </div>

            {/* Reconciliation Stock & Dues Card */}
            <div className="space-y-6">
              
              {/* Stock Inventory Valuation */}
              <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-xs space-y-3">
                <h4 className="text-xs font-black text-[#1e1b4b] uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
                  <Package className="w-4 h-4 text-purple-500" /> স্টক ইনভেন্টরি ভ্যালুয়েশন রিকনসিলিয়েশন
                </h4>
                <div className="space-y-2 text-xs font-semibold text-slate-600">
                  <div className="flex justify-between">
                    <span>পূর্ববর্তী স্টক ভ্যালু (Derived Yesterday)</span>
                    <span className="font-bold font-mono">{formatCurrency(derivedYesterdayInventoryValue)}</span>
                  </div>
                  <div className="flex justify-between text-red-500">
                    <span>আজকের নিট সেলস স্টক মাইনাস (-)</span>
                    <span className="font-bold font-mono">-{formatCurrency(totalSalesValue - totalReturned)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>আজকের ড্যামেজ স্টক যোগ (+)</span>
                    <span className="font-bold font-mono">+{formatCurrency(totalDamageValue)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-purple-50 p-2.5 rounded-lg border border-purple-100 font-black text-purple-950 mt-1">
                    <span>সমাপনী স্টক ভ্যালু (Closing Stock)</span>
                    <span className="font-mono">{formatCurrency(closingInventoryValue)}</span>
                  </div>
                </div>
              </div>

              {/* Customers Ledger Dues */}
              <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-xs space-y-3">
                <h4 className="text-xs font-black text-[#1e1b4b] uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
                  <Users className="w-4 h-4 text-pink-500" /> কাস্টমার বকেয়া খতিয়ান সমন্বয়
                </h4>
                <div className="space-y-2 text-xs font-semibold text-slate-600">
                  <div className="flex justify-between">
                    <span>পূর্ববর্তী মোট বকেয়া (Yesterday Dues)</span>
                    <span className="font-bold font-mono">{formatCurrency(yesterdayTotalDue)}</span>
                  </div>
                  <div className="flex justify-between text-red-500">
                    <span>আজকের আদায়কৃত পেমেন্ট (-)</span>
                    <span className="font-bold font-mono">-{formatCurrency(totalPayments)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>আজকের নতুন বাকি এড (+)</span>
                    <span className="font-bold font-mono">+{formatCurrency(totalCredits)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-pink-50 p-2.5 rounded-lg border border-pink-100 font-black text-pink-950 mt-1">
                    <span>সমাপনী মোট বকেয়া (Closing Dues)</span>
                    <span className="font-mono">{formatCurrency(closingCustomerDue)}</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* 3. Overall Financial Summary & Manager Liability */}
          <div className="bg-emerald-950 text-white rounded-3xl p-6 border border-emerald-900 shadow-lg space-y-4">
            <h4 className="text-sm font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" /> সর্বমোট ব্যবসায়িক দায়ভার (Total Manager Liability)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold border-b border-emerald-900 pb-4">
              <div className="bg-emerald-900/40 p-3.5 rounded-2xl border border-emerald-800/50">
                <span className="text-emerald-300 block text-[10px] uppercase">সমাপনী ইনভেন্টরি স্টক ভ্যালু</span>
                <span className="text-lg font-black font-mono mt-1 block">{formatCurrency(closingInventoryValue)}</span>
              </div>
              <div className="bg-emerald-900/40 p-3.5 rounded-2xl border border-emerald-800/50">
                <span className="text-emerald-300 block text-[10px] uppercase">সমাপনী কাস্টমার বকেয়া খতিয়ান</span>
                <span className="text-lg font-black font-mono mt-1 block">{formatCurrency(closingCustomerDue)}</span>
              </div>
            </div>
            <div className="flex justify-between items-center bg-emerald-900 p-4 rounded-2xl border border-emerald-800">
              <div>
                <span className="text-emerald-200 font-extrabold text-xs">ম্যানেজারের মোট ব্যবসায়িক লায়াবিলিটি (Total Liability)</span>
                <p className="text-[10px] text-emerald-300 mt-0.5 font-medium">সমাপনী স্টক এবং সমাপনী কাস্টমার বকেয়ার একত্রিত যোগফল</p>
              </div>
              <span className="text-xl font-black font-mono text-emerald-300">{formatCurrency(overallLiability)}</span>
            </div>
          </div>

          {/* 4. Short Transfer to Salary Advance handling */}
          {dsrBalance < 0 && (() => {
            const dsrObj = staff.find(s => s.id === summary?.dsrId);
            const basicSalary = Number(dsrObj?.salary || dsrObj?.Salary || 12000);
            const shortAmount = Math.abs(dsrBalance);
            const advanceAmount = Math.min(shortAmount, basicSalary);
            const debtAmount = shortAmount > basicSalary ? shortAmount - basicSalary : 0;

            return (
              <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200 shadow-xs space-y-3 text-xs text-amber-900">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1.5 flex-1">
                    <h5 className="font-extrabold text-amber-950 text-sm">হিসাবের শর্ট সমন্বয় ও অগ্রিম বেতন (Short Balance Salary Advance)</h5>
                    <p className="text-amber-900 font-medium leading-relaxed">
                      এই রুট সেটেলমেন্টে <strong className="font-mono text-amber-950">{formatCurrency(shortAmount)}</strong> ঘাটতি (শর্ট) রয়েছে। নিয়ম অনুযায়ী এই সট বা ঘাটতি টাকাটি সমন্বয়ের জন্য এভাবে চার্জ করা হবে:
                    </p>
                    <div className="bg-white p-3 rounded-xl border border-amber-150 space-y-1 font-bold">
                      <p className="flex justify-between">
                        <span>১. অগ্রিম বেতন (Manager Salary Advance):</span>
                        <span className="text-amber-950">{formatCurrency(advanceAmount)}</span>
                      </p>
                      {debtAmount > 0 && (
                        <p className="flex justify-between text-red-700">
                          <span>২. অতিরিক্ত বকেয়া খতিয়ান (Recoverable Debt):</span>
                          <span>{formatCurrency(debtAmount)}</span>
                        </p>
                      )}
                    </div>
                    <p className="text-[10px] text-amber-700 font-medium">
                      * এই সেটেলমেন্ট অনুমোদন করা হলে উপরে উল্লেখিত পরিমাণ টাকা স্বয়ংক্রিয়ভাবে সংশ্লিষ্ট স্টাফ ({dsrObj?.name || "N/A"}) এর লেজার অ্যাকাউন্টে অগ্রিম বা ডেট হিসেবে এন্ট্রি হয়ে যাবে।
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

        </div>

        {/* Footer actions */}
        <div className="bg-slate-50 border-t p-4 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-slate-700 font-black rounded-xl text-xs transition-colors"
          >
            বন্ধ করুন (Close)
          </button>
        </div>

      </div>
    </div>
  );
}
