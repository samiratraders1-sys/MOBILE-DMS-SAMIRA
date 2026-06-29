import React, { useState, useMemo } from "react";
import { 
  FileText, Search, Trash2, Calendar, ShieldCheck, CheckCircle2, 
  XCircle, Filter, Download, User, ArrowDownAz, RefreshCw, AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";

interface ActivityLogProps {
  logs: any[];
  onClearLogs?: () => Promise<void>;
  role: string;
  userEmail: string;
}

export default function ActivityLogView({ logs, onClearLogs, role, userEmail }: ActivityLogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | "delete" | "approve" | "reject" | "inventory">("all");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [clearing, setClearing] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const uniqueUsers = useMemo(() => {
    const users = new Set(logs.map(log => log.userEmail).filter(Boolean));
    return Array.from(users);
  }, [logs]);

  // Parse temporal timestamps resiliently
  const getLogDateObject = (createdAt: any): Date | null => {
    if (!createdAt) return null;
    let d: Date;
    if (createdAt && typeof createdAt === "object") {
      if (typeof createdAt.toDate === "function") {
        d = createdAt.toDate();
      } else if (typeof createdAt.seconds === "number") {
        d = new Date(createdAt.seconds * 1000);
      } else {
        d = new Date();
      }
    } else {
      d = new Date(createdAt);
    }
    return isNaN(d.getTime()) ? null : d;
  };

  const formatLogDate = (createdAt: any) => {
    const d = getLogDateObject(createdAt);
    if (!d) return "N/A";
    return d.toLocaleString("bn-BD", {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Helper for quick selectors
  const handleQuickRange = (range: "today" | "yesterday" | "7days" | "30days") => {
    const todayStr = new Date().toISOString().split("T")[0];
    if (range === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (range === "yesterday") {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      setStartDate(yesterdayStr);
      setEndDate(yesterdayStr);
    } else if (range === "7days") {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      const pastStr = past.toISOString().split("T")[0];
      setStartDate(pastStr);
      setEndDate(todayStr);
    } else if (range === "30days") {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      const pastStr = past.toISOString().split("T")[0];
      setStartDate(pastStr);
      setEndDate(todayStr);
    }
  };

  // Log filter computations
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // 1. Search Query filter (matches details, userEmail, actionType)
      const matchesSearch = 
        (log.details || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.userEmail || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.actionType || "").toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // 2. User filter
      if (selectedUser !== "all" && log.userEmail !== selectedUser) return false;

      // 3. Action Type Filter Groupings
      let matchesType = true;
      if (selectedType === "delete") {
        matchesType = log.actionType === "delete_record";
      } else if (selectedType === "inventory") {
        matchesType = log.actionType === "modify_inventory";
      } else if (selectedType === "approve") {
        matchesType = (log.actionType || "").startsWith("approve_");
      } else if (selectedType === "reject") {
        matchesType = (log.actionType || "").startsWith("reject_");
      }
      if (!matchesType) return false;

      // 4. Date Range filter (inclusive)
      const logDate = getLogDateObject(log.createdAt);
      if (startDate || endDate) {
        if (!logDate) return false;
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (logDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (logDate > end) return false;
        }
      }

      return true;
    });
  }, [logs, searchQuery, selectedType, startDate, endDate]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = logs.length;
    const deletes = logs.filter(l => l.actionType === "delete_record").length;
    const inventory = logs.filter(l => l.actionType === "modify_inventory").length;
    const approvals = logs.filter(l => (l.actionType || "").startsWith("approve_")).length;

    return { total, deletes, inventory, approvals };
  }, [logs]);

  // Export logs to CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error("রপ্তানি করার জন্য কোনো রেকর্ড নেই");
      return;
    }

    try {
      const headers = ["Date & Time", "User Email", "Action Group", "Details (Bengali)", "Doc Reference ID"];
      const rows = filteredLogs.map(log => [
        formatLogDate(log.createdAt).replace(/,/g, " "),
        log.userEmail || "unknown",
        log.actionType || "general",
        (log.details || "").replace(/,/g, " "),
        log.recordId || "N/A"
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map(e => e.join(","))
      ].join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `samira_traders_activity_log_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("অ্যাক্টিভিটি লগ সফলভাবে CSV ফাইল হিসেবে ডাউনলোড হয়েছে");
    } catch (e: any) {
      toast.error("CSV ব্যাকআপ ডাউনলোডে সমস্যা হয়েছে: " + e.message);
    }
  };

  // Admin clear handler
  const handleClearHistory = async () => {
    if (userEmail !== "samiratraders1@gmail.com") {
      toast.error("শুধুমাত্র হেড এডমিনের কাছে হিস্ট্রি ডিলিট করার অনুমতি রয়েছে");
      return;
    }

    const doubleCheck = window.confirm("আপনি কি নিশ্চিতভাবে সম্পূর্ণ অ্যাক্টিভিটি হিস্ট্রি ডিলিট করতে চান?\nএই রেকর্ড উদ্ধার করা সম্ভব নয়।");
    if (!doubleCheck) return;

    setClearing(true);
    try {
      if (onClearLogs) {
        await onClearLogs();
        toast.success("সমস্ত অ্যাক্টিভিটি লগ সফলভাবে মুছে ফেলা হয়েছে");
      }
    } catch (err: any) {
      toast.error("লগ ক্লিয়ার করতে সমস্যা হয়েছে: " + err.message);
    } finally {
      setClearing(false);
    }
  };

  // Badge styles helper
  const getBadgeStyles = (action: string) => {
    const act = action || "";
    if (act === "delete_record") {
      return "bg-rose-50 text-rose-700 border-rose-250";
    }
    if (act === "modify_inventory") {
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    }
    if (act.startsWith("approve_")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (act.startsWith("reject_")) {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  const getActionLabel = (action: string) => {
    const act = action || "";
    if (act === "delete_record") return "রেকর্ড ডিলিট";
    if (act === "modify_inventory") return "ইনভেন্টরি পণ্য";
    if (act.startsWith("approve_")) return "অনুমোদন";
    if (act.startsWith("reject_")) return "বাতিল";
    return "সাধারণ";
  };

  return (
    <div className="space-y-6 font-sans">
      {/* View Header Card */}
      <div className="bg-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl md:text-3xl font-black mb-2 flex items-center gap-3">
              <FileText className="w-8 h-8 text-emerald-400" />
              অডিট ট্রেইল ও নিরাপত্তা অ্যাক্টিভিটি লগ (Security Audit Trails)
            </h2>
            <p className="text-slate-400 text-xs md:text-sm max-w-2xl leading-relaxed">
              সিস্টেমের গোপনীয়তা নিশ্চিত করতে এবং ডিলিট, সেলস অনুমোদন বা পণ্য ইনভেন্টরি পরিবর্তনের মতো সংবেদনশীল কার্যাবলী রিয়েল-টাইমে নজরদারী করুন।
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5 shrink-0">
            <button
              onClick={handleExportCSV}
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-md cursor-pointer flex items-center gap-2 transition-all"
            >
              <Download className="w-4 h-4" /> CSV হিসেবে ব্যাকআপ
            </button>
            {userEmail === "samiratraders1@gmail.com" && (
              <button
                disabled={clearing || logs.length === 0}
                onClick={handleClearHistory}
                className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-md cursor-pointer flex items-center gap-2 transition-all"
              >
                {clearing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                হিস্ট্রি মুছুন
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Blocks */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border shadow-xs flex flex-col justify-between">
          <span className="text-slate-400 text-xs font-extrabold block">সর্বমোট কার্যাবলী (Total Actions)</span>
          <div className="flex justify-between items-end mt-2">
            <span className="text-2xl font-black text-slate-800">{stats.total} টি</span>
            <span className="p-1 px-2.5 bg-slate-50 text-slate-600 border border-slate-100 rounded-lg text-[10px] font-bold">লগ ডেটা</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border shadow-xs flex flex-col justify-between">
          <span className="text-rose-500 text-xs font-extrabold block">রেকর্ড ডিলিট (Record Deletions)</span>
          <div className="flex justify-between items-end mt-2">
            <span className="text-2xl font-black text-rose-600">{stats.deletes} টি</span>
            <span className="p-1 px-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg text-[10px] font-bold">সংবেদনশীল</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border shadow-xs flex flex-col justify-between">
          <span className="text-indigo-500 text-xs font-extrabold block">ইনভেন্টরি পরিবর্তন (Stock Variations)</span>
          <div className="flex justify-between items-end mt-2">
            <span className="text-2xl font-black text-indigo-600">{stats.inventory} বার</span>
            <span className="p-1 px-2.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg text-[10px] font-bold">পণ্য স্টক</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border shadow-xs flex flex-col justify-between">
          <span className="text-emerald-500 text-xs font-extrabold block">অ্যাডমিন অনুমোদন (Admin Approvals)</span>
          <div className="flex justify-between items-end mt-2">
            <span className="text-2xl font-black text-emerald-600">{stats.approvals} বার</span>
            <span className="p-1 px-2.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[10px] font-bold">অনুমোদিত</span>
          </div>
        </div>
      </div>

      {/* Logs Controls (Search & Category Filters & Date Range Picker) */}
      <div className="bg-white rounded-3xl p-6 border shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ইউজার ইমেইল, বিবরণ বা রেকর্ড আইডি খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-none bg-slate-50/50 text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all"
            />
          </div>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="py-3 px-4 border rounded-2xl bg-slate-50/50 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-none transition-all cursor-pointer"
          >
            <option value="all">সব ইউজার</option>
            {uniqueUsers.map(user => (
              <option key={user} value={user}>{user}</option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedType("all")}
              className={`py-2 px-3.5 rounded-xl text-xs font-extrabold transition-all border cursor-pointer ${
                selectedType === "all"
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              সব ধরণের
            </button>
            <button
              onClick={() => setSelectedType("delete")}
              className={`py-2 px-3.5 rounded-xl text-xs font-extrabold transition-all border cursor-pointer ${
                selectedType === "delete"
                  ? "bg-rose-600 border-rose-600 text-white shadow-xs"
                  : "bg-white border-slate-200 text-rose-500 hover:bg-rose-50/50"
              }`}
            >
              মুছে ফেলা (Deletes)
            </button>
            <button
              onClick={() => setSelectedType("inventory")}
              className={`py-2 px-3.5 rounded-xl text-xs font-extrabold transition-all border cursor-pointer ${
                selectedType === "inventory"
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                  : "bg-white border-slate-200 text-indigo-500 hover:bg-indigo-50/50"
              }`}
            >
              ইনভেন্টরি পরিবর্তন
            </button>
            <button
              onClick={() => setSelectedType("approve")}
              className={`py-2 px-3.5 rounded-xl text-xs font-extrabold transition-all border cursor-pointer ${
                selectedType === "approve"
                  ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                  : "bg-white border-slate-200 text-emerald-500 hover:bg-emerald-50/50"
              }`}
            >
              অনুমোদন (Approvals)
            </button>
            <button
              onClick={() => setSelectedType("reject")}
              className={`py-2 px-3.5 rounded-xl text-xs font-extrabold transition-all border cursor-pointer ${
                selectedType === "reject"
                  ? "bg-amber-600 border-amber-600 text-white shadow-xs"
                  : "bg-white border-slate-200 text-amber-500 hover:bg-amber-50/50"
              }`}
            >
              রিজেক্ট / বাতিলকরণ
            </button>
          </div>
        </div>

        {/* Date Range Picker Control Panel */}
        <div className="bg-slate-50 border border-slate-150/80 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3.5 w-full md:w-auto">
            <div className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-wider">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>সময়কাল ফিল্টার (Date Range):</span>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl p-2 px-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 cursor-pointer"
              />
              <span className="text-xs text-slate-400 font-bold">থেকে</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl p-2 px-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 cursor-pointer"
              />
            </div>

            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="text-[10px] text-rose-600 hover:text-white font-extrabold bg-rose-50 hover:bg-rose-605 border border-rose-200 p-2 px-3 rounded-lg transition-all cursor-pointer flex items-center gap-1"
              >
                রিসেট (Reset)
              </button>
            )}
          </div>

          {/* Quick Option Buttons */}
          <div className="flex flex-wrap gap-1.5 self-stretch md:self-auto justify-start md:justify-end">
            <button
              onClick={() => handleQuickRange("today")}
              className={`px-3 py-1.5 text-[10px] font-bold border rounded-lg cursor-pointer transition-all ${
                startDate === new Date().toISOString().split("T")[0] && endDate === new Date().toISOString().split("T")[0]
                  ? "bg-indigo-600 text-white border-indigo-600 font-extrabold"
                  : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-705"
              }`}
            >
              আজকে (Today)
            </button>
            <button
              onClick={() => handleQuickRange("yesterday")}
              className="px-3 py-1.5 text-[10px] font-bold bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-705 rounded-lg cursor-pointer transition-all"
            >
              গতকাল (Yesterday)
            </button>
            <button
              onClick={() => handleQuickRange("7days")}
              className="px-3 py-1.5 text-[10px] font-bold bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-705 rounded-lg cursor-pointer transition-all"
            >
              শেষ ৭ দিন (7 Days)
            </button>
            <button
              onClick={() => handleQuickRange("30days")}
              className="px-3 py-1.5 text-[10px] font-bold bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-705 rounded-lg cursor-pointer transition-all"
            >
              শেষ ৩০ দিন (30 Days)
            </button>
          </div>
        </div>

        {/* Trail Timeline */}
        {filteredLogs.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed rounded-3xl text-slate-400 font-semibold flex flex-col items-center justify-center gap-2">
            <AlertCircle className="w-10 h-10 text-slate-300" />
            <span>কোনো অডিট লগ রেকর্ড খুঁজে পাওয়া যায়নি</span>
          </div>
        ) : (
          <div className="overflow-hidden border border-slate-100 rounded-2xl">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/60 font-black text-[11px] text-slate-500 uppercase tracking-wider">
                    <th className="p-4 w-48">তারিখ ও সময় (Date & Time)</th>
                    <th className="p-4 w-52">কর্তা (Operator User)</th>
                    <th className="p-4 w-32">ধরণ</th>
                    <th className="p-4">কার্যকর বিবরণ (Audit Details)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {filteredLogs.map((log, index) => (
                    <tr key={`${log.id}-${index}`} className="hover:bg-slate-50/30 transition-all">
                      <td className="p-4 font-mono text-slate-500 whitespace-nowrap">
                        {formatLogDate(log.createdAt)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-100 border text-slate-705 flex items-center justify-center font-extrabold text-[10px]">
                            {log.userEmail ? log.userEmail.slice(0,2).toUpperCase() : "?"}
                          </div>
                          <div>
                            <span className="block truncate max-w-[180px] font-mono font-bold text-slate-800">{log.userEmail}</span>
                            <span className="block text-[8px] font-black text-slate-400 tracking-wider">ID: {log.userId?.slice(0, 8)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-md border text-[9.5px] font-black tracking-wide ${getBadgeStyles(log.actionType)}`}>
                          {getActionLabel(log.actionType)}
                        </span>
                      </td>
                      <td className="p-4 leading-normal font-bold text-slate-900">
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards Stack */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredLogs.map((log, index) => (
                <div key={`${log.id}-${index}`} className="p-5 hover:bg-slate-50/25 space-y-3">
                  <div className="flex justify-between items-start gap-4">
                    <span className="font-mono text-[10px] text-slate-405 font-bold block pt-0.5">
                      {formatLogDate(log.createdAt)}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded border text-[8px] font-black tracking-wide shrink-0 ${getBadgeStyles(log.actionType)}`}>
                      {getActionLabel(log.actionType)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-black text-slate-900 leading-normal mb-1">{log.details}</span>
                    <div className="flex items-center gap-1 text-[9px] text-slate-450 font-bold bg-slate-50 p-2 rounded-xl border border-dashed border-slate-100">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{log.userEmail}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
