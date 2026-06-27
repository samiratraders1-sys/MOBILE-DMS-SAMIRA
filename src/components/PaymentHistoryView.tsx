import { useState, useMemo, Fragment } from "react";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Calendar, 
  Filter, 
  Download, 
  Printer, 
  ArrowUpDown, 
  User, 
  Wallet, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  FileSpreadsheet, 
  CheckCircle, 
  Clock, 
  Trash2,
  Users,
  Building2
} from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "motion/react";
import CSVUploader from "./CSVUploader";

// Format currency in Bangladeshi Taka
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("bn-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(val).replace("BDT", "৳");
};

interface PaymentHistoryViewProps {
  payments: any[];
  customers: any[];
  suppliers: any[];
  staff: any[];
  accounts: any[];
  removePayment?: (id: string) => Promise<void>;
  addPayment?: (payment: any) => Promise<any>;
  role?: string;
  user?: any;
}

export default function PaymentHistoryView({
  payments = [],
  customers = [],
  suppliers = [],
  staff = [],
  accounts = [],
  removePayment,
  addPayment,
  role = "staff",
  user
}: PaymentHistoryViewProps) {
  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | "in" | "out">("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [selectedEntityType, setSelectedEntityType] = useState<"all" | "customer" | "supplier" | "staff">("all");
  const [selectedEntityId, setSelectedEntityId] = useState("all");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Sorting
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const handleImport = async (data: any[]) => {
    if (!addPayment) {
        toast.error("পেমেন্ট যোগ করার পদ্ধতি পাওয়া যায়নি।");
        return;
    }
    
    try {
        for (const row of data) {
            const entityName = row["Associated Entity"]?.replace(/"/g, '') || "";
            const supplier = suppliers.find(s => s.name === entityName);
            
            const payment = {
                date: row["Payment Date"],
                type: row["Transaction Type"]?.includes("Inflow") ? "in" : "out",
                amount: Number(row["Amount (BDT)"] || 0),
                category: row["Category"]?.replace(/"/g, '') || "Supplier Payment",
                description: row["Description"]?.replace(/"/g, '') || "Bulk Import",
                entityId: supplier ? supplier.id : "",
                status: "approved",
                createdAt: new Date().toISOString()
            };
            await addPayment(payment);
        }
        toast.success("পেমেন্ট সফলভাবে আপলোড হয়েছে");
    } catch (err: any) {
        toast.error("আপলোড ব্যর্থ হয়েছে: " + err.message);
    }
  };

  // Entity details lookups
  const getEntityDetails = (entityId: string, category: string, description: string) => {
    if (!entityId) {
      // Try to find if description contains any known client or supplier name
      const descClean = (description || "").toLowerCase();
      const matchedCustomer = customers.find(c => c.name && descClean.includes(c.name.toLowerCase()));
      if (matchedCustomer) {
        return { name: matchedCustomer.name, type: "কাস্টমার", icon: User };
      }
      const matchedSupplier = suppliers.find(s => s.name && descClean.includes(s.name.toLowerCase()));
      if (matchedSupplier) {
        return { name: matchedSupplier.name, type: "সাপ্লায়ার", icon: Building2 };
      }
      const matchedStaff = staff.find(s => s.name && descClean.includes(s.name.toLowerCase()));
      if (matchedStaff) {
        return { name: matchedStaff.name, type: "স্টাফ / SR", icon: Users };
      }
      return { name: "N/A", type: "সাধারণ খাতে", icon: Wallet };
    }

    const idStr = String(entityId).trim().toLowerCase();

    // 1. Try finding in staff by id or name exact match
    const staffMember = staff.find(s => String(s.id).trim().toLowerCase() === idStr || (s.name && s.name.trim().toLowerCase() === idStr));
    if (staffMember) {
      return { name: staffMember.name, type: "স্টাফ / SR", icon: Users };
    }

    // 2. Try finding in suppliers
    const supplier = suppliers.find(s => String(s.id).trim().toLowerCase() === idStr || (s.name && s.name.trim().toLowerCase() === idStr));
    if (supplier) {
      return { name: supplier.name, type: "সাপ্লায়ার", icon: Building2 };
    }

    // 3. Try finding in customers
    const customer = customers.find(c => String(c.id).trim().toLowerCase() === idStr || (c.name && c.name.trim().toLowerCase() === idStr));
    if (customer) {
      return { name: customer.name, type: "কাস্টমার", icon: User };
    }

    // 4. Fallbacks for cash transactions
    if (idStr === "cash" || (description || "").toLowerCase().includes("কাস্টমার") || (description || "").toLowerCase().includes("cash")) {
      return { name: "নগদ কাস্টমার / Cash", type: "কাস্টমার (খুচরা)", icon: User };
    }

    // Default return
    return { name: entityId, type: "অন্যান্য", icon: Wallet };
  };

  // Extract unique categories for filter
  const uniqueCategories = useMemo(() => {
    const list = payments.map(p => p.category).filter(Boolean);
    return Array.from(new Set(list));
  }, [payments]);

  // Set preset ranges
  const applyPresetDate = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
    setCurrentPage(1);
  };

  const clearDateRange = () => {
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  // Sorted and filtered payments
  const processedPayments = useMemo(() => {
    let result = [...payments];

    // Search filter (description, category, method, createdBy, and entity name)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p => {
        const descMatch = (p.description || "").toLowerCase().includes(term);
        const catMatch = (p.category || "").toLowerCase().includes(term);
        const methodMatch = (p.method || "").toLowerCase().includes(term);
        const userMatch = (p.createdBy || "").toLowerCase().includes(term);
        
        // Evaluate entity name match unconditionally by checking getEntityDetails
        const ent = getEntityDetails(p.entityId || "", p.category || "", p.description || "");
        const entityNameMatch = ent.name.toLowerCase().includes(term) || ent.type.toLowerCase().includes(term);

        return descMatch || catMatch || methodMatch || userMatch || entityNameMatch;
      });
    }

    // Type filter
    if (selectedType !== "all") {
      result = result.filter(p => p.type === selectedType);
    }

    // Category filter
    if (selectedCategory !== "all") {
      result = result.filter(p => p.category === selectedCategory);
    }

    // Account ID filter
    if (selectedAccountId !== "all") {
      result = result.filter(p => p.accountId === selectedAccountId);
    }

    // Entity Type & Entity ID filter
    if (selectedEntityType !== "all") {
      result = result.filter(p => {
        if (!p.entityId) return false;
        const details = getEntityDetails(p.entityId, p.category, p.description);
        if (selectedEntityType === "customer") return details.type.includes("কাস্টমার");
        if (selectedEntityType === "supplier") return details.type.includes("সাপ্লায়ার");
        if (selectedEntityType === "staff") return details.type.includes("স্টাফ");
        return true;
      });
    }

    if (selectedEntityId !== "all") {
      result = result.filter(p => p.entityId === selectedEntityId);
    }

    // Date range filter
    if (startDate) {
      result = result.filter(p => p.date && p.date >= startDate);
    }
    if (endDate) {
      result = result.filter(p => p.date && p.date <= endDate);
    }

    // Sorting
    result.sort((a, b) => {
      const dateA = String(a.date || "");
      const dateB = String(b.date || "");
      
      // Fallback to createdAt for secondary ordering if dates are identical
      if (dateA === dateB) {
        let createA = "";
        if (a.createdAt !== undefined && a.createdAt !== null) {
          if (typeof a.createdAt === "string") createA = a.createdAt;
          else if (typeof a.createdAt === "number") createA = String(a.createdAt);
          else if (a.createdAt.seconds !== undefined) createA = String(a.createdAt.seconds);
          else createA = String(a.createdAt);
        }
        let createB = "";
        if (b.createdAt !== undefined && b.createdAt !== null) {
          if (typeof b.createdAt === "string") createB = b.createdAt;
          else if (typeof b.createdAt === "number") createB = String(b.createdAt);
          else if (b.createdAt.seconds !== undefined) createB = String(b.createdAt.seconds);
          else createB = String(b.createdAt);
        }
        return sortOrder === "desc" 
          ? createB.localeCompare(createA) 
          : createA.localeCompare(createB);
      }
      
      return sortOrder === "desc" 
        ? dateB.localeCompare(dateA) 
        : dateA.localeCompare(dateB);
    });

    return result;
  }, [
    payments, 
    searchTerm, 
    selectedType, 
    selectedCategory, 
    selectedAccountId, 
    selectedEntityType, 
    selectedEntityId, 
    startDate, 
    endDate, 
    sortOrder
  ]);

  // Aggregate stats on filtered data
  const stats = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    
    processedPayments.forEach(p => {
      const amt = Number(p.amount) || 0;
      if (p.type === "in") {
        inflow += amt;
      } else if (p.type === "out") {
        outflow += amt;
      }
    });

    return {
      inflow,
      outflow,
      balance: inflow - outflow
    };
  }, [processedPayments]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(processedPayments.length / itemsPerPage));
  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedPayments.slice(startIndex, startIndex + itemsPerPage);
  }, [processedPayments, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // CSV Downloader
  const downloadCSV = () => {
    const headers = [
      "Payment Date", 
      "Transaction Type", 
      "Amount (BDT)", 
      "Category", 
      "Description", 
      "Associated Entity", 
      "Entity Type",
      "Account Used", 
      "Created By", 
      "Approval Status"
    ];

    const rows = processedPayments.map(p => {
      const acc = accounts.find(a => a.id === p.accountId)?.name || "Default Account";
      const ent = getEntityDetails(p.entityId, p.category, p.description);
      return [
        p.date || "N/A",
        p.type === "in" ? "Inflow (টাকা জমা)" : "Outflow (টাকা খরচ)",
        p.amount || 0,
        `"${(p.category || "").replace(/"/g, '""')}"`,
        `"${(p.description || "").replace(/"/g, '""')}"`,
        `"${ent.name.replace(/"/g, '""')}"`,
        `"${ent.type}"`,
        `"${acc.replace(/"/g, '""')}"`,
        p.createdBy || "System",
        p.status || "approved"
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payment_statement_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("পেমেন্ট স্টেটমেন্ট CSV ডাউনলোড সম্পন্ন হয়েছে!");
  };

  // Handle printer style sheet triggers
  const triggerPrint = () => {
    window.print();
  };

  // Reset Filters helper
  const handleResetFilters = () => {
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
    setSelectedType("all");
    setSelectedCategory("all");
    setSelectedAccountId("all");
    setSelectedEntityType("all");
    setSelectedEntityId("all");
    setCurrentPage(1);
    toast.success("সব ফিল্টার রিসেট করা হয়েছে");
  };

  // Handling item deletion with security checks (only admins can delete)
  const handleDeletePayment = async (id: string, description: string) => {
    if (role !== "admin") {
      toast.error("শুধুমাত্র অ্যাডমিনগণ পেমেন্ট তথ্য ডিলিট করতে পারবেন!");
      return;
    }

    if (window.confirm(`আপনি কি নিশ্চিতভাবে "${description || "পেমেন্ট রেকর্ড"}" মুছে ফেলতে চান? এটি হিসাবের ব্যালেন্সে প্রভাব ফেলবে!`)) {
      try {
        if (removePayment) {
          await removePayment(id);
          toast.success("লেনদেন বিবরণী সফলভাবে মুছে ফেলা হয়েছে!");
        } else {
          toast.error("পদ্ধতিটি কনফিগার করা নেই।");
        }
      } catch (err: any) {
        toast.error("মুছে ফেলা সম্ভব হয়নি: " + err.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Printable Area Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-2">
            <DollarSign className="w-8 h-8 text-indigo-600 bg-indigo-50 p-1.5 rounded-xl border border-indigo-100" />
            পেমেন্ট লেনদেন খতিয়ান
          </h2>
          <p className="text-gray-500 font-medium text-xs mt-1">
            কাস্টমার, সাপ্লায়ার এবং স্টাফদের সাথে সম্পন্ন হওয়া সমস্ত ক্যাশ ইন এবং ক্যাশ আউটের ধারাবাহিক বিবরণী।
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CSVUploader title="পেমেন্ট" onImport={handleImport} />
          <button 
            onClick={downloadCSV}
            className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-150 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" /> CSV স্টেটমেন্ট ডাউনলোড
          </button>
          <button 
            onClick={triggerPrint}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" /> প্রিন্ট করুন
          </button>
        </div>
      </div>

      {/* Stats Board */}
      <div id="print-area" className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">ফিল্টারকৃত মোট ক্যাশ ইন (Inflow)</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-2">{formatCurrency(stats.inflow)}</h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 text-[10px] text-gray-400 font-bold flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> ব্যবসায়িক নগদ জমার পরিমাণ
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">ফিল্টারকৃত মোট ক্যাশ আউট (Outflow)</p>
              <h3 className="text-2xl font-black text-red-600 mt-2">{formatCurrency(stats.outflow)}</h3>
            </div>
            <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
              <TrendingDown className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 text-[10px] text-gray-400 font-bold flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-red-400" /> সাপ্লাইয়ার পরিশোধ ও খরচ
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-xs relative overflow-hidden bg-gradient-to-br from-indigo-50/50 to-indigo-100/10">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">নিট আর্থিক স্থিতি (Net Balance)</p>
              <h3 className={`text-2xl font-black mt-2 ${stats.balance >= 0 ? 'text-indigo-600' : 'text-amber-600'}`}>
                {formatCurrency(stats.balance)}
              </h3>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-indigo-100/50 text-[10px] text-indigo-500 font-bold flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5" /> নির্বাচিত সময়ের তহবিল স্থিতি বা ব্যবধান
          </div>
        </div>
      </div>

      {/* Advanced Filter Box */}
      <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-sm space-y-4 no-print">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <Filter className="w-4 h-4 text-indigo-600" />
          <h3 className="font-bold text-sm text-[#1e1b4b]">লেনদেন খুঁজুন এবং ফিল্টার করুন</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* General Search Input */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">সার্চ টাইপ (বিবরণ, খাত, ব্যক্তি)</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                placeholder="যেমন: ডাচ বাংলা..."
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-250 rounded-xl font-medium focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Type Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">লেনদেনের ধরণ</label>
            <select
              value={selectedType}
              onChange={e => { setSelectedType(e.target.value as any); setCurrentPage(1); }}
              className="w-full p-2.5 text-sm border border-gray-250 rounded-xl bg-white focus:ring-1 focus:ring-indigo-500 outline-none font-medium"
            >
              <option value="all">সকল লেনদেন (In + Out)</option>
              <option value="in">টাকা জমা (Cash Infield)</option>
              <option value="out">টাকা খরচ (Cash Outflow)</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">ব্যবসায়িক খাত (Category)</label>
            <select
              value={selectedCategory}
              onChange={e => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
              className="w-full p-2.5 text-sm border border-gray-250 rounded-xl bg-white focus:ring-1 focus:ring-indigo-500 outline-none font-medium"
            >
              <option value="all">সকল খাত</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Account Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">হিসাব অ্যাকাউন্ট / ক্যাশ বক্স</label>
            <select
              value={selectedAccountId}
              onChange={e => { setSelectedAccountId(e.target.value); setCurrentPage(1); }}
              className="w-full p-2.5 text-sm border border-gray-250 rounded-xl bg-white focus:ring-1 focus:ring-indigo-500 outline-none font-medium"
            >
              <option value="all">সকল অ্যাকাউন্ট</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name} ({acc.accountNo || "N/A"})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          {/* Entity Type Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">পক্ষ অনুযায়ী ফিল্টার (Entity Type)</label>
            <select
              value={selectedEntityType}
              onChange={e => { 
                setSelectedEntityType(e.target.value as any); 
                setSelectedEntityId("all");
                setCurrentPage(1); 
              }}
              className="w-full p-2.5 text-sm border border-gray-250 rounded-xl bg-white focus:ring-1 focus:ring-indigo-500 outline-none font-medium"
            >
              <option value="all">সকল ব্যক্তি/পক্ষ (All Entities)</option>
              <option value="customer">কাস্টমার (Customers)</option>
              <option value="supplier">সাপ্লায়ার (Suppliers)</option>
              <option value="staff">স্টাফ / এসআর (Staff/DSR)</option>
            </select>
          </div>

          {/* Entity ID Search */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">সংশ্লিষ্ট পক্ষ (Name Selected)</label>
            <select
              value={selectedEntityId}
              onChange={e => { setSelectedEntityId(e.target.value); setCurrentPage(1); }}
              disabled={selectedEntityType === "all"}
              className="w-full p-2.5 text-sm border border-gray-250 rounded-xl bg-white focus:ring-1 focus:ring-indigo-500 outline-none font-medium disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="all">পক্ষ নির্বাচন করুন ({selectedEntityType === "all" ? "প্রথমে টাইপ বাছুন" : "সকল"})</option>
              {selectedEntityType === "customer" && customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              {selectedEntityType === "supplier" && suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
              {selectedEntityType === "staff" && staff.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Date Range Inputs */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">তারিখ হতে (Start Date)</label>
            <input
                type="date"
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}
                className="w-full p-2.5 text-sm border border-gray-250 rounded-xl font-medium focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">তারিখ পর্যন্ত (End Date)</label>
            <input
                type="date"
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}
                className="w-full p-2.5 text-sm border border-gray-250 rounded-xl font-medium focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Reset Filter Button */}
        <div className="flex justify-end pt-4 border-t border-gray-100">
          <button
            onClick={handleResetFilters}
            className="text-xs text-indigo-650 hover:text-indigo-800 font-bold underline decoration-indigo-200 hover:decoration-indigo-500 cursor-pointer"
          >
            ফিল্টার রিসেট করুন
          </button>
        </div>
      </div>

      {/* Main List Table */}
      <div id="print-area" className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 border-b border-gray-100 gap-3 no-print">
          <div>
            <span className="font-extrabold text-[#111827] text-md">লেনদেন বিবরণী</span>
            <span className="ml-2.5 px-2 py-0.5 bg-slate-100 border text-slate-700 rounded-lg text-[10px] font-bold">
              রেকর্ড সংখ্যা: {processedPayments.length}টি
            </span>
          </div>
          
          <div className="flex items-center gap-1 text-[11px] font-bold text-gray-400">
            <span>ক্রমবিন্যাস:</span>
            <button 
              onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
              className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 p-1 bg-indigo-50 rounded-md border border-indigo-100 cursor-pointer"
            >
              {sortOrder === "desc" ? "সর্বশেষ আগে" : "প্রাচীনতম আগে"}
              <ArrowUpDown className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Printable title */}
        <div className="hidden print:block p-6 border-b border-slate-300">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-extrabold">সমিরা ট্রেডার্স (Samira Traders)</h1>
              <p className="text-xs text-gray-500">লেনদেন খতিয়ান বিবরণী রিপোর্ট</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">প্রিন্ট তারিখ: {new Date().toLocaleDateString("bn-BD")}</p>
              <p className="text-[10px] text-gray-400">মোট লেনদেন: {processedPayments.length}টি</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-extrabold border-b border-gray-100">
                <th className="py-4 px-6">তারিখ</th>
                <th className="py-4 px-6">বিবরণ / ব্যাখ্যা</th>
                <th className="py-4 px-6">ব্যবসায়িক খাত</th>
                <th className="py-4 px-6">সংশ্লিষ্ট পক্ষ (Entity)</th>
                <th className="py-4 px-6">হিসাব অ্যাকাউন্ট</th>
                <th className="py-4 px-6">লেনদেন মাধ্যম</th>
                <th className="py-4 px-6 text-right">টাকার পরিমাণ</th>
                {role === "admin" && <th className="py-4 px-6 text-center no-print">একশন</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              <AnimatePresence mode="popLayout">
                {paginatedPayments.map((p, idx) => {
                  const acc = accounts.find(a => a.id === p.accountId);
                  const entity = getEntityDetails(p.entityId, p.category, p.description);
                  const EntityIcon = entity.icon;

                  return (
                    <motion.tr 
                      key={p.id} 
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18, delay: Math.min(idx * 0.02, 0.15) }}
                      className="hover:bg-slate-50/50 transition-all font-medium"
                    >
                      {/* Date */}
                      <td className="py-4 px-6 text-gray-500 font-mono">
                        {p.date || "N/A"}
                      </td>

                      {/* Description */}
                      <td className="py-4 px-6">
                        <div className="space-y-0.5">
                          <p className="font-bold text-gray-950">{p.description || "—"}</p>
                          <p className="text-[9px] text-gray-400 flex items-center gap-1 select-none">
                            <span>তৈরি করেছেন: {p.createdBy || "System"}</span>
                            {p.status === "pending_approval" && (
                              <span className="bg-amber-100 text-amber-800 text-[8px] font-extrabold px-1.5 py-0.2 rounded border border-amber-200">Pending Approval</span>
                            )}
                          </p>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-6">
                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-extrabold tracking-wide uppercase border border-indigo-100/50">
                          {p.category}
                        </span>
                      </td>

                      {/* Associated Entity */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-slate-100 text-slate-500 rounded-lg">
                            <EntityIcon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{entity.name}</p>
                            <p className="text-[9px] text-gray-400 font-medium">{entity.type}</p>
                          </div>
                        </div>
                      </td>

                      {/* Account Used */}
                      <td className="py-4 px-6 font-bold text-[#1e1b4b]">
                        {acc ? acc.name : "Default Cash Collection"}
                      </td>

                      {/* Method */}
                      <td className="py-4 px-6">
                        <span className="px-2 py-0.5 bg-slate-100 border text-gray-600 rounded-md font-extrabold text-[9px] uppercase font-mono">
                          {p.method || "Cash"}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-6 text-right">
                        <span className={`text-[13px] font-black tracking-tight ${p.type === 'in' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {p.type === 'in' ? '+' : '-'}{formatCurrency(p.amount || 0)}
                        </span>
                      </td>

                      {/* Actions if Admin */}
                      {role === "admin" && (
                        <td className="py-4 px-6 text-center no-print">
                          <button 
                            onClick={() => handleDeletePayment(p.id, p.description)}
                            title="রেকর্ড মুছে ফেলুন"
                            className="p-2 text-gray-450 hover:text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-50 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </motion.tr>
                  );
                })}
              </AnimatePresence>

              {processedPayments.length === 0 && (
                <tr>
                  <td colSpan={role === "admin" ? 8 : 7} className="py-24 text-center text-gray-300">
                    <TrendingUp className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm font-bold">কোন উপযুক্ত লেনদেনের ইতিহাস খুঁজে পাওয়া যায়নি।</p>
                    <p className="text-xs text-gray-400 mt-1">অনুগ্রহ করে ফিন্যান্স ট্যাবে গিয়ে নতুন ক্যাশ বা ব্যাংক ট্রানজেকশন এন্ট্রি যোগ করুন অথবা ফিল্টার পরিবর্তন করুন।</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Panel */}
        {processedPayments.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-6 border-t border-gray-100 bg-slate-50 gap-4 no-print select-none">
            <span className="text-[11px] font-bold text-gray-500">
              পেজ {currentPage} (সর্বমোট {totalPages} এর মধ্যে) | মোট ফিল্টারকৃত পেমেন্ট রেকর্ডস: {processedPayments.length}টি
            </span>
            
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 bg-white border border-gray-250 rounded-xl hover:bg-slate-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              
              {/* Visible index pointers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((p, idx, arr) => {
                  const showingEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                  return (
                    <Fragment key={p}>
                      {showingEllipsis && <span className="text-gray-400 text-xs px-1 select-none">...</span>}
                      <button
                        onClick={() => handlePageChange(p)}
                        className={`w-9 h-9 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                          currentPage === p 
                            ? "bg-indigo-650 text-white border border-indigo-650" 
                            : "bg-white border border-gray-250 hover:bg-slate-100 text-gray-700"
                        }`}
                      >
                        {p}
                      </button>
                    </Fragment>
                  );
                })}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 bg-white border border-gray-250 rounded-xl hover:bg-slate-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
