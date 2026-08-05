import React, { useState, useMemo } from "react";
import { 
  Search, 
  FileText, 
  PlusCircle, 
  ArrowDownRight, 
  ArrowUpRight, 
  Wallet, 
  DollarSign, 
  Send, 
  RotateCcw, 
  Briefcase, 
  Layers, 
  CheckCircle2, 
  Printer, 
  UserCheck, 
  Building2,
  Calendar,
  CreditCard,
  Sliders
} from "lucide-react";
import { calculateRunningBalance, getCustomerSupplierDueBreakdown, LedgerTransaction } from "../lib/ledgerEngine";
import { formatCurrency } from "../lib/utils";
import toast from "react-hot-toast";

interface LedgerProps {
  customers: any[];
  suppliers: any[];
  staff: any[];
  payments: any[];
  purchases: any[];
  summaries: any[];
  transactions?: any[];
  addTransaction?: (tx: any) => Promise<any>;
}

export default function UnifiedLedgerView({ 
  customers, 
  suppliers, 
  staff, 
  payments, 
  purchases, 
  summaries,
  transactions = [],
  addTransaction
}: LedgerProps) {
  const [activeTab, setActiveTab] = useState<"customer" | "supplier" | "staff">("customer");
  const [activeEntityId, setActiveEntityId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editMode, setEditMode] = useState<'statement' | 'supplier_breakdown' | 'quick_actions' | 'payment'>('supplier_breakdown');

  // Quick action modal state
  const [actionType, setActionType] = useState<string | null>(null);
  const [actionAmount, setActionAmount] = useState("");
  const [actionSupplierId, setActionSupplierId] = useState("");
  const [actionNotes, setActionNotes] = useState("");

  // Supplier-wise bulk collection input states
  const [bulkCollections, setBulkCollections] = useState<{ [supplierId: string]: string }>({});

  const filteredEntities = useMemo(() => {
    let list: any[] = [];
    if (activeTab === "customer") list = customers;
    else if (activeTab === "supplier") list = suppliers;
    else list = staff;

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(e => 
      e.name?.toLowerCase().includes(q) || 
      e.phone?.toLowerCase().includes(q) || 
      e.shopName?.toLowerCase().includes(q)
    );
  }, [activeTab, customers, suppliers, staff, searchQuery]);

  const activeEntity = useMemo(() => {
    if (activeEntityId) return filteredEntities.find(e => e.id === activeEntityId) || filteredEntities[0];
    return filteredEntities[0] || null;
  }, [filteredEntities, activeEntityId]);

  // Unified transactions for active entity
  const entityTransactions = useMemo(() => {
    if (!activeEntity) return [];
    
    // Combine explicit transactions collection and converted payment records
    const rawTxs: LedgerTransaction[] = transactions.filter(t => t.partyId === activeEntity.id);

    // Also include payments if missing from transactions
    payments.filter(p => p.entityId === activeEntity.id || p.partyId === activeEntity.id).forEach(p => {
      if (!rawTxs.some(t => t.id === p.id || t.ref === p.id)) {
        rawTxs.push({
          id: p.id,
          partyId: activeEntity.id,
          partyType: activeTab === 'customer' ? 'CUSTOMER' : activeTab === 'supplier' ? 'SUPPLIER' : 'STAFF',
          type: 'COLLECTION',
          amount: Number(p.amount || 0),
          description: p.notes || p.description || 'Payment Collection',
          ref: p.id,
          date: p.date || new Date().toISOString().split('T')[0],
          timestamp: p.timestamp || Date.now(),
          supplierId: p.supplierId
        });
      }
    });

    return calculateRunningBalance(
      rawTxs, 
      activeTab === 'customer' ? 'CUSTOMER' : activeTab === 'supplier' ? 'SUPPLIER' : 'STAFF', 
      activeEntity.id
    );
  }, [activeEntity, transactions, payments, activeTab]);

  // Supplier-wise customer breakdown
  const supplierBreakdown = useMemo(() => {
    if (!activeEntity || activeTab !== "customer") return { breakdown: [], totalDue: 0 };
    return getCustomerSupplierDueBreakdown(transactions, activeEntity.id, suppliers);
  }, [activeEntity, activeTab, transactions, suppliers]);

  const handleBulkCollectionSubmit = async () => {
    if (!activeEntity) return;
    try {
      let totalCollected = 0;
      const date = new Date().toISOString().split('T')[0];

      for (const [supId, amtStr] of Object.entries(bulkCollections)) {
        const amt = Number(amtStr);
        if (amt > 0) {
          totalCollected += amt;
          const supObj = suppliers.find(s => s.id === supId);
          if (addTransaction) {
            await addTransaction({
              partyId: activeEntity.id,
              partyType: 'CUSTOMER',
              type: 'COLLECTION',
              amount: amt,
              description: `Bulk Collection against ${supObj?.name || 'Supplier'}`,
              ref: `BULK-${Date.now()}`,
              date,
              timestamp: Date.now(),
              supplierId: supId,
              supplierName: supObj?.name
            });
          }
        }
      }

      if (totalCollected > 0) {
        toast.success(`সাফল্যের সাথে ${formatCurrency(totalCollected)} কালেকশন এন্ট্রি সফল হয়েছে!`);
        setBulkCollections({});
      } else {
        toast.error("অনুগ্রহ করে অন্তত একটি সাপ্লায়ারের ঘরে কালেকশনের পরিমাণ লিখুন।");
      }
    } catch (err) {
      console.error("Bulk collection error:", err);
      toast.error("কালেকশন এন্ট্রি সংরক্ষণ করা সম্ভব হয়নি।");
    }
  };

  const handleQuickAction = async () => {
    if (!activeEntity || !actionType || !actionAmount) return;
    try {
      const amt = Number(actionAmount);
      if (isNaN(amt) || amt <= 0) {
        toast.error("সঠিক টাকার পরিমাণ প্রদান করুন");
        return;
      }

      const date = new Date().toISOString().split('T')[0];
      const supObj = suppliers.find(s => s.id === actionSupplierId);

      if (addTransaction) {
        await addTransaction({
          partyId: activeEntity.id,
          partyType: activeTab === 'customer' ? 'CUSTOMER' : activeTab === 'supplier' ? 'SUPPLIER' : 'STAFF',
          type: actionType as any,
          amount: amt,
          description: actionNotes || `Quick Action: ${actionType}`,
          ref: `QA-${Date.now()}`,
          date,
          timestamp: Date.now(),
          supplierId: actionSupplierId || undefined,
          supplierName: supObj?.name
        });
      }

      toast.success("লেজার ট্রানজ্যাকশন সফলভাবে যুক্ত হয়েছে");
      setActionType(null);
      setActionAmount("");
      setActionNotes("");
    } catch (err) {
      toast.error("ট্রানজ্যাকশন এন্ট্রি ব্যর্থ হয়েছে");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-teal-600" />
            SAMIRA Unified Master Ledger Portal
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            একই লেজার ইঞ্জিন থেকে কাস্টমার, সাপ্লায়ার ও স্টাফদের রিয়েল-টাইম রানিং ব্যালেন্স ও স্টেটমেন্ট।
          </p>
        </div>

        {/* Tab Switchers */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-start md:self-auto">
          {(["customer", "supplier", "staff"] as const).map(t => (
            <button
              key={t}
              onClick={() => {
                setActiveTab(t);
                setActiveEntityId("");
                setEditMode(t === 'customer' ? 'supplier_breakdown' : 'statement');
              }}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === t 
                  ? "bg-slate-900 text-white shadow-md" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              {t === 'customer' ? 'কাস্টমার লেজার' : t === 'supplier' ? 'সাপ্লায়ার লেজার' : 'ডিএসআর / স্টাফ লেজার'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Entity List Sidebar */}
        <div className="lg:col-span-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[650px]">
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="নাম, ফোন বা দোকান দিয়ে খুঁজুন..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {filteredEntities.length > 0 ? (
              filteredEntities.map(e => {
                const isSelected = activeEntity?.id === e.id;
                return (
                  <button
                    key={e.id}
                    onClick={() => setActiveEntityId(e.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "bg-teal-50 border-teal-300 shadow-xs"
                        : "bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200"
                    }`}
                  >
                    <div>
                      <h4 className={`text-xs font-black ${isSelected ? "text-teal-900" : "text-slate-800"}`}>
                        {e.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {e.shopName || e.mobile || e.phone || "সাধারণ প্রোফাইল"}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-black ${Number(e.balance || 0) >= 0 ? "text-rose-600" : "text-emerald-600"}`}>
                        {formatCurrency(Math.abs(Number(e.balance || 0)))}
                      </span>
                      <p className="text-[9px] text-slate-400 uppercase font-extrabold">
                        {Number(e.balance || 0) >= 0 ? "বকেয়া" : "জমা"}
                      </p>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs font-bold">
                কোনো রেকর্ড পাওয়া যায়নি
              </div>
            )}
          </div>
        </div>

        {/* Right Main Ledger Content Panel */}
        <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
          {activeEntity ? (
            <>
              {/* Entity Header Summary */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-150 pb-4 gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black text-slate-900">{activeEntity.name}</h3>
                      <span className="bg-slate-100 text-slate-700 text-[10px] font-black px-2.5 py-1 rounded-full border border-slate-200 uppercase">
                        {activeTab}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {activeEntity.shopName ? `দোকান: ${activeEntity.shopName} | ` : ''}ফোন: {activeEntity.mobile || activeEntity.phone || "N/A"}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-right shrink-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase">মোট নিট বাকি (Total Net Due)</p>
                    <p className={`text-2xl font-black ${Number(activeEntity.balance || supplierBreakdown.totalDue || 0) >= 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      {formatCurrency(Math.abs(Number(activeEntity.balance || supplierBreakdown.totalDue || 0)))}
                    </p>
                  </div>
                </div>

                {/* Sub-Tabs */}
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  {activeTab === "customer" && (
                    <button
                      onClick={() => setEditMode("supplier_breakdown")}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                        editMode === "supplier_breakdown"
                          ? "bg-teal-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" /> সাপ্লায়ার ওয়াইজ বকেয়া (Multiple Breakdown)
                    </button>
                  )}

                  <button
                    onClick={() => setEditMode("statement")}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                      editMode === "statement"
                        ? "bg-teal-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" /> লেজার স্টেটমেন্ট হিস্ট্রি
                  </button>

                  <button
                    onClick={() => setEditMode("quick_actions")}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                      editMode === "quick_actions"
                        ? "bg-teal-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Quick Action বাটনসমূহ
                  </button>
                </div>
              </div>

              {/* View 1: Supplier-wise Multiple Customer Breakdown */}
              {editMode === "supplier_breakdown" && activeTab === "customer" && (
                <div className="space-y-4">
                  <div className="bg-teal-50 border border-teal-200 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-teal-900">সাপ্লায়ার অনুযায়ী মাল্টিপল বাকি তালিকা</h4>
                      <p className="text-[11px] text-teal-700 mt-0.5">
                        একই সাথে সব সাপ্লায়ারের বকেয়া দেখে ফাঁকা ঘরে কালেকশন বসিয়ে এক ক্লিকে বিল গ্রহণ করুন।
                      </p>
                    </div>
                    <button
                      onClick={handleBulkCollectionSubmit}
                      className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" /> বাল্ক বিল গ্রহণ করুন
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-black border-b">
                        <tr>
                          <th className="p-3 text-left">কোম্পানি / সাপ্লায়ার</th>
                          <th className="p-3 text-right">বর্তমান বকেয়া</th>
                          <th className="p-3 text-right w-44">আদায়কৃত টাকা এন্ট্রি</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {supplierBreakdown.breakdown.length > 0 ? (
                          supplierBreakdown.breakdown.map((item) => (
                            <tr key={item.supplierId} className="hover:bg-slate-50/80">
                              <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-slate-400" />
                                {item.supplierName}
                              </td>
                              <td className="p-3 text-right font-black text-rose-600">
                                {formatCurrency(item.amount)}
                              </td>
                              <td className="p-3 text-right">
                                <input
                                  type="number"
                                  value={bulkCollections[item.supplierId] || ""}
                                  onChange={e => setBulkCollections({ ...bulkCollections, [item.supplierId]: e.target.value })}
                                  placeholder="পরিমাণ (৳)"
                                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-right font-black focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />
                              </td>
                            </tr>
                          ))
                        ) : (
                          suppliers.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50/80">
                              <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-slate-400" />
                                {s.name}
                              </td>
                              <td className="p-3 text-right font-bold text-slate-400">
                                0.00 ৳
                              </td>
                              <td className="p-3 text-right">
                                <input
                                  type="number"
                                  value={bulkCollections[s.id] || ""}
                                  onChange={e => setBulkCollections({ ...bulkCollections, [s.id]: e.target.value })}
                                  placeholder="পরিমাণ (৳)"
                                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-right font-black focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot className="bg-slate-100 font-black border-t">
                        <tr>
                          <td className="p-3 text-left">সর্বমোট বকেয়া (Total Due)</td>
                          <td className="p-3 text-right text-rose-700 text-sm">
                            {formatCurrency(supplierBreakdown.totalDue)}
                          </td>
                          <td className="p-3 text-right text-teal-800">
                            একত্রে কালেকশন করুন
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* View 2: Quick Action Buttons Grid */}
              {editMode === "quick_actions" && (
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-800">কুইক অ্যাকশন বাটনসমূহ (Quick Actions)</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {activeTab === "customer" && (
                      <>
                        <button
                          onClick={() => setActionType("SALES")}
                          className="p-4 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-2xl text-left transition-all cursor-pointer space-y-1"
                        >
                          <FileText className="w-5 h-5 text-blue-600" />
                          <p className="text-xs font-black text-blue-900">Sales Invoice</p>
                          <p className="text-[10px] text-blue-700">নতুন সেলস ইনভয়েস যুক্ত করুন</p>
                        </button>
                        <button
                          onClick={() => setActionType("COLLECTION")}
                          className="p-4 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-2xl text-left transition-all cursor-pointer space-y-1"
                        >
                          <ArrowDownRight className="w-5 h-5 text-emerald-600" />
                          <p className="text-xs font-black text-emerald-900">Payment In</p>
                          <p className="text-[10px] text-emerald-700">কাস্টমার বকেয়া কালেকশন রিসিভ</p>
                        </button>
                        <button
                          onClick={() => setActionType("RETURN")}
                          className="p-4 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-2xl text-left transition-all cursor-pointer space-y-1"
                        >
                          <RotateCcw className="w-5 h-5 text-amber-600" />
                          <p className="text-xs font-black text-amber-900">Sales Return</p>
                          <p className="text-[10px] text-amber-700">পণ্য ফেরত অ্যাডজাস্টমেন্ট</p>
                        </button>
                        <button
                          onClick={() => setActionType("TRANSFER")}
                          className="p-4 bg-purple-50 border border-purple-200 hover:bg-purple-100 rounded-2xl text-left transition-all cursor-pointer space-y-1"
                        >
                          <Send className="w-5 h-5 text-purple-600" />
                          <p className="text-xs font-black text-purple-900">Supplier Transfer</p>
                          <p className="text-[10px] text-purple-700">সাপ্লায়ার ওয়াইজ ব্যালেন্স ট্রান্সফার</p>
                        </button>
                      </>
                    )}

                    {activeTab === "staff" && (
                      <>
                        <button
                          onClick={() => setActionType("COLLECTION")}
                          className="p-4 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-2xl text-left transition-all cursor-pointer space-y-1"
                        >
                          <ArrowDownRight className="w-5 h-5 text-emerald-600" />
                          <p className="text-xs font-black text-emerald-900">Payment In</p>
                          <p className="text-[10px] text-emerald-700">ডিএসআর থেকে ক্যাশ জমা</p>
                        </button>
                        <button
                          onClick={() => setActionType("SALARY")}
                          className="p-4 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-2xl text-left transition-all cursor-pointer space-y-1"
                        >
                          <Wallet className="w-5 h-5 text-indigo-600" />
                          <p className="text-xs font-black text-indigo-900">Salary Adjustment</p>
                          <p className="text-[10px] text-indigo-700">বেতন বা শর্ট অ্যাডজাস্টমেন্ট</p>
                        </button>
                      </>
                    )}

                    {activeTab === "supplier" && (
                      <>
                        <button
                          onClick={() => setActionType("PURCHASE")}
                          className="p-4 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-2xl text-left transition-all cursor-pointer space-y-1"
                        >
                          <FileText className="w-5 h-5 text-blue-600" />
                          <p className="text-xs font-black text-blue-900">Purchase Bill</p>
                          <p className="text-[10px] text-blue-700">সাপ্লায়ার ক্রয় বিল</p>
                        </button>
                        <button
                          onClick={() => setActionType("PAYMENT")}
                          className="p-4 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-2xl text-left transition-all cursor-pointer space-y-1"
                        >
                          <ArrowUpRight className="w-5 h-5 text-rose-600" />
                          <p className="text-xs font-black text-rose-900">Payment Out</p>
                          <p className="text-[10px] text-rose-700">সাপ্লায়ারকে মূল্য পরিশোধ</p>
                        </button>
                      </>
                    )}
                  </div>

                  {/* Quick Action Input Form Modal Card */}
                  {actionType && (
                    <div className="bg-slate-50 border border-slate-300 p-5 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between border-b pb-2">
                        <h5 className="text-xs font-black text-slate-900 uppercase">
                          এন্ট্রি করুন: {actionType}
                        </h5>
                        <button onClick={() => setActionType(null)} className="text-xs text-slate-400 hover:text-slate-600">
                          বাতিল
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase">টাকার পরিমাণ (৳)</label>
                          <input
                            type="number"
                            value={actionAmount}
                            onChange={e => setActionAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase">সাপ্লায়ার (ঐচ্ছিক)</label>
                          <select
                            value={actionSupplierId}
                            onChange={e => setActionSupplierId(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                          >
                            <option value="">সকল / সাধারণ</option>
                            {suppliers.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase">রেফারেন্স / নোট</label>
                        <input
                          type="text"
                          value={actionNotes}
                          onChange={e => setActionNotes(e.target.value)}
                          placeholder="ভাউচার নম্বর বা বিবরণ..."
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                        />
                      </div>

                      <button
                        onClick={handleQuickAction}
                        className="w-full py-3 bg-slate-900 hover:bg-black text-white font-black text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                      >
                        ট্রানজ্যাকশন নিশ্চিত করুন
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* View 3: Complete Chronological Statement Table */}
              {editMode === "statement" && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-800">সম্পূর্ণ লেজার স্টেটমেন্ট হিস্ট্রি</h4>
                  <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[350px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-black border-b sticky top-0">
                        <tr>
                          <th className="p-3 text-left">তারিখ</th>
                          <th className="p-3 text-left">টাইপ</th>
                          <th className="p-3 text-left">বিবরণ / রেফারেন্স</th>
                          <th className="p-3 text-right">ডেবিট (+)</th>
                          <th className="p-3 text-right">ক্রেডিট (-)</th>
                          <th className="p-3 text-right">রানিং ব্যালেন্স</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {entityTransactions.length > 0 ? (
                          entityTransactions.map((tx) => {
                            const isDebit = ['SALES', 'DUE', 'DEBIT', 'SHORT', 'PURCHASE'].includes(tx.type);
                            return (
                              <tr key={tx.id} className="hover:bg-slate-50">
                                <td className="p-3 font-semibold text-slate-600 whitespace-nowrap">{tx.date}</td>
                                <td className="p-3 font-black text-slate-800">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-black ${
                                    isDebit ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                                  }`}>
                                    {tx.type}
                                  </span>
                                </td>
                                <td className="p-3 text-slate-700">
                                  <p className="font-semibold">{tx.description}</p>
                                  <p className="text-[10px] text-slate-400">Ref: #{tx.ref} {tx.supplierName ? `| Supplier: ${tx.supplierName}` : ''}</p>
                                </td>
                                <td className="p-3 text-right font-black text-rose-600">
                                  {isDebit ? formatCurrency(tx.amount) : '-'}
                                </td>
                                <td className="p-3 text-right font-black text-emerald-600">
                                  {!isDebit ? formatCurrency(tx.amount) : '-'}
                                </td>
                                <td className="p-3 text-right font-black text-slate-900">
                                  {formatCurrency(tx.runningBalance || 0)}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                              কোনো লেনদেনের তথ্য রেকর্ড পাওয়া যায়নি
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="h-96 flex flex-col items-center justify-center text-slate-400 space-y-2">
              <Layers className="w-10 h-10 text-slate-300" />
              <p className="text-xs font-bold">বাম পাশের তালিকা থেকে একটি কাস্টমার বা স্টাফ নির্বাচন করুন</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

