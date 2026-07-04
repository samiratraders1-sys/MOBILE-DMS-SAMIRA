import React, { useState, useMemo } from "react";
import { 
  DollarSign, 
  Calendar, 
  Filter, 
  Plus, 
  Trash2, 
  CheckCircle, 
  Clock, 
  TrendingDown, 
  PieChart as PieIcon, 
  Layers, 
  Users, 
  FileText, 
  ChevronRight,
  Download,
  AlertCircle
} from "lucide-react";
import { formatCurrency } from "../lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import toast from "react-hot-toast";

interface Expense {
  id: string;
  date: string;
  amount: number;
  source: "DSR" | "Manager" | "Office" | "Salary";
  category: string;
  description: string;
  refId?: string;
  createdBy?: string;
  approved?: boolean;
}

interface ExpenseLedgerProps {
  expenses: Expense[];
  addExpense: (e: any) => Promise<void>;
  removeExpense?: (id: string) => Promise<void>;
  updateExpense?: (id: string, data: any) => Promise<void>;
  role?: string;
}

const COLORS = ["#EF4444", "#3B82F6", "#10B981", "#F59E0B"];
const SOURCE_LABELS = {
  DSR: "DSR রুট খরচ",
  Manager: "ম্যানেজার এন্ট্রি",
  Office: "অফিস বাজার ও উপযোগ",
  Salary: "কর্মচারী বেতন ও পারিশ্রমিক"
};

const SOURCE_COLORS = {
  DSR: "bg-red-50 text-red-700 border-red-100",
  Manager: "bg-blue-50 text-blue-700 border-blue-100",
  Office: "bg-emerald-50 text-emerald-700 border-emerald-100",
  Salary: "bg-amber-50 text-amber-700 border-amber-100"
};

