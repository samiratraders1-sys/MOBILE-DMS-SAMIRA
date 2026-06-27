import React, { useState, useMemo, useEffect } from "react";
import { 
  Calendar, 
  ArrowDownLeft, 
  ArrowUpRight, 
  TrendingUp, 
  Wallet, 
  ChevronLeft, 
  ChevronRight, 
  Printer, 
  Info,
  DollarSign, 
  ArrowRightLeft,
  Users,
  Building2,
  FileText,
  Clock,
  AlertTriangle,
  Download,
  Filter
} from "lucide-react";
import { jsPDF } from "jspdf";
import { formatCurrency } from "../lib/utils";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine 
} from "recharts";

const parseDateSafely = (dateVal: any): Date | null => {
  if (!dateVal) return null;
  if (dateVal && typeof dateVal === "object") {
    if (typeof dateVal.toDate === "function") {
      return dateVal.toDate();
    }
    if (typeof dateVal.seconds === "number") {
      return new Date(dateVal.seconds * 1000);
    }
  }
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? null : d;
};

const formatTimeSafely = (createdAtVal: any): string => {
  const d = parseDateSafely(createdAtVal);
  if (!d) return "N/A";
  return d.toLocaleTimeString("bn-BD", { hour: "numeric", minute: "numeric", hour12: true });
};

interface DailyCashBookViewProps {
  accounts: any[];
  payments: any[];
  transfers: any[];
  summaries: any[];
  customers: any[];
  suppliers: any[];
  staff: any[];
  role: string;
  user: any;
}

