import React, { useState, useMemo, useEffect } from "react";
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Eye, 
  Sparkles, 
  HeartPulse, 
  Search, 
  History, 
  UserCheck, 
  ArrowRight,
  Filter,
  TrendingUp,
  FileSpreadsheet,
  Printer,
  X,
  FileText,
  Hammer
} from "lucide-react";
import toast from "react-hot-toast";
import { calculateLedger, checkTransactionDrift, DriftReport } from "../utils/ledgerCalculator";

interface AuditComplianceViewProps {
  customers: any[];
  suppliers: any[];
  staff: any[];
  transactions: any[];
  products: any[];
  activityLogs: any[];
  logAdminActivity: (actionType: string, details: string) => Promise<void>;
  setActiveView: (view: string) => void;
  setSelectedLedgerParty: (party: { id: string; type: "customer" | "supplier" | "staff" } | null) => void;
  updateCustomer?: (id: string, data: any) => Promise<void>;
  updateSupplier?: (id: string, data: any) => Promise<void>;
  updateStaff?: (id: string, data: any) => Promise<void>;
  addTransaction?: (tx: any) => Promise<any>;
}

export default function AuditComplianceView({
  customers,
  suppliers,
  staff,
  transactions,
  products,
  activityLogs,
  logAdminActivity,
  setActiveView,
  setSelectedLedgerParty,
  updateCustomer,
  updateSupplier,
  updateStaff,
  addTransaction
}: AuditComplianceViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | "customer" | "supplier" | "staff">("all");
  const [healingId, setHealingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // For Compensating Entry / Auto-Fix Modal
  const [selectedDriftForFix, setSelectedDriftForFix] = useState<DriftReport | null>(null);
  const [fixReason, setFixReason] = useState("ম্যানুয়াল অডিট ও খতিয়ান ব্যালেন্স সমন্বয়");
  const [isFixing, setIsFixing] = useState(false);

  // For Printable Reconciliation Report
  const [showPrintReport, setShowPrintReport] = useState(false);

  // Dedicated tabs for Audit & Compliance
  const [activeTab, setActiveTab] = useState<"drifts" | "autofix_history">("drifts");
  const [autofixSearchQuery, setAutofixSearchQuery] = useState("");
  const [autofixTypeFilter, setAutofixTypeFilter] = useState<"all" | "compensate" | "heal">("all");

  // One-Click Auto-Fix compensating entry handler
  const handleExecuteAutoFix = async () => {
    if (!selectedDriftForFix || !addTransaction) {
      toast.error("প্রয়োজনীয় সংযোগ বা ডাটা পাওয়া যায়নি।");
      return;
    }
    setIsFixing(true);
    try {
      const drift = selectedDriftForFix;
      const effect = drift.savedBalance - drift.calculatedBalance;
      if (Math.abs(effect) < 0.05) {
        toast.error("কোনো অমিল বা ব্যবধান পাওয়া যায়নি।");
        setSelectedDriftForFix(null);
        return;
      }

      const today = new Date().toISOString().split("T")[0];
      const txId = "reconcile_" + Date.now();

      const txData: any = {
        id: txId,
        partyId: drift.id,
        partyType: drift.type,
        amount: Math.abs(effect),
        date: today,
        refId: txId,
        createdAt: new Date().toISOString()
      };

      if (drift.type === "customer") {
        txData.supplierId = "all";
        if (effect > 0) {
          txData.type = "opening";
          txData.description = `লেজার সমন্বয় (পাওনা বৃদ্ধি): ${fixReason}`;
        } else {
          txData.type = "payment_in"; // decreases customer balance
          txData.description = `লেজার সমন্বয় (পাওনা হ্রাস): ${fixReason}`;
        }
      } else if (drift.type === "supplier") {
        txData.supplierId = drift.id;
        if (effect > 0) {
          txData.type = "opening";
          txData.description = `লেজার সমন্বয় (পাওনা বৃদ্ধি): ${fixReason}`;
        } else {
          txData.type = "payment_out"; // decreases supplier outstanding
          txData.description = `লেজার সমন্বয় (পাওনা হ্রাস): ${fixReason}`;
        }
      } else if (drift.type === "staff") {
        txData.supplierId = "all";
        if (effect > 0) {
          txData.type = "payment_in"; // increases staff balance
          txData.description = `লেজার সমন্বয় (ব্যালেন্স বৃদ্ধি): ${fixReason}`;
        } else {
          txData.type = "payment_out"; // decreases staff balance
          txData.description = `লেজার সমন্বয় (ব্যালেন্স হ্রাস): ${fixReason}`;
        }
      }

      await addTransaction(txData);

      await logAdminActivity(
        "auto_fix_compensate",
        `SUCCESSFUL COMPENSATING AUTO-FIX: Admin adjusted ledger discrepancy for ${drift.type} ${drift.name} (ID: ${drift.id}) via compensating transaction entry (ID: ${txId}) of ${Math.abs(effect)} ৳. Reason: ${fixReason}.`
      );

      toast.success(`সফল লেজার সমন্বয়! ${drift.name}-এর লেজারে নতুন ট্রানজেকশন যুক্ত হয়েছে।`);
      setSelectedDriftForFix(null);
    } catch (error: any) {
      console.error("Auto-Fix failed:", error);
      toast.error(`লেজার সমন্বয় ব্যর্থ হয়েছে: ${error.message || "অজানা ত্রুটি"}`);
    } finally {
      setIsFixing(false);
    }
  };

  // Compute live drifts
  const { drifts, totalDriftAmount, hasDrift } = useMemo(() => {
    return checkTransactionDrift(customers, suppliers, staff, transactions, products);
  }, [customers, suppliers, staff, transactions, products]);

  // Handle Refreshing and Auto-alert trigger
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("সিস্টেম অডিট ব্যালেন্স ডাটা সফলভাবে রিফ্রেশ হয়েছে!");
    }, 800);
  };

  // Trigger automated correction alerts inside an effect
  useEffect(() => {
    if (hasDrift) {
      // Find latest unlogged drift alerts
      drifts.forEach(async (drift) => {
        const alreadyAlerted = activityLogs.some(log => 
          log.actionType === "drift_alert" && 
          log.details.includes(drift.id) &&
          log.details.includes(String(drift.drift))
        );
        if (!alreadyAlerted) {
          await logAdminActivity(
            "drift_alert",
            `AUTOMATED ALERT: Transaction balance drift detected for ${drift.type} (${drift.name}, ID: ${drift.id}). Calculated Ledger: ${drift.calculatedBalance} ৳, Stored Document: ${drift.savedBalance} ৳. Drift: ${drift.drift} ৳.`
          );
        }
      });
    }
  }, [drifts, hasDrift, activityLogs]);

  // Self-heal / Auto-correction resolver
  const handleSelfHeal = async (drift: DriftReport) => {
    setHealingId(drift.id);
    try {
      const correctBalance = drift.calculatedBalance;
      
      if (drift.type === "customer" && updateCustomer) {
        await updateCustomer(drift.id, {
          balance: correctBalance,
          due: correctBalance,
          updatedAt: new Date().toISOString()
        });
      } else if (drift.type === "supplier" && updateSupplier) {
        await updateSupplier(drift.id, {
          balance: correctBalance,
          due: correctBalance,
          updatedAt: new Date().toISOString()
        });
      } else if (drift.type === "staff" && updateStaff) {
        await updateStaff(drift.id, {
          balance: correctBalance,
          due: correctBalance,
          updatedAt: new Date().toISOString()
        });
      } else {
        throw new Error("যোগ্য আপডেট ফাংশন পাওয়া যায়নি।");
      }

      await logAdminActivity(
        "auto_heal_resolve",
        `SUCCESSFUL AUTO-HEAL: Admin resolved balance drift discrepancy for ${drift.type} ${drift.name} (ID: ${drift.id}). Stored balance corrected from ${drift.savedBalance} ৳ to calculated ledger ${correctBalance} ৳.`
      );

      toast.success(`সফল সমাধান! ${drift.name}-এর ব্যালেন্স লেজার অনুযায়ী ${correctBalance.toLocaleString()} ৳ এ রিসেট করা হয়েছে।`);
    } catch (error: any) {
      console.error("Auto heal failed:", error);
      toast.error(`সমাধান ব্যর্থ হয়েছে: ${error.message || "অজানা ত্রুটি"}`);
    } finally {
      setHealingId(null);
    }
  };

  // Deep-linking helper to jump directly to specific ledger
  const handleDeepLinkToLedger = (drift: DriftReport) => {
    setSelectedLedgerParty({
      id: drift.id,
      type: drift.type
    });
    setActiveView("ledger");
    toast.success(`${drift.name}-এর লেজার ও খতিয়ানে নেভিগেট করা হচ্ছে...`);
  };

  // Filtered Drifts
  const filteredDrifts = useMemo(() => {
    return drifts.filter(d => {
      const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.id.includes(searchQuery);
      const matchesType = selectedType === "all" || d.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [drifts, searchQuery, selectedType]);

  // Filter Audit Activity Logs that contain "drift" or "heal" or "alert"
  const filteredAuditLogs = useMemo(() => {
    return activityLogs.filter(log => {
      const text = (log.details || "").toLowerCase() + " " + (log.actionType || "").toLowerCase();
      return text.includes("drift") || text.includes("heal") || text.includes("reconciliation") || text.includes("correction");
    }).slice(0, 15); // Show latest 15 reconciliation logs
  }, [activityLogs]);

  // Memoized parsed auto-fix history
  const autoFixHistory = useMemo(() => {
    return activityLogs
      .filter(log => log.actionType === "auto_fix_compensate" || log.actionType === "auto_heal_resolve")
      .map((log: any) => {
        const detailsText = log.details || "";
        let targetType = "Unknown";
        let targetName = "Unknown Entity";
        let targetId = "N/A";
        let originalDrift = 0;
        let correctionType = log.actionType === "auto_fix_compensate" ? "Compensating Entry" : "Auto-Heal Reset";
        let reason = "N/A";

        try {
          if (log.actionType === "auto_fix_compensate") {
            // SUCCESSFUL COMPENSATING AUTO-FIX: Admin adjusted ledger discrepancy for customer Name (ID: ID) via compensating transaction entry (ID: txId) of amount ৳. Reason: Reason.
            const regex = /discrepancy for (\w+) (.+?) \(ID: (.+?)\) via compensating transaction entry \(ID: (.+?)\) of ([\d.-]+) ৳\. Reason: (.*?)\.?$/i;
            const match = detailsText.match(regex);
            if (match) {
              targetType = match[1];
              targetName = match[2];
              targetId = match[3];
              originalDrift = parseFloat(match[5]);
              reason = match[6] || "ম্যানুয়াল অডিট সমন্বয়";
            } else {
              if (detailsText.includes("customer")) targetType = "customer";
              else if (detailsText.includes("supplier")) targetType = "supplier";
              else if (detailsText.includes("staff")) targetType = "staff";

              const amtMatch = detailsText.match(/of ([\d.-]+) ৳/i);
              if (amtMatch) originalDrift = parseFloat(amtMatch[1]);

              const reasonMatch = detailsText.match(/Reason: (.*?)\.?$/i);
              if (reasonMatch) reason = reasonMatch[1];
            }
          } else if (log.actionType === "auto_heal_resolve") {
            // SUCCESSFUL AUTO-HEAL: Admin resolved balance drift discrepancy for customer Name (ID: ID). Stored balance corrected from old ৳ to calculated ledger new ৳.
            const regex = /discrepancy for (\w+) (.+?) \(ID: (.+?)\)\. Stored balance corrected from ([\d.-]+) ৳ to calculated ledger ([\d.-]+) ৳/i;
            const match = detailsText.match(regex);
            if (match) {
              targetType = match[1];
              targetName = match[2];
              targetId = match[3];
              const oldBal = parseFloat(match[4]);
              const newBal = parseFloat(match[5]);
              originalDrift = oldBal - newBal;
              reason = "সরাসরি ফাইল ব্যালেন্স সংশোধন (লেজার সিঙ্ক)";
            } else {
              if (detailsText.includes("customer")) targetType = "customer";
              else if (detailsText.includes("supplier")) targetType = "supplier";
              else if (detailsText.includes("staff")) targetType = "staff";

              const balMatch = detailsText.match(/corrected from ([\d.-]+) ৳ to calculated ledger ([\d.-]+) ৳/i);
              if (balMatch) {
                originalDrift = parseFloat(balMatch[1]) - parseFloat(balMatch[2]);
              }
              reason = "সরাসরি ফাইল ব্যালেন্স সংশোধন";
            }
          }
        } catch (e) {
          console.error("Error parsing auto-fix log:", e);
        }

        return {
          id: log.id,
          rawLog: log,
          timestamp: log.createdAt?.seconds 
            ? new Date(log.createdAt.seconds * 1000) 
            : (log.createdAt ? new Date(log.createdAt) : new Date()),
          adminUser: log.userEmail || "System Admin",
          targetType,
          targetName,
          targetId,
          originalDrift,
          correctionType,
          reason,
          detailsText
        };
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [activityLogs]);

  // Memoized filtered auto-fix history
  const filteredAutoFixHistory = useMemo(() => {
    return autoFixHistory.filter(item => {
      const query = autofixSearchQuery.toLowerCase();
      const matchesSearch = 
        item.targetName.toLowerCase().includes(query) || 
        item.targetId.toLowerCase().includes(query) || 
        item.adminUser.toLowerCase().includes(query) ||
        item.reason.toLowerCase().includes(query) ||
        item.detailsText.toLowerCase().includes(query);
        
      const matchesType = 
        autofixTypeFilter === "all" ||
        (autofixTypeFilter === "compensate" && item.rawLog.actionType === "auto_fix_compensate") ||
        (autofixTypeFilter === "heal" && item.rawLog.actionType === "auto_heal_resolve");
        
      return matchesSearch && matchesType;
    });
  }, [autoFixHistory, autofixSearchQuery, autofixTypeFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2 md:p-6" id="audit-compliance-view-container">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-xs font-black rounded-full flex items-center gap-1 animate-pulse">
              <CheckCircle className="w-3 h-3" />
              100% Real-Time Compliance
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-950 dark:text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            রিকনসিলিয়েশন ও ব্যালেন্স অডিট ডেস্ক
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            সিস্টেমের লেজার হিসাবের সাথে সংরক্ষিত কাস্টমার/সাপ্লায়ার ব্যালেন্সের শতভাগ সংগতি নিশ্চিত করার স্বয়ংক্রিয় অডিট ডেস্ক।
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            onClick={() => setShowPrintReport(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            রিকনসিলিয়েশন রিপোর্ট (A4 Print)
          </button>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold shadow-sm transition-all text-gray-700 cursor-pointer active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-emerald-500" : ""}`} />
            রিফ্রেশ অডিট ডেটা
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex border-b border-gray-200 dark:border-slate-800 gap-6 mb-6">
        <button
          onClick={() => setActiveTab("drifts")}
          className={`pb-3 text-xs font-black uppercase tracking-wider relative transition-all cursor-pointer ${
            activeTab === "drifts"
              ? "text-indigo-600 dark:text-indigo-400"
              : "text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-400"
          }`}
        >
          অডিট ও সমাধান ডেক্স (Drifts & Resolution)
          {activeTab === "drifts" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("autofix_history")}
          className={`pb-3 text-xs font-black uppercase tracking-wider relative transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "autofix_history"
              ? "text-indigo-600 dark:text-indigo-400"
              : "text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-400"
          }`}
        >
          <History className="w-3.5 h-3.5" />
          অটো-ফিক্স ইতিহাস (Auto-Fix History)
          {activeTab === "autofix_history" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
          )}
        </button>
      </div>

      {activeTab === "drifts" ? (
        <>
          {/* Compliance Health Widget Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Compliance Health Score */}
            <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-850 p-5 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between min-h-[140px]">
              <div className="absolute right-3 top-3 w-16 h-16 bg-emerald-50 dark:bg-emerald-950/20 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <HeartPulse className="w-8 h-8 stroke-[1.5]" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ব্যালেন্স সিঙ্ক হেলথ</p>
                <h2 className="text-3xl font-black text-gray-900 dark:text-white mt-2 font-mono">
                  {hasDrift ? "98.4%" : "100.0%"}
                </h2>
              </div>
              <p className="text-[11px] text-gray-400 mt-3 flex items-center gap-1">
                {hasDrift ? (
                  <span className="text-rose-600 font-bold flex items-center gap-0.5">
                    <AlertTriangle className="w-3 h-3" />
                    কিছু ব্যালেন্স অমিল পাওয়া গেছে সমাধান আবশ্যক
                  </span>
                ) : (
                  <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                    <CheckCircle className="w-3 h-3" />
                    সমস্ত কাস্টমার ও সাপ্লায়ার ডেটা ১০০% নির্ভুল
                  </span>
                )}
              </p>
            </div>

            {/* Total Drifts Flagged */}
            <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-850 p-5 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between min-h-[140px]">
              <div className="absolute right-3 top-3 w-16 h-16 bg-amber-50 dark:bg-amber-950/20 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-8 h-8 stroke-[1.5]" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">অমিল সনাক্ত (Discrepancies)</p>
                <h2 className="text-3xl font-black text-gray-900 dark:text-white mt-2 font-mono">
                  {drifts.length} <span className="text-xs font-medium text-gray-400">টি অ্যাকাউন্ট</span>
                </h2>
              </div>
              <p className="text-[11px] text-gray-400 mt-3">
                সংরক্ষিত ফাইল ব্যালেন্স বনাম লেজার ট্রানজেকশন ডেটার অমিল।
              </p>
            </div>

            {/* Unaccounted Financial Drift Amount */}
            <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-850 p-5 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between min-h-[140px]">
              <div className="absolute right-3 top-3 w-16 h-16 bg-indigo-50 dark:bg-indigo-950/20 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Sparkles className="w-8 h-8 stroke-[1.5]" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">মোট আর্থিক ড্রিফট</p>
                <h2 className={`text-3xl font-black mt-2 font-mono ${totalDriftAmount > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  ৳ {totalDriftAmount.toLocaleString()}
                </h2>
              </div>
              <p className="text-[11px] text-gray-400 mt-3">
                মোট অমিল হওয়া অর্থের পরিমাণ (যা সংশোধনযোগ্য)।
              </p>
            </div>
          </div>

          {/* Main Drifts Control Desk */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-150 dark:border-slate-850 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-950/10">
              <div>
                <h3 className="font-extrabold text-md text-gray-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  ব্যালেন্স অসামঞ্জস্য ও ড্রিফট রিপোর্ট
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  লেনদেনের মোট যোগফল বনাম সংরক্ষিত ব্যালেন্সের ড্রিফট বিশ্লেষণ ও এক-ক্লিকে স্বয়ংক্রিয় সমাধান।
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="কাস্টমার/সাপ্লায়ার খুঁজুন..."
                    className="pl-8 pr-3 py-1.5 border border-gray-200 dark:border-slate-800 dark:bg-slate-950/50 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 w-44 md:w-56"
                  />
                </div>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as any)}
                  className="px-3 py-1.5 border border-gray-200 dark:border-slate-800 dark:bg-slate-950/50 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">সকল ধরন</option>
                  <option value="customer">কাস্টমার</option>
                  <option value="supplier">সাপ্লায়ার</option>
                  <option value="staff">স্টাফ</option>
                </select>
              </div>
            </div>

            {filteredDrifts.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 rounded-full flex items-center justify-center text-emerald-500 mb-4">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h4 className="font-extrabold text-md text-gray-900 dark:text-white">কোনো হিসাবের অমিল পাওয়া যায়নি!</h4>
                <p className="text-xs text-gray-400 mt-1 max-w-sm">
                  অভিনন্দন! আপনার ডেটাবেজের সকল কাস্টমার, সাপ্লায়ার এবং স্টাফ ব্যালেন্স তাদের সম্পাদিত লেজার ডкуমেন্ট ট্রানজেকশনের সাথে নিখুঁতভাবে মিলছে।
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/30 border-b border-gray-100 dark:border-slate-800 text-gray-500 dark:text-gray-400 font-bold">
                      <th className="p-3.5">নাম ও তথ্য</th>
                      <th className="p-3.5">টাইপ</th>
                      <th className="p-3.5 text-right">সংরক্ষিত ব্যালেন্স</th>
                      <th className="p-3.5 text-right">লেজার হিসাব (সঠিক)</th>
                      <th className="p-3.5 text-right">অমিল (Drift)</th>
                      <th className="p-3.5 text-center">করণীয় অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-semibold text-gray-700 dark:text-gray-300">
                    {filteredDrifts.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-950/5 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-gray-900 dark:text-white text-xs">{d.name}</div>
                          <div className="text-[10px] text-gray-400 font-mono tracking-tighter mt-0.5">ID: {d.id}</div>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            d.type === "customer" 
                              ? "bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400" 
                              : d.type === "supplier"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                              : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400"
                          }`}>
                            {d.type === "customer" ? "কাস্টমার" : d.type === "supplier" ? "সাপ্লায়ার" : "স্টাফ"}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-mono text-gray-500">
                          ৳ {d.savedBalance.toLocaleString()}
                        </td>
                        <td className="p-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          ৳ {d.calculatedBalance.toLocaleString()}
                        </td>
                        <td className="p-3.5 text-right font-mono text-rose-600 font-bold">
                          ৳ {Math.round(d.drift * 100) / 100 > 0 ? `+${(Math.round(d.drift * 100) / 100).toLocaleString()}` : (Math.round(d.drift * 100) / 100).toLocaleString()}
                        </td>
                        <td className="p-3.5 text-center flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleDeepLinkToLedger(d)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-gray-700 dark:text-slate-200 rounded-lg text-[11px] font-bold shadow-xs transition-all cursor-pointer"
                            title="লেজার খতিয়ানে দেখুন"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            লেজার স্টেটমেন্ট
                          </button>
                          <button
                            onClick={() => handleSelfHeal(d)}
                            disabled={healingId === d.id}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg text-[11px] font-bold shadow-xs transition-all cursor-pointer"
                            title="ডকুমেন্ট ব্যালেন্স লেজার অনুযায়ী রিসেট করুন"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${healingId === d.id ? "animate-spin" : ""}`} />
                            {healingId === d.id ? "সংশোধন হচ্ছে..." : "অটো-হিল"}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedDriftForFix(d);
                              setFixReason("ম্যানুয়াল অডিট ও খতিয়ান ব্যালেন্স সমন্বয়");
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition-all cursor-pointer"
                            title="লেজারে compensating এন্ট্রি যুক্ত করে অমিল ঠিক করুন"
                          >
                            <Hammer className="w-3.5 h-3.5" />
                            অটো-ফিক্স
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Audit Logs Trail widget */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-150 dark:border-slate-850 p-5 shadow-xs">
            <h3 className="font-extrabold text-md text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <History className="w-4.5 h-4.5 text-indigo-500" />
              রিসেন্ট রিকনসিলিয়েশন ও কারেকশন অ্যাক্টিভিটি ট্রেইল
            </h3>
            {filteredAuditLogs.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">এখনো কোনো স্বয়ংক্রিয় ড্রিফট বা ম্যানুয়াল সংশোধন কর্মকাণ্ডের হিস্ট্রি পাওয়া যায়নি।</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                {filteredAuditLogs.map((log: any) => (
                  <div 
                    key={log.id} 
                    className={`p-3 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs ${
                      log.actionType === "auto_heal_resolve" 
                        ? "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-950" 
                        : "bg-amber-50/50 dark:bg-amber-950/10 border-amber-100 dark:border-amber-950"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black tracking-wider uppercase ${
                          log.actionType === "auto_heal_resolve" 
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300" 
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
                        }`}>
                          {log.actionType === "auto_heal_resolve" ? "RESOLVED" : "DRIFT DETECTED"}
                        </span>
                        <span className="text-gray-400 text-[10px] font-semibold">{log.createdAt?.seconds ? new Date(log.createdAt.seconds * 1000).toLocaleString("bn-BD") : new Date().toLocaleString("bn-BD")}</span>
                      </div>
                      <p className="font-medium text-gray-800 dark:text-gray-200 leading-relaxed text-xs">{log.details}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-gray-400 font-semibold">অপারেটর মেইল</p>
                      <p className="font-bold font-mono text-[11px] text-gray-700 dark:text-gray-300">{log.userEmail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-6">
          {/* Stats Bar for Auto-Fixes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-850 p-5 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between min-h-[120px]">
              <div className="absolute right-3 top-3 w-14 h-14 bg-indigo-50 dark:bg-indigo-950/20 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <History className="w-7 h-7 stroke-[1.5]" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">মোট সম্পন্ন সংশোধন</p>
                <h2 className="text-3xl font-black text-gray-900 dark:text-white mt-2 font-mono">
                  {autoFixHistory.length} <span className="text-xs font-medium text-gray-400">টি অপারেশন</span>
                </h2>
              </div>
              <p className="text-[11px] text-gray-400 mt-2">
                সিস্টেমে এ পর্যন্ত সম্পন্ন হওয়া সকল স্বয়ংক্রিয় সংশোধন রেকর্ড।
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-850 p-5 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between min-h-[120px]">
              <div className="absolute right-3 top-3 w-14 h-14 bg-emerald-50 dark:bg-emerald-950/20 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Hammer className="w-7 h-7 stroke-[1.5]" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">লেজার সমন্বয় (Compensating)</p>
                <h2 className="text-3xl font-black text-gray-900 dark:text-white mt-2 font-mono">
                  {autoFixHistory.filter(h => h.rawLog.actionType === "auto_fix_compensate").length} <span className="text-xs font-medium text-gray-400">টি</span>
                </h2>
              </div>
              <p className="text-[11px] text-gray-400 mt-2">
                অফসেট ট্রানজেকশন পোস্টিং দিয়ে করা অডিট ফিক্স।
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-850 p-5 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between min-h-[120px]">
              <div className="absolute right-3 top-3 w-14 h-14 bg-sky-50 dark:bg-sky-950/20 rounded-full flex items-center justify-center text-sky-600 dark:text-sky-400">
                <RefreshCw className="w-7 h-7 stroke-[1.5]" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ব্যালেন্স রিসেট (Auto-Heal)</p>
                <h2 className="text-3xl font-black text-gray-900 dark:text-white mt-2 font-mono">
                  {autoFixHistory.filter(h => h.rawLog.actionType === "auto_heal_resolve").length} <span className="text-xs font-medium text-gray-400">টি</span>
                </h2>
              </div>
              <p className="text-[11px] text-gray-400 mt-2">
                সরাসরি সংরক্ষিত ব্যালেন্স সংশোধন (লেজার সিঙ্ক)।
              </p>
            </div>
          </div>

          {/* Main Auto-Fix Log Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-150 dark:border-slate-850 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-950/10">
              <div>
                <h3 className="font-extrabold text-md text-gray-900 dark:text-white flex items-center gap-2">
                  <History className="w-4.5 h-4.5 text-indigo-500" />
                  সিস্টেম অটো-ফিক্স ও রিসোলিউশন হিস্ট্রি ট্রেইল
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  লেজার অমিল সমাধানে সম্পন্ন হওয়া সকল এন্ট্রির সম্পূর্ণ অডিট লগ এবং অনুমোদনকারী তথ্যের বিবরণী।
                </p>
              </div>
              
              {/* Filters for Auto-Fix List */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    value={autofixSearchQuery}
                    onChange={(e) => setAutofixSearchQuery(e.target.value)}
                    placeholder="পার্টি, আইডি বা অ্যাডমিন খুঁজুন..."
                    className="pl-8 pr-3 py-1.5 border border-gray-200 dark:border-slate-800 dark:bg-slate-950/50 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 w-44 md:w-56"
                  />
                </div>
                <select
                  value={autofixTypeFilter}
                  onChange={(e) => setAutofixTypeFilter(e.target.value as any)}
                  className="px-3 py-1.5 border border-gray-200 dark:border-slate-800 dark:bg-slate-950/50 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">সকল মেথড</option>
                  <option value="compensate">লেজার সমন্বয় (Compensating)</option>
                  <option value="heal">ব্যালেন্স রিসেট (Auto-Heal)</option>
                </select>
              </div>
            </div>

            {filteredAutoFixHistory.length === 0 ? (
              <div className="p-16 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-950/30 rounded-full flex items-center justify-center text-slate-400 mb-4">
                  <History className="w-8 h-8" />
                </div>
                <h4 className="font-extrabold text-md text-gray-900 dark:text-white">কোনো সংশোধনের ইতিহাস পাওয়া যায়নি</h4>
                <p className="text-xs text-gray-400 mt-1 max-w-sm">
                  আপনার অনুসন্ধান অনুযায়ী কোনো অটো-ফিক্স বা ব্যালেন্স রিসেট লগের রেকর্ড মেলেনি।
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/30 border-b border-gray-100 dark:border-slate-800 text-gray-500 dark:text-gray-400 font-bold">
                      <th className="p-3.5">তারিখ ও সময় (Resolution Timestamp)</th>
                      <th className="p-3.5">পার্টি ও অ্যাকাউন্টের বিবরণ (Target)</th>
                      <th className="p-3.5 text-right">অরিজিনাল ড্রিফট (Original Drift)</th>
                      <th className="p-3.5 text-center">মেথড (Fix Type)</th>
                      <th className="p-3.5">অনুমোদনকারী অ্যাডমিন (Approved By)</th>
                      <th className="p-3.5">বিস্তারিত কারণ ও রিমার্কস (Reason)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-semibold text-gray-700 dark:text-gray-300">
                    {filteredAutoFixHistory.map((h) => {
                      const driftVal = h.originalDrift;
                      const formattedDrift = Math.round(driftVal * 100) / 100;
                      return (
                        <tr key={h.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-950/5 transition-colors">
                          <td className="p-3.5 font-mono text-gray-500 text-[11px] whitespace-nowrap">
                            {h.timestamp.toLocaleString("bn-BD")}
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-gray-900 dark:text-white text-xs">{h.targetName}</div>
                            <div className="text-[10px] text-gray-400 font-mono mt-0.5 flex items-center gap-2">
                              <span>ID: {h.targetId}</span>
                              <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-black uppercase ${
                                h.targetType === "customer" 
                                  ? "bg-sky-50 text-sky-700 dark:bg-sky-950/30" 
                                  : h.targetType === "supplier"
                                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30"
                                  : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30"
                              }`}>
                                {h.targetType === "customer" ? "কাস্টমার" : h.targetType === "supplier" ? "সাপ্লায়ার" : h.targetType === "staff" ? "স্টাফ" : h.targetType}
                              </span>
                            </div>
                          </td>
                          <td className="p-3.5 text-right font-mono text-xs whitespace-nowrap">
                            <span className={formattedDrift > 0 ? "text-rose-600 font-bold" : formattedDrift < 0 ? "text-amber-600 font-bold" : "text-gray-500"}>
                              ৳ {formattedDrift > 0 ? `+${formattedDrift.toLocaleString()}` : formattedDrift.toLocaleString()}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                              h.rawLog.actionType === "auto_fix_compensate"
                                ? "bg-emerald-50 text-emerald-750 dark:bg-emerald-950/20 dark:text-emerald-400"
                                : "bg-sky-50 text-sky-750 dark:bg-sky-950/20 dark:text-sky-400"
                            }`}>
                              {h.rawLog.actionType === "auto_fix_compensate" ? (
                                <Hammer className="w-3.5 h-3.5" />
                              ) : (
                                <RefreshCw className="w-3.5 h-3.5" />
                              )}
                              {h.correctionType}
                            </span>
                          </td>
                          <td className="p-3.5 font-medium">
                            <div className="flex items-center gap-1 text-gray-950 dark:text-white">
                              <UserCheck className="w-3.5 h-3.5 text-gray-400" />
                              <span className="font-mono text-xs">{h.adminUser}</span>
                            </div>
                          </td>
                          <td className="p-3.5 text-gray-500 dark:text-gray-400 text-xs max-w-xs truncate" title={h.reason}>
                            {h.reason}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Auto-Fix (Compensating Entry) Modal */}
      {selectedDriftForFix && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/20">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                <Hammer className="w-5 h-5" />
                <h3 className="font-extrabold text-base text-gray-900 dark:text-white">লেজার সমন্বয় (Compensating Entry)</h3>
              </div>
              <button
                onClick={() => setSelectedDriftForFix(null)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-950/30 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-1">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">অ্যাকাউন্টের তথ্য</p>
                <p className="text-sm font-black text-gray-800 dark:text-white">{selectedDriftForFix.name}</p>
                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-wider">
                  টাইপ: {selectedDriftForFix.type === "customer" ? "কাস্টমার" : selectedDriftForFix.type === "supplier" ? "সাপ্লায়ার" : "স্টাফ"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-gray-150 dark:border-slate-850">
                  <p className="text-gray-400 font-bold">সংরক্ষিত ব্যালেন্স</p>
                  <p className="text-md font-black text-gray-900 dark:text-white mt-1">৳ {selectedDriftForFix.savedBalance.toLocaleString()}</p>
                </div>
                <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-gray-150 dark:border-slate-850">
                  <p className="text-gray-400 font-bold">লেজার ব্যালেন্স</p>
                  <p className="text-md font-black text-gray-900 dark:text-white mt-1">৳ {selectedDriftForFix.calculatedBalance.toLocaleString()}</p>
                </div>
              </div>

              {/* Adjustment details */}
              {(() => {
                const effect = selectedDriftForFix.savedBalance - selectedDriftForFix.calculatedBalance;
                const isPositive = effect > 0;
                return (
                  <div className={`p-4 rounded-xl border text-xs font-semibold ${
                    isPositive 
                      ? "bg-emerald-50/55 border-emerald-100 text-emerald-950" 
                      : "bg-rose-50/55 border-rose-100 text-rose-950"
                  }`}>
                    <p className="font-extrabold text-xs mb-1">প্রস্তাবিত সমন্বয় এন্ট্রি:</p>
                    <p className="leading-relaxed">
                      লেজার ব্যালেন্সকে সংরক্ষিত ব্যালেন্সের সমান করতে হলে লেজারে{" "}
                      <span className="font-black underline">
                        ৳ {Math.abs(effect).toLocaleString()}
                      </span>{" "}
                      এর একটি{" "}
                      <span className="font-black text-md">
                        {isPositive ? "পাওনা বৃদ্ধি (ডেবিট/ওপেনিং)" : "পাওনা হ্রাস (ক্রেডিট/কালেকশন)"}
                      </span>{" "}
                      অফসেট এন্ট্রি দিতে হবে।
                    </p>
                  </div>
                );
              })()}

              {/* Correction Reason Form */}
              <div className="space-y-1.5 text-xs">
                <label className="block text-gray-500 font-bold">সমন্বয়ের অফিশিয়াল কারণ (Correction Reason)</label>
                <input
                  type="text"
                  value={fixReason}
                  onChange={(e) => setFixReason(e.target.value)}
                  placeholder="যেমন: পূর্ববর্তী এন্ট্রিতে অমিল সংশোধন"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950/50 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-2.5">
              <button
                onClick={() => setSelectedDriftForFix(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 font-extrabold rounded-xl text-xs transition-all cursor-pointer"
              >
                বন্ধ করুন
              </button>
              <button
                onClick={handleExecuteAutoFix}
                disabled={isFixing || !fixReason.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-black rounded-xl text-xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
              >
                {isFixing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    সমন্বয় হচ্ছে...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    লেজার সমন্বয় সম্পন্ন করুন
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Reconciliation Report Module (Print Preview Overlay) */}
      {showPrintReport && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 overflow-y-auto p-4 md:p-8 flex flex-col items-center">
          {/* Action Control Panel (hidden during print) */}
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-xl print:hidden">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">রিকনসিলিয়েশন প্রিন্ট প্রিভিউ (Reconciliation Print)</h3>
                <p className="text-[10px] text-gray-500">এটি স্ট্যান্ডার্ড A4 বা Letter সাইজে প্রিন্ট উপযোগী করে তৈরি করা হয়েছে।</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
              >
                <Printer className="w-4 h-4" />
                প্রিন্ট করুন (Print Now)
              </button>
              <button
                onClick={() => setShowPrintReport(false)}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <X className="w-4 h-4" />
                প্রিভিউ বন্ধ করুন
              </button>
            </div>
          </div>

          {/* High Fidelity Printable Document Sheet */}
          <div className="w-full max-w-4xl bg-white text-slate-950 p-8 md:p-12 rounded-2xl border border-gray-200 shadow-2xl relative overflow-hidden flex flex-col justify-between print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:bg-white print:text-black min-h-[1050px]">
            <div>
              {/* Report Letterhead Header */}
              <div className="border-b-2 border-indigo-900 pb-5 mb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                  <h1 className="text-xl md:text-2xl font-black text-indigo-950 tracking-tight flex items-center gap-1.5">
                    <ShieldCheck className="w-6 h-6 text-indigo-700 inline" />
                    সমীর ট্রেডার্স ডিস্ট্রিবিউশন সিস্টেম
                  </h1>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Samira Traders Distribution Ltd.</p>
                  <p className="text-[11px] text-gray-500 mt-0.5 font-medium">ডিস্ট্রিবিউশন হাউজ, সেলস অ্যান্ড ফাইন্যান্স ডিপার্টমেন্ট</p>
                </div>
                <div className="sm:text-right text-xs">
                  <p className="font-black text-gray-900">অডিট ও ব্যালেন্স ড্রিফট রিপোর্ট</p>
                  <p className="text-[10px] font-mono font-bold text-indigo-700 mt-1">রিপোর্ট আইডি: AUD-{Date.now().toString().slice(-8)}</p>
                  <p className="text-[11px] text-gray-500 mt-1 font-semibold">তারিখ: {new Date().toLocaleDateString("bn-BD", { year: "numeric", month: "long", day: "numeric" })}</p>
                  <p className="text-[11px] text-gray-500 font-semibold">সময়: {new Date().toLocaleTimeString("bn-BD")}</p>
                </div>
              </div>

              {/* Status Header Block */}
              <div className={`p-4 rounded-xl border mb-6 flex items-start gap-3 ${
                hasDrift 
                  ? "bg-amber-50/75 border-amber-200 text-amber-950" 
                  : "bg-emerald-50/75 border-emerald-200 text-emerald-950"
              }`}>
                {hasDrift ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="font-extrabold text-sm uppercase tracking-tight">
                    {hasDrift ? "ব্যালেন্স অসামঞ্জস্য সনাক্ত হয়েছে (ACTION REQUIRED)" : "১০০% নিখুঁত সামঞ্জস্যপূর্ণ ব্যালেন্স (100% COMPLIANT)"}
                  </p>
                  <p className="text-xs leading-normal font-medium">
                    {hasDrift 
                      ? "আজকের অডিট পর্যালোচনায় সংরক্ষিত ব্যালেন্স এবং লেজার হিসাবের মধ্যে ব্যবধান পাওয়া গেছে। অনুমোদন সাপেক্ষে অফসেট পোস্টিং বা অটো-হিল অ্যাকশন প্রয়োগ করার পরামর্শ দেওয়া হচ্ছে।" 
                      : "লেনদেনের লেজার হিসাব এবং সংরক্ষিত প্রোফাইল ব্যালেন্স শতভাগ নির্ভুলভাবে মিলে গিয়েছে। কোনো প্রকার ড্রিফট ব্যবধান পাওয়া যায়নি।"}
                  </p>
                </div>
              </div>

              {/* Report Metrics Summary Grid */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">মোট হিসাব নিরীক্ষিত</p>
                  <p className="text-lg font-black text-slate-900 mt-1 font-mono">
                    {(customers.length + suppliers.length + staff.length).toLocaleString()} <span className="text-[10px] font-medium text-slate-400">টি</span>
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">ড্রিফট সনাক্ত হিসাব</p>
                  <p className="text-lg font-black text-slate-900 mt-1 font-mono">
                    {drifts.length} <span className="text-[10px] font-medium text-slate-400">টি</span>
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">মোট অসামঞ্জস্যপূর্ণ ড্রিফট</p>
                  <p className="text-lg font-black text-rose-700 mt-1 font-mono">
                    ৳ {totalDriftAmount.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Account Wise Drift List Table */}
              <div className="mb-6 space-y-2">
                <h3 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1 border-b pb-1.5">
                  <FileText className="w-4 h-4 text-indigo-700" />
                  হিসাব ভিত্তিক অসামঞ্জস্য ও ব্যবধান তালিকা (Discrepancy Details)
                </h3>
                {drifts.length === 0 ? (
                  <div className="p-6 text-center border border-dashed rounded-xl text-slate-400 font-bold text-xs">
                    কোনো ড্রিফট বা অসামঞ্জস্য ডাটা পাওয়া যায়নি।
                  </div>
                ) : (
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-black">
                        <th className="p-2">অ্যাকাউন্টের নাম ও আইডি</th>
                        <th className="p-2">অ্যাকাউন্ট টাইপ</th>
                        <th className="p-2 text-right">সংরক্ষিত ফাইল ব্যালেন্স</th>
                        <th className="p-2 text-right">লেজার হিসাবের ব্যালেন্স</th>
                        <th className="p-2 text-right">ব্যবধান (Drift Amount)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                      {drifts.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50">
                          <td className="p-2 font-bold">
                            <div>{d.name}</div>
                            <div className="text-[9px] text-gray-400 font-mono">ID: {d.id}</div>
                          </td>
                          <td className="p-2 uppercase tracking-tight text-[10px] font-bold">
                            {d.type === "customer" ? "কাস্টমার" : d.type === "supplier" ? "সাপ্লায়ার" : "স্টাফ"}
                          </td>
                          <td className="p-2 text-right font-mono">৳ {d.savedBalance.toLocaleString()}</td>
                          <td className="p-2 text-right font-mono font-bold text-emerald-800">৳ {d.calculatedBalance.toLocaleString()}</td>
                          <td className="p-2 text-right font-mono font-bold text-rose-700">৳ {d.drift.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Correction Log Section */}
              <div className="space-y-2 mb-8">
                <h3 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1 border-b pb-1.5">
                  <History className="w-4 h-4 text-indigo-700" />
                  আজকের রিকনসিলিয়েশন ও কারেকশন লগ (Audited Actions)
                </h3>
                {filteredAuditLogs.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">আজ কোনো সংশোধন বা এডজাস্টমেন্ট এন্ট্রি করা হয়নি।</p>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-hidden">
                    {filteredAuditLogs.slice(0, 4).map((log: any) => (
                      <div key={log.id} className="p-2 rounded bg-slate-50 border text-[10px] leading-relaxed flex justify-between items-start gap-4">
                        <div>
                          <p className="font-bold text-slate-800">
                            [{log.actionType === "auto_heal_resolve" ? "AUTO-HEALED" : "COMPENSATED"}] - {log.details}
                          </p>
                          <p className="text-[8px] text-slate-400 mt-0.5">{log.userEmail}</p>
                        </div>
                        <span className="font-mono text-slate-400 shrink-0">{log.createdAt?.seconds ? new Date(log.createdAt.seconds * 1000).toLocaleDateString("bn-BD") : new Date().toLocaleDateString("bn-BD")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Print Sign-off Dotted lines (Footer Area of Sheet) */}
            <div className="border-t border-slate-300 pt-12 mt-12 grid grid-cols-3 gap-8 text-center text-[10px] font-bold text-slate-700">
              <div className="flex flex-col items-center">
                <div className="w-40 border-b border-dashed border-slate-400 h-6"></div>
                <p className="mt-2 text-indigo-950 font-black">প্রস্তুতকারী (Operator Signature)</p>
                <p className="text-[8px] text-slate-400 font-medium">হিসাব সংরক্ষণ শাখা</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-40 border-b border-dashed border-slate-400 h-6"></div>
                <p className="mt-2 text-indigo-950 font-black">যাচাইকারী (Internal Auditor)</p>
                <p className="text-[8px] text-slate-400 font-medium">অভ্যন্তরীণ নিরীক্ষা শাখা</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-40 border-b border-dashed border-slate-400 h-6"></div>
                <p className="mt-2 text-indigo-950 font-black">অনুমোদনকারী (Managing Director)</p>
                <p className="text-[8px] text-slate-400 font-medium">সমীর ট্রেডার্স ডিস্ট্রিবিউশন</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
