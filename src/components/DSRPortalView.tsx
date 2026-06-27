import React, { useState, useMemo, useEffect } from "react";
import { 
  Package, Search, Save, CheckCircle2, TrendingDown, 
  Gift, Wallet, Users, Plus, Trash2, ShieldCheck, Info, AlertTriangle, Truck 
} from "lucide-react";
import DSRPortalMap from "./DSRPortalMap";
import { formatCurrency, piecesToCartoon, getGroupColors } from "../lib/utils";
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

interface DSRPortalProps {
  summaries: any[];
  products: any[];
  customers: any[];
  staff: any[];
  routes: any[];
  orders: any[];
  currentUserRecord: any;
  role: string;
  updateSummary: (id: string, item: any) => Promise<void>;
}

export default function DSRPortalView({
  summaries,
  products,
  customers,
  staff,
  routes,
  orders,
  currentUserRecord,
  role,
  updateSummary
}: DSRPortalProps) {
  // Determine who the DSR is
  // If admin/manager, they can select a DSR to simulate their workspace
  const isDSRUser = role === "dsr" || (currentUserRecord && currentUserRecord.role === "dsr");
  const [selectedDSRId, setSelectedDSRId] = useState<string>("");

  useEffect(() => {
    if (isDSRUser && currentUserRecord?.staffId) {
      setSelectedDSRId(currentUserRecord.staffId);
    } else if (staff.length > 0 && !selectedDSRId) {
      // Pick first DSR from staff
      const firstDsr = staff.find(s => s.role === "DSR" || s.role === "dsr");
      if (firstDsr) setSelectedDSRId(firstDsr.id);
    }
  }, [isDSRUser, currentUserRecord, staff]);

  // Find active open loadsheet/summary of the DSR
  const activeSummary = useMemo(() => {
    if (!selectedDSRId) return null;
    return summaries.find(s => s.dsrId === selectedDSRId && s.status === "open");
  }, [summaries, selectedDSRId]);

  const pendingSyncCount = useMemo(() => {
    return orders.filter(o => o.pending_changes === true).length;
  }, [orders]);

  // Local Form states for returns and entries
  const [returnQtys, setReturnQtys] = useState<{ [key: string]: number }>({});
  const [damageQtys, setDamageQtys] = useState<{ [key: string]: number }>({});
  
  // Extra elements
  const [freeItems, setFreeItems] = useState<{ productId: string; quantity: number }[]>([]);
  const [discountItems, setDiscountItems] = useState<{ productId: string; amount: number }[]>([]);
  const [expenses, setExpenses] = useState<{ type: string; amount: number; description: string }[]>([]);
  const [credits, setCredits] = useState<{ customerId: string; amount: number }[]>([]);
  const [payments, setPayments] = useState<{ method: string; amount: number }[]>([]);

  // Search/selection helpers for forms
  const [selectedProductIdFree, setSelectedProductIdFree] = useState("");
  const [freeQty, setFreeQty] = useState("");
  
  const [selectedProductIdDiscount, setSelectedProductIdDiscount] = useState("");
  const [discountAmt, setDiscountAmt] = useState("");

  const [selectedExpenseType, setSelectedExpenseType] = useState("nasta");
  const [expenseAmt, setExpenseAmt] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [dueAmt, setDueAmt] = useState("");

  const [payMethod, setPayMethod] = useState("Cash");
  const [payAmt, setPayAmt] = useState("");

  // Populate draft if previously submitted
  useEffect(() => {
    if (activeSummary) {
      if (activeSummary.draftReturnQtys) setReturnQtys(activeSummary.draftReturnQtys);
      if (activeSummary.draftDamageQtys) setDamageQtys(activeSummary.draftDamageQtys);
      if (activeSummary.draftFreeItems) setFreeItems(activeSummary.draftFreeItems);
      if (activeSummary.draftDiscountItems) setDiscountItems(activeSummary.draftDiscountItems);
      if (activeSummary.draftExpenses) setExpenses(activeSummary.draftExpenses);
      if (activeSummary.draftCredits) setCredits(activeSummary.draftCredits);
      if (activeSummary.draftPayments) setPayments(activeSummary.draftPayments);
    } else {
      setReturnQtys({});
      setDamageQtys({});
      setFreeItems([]);
      setDiscountItems([]);
      setExpenses([]);
      setCredits([]);
      setPayments([]);
    }
  }, [activeSummary]);

  // Form calculation results
  const calculations = useMemo(() => {
    if (!activeSummary) return null;

    let totalSalesValue = 0;
    const items = activeSummary.items.map((item: any) => {
      const pId = item.productId;
      const ret = returnQtys[pId] || 0;
      const dmg = damageQtys[pId] || 0;
      const soldQty = Math.max(0, item.totalPieces - ret - dmg);
      const saleVal = soldQty * (item.price || 0);
      totalSalesValue += saleVal;

      return {
        ...item,
        returns: ret,
        damage: dmg,
        soldQty,
        saleValue: saleVal
      };
    });

    const totalFreeValue = freeItems.reduce((acc, f) => {
      const prodObj = products.find(p => p.id === f.productId);
      return acc + (f.quantity * (prodObj?.price || 0));
    }, 0);

    const totalDiscountValue = discountItems.reduce((acc, d) => acc + d.amount, 0);
    const totalExpensesValue = expenses.reduce((acc, e) => acc + e.amount, 0);
    const totalCreditsValue = credits.reduce((acc, c) => acc + c.amount, 0);
    const totalPaymentsValue = payments.reduce((acc, p) => acc + p.amount, 0);

    // DSR Payable = (Total Sales) - (Free Value) - (Discounts) - (Expenses) - (Credits/Baki)
    const dsrPayable = totalSalesValue - totalFreeValue - totalDiscountValue - totalExpensesValue - totalCreditsValue;
    const balance = totalPaymentsValue - dsrPayable;

    return {
      items,
      totalSalesValue,
      totalFreeValue,
      totalDiscountValue,
      totalExpensesValue,
      totalCreditsValue,
      totalPaymentsValue,
      dsrPayable,
      balance
    };
  }, [activeSummary, returnQtys, damageQtys, freeItems, discountItems, expenses, credits, payments, products]);

  const handleReturnChange = (productId: string, val: number) => {
    setReturnQtys(prev => ({
      ...prev,
      [productId]: Math.max(0, val)
    }));
  };

  const handleDamageChange = (productId: string, val: number) => {
    setDamageQtys(prev => ({
      ...prev,
      [productId]: Math.max(0, val)
    }));
  };

  const handleAddFree = () => {
    if (!selectedProductIdFree || !freeQty) return;
    const existingIdx = freeItems.findIndex(i => i.productId === selectedProductIdFree);
    if (existingIdx > -1) {
      const updated = [...freeItems];
      updated[existingIdx].quantity += Number(freeQty);
      setFreeItems(updated);
    } else {
      setFreeItems([...freeItems, { productId: selectedProductIdFree, quantity: Number(freeQty) }]);
    }
    setSelectedProductIdFree("");
    setFreeQty("");
    toast.success("ফ্রি প্রোডাক্ট এন্ট্রি যোগ হয়েছে");
  };

  const handleAddDiscount = () => {
    if (!selectedProductIdDiscount || !discountAmt) return;
    const existingIdx = discountItems.findIndex(i => i.productId === selectedProductIdDiscount);
    if (existingIdx > -1) {
      const updated = [...discountItems];
      updated[existingIdx].amount += Number(discountAmt);
      setDiscountItems(updated);
    } else {
      setDiscountItems([...discountItems, { productId: selectedProductIdDiscount, amount: Number(discountAmt) }]);
    }
    setSelectedProductIdDiscount("");
    setDiscountAmt("");
    toast.success("ডিসকাউন্ট এন্ট্রি যোগ হয়েছে");
  };

  const handleAddExpense = () => {
    if (!selectedExpenseType || !expenseAmt) return;
    setExpenses([...expenses, { 
      type: selectedExpenseType, 
      amount: Number(expenseAmt), 
      description: expenseDesc || EXPENSE_HEADS.find(h => h.id === selectedExpenseType)?.name || "" 
    }]);
    setExpenseAmt("");
    setExpenseDesc("");
    toast.success("খরচ এন্ট্রি যোগ হয়েছে");
  };

  const handleAddCredit = () => {
    if (!selectedCustomerId || !dueAmt) return;
    const existingIdx = credits.findIndex(c => c.customerId === selectedCustomerId);
    if (existingIdx > -1) {
      const updated = [...credits];
      updated[existingIdx].amount += Number(dueAmt);
      setCredits(updated);
    } else {
      setCredits([...credits, { customerId: selectedCustomerId, amount: Number(dueAmt) }]);
    }
    setSelectedCustomerId("");
    setDueAmt("");
    toast.success("কাস্টমার বাকি এন্ট্রি যোগ হয়েছে");
  };

  const handleAddPayment = () => {
    if (!payMethod || !payAmt) return;
    setPayments([...payments, { method: payMethod, amount: Number(payAmt) }]);
    setPayAmt("");
    toast.success("ক্যাশ আদায় এন্ট্রি যোগ হয়েছে");
  };

  const handleSubmitDraft = async () => {
    if (!activeSummary) return;
    try {
      const payload = {
        draftReturnQtys: returnQtys,
        draftDamageQtys: damageQtys,
        draftFreeItems: freeItems,
        draftDiscountItems: discountItems,
        draftExpenses: expenses,
        draftCredits: credits,
        draftPayments: payments,
        status: "submitted_by_dsr" // Changes status to tell manager it's ready!
      };

      await updateSummary(activeSummary.id, payload);
      toast.success("সাফল্য! আজকের হিসাব সফলভাবে ম্যানেজারের প্যানেলে জমা দেওয়া হয়েছে।");
    } catch (e: any) {
      toast.error("হিসাব সাবমিট করতে সমস্যা হয়েছে: " + e.message);
    }
  };

  const currentDSRName = staff.find(s => s.id === selectedDSRId)?.name || "N/A";
  const activeRouteName = activeSummary ? routes.find(r => r.id === activeSummary.routeId)?.name || "N/A" : "N/A";

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-700 to-emerald-950 p-6 md:p-8 rounded-3xl text-white shadow-xl">
        <h2 className="text-2xl md:text-3xl font-black mb-2 flex items-center gap-2.5">
          <ShieldCheck className="w-8 h-8 text-teal-300" />
          ডিএসআর ডেলিভারি ও হিসাব পোর্টাল
        </h2>
        <p className="text-teal-100 text-xs md:text-sm max-w-2xl leading-relaxed">
          আপনার আজকের ডেলিভারির প্রোডাক্টগুলোর রিটার্ন, ড্যামেজ, ফ্রি আইটেম, ডিসকাউন্ট, বিভিন্ন খরচ ও বাকি কাস্টমার কালেকশন এন্ট্রি দিন এবং সরাসরি ম্যানেজারের প্যানেলে জমা দিন।
        </p>

        {/* If Admin/Manager simulated view */}
        {!isDSRUser && (
          <div className="mt-6 bg-white/10 p-4 rounded-2xl border border-white/20 flex flex-wrap items-center gap-4">
            <span className="text-xs font-bold text-teal-200">🔍 সিমুলেশন মোড (এডমিন/ম্যানেজার):</span>
            <select 
              value={selectedDSRId} 
              onChange={e => setSelectedDSRId(e.target.value)}
              className="bg-emerald-900 border border-emerald-700 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
            >
              <option value="">ডিএসআর নির্বাচন করুন</option>
              {staff.filter(s => s.role === "DSR" || s.role === "dsr").map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Persistent Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-teal-100 shadow-sm flex items-center gap-4">
          <div className="bg-teal-100 p-3 rounded-xl">
            <Users className="w-5 h-5 text-teal-700" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase">নির্ধারিত ডিএসআর</p>
            <p className="text-sm font-black text-gray-950">{currentDSRName}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-teal-100 shadow-sm flex items-center gap-4">
          <div className="bg-teal-100 p-3 rounded-xl">
            <Truck className="w-5 h-5 text-teal-700" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase">নির্ধারিত রুট</p>
            <p className="text-sm font-black text-gray-950">{activeRouteName}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-xl">
            <Package className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase">পেন্ডিং অর্ডার</p>
            <p className="text-sm font-black text-gray-950">{pendingSyncCount} টি</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm flex items-center gap-4">
          <div className="bg-indigo-100 p-3 rounded-xl">
            <Wallet className="w-5 h-5 text-indigo-700" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase">সংগৃহীত ক্যাশ</p>
            <p className="text-sm font-black text-gray-950">{formatCurrency(calculations?.totalPaymentsValue || 0)}</p>
          </div>
        </div>
      </div>

      {pendingSyncCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl flex items-center gap-3 shadow-sm mt-6">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <p className="text-sm font-bold">
            আপনার {pendingSyncCount}টি অর্ডার অফলাইনে আছে যা সিঙ্ক করার অপেক্ষায় আছে।
          </p>
        </div>
      )}

      <DSRPortalMap orders={orders} />

      {/* Sales Target Progress */}
      {activeSummary && (
        <div className="bg-white p-6 rounded-3xl border shadow-sm mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-black text-gray-900">আজকের বিক্রয় লক্ষ্যমাত্রা</h3>
            <span className="text-xs font-bold text-gray-500">
              {formatCurrency(calculations?.totalSalesValue || 0)} / {formatCurrency(staff.find(s => s.id === selectedDSRId)?.dailySalesTarget || 10000)}
            </span>
          </div>
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(100, ((calculations?.totalSalesValue || 0) / (staff.find(s => s.id === selectedDSRId)?.dailySalesTarget || 10000)) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* No Loadsheet active state */}
      {!activeSummary ? (
        <div className="bg-white p-12 text-center border-2 border-dashed rounded-3xl space-y-4 max-w-xl mx-auto shadow-sm">
          <div className="p-4 bg-amber-50 text-amber-600 rounded-full w-fit mx-auto">
            <AlertTriangle className="w-10 h-10 animate-bounce" />
          </div>
          <div>
            <h4 className="text-lg font-black text-gray-900">আজকের কোনো লোডশীট পাওয়া যায়নি</h4>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto leading-relaxed">
              প্রিয় <span className="font-bold text-teal-700">{currentDSRName}</span>, আপনার রোড বা নামে ম্যানেজারের পক্ষ থেকে এখনও সকালের লোডশীট জেনারেট করা হয়নি। লোডশিট জেনারেট হলে এখানে পণ্যসমূহ চলে আসবে।
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Input Form: Left Side (col-span 2) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Products Returned & Damage Header */}
            <div className="bg-white rounded-3xl border shadow-xs overflow-hidden">
              <div className="bg-teal-50 p-4 px-6 border-b border-teal-100 flex justify-between items-center flex-wrap gap-2">
                <div className="flex items-center gap-2 text-teal-900">
                  <Package className="w-5 h-5 text-teal-600" />
                  <h3 className="font-extrabold text-base">১. আজকের এসাইনকৃত প্রোডাক্ট ও রিটার্ন তালিকা</h3>
                </div>
                <div className="text-xs text-teal-800 font-bold bg-teal-100/60 px-3 py-1 rounded-full">
                  রোড: {activeRouteName}
                </div>
              </div>

              <div className="p-4 md:p-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-gray-400 font-bold uppercase tracking-wider text-left bg-gray-50/50">
                      <th className="p-3">পণ্যের বিবরণ</th>
                      <th className="p-3 text-center">লোডেড পিস (Loaded)</th>
                      <th className="p-3 text-center w-28">রিটার্ন পিস (Return)</th>
                      <th className="p-3 text-center w-28">ড্যামেজ পিস (Damage)</th>
                      <th className="p-3 text-right">বিক্রয় পিস (Sold)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activeSummary.items?.map((item: any) => {
                      const pId = item.productId;
                      const ret = returnQtys[pId] || 0;
                      const dmg = damageQtys[pId] || 0;
                      const sold = Math.max(0, item.totalPieces - ret - dmg);
                      const prodObj = products.find(p => p.id === pId);

                      return (
                        <tr key={pId} className="hover:bg-gray-50/40 transition-colors">
                          <td className="p-3">
                            <p className="font-bold text-gray-800 text-sm">{item.name}</p>
                            <span className="text-[10px] text-gray-400 font-bold">দর: {formatCurrency(item.price)} | কার্টুন সাইজ: {prodObj?.cartoonSize || 1}</span>
                          </td>
                          <td className="p-3 text-center font-bold text-teal-800">
                            {item.totalPieces} পিস <span className="text-[10px] text-gray-400 font-normal">({piecesToCartoon(item.totalPieces, prodObj?.cartoonSize || 1)})</span>
                          </td>
                          <td className="p-3 text-center">
                            <input 
                              type="number" 
                              min="0"
                              max={item.totalPieces - dmg}
                              value={ret || ""}
                              onChange={e => handleReturnChange(pId, Number(e.target.value))}
                              placeholder="0"
                              className="w-20 p-2 text-center border-2 border-teal-200/50 rounded-xl font-bold bg-teal-50/20 text-teal-800 text-sm focus:border-teal-500 transition-colors"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input 
                              type="number" 
                              min="0"
                              max={item.totalPieces - ret}
                              value={dmg || ""}
                              onChange={e => handleDamageChange(pId, Number(e.target.value))}
                              placeholder="0"
                              className="w-20 p-2 text-center border-2 border-orange-200/50 rounded-xl font-bold bg-orange-50/20 text-orange-850 text-sm focus:border-orange-500 transition-colors"
                            />
                          </td>
                          <td className="p-3 text-right font-black text-gray-950">
                            {sold} পিস <span className="text-[10px] text-gray-450 font-normal">({piecesToCartoon(sold, prodObj?.cartoonSize || 1)})</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sub-modals for extra Entries: Row of Free, Discount, Expenses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* 2. Free Items and Cash Discounts */}
              <div className="bg-white rounded-3xl border shadow-xs overflow-hidden flex flex-col">
                <div className="bg-purple-50 p-4 border-b border-purple-100 flex items-center gap-2">
                  <Gift className="w-5 h-5 text-purple-600" />
                  <h3 className="font-extrabold text-purple-950 text-sm">২. ফ্রী প্রোডাক্ট ও ডিসকাউন্ট</h3>
                </div>
                <div className="p-5 flex-1 space-y-4">
                  {/* Free product list add */}
                  <div className="bg-purple-50/30 p-3.5 rounded-2xl border border-purple-100 space-y-2.5">
                    <p className="text-[10px] font-extrabold text-purple-700 uppercase">ফ্রী প্রোডাক্ট এন্ট্রি দিন</p>
                    <div className="flex gap-2">
                      <select 
                        value={selectedProductIdFree} 
                        onChange={e => setSelectedProductIdFree(e.target.value)}
                        className="flex-1 p-2 border rounded-xl text-xs bg-white focus:outline-none"
                      >
                        <option value="">প্রোডাক্ট সিলেক্ট করুন</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input 
                        type="number" 
                        value={freeQty}
                        onChange={e => setFreeQty(e.target.value)}
                        placeholder="পিস" 
                        className="w-16 p-2 border rounded-xl text-xs bg-white text-center font-bold" 
                      />
                      <button 
                        onClick={handleAddFree}
                        className="p-2 px-3 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs"
                      >
                        যোগ
                      </button>
                    </div>
                  </div>

                  {/* Free products active list */}
                  {freeItems.length > 0 && (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {freeItems.map((item, idx) => {
                        const pObj = products.find(p => p.id === item.productId);
                        return (
                          <div key={idx} className="flex justify-between items-center text-xs p-2 bg-purple-50/20 border border-purple-100 rounded-lg">
                            <span className="font-semibold text-gray-700 truncate max-w-[150px]">{pObj?.name || "Unknown"}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-purple-700">{item.quantity} পিস</span>
                              <button onClick={() => setFreeItems(freeItems.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Discount Section */}
                  <div className="bg-pink-50/30 p-3.5 rounded-2xl border border-pink-100 space-y-2.5">
                    <p className="text-[10px] font-extrabold text-pink-700 uppercase">ক্যাশ ডিসকাউন্ট এন্ট্রি দিন</p>
                    <div className="flex gap-2">
                      <select 
                        value={selectedProductIdDiscount} 
                        onChange={e => setSelectedProductIdDiscount(e.target.value)}
                        className="flex-1 p-2 border rounded-xl text-xs bg-white focus:outline-none"
                      >
                        <option value="">প্রোডাক্ট সিলেক্ট করুন</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input 
                        type="number" 
                        value={discountAmt}
                        onChange={e => setDiscountAmt(e.target.value)}
                        placeholder="টাকা" 
                        className="w-16 p-2 border rounded-xl text-xs bg-white text-center font-bold" 
                      />
                      <button 
                        onClick={handleAddDiscount}
                        className="p-2 px-3 bg-pink-700 hover:bg-pink-800 text-white font-bold rounded-xl text-xs"
                      >
                        যোগ
                      </button>
                    </div>
                  </div>

                  {/* Discount items active list */}
                  {discountItems.length > 0 && (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {discountItems.map((item, idx) => {
                        const pObj = products.find(p => p.id === item.productId);
                        return (
                          <div key={idx} className="flex justify-between items-center text-xs p-2 bg-pink-50/20 border border-pink-100 rounded-lg">
                            <span className="font-semibold text-gray-700 truncate max-w-[150px]">{pObj?.name || "Unknown"}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-pink-700">{formatCurrency(item.amount)}</span>
                              <button onClick={() => setDiscountItems(discountItems.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              </div>

              {/* 3. Daily Expenses & Bills */}
              <div className="bg-white rounded-3xl border shadow-xs overflow-hidden flex flex-col">
                <div className="bg-amber-50 p-4 border-b border-amber-100 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-amber-600" />
                  <h3 className="font-extrabold text-amber-950 text-sm">৩. রাস্তায় খরচ বা বিলসমূহ</h3>
                </div>
                <div className="p-5 flex-1 space-y-4">
                  <div className="bg-amber-50/20 p-4 border border-amber-100 rounded-2xl space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-amber-700 uppercase mb-1">খরচের খাত</label>
                      <select 
                        value={selectedExpenseType} 
                        onChange={e => setSelectedExpenseType(e.target.value)}
                        className="w-full p-2 border rounded-xl text-xs bg-white text-gray-800"
                      >
                        {EXPENSE_HEADS.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-amber-700 uppercase mb-1">পরিমাণ (টাকা)</label>
                        <input 
                          type="number" 
                          value={expenseAmt} 
                          onChange={e => setExpenseAmt(e.target.value)}
                          placeholder="0.00" 
                          className="w-full p-2 border rounded-xl text-xs bg-white font-bold" 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-amber-700 uppercase mb-1">রিমার্কস/নোট</label>
                        <input 
                          type="text" 
                          value={expenseDesc} 
                          onChange={e => setExpenseDesc(e.target.value)}
                          placeholder="উদা: গাড়ির টোল বা রিক্সা" 
                          className="w-full p-2 border rounded-xl text-xs bg-white" 
                        />
                      </div>
                    </div>
                    <button 
                      onClick={handleAddExpense}
                      className="w-full py-2 bg-amber-600 text-white hover:bg-amber-700 rounded-xl text-xs font-bold"
                    >
                      খরচ এন্ট্রি যুক্ত করুন
                    </button>
                  </div>

                  {/* Active expenses list */}
                  {expenses.length > 0 && (
                    <div className="space-y-1.5 max-h-44 overflow-y-auto">
                      {expenses.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs p-2.5 bg-amber-50/10 border border-amber-100 rounded-xl">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-amber-900 capitalize">{item.type}</p>
                            <p className="text-[10px] text-gray-500 truncate">{item.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-amber-700">{formatCurrency(item.amount)}</span>
                            <button onClick={() => setExpenses(expenses.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* 4. Customer Credits & Cash আদায় */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Customer due (বাকি) */}
              <div className="bg-white rounded-3xl border shadow-xs overflow-hidden flex flex-col">
                <div className="bg-orange-50 p-4 border-b border-orange-100 flex items-center gap-2">
                  <Users className="w-5 h-5 text-orange-600" />
                  <h3 className="font-extrabold text-orange-950 text-sm">৪. দোকানে বাকি এন্ট্রি (DSR Dues)</h3>
                </div>
                <div className="p-5 flex-1 space-y-4">
                  <div className="bg-orange-50/20 p-4 rounded-2xl border border-orange-100 space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-orange-700 uppercase mb-1">কাস্টমার নির্বাচন</label>
                      <select 
                        value={selectedCustomerId} 
                        onChange={e => setSelectedCustomerId(e.target.value)}
                        className="w-full p-2 border rounded-xl bg-white text-xs text-gray-800"
                      >
                        <option value="">নির্বাচন করুন</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.shopName || "দোকান"}) {c.groupId ? `[গ্রুপ: ${c.groupId}]` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-orange-700 uppercase mb-1">বাকির পরিমাণ (টাকা)</label>
                      <input 
                        type="number" 
                        value={dueAmt} 
                        onChange={e => setDueAmt(e.target.value)}
                        placeholder="0.00" 
                        className="w-full p-2 border rounded-xl text-xs font-bold bg-white" 
                      />
                    </div>
                    <button 
                      onClick={handleAddCredit}
                      className="w-full py-2 bg-orange-600 text-white hover:bg-orange-750 rounded-xl text-xs font-bold"
                    >
                      বাকি বুকিং নিশ্চিত করুন
                    </button>
                  </div>

                  {/* Active credits list */}
                  {credits.length > 0 && (
                    <div className="space-y-1.5 max-h-44 overflow-y-auto">
                      {credits.map((item, idx) => {
                        const cust = customers.find(c => c.id === item.customerId);
                        return (
                          <div key={idx} className="flex justify-between items-center text-xs p-2.5 bg-orange-50/10 border border-orange-100 rounded-xl">
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-800 flex items-center gap-1.5 flex-wrap">
                                {cust?.name || "সাধারণ কাস্টমার"}
                                {cust?.groupId && (() => {
                                  const colors = getGroupColors(cust.groupId);
                                  return (
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border tracking-wider transition-all ${colors.bg} ${colors.text} ${colors.border}`}>
                                      {cust.groupId}
                                    </span>
                                  );
                                })()}
                              </p>
                              <p className="text-[10px] text-gray-400 capitalize">{cust?.shopName || "দোকান"}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-orange-700">{formatCurrency(item.amount)}</span>
                              <button onClick={() => setCredits(credits.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* DSR ক্যাশ আদায় (Payments Collection) */}
              <div className="bg-white rounded-3xl border shadow-xs overflow-hidden flex flex-col">
                <div className="bg-indigo-50 p-4 border-b border-indigo-100 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-extrabold text-indigo-950 text-sm">৫. আদায়কৃত ক্যাশ টাকা (Collection)</h3>
                </div>
                <div className="p-5 flex-1 space-y-4">
                  <div className="bg-indigo-50/20 p-4 rounded-2xl border border-indigo-100 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-indigo-700 uppercase mb-1">পদ্ধতি</label>
                        <select 
                          value={payMethod} 
                          onChange={e => setPayMethod(e.target.value)}
                          className="w-full p-2 border rounded-xl bg-white text-xs"
                        >
                          <option>Cash</option>
                          <option>bKash</option>
                          <option>Nagad</option>
                          <option>Bank</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-indigo-700 uppercase mb-1">পরিমাণ (টাকা)</label>
                        <input 
                          type="number" 
                          value={payAmt} 
                          onChange={e => setPayAmt(e.target.value)}
                          placeholder="0.00" 
                          className="w-full p-2 border rounded-xl text-xs font-bold bg-white" 
                        />
                      </div>
                    </div>
                    <button 
                      onClick={handleAddPayment}
                      className="w-full py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-xs font-bold"
                    >
                      ক্যালেকশন যোগ করুন
                    </button>
                  </div>

                  {/* Active collections list */}
                  {payments.length > 0 && (
                    <div className="space-y-1.5 max-h-44 overflow-y-auto">
                      {payments.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs p-2.5 bg-indigo-50/10 border border-indigo-100 rounded-xl">
                          <span className="font-bold text-indigo-900 bg-indigo-100 px-2 py-0.5 rounded">{item.method}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-indigo-600">{formatCurrency(item.amount)}</span>
                            <button onClick={() => setPayments(payments.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>

          {/* Sidebar calculations & Draft submit: Right Side (col-span 1) */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border shadow-lg sticky top-8 space-y-6">
              <h3 className="text-lg font-black text-gray-900 border-b pb-2 flex items-center justify-between">
                <span>আজকের ডিএসআর খতিয়ান</span>
                <span className="text-[10px] text-gray-400 uppercase font-mono bg-gray-50 border px-2 py-0.5 rounded">Calculations</span>
              </h3>

              <div className="space-y-3.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">মোট বিক্রয়মূল্য (+):</span>
                  <span className="font-extrabold text-gray-900">{formatCurrency(calculations?.totalSalesValue)}</span>
                </div>
                <div className="flex justify-between text-purple-600">
                  <span className="text-gray-500">ফ্রী প্রোডাক্ট বাদ (-):</span>
                  <span className="font-extrabold">{formatCurrency(calculations?.totalFreeValue)}</span>
                </div>
                <div className="flex justify-between text-pink-600">
                  <span className="text-gray-500">ক্যাশ ডিসকাউন্ট বাদ (-):</span>
                  <span className="font-extrabold">{formatCurrency(calculations?.totalDiscountValue)}</span>
                </div>
                <div className="flex justify-between text-amber-600">
                  <span className="text-gray-500">উপযোগ/রাস্তার খরচ বাদ (-):</span>
                  <span className="font-extrabold">{formatCurrency(calculations?.totalExpensesValue)}</span>
                </div>
                <div className="flex justify-between text-orange-600">
                  <span className="text-gray-500">গ্রাহকদের কাছে বাকি (-):</span>
                  <span className="font-extrabold">{formatCurrency(calculations?.totalCreditsValue)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between text-base font-black text-emerald-700 bg-emerald-50/40 p-2.5 rounded-2xl border border-emerald-100">
                  <span>নিট প্রদেয় ক্যাশ:</span>
                  <span>{formatCurrency(calculations?.dsrPayable)}</span>
                </div>
                <div className="flex justify-between text-indigo-700">
                  <span className="text-gray-500">আপনার সংগৃহীত ক্যাশ (+):</span>
                  <span className="font-extrabold">{formatCurrency(calculations?.totalPaymentsValue)}</span>
                </div>
              </div>

              {/* Running Balance */}
              <div className="bg-slate-50 border p-4 rounded-2xl space-y-1.5">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">চলতি ব্যালেন্স</p>
                <p className={`text-2xl font-black ${calculations && calculations.balance < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                  {formatCurrency(calculations?.balance)}
                </p>
                <p className="text-[9px] text-gray-400 font-medium">
                  ব্যালেন্স শূন্য বা পজিটিভ হওয়া বাঞ্ছনীয়।
                </p>
              </div>

              {/* Submit Draft Button */}
              <div className="space-y-3">
                <button 
                  onClick={handleSubmitDraft}
                  className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-black text-base rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  ম্যানেজারের নিকট রিপোর্ট পাঠান
                </button>
                <div className="p-3 bg-teal-50 border border-teal-150 rounded-xl flex gap-2">
                  <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-teal-800 leading-normal">
                    এটি সাবমিট করলে আপনার হিসাবের ড্রাফট ম্যানেজার প্যানেলে আপডেট হবে। বিকাল ১০টায় ম্যানেজার আপনার রি-কনসিলিয়েশন সম্পন্ন করবেন।
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}
    </div>
  );
}
