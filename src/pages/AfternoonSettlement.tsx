import React, { useState, useEffect, useMemo } from "react";
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
  Receipt,
  Printer,
  Plus,
  Trash2,
  Package,
  MapPin,
  Check,
  Gift,
  AlertTriangle,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info
} from "lucide-react";
import toast from "react-hot-toast";
import DamageSettlementModule, { DamageItem } from "../components/settlement/DamageSettlementModule";

export const EXPENSE_HEADS = [
  { id: "carriage", name: "পরিবহন খরচ / ক্যারেজ (Carriage)" },
  { id: "labor", name: "লেবার / কুলি বিল (Labor Cost)" },
  { id: "nasta", name: "ডিএসআর নাস্তা বিল (DSR Snacks Bill)" },
  { id: "fuel", name: "গাড়ি জ্বালানি খরচ (Fuel Cost)" },
  { id: "mobile", name: "ডিএসআর মোবাইল বিল (Mobile Bill)" },
  { id: "misc", name: "বিবিধ উপযোগ খরচ (Miscellaneous)" },
  { id: "bazaar", name: "অফিস বাজার খরচ (Bazaar Bill)" },
  { id: "rent", name: "ভাড়া / স্থান ভাড়া (Rent)" },
  { id: "salary", name: "ডিএসআর বেতন / কমিশন (DSR Salary)" },
  { id: "repair", name: "গাড়ি মেরামত খরচ (Repair & Servicing)" },
  { id: "toll", name: "রোড টোল / ঘাট খেসারত (Toll & Ferry)" }
];

interface AfternoonSettlementProps {
  summaries?: any[];
  products?: any[];
  staff?: any[];
  routes?: any[];
  customers?: any[];
  suppliers?: any[];
  updateSummary?: (id: string, data: any) => Promise<void>;
  updateCustomer?: (id: string, data: any) => Promise<void>;
  updateProduct?: (id: string, data: any) => Promise<void>;
  addDamage?: (item: any) => Promise<void>;
  addExpense?: (item: any) => Promise<void>;
  role?: string;
  onApproveSettlement?: (id: string, forceSync?: boolean) => Promise<void>;
}

