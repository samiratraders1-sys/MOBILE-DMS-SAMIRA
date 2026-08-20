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
  AlertTriangle
} from "lucide-react";
import toast from "react-hot-toast";

const EXPENSE_HEADS = [
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

  // Local editable states for current summary settlement
  const [returnQtys, setReturnQtys] = useState<{ [key: string]: number }>({});
  
  // Dedicated Separate lists (matching traditional book & requirements)
  const [damageItems, setDamageItems] = useState<{ productId: string; productName?: string; quantity: number; price: number }[]>([]);
  const [freeItems, setFreeItems] = useState<{ productId: string; productName?: string; quantity: number }[]>([]);
  const [discountItems, setDiscountItems] = useState<{ productId: string; productName?: string; amount: number }[]>([]);
  const [expenses, setExpenses] = useState<{ type: string; amount: number; description: string }[]>([]);
  const [credits, setCredits] = useState<{ customerId: string; customerName?: string; supplierId: string; supplierName?: string; amount: number }[]>([]);
  const [payments, setPayments] = useState<{ method: string; amount: number }[]>([]);

  // Form inputs for adding damage items
  const [damageProductId, setDamageProductId] = useState("");
  const [damageQty, setDamageQty] = useState("");
  const [damagePrice, setDamagePrice] = useState("");

  // Form inputs for adding free items
  const [freeProductId, setFreeProductId] = useState("");
  const [freeQty, setFreeQty] = useState("");
  
  // Form inputs for adding discounts
  const [discountProductId, setDiscountProductId] = useState("");
  const [discountAmt, setDiscountAmt] = useState("");

  // Form inputs for adding expenses
  const [selectedExpenseType, setSelectedExpenseType] = useState("carriage");
  const [expenseAmt, setExpenseAmt] = useState("");

  // Form inputs for adding customer credits
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [dueAmt, setDueAmt] = useState("");

  // Form inputs for cash collection
  const [payMethod, setPayMethod] = useState("Cash");
  const [payAmt, setPayAmt] = useState("");

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
    const items = currentSummary.items.map((item: any) => {
      const pId = item.productId;
      const ret = Number(returnQtys[pId] || item.returns || 0);
      const assigned = Number(item.totalPieces || item.qty || 0);
      const soldQty = Math.max(0, assigned - ret);
      const price = Number(item.price || 0);
      const saleVal = soldQty * price;
      totalSalesValue += saleVal;

      return {
        ...item,
        returns: ret,
        soldQty,
        saleValue: saleVal
      };
    });

    const totalDamageValue = damageItems.reduce((acc, d) => acc + (Number(d.quantity) * Number(d.price)), 0);
    const totalFreeValue = freeItems.reduce((acc, f) => {
      const prod = products.find(p => p.id === f.productId);
      return acc + (Number(f.quantity) * Number(prod?.price || 0));
    }, 0);
    const totalDiscountValue = discountItems.reduce((acc, d) => acc + Number(d.amount || 0), 0);
    const totalExpensesValue = expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
    const totalCreditsValue = credits.reduce((acc, c) => acc + Number(c.amount || 0), 0);
    const totalPaymentsValue = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);

    // DSR Payable = Gross Sales - Damage - Free - Discount - Expenses - Customer Credits
    const dsrPayable = totalSalesValue - totalDamageValue - totalFreeValue - totalDiscountValue - totalExpensesValue - totalCreditsValue;
    const balance = totalPaymentsValue - dsrPayable;

    return {
      items,
      totalSalesValue,
      totalDamageValue,
      totalFreeValue,
      totalDiscountValue,
      totalExpensesValue,
      totalCreditsValue,
      totalPaymentsValue,
      dsrPayable,
      balance
    };
  }, [currentSummary, returnQtys, damageItems, freeItems, discountItems, expenses, credits, payments, products]);

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

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto pb-24">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-950 flex items-center gap-2">
            <Sun className="w-7 h-7 text-amber-500" />
            বিকেল: চূড়ান্ত সেটেলমেন্ট ও বিক্রয় সামারি (Afternoon Settlement)
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-0.5">
            তারিখ: <span className="font-bold text-gray-800">{today}</span> | রুট ও ডিএসআর স্টক, রিটার্ন, ড্যামেজ, ফ্রি, ডিসকাউন্ট ও ক্যাশ ক্লোজিং
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeSummaries.length > 0 && (
            <select
              value={selectedSummaryId}
              onChange={(e) => setSelectedSummaryId(e.target.value)}
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {activeSummaries.map(s => (
                <option key={s.id} value={s.id}>
                  রুট: {s.routeName || "সাধারণ রুট"} ({s.dsrName || "ডিএসআর"}) - [স্ট্যাটাস: {s.status || 'open'}]
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
        <div className="bg-white p-16 rounded-3xl border border-gray-100 shadow-sm text-center space-y-3">
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
          <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-6 rounded-3xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="bg-white/20 text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                রুট সেটেলমেন্ট শিট
              </span>
              <h2 className="text-xl font-black mt-2">রুট: {currentSummary.routeName || "সাধারণ রুট"}</h2>
              <p className="text-xs text-indigo-200 mt-1">
                ডিএসআর (DSR): <strong className="text-white">{currentSummary.dsrName || "নির্ধারিত নেই"}</strong> | তারিখ: {currentSummary.date || today}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleSaveDraftOrSubmit(false)}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition border border-white/20"
              >
                ড্রাফট সেভ করুন
              </button>
              <button
                onClick={() => handleSaveDraftOrSubmit(true)}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center gap-2"
              >
                <Check className="w-4 h-4" /> সেটেলমেন্ট কনফার্ম করুন
              </button>
            </div>
          </div>

          {/* 1. Inventory & Returns Table */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <Package className="w-5 h-5 text-indigo-600" />
              ১. লোড সামগ্রী ও রিটার্ন হিসাব (Assigned Stock & Fresh Returns)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="p-3 font-bold text-gray-700">পণ্যের নাম</th>
                    <th className="p-3 font-bold text-gray-700 text-center">প্রদত্ত (Assigned)</th>
                    <th className="p-3 font-bold text-gray-700 text-center">রিটার্ন (Fresh Returns)</th>
                    <th className="p-3 font-bold text-gray-700 text-center">প্রকৃত বিক্রয় (Sold Qty)</th>
                    <th className="p-3 font-bold text-gray-700 text-right">দর (Price)</th>
                    <th className="p-3 font-bold text-gray-700 text-right">মোট বিক্রয় ভ্যালু (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {calculations?.items.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="p-3 font-bold text-gray-900">{item.productName || item.name}</td>
                      <td className="p-3 text-center font-bold text-gray-700">{item.totalPieces || item.qty || 0} পিস</td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          min="0"
                          value={returnQtys[item.productId] ?? item.returns ?? 0}
                          onChange={(e) => setReturnQtys({ ...returnQtys, [item.productId]: Number(e.target.value) })}
                          className="w-20 px-2 py-1 text-center border border-gray-200 rounded-lg font-bold text-xs focus:ring-2 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="p-3 text-center font-extrabold text-indigo-600">{item.soldQty} পিস</td>
                      <td className="p-3 text-right font-bold text-gray-700">৳{Number(item.price || 0).toLocaleString()}</td>
                      <td className="p-3 text-right font-black text-gray-950">৳{item.saleValue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end p-3 bg-indigo-50/50 rounded-2xl">
              <span className="text-sm font-bold text-gray-700 mr-4">মোট গ্রোস বিক্রয় মূল্য (Total Gross Sales):</span>
              <span className="text-sm font-black text-indigo-900">৳{calculations?.totalSalesValue.toLocaleString()}</span>
            </div>
          </div>

          {/* Grid of Dedicated Separate Modules */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 2. Damage Returns (Dedicated Search & Add Module) */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                ২. নষ্ট ও ড্যামেজ পণ্য ফেরত বিবরণী (Damage Returns)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <select
                  value={damageProductId}
                  onChange={(e) => {
                    const pId = e.target.value;
                    setDamageProductId(pId);
                    const prod = products.find(p => p.id === pId);
                    if (prod) setDamagePrice(String(prod.price || 0));
                  }}
                  className="sm:col-span-2 px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold"
                >
                  <option value="">পণ্য নির্বাচন করুন (সার্চ)...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (৳{p.price})</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="পরিমাণ"
                  value={damageQty}
                  onChange={(e) => setDamageQty(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-center"
                />
                <button
                  onClick={() => {
                    if (!damageProductId || !damageQty) return;
                    const prod = products.find(p => p.id === damageProductId);
                    setDamageItems([
                      ...damageItems, 
                      { 
                        productId: damageProductId, 
                        productName: prod?.name || "Product", 
                        quantity: Number(damageQty), 
                        price: Number(damagePrice || prod?.price || 0) 
                      }
                    ]);
                    setDamageProductId("");
                    setDamageQty("");
                    setDamagePrice("");
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition"
                >
                  যোগ
                </button>
              </div>

              <div className="space-y-2">
                {damageItems.map((d, i) => {
                  const val = d.quantity * d.price;
                  return (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-red-50/50 border border-red-100 rounded-xl text-xs font-bold">
                      <span>{d.productName || "Product"} ({d.quantity} পিস @ ৳{d.price})</span>
                      <div className="flex items-center gap-3">
                        <span className="text-red-600 font-black">৳{val.toLocaleString()}</span>
                        <button
                          onClick={() => setDamageItems(damageItems.filter((_, idx) => idx !== i))}
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

            {/* 3. Free / Gift Outflow */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                <Gift className="w-5 h-5 text-indigo-600" />
                ৩. ফ্রি ও উপহার সামগ্রী বিতরণ (Free / Gift Outflow)
              </h3>
              <div className="flex gap-2">
                <select
                  value={freeProductId}
                  onChange={(e) => setFreeProductId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold"
                >
                  <option value="">পণ্য নির্বাচন করুন...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (৳{p.price})</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="পরিমাণ"
                  value={freeQty}
                  onChange={(e) => setFreeQty(e.target.value)}
                  className="w-24 px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-center"
                />
                <button
                  onClick={() => {
                    if (!freeProductId || !freeQty) return;
                    const prod = products.find(p => p.id === freeProductId);
                    setFreeItems([...freeItems, { productId: freeProductId, productName: prod?.name || "Product", quantity: Number(freeQty) }]);
                    setFreeProductId("");
                    setFreeQty("");
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                >
                  যোগ
                </button>
              </div>

              <div className="space-y-2">
                {freeItems.map((f, i) => {
                  const p = products.find(prod => prod.id === f.productId);
                  const val = f.quantity * Number(p?.price || 0);
                  return (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl text-xs font-bold">
                      <span>{f.productName || p?.name || "Product"} ({f.quantity} পিস)</span>
                      <div className="flex items-center gap-3">
                        <span className="text-indigo-600">৳{val.toLocaleString()}</span>
                        <button
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
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                <DollarSign className="w-5 h-5 text-indigo-600" />
                ৪. স্পেশাল ক্যাশ ডিসকাউন্ট (Special Discounts)
              </h3>
              <div className="flex gap-2">
                <select
                  value={discountProductId}
                  onChange={(e) => setDiscountProductId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold"
                >
                  <option value="">পণ্য নির্বাচন করুন...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="ছাড়ের টাকা (৳)"
                  value={discountAmt}
                  onChange={(e) => setDiscountAmt(e.target.value)}
                  className="w-28 px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-center"
                />
                <button
                  onClick={() => {
                    if (!discountProductId || !discountAmt) return;
                    const prod = products.find(p => p.id === discountProductId);
                    setDiscountItems([...discountItems, { productId: discountProductId, productName: prod?.name || "Product", amount: Number(discountAmt) }]);
                    setDiscountProductId("");
                    setDiscountAmt("");
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                >
                  যোগ
                </button>
              </div>

              <div className="space-y-2">
                {discountItems.map((d, i) => {
                  const p = products.find(prod => prod.id === d.productId);
                  return (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl text-xs font-bold">
                      <span>{d.productName || p?.name || "Product"}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-indigo-600">৳{d.amount.toLocaleString()}</span>
                        <button
                          onClick={() => setDiscountItems(discountItems.filter((_, idx) => idx !== i))}
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

            {/* 5. Customer Credits with Supplier Context */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                <Users className="w-5 h-5 text-amber-600" />
                ৫. কাস্টমার ও সাপ্লায়ার বাকি হিসাব (Customer Dues & Supplier)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold"
                >
                  <option value="">কাস্টমার নির্বাচন...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone || ''})</option>
                  ))}
                </select>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold"
                >
                  <option value="">সাপ্লায়ার নির্বাচন...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="টাকা (৳)"
                    value={dueAmt}
                    onChange={(e) => setDueAmt(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-center"
                  />
                  <button
                    onClick={() => {
                      if (!selectedCustomerId || !dueAmt) return;
                      const cust = customers.find(c => c.id === selectedCustomerId);
                      const supp = suppliers.find(s => s.id === selectedSupplierId);
                      setCredits([
                        ...credits, 
                        { 
                          customerId: selectedCustomerId, 
                          customerName: cust?.name || "কাস্টমার", 
                          supplierId: selectedSupplierId || supp?.id || "",
                          supplierName: supp?.name || "সাধারণ",
                          amount: Number(dueAmt) 
                        }
                      ]);
                      setSelectedCustomerId("");
                      setSelectedSupplierId("");
                      setDueAmt("");
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold"
                  >
                    যোগ
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {credits.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl text-xs font-bold">
                    <div>
                      <span>{c.customerName || "কাস্টমার"}</span>
                      {c.supplierName && <span className="text-[10px] text-gray-500 ml-2">[{c.supplierName}]</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-amber-600">৳{c.amount.toLocaleString()}</span>
                      <button
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
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4 md:col-span-2">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                <Receipt className="w-5 h-5 text-indigo-600" />
                ৬. সেটেলমেন্টের রাস্তা খরচ (Vouchered Road Expenses)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={selectedExpenseType}
                  onChange={(e) => setSelectedExpenseType(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold"
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
                  className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-center"
                />
                <button
                  onClick={() => {
                    if (!selectedExpenseType || !expenseAmt) return;
                    const headName = EXPENSE_HEADS.find(h => h.id === selectedExpenseType)?.name || selectedExpenseType;
                    setExpenses([...expenses, { type: selectedExpenseType, amount: Number(expenseAmt), description: headName }]);
                    setExpenseAmt("");
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                >
                  খরচ যোগ করুন
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {expenses.map((e, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl text-xs font-bold">
                    <span>{e.description || e.type}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-indigo-600">৳{e.amount.toLocaleString()}</span>
                      <button
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

          {/* Grand Balance Sheet & Cash Collections */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-6">
            <h3 className="text-base font-black text-gray-950 flex items-center gap-2 border-b border-gray-100 pb-3">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
              ৭. সেটেলমেন্টের চূড়ান্ত ব্যালেন্স শিট ও ক্যাশ আদায় (Grand Balance Sheet)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left: Cash Collections Entry */}
              <div className="space-y-4 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-600">ক্যাশ সংগ্রহ ও পেমেন্ট আদায় (DSR Collections)</h4>
                
                <div className="flex gap-2">
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold"
                  >
                    <option value="Cash">Cash (নগদ)</option>
                    <option value="Bkash">bKash (বিকাশ)</option>
                    <option value="Bank">Bank Transfer (ব্যাংক)</option>
                  </select>
                  <input
                    type="number"
                    placeholder="টাকা"
                    value={payAmt}
                    onChange={(e) => setPayAmt(e.target.value)}
                    className="w-32 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-center"
                  />
                  <button
                    onClick={() => {
                      if (!payAmt) return;
                      setPayments([...payments, { method: payMethod, amount: Number(payAmt) }]);
                      setPayAmt("");
                    }}
                    className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold"
                  >
                    আদায় যোগ
                  </button>
                </div>

                <div className="space-y-2">
                  {payments.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white rounded-xl text-xs font-bold shadow-sm">
                      <span>{p.method}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-600 font-black">৳{p.amount.toLocaleString()}</span>
                        <button
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

              {/* Right: Grand Balance Breakdown */}
              <div className="bg-indigo-900 text-white p-6 rounded-2xl shadow-md space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-indigo-800/60 font-medium">
                  <span>১. মোট বিক্রি ভ্যালু (Gross Sales):</span>
                  <span className="font-bold">৳{calculations?.totalSalesValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-indigo-800/60 font-medium text-red-300">
                  <span>২. নষ্ট / ড্যামেজ পণ্য সমন্বয় (-):</span>
                  <span>৳{calculations?.totalDamageValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-indigo-800/60 font-medium text-amber-300">
                  <span>৩. ফ্রি পণ্য বিতরণ ভ্যালু (-):</span>
                  <span>৳{calculations?.totalFreeValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-indigo-800/60 font-medium text-amber-300">
                  <span>৪. ক্যাশ ডিসকাউন্ট সমন্বয় (-):</span>
                  <span>৳{calculations?.totalDiscountValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-indigo-800/60 font-medium text-amber-300">
                  <span>৫. রাস্তা খরচ সমন্বয় (-):</span>
                  <span>৳{calculations?.totalExpensesValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-indigo-800/60 font-medium text-amber-300">
                  <span>৬. কাস্টমার বাকি (Credit) সমন্বয় (-):</span>
                  <span>৳{calculations?.totalCreditsValue.toLocaleString()}</span>
                </div>

                <div className="flex justify-between py-2 text-sm font-black border-t border-indigo-700 text-cyan-300">
                  <span>ডিএসআর প্রদেয় (Payable):</span>
                  <span>৳{calculations?.dsrPayable.toLocaleString()}</span>
                </div>

                <div className="flex justify-between py-1.5 font-bold text-emerald-300">
                  <span>আদায়কৃত নগদ ক্যাশ (+):</span>
                  <span>৳{calculations?.totalPaymentsValue.toLocaleString()}</span>
                </div>

                <div className="flex justify-between py-3 text-base font-black border-t-2 border-indigo-500 bg-indigo-950/60 px-4 rounded-xl mt-2">
                  <span className="text-white">নেট ব্যালেন্স (DSR Balance):</span>
                  <span className={calculations && calculations.balance >= 0 ? "text-emerald-400" : "text-red-400"}>
                    ৳{calculations?.balance.toLocaleString()}
                    {calculations && calculations.balance < 0 ? " (Short / ঘাটতি)" : calculations && calculations.balance > 0 ? " (Surplus / উদ্বৃত্ত)" : " (Settled)"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print / Statement Modal */}
      {isPrintModalOpen && currentSummary && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <h3 className="text-lg font-black text-gray-900">সেটেলমেন্ট স্টেটমেন্ট ও প্রিভিউ</h3>
              <button onClick={() => setIsPrintModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-lg">✕</button>
            </div>

            <div className="font-mono text-xs space-y-3 bg-gray-50 p-6 rounded-2xl border border-dashed border-gray-300">
              <div className="text-center font-bold text-sm tracking-widest text-gray-900">SAMIRA TRADERS</div>
              <div className="text-center text-gray-600">Evening Settlement Summary Sheet</div>
              <div className="border-t border-b border-gray-300 py-2 space-y-1">
                <div>Date: {currentSummary.date || today}</div>
                <div>Route: {currentSummary.routeName || "N/A"}</div>
                <div>DSR: {currentSummary.dsrName || "N/A"}</div>
              </div>

              <div className="space-y-1">
                <div className="font-bold">SALES & STOCK SUMMARY:</div>
                {calculations?.items.map((it: any, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <span>{it.productName || it.name} (Sold: {it.soldQty})</span>
                    <span>৳{it.saleValue}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-300 pt-2 space-y-1">
                <div className="flex justify-between"><span>Gross Sales Value:</span> <span>৳{calculations?.totalSalesValue}</span></div>
                <div className="flex justify-between"><span>Damage Return (-):</span> <span>৳{calculations?.totalDamageValue}</span></div>
                <div className="flex justify-between"><span>Free / Gift Outflow (-):</span> <span>৳{calculations?.totalFreeValue}</span></div>
                <div className="flex justify-between"><span>Cash Discount (-):</span> <span>৳{calculations?.totalDiscountValue}</span></div>
                <div className="flex justify-between"><span>Expenses (-):</span> <span>৳{calculations?.totalExpensesValue}</span></div>
                <div className="flex justify-between"><span>Customer Credits (-):</span> <span>৳{calculations?.totalCreditsValue}</span></div>
              </div>

              <div className="border-t border-b border-gray-300 py-2 space-y-1 font-bold">
                <div className="flex justify-between"><span>DSR PAYABLE:</span> <span>৳{calculations?.dsrPayable}</span></div>
                <div className="flex justify-between"><span>TOTAL PAID:</span> <span>৳{calculations?.totalPaymentsValue}</span></div>
                <div className="flex justify-between text-indigo-700"><span>NET BALANCE:</span> <span>৳{calculations?.balance}</span></div>
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
