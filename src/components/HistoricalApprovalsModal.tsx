import React, { useState, useMemo } from "react";
import { 
  X, Search, ShieldCheck, CheckCircle2, Calendar, User, DollarSign, FileText, ArrowRightLeft, Info 
} from "lucide-react";
import { formatCurrency } from "../lib/utils";

interface HistoricalApprovalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityId?: string; // e.g. customerId or staffId
  entityType?: "customer" | "supplier" | "staff";
  transactionId?: string;
  sales: any[];
  summaries: any[];
  payments: any[];
  customers: any[];
  staff: any[];
  suppliers: any[];
  routes: any[];
}

export default function HistoricalApprovalsModal({
  isOpen,
  onClose,
  entityId,
  entityType,
  transactionId,
  sales = [],
  summaries = [],
  payments = [],
  customers = [],
  staff = [],
  suppliers = [],
  routes = []
}: HistoricalApprovalsModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "sale" | "settlement" | "adjustment" | "payment">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Compile all approved adjustment records
  const allHistory = useMemo(() => {
    const list: any[] = [];

    // 1. Approved Sales
    sales.forEach(s => {
      if (s.status === "approved" || s.approved === true) {
        list.push({
          id: s.id,
          date: s.date || s.createdAt?.split("T")[0] || "N/A",
          type: "sale",
          typeName: "বিক্রয় ও পস অনুমোদন",
          entityId: s.customerId,
          entityType: "customer",
          entityName: customers.find(c => c.id === s.customerId)?.name || "Unknown Customer",
          amount: s.total || s.totalAmount || 0,
          description: s.description || `POS/রুট বিক্রয় চূড়ান্ত অনুমোদন`,
          approvedBy: s.approvedBy || s.createdBy || "Admin",
          refId: s.id,
          status: "approved"
        });
      }
    });

    // 2. Settled Summaries
    summaries.forEach(s => {
      if (s.status === "settled" || s.approved === true) {
        const dsrName = staff.find(st => st.id === s.dsrId)?.name || "Unknown DSR";
        const routeName = routes.find(r => r.id === s.routeId)?.name || "N/A";
        list.push({
          id: s.id,
          date: s.settlementDate || s.date || "N/A",
          type: "settlement",
          typeName: "ডিএসআর সেটেলমেন্ট অনুমোদন",
          entityId: s.dsrId,
          entityType: "staff",
          entityName: `${dsrName} (DSR)`,
          amount: s.salesValue || 0,
          description: `ডিএসআর বিকেল হিসাব ক্লোজিং সেটেলমেন্ট (রুট: ${routeName})`,
          approvedBy: s.approvedBy || "Admin",
          refId: s.id,
          status: "settled",
          extra: s.dsrBalance < 0 ? {
            short: s.dsrBalance,
            salary: staff.find(st => st.id === s.dsrId)?.salary || 12000
          } : null
        });
      }
    });

    // 3. Approved Payments / Collections
    payments.forEach(p => {
      if (p.status === "approved" || p.approved === true) {
        let name = "N/A";
        let partyType: "customer" | "supplier" | "staff" = "customer";
        const c = customers.find(x => x.id === p.entityId);
        const st = staff.find(x => x.id === p.entityId);
        const s = suppliers.find(x => x.id === p.entityId);
        
        if (c) {
          name = `${c.name} (কাস্টমার)`;
          partyType = "customer";
        } else if (st) {
          name = `${st.name} (স্টাফ)`;
          partyType = "staff";
        } else if (s) {
          name = `${s.name || s.company} (সাপ্লায়ার)`;
          partyType = "supplier";
        }

        const isAdjustment = p.category === "Ledger Adjustment" || p.method === "Adjustment" || p.category?.includes("Advance") || p.category?.includes("Debt");

        list.push({
          id: p.id,
          date: p.date || p.createdAt?.split("T")[0] || "N/A",
          type: isAdjustment ? "adjustment" : "payment",
          typeName: p.category || (p.type === "in" ? "ক্যাশ কালেকশন জমা" : "ক্যাশ পেমেন্ট পরিশোধ"),
          entityId: p.entityId,
          entityType: partyType,
          entityName: name,
          amount: p.amount || 0,
          description: p.description || (p.type === "in" ? "টাকা গ্রহণ ও খতিয়ান ভুক্তি" : "টাকা পরিশোধ ও সমন্বয়"),
          approvedBy: p.createdBy || "Admin",
          refId: p.refId || p.id,
          status: "approved"
        });
      }
    });

    return list.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  }, [sales, summaries, payments, customers, staff, suppliers, routes]);

  // Filter historical records based on inputs
  const filteredHistory = useMemo(() => {
    return allHistory.filter(item => {
      // 1. Entity filter (if modal opened for a specific party ledger)
      if (entityId) {
        if (item.entityId !== entityId && item.refId !== entityId) {
          return false;
        }
      }

      // 2. Transaction ID filter (if specifically requested)
      if (transactionId) {
        if (item.id !== transactionId && item.refId !== transactionId) {
          return false;
        }
      }

      // 3. Type Filter
      if (filterType !== "all" && item.type !== filterType) {
        return false;
      }

      // 4. Date Range Filter
      if (startDate && item.date < startDate) {
        return false;
      }
      if (endDate && item.date > endDate) {
        return false;
      }

      // 5. Search Filter (Search by transaction ID, entity name, description)
      const query = searchTerm.toLowerCase().trim();
      if (query) {
        const matchesQuery = 
          item.id.toLowerCase().includes(query) ||
          (item.refId && item.refId.toLowerCase().includes(query)) ||
          item.entityName.toLowerCase().includes(query) ||
          item.typeName.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.approvedBy.toLowerCase().includes(query);
        
        if (!matchesQuery) return false;
      }

      return true;
    });
  }, [allHistory, entityId, transactionId, filterType, startDate, endDate, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-indigo-400" />
            <div>
              <h3 className="font-extrabold text-base">অনুমোদন ও সমন্বয় ইতিহাস (Historical Approvals & Ledger History)</h3>
              <p className="text-[10px] text-slate-400">
                {entityId ? "নির্দিষ্ট লেজারের সাথে সম্পর্কিত সকল অনুমোদিত হিসাবের তালিকা ও তারিখ ভিত্তিক সমন্বয়" : "সিস্টেমে অনুমোদিত ও সমন্বিত সকল ট্রানজেকশনের সম্পূর্ণ খতিয়ান ইতিহাস"}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters Panel */}
        <div className="p-4 bg-slate-50 border-b flex flex-col gap-3 shrink-0">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search box */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="ট্রানজেকশন আইডি, বিবরণ বা ইউজারের নাম দিয়ে খুঁজুন..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-950 transition-all"
              />
            </div>

            {/* Date Range Selectors */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-450 uppercase">তারিখ রেঞ্জ:</span>
              <input 
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-950"
              />
              <span className="text-gray-400 text-xs">থেকে</span>
              <input 
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-950"
              />
              {(startDate || endDate) && (
                <button 
                  onClick={() => { setStartDate(""); setEndDate(""); }}
                  className="text-[10px] font-bold text-red-600 hover:underline px-1"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Type Filters */}
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1.5 text-xs font-extrabold rounded-xl border transition-all ${
                filterType === "all" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              সব ট্রানজেকশন
            </button>
            <button
              onClick={() => setFilterType("sale")}
              className={`px-3 py-1.5 text-xs font-extrabold rounded-xl border transition-all ${
                filterType === "sale" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              বিক্রয় (Sale)
            </button>
            <button
              onClick={() => setFilterType("settlement")}
              className={`px-3 py-1.5 text-xs font-extrabold rounded-xl border transition-all ${
                filterType === "settlement" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              সেটেলমেন্ট (DSR)
            </button>
            <button
              onClick={() => setFilterType("adjustment")}
              className={`px-3 py-1.5 text-xs font-extrabold rounded-xl border transition-all ${
                filterType === "adjustment" ? "bg-amber-600 text-white border-amber-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              সমন্বয় (Adjustment)
            </button>
            <button
              onClick={() => setFilterType("payment")}
              className={`px-3 py-1.5 text-xs font-extrabold rounded-xl border transition-all ${
                filterType === "payment" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              আদায়/পরিশোধ
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {filteredHistory.length === 0 ? (
            <div className="py-16 text-center text-gray-400 space-y-3">
              <Info className="w-10 h-10 mx-auto text-gray-300 animate-pulse" />
              <p className="text-sm font-bold">কোনো অনুমোদিত ইতিহাসের রেকর্ড পাওয়া যায়নি।</p>
              <p className="text-xs max-w-sm mx-auto text-gray-400">
                অনুগ্রহ করে সার্চ কুয়েরি পরিবর্তন করুন বা অন্য কোনো ফিল্টার নির্বাচন করুন।
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-150 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-150 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    <th className="p-3.5">তারিখ (Date)</th>
                    <th className="p-3.5">আইডি / রেফারেন্স (ID/Ref)</th>
                    <th className="p-3.5">ধরণ (Type)</th>
                    <th className="p-3.5">সংশ্লিষ্ট খতিয়ান (Entity Name)</th>
                    <th className="p-3.5">বিবরণ (Description)</th>
                    <th className="p-3.5 text-right">টাকার পরিমাণ (Amount)</th>
                    <th className="p-3.5 text-center">এপ্রুভার (Approved By)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                  {filteredHistory.map((item, index) => {
                    const isShortDiscrepancy = item.extra && item.extra.short < 0;
                    return (
                      <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3.5 text-slate-500 font-bold whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            {item.date}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-slate-500 text-[11px]">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-gray-600">
                            #{item.id.slice(-6).toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            item.type === "sale" ? "bg-indigo-50 text-indigo-700 border border-indigo-100" :
                            item.type === "settlement" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                            item.type === "adjustment" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                            "bg-blue-50 text-blue-700 border border-blue-100"
                          }`}>
                            {item.typeName}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-slate-800 whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-gray-450" />
                            {item.entityName}
                          </span>
                        </td>
                        <td className="p-3.5 min-w-[200px] text-gray-600 leading-relaxed font-normal">
                          <p className="font-semibold text-slate-700">{item.description}</p>
                          {isShortDiscrepancy && (
                            <div className="mt-1 bg-amber-50 p-2 rounded-lg border border-amber-150 text-[10px] text-amber-900 font-bold">
                              <span>⚠️ হিসাবের ঘাটতি (শর্ট): {formatCurrency(Math.abs(item.extra.short))}</span>
                              <span className="mx-2">|</span>
                              <span>বেসিক বেতন: {formatCurrency(item.extra.salary)}</span>
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 text-right font-black text-slate-900 whitespace-nowrap">
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="p-3.5 text-center font-bold text-slate-500 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 bg-slate-50 border px-2 py-0.5 rounded-lg text-[10px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            {item.approvedBy}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t p-4 flex justify-between items-center shrink-0">
          <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            যেকোনো ট্রানজেকশন এন্ট্রি চূড়ান্ত এপ্রুভাল এর পর আর কোনোভাবেই পরিবর্তনযোগ্য নয়।
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-extrabold rounded-xl text-xs transition-colors"
          >
            বন্ধ করুন (Close)
          </button>
        </div>

      </div>
    </div>
  );
}
