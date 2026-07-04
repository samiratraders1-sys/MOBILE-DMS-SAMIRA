import React, { useState, useMemo } from "react";
import { 
  Plus, 
  Wallet, 
  ArrowRightLeft, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Trash2, 
  Printer, 
  Building, 
  Smartphone, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";
import { formatCurrency } from "../lib/utils";
import { toFloat } from "../lib/math";
import toast from "react-hot-toast";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import VoiceNoteRecorder from "./VoiceNoteRecorder";

const CHART_COLORS = ["#4F46E5", "#06B6D4", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6"];
const TYPE_COLORS: Record<string, string> = {
  "Cash": "#F59E0B",           // Amber
  "Bank": "#3B82F6",           // Blue
  "Mobile Banking": "#10B981"  // Emerald
};

interface FinanceProps {
  summaries: any[];
  staff: any[];
  suppliers: any[];
  payments: any[]; 
  transfers: any[];
  purchases: any[];
  categories: any[];
  addPayment: (p: any) => Promise<void>;
  removePayment: (id: string) => Promise<void>;
  addTransfer: (t: any) => Promise<void>;
  updateTransfer: (id: string, t: any) => Promise<void>;
  role?: string;
  user?: any;
  addExpense?: (e: any) => Promise<void>;
  
  // Dynamic accounts collection
  accounts: any[];
  addAccount: (a: any) => Promise<void>;
  updateAccount: (id: string, a: any) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  incomeCategories?: any[];
}

export default function FinanceView({ 
  summaries, 
  staff, 
  suppliers, 
  payments, 
  transfers, 
  purchases, 
  categories, 
  addPayment, 
  removePayment, 
  addTransfer, 
  updateTransfer, 
  role, 
  user,
  accounts,
  addAccount,
  updateAccount,
  removeAccount,
  addExpense,
  incomeCategories = []
}: FinanceProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showBulkPayment, setShowBulkPayment] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [incomeDescription, setIncomeDescription] = useState("");
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);
  const [isSubmittingTransaction, setIsSubmittingTransaction] = useState(false);
  const [isInitializingDefaults, setIsInitializingDefaults] = useState(false);
  
  // Auto deduplicate duplicate accounts by name (case-insensitive & trimmed)
  React.useEffect(() => {
    if (!accounts || accounts.length === 0) return;

    const seenNames = new Set<string>();
    const idsToDelete: string[] = [];

    // Sort accounts to ensure we keep the oldest one
    const sorted = [...accounts].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aTime - bTime;
    });

    sorted.forEach((acc) => {
      const nameKey = (acc.name || "").trim().toLowerCase();
      // If we've already seen this account name, we mark it to be deleted
      if (seenNames.has(nameKey)) {
        idsToDelete.push(acc.id);
      } else {
        seenNames.add(nameKey);
      }
    });

    if (idsToDelete.length > 0) {
      const deletePromises = idsToDelete.map(id => removeAccount(id));
      Promise.all(deletePromises)
        .then(() => {
          toast.success("অপ্রয়োজনীয় ডুপ্লিকেট অ্যাকাউন্টগুলো সফলভাবে রিমুভ করা হয়েছে!");
        })
        .catch(err => {
          console.error("Failed auto-deduping accounts:", err);
        });
    }
  }, [accounts, removeAccount]);

  const [bulkSupplierId, setBulkSupplierId] = useState("");
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"all" | "in" | "out" | "transfer" | "accounts" | "others-income">("accounts");

  const supplierPurchases = useMemo(() => {
    return purchases.filter(p => p.supplierId === bulkSupplierId);
  }, [purchases, bulkSupplierId]);

  const totalBulkAmount = useMemo(() => {
    return supplierPurchases.filter(p => selectedInvoices.has(p.id))
      .reduce((acc, p) => acc + Number(p.total || 0), 0);
  }, [supplierPurchases, selectedInvoices]);

  // Dynamic cash in hand calculation
  const cashInHand = useMemo(() => {
    // 1. All cash from settled summaries
    const collection = summaries.filter(s => s.status === 'settled').reduce((acc, s) => {
      const pmts = (s.payments || []).reduce((sum: number, p: any) => sum + toFloat(p.amount || 0), 0);
      return acc + pmts;
    }, 0);

    // 2. Custom payment entries
    const customIn = payments.filter(p => p.type === 'in').reduce((acc, p) => acc + toFloat(p.amount || 0), 0);
    const customOut = payments.filter(p => p.type === 'out' || p.type === 'transfer').reduce((acc, p) => acc + toFloat(p.amount || 0), 0);

    return collection + customIn - customOut;
  }, [summaries, payments]);

  // Detailed Ledger / Balance calculation per account with name-based deduplication
  const calculatedAccounts = useMemo(() => {
    // Keep first unique account name to eliminate any duplicates reactively
    const seenNames = new Set<string>();
    const uniqueRawAccounts = (accounts || []).filter(acc => {
      const nameKey = (acc.name || "").trim().toLowerCase();
      if (seenNames.has(nameKey)) {
        return false;
      }
      seenNames.add(nameKey);
      return true;
    });

    return uniqueRawAccounts.map(acc => {
      // Calculate dynamic transactions
      const inPayments = payments
        .filter(p => p.accountId === acc.id && p.type === "in")
        .reduce((sum, p) => sum + toFloat(p.amount || 0), 0);

      const outPayments = payments
        .filter(p => p.accountId === acc.id && (p.type === "out" || p.category === "Supplier Payment"))
        .reduce((sum, p) => sum + toFloat(p.amount || 0), 0);

      const transfersIn = transfers
        .filter(t => t.toAccountId === acc.id)
        .reduce((sum, t) => sum + toFloat(t.amount || 0), 0);

      const transfersOut = transfers
        .filter(t => t.fromAccountId === acc.id)
        .reduce((sum, t) => sum + toFloat(t.amount || 0), 0);

      // Settle operations (add money to manager's cash box by default or target account)
      let settlementsIn = 0;
      if (acc.name && (acc.name.includes("ম্যানেজার") || acc.type === "Cash")) {
        settlementsIn = summaries
          .filter(s => s.status === 'settled')
          .reduce((sum, s) => {
            const sumPaid = (s.payments || []).reduce((val: number, p: any) => val + toFloat(p.amount || 0), 0);
            return sum + sumPaid;
          }, 0);
      }

      const balance = toFloat(acc.openingBalance || 0) + inPayments + transfersIn + settlementsIn - outPayments - transfersOut;

      return {
        ...acc,
        balance
      };
    });
  }, [accounts, payments, transfers, summaries]);

  // Data for visual account-wise balance distribution pie chart
  const pieChartData = useMemo(() => {
    return calculatedAccounts.map(acc => ({
      name: acc.name,
      value: Math.max(0, acc.balance) // Ensure no negative values crash the pie chart
    })).filter(item => item.value > 0);
  }, [calculatedAccounts]);

  // Data for visual account type balance distribution (Cash vs Bank vs Mobile Banking)
  const typeChartData = useMemo(() => {
    const grouped: Record<string, number> = {};
    calculatedAccounts.forEach(acc => {
      const type = acc.type || "Cash";
      const bal = Math.max(0, acc.balance);
      grouped[type] = (grouped[type] || 0) + bal;
    });

    return Object.entries(grouped).map(([name, value]) => ({
      name,
      value
    })).filter(item => item.value > 0);
  }, [calculatedAccounts]);

  // Core add functions
  const handleAddPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmittingTransaction) return;

    const formData = new FormData(e.currentTarget);
    const isManager = role === "manager";
    const amount = Number(formData.get("amount"));
    const accountId = formData.get("accountId") as string;

    const data = {
      date: new Date().toISOString().split('T')[0],
      type: formData.get("type") as string,
      amount,
      description: formData.get("description") as string,
      category: formData.get("category") as string,
      entityId: formData.get("entityId") as string || "",
      method: formData.get("method") as string,
      accountId: accountId,
      createdBy: user?.email || "",
      approved: !isManager,
      status: isManager ? "pending_approval" : "approved",
      voiceNote: voiceNote || null
    };

    try {
      setIsSubmittingTransaction(true);
      await addPayment(data);

      // Route general expense data to shared expenses collection
      if (addExpense && data.type === "out" && data.category !== "Supplier Payment" && data.category !== "সাপ্লায়ার পেমেন্ট") {
        let expenseSource: "DSR" | "Manager" | "Office" | "Salary" = "Manager";
        const cat = (data.category || "").toLowerCase();
        if (cat.includes("salary") || cat.includes("বেতন") || cat.includes("পারিশ্রমিক")) {
          expenseSource = "Salary";
        } else if (cat.includes("office") || cat.includes("অফিস") || cat.includes("বাজার") || cat.includes("ভাড়া") || cat.includes("rent")) {
          expenseSource = "Office";
        } else if (cat.includes("dsr") || cat.includes("ডেলিভারি") || cat.includes("রুট")) {
          expenseSource = "DSR";
        }

        await addExpense({
          date: data.date,
          amount: data.amount,
          source: expenseSource,
          category: data.category,
          description: data.description || "Finance Expense Entry",
          refId: "",
          approved: data.approved
        });
      }

      setShowAdd(false);
      setVoiceNote(null);
      toast.success(isManager ? "পেমেন্ট সফলভাবে এন্ট্রি হয়েছে এবং অনুমোদনের জন্য দিনশেষে রিপোর্টে পাঠানো হয়েছে!" : "পেমেন্ট সফলভাবে এন্ট্রি হয়েছে!");
    } catch (err: any) {
      toast.error("ভুল হয়েছে: " + err.message);
    } finally {
      setIsSubmittingTransaction(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmittingAccount) return;

    const formData = new FormData(e.currentTarget);
    const openingBal = Number(formData.get("openingBalance") || 0);
    const name = (formData.get("name") as string || "").trim();
    const accountNo = (formData.get("accountNo") as string || "").trim();

    if (!name) {
      toast.error("অ্যাকাউন্টের নাম দেওয়া আবশ্যক!");
      return;
    }

    const isDuplicateName = accounts.some(
      a => a.name && a.name.trim().toLowerCase() === name.toLowerCase()
    );
    const isDuplicateNo = accountNo && accounts.some(
      a => a.accountNo && a.accountNo.trim().toLowerCase() === accountNo.toLowerCase()
    );

    if (isDuplicateName) {
      toast.error(`"${name}" নামে ইতিমধ্যে একটি অ্যাকাউন্ট রয়েছে!`);
      return;
    }
    if (isDuplicateNo) {
      toast.error(`"${accountNo}" হিসাব নম্বরে ইতিমধ্যে একটি অ্যাকাউন্ট রয়েছে!`);
      return;
    }

    try {
      setIsSubmittingAccount(true);
      const data = {
        name,
        type: formData.get("type") as string,
        accountNo,
        openingBalance: openingBal,
        currentBalance: openingBal,
        remarks: formData.get("remarks") as string || "",
        createdAt: new Date().toISOString()
      };

      await addAccount(data);
      setShowAddAccount(false);
      toast.success("অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!");
    } catch (e: any) {
      toast.error("ভুল হয়েছে: " + e.message);
    } finally {
      setIsSubmittingAccount(false);
    }
  };

  const handleAddTransfer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmittingTransaction) return;

    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get("amount"));
    const fromId = formData.get("fromAccountId") as string;
    const toId = formData.get("toAccountId") as string;

    if (fromId === toId) {
      toast.error("একই অ্যাকাউন্টে ফান্ড স্থানান্তর করা যাবে না!");
      return;
    }

    const fromAcc = calculatedAccounts.find(a => a.id === fromId);
    if (fromAcc && fromAcc.balance < amount) {
      toast.error(`পর্যাপ্ত ব্যালেন্স নেই! ${fromAcc.name} এর বর্তমান ব্যালেন্স: ${formatCurrency(fromAcc.balance)}`);
      return;
    }

    const data = {
      date: new Date().toISOString().split('T')[0],
      amount,
      fromAccountId: fromId,
      toAccountId: toId,
      description: formData.get("description") as string || "ফান্ড ট্রান্সফার",
      createdBy: user?.email || ""
    };

    try {
      setIsSubmittingTransaction(true);
      await addTransfer(data);
      setShowTransferModal(false);
      toast.success("ফান্ড সফলভাবে স্থানান্তর করা হয়েছে!");
    } catch (err: any) {
      toast.error("ভুল হয়েছে: " + err.message);
    } finally {
      setIsSubmittingTransaction(false);
    }
  };

  // Automated/bulk initialization of accounts for high usability without duplication
  const handleInitDefaultAccounts = async () => {
    if (isInitializingDefaults) return;
    try {
      setIsInitializingDefaults(true);
      const existingNames = accounts.map(a => (a.name || "").trim().toLowerCase());
      
      const defaults = [
        {
          name: "ম্যানেজার ক্যাশ বক্স (Manager Cash)",
          type: "Cash",
          accountNo: "ক্যাশ হ্যান্ডেল",
          openingBalance: 0,
          remarks: "ম্যানেজারের মাঠ থেকে সংগৃহীত টাকা এই জমা খাতা একাউন্টে জমা হয়"
        },
        {
          name: "অ্যাডমিন মেইন ক্যাশ (Admin Cash Box)",
          type: "Cash",
          accountNo: "অ্যাডমিন ক্যাশ",
          openingBalance: 25000,
          remarks: "অ্যাডমিনের নগদ ক্যাশ জমা"
        },
        {
          name: "ডাচ-বাংলা ব্যাংক (DBBL A/C 453)",
          type: "Bank",
          accountNo: "125.120.45689",
          openingBalance: 150000,
          remarks: "ট্রেডার্স মূল ব্যাংক হিসাব"
        },
        {
          name: "বিকাশ মার্চেন্ট অ্যাকাউন্ট",
          type: "Mobile Banking",
          accountNo: "01712345678",
          openingBalance: 50000,
          remarks: "বিকাশ পেমেন্ট রিসিভার"
        }
      ];

      let addedCount = 0;
      for (const item of defaults) {
        if (!existingNames.includes(item.name.toLowerCase())) {
          await addAccount(item);
          addedCount++;
        }
      }

      if (addedCount > 0) {
        toast.success(`${addedCount}টি নতুন ডিফল্ট হিসাব সফলভাবে সেট-আপ করা হয়েছে!`);
      } else {
        toast.error("সবগুলো ডিফল্ট হিসাব ইতিমধ্যেই সিস্টেমে বিদ্যমান আছে!");
      }
    } catch (e: any) {
      toast.error("সেট-আপ ব্যর্থ: " + e.message);
    } finally {
      setIsInitializingDefaults(false);
    }
  };

  // Add custom others income with dedicated form
  const handleAddOthersIncome = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmittingTransaction) return;

    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get("amount"));
    const accountId = formData.get("accountId") as string;

    const data = {
      date: new Date().toISOString().split('T')[0],
      type: "in",
      amount,
      description: incomeDescription || (formData.get("description") as string),
      category: "Others Income", // Always marked Others Income
      method: formData.get("method") as string,
      accountId: accountId,
      createdBy: user?.email || "",
      approved: role !== "manager",
      status: role === "manager" ? "pending_approval" : "approved"
    };

    try {
      setIsSubmittingTransaction(true);
      await addPayment(data);
      setShowAddIncome(false);
      setIncomeDescription("");
      toast.success(role === "manager" ? "আদার্স ইনকাম সফলভাবে দিনশেষে অনুমোদনের জন্য পাঠানো হয়েছে!" : "আদার্স ইনকাম সফলভাবে জমা করা হয়েছে!");
    } catch (err: any) {
      toast.error("ভুল হয়েছে: " + err.message);
    } finally {
      setIsSubmittingTransaction(false);
    }
  };

  // Filter payments
  const filteredPayments = payments.filter(p => {
    if (activeTab === 'all') return true;
    if (activeTab === 'others-income') return p.type === 'in' && p.category === 'Others Income';
    return p.type === activeTab;
  });

  return (
    <div className="space-y-6">
      
      {/* Header and Cash Summary Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h2 className="text-2xl font-black flex items-center gap-2 tracking-tight text-gray-900">
             <Wallet className="w-6 h-6 text-green-600" /> ফিন্যান্স ও পেমেন্ট (Finance)
           </h2>
           <p className="text-[#6C757D] font-medium text-xs mt-1">সব হিসাব একাউন্ট, ক্যাশ ব্যালেন্স, ট্রান্সফার ও আদার্স ইনকাম ড্যাশবোর্ড</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
            <div className="bg-white px-5 py-3 rounded-2xl border border-green-100 flex flex-col items-end shadow-sm">
               <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">মোট ক্যাশ ইন হ্যান্ড</span>
               <span className="text-xl font-black text-green-600">{formatCurrency(cashInHand)}</span>
            </div>
            {role === 'admin' && (
              <button 
                onClick={handleInitDefaultAccounts} 
                disabled={isInitializingDefaults}
                className="px-4 py-2.5 bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-xl text-xs font-bold hover:bg-yellow-200 disabled:opacity-50 transition-all cursor-pointer"
              >
                 {isInitializingDefaults ? "🔄 সেট-আপ হচ্ছে..." : "⚙️ ডিফল্ট হিসাব সেটিংস"}
              </button>
            )}
            <button onClick={() => setShowTransferModal(true)} className="px-4 py-2.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-purple-100 transition-all cursor-pointer">
               <ArrowRightLeft className="w-4 h-4" /> ফাণ্ড ট্রান্সফার
            </button>
            <button onClick={() => { setIncomeDescription(""); setShowAddIncome(true); }} className="px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-100 transition-all cursor-pointer">
               <Plus className="w-4 h-4" /> আদার্স ইনকাম যোগ
            </button>
            <button onClick={() => setShowAddAccount(true)} className="px-4 py-2.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-indigo-100 transition-all cursor-pointer">
               <Plus className="w-4 h-4" /> নতুন অ্যাকাউন্ট
            </button>
            <button onClick={() => setShowAdd(true)} className="px-4 py-2.5 bg-black text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 hover:bg-gray-900 transition-all cursor-pointer">
               <Plus className="w-4 h-4" /> পেমেন্ট এন্ট্রি
            </button>
        </div>
      </div>

      {/* Primary Sub Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-gray-100 w-fit rounded-2xl mb-4 shadow-inner">
         {([
           { id: "accounts", label: "একাউন্টস ও ব্যালেন্স" },
           { id: "others-income", label: "আদার্স ইনকাম (Others Income)" },
           { id: "all", label: "সকল লেনদেন তালিকা" },
           { id: "in", label: "জমা এন্ট্রি সমূহ" },
           { id: "out", label: "খরচ/পেমেন্ট সমূহ" }
         ] as const).map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === tab.id ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'}`}
            >
              {tab.label}
            </button>
         ))}
      </div>

      {/* Dynamic Tab Body Render */}
      
      {/* 1. Accounts tab */}
      {activeTab === "accounts" && (
        <div className="space-y-6">
          {/* Visual Analytics / Pie Chart Section */}
          {calculatedAccounts.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Chart 1: Account-wise distribution */}
              <div className="bg-white p-6 rounded-3xl border border-[#E9ECEF] shadow-xs flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-600"></div>
                  <h3 className="text-sm font-black text-slate-800">🏦 অ্যাকাউন্ট ভিত্তিক ব্যালেন্স বন্টন (Account Balance Distribution)</h3>
                </div>
                <p className="text-gray-400 text-[11px] font-semibold mb-4 ml-4.5">প্রতিটি ক্যাশ খাতা ও ব্যাংক হিসাবের অণুপাত</p>
                
                {pieChartData.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-xs py-16">
                    <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
                    সবগুলো অ্যাকাউন্টের ব্যালেন্স নিষ্ক্রিয় বা শূন্য।
                  </div>
                ) : (
                  <div className="h-[280px] w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="43%"
                          innerRadius={65}
                          outerRadius={88}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any) => [formatCurrency(Number(value)), 'মোট স্থিতি']}
                          contentStyle={{ borderRadius: '14px', border: '1px solid #E9ECEF', fontSize: '11px', fontWeight: 'bold', boxShadow: 'none' }}
                        />
                        <Legend 
                          verticalAlign="bottom" 
                          height={45}
                          iconSize={8}
                          iconType="circle"
                          wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }}
                          formatter={(value) => (
                            <span className="text-[11px] font-bold text-gray-650">{value}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Chart 2: Account Type distribution (Cash vs Bank vs Mobile Banking) */}
              <div className="bg-white p-6 rounded-3xl border border-[#E9ECEF] shadow-xs flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                  <h3 className="text-sm font-black text-slate-800">📊 ক্যাটাগরি ভিত্তিক বন্টন (Cash vs Bank vs Mobile Banking)</h3>
                </div>
                <p className="text-gray-400 text-[11px] font-semibold mb-4 ml-4.5">নগদ ক্যাশ ফান্ড বনাম ব্যাংক ও মোবাইল ওয়ালেট অনুপাত</p>
                
                {typeChartData.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-xs py-16">
                    <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
                    সবগুলো হিসাবের ব্যালেন্স নিষ্ক্রিয় বা শূন্য।
                  </div>
                ) : (
                  <div className="h-[280px] w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={typeChartData}
                          cx="50%"
                          cy="43%"
                          innerRadius={0}
                          outerRadius={88}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {typeChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={TYPE_COLORS[entry.name] || '#6c757d'} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any) => [formatCurrency(Number(value)), 'মোট স্থিতি']}
                          contentStyle={{ borderRadius: '14px', border: '1px solid #E9ECEF', fontSize: '11px', fontWeight: 'bold', boxShadow: 'none' }}
                        />
                        <Legend 
                          verticalAlign="bottom" 
                          height={45}
                          iconSize={8}
                          iconType="circle"
                          wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }}
                          formatter={(value) => (
                            <span className="text-[11px] font-bold text-gray-650">
                              {value === 'Cash' ? 'নগদ ক্যাশ (Cash)' : value === 'Bank' ? 'ব্যাংক হিসাব (Bank)' : 'মোবাইল ব্যাংকিং (Mobile)'}
                            </span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {calculatedAccounts.map(acc => (
              <div key={acc.id} className="bg-white p-6 rounded-3xl border border-[#E9ECEF] hover:shadow-lg transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-2xl ${acc.type === 'Cash' ? 'bg-amber-50 text-amber-600' : acc.type === 'Bank' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                      {acc.type === 'Cash' ? <Wallet className="w-6 h-6" /> : acc.type === 'Bank' ? <Building className="w-6 h-6" /> : <Smartphone className="w-6 h-6" />}
                    </div>
                    {role === 'admin' && (
                      <button onClick={() => removeAccount(acc.id)} title="মুছে ফেলুন" className="p-1 text-red-200 hover:text-red-500 cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <h4 className="font-extrabold text-gray-900 text-[15px]">{acc.name}</h4>
                  <p className="text-[11px] font-mono text-gray-400 mt-1">হিসাব নম্বর: {acc.accountNo || "N/A"}</p>
                  <p className="text-[11px] text-gray-400 mt-1 lines-clamp-2">{acc.remarks}</p>
                </div>
                <div className="border-t pt-4 mt-6 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">কারেন্ট ব্যালেন্স</span>
                  <span className="text-lg font-black text-gray-900">{formatCurrency(acc.balance)}</span>
                </div>
              </div>
            ))}
            {calculatedAccounts.length === 0 && (
              <div className="col-span-full py-16 text-center bg-white border border-dashed rounded-3xl text-gray-300">
                <AlertCircle className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                <p className="text-sm font-bold">কোনো হিসাব অ্যাকাউন্ট পাওয়া যায়নি।</p>
                <p className="text-xs text-gray-400 mt-1">পেমেন্ট করার জন্য শুরুতেই ওপরে 'ডিফল্ট হিসাব সেটিংস' কিংবা 'নতুন অ্যাকাউন্ট' বাটনে ক্লিক করুন।</p>
              </div>
            )}
          </div>
          
          {/* Manager Collected Money Instructions */}
          <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 flex gap-4 items-start max-w-4xl">
            <CheckCircle2 className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-blue-900 leading-snug">কিভাবে ম্যানেজার মাঠের টাকা স্থানান্তর ও জমা করবে?</h4>
              <p className="text-xs text-blue-700 leading-relaxed mt-1.5">
                ১. বিকাল ডিএসআর লোডসামারি সেটেলমেন্ট সম্পন্নের সাথে সাথে তা স্বয়ংক্রিয়ভাবে <b>"ম্যানেজার ক্যাশ বক্স (Manager Cash Box)"</b> হিসাব একাউন্টে ক্যাশ পরিমাণ যোগ করবে।<br />
                ২. ম্যানেজার যখন অ্যাডমিনকে সংগৃহীত নগদ বুঝিয়ে দিবেন, তখন ওপরের <b>"ফান্ড ট্রান্সফার"</b> বাটনে ক্লিক করুন।<br />
                ৩. উৎস অ্যাকাউন্ট <b>"ম্যানেজার ক্যাশ বক্স"</b> এবং গন্তব্য অ্যাকাউন্ট <b>"অ্যাডমিন মেইন ক্যাশ"</b> বা ব্যাংক হিসাব সিলেক্ট করে ট্রান্সফার সম্পাদন করুন। এর ফলে ড্যাশবোর্ড রিপোর্ট সম্পূর্ণ রিয়েল-টাইমে আপডেট থাকবে!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. All, in, out and Others Income lists */}
      {activeTab !== "accounts" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPayments.map(p => {
            const accName = calculatedAccounts.find(a => a.id === p.accountId)?.name || "N/A";
            return (
              <div key={p.id} className="bg-white p-6 rounded-3xl border border-[#E9ECEF] hover:shadow-lg transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                     <div className={`p-3 rounded-2xl ${p.type === 'in' ? 'bg-green-50 text-green-600' : p.type === 'out' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                        {p.type === 'in' ? <TrendingUp className="w-6 h-6" /> : p.type === 'out' ? <TrendingDown className="w-6 h-6" /> : <ArrowRightLeft className="w-6 h-6" />}
                     </div>
                     <div className="text-right">
                        <p className="text-xs text-gray-400 font-mono">{p.date}</p>
                        {role === 'admin' && (
                          <button onClick={() => removePayment(p.id)} title="মুছে দিন" className="mt-1 cursor-pointer">
                            <Trash2 className="w-3 h-3 text-red-200 hover:text-red-500" />
                          </button>
                        )}
                     </div>
                  </div>
                  <div className="mb-4">
                     <h4 className="font-extrabold text-gray-900 text-[15px]">{p.description}</h4>
                     <p className="text-xs text-indigo-650 font-bold mt-1">খাত: {p.category}</p>
                     <p className="text-[11px] text-gray-500 font-semibold mt-1">হিসাব: {accName} | মাধ্যম: {p.method}</p>
                     {p.voiceNote && (
                       <div className="mt-3">
                         <VoiceNoteRecorder existingAudio={p.voiceNote} readOnly={true} />
                       </div>
                     )}
                  </div>
                </div>
                <div className="flex justify-between items-center border-t pt-4 mt-4">
                   <span className="text-[10px] font-bold uppercase text-gray-400">টাকার পরিমাণ</span>
                   <span className={`text-lg font-black ${p.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                     {p.type === 'in' ? '+' : '-'}{formatCurrency(p.amount)}
                   </span>
                </div>
              </div>
            );
          })}
          {filteredPayments.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white border border-dashed rounded-3xl text-gray-300">
               কোনো উপযুক্ত লেনদেন পাওয়া যায়নি
            </div>
          )}
        </div>
      )}

      {/* 3. Modal Forms */}

      {/* NEW ACCOUNT MODAL */}
      {showAddAccount && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white max-w-md w-full rounded-3xl p-8 shadow-2xl relative">
              <h3 className="text-xl font-black mb-5 text-gray-900">নতুন ব্যাংক/ক্যাশ হিসাব অ্যাকাউন্ট</h3>
              <form onSubmit={handleCreateAccount} className="space-y-4">
                 <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">অ্যাকাউন্টের নাম (Account Name)</label>
                    <input name="name" required className="w-full p-3 border rounded-xl text-sm" placeholder="যেমন: রূপালী ব্যাংক লিমিটেড" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">ধরণ (Type)</label>
                      <select name="type" className="w-full p-3 border rounded-xl text-sm bg-white">
                         <option>Cash</option>
                         <option>Bank</option>
                         <option>Mobile Banking</option>
                      </select>
                   </div>
                   <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">হিসাব/টোকেন নং</label>
                      <input name="accountNo" className="w-full p-3 border rounded-xl text-sm" placeholder="যেমন: 4520-21" />
                   </div>
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">প্রারম্ভিক ব্যালেন্স (Opening Balance)</label>
                    <input name="openingBalance" type="number" defaultValue="0" className="w-full p-3 border rounded-xl text-sm" placeholder="0.00" />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">ক্ষুদ্র বিবরণ / মন্তব্য</label>
                    <input name="remarks" className="w-full p-3 border rounded-xl text-sm" placeholder="যেমন: অফিসিয়াল মেইন অ্যাকাউন্ট" />
                 </div>
                 <div className="flex gap-4 pt-4 border-t mt-6">
                    <button type="button" onClick={() => setShowAddAccount(false)} className="flex-1 border py-3.5 rounded-2xl text-xs font-bold cursor-pointer">বাতিল</button>
                    <button type="submit" disabled={isSubmittingAccount} className={`flex-1 ${isSubmittingAccount ? 'bg-gray-400 cursor-not-allowed' : 'bg-black'} text-white py-3.5 rounded-2xl text-xs font-bold cursor-pointer`}>{isSubmittingAccount ? "তৈরি হচ্ছে..." : "অ্যাকাউন্ট তৈরি করুন"}</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* OTHERS INCOME MODAL */}
      {showAddIncome && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white max-w-md w-full rounded-3xl p-8 shadow-2xl relative">
              <h3 className="text-xl font-black mb-5 text-emerald-850">নতুন আদার্স ইনকাম জমা এন্ট্রি</h3>
              <form onSubmit={handleAddOthersIncome} className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">আয়ের পরিমাণ (টাকা)*</label>
                      <input name="amount" type="number" required className="w-full p-3 border rounded-xl text-sm font-bold" placeholder="0.00" />
                   </div>
                   <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">জমার মাধ্যম</label>
                      <select name="method" className="w-full p-3 border rounded-xl text-sm bg-white">
                         <option>Cash</option>
                         <option>bKash</option>
                         <option>Nagad</option>
                         <option>Bank Transfer</option>
                      </select>
                   </div>
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">জমার অ্যাকাউন্ট (Deposit to Account)*</label>
                    <select name="accountId" required className="w-full p-3 border rounded-xl text-sm bg-white font-bold">
                       {calculatedAccounts.map(a => (
                         <option key={a.id} value={a.id}>{a.name} (বাল: {formatCurrency(a.balance)})</option>
                       ))}
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">আয়ের বিবরণ (উৎস/পারপাস)*</label>
                    <input 
                      name="description" 
                      required 
                      className="w-full p-3 border rounded-xl text-sm" 
                      placeholder="উদা: ডিলার কমিশন, খালি কার্টুন বিক্রয়" 
                      value={incomeDescription}
                      onChange={e => setIncomeDescription(e.target.value)}
                    />
                    <div className="mt-2 text-left">
                       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">আয়ের উৎস সমূহ (ক্লিক করলে বসে যাবে):</span>
                       <div className="flex flex-wrap gap-1.5">
                         {(incomeCategories && incomeCategories.length > 0 
                           ? incomeCategories.map(c => c.name) 
                           : [
                               "ডিলার কমিশন",
                               "খালি কার্টুন বিক্রয়",
                               "খালি ক্যারেট/বস্তা বিক্রয়",
                               "কোম্পানি ইনসেন্টিভ",
                               "ড্যামেজ সমন্বয় রিফান্ড",
                               "অতিরিক্ত ক্যাশ সমন্বয়",
                               "ব্যাংক মুনাফা / লভ্যাংশ",
                               "অন্যান্য সাধারণ আয়"
                             ]
                         ).map(src => (
                           <button
                             type="button"
                             key={src}
                             onClick={() => setIncomeDescription(src)}
                             className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                               incomeDescription === src
                                 ? "bg-emerald-600 text-white border-emerald-650 shadow-sm"
                                 : "bg-gray-50 text-gray-650 hover:bg-gray-100 hover:text-gray-950 border-gray-200"
                             }`}
                           >
                             ⚡ {src}
                           </button>
                         ))}
                       </div>
                    </div>
                 </div>
                 <div className="flex gap-4 pt-4 border-t mt-6">
                    <button type="button" onClick={() => setShowAddIncome(false)} className="flex-1 border py-3.5 rounded-2xl text-xs font-bold cursor-pointer">বাতিল</button>
                    <button type="submit" className="flex-1 bg-green-650 text-white py-3.5 rounded-2xl text-xs font-bold cursor-pointer bg-green-650">ইনকাম সেভ করুন</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* GENERAL PAYMENT ENTRY MODAL */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white max-w-lg w-full rounded-3xl p-8 shadow-2xl relative">
              <h3 className="text-xl font-black mb-5 text-gray-900">নতুন ফিন্যান্স পেমেন্ট/খরচ এন্ট্রি</h3>
              <form onSubmit={handleAddPayment} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="col-span-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">লেনদেনের ধরণ (Type)</label>
                        <div className="grid grid-cols-2 gap-2">
                           {['in', 'out'].map(t => (
                              <label key={t} className="cursor-pointer">
                                 <input type="radio" name="type" value={t} className="peer hidden" defaultChecked={t === 'out'} />
                                 <div className="p-3 border rounded-xl text-center text-xs font-extrabold peer-checked:bg-black peer-checked:text-white transition-all">
                                    {t === 'in' ? 'জমা (Incoming)' : 'খরচ (Outgoing)'}
                                 </div>
                              </label>
                           ))}
                        </div>
                     </div>
                     <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">পরিমাণ (Amount)*</label>
                        <input name="amount" type="number" required className="w-full p-3 border rounded-xl text-sm font-bold" placeholder="0.00" />
                     </div>
                     <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">মাধ্যম (Method)</label>
                        <select name="method" className="w-full p-3 border rounded-xl text-sm bg-white">
                           <option>Cash</option>
                           <option>bKash</option>
                           <option>Nagad</option>
                           <option>Bank</option>
                        </select>
                     </div>
                     <div className="col-span-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">সংশ্লিষ্ট অ্যাকাউন্ট (Account)*</label>
                        <select name="accountId" required className="w-full p-3 border rounded-xl text-sm bg-white">
                           {calculatedAccounts.map(a => (
                             <option key={a.id} value={a.id}>{a.name}</option>
                           ))}
                        </select>
                     </div>
                     <div className="col-span-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">বিবরণ / ব্যাখ্যা (Description)*</label>
                        <input name="description" required className="w-full p-3 border rounded-xl text-sm" placeholder="উদা: সাপ্লায়ার মেসার্স প্রাণ পেমেন্ট" />
                     </div>
                     <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">খাত / ক্যাটাগরি</label>
                        <select name="category" className="w-full p-3 border rounded-xl text-sm bg-white">
                           <option>Supplier Payment</option>
                           <option>Salary</option>
                           <option>Rent</option>
                           <option>Conveyance</option>
                           <option>Office Operation</option>
                           <option>Others Income</option>
                           <option>Others</option>
                        </select>
                     </div>
                     <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">সংশ্লিষ্ট ব্যক্তি/পক্ষ</label>
                        <select name="entityId" className="w-full p-3 border rounded-xl text-sm bg-white">
                           <option value="">None</option>
                           <optgroup label="DSR/Staff">
                              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                           </optgroup>
                           <optgroup label="Suppliers">
                              {suppliers.map(su => <option key={su.id} value={su.id}>{su.name}</option>)}
                           </optgroup>
                        </select>
                     </div>
                  </div>
                  <div className="col-span-2 mt-2">
                     <VoiceNoteRecorder 
                        onRecordingComplete={(base64) => setVoiceNote(base64)} 
                        existingAudio={voiceNote}
                     />
                  </div>
                  <div className="flex gap-4 pt-4 border-t mt-6">
                     <button type="button" onClick={() => { setShowAdd(false); setVoiceNote(null); }} className="flex-1 border py-3.5 rounded-2xl text-xs font-bold cursor-pointer">বাতিল</button>
                     <button type="submit" className="flex-1 bg-black text-white py-3.5 rounded-2xl text-xs font-bold cursor-pointer">সেভ করুন</button>
                  </div>
              </form>
           </div>
        </div>
      )}

      {/* FUND TRANSFER (CASH TRANSFER) MODAL */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white max-w-md w-full rounded-3xl p-8 shadow-2xl relative">
              <h3 className="text-xl font-black mb-5 text-purple-900">অ্যাকাউন্ট ফান্ড স্থানান্তর (Transfer Fund)</h3>
              <form onSubmit={handleAddTransfer} className="space-y-4">
                 <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">উৎস অ্যাকাউন্ট (From Account)*</label>
                    <select name="fromAccountId" required className="w-full p-3 border rounded-xl text-sm bg-white">
                       {calculatedAccounts.map(a => (
                         <option key={a.id} value={a.id}>{a.name} (বালঞ্চ: {formatCurrency(a.balance)})</option>
                       ))}
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">গন্তব্য অ্যাকাউন্ট (To Account)*</label>
                    <select name="toAccountId" required className="w-full p-3 border rounded-xl text-sm bg-white">
                       {calculatedAccounts.map(a => (
                         <option key={a.id} value={a.id}>{a.name} (বালঞ্চ: {formatCurrency(a.balance)})</option>
                       ))}
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">স্থানান্তরের পরিমাণ (Amount)*</label>
                    <input name="amount" type="number" required className="w-full p-3 border rounded-xl text-sm font-bold" placeholder="0.00" />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">ছোট বিবরণ</label>
                    <input name="description" className="w-full p-3 border rounded-xl text-sm" placeholder="উদা: ম্যানেজার তহবিল বুঝে পেলাম" />
                 </div>
                 <div className="flex gap-4 pt-5 border-t mt-6">
                    <button type="button" onClick={() => setShowTransferModal(false)} className="flex-1 border py-3.5 rounded-2xl text-xs font-bold cursor-pointer">বাতিল</button>
                    <button type="submit" className="flex-1 bg-purple-650 text-white py-3.5 rounded-2xl text-xs font-bold cursor-pointer bg-purple-600">ট্রান্সফার নিশ্চিত করুন</button>
                 </div>
              </form>
           </div>
        </div>
      )}

    </div>
  );
}
