import React, { useState, useMemo } from "react";
import { Search, Save, User, Calendar, Wallet, Landmark, RefreshCw, X, Check, ArrowRight } from "lucide-react";
import { calculateLedger } from "../utils/ledgerCalculator";
import toast from "react-hot-toast";

interface CustomerCollectionModuleProps {
  customers: any[];
  suppliers: any[];
  products: any[];
  transactions: any[];
  accounts: any[];
  addPayment: (record: any) => Promise<any>;
  role: string;
}

export default function CustomerCollectionModule({
  customers,
  suppliers,
  products,
  transactions,
  accounts,
  addPayment,
  role
}: CustomerCollectionModuleProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({});
  
  // Payment metadata states
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedAccountId, setSelectedAccountId] = useState(() => accounts[0]?.id || "default");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return customers.filter(
      c => 
        c.name?.toLowerCase().includes(query) || 
        c.phone?.includes(query) ||
        c.address?.toLowerCase().includes(query)
    );
  }, [customers, searchQuery]);

  // Selected customer object
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Selected customer's supplier-wise breakdown
  const ledgerData = useMemo(() => {
    if (!selectedCustomerId) return null;
    return calculateLedger(
      selectedCustomerId,
      "customer",
      transactions,
      suppliers,
      products,
      0
    );
  }, [selectedCustomerId, transactions, suppliers, products]);

  // Handle selecting a customer
  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setSearchQuery("");
    setPaymentAmounts({});
  };

  // Keyboard Enter handler in Search Input
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && filteredCustomers.length > 0) {
      handleSelectCustomer(filteredCustomers[0].id);
    }
  };

  // Handle amount input change
  const handleAmountChange = (supplierId: string, value: string) => {
    setPaymentAmounts(prev => ({
      ...prev,
      [supplierId]: value
    }));
  };

  // Check if any payment amount is entered
  const hasEnteredAmounts = useMemo(() => {
    return Object.values(paymentAmounts).some(val => Number(val) > 0);
  }, [paymentAmounts]);

  // Handle Save / Submit
  const handleSaveCollection = async () => {
    if (role === "view-only") {
      toast.error("আপনার এই পেমেন্ট এন্ট্রি করার অনুমতি নেই।");
      return;
    }
    if (!selectedCustomerId || !selectedCustomer) {
      toast.error("অনুগ্রহ করে কাস্টমার সিলেক্ট করুন");
      return;
    }
    if (!hasEnteredAmounts) {
      toast.error("অনুগ্রহ করে অন্তত একটি সাপ্লায়ারের কালেকশন অ্যামাউন্ট লিখুন");
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;
    try {
      // Create payments sequentially
      for (const [suppId, amtStr] of Object.entries(paymentAmounts)) {
        const amt = Number(amtStr);
        if (isNaN(amt) || amt <= 0) continue;

        const supplierObj = suppliers.find(s => s.id === suppId);
        const supplierName = supplierObj ? (supplierObj.company || supplierObj.name) : (suppId === "all" ? "সাধারণ / সমস্ত সাপ্লায়ার" : "অজানা সাপ্লায়ার");

        await addPayment({
          date: paymentDate,
          amount: amt,
          type: "in", // Payment received
          entityId: selectedCustomerId,
          supplierId: suppId,
          method: paymentMethod,
          accountId: selectedAccountId,
          description: `কাস্টমার বাকি কালেকশন (${supplierName})`
        });
        successCount++;
      }

      toast.success(`${successCount} টি সাপ্লায়ারের কালেকশন সফলভাবে সম্পন্ন হয়েছে!`);
      
      // Auto progress to next state (Clear selected customer to ready for next search)
      setSelectedCustomerId(null);
      setPaymentAmounts({});
    } catch (err: any) {
      console.error(err);
      toast.error("কালেকশন সংরক্ষণ করতে সমস্যা হয়েছে: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4 md:py-8 space-y-6 animate-in fade-in duration-250">
      {/* Title block */}
      <div className="text-center md:text-left space-y-1">
        <h2 className="text-2xl font-black text-slate-900 flex items-center justify-center md:justify-start gap-2">
          <Wallet className="w-6 h-6 text-indigo-600" />
          কাস্টমার বকেয়া আদায় (বাকি কালেকশন)
        </h2>
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest">
          Mobile-Responsive Bulk Outstanding Receiver
        </p>
      </div>

      {/* Customer search card */}
      <div className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-xs relative">
        <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
          কাস্টমার সার্চ করুন (Search Customer)
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="কাস্টমারের নাম, ফোন বা ঠিকানা লিখে চাপুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Autocomplete Dropdown */}
        {filteredCustomers.length > 0 && (
          <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-slate-100">
            {filteredCustomers.map(c => {
              // Calculate dynamic total balance
              const custLedger = calculateLedger(c.id, "customer", transactions, suppliers, products, 0);
              return (
                <button
                  key={c.id}
                  onClick={() => handleSelectCustomer(c.id)}
                  className="w-full text-left px-5 py-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <p className="font-bold text-sm text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-400 font-semibold">{c.phone || "কোনো নম্বর নেই"} • {c.address || "ঠিকানা নেই"}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${custLedger.totalDue > 0 ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
                      ৳ {custLedger.totalDue.toLocaleString()}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Customer Panel */}
      {selectedCustomer && ledgerData ? (
        <div className="space-y-6">
          {/* Customer Summary Card */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-10 translate-x-1/4 translate-y-1/4">
              <User className="w-64 h-64" />
            </div>
            
            <div className="flex justify-between items-start">
              <div className="space-y-1.5 z-10">
                <span className="bg-white/10 text-indigo-200 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                  সিলেক্টেড কাস্টমার
                </span>
                <h3 className="text-xl font-black">{selectedCustomer.name}</h3>
                <p className="text-xs text-indigo-200 font-semibold">{selectedCustomer.phone} | {selectedCustomer.address}</p>
              </div>
              <button 
                onClick={() => setSelectedCustomerId(null)}
                className="p-1.5 bg-white/10 hover:bg-white/25 rounded-full transition-colors"
                title="পরিবর্তন করুন"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="mt-6 pt-5 border-t border-white/10 flex justify-between items-end z-10 relative">
              <div>
                <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">মোট বকেয়া পরিমাণ</p>
                <p className="text-3xl font-black mt-1 font-mono">৳ {ledgerData.totalDue.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Collection Metadata Config */}
          <div className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" /> কালেকশন তারিখ
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
              />
            </div>

            {/* Account to deposit */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Landmark className="w-3.5 h-3.5 text-indigo-600" /> অ্যাকাউন্ট (Deposit To)
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (৳ {acc.balance?.toLocaleString() || 0})
                  </option>
                ))}
              </select>
            </div>

            {/* Method */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-indigo-600" /> পেমেন্ট পদ্ধতি
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
              >
                <option value="Cash">Cash (নগদ)</option>
                <option value="bKash">bKash (বিকাশ)</option>
                <option value="Nagad">Nagad (নগদ অ্যাপ)</option>
                <option value="Bank">Bank (ব্যাংক ট্র্যান্সফার)</option>
              </select>
            </div>
          </div>

          {/* Supplier Breakdown Table Card */}
          <div className="bg-white rounded-3xl border border-slate-200/60 overflow-hidden shadow-xs">
            <div className="bg-slate-50/50 px-5 py-4 border-b border-slate-200/60">
              <h4 className="font-extrabold text-sm text-slate-800">কোম্পানিভিত্তিক বকেয়া ও কালেকশন ইনপুট</h4>
            </div>

            <div className="divide-y divide-slate-150">
              {ledgerData.supplierBreakdown.map((breakdown) => (
                <div 
                  key={breakdown.supplierId}
                  className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/30 transition-colors"
                >
                  <div className="space-y-1 flex-1">
                    <p className="font-bold text-sm text-slate-800">{breakdown.supplierName}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded">বকেয়া</span>
                      <span className="text-xs font-mono font-bold text-slate-900">৳ {breakdown.due.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-slate-400 font-bold">আদায়:</span>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-bold font-mono">৳</span>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={paymentAmounts[breakdown.supplierId] || ""}
                        onChange={(e) => handleAmountChange(breakdown.supplierId, e.target.value)}
                        className="pl-7 pr-3 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl text-sm font-black text-indigo-700 w-36 placeholder-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-right font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {ledgerData.supplierBreakdown.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs font-bold">
                  এই গ্রাহকের কোনো সাপ্লায়ারভিত্তিক বকেয়া অবশিষ্ট নেই।
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => {
                setSelectedCustomerId(null);
                setPaymentAmounts({});
              }}
              className="w-full sm:w-auto px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 select-none active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> রিসেট / অন্য কাস্টমার
            </button>

            <button
              onClick={handleSaveCollection}
              disabled={isSubmitting || !hasEnteredAmounts}
              className="w-full flex-1 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 select-none active:scale-95 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> কালেকশন সংরক্ষণ হচ্ছে...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> কালেকশন নিশ্চিত ও সংরক্ষণ করুন (Save Collection)
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Empty selection help state */
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
            <User className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-sm text-slate-700">কোনো গ্রাহক সিলেক্ট করা হয়নি</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              উপরের সার্চ বক্সে গ্রাহকের নাম বা মোবাইল নম্বর টাইপ করে এন্টার চাপুন বা সিলেক্ট করুন।
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