export default function AfternoonSettlementPage({
  summaries = [],
  products = [],
  staff = [],
  routes = [],
  customers = [],
  suppliers = [],
  updateSummary,
  onApproveSettlement
}: AfternoonSettlementProps) {
  const [selectedSummaryId, setSelectedSummaryId] = useState<string>("");
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"all" | "returns" | "damage" | "free_discount" | "credits_expenses" | "balance">("all");

  // Local editable states for current summary settlement
  const [returnQtys, setReturnQtys] = useState<{ [key: string]: number }>({});
  
  // Dedicated Separate lists (matching traditional book & requirements)
  const [damageItems, setDamageItems] = useState<DamageItem[]>([]);
  const [freeItems, setFreeItems] = useState<{ productId: string; productName?: string; quantity: number; cartons?: number; pieces?: number; note?: string }[]>([]);
  const [discountItems, setDiscountItems] = useState<{ productId?: string; productName?: string; amount: number; note?: string }[]>([]);
  const [expenses, setExpenses] = useState<{ type: string; amount: number; description: string; voucherNo?: string }[]>([]);
  const [credits, setCredits] = useState<{ customerId: string; customerName?: string; supplierId: string; supplierName?: string; amount: number; note?: string }[]>([]);
  const [payments, setPayments] = useState<{ method: string; amount: number; ref?: string }[]>([]);

  // Search/Helpers for Free items
  const [freeSearchQuery, setFreeSearchQuery] = useState("");
  const [selectedFreeProduct, setSelectedFreeProduct] = useState<any | null>(null);
  const [freeCartons, setFreeCartons] = useState("");
  const [freePieces, setFreePieces] = useState("");
  const [freeNote, setFreeNote] = useState("");
  const [isFreeDropdownOpen, setIsFreeDropdownOpen] = useState(false);

  // Search/Helpers for Discount items
  const [discountSearchQuery, setDiscountSearchQuery] = useState("");
  const [selectedDiscountProduct, setSelectedDiscountProduct] = useState<any | null>(null);
  const [discountAmt, setDiscountAmt] = useState("");
  const [discountNote, setDiscountNote] = useState("");
  const [isDiscountDropdownOpen, setIsDiscountDropdownOpen] = useState(false);

  // Form inputs for adding customer credits
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [dueAmt, setDueAmt] = useState("");
  const [dueNote, setDueNote] = useState("");
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  // Form inputs for adding expenses
  const [selectedExpenseType, setSelectedExpenseType] = useState("carriage");
  const [expenseAmt, setExpenseAmt] = useState("");
  const [expenseVoucher, setExpenseVoucher] = useState("");

  // Form inputs for cash collection
  const [payMethod, setPayMethod] = useState("Cash");
  const [payAmt, setPayAmt] = useState("");
  const [payRef, setPayRef] = useState("");

  const today = new Date().toISOString().split("T")[0];

  // Filter summaries for today or open/pending ones
  const activeSummaries = useMemo(() => {
    return (summaries || []).filter(s => {
      const summDate = s.date || (s.createdAt ? new Date(s.createdAt?.toDate ? s.createdAt.toDate() : s.createdAt).toISOString().split("T")[0] : today);
      return summDate === today || s.status === 'open' || s.status === 'pending_approval';
    });
  }, [summaries, today]);

  // Select first summary by default if none selected
  useEffect(() => {
    if (!selectedSummaryId && activeSummaries.length > 0) {
      setSelectedSummaryId(activeSummaries[0].id);
    }
  }, [activeSummaries, selectedSummaryId]);

  const currentSummary = useMemo(() => {
    return (summaries || []).find(s => s.id === selectedSummaryId) || activeSummaries[0] || null;
  }, [summaries, selectedSummaryId, activeSummaries]);

  // Loaded product IDs in this route
  const loadedProductIds = useMemo(() => {
    return (currentSummary?.items || []).map((it: any) => it.productId).filter(Boolean);
  }, [currentSummary]);

  // Sync draft states when currentSummary changes
  useEffect(() => {
    if (currentSummary) {
      setReturnQtys(currentSummary.draftReturnQtys || currentSummary.returnQtys || {});
      setDamageItems(currentSummary.damageItems || currentSummary.draftDamageItems || []);
      setFreeItems(currentSummary.freeItems || currentSummary.draftFreeItems || []);
      setDiscountItems(currentSummary.discountItems || currentSummary.draftDiscountItems || []);
      setExpenses(currentSummary.expenses || currentSummary.draftExpenses || []);
      setCredits(currentSummary.credits || currentSummary.draftCredits || []);
      setPayments(currentSummary.payments || currentSummary.draftPayments || [{ method: "Cash", amount: Number(currentSummary.paidAmount || currentSummary.cashCollection || 0) }]);
    } else {
      setReturnQtys({});
      setDamageItems([]);
      setFreeItems([]);
      setDiscountItems([]);
      setExpenses([]);
      setCredits([]);
      setPayments([{ method: "Cash", amount: 0 }]);
    }
  }, [currentSummary?.id]);

  // Calculations for current summary
  const calculations = useMemo(() => {
    if (!currentSummary || !currentSummary.items) return null;

    let totalSalesValue = 0;
    let totalAssignedPieces = 0;
    let totalFreshReturnedPieces = 0;
    let totalSoldPieces = 0;

    const items = currentSummary.items.map((item: any) => {
      const pId = item.productId;
      const ret = Number(returnQtys[pId] !== undefined ? returnQtys[pId] : (item.returns || 0));
      const assigned = Number(item.totalPieces || item.qty || 0);
      const soldQty = Math.max(0, assigned - ret);
      const price = Number(item.price || 0);
      const saleVal = soldQty * price;

      totalAssignedPieces += assigned;
      totalFreshReturnedPieces += ret;
      totalSoldPieces += soldQty;
      totalSalesValue += saleVal;

      return {
        ...item,
        returns: ret,
        soldQty,
        saleValue: saleVal
      };
    });

    const totalDamageValue = damageItems.reduce((acc, d) => acc + (Number(d.quantity) * Number(d.price)), 0);
    const totalDamagePieces = damageItems.reduce((acc, d) => acc + Number(d.quantity), 0);

    const totalFreeValue = freeItems.reduce((acc, f) => {
      const prod = products.find(p => p.id === f.productId);
      return acc + (Number(f.quantity) * Number(prod?.price || 0));
    }, 0);
    const totalFreePieces = freeItems.reduce((acc, f) => acc + Number(f.quantity), 0);

    const totalDiscountValue = discountItems.reduce((acc, d) => acc + Number(d.amount || 0), 0);
    const totalExpensesValue = expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
    const totalCreditsValue = credits.reduce((acc, c) => acc + Number(c.amount || 0), 0);
    const totalPaymentsValue = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);

    // Traditional Accounting Formula for DSR Route Settlement:
    // DSR Payable = Gross Sales - Damage - Free - Discount - Expenses - Customer Credits
    const dsrPayable = totalSalesValue - totalDamageValue - totalFreeValue - totalDiscountValue - totalExpensesValue - totalCreditsValue;
    const balance = totalPaymentsValue - dsrPayable;

    return {
      items,
      totalAssignedPieces,
      totalFreshReturnedPieces,
      totalSoldPieces,
      totalSalesValue,
      totalDamageValue,
      totalDamagePieces,
      totalFreeValue,
      totalFreePieces,
      totalDiscountValue,
      totalExpensesValue,
      totalCreditsValue,
      totalPaymentsValue,
      dsrPayable,
      balance
    };
  }, [currentSummary, returnQtys, damageItems, freeItems, discountItems, expenses, credits, payments, products]);

  // Quick fill return helper: All Sold (returns = 0)
  const handleMarkAllSold = () => {
    if (!currentSummary?.items) return;
    const newReturns: { [key: string]: number } = {};
    currentSummary.items.forEach((it: any) => {
      newReturns[it.productId] = 0;
    });
    setReturnQtys(newReturns);
    toast.success("সব পণ্য বিক্রি হিসেবে সেট করা হয়েছে (রিটার্ন = ০)");
  };

  // Quick fill return helper: All Returned (returns = assigned)
  const handleMarkAllReturned = () => {
    if (!currentSummary?.items) return;
    const newReturns: { [key: string]: number } = {};
    currentSummary.items.forEach((it: any) => {
      newReturns[it.productId] = Number(it.totalPieces || it.qty || 0);
    });
    setReturnQtys(newReturns);
    toast.success("সব পণ্য ফেরত হিসেবে সেট করা হয়েছে");
  };

  const handleSaveDraftOrSubmit = async (submitForApproval = false) => {
    if (!currentSummary || !updateSummary) return;
    try {
      const payload: any = {
        draftReturnQtys: returnQtys,
        damageItems: damageItems,
        freeItems: freeItems,
        discountItems: discountItems,
        expenses: expenses,
        credits: credits,
        payments: payments,
        salesValue: calculations?.totalSalesValue || 0,
        totalDamageValue: calculations?.totalDamageValue || 0,
        totalFreeValue: calculations?.totalFreeValue || 0,
        totalDiscountValue: calculations?.totalDiscountValue || 0,
        totalExpensesValue: calculations?.totalExpensesValue || 0,
        totalCreditsValue: calculations?.totalCreditsValue || 0,
        totalPayments: calculations?.totalPaymentsValue || 0,
        dsrPayable: calculations?.dsrPayable || 0,
        dsrBalance: calculations?.balance || 0,
        paidAmount: calculations?.totalPaymentsValue || 0,
        dueAmount: calculations?.dsrPayable || 0,
        shortBalance: calculations?.balance && calculations.balance < 0 ? Math.abs(calculations.balance) : 0,
        status: submitForApproval ? "pending_approval" : (currentSummary.status || "open"),
        approved: submitForApproval ? false : (currentSummary.approved || false),
        updatedAt: new Date().toISOString()
      };

      await updateSummary(currentSummary.id, payload);
      toast.success(submitForApproval ? "সেটেলমেন্ট জমা ও অনুমোদনের জন্য প্রেরিত হয়েছে" : "সেটেলমেন্ট ড্রাফট সংরক্ষিত হয়েছে");

      if (submitForApproval && onApproveSettlement) {
        await onApproveSettlement(currentSummary.id, true);
      }
    } catch (err: any) {
      console.error("Error saving settlement:", err);
      toast.error("সংরক্ষণ করতে সমস্যা: " + err.message);
    }
  };

  // Filtered products for Free items search
  const filteredFreeProducts = useMemo(() => {
    if (!freeSearchQuery.trim()) return products.slice(0, 20);
    const q = freeSearchQuery.toLowerCase();
    return products.filter(p => (p.name || "").toLowerCase().includes(q) || (p.SKU || "").toLowerCase().includes(q)).slice(0, 20);
  }, [products, freeSearchQuery]);

  // Filtered products for Discount search
  const filteredDiscountProducts = useMemo(() => {
    if (!discountSearchQuery.trim()) return products.slice(0, 20);
    const q = discountSearchQuery.toLowerCase();
    return products.filter(p => (p.name || "").toLowerCase().includes(q) || (p.SKU || "").toLowerCase().includes(q)).slice(0, 20);
  }, [products, discountSearchQuery]);

  // Filtered customers for Credits search
  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return customers.slice(0, 25);
    const q = customerSearchQuery.toLowerCase();
    return customers.filter(c => (c.name || "").toLowerCase().includes(q) || (c.phone || "").includes(q)).slice(0, 25);
  }, [customers, customerSearchQuery]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto pb-32">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full">
              DMS Settlement Portal
            </span>
            <span className="text-xs font-semibold text-gray-500">
              তারিখ: <strong className="text-gray-800">{today}</strong>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-950 flex items-center gap-2 mt-1">
            <Sun className="w-6 h-6 sm:w-7 sm:h-7 text-amber-500 shrink-0" />
            বিকেল: চূড়ান্ত সেটেলমেন্ট ও বিক্রয় সামারি
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            রুট ও ডিএসআর স্টক রিটার্ন, ড্যামেজ সমন্বয়, ফ্রি, স্পেশাল ছাড়, কাস্টমার বাকি ও ক্যাশ ক্লোজিং
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {activeSummaries.length > 0 && (
            <select
              value={selectedSummaryId}
              onChange={(e) => setSelectedSummaryId(e.target.value)}
              className="px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-xs"
            >
              {activeSummaries.map(s => (
                <option key={s.id} value={s.id}>
                  রুট: {s.routeName || "সাধারণ রুট"} ({s.dsrName || "ডিএসআর"}) - [{s.status || 'open'}]
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
          >
            <Printer className="w-4 h-4" /> প্রিন্ট স্টেটমেন্ট
          </button>
        </div>
      </div>

      {!currentSummary ? (
        <div className="bg-white p-12 sm:p-16 rounded-3xl border border-gray-100 shadow-sm text-center space-y-3">
          <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto">
            <Sun className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">আজকের কোনো রুট বা লোডশিট সামারি পাওয়া যায়নি</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            সকালের লোডশিট বা রুট অ্যাসাইনমেন্ট থেকে সামারি তৈরি করুন, তারপর এখানে এসে বিকেলের হিসাব ও সেটেলমেন্ট সম্পন্ন করুন।
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Meta Card */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 rounded-3xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-white/20 text-white text-[10px] font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider">
                  রুট সেটেলমেন্ট শিট #{currentSummary.id.slice(-6).toUpperCase()}
                </span>
                <span className="text-[11px] font-bold text-indigo-300">
                  স্ট্যাটাস: <strong className="text-white capitalize">{currentSummary.status || "open"}</strong>
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black mt-1.5 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-400 shrink-0" />
                রুট: {currentSummary.routeName || "সাধারণ রুট"}
              </h2>
              <p className="text-xs text-indigo-200 mt-1">
                ডিএসআর (DSR): <strong className="text-white">{currentSummary.dsrName || "নির্ধারিত নেই"}</strong> | তারিখ: {currentSummary.date || today}
              </p>
            </div>
            
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={() => handleSaveDraftOrSubmit(false)}
                className="flex-1 sm:flex-initial px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition border border-white/20 text-center"
              >
                ড্রাফট সেভ
              </button>
              <button
                onClick={() => handleSaveDraftOrSubmit(true)}
                className="flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center gap-2 text-center"
              >
                <Check className="w-4 h-4" /> সেটেলমেন্ট নিশ্চিত করুন
              </button>
            </div>
          </div>

          {/* Quick Jump Module Filter Pills for Mobile */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:hidden">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === "all" ? "bg-indigo-600 text-white" : "bg-white text-gray-700 border border-gray-200"
              }`}
            >
              সব মডিউল
            </button>
            <button
              onClick={() => setActiveTab("returns")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === "returns" ? "bg-indigo-600 text-white" : "bg-white text-gray-700 border border-gray-200"
              }`}
            >
              ১. ফ্রেশ রিটার্ন ({calculations?.totalFreshReturnedPieces || 0})
            </button>
            <button
              onClick={() => setActiveTab("damage")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === "damage" ? "bg-red-600 text-white" : "bg-white text-red-700 border border-red-200"
              }`}
            >
              ২. ড্যামেজ ({calculations?.totalDamagePieces || 0})
            </button>
            <button
              onClick={() => setActiveTab("free_discount")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === "free_discount" ? "bg-indigo-600 text-white" : "bg-white text-gray-700 border border-gray-200"
              }`}
            >
              ৩. ফ্রি ও ডিসকাউন্ট
            </button>
            <button
              onClick={() => setActiveTab("credits_expenses")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === "credits_expenses" ? "bg-indigo-600 text-white" : "bg-white text-gray-700 border border-gray-200"
              }`}
            >
              ৪. বাকি ও খরচ
            </button>
            <button
              onClick={() => setActiveTab("balance")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === "balance" ? "bg-emerald-600 text-white" : "bg-white text-emerald-700 border border-emerald-200"
              }`}
            >
              ৫. ক্যাশ ও ব্যালেন্স
            </button>
          </div>

          {/* MODULE 1: Assigned Stock & Fresh Returns Table */}
          {(activeTab === "all" || activeTab === "returns") && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3.5">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-gray-900 flex items-center gap-2">
                    <Package className="w-5 h-5 text-indigo-600" />
                    ১. লোড সামগ্রী ও ফ্রেশ রিটার্ন হিসাব (Assigned Stock & Fresh Returns)
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium">
                    ভালো মাল যা অবিক্রিত অবস্থায় গুদামে ফিরে এসেছে তা এন্ট্রি করুন। প্রকৃত বিক্রয় স্বয়ংক্রিয়ভাবে হিসাব হবে।
                  </p>
                </div>

                {/* Quick actions for returns */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleMarkAllSold}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition"
                  >
                    সব বিক্রি (All Sold)
                  </button>
                  <button
                    type="button"
                    onClick={handleMarkAllReturned}
                    className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition"
                  >
                    সব ফেরত (All Return)
                  </button>
                </div>
              </div>

              {/* Responsive: Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="p-3 font-bold text-gray-700">পণ্যের নাম</th>
                      <th className="p-3 font-bold text-gray-700 text-center">প্রদত্ত (Loaded)</th>
                      <th className="p-3 font-bold text-gray-700 text-center w-36">ভালো ফেরত (Fresh Return)</th>
                      <th className="p-3 font-bold text-gray-700 text-center">প্রকৃত বিক্রয় (Sold)</th>
                      <th className="p-3 font-bold text-gray-700 text-right">দর (Price)</th>
                      <th className="p-3 font-bold text-gray-700 text-right">মোট বিক্রয় (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {calculations?.items.map((item: any, idx: number) => {
                      const prodObj = products.find(p => p.id === item.productId);
                      const cSize = prodObj?.cartoonSize || prodObj?.piecesInCarton || 1;
                      return (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="p-3 font-bold text-gray-900">
                            <div>{item.productName || item.name}</div>
                            <span className="text-[10px] text-gray-400 font-normal">কার্টুন সাইজ: {cSize} পিস</span>
                          </td>
                          <td className="p-3 text-center font-bold text-gray-700">
                            {item.totalPieces || item.qty || 0} পিস
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max={item.totalPieces || item.qty || 0}
                              value={returnQtys[item.productId] ?? item.returns ?? ""}
                              onChange={(e) => setReturnQtys({ ...returnQtys, [item.productId]: Math.max(0, Number(e.target.value)) })}
                              placeholder="0"
                              className="w-24 px-2 py-1.5 text-center border border-gray-300 rounded-lg font-black text-xs text-indigo-700 focus:ring-2 focus:ring-indigo-500 bg-indigo-50/30"
                            />
                          </td>
                          <td className="p-3 text-center font-black text-emerald-700">
                            {item.soldQty} পিস
                          </td>
                          <td className="p-3 text-right font-bold text-gray-700">৳{Number(item.price || 0).toLocaleString()}</td>
                          <td className="p-3 text-right font-black text-gray-950">৳{item.saleValue.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile View: Cards */}
              <div className="sm:hidden space-y-3">
                {calculations?.items.map((item: any, idx: number) => {
                  const prodObj = products.find(p => p.id === item.productId);
                  const cSize = prodObj?.cartoonSize || prodObj?.piecesInCarton || 1;
                  const assigned = item.totalPieces || item.qty || 0;
                  const ret = returnQtys[item.productId] ?? item.returns ?? 0;

                  return (
                    <div key={idx} className="p-3.5 bg-gray-50/60 rounded-2xl border border-gray-200/80 space-y-2.5">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="text-xs font-black text-gray-900">{item.productName || item.name}</h4>
                          <span className="text-[10px] text-gray-500">দর: ৳{item.price || 0} | লোডেড: {assigned} পিস</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-indigo-950 block">৳{item.saleValue.toLocaleString()}</span>
                          <span className="text-[10px] text-emerald-700 font-bold">বিক্রি: {item.soldQty} পিস</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-1 border-t border-gray-200/60">
                        <span className="text-[11px] font-bold text-gray-700">ভালো ফেরত (Fresh Return):</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setReturnQtys({ ...returnQtys, [item.productId]: Math.max(0, ret - 1) })}
                            className="w-7 h-7 rounded-lg bg-white border border-gray-300 font-black text-gray-700 flex items-center justify-center text-sm"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            max={assigned}
                            value={ret || ""}
                            onChange={(e) => setReturnQtys({ ...returnQtys, [item.productId]: Math.max(0, Number(e.target.value)) })}
                            placeholder="0"
                            className="w-16 px-2 py-1 text-center border border-gray-300 rounded-lg font-black text-xs bg-white text-indigo-700"
                          />
                          <button
                            type="button"
                            onClick={() => setReturnQtys({ ...returnQtys, [item.productId]: Math.min(assigned, ret + 1) })}
                            className="w-7 h-7 rounded-lg bg-white border border-gray-300 font-black text-gray-700 flex items-center justify-center text-sm"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Gross Sales Total Banner */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl gap-2">
                <div className="text-xs text-indigo-900 font-bold">
                  মোট লোডেড: <strong className="text-indigo-950">{calculations?.totalAssignedPieces} পিস</strong> | ফ্রেশ ফেরত: <strong className="text-indigo-950">{calculations?.totalFreshReturnedPieces} পিস</strong> | প্রকৃত বিক্রয়: <strong className="text-emerald-700">{calculations?.totalSoldPieces} পিস</strong>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-700">মোট গ্রোস বিক্রয় মূল্য (Gross Sales):</span>
                  <span className="text-base font-black text-indigo-950">৳{calculations?.totalSalesValue.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* MODULE 2: Dedicated Searchable Damage Module */}
          {(activeTab === "all" || activeTab === "damage") && (
            <DamageSettlementModule
              products={products}
              damageItems={damageItems}
              onChangeDamageItems={setDamageItems}
              loadedProductIds={loadedProductIds}
            />
          )}

          {/* MODULE 3 & 4: Free Items & Discounts (Matching Design Requirements) */}
          {(activeTab === "all" || activeTab === "free_discount") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 3. Free / Gift Outflow */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                    <Gift className="w-5 h-5 text-indigo-600" />
                    ৩. ফ্রি ও উপহার সামগ্রী বিতরণ (Free / Gift Outflow)
                  </h3>
                  <span className="text-xs font-bold text-indigo-600">
                    ৳{calculations?.totalFreeValue.toLocaleString()} ({calculations?.totalFreePieces} পিস)
                  </span>
                </div>

                {/* Free Product Search & Add */}
                <div className="space-y-3 bg-gray-50/60 p-3.5 rounded-2xl border border-gray-200/80">
                  <div className="relative">
                    <div className="relative flex items-center">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="ফ্রি পণ্য সার্চ করুন..."
                        value={freeSearchQuery}
                        onChange={(e) => {
                          setFreeSearchQuery(e.target.value);
                          setIsFreeDropdownOpen(true);
                          if (selectedFreeProduct && e.target.value !== selectedFreeProduct.name) {
                            setSelectedFreeProduct(null);
                          }
                        }}
                        onFocus={() => setIsFreeDropdownOpen(true)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {isFreeDropdownOpen && filteredFreeProducts.length > 0 && !selectedFreeProduct && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto divide-y divide-gray-100">
                        {filteredFreeProducts.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setSelectedFreeProduct(p);
                              setFreeSearchQuery(p.name);
                              setIsFreeDropdownOpen(false);
                            }}
                            className="w-full px-3 py-2 text-left text-xs hover:bg-indigo-50 flex items-center justify-between"
                          >
                            <span className="font-bold text-gray-900 truncate">{p.name}</span>
                            <span className="text-[10px] text-gray-500 shrink-0">৳{p.price || 0}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedFreeProduct && (
                    <div className="space-y-2 pt-1">
                      <div className="text-[11px] font-bold text-indigo-900">
                        পণ্য: {selectedFreeProduct.name} (কার্টুন সাইজ: {selectedFreeProduct.cartoonSize || 1} পিস)
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          placeholder="কার্টুন"
                          value={freeCartons}
                          onChange={(e) => setFreeCartons(e.target.value)}
                          className="px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-center"
                        />
                        <input
                          type="number"
                          placeholder="পিস"
                          value={freePieces}
                          onChange={(e) => setFreePieces(e.target.value)}
                          className="px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-center"
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="নোট বা ক্যাম্পেইনের নাম..."
                          value={freeNote}
                          onChange={(e) => setFreeNote(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const cSize = selectedFreeProduct.cartoonSize || 1;
                            const totalPcs = (parseInt(freeCartons) || 0) * cSize + (parseInt(freePieces) || 0);
                            if (totalPcs <= 0) {
                              toast.error("পরিমাণ লিখুন");
                              return;
                            }
                            setFreeItems([
                              ...freeItems,
                              {
                                productId: selectedFreeProduct.id,
                                productName: selectedFreeProduct.name,
                                quantity: totalPcs,
                                cartons: parseInt(freeCartons) || 0,
                                pieces: parseInt(freePieces) || 0,
                                note: freeNote
                              }
                            ]);
                            setSelectedFreeProduct(null);
                            setFreeSearchQuery("");
                            setFreeCartons("");
                            setFreePieces("");
                            setFreeNote("");
                          }}
                          className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                        >
                          যোগ
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Free Items List */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {freeItems.map((f, i) => {
                    const p = products.find(prod => prod.id === f.productId);
                    const val = f.quantity * Number(p?.price || 0);
                    return (
                      <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl text-xs font-bold">
                        <div>
                          <span>{f.productName || p?.name || "Product"} ({f.quantity} পিস)</span>
                          {f.note && <span className="block text-[10px] text-gray-400">{f.note}</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-indigo-600">৳{val.toLocaleString()}</span>
                          <button
                            type="button"
                            onClick={() => setFreeItems(freeItems.filter((_, idx) => idx !== i))}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. Special Discounts */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-indigo-600" />
                    ৪. স্পেশাল ক্যাশ ও শতাংশ ডিসকাউন্ট (Special Discounts)
                  </h3>
                  <span className="text-xs font-bold text-indigo-600">
                    ৳{calculations?.totalDiscountValue.toLocaleString()}
                  </span>
                </div>

                <div className="space-y-3 bg-gray-50/60 p-3.5 rounded-2xl border border-gray-200/80">
                  <div className="relative">
                    <div className="relative flex items-center">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="পণ্য বা মেমো সার্চ..."
                        value={discountSearchQuery}
                        onChange={(e) => {
                          setDiscountSearchQuery(e.target.value);
                          setIsDiscountDropdownOpen(true);
                          if (selectedDiscountProduct && e.target.value !== selectedDiscountProduct.name) {
                            setSelectedDiscountProduct(null);
                          }
                        }}
                        onFocus={() => setIsDiscountDropdownOpen(true)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {isDiscountDropdownOpen && filteredDiscountProducts.length > 0 && !selectedDiscountProduct && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto divide-y divide-gray-100">
                        {filteredDiscountProducts.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setSelectedDiscountProduct(p);
                              setDiscountSearchQuery(p.name);
                              setIsDiscountDropdownOpen(false);
                            }}
                            className="w-full px-3 py-2 text-left text-xs hover:bg-indigo-50 flex items-center justify-between"
                          >
                            <span className="font-bold text-gray-900 truncate">{p.name}</span>
                            <span className="text-[10px] text-gray-500 shrink-0">৳{p.price || 0}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="number"
                      placeholder="ছাড়ের টাকা (৳)"
                      value={discountAmt}
                      onChange={(e) => setDiscountAmt(e.target.value)}
                      className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-center"
                    />
                    <input
                      type="text"
                      placeholder="কারণ / মেমো নং..."
                      value={discountNote}
                      onChange={(e) => setDiscountNote(e.target.value)}
                      className="sm:col-span-2 px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!discountAmt || Number(discountAmt) <= 0) return;
                      setDiscountItems([
                        ...discountItems,
                        {
                          productId: selectedDiscountProduct?.id || "",
                          productName: selectedDiscountProduct?.name || "সাধারণ ছাড়",
                          amount: Number(discountAmt),
                          note: discountNote
                        }
                      ]);
                      setSelectedDiscountProduct(null);
                      setDiscountSearchQuery("");
                      setDiscountAmt("");
                      setDiscountNote("");
                    }}
                    className="w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                  >
                    ডিসকাউন্ট যোগ করুন
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {discountItems.map((d, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl text-xs font-bold">
                      <div>
                        <span>{d.productName || "সাধারণ ছাড়"}</span>
                        {d.note && <span className="block text-[10px] text-gray-400">{d.note}</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-indigo-600">৳{d.amount.toLocaleString()}</span>
                        <button
                          type="button"
                          onClick={() => setDiscountItems(discountItems.filter((_, idx) => idx !== i))}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MODULE 5 & 6: Customer Credits & Road Expenses */}
          {(activeTab === "all" || activeTab === "credits_expenses") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 5. Customer Credits with Linked Supplier */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-amber-600" />
                    ৫. কাস্টমার ও সাপ্লায়ার বাকি হিসাব (Customer Dues & Supplier)
                  </h3>
                  <span className="text-xs font-bold text-amber-600">
                    ৳{calculations?.totalCreditsValue.toLocaleString()}
                  </span>
                </div>

                <div className="space-y-3 bg-gray-50/60 p-3.5 rounded-2xl border border-gray-200/80">
                  {/* Search Customer */}
                  <div className="relative">
                    <div className="relative flex items-center">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="কাস্টমার নাম বা ফোন লিখে খুঁজুন..."
                        value={customerSearchQuery}
                        onChange={(e) => {
                          setCustomerSearchQuery(e.target.value);
                          setIsCustomerDropdownOpen(true);
                          if (selectedCustomer && e.target.value !== selectedCustomer.name) {
                            setSelectedCustomer(null);
                          }
                        }}
                        onFocus={() => setIsCustomerDropdownOpen(true)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {isCustomerDropdownOpen && filteredCustomers.length > 0 && !selectedCustomer && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto divide-y divide-gray-100">
                        {filteredCustomers.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedCustomer(c);
                              setCustomerSearchQuery(c.name);
                              setIsCustomerDropdownOpen(false);
                            }}
                            className="w-full px-3 py-2 text-left text-xs hover:bg-amber-50 flex items-center justify-between"
                          >
                            <span className="font-bold text-gray-900 truncate">{c.name}</span>
                            <span className="text-[10px] text-gray-500 shrink-0">পূর্বের বাকি: ৳{c.balance || 0}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={selectedSupplierId}
                      onChange={(e) => setSelectedSupplierId(e.target.value)}
                      className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold"
                    >
                      <option value="">সাপ্লায়ার নির্বাচন (ঐচ্ছিক)...</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="বাকি টাকা (৳)"
                      value={dueAmt}
                      onChange={(e) => setDueAmt(e.target.value)}
                      className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-center"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedCustomer || !dueAmt) {
                        toast.error("কাস্টমার ও টাকার পরিমাণ দিন");
                        return;
                      }
                      const supp = suppliers.find(s => s.id === selectedSupplierId);
                      setCredits([
                        ...credits,
                        {
                          customerId: selectedCustomer.id,
                          customerName: selectedCustomer.name,
                          supplierId: selectedSupplierId || "",
                          supplierName: supp?.name || "সাধারণ",
                          amount: Number(dueAmt),
                          note: dueNote
                        }
                      ]);
                      setSelectedCustomer(null);
                      setCustomerSearchQuery("");
                      setSelectedSupplierId("");
                      setDueAmt("");
                      setDueNote("");
                    }}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold"
                  >
                    বাকি কার্ড যোগ করুন
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {credits.map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl text-xs font-bold">
                      <div>
                        <span>{c.customerName || "কাস্টমার"}</span>
                        {c.supplierName && <span className="text-[10px] text-gray-500 ml-2">[{c.supplierName}]</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-amber-600">৳{c.amount.toLocaleString()}</span>
                        <button
                          type="button"
                          onClick={() => setCredits(credits.filter((_, idx) => idx !== i))}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6. Vouchered Road Expenses */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-indigo-600" />
                    ৬. সেটেলমেন্টের রাস্তা ও বিতরণ খরচ (Road Expenses)
                  </h3>
                  <span className="text-xs font-bold text-indigo-600">
                    ৳{calculations?.totalExpensesValue.toLocaleString()}
                  </span>
                </div>

                <div className="space-y-3 bg-gray-50/60 p-3.5 rounded-2xl border border-gray-200/80">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={selectedExpenseType}
                      onChange={(e) => setSelectedExpenseType(e.target.value)}
                      className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold"
                    >
                      {EXPENSE_HEADS.map(h => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="টাকার পরিমাণ (৳)"
                      value={expenseAmt}
                      onChange={(e) => setExpenseAmt(e.target.value)}
                      className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-center"
                    />
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="ভাউচার নং বা বিবরণ..."
                      value={expenseVoucher}
                      onChange={(e) => setExpenseVoucher(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!expenseAmt || Number(expenseAmt) <= 0) return;
                        const headName = EXPENSE_HEADS.find(h => h.id === selectedExpenseType)?.name || selectedExpenseType;
                        setExpenses([
                          ...expenses,
                          {
                            type: selectedExpenseType,
                            amount: Number(expenseAmt),
                            description: expenseVoucher ? `${headName} (${expenseVoucher})` : headName,
                            voucherNo: expenseVoucher
                          }
                        ]);
                        setExpenseAmt("");
                        setExpenseVoucher("");
                      }}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shrink-0"
                    >
                      খরচ যোগ
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {expenses.map((e, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl text-xs font-bold">
                      <span>{e.description || e.type}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-indigo-600">৳{e.amount.toLocaleString()}</span>
                        <button
                          type="button"
                          onClick={() => setExpenses(expenses.filter((_, idx) => idx !== i))}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MODULE 7: Grand Balance Sheet & Cash Collections */}
          {(activeTab === "all" || activeTab === "balance") && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-base sm:text-lg font-black text-gray-950 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                  ৭. সেটেলমেন্টের চূড়ান্ত ব্যালেন্স শিট ও ক্যাশ ক্লোজিং (Grand Balance Sheet)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  বিক্রয় থেকে ড্যামেজ, ফ্রি, ডিসকাউন্ট, রাস্তা খরচ ও বাকি বাদ দিয়ে নিট প্রদেয় ও ক্যাশ ব্যালেন্স
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left: DSR Collections Entry */}
                <div className="space-y-4 bg-gray-50/70 p-5 sm:p-6 rounded-2xl border border-gray-200/80">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-700">
                    ক্যাশ সংগ্রহ ও পেমেন্ট আদায় (DSR Cash & Digital Collection)
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                      className="px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold"
                    >
                      <option value="Cash">Cash (নগদ)</option>
                      <option value="Bkash">bKash (বিকাশ)</option>
                      <option value="Nagad">Nagad (নগদ অ্যাপ)</option>
                      <option value="Bank">Bank (ব্যাংক ডিপোজিট)</option>
                    </select>
                    <input
                      type="number"
                      placeholder="টাকা (৳)"
                      value={payAmt}
                      onChange={(e) => setPayAmt(e.target.value)}
                      className="px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-center"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!payAmt || Number(payAmt) <= 0) return;
                        setPayments([...payments, { method: payMethod, amount: Number(payAmt), ref: payRef }]);
                        setPayAmt("");
                        setPayRef("");
                      }}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                    >
                      আদায় যোগ করুন
                    </button>
                  </div>

                  <div className="space-y-2">
                    {payments.map((p, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-white rounded-xl text-xs font-bold shadow-xs border border-gray-100">
                        <span className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-emerald-600" />
                          {p.method}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-emerald-700 font-black">৳{p.amount.toLocaleString()}</span>
                          <button
                            type="button"
                            onClick={() => setPayments(payments.filter((_, idx) => idx !== i))}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Traditional Accounting Formula Breakdown */}
                <div className="bg-indigo-950 text-white p-6 rounded-2xl shadow-lg space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-indigo-900 font-medium">
                    <span>১. মোট বিক্রয় ভ্যালু (Gross Sales):</span>
                    <span className="font-bold text-white">৳{calculations?.totalSalesValue.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between py-1.5 border-b border-indigo-900 font-medium text-red-300">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                      ২. নষ্ট ও ড্যামেজ পণ্য সমন্বয় (-):
                    </span>
                    <span className="font-bold">৳{calculations?.totalDamageValue.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-indigo-900 font-medium text-amber-200">
                    <span>৩. ফ্রি পণ্য বিতরণ ভ্যালু (-):</span>
                    <span>৳{calculations?.totalFreeValue.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-indigo-900 font-medium text-amber-200">
                    <span>৪. স্পেশাল ক্যাশ ডিসকাউন্ট (-):</span>
                    <span>৳{calculations?.totalDiscountValue.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-indigo-900 font-medium text-amber-200">
                    <span>৫. রাস্তা ও বিতরণ খরচ (-):</span>
                    <span>৳{calculations?.totalExpensesValue.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-indigo-900 font-medium text-amber-200">
                    <span>৬. কাস্টমার বাকি (Credit) সমন্বয় (-):</span>
                    <span>৳{calculations?.totalCreditsValue.toLocaleString()}</span>
                  </div>

                  {/* Net Payable */}
                  <div className="flex justify-between py-2 text-sm font-black border-t-2 border-indigo-800 text-cyan-300">
                    <span>ডিএসআর নিট প্রদেয় (Net DSR Payable):</span>
                    <span>৳{calculations?.dsrPayable.toLocaleString()}</span>
                  </div>

                  {/* Cash Collected */}
                  <div className="flex justify-between py-1.5 font-bold text-emerald-300">
                    <span>আদায়কৃত নগদ ও ডিজিটাল ক্যাশ (+):</span>
                    <span>৳{calculations?.totalPaymentsValue.toLocaleString()}</span>
                  </div>

                  {/* Grand Net Balance */}
                  <div className={`flex justify-between py-3.5 px-4 rounded-xl mt-2 border-2 ${
                    calculations && calculations.balance < 0 
                      ? "bg-red-950/80 border-red-500 text-red-300"
                      : calculations && calculations.balance > 0 
                      ? "bg-emerald-950/80 border-emerald-500 text-emerald-300"
                      : "bg-indigo-900/80 border-indigo-500 text-white"
                  }`}>
                    <div>
                      <span className="text-xs uppercase font-extrabold block">নেট ব্যালেন্স (DSR Balance):</span>
                      <span className="text-[10px] opacity-80">
                        {calculations && calculations.balance < 0 ? "ডিএসআর ঘাটতি (Short)" : calculations && calculations.balance > 0 ? "উদ্বৃত্ত জমা (Surplus)" : "সম্পূর্ণ মিলে গেছে (Settled)"}
                      </span>
                    </div>
                    <span className="text-base sm:text-lg font-black tracking-tight">
                      ৳{calculations?.balance.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Bottom Action Bar for Mobile Screens */}
      {currentSummary && calculations && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 py-3 shadow-2xl flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] text-gray-500 font-bold block uppercase">নেট ব্যালেন্স</span>
            <span className={`text-sm sm:text-base font-black truncate block ${
              calculations.balance < 0 ? "text-red-600" : "text-emerald-700"
            }`}>
              ৳{calculations.balance.toLocaleString()} {calculations.balance < 0 ? "(ঘাটতি)" : "(সেটেল্ড)"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSaveDraftOrSubmit(false)}
              className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition"
            >
              ড্রাফট
            </button>
            <button
              onClick={() => handleSaveDraftOrSubmit(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition shadow-sm flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" /> নিশ্চিত করুন
            </button>
          </div>
        </div>
      )}

      {/* Print / Statement Modal */}
      {isPrintModalOpen && currentSummary && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <h3 className="text-lg font-black text-gray-900">সেটেলমেন্ট স্টেটমেন্ট ও প্রিন্ট প্রিভিউ</h3>
              <button onClick={() => setIsPrintModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-lg">✕</button>
            </div>

            <div className="font-mono text-xs space-y-3 bg-gray-50 p-6 rounded-2xl border border-dashed border-gray-300">
              <div className="text-center font-bold text-sm tracking-widest text-gray-900">SAMIRA TRADERS DMS</div>
              <div className="text-center text-gray-600 text-[11px]">Evening Settlement Summary Sheet</div>
              <div className="border-t border-b border-gray-300 py-2 space-y-1">
                <div>Date: {currentSummary.date || today}</div>
                <div>Route: {currentSummary.routeName || "N/A"}</div>
                <div>DSR: {currentSummary.dsrName || "N/A"}</div>
              </div>

              <div className="space-y-1">
                <div className="font-bold">১. SALES & FRESH RETURNS:</div>
                {calculations?.items.map((it: any, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <span>{it.productName || it.name} (Sold: {it.soldQty})</span>
                    <span>৳{it.saleValue}</span>
                  </div>
                ))}
              </div>

              {damageItems.length > 0 && (
                <div className="border-t border-gray-200 pt-1 space-y-1">
                  <div className="font-bold text-red-600">২. DAMAGE RETURNS (-):</div>
                  {damageItems.map((d, i) => (
                    <div key={i} className="flex justify-between text-red-700">
                      <span>{d.productName} ({d.quantity} pcs @ ৳{d.price})</span>
                      <span>৳{(d.quantity * d.price).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-gray-300 pt-2 space-y-1">
                <div className="flex justify-between font-bold"><span>Gross Sales Value:</span> <span>৳{calculations?.totalSalesValue}</span></div>
                <div className="flex justify-between text-red-600"><span>Damage Return (-):</span> <span>৳{calculations?.totalDamageValue}</span></div>
                <div className="flex justify-between"><span>Free / Gift Outflow (-):</span> <span>৳{calculations?.totalFreeValue}</span></div>
                <div className="flex justify-between"><span>Cash Discount (-):</span> <span>৳{calculations?.totalDiscountValue}</span></div>
                <div className="flex justify-between"><span>Expenses (-):</span> <span>৳{calculations?.totalExpensesValue}</span></div>
                <div className="flex justify-between"><span>Customer Credits (-):</span> <span>৳{calculations?.totalCreditsValue}</span></div>
              </div>

              <div className="border-t border-b border-gray-300 py-2 space-y-1 font-bold">
                <div className="flex justify-between text-indigo-900"><span>DSR PAYABLE:</span> <span>৳{calculations?.dsrPayable}</span></div>
                <div className="flex justify-between text-emerald-800"><span>TOTAL PAID:</span> <span>৳{calculations?.totalPaymentsValue}</span></div>
                <div className={`flex justify-between ${calculations?.balance && calculations.balance < 0 ? "text-red-600" : "text-emerald-700"}`}>
                  <span>NET BALANCE:</span> <span>৳{calculations?.balance}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition"
              >
                বন্ধ করুন
              </button>
              <button
                onClick={() => {
                  window.print();
                  toast.success("প্রিন্ট কমান্ড পাঠানো হয়েছে");
                }}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-sm flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> প্রিন্ট করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
