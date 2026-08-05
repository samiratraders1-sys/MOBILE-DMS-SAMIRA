import React, { useState, useEffect, useMemo } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { 
  Sun, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ShoppingBag, 
  Users, 
  TrendingUp, 
  FileText, 
  ArrowRight,
  ShieldCheck,
  Receipt
} from "lucide-react";
import toast from "react-hot-toast";

interface AfternoonSettlementProps {
  summaries?: any[];
  products?: any[];
  staff?: any[];
  routes?: any[];
  customers?: any[];
  updateSummary?: (id: string, data: any) => Promise<void>;
  onApproveSettlement?: (id: string, forceSync?: boolean) => Promise<void>;
}

export default function AfternoonSettlementPage({
  summaries = [],
  products = [],
  staff = [],
  routes = [],
  customers = [],
  updateSummary,
  onApproveSettlement
}: AfternoonSettlementProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [filterText, setFilterText] = useState<string>("");

  const today = new Date().toISOString().split("T")[0];

  const fetchAfternoonSales = async () => {
    setLoading(true);
    setError(null);
    try {
      let salesData: any[] = [];
      
      // 1. Try querying sales with shift == 'afternoon' and date == today
      try {
        const qShift = query(
          collection(db, "sales"),
          where("date", "==", today),
          where("shift", "==", "afternoon")
        );
        const snapshotShift = await getDocs(qShift);
        snapshotShift.forEach((docSnap) => {
          salesData.push({ id: docSnap.id, ...docSnap.data() });
        });
      } catch (err) {
        console.warn("Shift query warning, falling back to date query:", err);
      }

      // 2. If shift field wasn't used or no records found, fetch today's sales and filter by time >= 12:00 PM
      if (salesData.length === 0) {
        const qDate = query(
          collection(db, "sales"),
          where("date", "==", today)
        );
        const snapshotDate = await getDocs(qDate);
        const todaySales: any[] = [];
        snapshotDate.forEach((docSnap) => {
          todaySales.push({ id: docSnap.id, ...docSnap.data() });
        });

        salesData = todaySales.filter((s) => {
          if (s.shift === "afternoon") return true;
          if (s.shift === "morning") return false;

          // Filter by time field or createdAt timestamp (>= 12:00 PM)
          if (s.time) {
            const hour = parseInt(s.time.split(":")[0] || "0", 10);
            return hour >= 12;
          }
          if (s.createdAt) {
            const dateObj = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
            if (!isNaN(dateObj.getTime())) {
              return dateObj.getHours() >= 12;
            }
          }
          return true; // fallback to include today's sales
        });
      }

      setSales(salesData);
      setLoading(false);
      toast.success("বিকেলের হিসাব লোড হয়েছে");
    } catch (err: any) {
      console.error("Error fetching afternoon settlement:", err);
      setError("ডাটা লোড করতে সমস্যা: " + (err?.message || "অজানা ত্রুটি"));
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAfternoonSales();
  }, []);

  // Filtered sales for display
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (!filterText) return true;
      const lower = filterText.toLowerCase();
      return (
        (s.customerName || "").toLowerCase().includes(lower) ||
        (s.id || "").toLowerCase().includes(lower) ||
        (s.createdBy || "").toLowerCase().includes(lower)
      );
    });
  }, [sales, filterText]);

  // Aggregate stats
  const totalSalesRevenue = useMemo(() => {
    return sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  }, [sales]);

  const totalPaidAmount = useMemo(() => {
    return sales.reduce((sum, s) => sum + (Number(s.paidAmount) || 0), 0);
  }, [sales]);

  const totalDueAmount = useMemo(() => {
    return sales.reduce((sum, s) => sum + (Number(s.dueAmount) || 0), 0);
  }, [sales]);

  // Render Loading State
  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 space-y-4 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-base font-bold text-gray-700">Loading...</p>
        <p className="text-xs text-gray-400">আজকের বিকেলের বিক্রয় ও হিসাব সংগ্রহ করা হচ্ছে</p>
      </div>
    );
  }

  // Render Error State
  if (error) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 space-y-4 bg-red-50/50 rounded-3xl border border-red-200">
        <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="text-center max-w-md">
          <h3 className="text-lg font-black text-red-950 mb-1">হিসাব লোডিং ত্রুটি</h3>
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
        <button
          onClick={fetchAfternoonSales}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
        >
          <RefreshCw className="w-4 h-4" /> পুনরায় চেষ্টা করুন
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-950 flex items-center gap-2">
            <Sun className="w-7 h-7 text-amber-500" />
            বিকাল: হিসাব নিকাশ (Afternoon Settlement)
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-0.5">
            তারিখ: <span className="font-bold text-gray-800">{today}</span> | বিকেলের বিক্রয় ও কালেকশন ক্লোজিং
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAfternoonSales}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition"
          >
            <RefreshCw className="w-4 h-4" /> রিফ্রেশ করুন
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">মোট বিকেলের বিক্রয়</span>
            <ShoppingBag className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-gray-950">৳{totalSalesRevenue.toLocaleString()}</div>
          <div className="text-xs text-gray-500 font-medium mt-1">{sales.length}টি বিক্রয় চালান</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">মোট কালেকশন (Cash)</span>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600">৳{totalPaidAmount.toLocaleString()}</div>
          <div className="text-xs text-gray-500 font-medium mt-1">নগদ আদায়কৃত অর্থ</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">মোট বাকি / বকেয়া</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">৳{totalDueAmount.toLocaleString()}</div>
          <div className="text-xs text-gray-500 font-medium mt-1">কাস্টমার বাকি খাত</div>
        </div>
      </div>

      {/* Sales List Table or Empty State */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-600" />
            বিকেলের বিক্রয় চালান তালিকা ({sales.length})
          </h2>
          <input
            type="text"
            placeholder="কাস্টমার বা মেমো আইডি দিয়ে খুঁজুন..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64"
          />
        </div>

        {filteredSales.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto">
              <Sun className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-gray-800">আজ বিকেলের কোনো হিসাব নেই</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              আজকের তারিখে ১২:০০ PM এর পরে কোনো বিকেলের বিক্রয় বা চালান রেকর্ড করা হয়নি।
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="p-4 font-bold text-gray-700">চালান নম্বর</th>
                  <th className="p-4 font-bold text-gray-700">কাস্টমার নাম</th>
                  <th className="p-4 font-bold text-gray-700 text-right">মোট টাকা (৳)</th>
                  <th className="p-4 font-bold text-gray-700 text-right">পরিশোধ (৳)</th>
                  <th className="p-4 font-bold text-gray-700 text-right">বকেয়া (৳)</th>
                  <th className="p-4 font-bold text-gray-700 text-center">স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSales.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/50">
                    <td className="p-4 font-bold text-indigo-600">#{s.id.slice(0, 8)}</td>
                    <td className="p-4 font-bold text-gray-900">{s.customerName || "নগদ কাস্টমার"}</td>
                    <td className="p-4 font-black text-gray-900 text-right">৳{(Number(s.total) || 0).toLocaleString()}</td>
                    <td className="p-4 font-bold text-emerald-600 text-right">৳{(Number(s.paidAmount) || 0).toLocaleString()}</td>
                    <td className="p-4 font-bold text-amber-600 text-right">৳{(Number(s.dueAmount) || 0).toLocaleString()}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                        (s.dueAmount || 0) <= 0 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {(s.dueAmount || 0) <= 0 ? "পরিশোধিত" : "বকেয়া"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