export default function ExpenseLedgerView({
  expenses = [],
  addExpense,
  removeExpense,
  updateExpense,
  role = "admin"
}: ExpenseLedgerProps) {
  const [activeSourceFilter, setActiveSourceFilter] = useState<"ALL" | "DSR" | "Manager" | "Office" | "Salary">("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form states
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formSource, setFormSource] = useState<"DSR" | "Manager" | "Office" | "Salary">("Office");
  const [formCategory, setFormCategory] = useState("বিবিধ উপযোগ খরচ");
  const [formAmount, setFormAmount] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtered expenses list
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      if (activeSourceFilter !== "ALL" && exp.source !== activeSourceFilter) return false;
      if (startDate && exp.date < startDate) return false;
      if (endDate && exp.date > endDate) return false;
      return true;
    });
  }, [expenses, activeSourceFilter, startDate, endDate]);

  // Statistics
  const stats = useMemo(() => {
    const total = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const dsr = filteredExpenses.filter(e => e.source === "DSR").reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const manager = filteredExpenses.filter(e => e.source === "Manager").reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const office = filteredExpenses.filter(e => e.source === "Office").reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const salary = filteredExpenses.filter(e => e.source === "Salary").reduce((sum, e) => sum + Number(e.amount || 0), 0);
    
    return { total, dsr, manager, office, salary };
  }, [filteredExpenses]);

  // Pie chart data
  const pieChartData = useMemo(() => {
    return [
      { name: "DSR রুট", value: stats.dsr },
      { name: "ম্যানেজার", value: stats.manager },
      { name: "অফিস", value: stats.office },
      { name: "বেতন", value: stats.salary }
    ].filter(item => item.value > 0);
  }, [stats]);

  // Handle Save Expense Manual
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount || Number(formAmount) <= 0) {
      toast.error("সঠিক খরচের পরিমাণ প্রদান করুন!");
      return;
    }

    setIsSubmitting(true);
    try {
      const isManager = role === "manager";
      await addExpense({
        date: formDate,
        source: formSource,
        category: formCategory,
        amount: Number(formAmount),
        description: formDescription,
        approved: !isManager,
        refId: "manual"
      });
      toast.success(isManager ? "খরচটি সেভ করা হয়েছে এবং অনুমোদনের অপেক্ষায় রয়েছে!" : "খরচটি সফলভাবে যুক্ত হয়েছে!");
      setShowAddModal(false);
      setFormAmount("");
      setFormDescription("");
    } catch (err: any) {
      toast.error("ভুল হয়েছে: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Approval function
  const handleApprove = async (id: string) => {
    if (role !== "admin") {
      toast.error("শুধুমাত্র অ্যাডমিন অনুমোদন করতে পারবেন!");
      return;
    }
    if (updateExpense) {
      try {
        await updateExpense(id, { approved: true });
        toast.success("খরচটি সফলভাবে অনুমোদিত হয়েছে!");
      } catch (err: any) {
        toast.error("অনুমোদনে সমস্যা: " + err.message);
      }
    }
  };

  // Delete function
  const handleDelete = async (id: string) => {
    if (!window.confirm("আপনি কি নিশ্চিতভাবে এই খরচ রেকর্ডটি মুছে ফেলতে চান?")) return;
    if (removeExpense) {
      try {
        await removeExpense(id);
        toast.success("খরচ রেকর্ডটি সফলভাবে মুছে ফেলা হয়েছে!");
      } catch (err: any) {
        toast.error("রেকর্ড মুছতে সমস্যা: " + err.message);
      }
    }
  };

  return (
    <div id="expense_ledger_container" className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-red-500" />
            ব্যয় খতিয়ান (Unified Expense Ledger)
          </h1>
          <p className="text-xs text-gray-500 mt-1 font-medium">
            DSR, ম্যানেজার, অফিস ও বেতন খাত থেকে আসা সকল খরচের কেন্দ্রীয় লেজার ও বিবরণী
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-600 text-white font-bold text-sm px-5 py-3 rounded-2xl shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          নতুন ব্যয় এন্ট্রি করুন
        </button>
      </div>

      {/* Filter Options Widget */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 pb-4">
          <span className="text-xs font-black text-gray-400 uppercase tracking-wider mr-2">উৎস অনুযায়ী ফিল্টার:</span>
          {(["ALL", "DSR", "Manager", "Office", "Salary"] as const).map(src => (
            <button
              key={src}
              onClick={() => setActiveSourceFilter(src)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeSourceFilter === src
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {src === "ALL" ? "সব খরচ" : SOURCE_LABELS[src]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">শুরুর তারিখ</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-500 font-bold"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">শেষের তারিখ</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-500 font-bold"
              />
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => { setStartDate(""); setEndDate(""); }}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-black transition-colors"
            >
              ফিল্টার রিসেট করুন
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-red-50/50 p-5 rounded-3xl border border-red-100 shadow-sm">
          <span className="text-[10px] text-red-500 font-extrabold uppercase tracking-widest block">মোট খতিয়ান খরচ</span>
          <span className="text-2xl font-black text-red-700 block mt-1 font-mono">{formatCurrency(stats.total)}</span>
          <span className="text-[10.5px] text-gray-400 font-bold mt-1 block">ফিল্টারকৃত মোট ব্যয়</span>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block">DSR রুট খরচ</span>
          <span className="text-xl font-black text-gray-900 block mt-1 font-mono">{formatCurrency(stats.dsr)}</span>
          <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-red-500 h-full" style={{ width: stats.total ? `${(stats.dsr / stats.total) * 100}%` : "0%" }}></div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block">ম্যানেজার এন্ট্রি</span>
          <span className="text-xl font-black text-gray-900 block mt-1 font-mono">{formatCurrency(stats.manager)}</span>
          <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-blue-500 h-full" style={{ width: stats.total ? `${(stats.manager / stats.total) * 100}%` : "0%" }}></div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block">অফিস বাজার খরচ</span>
          <span className="text-xl font-black text-gray-900 block mt-1 font-mono">{formatCurrency(stats.office)}</span>
          <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-emerald-500 h-full" style={{ width: stats.total ? `${(stats.office / stats.total) * 100}%` : "0%" }}></div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block">বেতন ও পারিশ্রমিক</span>
          <span className="text-xl font-black text-gray-900 block mt-1 font-mono">{formatCurrency(stats.salary)}</span>
          <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-amber-500 h-full" style={{ width: stats.total ? `${(stats.salary / stats.total) * 100}%` : "0%" }}></div>
          </div>
        </div>
      </div>

      {/* Visual Analytics */}
      {pieChartData.length > 0 && (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-4 space-y-4">
            <h3 className="text-sm font-black text-gray-800">খরচের চিত্রলেখ (Percentage Contribution)</h3>
            <div className="space-y-2">
              {pieChartData.map((item, index) => {
                const percent = stats.total ? ((item.value / stats.total) * 100).toFixed(1) : 0;
                return (
                  <div key={item.name} className="flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-600 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                      {item.name}
                    </span>
                    <span className="font-bold text-gray-900 font-mono">{percent}% ({formatCurrency(item.value)})</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="md:col-span-8 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Primary Ledgers Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/20">
          <h2 className="text-base font-black text-gray-900">খরচের তালিকা বিবরণী</h2>
          <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full font-mono">
            {filteredExpenses.length} Records Found
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-black uppercase text-gray-400 tracking-wider">
                <th className="px-6 py-4">তারিখ</th>
                <th className="px-6 py-4">উৎস (Source)</th>
                <th className="px-6 py-4">শ্রেণী (Category)</th>
                <th className="px-6 py-4">বিবরণ / মেমো</th>
                <th className="px-6 py-4 text-right">পরিমাণ (Amount)</th>
                <th className="px-6 py-4 text-center">স্থিতি (Status)</th>
                {(role === "admin" || removeExpense) && <th className="px-6 py-4 text-center">অ্যাকশন</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 font-bold">
                    <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    কোনো খরচের বিবরণ পাওয়া যায়নি!
                  </td>
                </tr>
              ) : (
                filteredExpenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-gray-50/40 transition-colors">
                    <td className="px-6 py-4 font-bold font-mono text-gray-700 whitespace-nowrap">
                      {exp.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-black border uppercase tracking-wide ${SOURCE_COLORS[exp.source] || "bg-gray-50"}`}>
                        {SOURCE_LABELS[exp.source] || exp.source}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-800">
                      {exp.category}
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-medium max-w-xs truncate">
                      {exp.description}
                    </td>
                    <td className="px-6 py-4 text-right font-black font-mono text-red-600">
                      {formatCurrency(exp.amount)}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      {exp.approved !== false ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-black bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                          <CheckCircle className="w-3.5 h-3.5" />
                          অনুমোদিত
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-yellow-600 font-black bg-yellow-50 px-2.5 py-1 rounded-full border border-yellow-100">
                          <Clock className="w-3.5 h-3.5" />
                          পেন্ডিং
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        {role === "admin" && exp.approved === false && (
                          <button
                            onClick={() => handleApprove(exp.id)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-2.5 py-1.5 rounded-xl transition-colors"
                          >
                            অনুমোদন দিন
                          </button>
                        )}
                        {removeExpense && (
                          <button
                            onClick={() => handleDelete(exp.id)}
                            className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Add Overlay Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-indigo-900 text-white p-5 flex justify-between items-center">
              <h3 className="font-black text-sm">নতুন ব্যয় এন্ট্রি করুন (Add Expense)</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-white/80 hover:text-white font-black text-xs"
              >
                বন্ধ করুন ✕
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">তারিখ</label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">ব্যয়ের উৎস (Source)</label>
                <select
                  value={formSource}
                  onChange={e => setFormSource(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-500 font-bold"
                >
                  <option value="Office">অফিস (Office)</option>
                  <option value="Manager">ম্যানেজার এন্ট্রি (Manager)</option>
                  <option value="Salary">বেতন / পারিশ্রমিক (Salary)</option>
                  <option value="DSR">DSR রুট খরচ (DSR)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">খরচের খাত (Category)</label>
                <input
                  type="text"
                  required
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  placeholder="যেমন: মোবাইল বিল, অফিস বাজার খরচ"
                  className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">পরিমাণ (Taka)</label>
                <input
                  type="number"
                  required
                  value={formAmount}
                  onChange={e => setFormAmount(e.target.value)}
                  placeholder="যেমন: 2500"
                  className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-500 font-black font-mono text-indigo-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">মন্তব্য / বিবরণ</label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  rows={3}
                  placeholder="খরচের বিবরণ প্রদান করুন..."
                  className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-500 font-semibold"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-700 transition-colors"
                >
                  বাতিল করুন
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-colors"
                >
                  {isSubmitting ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
