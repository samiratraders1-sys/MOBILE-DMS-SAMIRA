import React, { useState, useMemo } from "react";
import { 
  BarChart3, 
  Users, 
  AlertTriangle, 
  Receipt, 
  Download, 
  FileText, 
  FileSpreadsheet, 
  Printer, 
  Search, 
  Calendar,
  Filter,
  DollarSign,
  TrendingUp,
  PackageCheck
} from "lucide-react";
import { exportToCSV, exportToExcel, exportToPDF } from "../services/reportService";
import { calculateDamageTotal, calculateExpenseTotal } from "../utils/calculations";

interface ReportsPageProps {
  sales?: any[];
  customers?: any[];
  transactions?: any[];
  damageInventory?: any[];
  expenses?: any[];
  products?: any[];
  initialTab?: "sales" | "customer" | "damage" | "expense";
}

export default function ReportsPage({
  sales = [],
  customers = [],
  transactions = [],
  damageInventory = [],
  expenses = [],
  products = [],
  initialTab = "sales"
}: ReportsPageProps) {
  const [activeTab, setActiveTab] = useState<"sales" | "customer" | "damage" | "expense">(initialTab);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0]
  });

  // Filter Data based on date range and search term
  const filteredSales = useMemo(() => {
    return (sales || []).filter(s => {
      const sDate = (s.date || "").split("T")[0];
      const matchDate = (!dateRange.startDate || sDate >= dateRange.startDate) &&
                        (!dateRange.endDate || sDate <= dateRange.endDate);
      const matchSearch = !searchTerm || 
        (s.customerName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.id || "").toLowerCase().includes(searchTerm.toLowerCase());
      return matchDate && matchSearch;
    });
  }, [sales, dateRange, searchTerm]);

  const filteredCustomerLedgers = useMemo(() => {
    return (customers || []).filter(c => {
      return !searchTerm || 
        (c.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone || c.contactDetails?.phone || "").includes(searchTerm);
    });
  }, [customers, searchTerm]);

  const filteredDamage = useMemo(() => {
    return (damageInventory || []).filter(d => {
      const dDate = (d.date || "").split("T")[0];
      const matchDate = (!dateRange.startDate || dDate >= dateRange.startDate) &&
                        (!dateRange.endDate || dDate <= dateRange.endDate);
      const matchSearch = !searchTerm ||
        (d.productName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.reason || "").toLowerCase().includes(searchTerm.toLowerCase());
      return matchDate && matchSearch;
    });
  }, [damageInventory, dateRange, searchTerm]);

  const filteredExpenses = useMemo(() => {
    return (expenses || []).filter(e => {
      const eDate = (e.date || "").split("T")[0];
      const matchDate = (!dateRange.startDate || eDate >= dateRange.startDate) &&
                        (!dateRange.endDate || eDate <= dateRange.endDate);
      const matchSearch = !searchTerm ||
        (e.category || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.description || "").toLowerCase().includes(searchTerm.toLowerCase());
      return matchDate && matchSearch;
    });
  }, [expenses, dateRange, searchTerm]);

  // Summaries
  const totalSalesRevenue = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  }, [filteredSales]);

  const totalCustomerDue = useMemo(() => {
    return filteredCustomerLedgers.reduce((sum, c) => sum + (Number(c.balance) || 0), 0);
  }, [filteredCustomerLedgers]);

  const totalDamageLoss = useMemo(() => {
    return calculateDamageTotal(filteredDamage);
  }, [filteredDamage]);

  const totalExpenseSum = useMemo(() => {
    return calculateExpenseTotal(filteredExpenses);
  }, [filteredExpenses]);

  // Export handlers using unified reportService
  const handleExportCSV = () => {
    if (activeTab === "sales") {
      const headers = ["তারিখ", "চালান নম্বর", "কাস্টমার", "মোট টাকা", "পরিশোধিত", "বকেয়া", "স্ট্যাটাস"];
      const rows = filteredSales.map(s => [s.date, s.id, s.customerName, s.total, s.paidAmount, s.dueAmount, s.status]);
      exportToCSV("Sales_Report.csv", headers, rows);
    } else if (activeTab === "customer") {
      const headers = ["কাস্টমার নাম", "ফোন নম্বর", "ঠিকানা", "বর্তমান বকেয়া (৳)"];
      const rows = filteredCustomerLedgers.map(c => [c.name, c.phone || c.contactDetails?.phone || "N/A", c.address || "N/A", c.balance || 0]);
      exportToCSV("Customer_Ledger_Report.csv", headers, rows);
    } else if (activeTab === "damage") {
      const headers = ["তারিখ", "পণ্য", "পরিমাণ", "দর (৳)", "মোট ক্ষতি (৳)", "কারণ"];
      const rows = filteredDamage.map(d => [d.date, d.productName, d.quantity, d.rate, d.totalLoss, d.reason || "N/A"]);
      exportToCSV("Damage_Report.csv", headers, rows);
    } else if (activeTab === "expense") {
      const headers = ["তারিখ", "ক্যাটাগরি", "বিবরণ", "পরিমাণ (৳)", "এন্ট্রি কারী"];
      const rows = filteredExpenses.map(e => [e.date, e.category, e.description, e.amount, e.createdBy || "Staff"]);
      exportToCSV("Expense_Report.csv", headers, rows);
    }
  };

  const handleExportExcel = () => {
    if (activeTab === "sales") {
      const headers = ["তারিখ", "চালান নম্বর", "কাস্টমার", "মোট টাকা", "পরিশোধিত", "বকেয়া", "স্ট্যাটাস"];
      const rows = filteredSales.map(s => [s.date, s.id, s.customerName, s.total, s.paidAmount, s.dueAmount, s.status]);
      exportToExcel("Sales_Report.xls", headers, rows);
    } else if (activeTab === "customer") {
      const headers = ["কাস্টমার নাম", "ফোন নম্বর", "ঠিকানা", "বর্তমান বকেয়া (৳)"];
      const rows = filteredCustomerLedgers.map(c => [c.name, c.phone || c.contactDetails?.phone || "N/A", c.address || "N/A", c.balance || 0]);
      exportToExcel("Customer_Ledger_Report.xls", headers, rows);
    } else if (activeTab === "damage") {
      const headers = ["তারিখ", "পণ্য", "পরিমাণ", "দর (৳)", "মোট ক্ষতি (৳)", "কারণ"];
      const rows = filteredDamage.map(d => [d.date, d.productName, d.quantity, d.rate, d.totalLoss, d.reason || "N/A"]);
      exportToExcel("Damage_Report.xls", headers, rows);
    } else if (activeTab === "expense") {
      const headers = ["তারিখ", "ক্যাটাগরি", "বিবরণ", "পরিমাণ (৳)", "এন্ট্রি কারী"];
      const rows = filteredExpenses.map(e => [e.date, e.category, e.description, e.amount, e.createdBy || "Staff"]);
      exportToExcel("Expense_Report.xls", headers, rows);
    }
  };

  const handleExportPDF = () => {
    if (activeTab === "sales") {
      const headers = ["তারিখ", "চালান", "কাস্টমার", "মোট টাকা", "পরিশোধ", "বকেয়া"];
      const rows = filteredSales.map(s => [s.date, s.id.slice(0, 8), s.customerName, `৳${s.total}`, `৳${s.paidAmount}`, `৳${s.dueAmount}`]);
      exportToPDF("বিক্রয় রিপোর্ট (Sales Report)", headers, rows);
    } else if (activeTab === "customer") {
      const headers = ["কাস্টমার নাম", "ফোন নম্বর", "ঠিকানা", "বর্তমান বকেয়া"];
      const rows = filteredCustomerLedgers.map(c => [c.name, c.phone || "N/A", c.address || "N/A", `৳${c.balance || 0}`]);
      exportToPDF("কাস্টমার লেজার রিপোর্ট (Customer Ledger Report)", headers, rows);
    } else if (activeTab === "damage") {
      const headers = ["তারিখ", "পণ্য", "পরিমাণ", "দর", "মোট ক্ষতি", "কারণ"];
      const rows = filteredDamage.map(d => [d.date, d.productName, d.quantity, `৳${d.rate}`, `৳${d.totalLoss}`, d.reason || "N/A"]);
      exportToPDF("ড্যামেজ স্টক রিপোর্ট (Damage Report)", headers, rows);
    } else if (activeTab === "expense") {
      const headers = ["তারিখ", "ক্যাটাগরি", "বিবরণ", "পরিমাণ"];
      const rows = filteredExpenses.map(e => [e.date, e.category, e.description, `৳${e.amount}`]);
      exportToPDF("খরচ লেজার রিপোর্ট (Expense Report)", headers, rows);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-950 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-indigo-600" />
            সেন্ট্রাল বিজনেস রিপোর্টস (Central Reports)
          </h1>
          <p className="text-sm text-gray-500 font-medium">বিক্রয়, কাস্টমার লেজার, ড্যামেজ এবং খরচের একক রিপোর্ট পোর্টাল</p>
        </div>

        {/* Export Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs transition"
          >
            <FileText className="w-4 h-4" /> CSV ডাউনলোডের
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-green-50 hover:bg-green-100 text-green-700 font-bold rounded-xl text-xs transition"
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel এক্সপোর্ট
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
          >
            <Printer className="w-4 h-4" /> PDF প্রিন্ট
          </button>
        </div>
      </div>

      {/* Metric Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">মোট বিক্রয় (Sales)</span>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-gray-950">৳{totalSalesRevenue.toLocaleString()}</div>
          <div className="text-xs text-gray-500 font-medium mt-1">{filteredSales.length}টি বিক্রয় চালান</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">কাস্টমার বকেয়া (Due)</span>
            <Users className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">৳{totalCustomerDue.toLocaleString()}</div>
          <div className="text-xs text-gray-500 font-medium mt-1">{filteredCustomerLedgers.length} জন কাস্টমার</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">ড্যামেজ ক্ষতি (Damage)</span>
            <AlertTriangle className="w-5 h-5 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600">৳{totalDamageLoss.toLocaleString()}</div>
          <div className="text-xs text-gray-500 font-medium mt-1">{filteredDamage.length}টি ক্ষতিগ্রস্ত এন্ট্রি</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">মোট খরচ (Expense)</span>
            <Receipt className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-600">৳{totalExpenseSum.toLocaleString()}</div>
          <div className="text-xs text-gray-500 font-medium mt-1">{filteredExpenses.length}টি খরচ এন্ট্রি</div>
        </div>
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex p-1 bg-gray-100/80 rounded-2xl w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab("sales")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === "sales" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <BarChart3 className="w-4 h-4" /> বিক্রয় রিপোর্ট (Sales)
          </button>
          <button
            onClick={() => setActiveTab("customer")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === "customer" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Users className="w-4 h-4" /> কাস্টমার লেজার (Customer)
          </button>
          <button
            onClick={() => setActiveTab("damage")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === "damage" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <AlertTriangle className="w-4 h-4" /> ড্যামেজ রিপোর্ট (Damage)
          </button>
          <button
            onClick={() => setActiveTab("expense")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === "expense" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Receipt className="w-4 h-4" /> খরচ লেজার (Expense)
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="খুঁজুন..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={e => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="p-1.5 border border-gray-200 rounded-xl text-xs font-medium"
            />
            <span className="text-gray-400 text-xs">-</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={e => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="p-1.5 border border-gray-200 rounded-xl text-xs font-medium"
            />
          </div>
        </div>
      </div>

      {/* Data Tables */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {activeTab === "sales" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="p-4 font-bold text-gray-700">তারিখ</th>
                  <th className="p-4 font-bold text-gray-700">চালান আইডি</th>
                  <th className="p-4 font-bold text-gray-700">কাস্টমার</th>
                  <th className="p-4 font-bold text-gray-700 text-right">মোট (৳)</th>
                  <th className="p-4 font-bold text-gray-700 text-right">পরিশোধিত (৳)</th>
                  <th className="p-4 font-bold text-gray-700 text-right">বকেয়া (৳)</th>
                  <th className="p-4 font-bold text-gray-700 text-center">অবস্থা</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400 font-medium">কোন বিক্রয় তথ্য পাওয়া যায়নি</td>
                  </tr>
                ) : (
                  filteredSales.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50/50">
                      <td className="p-4 font-semibold text-gray-800">{s.date}</td>
                      <td className="p-4 font-bold text-indigo-600">#{s.id.slice(0, 8)}</td>
                      <td className="p-4 font-bold text-gray-900">{s.customerName}</td>
                      <td className="p-4 font-black text-gray-900 text-right">৳{(Number(s.total) || 0).toLocaleString()}</td>
                      <td className="p-4 font-bold text-emerald-600 text-right">৳{(Number(s.paidAmount) || 0).toLocaleString()}</td>
                      <td className="p-4 font-bold text-amber-600 text-right">৳{(Number(s.dueAmount) || 0).toLocaleString()}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                          s.dueAmount <= 0 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {s.dueAmount <= 0 ? "পরিশোধিত" : "বকেয়া"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "customer" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="p-4 font-bold text-gray-700">কাস্টমার নাম</th>
                  <th className="p-4 font-bold text-gray-700">ফোন নম্বর</th>
                  <th className="p-4 font-bold text-gray-700">ঠিকানা</th>
                  <th className="p-4 font-bold text-gray-700 text-right">বর্তমান বকেয়া (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCustomerLedgers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-400 font-medium">কোন কাস্টমার লেজার পাওয়া যায়নি</td>
                  </tr>
                ) : (
                  filteredCustomerLedgers.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50/50">
                      <td className="p-4 font-bold text-gray-900">{c.name}</td>
                      <td className="p-4 font-semibold text-gray-600">{c.phone || c.contactDetails?.phone || "N/A"}</td>
                      <td className="p-4 text-gray-600">{c.address || "N/A"}</td>
                      <td className="p-4 font-black text-amber-600 text-right">৳{(Number(c.balance) || 0).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "damage" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="p-4 font-bold text-gray-700">তারিখ</th>
                  <th className="p-4 font-bold text-gray-700">পণ্য</th>
                  <th className="p-4 font-bold text-gray-700">পরিমাণ</th>
                  <th className="p-4 font-bold text-gray-700 text-right">দর (৳)</th>
                  <th className="p-4 font-bold text-gray-700 text-right">মোট ক্ষতি (৳)</th>
                  <th className="p-4 font-bold text-gray-700">কারণ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDamage.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400 font-medium">কোন ড্যামেজ তথ্য পাওয়া যায়নি</td>
                  </tr>
                ) : (
                  filteredDamage.map(d => (
                    <tr key={d.id} className="hover:bg-gray-50/50">
                      <td className="p-4 font-semibold text-gray-800">{d.date}</td>
                      <td className="p-4 font-bold text-gray-900">{d.productName}</td>
                      <td className="p-4 font-semibold text-gray-700">{d.quantity} পিস</td>
                      <td className="p-4 font-semibold text-gray-700 text-right">৳{(Number(d.rate) || 0).toLocaleString()}</td>
                      <td className="p-4 font-black text-rose-600 text-right">৳{(Number(d.totalLoss) || 0).toLocaleString()}</td>
                      <td className="p-4 text-gray-600">{d.reason || "N/A"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "expense" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="p-4 font-bold text-gray-700">তারিখ</th>
                  <th className="p-4 font-bold text-gray-700">ক্যাটাগরি</th>
                  <th className="p-4 font-bold text-gray-700">বিবরণ</th>
                  <th className="p-4 font-bold text-gray-700 text-right">পরিমাণ (৳)</th>
                  <th className="p-4 font-bold text-gray-700">এন্ট্রি কারী</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400 font-medium">কোন খরচ পাওয়া যায়নি</td>
                  </tr>
                ) : (
                  filteredExpenses.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50/50">
                      <td className="p-4 font-semibold text-gray-800">{e.date}</td>
                      <td className="p-4 font-bold text-indigo-600">{e.category}</td>
                      <td className="p-4 text-gray-800 font-medium">{e.description}</td>
                      <td className="p-4 font-black text-blue-600 text-right">৳{(Number(e.amount) || 0).toLocaleString()}</td>
                      <td className="p-4 text-gray-500 font-medium">{e.createdBy || "Staff"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