export default function DailyCashBookView({
  accounts = [],
  payments = [],
  transfers = [],
  summaries = [],
  customers = [],
  suppliers = [],
  staff = [],
  role = "staff",
  user
}: DailyCashBookViewProps) {
  // Use today's date formatted as YYYY-MM-DD
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    // Adjust time to reflect local 2026 environment
    const year = today.getFullYear() === 2026 ? 2026 : today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  // Filters for multi-account-type and category tracking
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("All"); // "All", "Cash", "Bank", "Mobile Banking"
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("All"); // "All", or category name

  // --- CASH SAFETY THRESHOLD SETTINGS ---
  const [safetyThreshold, setSafetyThreshold] = useState<number>(() => {
    return Number(localStorage.getItem("cash_safety_threshold") || "10000");
  });
  const [safetyAlertEnabled, setSafetyAlertEnabled] = useState<boolean>(() => {
    return localStorage.getItem("cash_safety_alert_enabled") !== "false";
  });

  useEffect(() => {
    const handleSettingsChange = () => {
      setSafetyThreshold(Number(localStorage.getItem("cash_safety_threshold") || "10000"));
      setSafetyAlertEnabled(localStorage.getItem("cash_safety_alert_enabled") !== "false");
    };
    window.addEventListener("cash-safety-settings-changed", handleSettingsChange);
    return () => {
      window.removeEventListener("cash-safety-settings-changed", handleSettingsChange);
    };
  }, []);

  const handleToggleThresholdAlert = () => {
    const newVal = !safetyAlertEnabled;
    setSafetyAlertEnabled(newVal);
    localStorage.setItem("cash_safety_alert_enabled", String(newVal));
    window.dispatchEvent(new Event("cash-safety-settings-changed"));
  };

  const handleThresholdValueChange = (val: number) => {
    setSafetyThreshold(val);
    localStorage.setItem("cash_safety_threshold", String(val));
    window.dispatchEvent(new Event("cash-safety-settings-changed"));
  };

  // Handle previous and next day selection
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const dy = String(d.getDate()).padStart(2, "0");
    setSelectedDate(`${yr}-${mo}-${dy}`);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const dy = String(d.getDate()).padStart(2, "0");
    setSelectedDate(`${yr}-${mo}-${dy}`);
  };

  const handleToday = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    setSelectedDate(`${year}-${month}-${day}`);
  };

  // Identify active accounts based on the selected account type filter
  const activeAccounts = useMemo(() => {
    const uniques = new Map<string, any>();
    (accounts || []).forEach(acc => {
      const nameKey = (acc.name || "").trim().toLowerCase();
      // Ensure name-based uniqueness matching our FinanceView rules
      if (!uniques.has(nameKey)) {
        uniques.set(nameKey, acc);
      }
    });

    const list = Array.from(uniques.values());
    if (selectedTypeFilter === "All") return list;

    return list.filter(acc => {
      const type = acc.type || "Cash";
      return type === selectedTypeFilter;
    });
  }, [accounts, selectedTypeFilter]);

  const activeAccountIds = useMemo(() => new Set(activeAccounts.map(a => a.id)), [activeAccounts]);

  const hasCashAccounts = useMemo(() => {
     return activeAccounts.some(acc => (acc.type || "Cash") === "Cash");
  }, [activeAccounts]);

  // Compile all available categories for the transaction category dropdown filter
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    cats.add("ডেলিভারি কালেকশন (Settled)");
    cats.add("তহবিল স্থানান্তর (ইন)");
    cats.add("তহবিল স্থানান্তর (আউট)");
    
    (payments || []).forEach(p => {
      if (p.category) {
        cats.add(p.category);
      }
    });
    return Array.from(cats);
  }, [payments]);

  // Utility to find customer, supplier or staff name by id or exact match
  const getEntityName = (entityId: string, category: string, desc: string) => {
    if (!entityId) {
      const descClean = (desc || "").toLowerCase();
      const matchedCustomer = customers.find(c => c.name && descClean.includes(c.name.toLowerCase()));
      if (matchedCustomer) return matchedCustomer.name;
      const matchedSupplier = suppliers.find(s => s.name && descClean.includes(s.name.toLowerCase()));
      if (matchedSupplier) return matchedSupplier.name;
      const matchedStaff = staff.find(s => s.name && descClean.includes(s.name.toLowerCase()));
      if (matchedStaff) return matchedStaff.name;
      return "সাধারণ খাত (General)";
    }
    const idStr = String(entityId).trim().toLowerCase();
    const foundStaff = staff.find(s => String(s.id).trim().toLowerCase() === idStr || (s.name && s.name.trim().toLowerCase() === idStr));
    if (foundStaff) return foundStaff.name;
    const foundSupplier = suppliers.find(s => String(s.id).trim().toLowerCase() === idStr || (s.name && s.name.trim().toLowerCase() === idStr));
    if (foundSupplier) return foundSupplier.name;
    const foundCustomer = customers.find(c => String(c.id).trim().toLowerCase() === idStr || (c.name && c.name.trim().toLowerCase() === idStr));
    if (foundCustomer) return foundCustomer.name;
    if (idStr === "cash" || desc.toLowerCase().includes("कাস্টমার") || desc.toLowerCase().includes("cash")) {
      return "নগদ কাস্টমার (POS / Retail)";
    }
    return entityId;
  };

  // Helper properties to calculate balances
  // We want to calculate the cumulative balance of all active accounts up to the day *before* selectedDate
  const balances = useMemo(() => {
    const selTime = new Date(selectedDate).getTime();

    // Opening balances sum of all active accounts
    const initialOpening = activeAccounts.reduce((sum, acc) => sum + Number(acc.openingBalance || 0), 0);

    // Filter payments, transfers and loadsheets prior to selectedDate
    // For payments & transfers & loadsheets, we parse their date string
    const pInPrev = payments.filter(p => {
      if (!p.date || !p.accountId || !activeAccountIds.has(p.accountId)) return false;
      return p.type === "in" && new Date(p.date).getTime() < selTime;
    }).reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const pOutPrev = payments.filter(p => {
      if (!p.date || !p.accountId || !activeAccountIds.has(p.accountId)) return false;
      return (p.type === "out" || p.category === "Supplier Payment") && new Date(p.date).getTime() < selTime;
    }).reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const transfersInPrev = transfers.filter(t => {
      if (!t.date || !t.toAccountId || !activeAccountIds.has(t.toAccountId)) return false;
      return new Date(t.date).getTime() < selTime;
    }).reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const transfersOutPrev = transfers.filter(t => {
      if (!t.date || !t.fromAccountId || !activeAccountIds.has(t.fromAccountId)) return false;
      return new Date(t.date).getTime() < selTime;
    }).reduce((sum, t) => sum + Number(t.amount || 0), 0);

    // Settle operations prior to date
    let settlementsInPrev = 0;
    // Settlements always go to cash accounts according to our logic
    settlementsInPrev = hasCashAccounts
      ? summaries
          .filter(s => {
            if (s.status !== 'settled' || !s.date) return false;
            return new Date(s.date).getTime() < selTime;
          })
          .reduce((sum, s) => {
            const sumPaid = (s.payments || []).reduce((val: number, p: any) => val + Number(p.amount || 0), 0);
            return sum + sumPaid;
          }, 0)
      : 0;

    const openingBalance = initialOpening + pInPrev + transfersInPrev + settlementsInPrev - pOutPrev - transfersOutPrev;

    // INFLOWS on selectedDate
    const datePaymentsIn = payments.filter(p => {
      return p.date === selectedDate && p.accountId && activeAccountIds.has(p.accountId) && p.type === "in";
    });

    const dateTransfersIn = transfers.filter(t => {
      return t.date === selectedDate && t.toAccountId && activeAccountIds.has(t.toAccountId);
    });

    const dateSettlementsIn = hasCashAccounts
      ? summaries.filter(s => {
          return s.status === 'settled' && s.date === selectedDate;
        })
      : [];

    // OUTFLOWS on selectedDate
    const datePaymentsOut = payments.filter(p => {
      return p.date === selectedDate && p.accountId && activeAccountIds.has(p.accountId) && (p.type === "out" || p.category === "Supplier Payment");
    });

    const dateTransfersOut = transfers.filter(t => {
      return t.date === selectedDate && t.fromAccountId && activeAccountIds.has(t.fromAccountId);
    });

    // Build lists for display
    const inflowList = [
      ...datePaymentsIn.map(p => ({
        id: p.id,
        type: "payment",
        category: p.category || "অন্যান্য প্রাপ্তি",
        desc: p.description || "নগদ জমা",
        amount: Number(p.amount || 0),
        time: formatTimeSafely(p.createdAt),
        accName: accounts.find(a => a.id === p.accountId)?.name || "ক্যাশ",
        entity: getEntityName(p.entityId || "", p.category || "", p.description || "")
      })),
      ...dateTransfersIn.map(t => ({
        id: t.id,
        type: "transfer",
        category: "তহবিল স্থানান্তর (ইন)",
        desc: `স্থানান্তর: ${accounts.find(a => a.id === t.fromAccountId)?.name || "অন্য হিসাব"} থেকে প্রাপ্ত`,
        amount: Number(t.amount || 0),
        time: formatTimeSafely(t.createdAt),
        accName: accounts.find(a => a.id === t.toAccountId)?.name || "ক্যাশ",
        entity: "তহবিল স্থানান্তর (Bank/Mobile/Cash)"
      })),
      ...dateSettlementsIn.map(s => {
        const sumPaid = (s.payments || []).reduce((val: number, p: any) => val + Number(p.amount || 0), 0);
        return {
          id: s.id,
          type: "settlement",
          category: "ডেলিভারি কালেকশন (Settled)",
          desc: `রুট: ${s.routeName || "N/A"} (DSR: ${s.dsrName || "N/A"})`,
          amount: sumPaid,
          time: formatTimeSafely(s.settledAt),
          accName: "ম্যানেজার ক্যাশ বক্স (Cash)",
          entity: s.srName ? `SR: ${s.srName}` : "ডেলিভারি কালেকশন"
        };
      })
    ];

    const outflowList = [
      ...datePaymentsOut.map(p => ({
        id: p.id,
        type: "payment",
        category: p.category || "খরচ / পরিশোধ",
        desc: p.description || "ক্যাশ পেমেন্ট",
        amount: Number(p.amount || 0),
        time: formatTimeSafely(p.createdAt),
        accName: accounts.find(a => a.id === p.accountId)?.name || "ক্যাশ",
        entity: getEntityName(p.entityId || "", p.category || "", p.description || "")
      })),
      ...dateTransfersOut.map(t => ({
        id: t.id,
        type: "transfer",
        category: "তহবিল স্থানান্তর (আউট)",
        desc: `স্থানান্তর: ${accounts.find(a => a.id === t.toAccountId)?.name || "অন্য হিসাব"}-এ প্রেরিত`,
        amount: Number(t.amount || 0),
        time: formatTimeSafely(t.createdAt),
        accName: accounts.find(a => a.id === t.fromAccountId)?.name || "ক্যাশ",
        entity: "তহবিল স্থানান্তর (Bank/Mobile/Cash)"
      }))
    ];

    // Apply category filter
    const finalInflowList = selectedCategoryFilter === "All"
      ? inflowList
      : inflowList.filter(item => item.category === selectedCategoryFilter);

    const finalOutflowList = selectedCategoryFilter === "All"
      ? outflowList
      : outflowList.filter(item => item.category === selectedCategoryFilter);

    const totalInflow = finalInflowList.reduce((sum, item) => sum + item.amount, 0);
    const totalOutflow = finalOutflowList.reduce((sum, item) => sum + item.amount, 0);
    
    const actualInflowVolume = inflowList.reduce((sum, item) => sum + item.amount, 0);
    const actualOutflowVolume = outflowList.reduce((sum, item) => sum + item.amount, 0);
    const closingBalance = openingBalance + actualInflowVolume - actualOutflowVolume;

    return {
      openingBalance,
      totalInflow,
      totalOutflow,
      closingBalance,
      inflowList: finalInflowList,
      outflowList: finalOutflowList,
      rawInflowList: inflowList,
      rawOutflowList: outflowList
    };
  }, [selectedDate, activeAccounts, activeAccountIds, payments, transfers, summaries, accounts, customers, suppliers, staff, selectedCategoryFilter, hasCashAccounts]);

  // Memoized 7-day trend calculations for closing cash-on-hand
  const sevenDaysTrend = useMemo(() => {
    const list: { dateStr: string; label: string; closingBalance: number; threshold: number; }[] = [];
    const baseDate = new Date(selectedDate);
    if (isNaN(baseDate.getTime())) return [];

    const initialOpening = activeAccounts.reduce((sum, acc) => sum + Number(acc.openingBalance || 0), 0);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - i);
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, "0");
      const dy = String(d.getDate()).padStart(2, "0");
      const dayStr = `${yr}-${mo}-${dy}`;

      // Calculate closing balance up to and including dayStr
      const pIn = payments.filter(p => {
        if (!p.date || !p.accountId || !activeAccountIds.has(p.accountId)) return false;
        return p.type === "in" && p.date <= dayStr;
      }).reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const pOut = payments.filter(p => {
        if (!p.date || !p.accountId || !activeAccountIds.has(p.accountId)) return false;
        return (p.type === "out" || p.category === "Supplier Payment") && p.date <= dayStr;
      }).reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const transfersIn = transfers.filter(t => {
        if (!t.date || !t.toAccountId || !activeAccountIds.has(t.toAccountId)) return false;
        return t.date <= dayStr;
      }).reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const transfersOut = transfers.filter(t => {
        if (!t.date || !t.fromAccountId || !activeAccountIds.has(t.fromAccountId)) return false;
        return t.date <= dayStr;
      }).reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const settlementsIn = hasCashAccounts
        ? summaries
            .filter(s => {
              if (s.status !== 'settled' || !s.date) return false;
              return s.date <= dayStr;
            })
            .reduce((sum, s) => {
              const sumPaid = (s.payments || []).reduce((val: number, p: any) => val + Number(p.amount || 0), 0);
              return sum + sumPaid;
            }, 0)
        : 0;

      const computedClosing = initialOpening + pIn + transfersIn + settlementsIn - pOut - transfersOut;

      const monthNamesBengali = ["জানু", "ফেব্রু", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টে", "অক্টো", "নভে", "ডিসে"];
      const formattedLabel = `${d.getDate()} ${monthNamesBengali[d.getMonth()]}`;

      list.push({
        dateStr: dayStr,
        label: formattedLabel,
        closingBalance: computedClosing,
        threshold: safetyThreshold
      });
    }

    return list;
  }, [selectedDate, activeAccounts, activeAccountIds, payments, transfers, summaries, safetyThreshold, hasCashAccounts]);

  // Handle direct print - utilizing standard window.print()
  const handlePrint = () => {
    window.print();
  };

  // Generate structured daily cash report PDF incorporating opening balance, inflows, outflows, and final closing balances
  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Outer frame styling
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.rect(10, 10, 190, 277);
    
    // Core Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("DAILY CASH BOOK REPORT", 15, 25);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("Samira Traders - Liquid Account Statements & Closing Cash Ledger", 15, 31);
    doc.line(15, 35, 195, 35);
    
    // Metadata Table
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(15, 40, 180, 24, "F");
    doc.rect(15, 40, 180, 24, "S");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text("Active Report Date:", 20, 47);
    doc.text("Safety Threshold Buffer:", 20, 53);
    doc.text("Generated Status:", 20, 59);
    
    doc.setFont("helvetica", "normal");
    doc.text(`${selectedDate}`, 65, 47);
    doc.text(`BDT ${safetyThreshold.toLocaleString()} Taka`, 65, 53);
    doc.text("Verified System Administrator Profile", 65, 59);
    
    // Status check banner
    const isSafe = balances.closingBalance >= safetyThreshold;
    if (isSafe) {
      doc.setFillColor(240, 253, 250); // teal-50
      doc.setDrawColor(153, 246, 228); // teal-200
      doc.rect(15, 68, 180, 10, "FD");
      doc.setFont("helvetica", "bold");
      doc.setTextColor(13, 148, 136); // teal-600
      doc.text("CASH LIQUIDITY STATUS: ADEQUATE / SECURE BUFFER", 20, 74.5);
    } else {
      doc.setFillColor(254, 242, 242); // red-50
      doc.setDrawColor(254, 202, 202); // red-200
      doc.rect(15, 68, 180, 10, "FD");
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38); // red-600
      doc.text("WARNING: CASH STATUS BELOW DEFINED SAFETY THRESHOLD BUFFER!", 20, 74.5);
    }
    
    // Summary Metrics Card
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(255, 255, 255);
    doc.rect(15, 83, 180, 42, "FD");
    
    // Opening, inflows, outflows, closing
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(115, 115, 115); // neutral-500
    doc.text("1. Opening Cash Balance / Opening Jer:", 20, 93);
    doc.text("2. Total Daily Cash Inflows / Inflow Sum:", 20, 101);
    doc.text("3. Total Daily Cash Outflows / Outflow Sum:", 20, 109);
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(`BDT ${balances.openingBalance.toLocaleString()}/-`, 120, 93);
    doc.setTextColor(22, 163, 74); // emerald-600
    doc.text(`(+) BDT ${balances.totalInflow.toLocaleString()}/-`, 120, 101);
    doc.setTextColor(220, 38, 38); // red-600
    doc.text(`(-) BDT ${balances.totalOutflow.toLocaleString()}/-`, 120, 109);
    
    doc.line(18, 113, 192, 113);
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text("Closing Cash-on-hand / Closing Bal:", 20, 120);
    
    const closingColor = isSafe ? [16, 185, 129] : [239, 68, 68];
    doc.setTextColor(closingColor[0], closingColor[1], closingColor[2]);
    doc.text(`BDT ${balances.closingBalance.toLocaleString()}/-`, 120, 120);
    
    // List Inflows Sub-ledger header
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.text("DETAILED INFLOWS / CASH DEPOSITS", 15, 134);
    doc.line(15, 136, 195, 136);
    
    // Table columns: Category | Source / Description | Amount
    let currentY = 142;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("Category", 18, currentY);
    doc.text("Particulars / Source", 65, currentY);
    doc.text("Account", 130, currentY);
    doc.text("Amount (BDT)", 192, currentY, { align: "right" });
    currentY += 4;
    doc.setDrawColor(241, 245, 249);
    doc.line(15, currentY, 195, currentY);
    currentY += 6;
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    
    if (balances.inflowList.length === 0) {
      doc.setTextColor(156, 163, 175);
      doc.text("No inflows recorded on this date.", 20, currentY);
      currentY += 10;
    } else {
      balances.inflowList.forEach(item => {
        // Check pagination boundary
        if (currentY > 260) {
          doc.addPage();
          doc.setDrawColor(226, 232, 240);
          doc.rect(10, 10, 190, 277);
          currentY = 25;
        }
        
        // Remove non-ASCII Bengali characters for safe standard encoding or transcribe them smoothly
        const cleanCategory = String(item.category || "").replace(/[^\x00-\x7F]/g, "") || "Inflow";
        const cleanDesc = String(item.desc || "").replace(/[^\x00-\x7F]/g, "") || "Cash Received";
        const cleanAcc = String(item.accName || "").replace(/[^\x00-\x7F]/g, "") || "Cash Ledger";
        const cleanEntity = String(item.entity || "").replace(/[^\x00-\x7F]/g, "") || "General Client";
        
        doc.text(cleanCategory.substring(0, 20), 18, currentY);
        doc.text(`${cleanDesc.substring(0, 20)} (${cleanEntity.substring(0, 15)})`, 65, currentY);
        doc.text(cleanAcc.substring(0, 20), 130, currentY);
        doc.text(`${item.amount.toLocaleString()}`, 192, currentY, { align: "right" });
        currentY += 8;
      });
    }
    
    // List Outflows Sub-ledger header
    currentY += 6;
    if (currentY > 250) {
      doc.addPage();
      doc.setDrawColor(226, 232, 240);
      doc.rect(10, 10, 190, 277);
      currentY = 25;
    }
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38); // red-600
    doc.text("DETAILED OUTFLOWS / PAYMENTS", 15, currentY);
    currentY += 2;
    doc.line(15, currentY, 195, currentY);
    currentY += 6;
    
    doc.setTextColor(100, 116, 139);
    doc.text("Category", 18, currentY);
    doc.text("Particulars / Purpose", 65, currentY);
    doc.text("Account", 130, currentY);
    doc.text("Amount (BDT)", 192, currentY, { align: "right" });
    currentY += 4;
    doc.setDrawColor(241, 245, 249);
    doc.line(15, currentY, 195, currentY);
    currentY += 6;
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    
    if (balances.outflowList.length === 0) {
      doc.setTextColor(156, 163, 175);
      doc.text("No outflows recorded on this date.", 20, currentY);
      currentY += 10;
    } else {
      balances.outflowList.forEach(item => {
        if (currentY > 260) {
          doc.addPage();
          doc.setDrawColor(226, 232, 240);
          doc.rect(10, 10, 190, 277);
          currentY = 25;
        }
        
        const cleanCategory = String(item.category || "").replace(/[^\x00-\x7F]/g, "") || "Outflow";
        const cleanDesc = String(item.desc || "").replace(/[^\x00-\x7F]/g, "") || "Cash Disbursed";
        const cleanAcc = String(item.accName || "").replace(/[^\x00-\x7F]/g, "") || "Cash Ledger";
        const cleanEntity = String(item.entity || "").replace(/[^\x00-\x7F]/g, "") || "Vendor/Staff";
        
        doc.text(cleanCategory.substring(0, 20), 18, currentY);
        doc.text(`${cleanDesc.substring(0, 20)} (${cleanEntity.substring(0, 15)})`, 65, currentY);
        doc.text(cleanAcc.substring(0, 20), 130, currentY);
        doc.text(`${item.amount.toLocaleString()}`, 192, currentY, { align: "right" });
        currentY += 8;
      });
    }
    
    // Signature Footer
    currentY = 255;
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.line(20, currentY, 70, currentY);
    doc.line(125, currentY, 175, currentY);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("Prepared By Manager", 45, currentY + 5, { align: "center" });
    doc.text("Approved & Countersigned Admin", 150, currentY + 5, { align: "center" });
    
    doc.save(`Samira_Traders_Daily_Summary_${selectedDate}.pdf`);
  };

  // Human readable date in Bengali
  const formatBengaliDate = (dateStr: string) => {
    try {
      const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateStr).toLocaleDateString('bn-BD', options);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 p-6 print:p-0" id="daily-cash-book-view">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Force page size and margins for standard A4 layout */
          @page {
            size: A4 portrait !important;
            margin: 15mm 15mm 15mm 15mm !important;
          }
          
          /* Override global body background/margins */
          body {
            background: #ffffff !important;
            color: #1a1a1a !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 11px !important;
          }
          
          /* Hide app sidebar, navigation header, buttons and non-printable elements */
          .fixed,
          header,
          nav,
          aside,
          button,
          input,
          select,
          .no-print,
          .print\\:hidden,
          [role="navigation"],
          .sidebar-item {
            display: none !important;
          }
          
          /* Force container to take up entire width without page constraints */
          main {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          
          #daily-cash-book-view {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          
          /* Ensure metric cards print in elegant grid columns */
          .grid {
            display: grid !important;
          }
          
          /* Convert 4-column metric grid to print representation */
          .grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4 {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 12px !important;
          }
          
          /* Convert 2-column main ledger grid to print representation */
          .grid-cols-1.xl\\:grid-cols-2 {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 16px !important;
            margin-top: 20px !important;
          }
          
          /* Table text size adjustments and column spacing */
          table th, table td {
            padding: 6px 8px !important;
            font-size: 10px !important;
            border-bottom: 1px solid #e2e8f0 !important;
          }
          
          .bg-white, .data-card {
            background-color: #ffffff !important;
            border: 1px solid #cbd5e1 !important;
            box-shadow: none !important;
            border-radius: 12px !important;
          }
          
          .print\\:block {
            display: block !important;
          }
          
          .print\\:grid {
            display: grid !important;
          }
        }
      `}} />

      {/* HEADER SECTION (HIDDEN IN PRINT AS WE WILL MAKE PRINT-SPECIFIC TITLE) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">দৈনিক ক্যাশ বুক (Daily Cash Book)</h2>
          <p className="text-sm font-semibold text-slate-500 mt-1">সবগুলো ক্যাশ অ্যাকাউন্টের তরল কালেকশন, খরচ এবং আজকের মোট ক্যাশ-অন-হ্যান্ড খতিয়ান</p>
        </div>

        {/* Dynamic Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <button 
            id="export-day-summary"
            onClick={handlePrint}
            className="px-4 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm font-sans"
            title="দিনের সমস্ত আর্থিক তথ্যের প্রিন্ট ফ্রেন্ডলি সমারি এক্সপোর্ট করুন"
          >
            <Printer className="w-4 h-4" />
            Export Day Summary
          </button>
          <button 
            onClick={handleExportPDF}
            className="px-4 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm font-sans"
          >
            <Download className="w-4 h-4" />
            সমারি ডাউনলোড (Export Day Summary PDF)
          </button>
          <button 
            onClick={handlePrint}
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-755 hover:bg-slate-50 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs font-sans"
            title="দিনের খতিয়ান সরাসরি প্রিন্ট করুন"
          >
            <Printer className="w-4 h-4" />
            রিপোর্ট প্রিন্ট করুন (Print Day Summary)
          </button>
        </div>
      </div>

      {/* DATE PICKER BAR (PRINT-SAFE CONTROLS) */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-lg border border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 print:bg-transparent print:text-slate-950 print:border-none print:shadow-none print:p-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400 print:hidden">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold block print:text-slate-500">নির্বাচিত তারিখ (Active Ledger Date)</span>
            <span className="text-base font-black text-white leading-tight print:text-slate-950">{formatBengaliDate(selectedDate)}</span>
          </div>
        </div>

        {/* Navigation Elements */}
        <div className="flex items-center gap-2 print:hidden">
          <button 
            onClick={handlePrevDay}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer"
            title="পূর্ববর্তী দিন"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)} 
            className="px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs font-bold text-center focus:outline-none focus:border-emerald-500"
          />

          <button 
            onClick={handleNextDay}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer"
            title="পরবর্তী দিন"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <button 
            onClick={handleToday}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ml-1"
          >
            আজকের দিন (Today)
          </button>
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div 
        className="bg-white p-5 rounded-3xl border border-slate-200 shadow-3xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 print:hidden" 
        id="daily-cash-book-filters"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">ফিল্টার প্যানেল (Filters Panel)</span>
            <span className="text-[10px] text-slate-400 font-bold block mt-0.5">অ্যাকাউন্ট এবং ক্যাটাগরি অনুযায়ী সমন্বিত ভিউ</span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Account Type Filter Dropdown */}
          <div className="flex flex-col gap-1 w-full sm:w-auto min-w-[200px]">
            <span className="text-[10px] text-slate-400 font-extrabold flex items-center gap-1">
              🏢 অ্যাকাউন্ট ধরন (Account Type)
            </span>
            <select 
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 hover:bg-white rounded-xl text-xs font-bold text-slate-705 outline-none focus:border-indigo-500 focus:bg-white transition cursor-pointer"
            >
              <option value="All">সকল অ্যাকাউন্ট ধরন (All Types)</option>
              <option value="Cash">নগদ অ্যাকাউন্ট সমূহ (Cash)</option>
              <option value="Bank">ব্যাংক অ্যাকাউন্ট সমূহ (Bank)</option>
              <option value="Mobile Banking">মোবাইল ব্যাংকিং (Mobile Banking)</option>
            </select>
          </div>

          {/* Category Filter Dropdown */}
          <div className="flex flex-col gap-1 w-full sm:w-auto min-w-[240px]">
            <span className="text-[10px] text-slate-400 font-extrabold flex items-center gap-1">
              🏷️ লেনদেন ক্যাটাগরি (Transaction Category)
            </span>
            <select 
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 hover:bg-white rounded-xl text-xs font-bold text-slate-705 outline-none focus:border-indigo-500 focus:bg-white transition cursor-pointer"
            >
              <option value="All">সব ক্যাটাগরি (All Categories)</option>
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Reset Filters button */}
          {(selectedTypeFilter !== "All" || selectedCategoryFilter !== "All") && (
            <button
              onClick={() => {
                setSelectedTypeFilter("All");
                setSelectedCategoryFilter("All");
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer mt-4 sm:mt-auto self-stretch sm:self-auto text-center"
              title="ফিল্টার রিসেট করুন"
            >
              রিসেট (Reset)
            </button>
          )}
        </div>
      </div>

      {/* CASH SAFETY ALERT BANNER & TOGGLE CONTROL */}
      {safetyAlertEnabled && balances.closingBalance < safetyThreshold && (
        <div className="bg-red-50 border border-red-200 rounded-3xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm animate-pulse print:hidden">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-red-100 text-red-650 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5.5 h-5.5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-red-950 flex items-center gap-1.5 leading-none">
                কম ক্যাশ-অন-হ্যান্ড সতর্কতা! (Low Cash-on-hand Alert)
              </h4>
              <p className="text-xs text-red-700 font-medium mt-1.5 leading-normal">
                আজকের সম্ভাব্য সমাপনী ক্যাশ ব্যালেন্স ({formatCurrency(balances.closingBalance)}) আপনার নির্ধারিত নিরাপত্তা থ্রেশহোল্ড ({formatCurrency(safetyThreshold)}) সীমার নিচে নেমে গেছে। দয়া করে অ্যাকাউন্টের তারল্য তদারকি করুন।
              </p>
            </div>
          </div>
          
          {/* Quick inline config controls inside the alert for awesome UX */}
          <div className="flex items-center gap-2 self-stretch md:self-auto shrink-0 border-t border-red-100 md:border-t-0 pt-3 md:pt-0">
            <div className="flex flex-col text-right mr-1.5 hidden lg:block">
              <span className="text-[10px] text-red-400 font-bold">সেফটি থ্রেশহোল্ড পরিবর্তন:</span>
              <span className="text-[11px] text-red-900 font-mono font-bold">৳{safetyThreshold.toLocaleString()}</span>
            </div>
            <input 
              type="number" 
              value={safetyThreshold} 
              onChange={(e) => handleThresholdValueChange(Math.max(0, Number(e.target.value)))}
              className="w-24 p-2 text-xs font-bold border border-red-200 bg-white rounded-xl text-red-900 focus:outline-red-500 font-mono text-center shrink-0"
              title="থ্রেশহোল্ড পরিবর্তন করুন"
              placeholder="Limit"
            />
            <button 
              onClick={handleToggleThresholdAlert}
              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
              title="অ্যালার্ট সাময়িকভাবে বন্ধ রাখুন"
            >
              বন্ধ করুন (Mute)
            </button>
          </div>
        </div>
      )}

      {/* QUICK STATUS CONTROL AND ALERTS SETTINGS PANEL (STAYS VISIBLE SO USER CAN TURN BACK ON OR CHANGE THRESHOLD) */}
      <div className="bg-white p-4 rounded-3xl border border-slate-250/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl text-slate-500 shrink-0">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 block">ক্যাশ লিমিট ব্যালেন্স নিরাপত্তা সেটিংস:</span>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              নিরাপত্তা থ্রেশহোল্ড সীমা: <strong className="font-mono text-slate-900">৳{safetyThreshold.toLocaleString()}</strong> | অ্যালার্ট সার্ভিস: <strong className={safetyAlertEnabled ? "text-emerald-600 font-bold" : "text-slate-500"}>{safetyAlertEnabled ? "সক্রিয় (Active)" : "নিষ্ক্রিয় (Inactive)"}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-150 px-3 py-1.5 rounded-2xl">
            <input 
              type="checkbox" 
              id="safety_limit_trigger"
              checked={safetyAlertEnabled} 
              onChange={handleToggleThresholdAlert} 
              className="w-4 h-4 text-slate-800 focus:ring-slate-500 rounded cursor-pointer"
            />
            <label htmlFor="safety_limit_trigger" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
              কম ক্যাশ অ্যালার্ট চালু রাখুন
            </label>
          </div>
          
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-slate-500 font-mono">লিমিট:</span>
            <input 
              type="number" 
              value={safetyThreshold} 
              onChange={(e) => handleThresholdValueChange(Math.max(0, Number(e.target.value)))}
              className="w-24 p-1.5 border border-slate-200 rounded-xl text-xs font-bold font-mono text-center focus:outline-slate-500"
              placeholder="10000"
            />
          </div>
        </div>
      </div>

      {/* DOCK PRINT METADATA */}
      <div className="hidden print:block border-b border-slate-350 pb-5 mb-5">
        <div className="flex justify-between items-start border-b border-slate-200 pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-950 uppercase">সমীরা ট্রেডার্স (SAMIRA TRADERS)</h1>
            <p className="text-xs text-slate-500 font-bold">দৈনিক নগদ ও ক্যাশ হিসাবপত্র বহি (Daily Cash Ledger Book)</p>
          </div>
          <div className="text-right text-xs text-slate-600">
            <p className="font-bold">তারিখ: {formatBengaliDate(selectedDate)}</p>
            <p>প্রিন্ট সময়: {new Date().toLocaleString("bn-BD")}</p>
          </div>
        </div>

        {/* Structured Daily Cash Report Day Summary */}
        <div className="border border-slate-300 rounded-xl p-4 bg-slate-50 font-sans">
          <h3 className="text-xs font-extrabold text-slate-900 border-b border-slate-200 pb-2 mb-3">সারসংক্ষেপ খতিয়ান (Day Summary Report)</h3>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-slate-500 font-bold border-b border-slate-200">
                <th className="pb-2">বিবরণ (Particulars)</th>
                <th className="pb-2 text-right">পরিমাণ (Amount)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium text-slate-705">
              <tr>
                <td className="py-2 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  প্রারম্ভিক ব্যালেন্স (Opening Balance)
                </td>
                <td className="py-2 text-right font-bold font-mono">{formatCurrency(balances.openingBalance)}</td>
              </tr>
              <tr>
                <td className="py-2 font-semibold text-emerald-750 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  মোট প্রাপ্তি (Total Inflows)
                </td>
                <td className="py-2 text-right font-bold font-mono text-emerald-600">+{formatCurrency(balances.totalInflow)}</td>
              </tr>
              <tr>
                <td className="py-2 font-semibold text-red-650 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-400"></span>
                  মোট প্রদান ও স্থানান্তর (Total Outflows)
                </td>
                <td className="py-2 text-right font-bold font-mono text-red-600">-{formatCurrency(balances.totalOutflow)}</td>
              </tr>
              <tr className="text-slate-900 font-black border-t-2 border-slate-300">
                <td className="py-2.5 text-sm flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                  সমাপনী ব্যালেন্স (Final Closing Balance)
                </td>
                <td className="py-2.5 text-right font-extrabold font-mono text-sm text-slate-950">{formatCurrency(balances.closingBalance)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* METRIC CARDS / STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Opening Balance */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <span className="text-xs text-slate-400 font-bold block">প্রারম্ভিক ব্যালেন্স (Opening)</span>
            <span className="text-2xl font-black text-slate-900 font-mono tracking-tight block mt-1.5 leading-none">
              {formatCurrency(balances.openingBalance)}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold block mt-1">দিনের শুরু পর্যন্ত মোট নগদ স্থিতি</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Total Inflow */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <span className="text-xs text-slate-400 font-bold block text-emerald-600">আজকের মোট ক্যাশ প্রাপ্তি (Inflow)</span>
            <span className="text-2xl font-black text-emerald-600 font-mono tracking-tight block mt-1.5 leading-none">
              +{formatCurrency(balances.totalInflow)}
            </span>
            <span className="text-[10px] text-emerald-500 font-semibold block mt-1">
              {balances.inflowList.length} টি প্রাপ্তি স্লিপ ও কালেকশন
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
          </div>
        </div>

        {/* Card 3: Total Outflow */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <span className="text-xs text-slate-400 font-bold block text-red-600">আজকের মোট ক্যাশ প্রদান (Outflow)</span>
            <span className="text-2xl font-black text-red-600 font-mono tracking-tight block mt-1.5 leading-none">
              -{formatCurrency(balances.totalOutflow)}
            </span>
            <span className="text-[10px] text-red-500 font-semibold block mt-1">
              {balances.outflowList.length} টি ক্যাশ পেমেন্ট বা ট্রান্সফার
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
          </div>
        </div>

        {/* Card 4: Closing Balance */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-950 text-white p-6 rounded-3xl shadow-md flex items-center justify-between hover:shadow-lg transition-all print:bg-transparent print:text-slate-950 print:border print:border-slate-350 print:shadow-none">
          <div>
            <span className="text-xs text-indigo-200 font-bold block print:text-slate-500">সমাপনী তরল ক্যাশ (Closing Cash-on-hand)</span>
            <span className="text-2xl font-black text-emerald-400 font-mono tracking-tight block mt-1.5 leading-none print:text-slate-950">
              {formatCurrency(balances.closingBalance)}
            </span>
            <span className="text-[10px] text-indigo-300 font-semibold block mt-1 print:text-slate-500">আজকের মোট সমাপনী রিটেইল ক্যাশ</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 text-indigo-300 flex items-center justify-center shrink-0 print:hidden">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* LIST OF CASH ACCOUNTS TRACKED */}
      <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 flex flex-wrap gap-x-6 gap-y-2 items-center text-xs text-slate-600 print:bg-transparent print:border-none print:p-0">
        <span className="font-bold flex items-center gap-1.5 text-slate-800">
          <Info className="w-4 h-4 text-emerald-600" />
          ট্র্যাককৃত অ্যাকাউন্ট সমূহ ({activeAccounts.length} টি):
        </span>
        <div className="flex flex-wrap gap-2">
          {activeAccounts.map(acc => (
            <span key={acc.id} className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg font-bold text-slate-700 shadow-3xs print:border-slate-300">
              📂 {acc.name} ({acc.type || "Cash"})
            </span>
          ))}
          {activeAccounts.length === 0 && (
            <span className="text-red-500 font-bold">কোন অ্যাকাউন্ট পাওয়া যায়নি!</span>
          )}
        </div>
      </div>

      {/* 7-DAY CASH TREND CHART */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs print:hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h3 className="text-sm font-black text-slate-950 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              ৭ দিনের ক্যাশ ফ্লো এবং নিরাপত্তা থ্রেশহোল্ড ট্রেন্ড (7-Day Cash Trend)
            </h3>
            <p className="text-[11px] text-slate-400 font-bold mt-1">সবগুলো ক্যাশ অ্যাকাউন্টের ৭ দিনের তরল ক্যাশ ব্যালেন্স বনাম নিরাপত্তা বাফার লিমিটের তুলনা গ্রাফ</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-bold shrink-0">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-3 rounded-full bg-indigo-600"></span>
              ক্যাশ স্থিতি (Closing Cash)
            </span>
            <span className="flex items-center gap-1.5 text-red-500">
              <span className="w-3 h-0.5 bg-red-400"></span>
              নিরাপত্তা সীমা (Threshold): ৳{safetyThreshold.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="h-56 w-full font-sans">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sevenDaysTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCashTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="label" 
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
              />
              <YAxis 
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                tickFormatter={(val) => `৳${(val / 1000).toFixed(0)}K`}
              />
              <Tooltip 
                contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px', fontFamily: 'sans-serif' }}
                formatter={(value: any) => [`৳${Number(value).toLocaleString()}`, 'সমাপনী ক্যাশ ব্যালেন্স']}
                labelStyle={{ fontWeight: 'bold', color: '#94a3b8' }}
              />
              <Area 
                type="monotone" 
                dataKey="closingBalance" 
                stroke="#4f46e5" 
                strokeWidth={2.5} 
                fillOpacity={1} 
                fill="url(#colorCashTrend)" 
              />
              <ReferenceLine 
                y={safetyThreshold} 
                stroke="#f87171" 
                strokeWidth={1.5}
                strokeDasharray="4 4" 
                label={{ value: "নিরাপত্তা সীমা", fill: "#ef4444", fontSize: 9, position: "top", fontWeight: "bold" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* MAIN TWO-COLUMN DEBIT vs CREDIT LEDGER */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        
        {/* INFLOWS / DEBIT (প্রাপ্তি খতিয়ান) */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden print:border-slate-350">
          <div className="p-5 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between print:bg-transparent print:border-slate-350">
            <div className="flex items-center gap-2">
              <span className="p-1 px-2.5 bg-emerald-500 text-white rounded-lg text-xs font-black">প্রাপ্তি</span>
              <h3 className="text-sm font-black text-slate-800">ক্যাশ ইনফ্লো তালিকা (Inflow Logs / Debit)</h3>
            </div>
            <span className="text-xs font-black text-emerald-600 bg-emerald-100/60 px-2.5 py-1 rounded-lg">
              মোট: BDT {balances.totalInflow.toLocaleString()}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 print:bg-transparent">
                  <th className="p-3.5 pl-5">সময়</th>
                  <th className="p-3.5">ক্যাটাগরি</th>
                  <th className="p-3.5">বিবরণ / উৎস বা প্রেরক</th>
                  <th className="p-3.5">ক্যাশ খাতা</th>
                  <th className="p-3.5 text-right pr-5">পরিমাণ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {balances.inflowList.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/50 text-[11px] font-medium text-slate-700">
                    <td className="p-3.5 pl-5 font-mono text-slate-400 whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-300 print:hidden" />
                        {item.time}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-bold text-[10px] whitespace-nowrap">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-800 leading-tight">{item.desc}</div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-0.5 whitespace-nowrap">{item.entity}</div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-slate-500 font-bold">{item.accName}</td>
                    <td className="p-3.5 text-right pr-5 font-bold font-mono text-emerald-600 text-xs">
                      +{item.amount.toLocaleString()} ৳
                    </td>
                  </tr>
                ))}
                
                {balances.inflowList.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-gray-400">
                      <div className="font-bold">আজকে কোন ক্যাশ প্রাপ্তি নেই</div>
                      <p className="text-[10px] text-slate-300 mt-1">সব পেমেন্ট ও সেটেলমেন্ট রসিদ শূন্য</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* OUTFLOWS / CREDIT (প্রদান ও ব্যয় খতিয়ান) */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden print:border-slate-350">
          <div className="p-5 bg-red-50 border-b border-red-100 flex items-center justify-between print:bg-transparent print:border-slate-350">
            <div className="flex items-center gap-2">
              <span className="p-1 px-2.5 bg-red-500 text-white rounded-lg text-xs font-black">প্রদান</span>
              <h3 className="text-sm font-black text-slate-800">ক্যাশ আউটফ্লো তালিকা (Outflow Logs / Credit)</h3>
            </div>
            <span className="text-xs font-black text-red-600 bg-red-100/60 px-2.5 py-1 rounded-lg">
              মোট: BDT {balances.totalOutflow.toLocaleString()}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 print:bg-transparent">
                  <th className="p-3.5 pl-5">সময়</th>
                  <th className="p-3.5">ক্যাটাগরি</th>
                  <th className="p-3.5">বিবরণ / খাত বা প্রাপক</th>
                  <th className="p-3.5">উৎস খাতা</th>
                  <th className="p-3.5 text-right pr-5">পরিমাণ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {balances.outflowList.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/50 text-[11px] font-medium text-slate-700">
                    <td className="p-3.5 pl-5 font-mono text-slate-400 whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-300 print:hidden" />
                        {item.time}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-md font-bold text-[10px] whitespace-nowrap">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-800 leading-tight">{item.desc}</div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-0.5 whitespace-nowrap">{item.entity}</div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-slate-500 font-bold">{item.accName}</td>
                    <td className="p-3.5 text-right pr-5 font-bold font-mono text-red-600 text-xs">
                      -{item.amount.toLocaleString()} ৳
                    </td>
                  </tr>
                ))}
                
                {balances.outflowList.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-gray-400">
                      <div className="font-bold">আজকে কোন ক্যাশ প্রদান নেই</div>
                      <p className="text-[10px] text-slate-300 mt-1">সব খরচ ও পারচেজ পরিশোধ ভুক্তি শূন্য</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* PRINT-SPECIFIC SIGNATURE LINES */}
      <div className="hidden print:grid grid-cols-3 gap-6 pt-16 text-center text-[11px] font-bold text-slate-800">
        <div>
          <div className="border-t border-slate-400 w-3/4 mx-auto pt-2">দিনের ক্যাশিয়ার স্বাক্ষর</div>
        </div>
        <div>
          <div className="border-t border-slate-400 w-3/4 mx-auto pt-2">সুপারভাইজার / ম্যানেজার স্বাক্ষর</div>
        </div>
        <div>
          <div className="border-t border-slate-400 w-3/4 mx-auto pt-2">কর্তৃপক্ষের অনুমোদন</div>
        </div>
      </div>
    </div>
  );
}
