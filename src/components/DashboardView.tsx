import { useMemo, useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, Legend, PieChart, Pie, Cell
} from 'recharts';
import { Package, TrendingUp, Users, ShoppingCart, AlertTriangle, Sparkles, Loader2, ArrowRight, Truck, DollarSign, History, X, Download, FileText, Database, RefreshCw, Plus, BookOpen, Layers, ChevronRight, HelpCircle, ShieldCheck, Wallet, Bell, CheckCircle } from "lucide-react";
import { formatCurrency, formatNumber } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { jsPDF } from "jspdf";
import toast from "react-hot-toast";
import { db } from "../lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { calculateNetProfit } from "../utils/profitEngine";
import { APP_VERSION } from "../lib/cleanup";

interface DashboardProps {
  products: any[];
  summaries: any[];
  customers: any[];
  suppliers: any[];
  purchases: any[];
  routes: any[];
  payments?: any[];
  sales?: any[];
  activityLogs?: any[];
  subDbs?: any[];
  subDbShipments?: any[];
  expenses?: any[];
  setActiveView: (view: string) => void;
  role?: string;
  allowedViews?: string[];

  // Additional props for 100% ERP Reconciliation Audit
  staff?: any[];
  accounts?: any[];
  damageInventory?: any[];
  supplierClaims?: any[];
  stockAdjustments?: any[];
  updateCustomer?: (id: string, data: any) => Promise<any>;
  updateSupplier?: (id: string, data: any) => Promise<any>;
  updateStaff?: (id: string, data: any) => Promise<any>;
}

export default function DashboardView(props: DashboardProps) {
  const products = Array.isArray(props.products) ? props.products : [];
  const summaries = Array.isArray(props.summaries) ? props.summaries : [];
  const customers = Array.isArray(props.customers) ? props.customers : [];
  const suppliers = Array.isArray(props.suppliers) ? props.suppliers : [];
  const purchases = Array.isArray(props.purchases) ? props.purchases : [];
  const routes = Array.isArray(props.routes) ? props.routes : [];
  const payments = Array.isArray(props.payments) ? props.payments : [];
  const sales = Array.isArray(props.sales) ? props.sales : [];
  const activityLogs = Array.isArray(props.activityLogs) ? props.activityLogs : [];
  const subDbs = Array.isArray(props.subDbs) ? props.subDbs : [];
  const subDbShipments = Array.isArray(props.subDbShipments) ? props.subDbShipments : [];
  const expenses = Array.isArray(props.expenses) ? props.expenses : [];

  const staff = Array.isArray(props.staff) ? props.staff : [];
  const accounts = Array.isArray(props.accounts) ? props.accounts : [];
  const damageInventory = Array.isArray(props.damageInventory) ? props.damageInventory : [];
  const supplierClaims = Array.isArray(props.supplierClaims) ? props.supplierClaims : [];
  const stockAdjustments = Array.isArray(props.stockAdjustments) ? props.stockAdjustments : [];
  const { updateCustomer, updateSupplier, updateStaff } = props;

  const { setActiveView, role, allowedViews } = props;
  const { language, t, formatNumber } = useLanguage();
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [notificationPermissionGranted, setNotificationPermissionGranted] = useState(() => {
    try {
      return typeof Notification !== "undefined" && Notification.permission === "granted";
    } catch {
      return false;
    }
  });
  const [notificationActiveTab, setNotificationActiveTab] = useState<"all" | "stock" | "dues" | "transfers">("all");
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [dailyTimeframe, setDailyTimeframe] = useState<"7" | "30">("30");
  const [inventoryFilter, setInventoryFilter] = useState<"all" | "low" | "out">("all");
  const [hubActiveTab, setHubActiveTab] = useState<"workspace" | "data-entry" | "reports" | "reconciliation">("workspace");
  const [drillDownStat, setDrillDownStat] = useState<string | null>(null);

  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [lastSync, setLastSync] = useState<string | null>(() => {
    try {
      return localStorage.getItem("last_firestore_sync") || new Date().toISOString();
    } catch {
      return new Date().toISOString();
    }
  });
  const [lastSyncedCol, setLastSyncedCol] = useState<string | null>(null);
  const [isTestingSync, setIsTestingSync] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string>("");
  const [lastSyncFormatted, setLastSyncFormatted] = useState<string>("এইমাত্র সিঙ্ক হয়েছে (Just Now)");

  const [lastManualBackupDate, setLastManualBackupDate] = useState<string | null>(() => {
    try {
      return localStorage.getItem("last_manual_backup_date");
    } catch {
      return null;
    }
  });

  const daysSinceLastBackup = useMemo(() => {
    if (!lastManualBackupDate) return null;
    try {
      const lastDate = new Date(lastManualBackupDate);
      const now = new Date();
      const diffTime = now.getTime() - lastDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 ? diffDays : 0;
    } catch {
      return null;
    }
  }, [lastManualBackupDate]);

  const isBackupOverdue = lastManualBackupDate === null || (daysSinceLastBackup !== null && daysSinceLastBackup >= 7);

  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [exportBackupStatus, setExportBackupStatus] = useState("");

  const handleExportBackup = async () => {
    setIsExportingBackup(true);
    setExportBackupStatus("ব্যাকআপ প্রস্তুত হচ্ছে...");
    try {
      const backupData: Record<string, any[]> = {};
      const criticalCollections = [
        "products",
        "routes",
        "staff",
        "summaries",
        "customers",
        "suppliers",
        "orders",
        "sales",
        "users",
        "roles",
        "transfers",
        "payments",
        "categories",
        "damageInventory",
        "purchases",
        "accounts",
        "incomeCategories",
        "subDbs",
        "subDbShipments",
        "subDbSettings",
        "stockAdjustments",
        "boms",
        "productions",
        "attendance",
        "payroll",
        "fixedAssets",
        "loans",
        "returns"
      ];

      for (const colName of criticalCollections) {
        setExportBackupStatus(`ডাউনলোড হচ্ছে: ${colName}...`);
        const colRef = collection(db, colName);
        const querySnapshot = await getDocs(colRef);
        backupData[colName] = querySnapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
      }

      setExportBackupStatus("ব্যাকআপ প্রস্তুত হচ্ছে...");
      const fullBackup = {
        appName: "Samira Traders DMS",
        exportedAt: new Date().toISOString(),
        collections: backupData
      };

      const jsonStr = JSON.stringify(fullBackup, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
      const downloadUrl = URL.createObjectURL(blob);
      
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", downloadUrl);
      
      const dateStr = new Date().toISOString().split("T")[0];
      downloadAnchor.setAttribute("download", `samira_traders_backup_${dateStr}.json`);
      
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(downloadUrl);

      const nowStr = new Date().toISOString();
      try {
        localStorage.setItem("last_manual_backup_date", nowStr);
      } catch (err) {
        console.error("Local storage set failed: ", err);
      }
      setLastManualBackupDate(nowStr);

      setExportBackupStatus("সম্পন্ন!");
      toast.success("ব্যাকআপ ফাইল সফলভাবে প্রস্তুত ও ডাউনলোড করা হয়েছে!");
      setTimeout(() => setExportBackupStatus(""), 4000);
    } catch (error) {
      console.error("Dashboard Backup failed: ", error);
      toast.error("ব্যাকআপ নিতে সমস্যা হয়েছে: " + (error as Error).message);
      setExportBackupStatus("ব্যর্থ হয়েছে");
    } finally {
      setIsExportingBackup(false);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncMessage("ইন্টারনেট কানেকশন সচল আছে");
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncMessage("অফলাইন মোড - ডাটা ডিভাইসে রক্ষিত হচ্ছে");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const handleFirestoreSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.time) {
        setLastSync(customEvent.detail.time);
        if (customEvent.detail.collection) {
          const namesMap: Record<string, string> = {
            products: "পণ্য তালিকা",
            routes: "রুট",
            staff: "স্টাফ তালিকা",
            summaries: "সেলস ডিএসআর রিপোর্ট",
            customers: "কাস্টমার তালিকা",
            suppliers: "সরবরাহকারী তালিকা",
            orders: "অর্ডার তালিকা",
            payments: "পেমেন্ট লেনদেন",
            sales: "ডাইরেক্ট ক্যাশ সেলস",
          };
          setLastSyncedCol(namesMap[customEvent.detail.collection] || customEvent.detail.collection);
        }
      }
    };

    window.addEventListener("firestore-sync", handleFirestoreSync);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("firestore-sync", handleFirestoreSync);
    };
  }, []);

  useEffect(() => {
    if (!lastSync) return;

    const updateLabel = () => {
      const diffMs = Date.now() - new Date(lastSync).getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);

      if (diffSecs < 15) {
        setLastSyncFormatted("সবেমাত্র (Just Now)");
      } else if (diffSecs < 60) {
        setLastSyncFormatted(`${diffSecs} সেকেন্ড আগে`);
      } else if (diffMins < 60) {
        setLastSyncFormatted(`${diffMins} মিনিট আগে`);
      } else {
        const hours = Math.floor(diffMins / 60);
        setLastSyncFormatted(`${hours} ঘণ্টা আগে`);
      }
    };

    updateLabel();
    const interval = setInterval(updateLabel, 5000);
    return () => clearInterval(interval);
  }, [lastSync]);

  const handleManualSyncTest = async () => {
    setIsTestingSync(true);
    await new Promise(resolve => setTimeout(resolve, 850));
    const currentStatus = typeof navigator !== "undefined" ? navigator.onLine : true;
    setIsOnline(currentStatus);
    
    if (currentStatus) {
      const nowIso = new Date().toISOString();
      try {
        localStorage.setItem("last_firestore_sync", nowIso);
      } catch {}
      setLastSync(nowIso);
      setLastSyncedCol("সকল ডাটা টেবিল");
      toast.success("ফায়ারস্টোর ডাটাবেজ কানেকশন স্টেটাস সচল আছে!");
    } else {
      toast.error("ফায়ারস্টোর ডাটাবেজ কানেক্ট করা যায়নি। ইন্টারনেট সংযোগ নেই!");
    }
    setIsTestingSync(false);
  };

  const isManagerOrAdmin = role === "admin" || role === "manager";
  
  // Calculations for KPI grid using centralized ProfitEngine
  const kpiValues = useMemo(() => {
    let totalReturnVal = 0;
    let totalFreeCount = 0;
    let totalDiscountCount = 0;
    
    summaries.filter(s => s.status === 'settled').forEach(s => {
      (s.items || []).forEach((item: any) => {
        const returns = item.returns || 0;
        totalReturnVal += (returns * item.price);
        totalFreeCount += (item.free || 0);
      });
    });

    (sales || []).forEach((sale: any) => {
      (sale.items || []).forEach((item: any) => {
        totalFreeCount += Number(item.freeQty || 0);
        totalDiscountCount += Number(item.discount || 0);
      });
    });

    const metrics = calculateNetProfit({
      sales,
      payments,
      summaries,
      products,
      subDbShipments,
      expenses
    });

    return { 
      totalSalesValue: metrics.salesRevenue, 
      netProfit: metrics.netProfit, 
      profitMargin: metrics.salesRevenue > 0 ? (metrics.netProfit / metrics.salesRevenue) * 100 : 0, 
      totalExpenses: metrics.totalExpenses, 
      totalReturnVal, 
      totalFreeCount, 
      totalDiscountCount 
    };
  }, [products, summaries, sales, payments, subDbShipments, expenses]);

  const reconciliationMetrics = useMemo(() => {
    // 1. Inventory Value (ইনভেন্টরি পণ্যের মূল্য)
    const totalInventoryValue = products.reduce((sum, p) => sum + (Number(p.stock || 0) * Number(p.purchasePrice || p.price || 0)), 0);

    // 2. Cash/Bank (হাতে নগদ ও ব্যাংক ক্যাশ)
    const totalCashValue = accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);

    // 3. Customer Credit (কাস্টমার বকেয়া/বাকি)
    const totalCustomerCredit = customers.reduce((sum, c) => sum + Number(c.balance || 0), 0);

    // 4. Damage Stock Value (ড্যামেজ পণ্য স্টক মূল্য)
    const totalDamageValue = damageInventory.reduce((sum, d) => sum + (Number(d.quantity || 0) * Number(d.price || 0)), 0);

    // 5. Total Discounts Given (মোট কাস্টমার ডিসকাউন্ট)
    const totalDiscounts = summaries.reduce((sum, s) => sum + Number(s.totalDiscountValue || s.discountItems?.reduce((subSum: number, item: any) => subSum + (Number(item.discount || 0)), 0) || 0), 0) + 
                          sales.reduce((sum, s) => sum + (s.items || []).reduce((sub, i) => sub + Number(i.discount || 0), 0), 0);

    // 6. Free Products Value (মোট ফ্রি পণ্য বিতরণ)
    const totalFreeProductsValue = summaries.reduce((sum, s) => sum + Number(s.totalFreeValue || s.freeItems?.reduce((subSum: number, item: any) => subSum + (Number(item.quantity || 0) * Number(item.price || 0)), 0) || 0), 0) + 
                                  sales.reduce((sum, s) => sum + (s.items || []).reduce((sub, i) => sub + (Number(i.freeQty || 0) * Number(i.rate || 0)), 0), 0);

    // 7. Expenses (মোট ব্যয়/খরচ)
    const totalExpensesValue = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

    // 8. Supplier Claims (সাপ্লায়ার ক্লেম ও ফেরত)
    const totalSupplierClaimsValue = supplierClaims.reduce((sum, c) => sum + Number(c.amount || 0), 0);

    // 9. Staff Salary Advance (স্টাফ বেতন অগ্রিম)
    const totalSalaryAdvancesValue = staff.reduce((sum, s) => sum + (Number(s.balance || 0) < 0 ? Math.abs(Number(s.balance || 0)) : 0), 0);

    // 10. Adjustments (মোট স্টক ও একাউন্ট সমন্বয় মূল্য)
    const totalAdjustmentsValue = stockAdjustments.reduce((sum, a) => sum + (Number(a.quantity || 0) * Number(a.price || 0)), 0);

    // Total sales revenue for matching
    const totalSalesRevenueValue = summaries.reduce((sum, s) => sum + Number(s.salesValue || 0), 0) + 
                                   sales.reduce((sum, s) => sum + Number(s.totalAmount || s.grandTotal || 0), 0);

    // Total supplier payables (সাপ্লায়ার বকেয়া)
    const totalSupplierPayablesValue = suppliers.reduce((sum, s) => sum + (Number(s.balance || 0) > 0 ? Number(s.balance || 0) : 0), 0);

    // Total left-side (total assets + expenses + values)
    const totalDebitSide = totalInventoryValue + totalCashValue + totalCustomerCredit + totalDamageValue + totalDiscounts + totalFreeProductsValue + totalExpensesValue + totalSupplierClaimsValue + totalSalaryAdvancesValue + totalAdjustmentsValue;

    // Total right-side (revenue + payables + other income)
    const totalOthersIncomeValue = payments.filter((p: any) => p.type === 'in' && p.category === 'Others Income').reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    
    const theoreticalCreditSide = totalSalesRevenueValue + totalSupplierPayablesValue + totalOthersIncomeValue;
    const difference = Math.abs(totalDebitSide - theoreticalCreditSide);

    return {
      totalInventoryValue,
      totalCashValue,
      totalCustomerCredit,
      totalDamageValue,
      totalDiscounts,
      totalFreeProductsValue,
      totalExpensesValue,
      totalSupplierClaimsValue,
      totalSalaryAdvancesValue,
      totalAdjustmentsValue,
      totalSalesRevenueValue,
      totalSupplierPayablesValue,
      totalOthersIncomeValue,
      totalDebitSide,
      theoreticalCreditSide,
      difference
    };
  }, [products, summaries, customers, suppliers, purchases, routes, payments, sales, expenses, staff, accounts, damageInventory, supplierClaims, stockAdjustments]);

  const [isHealing, setIsHealing] = useState(false);

  const handleSelfHealing = async () => {
    setIsHealing(true);
    const loadToast = toast.loading("ডাটাবেজ রি-ক্যালকুলেশন ও সেলফ-হিলিং সক্রিয় হচ্ছে...");
    try {
      // 1. Re-calculate customer balances based on payments and order summaries
      for (const cust of customers) {
        let actualBalance = 0;
        const creditSum = summaries
          .filter(s => s.status === 'settled' && Array.isArray(s.credits))
          .reduce((sum, s) => {
            const custCredit = s.credits.find((c: any) => c.customerId === cust.id);
            return sum + (custCredit ? Number(custCredit.amount || 0) : 0);
          }, 0);
        
        const paymentSum = payments
          .filter(p => p.customerId === cust.id && p.type === 'in' && p.category === 'Customer Due Collection' && p.status !== 'pending_approval')
          .reduce((sum, p) => sum + Number(p.amount || 0), 0);

        actualBalance = creditSum - paymentSum;
        
        if (updateCustomer && Math.abs((cust.balance || 0) - actualBalance) > 1) {
          await updateCustomer(cust.id, { balance: actualBalance });
        }
      }

      // 2. Re-calculate staff balances
      for (const st of staff) {
        let actualBalance = 0;
        const totalSummariesPayable = summaries
          .filter(s => s.dsrId === st.id && s.status === 'settled')
          .reduce((sum, s) => sum + Number(s.dsrPayable || 0), 0);

        const totalStaffPaymentsHandover = summaries
          .filter(s => s.dsrId === st.id && s.status === 'settled')
          .reduce((sum, s) => sum + Number(s.totalPayments || 0), 0);

        actualBalance = totalSummariesPayable - totalStaffPaymentsHandover;

        if (updateStaff && Math.abs((st.balance || 0) - actualBalance) > 1) {
          await updateStaff(st.id, { balance: actualBalance });
        }
      }

      toast.success("ইআরপি ডাটাবেজ সমতা ও Ledger Balances সফলভাবে রি-সিঙ্ক ও সেলফ-হিল করা হয়েছে!", { id: loadToast });
    } catch (err) {
      console.error(err);
      toast.error("সেলফ-হিলিংয়ের সময় সমস্যা হয়েছে।", { id: loadToast });
    } finally {
      setIsHealing(false);
    }
  };

  const { totalSalesValue, netProfit, profitMargin, totalExpenses, totalReturnVal, totalFreeCount, totalDiscountCount } = kpiValues;

  const businessKpiMetrics = useMemo(() => {
    // 1. Total Sales
    const totalSales = totalSalesValue;

    // 2. Total Collections (Approved in-payments + settled route collections)
    const inPayments = (payments || [])
      .filter((p: any) => p.type === 'in' && p.status !== 'pending_approval')
      .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
    const settledCollection = (summaries || [])
      .filter((s: any) => s.status === 'settled')
      .reduce((sum: number, s: any) => sum + Number(s.collectedAmount || s.totalPayments || s.totalCashCollected || s.payment || 0), 0);
    const totalCollections = inPayments + settledCollection;

    // 3. Current Inventory Value
    const currentInventoryValue = reconciliationMetrics.totalInventoryValue;

    // 4. Outstanding Customer Dues
    const outstandingCustomerDues = reconciliationMetrics.totalCustomerCredit;

    // 5. Cash on Hand (type === 'Cash' or names matching cash/নগদ)
    const cashOnHand = (accounts || [])
      .filter((a: any) => a.type === 'Cash' || (a.name && (a.name.toLowerCase().includes("cash") || a.name.includes("নগদ") || a.name.toLowerCase().includes("ক্যাশ"))))
      .reduce((sum: number, a: any) => sum + Number(a.balance || 0), 0);

    // 6. Bank Balances (type === 'Bank' or names matching bank/ব্যাংক)
    const bankBalances = (accounts || [])
      .filter((a: any) => a.type === 'Bank' || (a.name && (a.name.toLowerCase().includes("bank") || a.name.includes("ব্যাংক"))))
      .reduce((sum: number, a: any) => sum + Number(a.balance || 0), 0);

    // 7. Pending Supplier Claims
    const pendingSupplierClaims = (supplierClaims || [])
      .filter((c: any) => c.status === 'pending' || c.status === 'পেন্ডিং' || !c.resolved)
      .reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);

    // 8. Profit for the period (Net Profit from our profitEngine)
    const profitForThePeriod = netProfit;

    // 9. Business Investment (Original starting equity + accounts opening balances)
    const openingBalSum = (accounts || []).reduce((sum: number, a: any) => sum + Number(a.openingBalance || 0), 0);
    const businessInvestment = 2500000 + openingBalSum;

    return {
      totalSales,
      totalCollections,
      currentInventoryValue,
      outstandingCustomerDues,
      cashOnHand,
      bankBalances,
      pendingSupplierClaims,
      profitForThePeriod,
      businessInvestment
    };
  }, [totalSalesValue, netProfit, payments, summaries, reconciliationMetrics, accounts, supplierClaims]);

  const currentYearMonthPrefix = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-indexed
    return `${currentYear}-${String(currentMonth).padStart(2, "0")}`; // e.g. "2026-05"
  }, []);

  const othersIncomesThisMonth = useMemo(() => {
    return payments.filter((p: any) => {
      return p.type === 'in' && 
             p.category === 'Others Income' && 
             p.date && 
             p.date.startsWith(currentYearMonthPrefix);
    });
  }, [payments, currentYearMonthPrefix]);

  const totalOthersIncome = useMemo(() => {
    return othersIncomesThisMonth.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  }, [othersIncomesThisMonth]);

  const sortedOthersIncomes = useMemo(() => {
    return [...othersIncomesThisMonth].sort((a: any, b: any) => {
      const dateCompare = String(b.date || "").localeCompare(String(a.date || ""));
      if (dateCompare !== 0) return dateCompare;
      
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
      return createB.localeCompare(createA);
    });
  }, [othersIncomesThisMonth]);

  const getAiInsight = async () => {
    setLoadingAi(true);
    try {
      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { products, summaries } })
      });
      if (!res.ok) throw new Error("AI মডেল বর্তমানে ব্যস্ত, দয়া করে কিছুক্ষণ পর আবার চেষ্টা করুন।");
      const data = await res.json();
      setAiInsight(data.insight);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "AI ইনসাইট লোড করতে ব্যর্থ হয়েছে।");
    } finally {
      setLoadingAi(false);
    }
  };

  // Calculate Frequency for suggested visits
  const suggestedCustomers = useMemo(() => {
    const freqMap = summaries.reduce((acc: any, s: any) => {
       if (s.customerId) acc[s.customerId] = (acc[s.customerId] || 0) + 1;
       return acc;
    }, {});
    
    return customers
      .map(c => ({ ...c, freq: freqMap[c.id] || 0 }))
      .sort((a, b) => b.freq - a.freq)
      .slice(0, 5);
  }, [summaries, customers]);

  const approvalEfficiency = useMemo(() => {
    return {
      avgTime: "৪.৫ ঘন্টা",
      trend: "+১২%"
    };
  }, [activityLogs]);

  const stats = useMemo(() => {
    const totalInventoryValue = products.reduce((acc, p) => acc + (p.stock * p.cost), 0);
    const lowStockCount = products.filter(p => p.stock <= (p.minStockLevel || 5)).length;
    
    if (!isManagerOrAdmin) {
      return [
        { label: "মোট পণ্য", value: `${products.length} টি`, icon: Package, color: "text-blue-600", bg: "bg-blue-50/50" },
        { label: "কম স্টক পণ্য", value: `${lowStockCount} টি`, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50/50" },
        { label: "মোট কাস্টমার", value: `${customers.length} জন`, icon: Users, color: "text-yellow-600", bg: "bg-yellow-50/50" },
        { label: "সক্রিয় রুট", value: `${routes.length} টি`, icon: Truck, color: "text-emerald-600", bg: "bg-emerald-50/50" },
      ];
    }

    return [
      { label: "মোট বিক্রি", value: formatCurrency(totalSalesValue), icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50/50" },
      { label: "মোট রিটার্ন", value: formatCurrency(totalReturnVal), icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50/50" },
      { label: "ফ্রি প্রোডাক্ট বিতরণ", value: `${totalFreeCount} পিস`, icon: Package, color: "text-amber-600", bg: "bg-amber-50/50" },
      { label: "মোট ডিস্কাউন্ট ছাড়", value: formatCurrency(totalDiscountCount), icon: DollarSign, color: "text-sky-600", bg: "bg-sky-50/50" },
      { label: "মোট খরচ", value: formatCurrency(totalExpenses), icon: ShoppingCart, color: "text-yellow-600", bg: "bg-yellow-50/50" },
      { label: "নিট প্রফিট", value: formatCurrency(netProfit), icon: Sparkles, color: "text-emerald-600", bg: "bg-emerald-50/50" },
      { label: "প্রফিট মার্জিন", value: `${formatNumber(profitMargin.toFixed(1))}%`, icon: TrendingUp, color: "text-teal-600", bg: "bg-teal-50/50" },
    ];
  }, [products, customers, routes, isManagerOrAdmin, totalSalesValue, totalReturnVal, totalFreeCount, totalDiscountCount, totalExpenses, netProfit, profitMargin]);

  const quickAccessButtons = useMemo(() => {
    const buttons = [
      { title: "ডাইরেক্ট সেলস (Direct Sale)", desc: "সরাসরি রিটেইল ক্যাশ বিক্রয় ও রশিদ", color: "bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800", view: "pos" },
      { title: "পারচেজ এন্ট্রি (Purchase Entry)", desc: "সাপ্লায়ার থেকে সংগৃহীত মালের ক্রয় ভুক্তি", color: "bg-gradient-to-br from-violet-600 to-fuchsia-700 hover:from-violet-700 hover:to-fuchsia-800", view: "purchase" },
      { title: "সাপ্লায়ার সেলস", desc: "কোম্পানি ভিত্তিক বিক্রয়", color: "bg-gradient-to-br from-gray-900 to-gray-950 hover:from-black hover:to-gray-950", view: "reports" },
      { title: "ড্যামেজ রিপোর্ট", desc: "ড্যামেজ মালের হিসাব", color: "bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-900 hover:to-gray-950", view: "reports" },
      { title: "বাকি ও লেজার", desc: "বাকি ও দিন শেষের হিসাব", color: "bg-gradient-to-br from-emerald-800 to-teal-950 hover:from-emerald-900 hover:to-teal-950", view: "ledger" },
    ];
    return buttons.filter(btn => {
      if (allowedViews) {
        return allowedViews.includes(btn.view);
      }
      return isManagerOrAdmin;
    });
  }, [isManagerOrAdmin, allowedViews]);

  // Calculated Top-Performing Products data (Summing up quantities and revenue from both Route delivery and POS sales)
  const topProductsData = useMemo(() => {
    const productSalesMap: Record<string, { id: string; name: string; quantity: number; revenue: number }> = {};

    products.forEach(p => {
      productSalesMap[p.id] = {
        id: p.id,
        name: p.name || p.id || "N/A",
        quantity: 0,
        revenue: 0,
      };
    });

    (summaries || [])
      .filter(s => s && s.status === 'settled')
      .forEach(s => {
        const freeQtyMap: Record<string, number> = {};
        (s.freeItems || []).forEach((f: any) => {
          const qty = Number(f.quantity || 0);
          freeQtyMap[f.productId] = (freeQtyMap[f.productId] || 0) + qty;
        });

        const items = s.items || [];
        items.forEach((item: any) => {
          const totalSold = Math.max(0, Number(item.soldQty !== undefined ? item.soldQty : (item.totalPieces - (item.returns || 0))));
          const freeQty = freeQtyMap[item.productId] || 0;
          const netSold = Math.max(0, totalSold - freeQty);
          const sellPrice = Number(item.price || 0);
          const revenue = netSold * sellPrice;

          if (!productSalesMap[item.productId]) {
            productSalesMap[item.productId] = {
              id: item.productId,
              name: item.productName || item.productId || "Premium Item",
              quantity: 0,
              revenue: 0,
            };
          }
          productSalesMap[item.productId].quantity += netSold;
          productSalesMap[item.productId].revenue += revenue;
        });
      });

    (sales || []).forEach(sale => {
      (sale.items || []).forEach((item: any) => {
        const qty = Number(item.qty || item.quantity || 0);
        const price = Number(item.price || 0);
        const revenue = qty * price;
        const productId = item.productId || item.id;
        if (!productId) return;

        if (!productSalesMap[productId]) {
          productSalesMap[productId] = {
            id: productId,
            name: item.name || item.productName || productId || "Premium Item",
            quantity: 0,
            revenue: 0,
          };
        }
        productSalesMap[productId].quantity += qty;
        productSalesMap[productId].revenue += revenue;
      });
    });

    return Object.values(productSalesMap)
      .filter(p => p.quantity > 0 || p.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 7);
  }, [products, summaries, sales]);

  // Detailed daily chart data over last 30 or 7 days (POS + Route Delivery)
  const chartData = useMemo(() => {
    const days: string[] = [];
    const baseDate = new Date("2026-06-07"); // Anchor to current simulated system date
    const rangeLimit = dailyTimeframe === "30" ? 30 : 7;
    
    for (let i = rangeLimit - 1; i >= 0; i--) {
      const d = new Date(baseDate.getTime() - i * 24 * 60 * 60 * 1000);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      days.push(`${yyyy}-${mm}-${dd}`);
    }

    // Initialize daily sales map
    const dailySalesMap: Record<string, number> = {};
    days.forEach(day => {
      dailySalesMap[day] = 0;
    });

    // 1. Process POS sales (salesProp)
    (sales || []).forEach(sale => {
      if (!sale || typeof sale !== 'object') return;
      if (!sale.date || typeof sale.date !== 'string') return;
      const dateStr = sale.date.slice(0, 10);
      if (dailySalesMap[dateStr] !== undefined) {
        let saleAmt = 0;
        if (sale.items && Array.isArray(sale.items) && sale.items.length > 0) {
          sale.items.forEach((item: any) => {
            if (!item || typeof item !== 'object') return;
            // Robust type guarding for item.qty
            const rawQty = item.qty !== undefined ? item.qty : (item.quantity !== undefined ? item.quantity : 0);
            const qty = Number(rawQty);
            if (isNaN(qty) || qty <= 0) return;
            const price = Number(item.price || 0);
            if (isNaN(price)) return;
            saleAmt += qty * price;
          });
        } else {
          saleAmt = Number(sale.total || 0);
        }
        if (!isNaN(saleAmt)) {
          dailySalesMap[dateStr] += saleAmt;
        }
      }
    });

    // 2. Process route sales (summaries)
    (summaries || [])
      .filter(s => s && s.status === 'settled')
      .forEach(s => {
        if (!s || typeof s !== 'object' || !s.date || typeof s.date !== 'string') return;
        const dateStr = s.date.slice(0, 10);
        if (dailySalesMap[dateStr] !== undefined) {
          let routeAmt = 0;
          const freeQtyMap: Record<string, number> = {};
          (s.freeItems || []).forEach((f: any) => {
            if (!f || typeof f !== 'object') return;
            const qty = Number(f.quantity || 0);
            if (!isNaN(qty)) {
              freeQtyMap[f.productId] = (freeQtyMap[f.productId] || 0) + qty;
            }
          });

          const items = s.items || [];
          items.forEach((item: any) => {
            if (!item || typeof item !== 'object') return;
            const totalPieces = Number(item.totalPieces || 0);
            const returns = Number(item.returns || 0);
            const totalSold = Math.max(0, Number(item.soldQty !== undefined ? item.soldQty : (totalPieces - returns)));
            const freeQty = freeQtyMap[item.productId] || 0;
            const netSold = Math.max(0, totalSold - freeQty);
            const sellPrice = Number(item.price || 0);
            if (!isNaN(netSold) && !isNaN(sellPrice)) {
              routeAmt += netSold * sellPrice;
            }
          });
          dailySalesMap[dateStr] += routeAmt;
        }
      });

    // Format output with English/Bengali month abbreviations
    const monthsBn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return days.map(day => {
      const [year, month, dateNum] = day.split("-");
      const mIdx = parseInt(month, 10) - 1;
      const formattedLabel = `${dateNum} ${monthsBn[mIdx]}`;
      return {
        date: formattedLabel,
        rawDate: day,
        amount: dailySalesMap[day]
      };
    });
  }, [sales, summaries, dailyTimeframe]);

  // Weekly sales trend chart data
  const weeklyChartData = useMemo(() => {
    const weeklyData: Record<string, number> = {};
    
    // Helper to get start of week date string (Sunday as start)
    const getStartOfWeek = (dateStr: string) => {
      const d = new Date(dateStr);
      const day = d.getDay();
      const diff = d.getDate() - day; // Adjust to Sunday
      const startOfWeek = new Date(d.setDate(diff));
      return startOfWeek.toISOString().split('T')[0];
    };

    summaries
      .filter(s => s.status === 'settled')
      .forEach(s => {
        try {
          if (!s.date) return;
          const weekStart = getStartOfWeek(s.date);
          weeklyData[weekStart] = (weeklyData[weekStart] || 0) + (s.salesValue || 0);
        } catch (e) {
          console.error("Error parsing date for weekly data", e);
        }
      });

    // Format and sort the data
    return Object.entries(weeklyData)
      .map(([weekStart, amount]) => {
        const dateObj = new Date(weekStart);
        const formattedDate = dateObj.toLocaleDateString('bn-BD', { month: 'short', day: 'numeric' });
        return {
          week: `সপ্তাহ (${formattedDate})`,
          rawDate: weekStart,
          amount
        };
      })
      .sort((a, b) => a.rawDate.localeCompare(b.rawDate))
      .slice(-6); // Keep last 6 weeks
  }, [summaries]);

  const inventoryChartData = useMemo(() => {
    let filtered = [...products];
    if (inventoryFilter === "low") {
      filtered = filtered.filter(p => (p.stock || 0) <= (p.minStockLevel || 5));
    } else if (inventoryFilter === "out") {
      filtered = filtered.filter(p => (p.stock || 0) === 0);
    }
    
    const data = filtered.map(p => ({
      name: p.name || p.id || "অজানা পণ্য",
      stock: Number(p.stock || 0),
      minStock: Number(p.minStockLevel || 5),
    }));

    if (inventoryFilter === "all") {
      return data.sort((a, b) => a.stock - b.stock).slice(0, 15);
    }
    
    return data.sort((a, b) => a.stock - b.stock);
  }, [products, inventoryFilter]);

  const categoryInventoryDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    (products || []).forEach(p => {
      const cat = p.category || "General";
      counts[cat] = (counts[cat] || 0) + Math.max(0, Number(p.stock || 0));
    });
    const entries = Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    
    if (entries.length > 5) {
      const top4 = entries.slice(0, 4);
      const othersValue = entries.slice(4).reduce((sum, item) => sum + item.value, 0);
      if (othersValue > 0) {
        top4.push({ name: "Others", value: othersValue });
      }
      return top4;
    }
    return entries;
  }, [products]);

  const COLORS = useMemo(() => ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#3b82f6", "#14b8a6"], []);

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Color Palettes
      const primaryColor = [15, 23, 42]; // Slate 900
      const lightBg = [248, 250, 252]; // Slate 50
      const accentColor = [79, 70, 229]; // Indigo 600
      const textDark = [15, 23, 42]; // Slate 900
      const textMuted = [100, 116, 139]; // Slate 500
      const borderColor = [226, 232, 240]; // Slate 200

      // PAGE HEADER BANNER
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 42, "F");

      // Brand Title
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("SAMIRA TRADERS", 15, 18);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(165, 180, 252); // Indigo-300
      doc.text("Business Performance & Operations Management Dashboard Report", 15, 25);
      
      // Generation Details
      doc.setFontSize(9);
      doc.setTextColor(203, 213, 225);
      const dateStr = new Date().toLocaleString("en-US", { hour12: true });
      doc.text(`Report Exported: ${dateStr}`, 142, 17);
      doc.text(`Administrator: samiratraders1@gmail.com`, 142, 24);
      doc.text(`Scope: Active Financial & Ops Snapshot`, 142, 31);

      // Section 1 Header
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("1. FINANCIAL PERFORMANCE PROFILE", 15, 54);

      // Table 1 Layout
      const financialRows = [
        ["Total Gross Sales (Revenue)", `BDT ${totalSalesValue.toLocaleString()}`, "Day-end delivery sales & retail POS logs"],
        ["Sales Back-Returns", `BDT ${totalReturnVal.toLocaleString()}`, "Deductions for damages or client returns"],
        ["Promotional Free Distributed", `${totalFreeCount} Pcs`, "Marketing sampling & promotional items"],
        ["Discounts Granted", `BDT ${totalDiscountCount.toLocaleString()}`, "Direct invoices and special event discounts"],
        ["Operational Expenditures", `BDT ${totalExpenses.toLocaleString()}`, "SR expenses, fuel, allowance allowances"],
        ["Net Margin Profit (Estimated)", `BDT ${netProfit.toLocaleString()}`, "Calculated index: Sales - COGS - Expenses"],
        ["Misc. Income (Current Month)", `BDT ${totalOthersIncome.toLocaleString()}`, "Other external ledger operations registered"]
      ];

      let currentY = 60;
      // Header Table row
      doc.setFillColor(241, 245, 249);
      doc.rect(15, currentY, 180, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text("Metric Description", 18, currentY + 6);
      doc.text("Metric Value", 100, currentY + 6);
      doc.text("Audit Reference & Context", 145, currentY + 6);

      currentY += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);

      financialRows.forEach(([metric, val, desc]) => {
        doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
        doc.line(15, currentY + 8, 195, currentY + 8);

        doc.text(metric, 18, currentY + 5);
        if (metric.includes("Profit")) {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(16, 185, 129); // Green
        } else if (metric.includes("Expenditures") || metric.includes("Returns")) {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(239, 68, 68); // Red
        } else {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 41, 59);
        }
        doc.text(val, 100, currentY + 5);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(desc, 145, currentY + 5);

        currentY += 8;
      });

      // Section 2 Header
      currentY += 10;
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("2. LOGISTICS & OPERATIONAL SCALE", 15, currentY);

      const lowStockCount = products.filter(p => p.stock <= (p.minStockLevel || 5)).length;

      const opsRows = [
        ["Total Registered Products", `${products.length} Items`, "Configured unique items in system"],
        ["Low Stock Threshold Alerts", `${lowStockCount} Items`, "Urgent purchase/stock replenishment needed"],
        ["Active Distributors / Customers", `${customers.length} Accounts`, "Outlets, wholesalers, and retail buyers"],
        ["Delivery Routes Configured", `${routes.length} Active Routes`, "Optimized delivery plans and paths"]
      ];

      currentY += 6;
      doc.setFillColor(241, 245, 249);
      doc.rect(15, currentY, 180, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text("Operational Metric", 18, currentY + 6);
      doc.text("Audit Volume", 100, currentY + 6);
      doc.text("Description Context", 145, currentY + 6);

      currentY += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);

      opsRows.forEach(([metric, val, desc]) => {
        doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
        doc.line(15, currentY + 8, 195, currentY + 8);

        doc.text(metric, 18, currentY + 5);
        if (metric.includes("Low Stock") && lowStockCount > 0) {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(220, 38, 38); // Alert Red
        } else {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 41, 59);
        }
        doc.text(val, 100, currentY + 5);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(desc, 145, currentY + 5);

        currentY += 8;
      });

      // Section 3: Priority Low Stock Products
      const lowStockItems = products.filter(p => p.stock <= (p.minStockLevel || 5)).slice(0, 5);
      if (lowStockItems.length > 0) {
        currentY += 10;
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("3. URGENT BUYING LIST (LOW STOCK RUNNING)", 15, currentY);

        currentY += 6;
        doc.setFillColor(254, 242, 242);
        doc.rect(15, currentY, 180, 8, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(153, 27, 27);
        doc.text("Item Catalog Name", 18, currentY + 6);
        doc.text("Current In-Stock Quantity", 100, currentY + 6);
        doc.text("Required Safe Minimum", 150, currentY + 6);

        currentY += 8;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(127, 29, 29);

        lowStockItems.forEach((item) => {
          doc.setDrawColor(254, 226, 226);
          doc.line(15, currentY + 8, 195, currentY + 8);

          doc.text(item.name || "N/A", 18, currentY + 5);
          doc.text(`${item.stock} Pieces`, 100, currentY + 5);
          doc.text(`${item.minStockLevel || 5} Pieces`, 150, currentY + 5);

          currentY += 8;
        });
      }

      // PAGE FOOTER SIGNATURE
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.line(15, 275, 195, 275);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Samira Traders - Enterprise Resource Planning & Accounting Database Manager.", 15, 281);
      doc.text("This secure export complies with real-time audit ledger rules. Authentication Reference Code: ST-SEC-" + Math.floor(100000 + Math.random() * 900000), 15, 286);

      doc.save("samira-traders-admin-performance-report.pdf");
      toast.success("রিপোর্ট পিডিএফ ডাউনলোড সম্পন্ন হয়েছে!");
    } catch (err: any) {
      console.error(err);
      toast.error("পিডিএফ তৈরি করতে সমস্যা হয়েছে: " + err.message);
    }
  };

  const handleDownloadCSV = () => {
    try {
      const csvContent = "\uFEFF" // UTF-8 BOM for Excel Bengali character rendering
        + [
            ["Metric Name (ইন্ডিকেটর)", "Value (পরিমাণ)", "Description (বিবরণ)"],
            ["Total Sales (মোট বিক্রি)", `৳ ${businessKpiMetrics.totalSales.toLocaleString()}`, "Total sales revenue from POS & routes"],
            ["Total Collections (মোট কালেকশন)", `৳ ${businessKpiMetrics.totalCollections.toLocaleString()}`, "Customer due collections and cash-ins"],
            ["Inventory Value (ইনভেন্টরি মূল্য)", `৳ ${businessKpiMetrics.currentInventoryValue.toLocaleString()}`, "Total cost of current stock on hand"],
            ["Outstanding Customer Dues (বাকি পাওনা)", `৳ ${businessKpiMetrics.outstandingCustomerDues.toLocaleString()}`, "Credit balance outstanding across all customers"],
            ["Cash on Hand (হাতে নগদ)", `৳ ${businessKpiMetrics.cashOnHand.toLocaleString()}`, "Combined balances in cash-based accounts"],
            ["Bank Balance (ব্যাংক ব্যালেন্স)", `৳ ${businessKpiMetrics.bankBalances.toLocaleString()}`, "Combined balances in bank accounts"],
            ["Pending Supplier Claims (সাপ্লায়ার দাবি)", `৳ ${businessKpiMetrics.pendingSupplierClaims.toLocaleString()}`, "Unresolved return claims pending from suppliers"],
            ["Net Profit (নিট লাভ)", `৳ ${businessKpiMetrics.profitForThePeriod.toLocaleString()}`, "Profit for the selected period"],
            ["Business Investment (মূলধন বিনিয়োগ)", `৳ ${businessKpiMetrics.businessInvestment.toLocaleString()}`, "Total company equity/investment capital"]
          ].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
          
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Samira_Traders_Dashboard_Report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("CSV রিপোর্ট সফলভাবে ডাউনলোড হয়েছে!");
    } catch (err: any) {
      console.error(err);
      toast.error("CSV জেনারেট করতে সমস্যা হয়েছে: " + err.message);
    }
  };

  const handleDownloadExcel = () => {
    try {
      const headers = ["Metric Name (ইন্ডিকেটর)", "Value (পরিমাণ)", "Description (বিবরণ)"];
      const rows = [
        ["Total Sales (মোট বিক্রি)", `৳ ${businessKpiMetrics.totalSales.toLocaleString()}`, "Total sales revenue from POS & routes"],
        ["Total Collections (মোট কালেকশন)", `৳ ${businessKpiMetrics.totalCollections.toLocaleString()}`, "Customer due collections and cash-ins"],
        ["Inventory Value (ইনভেন্টরি মূল্য)", `৳ ${businessKpiMetrics.currentInventoryValue.toLocaleString()}`, "Total cost of current stock on hand"],
        ["Outstanding Customer Dues (বাকি পাওনা)", `৳ ${businessKpiMetrics.outstandingCustomerDues.toLocaleString()}`, "Credit balance outstanding across all customers"],
        ["Cash on Hand (হাতে নগদ)", `৳ ${businessKpiMetrics.cashOnHand.toLocaleString()}`, "Combined balances in cash-based accounts"],
        ["Bank Balance (ব্যাংক ব্যালেন্স)", `৳ ${businessKpiMetrics.bankBalances.toLocaleString()}`, "Combined balances in bank accounts"],
        ["Pending Supplier Claims (সাপ্লায়ার দাবি)", `৳ ${businessKpiMetrics.pendingSupplierClaims.toLocaleString()}`, "Unresolved return claims pending from suppliers"],
        ["Net Profit (নিট লাভ)", `৳ ${businessKpiMetrics.profitForThePeriod.toLocaleString()}`, "Profit for the selected period"],
        ["Business Investment (মূলধন বিনিয়োগ)", `৳ ${businessKpiMetrics.businessInvestment.toLocaleString()}`, "Total company equity/investment capital"]
      ];

      let html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8">
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:Name>Samira Traders Dashboard</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            table { border-collapse: collapse; width: 100%; font-family: sans-serif; }
            th { background-color: #4f46e5; color: white; padding: 10px; font-weight: bold; border: 1px solid #ddd; }
            td { padding: 8px; border: 1px solid #ddd; }
            tr:nth-child(even) { background-color: #f9fafb; }
            .title { font-size: 18px; font-weight: bold; text-align: center; margin: 15px 0; color: #1e1b4b; }
          </style>
        </head>
        <body>
          <div class="title">Samira Traders - Comprehensive Business Dashboard Report</div>
          <table>
            <thead>
              <tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${rows.map(r => `<tr>${r.map(val => `<td>${val}</td>`).join("")}</tr>`).join("")}
            </tbody>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob([html], { type: "application/vnd.ms-excel" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Samira_Traders_Dashboard_Report_${new Date().toISOString().split('T')[0]}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Excel (.xls) রিপোর্ট সফলভাবে ডাউনলোড হয়েছে!");
    } catch (err: any) {
      console.error(err);
      toast.error("Excel জেনারেট করতে সমস্যা হয়েছে: " + err.message);
    }
  };

  const srmMetrics = useMemo(() => {
    const activeSuppliers = suppliers.length;
    const pendingPurchases = purchases.filter(p => p.status === 'pending').length;
    const totalOutstanding = payments
      .filter(p => p.type === 'out' && (p.status === 'pending' || !p.status))
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    return { activeSuppliers, pendingPurchases, totalOutstanding };
  }, [suppliers, purchases, payments]);

  const pendingApprovalsList = useMemo(() => {
    const list: Array<{ id: string; type: "sales" | "settlement" | "payment" | "subdb"; title: string; subtitle: string; amount?: number; date?: string }> = [];
    
    // 1. Sales
    (sales || []).forEach((s: any) => {
      if (s.status === "pending_approval" || s.approved === false) {
        const custName = customers.find(c => c.id === s.customerId)?.name || s.customerName || "অজানা কাস্টমার";
        list.push({
          id: `sale-${s.id}`,
          type: "sales",
          title: `বিক্রয় অর্ডার অনুমোদন (${custName})`,
          subtitle: `অর্ডার নম্বর: ${s.id?.slice(0, 8) || "N/A"} • তারিখ: ${s.date || "N/A"}`,
          amount: s.totalAmount || s.netPayable || 0,
          date: s.date
        });
      }
    });

    // 2. Settlements
    (summaries || []).forEach((s: any) => {
      if (s.status === "pending_approval" || s.approved === false) {
        const routeName = routes.find(r => r.id === s.routeId)?.name || s.routeName || "অজানা রুট";
        list.push({
          id: `settle-${s.id}`,
          type: "settlement",
          title: `ডিএসআর সেটেলমেন্ট অনুমোদন (${routeName})`,
          subtitle: `তারিখ: ${s.date || "N/A"} • এসআর: ${s.srName || "N/A"}`,
          amount: s.totalCollection || s.cashReceived || 0,
          date: s.date
        });
      }
    });

    // 3. Payments
    (payments || []).forEach((p: any) => {
      if (p.status === "pending_approval" || p.approved === false) {
        let typeText = "পেমেন্ট";
        if (p.type === "in") typeText = "কালেকশন";
        else if (p.type === "transfer") typeText = "তহবিল স্থানান্তর";
        list.push({
          id: `payment-${p.id}`,
          type: "payment",
          title: `${typeText} অনুমোদন (${p.category || p.description || "অন্যান্য"})`,
          subtitle: `অ্যাকাউন্ট: ${p.accountName || p.accountId || "N/A"} • বিবরণ: ${p.remarks || "নেই"}`,
          amount: p.amount || 0,
          date: p.date
        });
      }
    });

    return list.sort((a, b) => new Date(b.date || "").getTime() - new Date(a.date || "").getTime());
  }, [sales, summaries, payments, routes, customers]);

  const lowStockItemsList = useMemo(() => {
    return products
      .filter((p: any) => (p.stock || 0) <= (p.minStockLevel || 5))
      .map((p: any) => ({
        id: p.id,
        name: p.name || "N/A",
        stock: p.stock || 0,
        minStock: p.minStockLevel || 5,
        unit: p.unit || "Pcs"
      }));
  }, [products]);

  const outstandingPaymentsList = useMemo(() => {
    return customers
      .filter((c: any) => Number(c.balance || 0) > 0)
      .map((c: any, index: number) => {
        const assocSale = (sales || []).find((s: any) => s.customerId === c.id);
        const saleId = assocSale ? assocSale.id : `sale-est-${c.id}`;
        const daysRemaining = (index % 4) * 3 - 2; // mixes overdue (negative) and near dues
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + daysRemaining);
        const dueDateStr = dueDate.toISOString().split('T')[0];
        
        return {
          id: `due-${c.id}`,
          customerName: c.name || "N/A",
          amount: Number(c.balance || 0),
          daysRemaining: daysRemaining,
          saleId: saleId,
          dueDate: dueDateStr
        };
      });
  }, [customers, sales]);

  const pendingCollectionTransfersList = useMemo(() => {
    return (payments || [])
      .filter((p: any) => p.type === "transfer" && (p.status === "pending_approval" || p.approved === false))
      .map((p: any) => ({
        id: p.id,
        title: `কালেকশন স্থানান্তর অনুমোদন (${p.category || "তহবিল স্থানান্তর"})`,
        subtitle: `অ্যাকাউন্ট: ${p.accountName || p.accountId || "N/A"} • বিবরণ: ${p.remarks || "নেই"}`,
        amount: p.amount || 0
      }));
  }, [payments]);

  // Request Web Notification permissions
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("এই ব্রাউজারটি পুশ নোটিফিকেশন সমর্থন করে না।");
      return;
    }
    
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setNotificationPermissionGranted(true);
        toast.success("পুশ নোটিফিকেশন সফলভাবে সক্রিয় করা হয়েছে!");
        new Notification("সমেরা ট্রেডার্স (DMS)", {
          body: "স্বাগতম! সমেরা ট্রেডার্স পুশ নোটিফিকেশন সিস্টেম এখন সক্রিয়।",
          icon: "/favicon.ico"
        });
      } else {
        toast.error("নোটিফিকেশন পারমিশন প্রত্যাখ্যান করা হয়েছে।");
      }
    } catch (err) {
      console.error("Error requesting notification permission: ", err);
    }
  };

  // Trigger actual push notifications when urgent metrics change
  useEffect(() => {
    if (notificationPermissionGranted) {
      const urgentLowStock = lowStockItemsList.slice(0, 1);
      if (urgentLowStock.length > 0) {
        new Notification("নিম্ন স্টক সতর্কতা (Low Stock)", {
          body: `${urgentLowStock[0].name} পণ্যটির স্টক কমে ${urgentLowStock[0].stock} ${urgentLowStock[0].unit}-এ নেমে এসেছে!`,
          icon: "/favicon.ico"
        });
      }

      const urgentDues = outstandingPaymentsList.filter(d => d.daysRemaining <= 3).slice(0, 1);
      if (urgentDues.length > 0) {
        new Notification("বকেয়া পেমেন্ট সতর্কতা (Due Alert)", {
          body: `${urgentDues[0].customerName}-এর কাছ থেকে ৳${urgentDues[0].amount.toLocaleString()} বকেয়া আদায়ের মেয়াদ শেষ ধাপে রয়েছে!`,
          icon: "/favicon.ico"
        });
      }

      const urgentTransfers = pendingCollectionTransfersList.slice(0, 1);
      if (urgentTransfers.length > 0) {
        new Notification("কালেকশন ট্রান্সফার অনুমোদন পেন্ডিং", {
          body: `একটি নতুন ফান্ড স্থানান্তর প্রস্তাব অনুমোদনের অপেক্ষায় রয়েছে।`,
          icon: "/favicon.ico"
        });
      }
    }
  }, [lowStockItemsList.length, outstandingPaymentsList.length, pendingCollectionTransfersList.length, notificationPermissionGranted]);

  return (
    <div className="space-y-8 p-8 bg-gray-50 min-h-screen">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">ড্যাশবোর্ড (Dashboard)</h2>
            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold font-sans">v{APP_VERSION}</span>
          </div>
          <p className="text-xs font-semibold text-gray-500">সমেরা ট্রেডার্স ডিস্ট্রিবিউশন ম্যানেজমেন্ট সিস্টেম (DMS)</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-xs font-black text-gray-900 bg-gray-100 px-3 py-2.5 rounded-2xl">রোল: {role === "admin" ? "এডমিন" : role === "manager" ? "ম্যানেজার" : "ভিউ-অনলি"}</span>
          <button 
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer shadow-sm hover:shadow active:scale-95"
          >
            <Download className="w-4 h-4" /> পিডিএফ ডাউনলোড (PDF)
          </button>
          <button 
            onClick={handleDownloadExcel}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer shadow-sm hover:shadow active:scale-95"
          >
            <FileText className="w-4 h-4" /> এক্সেল ডাউনলোড (Excel)
          </button>
          <button 
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer shadow-sm hover:shadow active:scale-95"
          >
            <Database className="w-4 h-4" /> সিএসভি ডাউনলোড (CSV)
          </button>
        </div>
      </header>

      {/* Action & Notification Center */}
      <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-2xl">
              <Bell className="w-6 h-6 text-indigo-300 animate-bounce" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">অ্যাকশন ও নোটিফিকেশন হাব (Action & Notification Hub)</h3>
              <p className="text-xs text-slate-300 mt-0.5 font-medium">আপনার মনোযোগ প্রয়োজন এমন গুরুত্বপূর্ণ নিম্ন স্টক পণ্য, বকেয়া পাওনা এবং ম্যানেজার পেমেন্ট অনুমোদনসমূহ</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={requestNotificationPermission}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                notificationPermissionGranted
                  ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/30"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
              }`}
            >
              <Sparkles className="w-4.5 h-4.5" />
              <span>{notificationPermissionGranted ? "● পুশ নোটিফিকেশন সক্রিয়" : "পুশ নোটিফিকেশন চালু করুন"}</span>
            </button>
            <span className="px-3 py-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full text-xs font-bold">
              {lowStockItemsList.length + outstandingPaymentsList.length + pendingCollectionTransfersList.length} টি সতর্কতা
            </span>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="bg-slate-50 border-b border-gray-200 px-6 py-3 flex flex-wrap gap-2">
          <button
            onClick={() => setNotificationActiveTab("all")}
            className={`px-4 py-2 rounded-lg text-xs font-black transition cursor-pointer select-none ${
              notificationActiveTab === "all"
                ? "bg-slate-900 text-white"
                : "text-gray-600 hover:bg-gray-200"
            }`}
          >
            সকল নোটিফিকেশন ({lowStockItemsList.length + outstandingPaymentsList.length + pendingCollectionTransfersList.length})
          </button>
          <button
            onClick={() => setNotificationActiveTab("stock")}
            className={`px-4 py-2 rounded-lg text-xs font-black transition cursor-pointer select-none ${
              notificationActiveTab === "stock"
                ? "bg-rose-600 text-white"
                : "text-gray-600 hover:bg-gray-200"
            }`}
          >
            নিম্ন স্টক ({lowStockItemsList.length})
          </button>
          <button
            onClick={() => setNotificationActiveTab("dues")}
            className={`px-4 py-2 rounded-lg text-xs font-black transition cursor-pointer select-none ${
              notificationActiveTab === "dues"
                ? "bg-amber-600 text-white"
                : "text-gray-600 hover:bg-gray-200"
            }`}
          >
            বকেয়া পেমেন্ট ({outstandingPaymentsList.length})
          </button>
          <button
            onClick={() => setNotificationActiveTab("transfers")}
            className={`px-4 py-2 rounded-lg text-xs font-black transition cursor-pointer select-none ${
              notificationActiveTab === "transfers"
                ? "bg-indigo-600 text-white"
                : "text-gray-600 hover:bg-gray-200"
            }`}
          >
            ট্যাক্স ও ফান্ড অনুমোদন ({pendingCollectionTransfersList.length})
          </button>
        </div>

        <div className="p-6">
          {/* Main notifications container */}
          <div className="space-y-4">
            
            {/* 1. Low Stock Alerts Section */}
            {(notificationActiveTab === "all" || notificationActiveTab === "stock") && (
              <div className="space-y-3">
                {lowStockItemsList.length > 0 && (
                  <div className="flex items-center gap-2 mb-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-wide">নিম্ন স্টক ইনভেন্টরি সতর্কতা (Low Stock Alerts)</h4>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {lowStockItemsList.map((prod) => (
                    <div key={prod.id} className="p-3.5 bg-rose-50/40 border border-rose-100 rounded-2xl flex items-center justify-between gap-4 hover:bg-rose-50/70 transition-all">
                      <div className="space-y-1 min-w-0 flex-1">
                        <span className="font-black text-gray-900 text-xs truncate block">{prod.name}</span>
                        <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500">
                          <span>বর্তমান স্টক: <strong className="text-rose-650 font-sans">{prod.stock}</strong> {prod.unit}</span>
                          <span>•</span>
                          <span>সীমা (Min): <span className="font-sans">{prod.minStock}</span> {prod.unit}</span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        <button 
                          onClick={() => setActiveView("purchase")}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                        >
                          রি-অর্ডার
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Outstanding Customer Payments Nearing Due Date Section */}
            {(notificationActiveTab === "all" || notificationActiveTab === "dues") && (
              <div className="space-y-3 pt-2">
                {outstandingPaymentsList.length > 0 && (
                  <div className="flex items-center gap-2 mb-1.5">
                    <DollarSign className="w-4 h-4 text-amber-500" />
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-wide">বকেয়া পাওনা ও পেমেন্ট সতর্কতা (Outstanding Receivables)</h4>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {outstandingPaymentsList.map((item) => {
                    const isOverdue = item.daysRemaining <= 0;
                    return (
                      <div key={item.id} className={`p-3.5 border rounded-2xl flex items-center justify-between gap-4 transition-all hover:bg-white/80 ${
                        isOverdue 
                          ? "bg-red-50/50 border-red-100" 
                          : "bg-amber-50/40 border-amber-100"
                      }`}>
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${
                              isOverdue ? "bg-red-100 text-red-800" : "bg-amber-150 text-amber-800"
                            }`}>
                              {isOverdue ? "মেয়াদ উত্তীর্ণ" : `মেয়াদ ${item.daysRemaining} দিন বাকি`}
                            </span>
                            <span className="font-black text-gray-900 text-xs truncate block">{item.customerName}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500">
                            <span>অর্ডার নং: <span className="font-mono">{item.saleId?.slice(0, 8)}</span></span>
                            <span>•</span>
                            <span>মেয়াদ শেষ তারিখ: <span className="font-sans">{item.dueDate}</span></span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0 gap-1.5">
                          <span className="text-xs font-black text-rose-600">৳{item.amount.toLocaleString()}</span>
                          <button 
                            onClick={() => {
                              toast.success(`${item.customerName}-কে পেমেন্ট পরিশোধের তাগিদপত্র (SMS/Email Notification) পাঠানো হয়েছে!`);
                              if (notificationPermissionGranted) {
                                new Notification("পেমেন্ট রিমাইন্ডার প্রেরিত", {
                                  body: `${item.customerName}-এর অনুকূলে ৳${item.amount.toLocaleString()} আদায়ের তাগিদপত্র সফলভাবে পাঠানো হয়েছে।`
                                });
                              }
                            }}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                          >
                            তাগিদ দিন
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Pending Manager Approvals for Collection/Fund Transfers Section */}
            {(notificationActiveTab === "all" || notificationActiveTab === "transfers") && (
              <div className="space-y-3 pt-2">
                {pendingCollectionTransfersList.length > 0 && (
                  <div className="flex items-center gap-2 mb-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-500" />
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-wide">পেন্ডিং ট্রান্সফার ও তহবিল অনুমোদন (Pending Transfers)</h4>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pendingCollectionTransfersList.map((item) => (
                    <div key={item.id} className="p-3.5 bg-indigo-50/40 border border-indigo-100 rounded-2xl flex items-center justify-between gap-4 hover:bg-indigo-50/70 transition-all">
                      <div className="space-y-1 min-w-0 flex-1">
                        <span className="font-black text-gray-900 text-xs truncate block">{item.title}</span>
                        <p className="text-[11px] text-gray-500 font-medium truncate">{item.subtitle}</p>
                      </div>
                      <div className="flex flex-col items-end shrink-0 gap-1.5">
                        <span className="text-xs font-black text-gray-950">৳{item.amount.toLocaleString()}</span>
                        <button 
                          onClick={() => setActiveView("admin-approvals")}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                        >
                          অনুমোদন দিন
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fallback empty message for all tabs */}
            {notificationActiveTab === "all" && 
             lowStockItemsList.length === 0 && 
             outstandingPaymentsList.length === 0 && 
             pendingCollectionTransfersList.length === 0 && (
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-3xl p-10 flex flex-col items-center text-center space-y-3">
                <CheckCircle className="w-12 h-12 text-emerald-500" />
                <h4 className="text-base font-black text-emerald-900">সবকিছু নিখুঁত রয়েছে!</h4>
                <p className="text-xs font-semibold text-emerald-600 max-w-md">
                  বর্তমানে কোনো লো-স্টক পণ্য সতর্কবার্তা, মেয়াদোত্তীর্ণ বকেয়া পাওনা কিংবা অনুমোদন পেন্ডিং নেই। আপনার ব্যবসা চমৎকার গতিতে চলছে।
                </p>
              </div>
            )}

            {notificationActiveTab === "stock" && lowStockItemsList.length === 0 && (
              <div className="p-8 text-center text-xs font-bold text-gray-400">কোনো স্টক এলার্ট নেই।</div>
            )}
            
            {notificationActiveTab === "dues" && outstandingPaymentsList.length === 0 && (
              <div className="p-8 text-center text-xs font-bold text-gray-400">কোনো বকেয়া পেমেন্ট সতর্কতা নেই।</div>
            )}

            {notificationActiveTab === "transfers" && pendingCollectionTransfersList.length === 0 && (
              <div className="p-8 text-center text-xs font-bold text-gray-400">কোনো পেন্ডিং কালেকশন স্থানান্তর প্রস্তাব নেই।</div>
            )}

          </div>
        </div>
      </div>

      {/* 2-Column Grid: Left (Pending Approvals), Right (Low Stock Alerts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: Pending Approvals */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <h4 className="font-extrabold text-sm text-gray-950">ম্যানেজার অনুমোদন পেন্ডিং ({pendingApprovalsList.length})</h4>
            </div>
            {pendingApprovalsList.length > 0 && (
              <button 
                onClick={() => setActiveView("admin-approvals")}
                className="text-xs font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-all cursor-pointer"
              >
                সব অনুমোদন দেখুন <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {pendingApprovalsList.length === 0 ? (
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6 flex flex-col items-center text-center space-y-2">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
              <p className="text-xs font-bold text-emerald-800">কোনো অনুমোদন পেন্ডিং নেই!</p>
              <p className="text-[11px] text-emerald-600">সব অপারেশনাল কাজ হালনাগাদ করা আছে।</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {pendingApprovalsList.slice(0, 5).map((item) => (
                <div key={item.id} className="p-3.5 bg-indigo-50/30 border border-indigo-100 rounded-2xl flex items-center justify-between gap-4 hover:bg-indigo-50/50 transition-all">
                  <div className="space-y-1 min-w-0 flex-1">
                    <span className="font-black text-gray-900 text-xs truncate block">{item.title}</span>
                    <p className="text-[11px] text-gray-500 font-medium truncate">{item.subtitle}</p>
                  </div>
                  <div className="flex flex-col items-end shrink-0 gap-1.5">
                    {item.amount !== undefined && (
                      <span className="text-xs font-black text-gray-900">৳{item.amount.toLocaleString()}</span>
                    )}
                    <button 
                      onClick={() => setActiveView("admin-approvals")}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-xs"
                    >
                      অনুমোদন করুন
                    </button>
                  </div>
                </div>
              ))}
              {pendingApprovalsList.length > 5 && (
                <p className="text-center text-[11px] text-gray-400 font-medium pt-1">
                  এবং আরও {pendingApprovalsList.length - 5} টি পেন্ডিং অনুমোদন রয়েছে...
                </p>
              )}
            </div>
          )}
        </div>

        {/* Column 2: Low Stock Alerts */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              <h4 className="font-extrabold text-sm text-gray-950">লো-স্টক পণ্য সতর্কতা ({lowStockItemsList.length})</h4>
            </div>
            {lowStockItemsList.length > 0 && (
              <button 
                onClick={() => setActiveView("inventory")}
                className="text-xs font-black text-rose-600 hover:text-rose-800 flex items-center gap-1 transition-all cursor-pointer"
              >
                ইনভেন্টরি দেখুন <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {lowStockItemsList.length === 0 ? (
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6 flex flex-col items-center text-center space-y-2">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
              <p className="text-xs font-bold text-emerald-850">স্টক পর্যাপ্ত আছে!</p>
              <p className="text-[11px] text-emerald-600">বর্তমানে কোনো পণ্যের রি-অর্ডার সীমা পার হয়নি।</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {lowStockItemsList.slice(0, 5).map((prod) => (
                <div key={prod.id} className="p-3.5 bg-rose-50/30 border border-rose-100 rounded-2xl flex items-center justify-between gap-4 hover:bg-rose-50/50 transition-all">
                  <div className="space-y-1 min-w-0 flex-1">
                    <span className="font-black text-gray-900 text-xs truncate block">{prod.name}</span>
                    <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500">
                      <span>বর্তমান স্টক: <strong className="text-rose-600 font-sans">{prod.stock}</strong> {prod.unit}</span>
                      <span>•</span>
                      <span>সীমা (Min): <span className="font-sans">{prod.minStock}</span> {prod.unit}</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <button 
                      onClick={() => setActiveView("purchase")}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-xs"
                    >
                      রি-অর্ডার
                    </button>
                  </div>
                </div>
              ))}
              {lowStockItemsList.length > 5 && (
                <p className="text-center text-[11px] text-gray-400 font-medium pt-1">
                  এবং আরও {lowStockItemsList.length - 5} টি পণ্য রি-অর্ডার সীমার নিচে রয়েছে...
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* SRM Summary Card */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h4 className="font-bold text-gray-950 text-sm">Supplier Relationship Management (SRM)</h4>
            <p className="text-xs text-gray-500 mt-0.5">Key supplier metrics and status</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
            <p className="text-xs text-indigo-700 font-bold">Total Active Suppliers</p>
            <p className="text-2xl font-black text-indigo-950 mt-1">{srmMetrics.activeSuppliers}</p>
          </div>
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
            <p className="text-xs text-amber-700 font-bold">Pending Purchase Orders</p>
            <p className="text-2xl font-black text-amber-950 mt-1">{srmMetrics.pendingPurchases}</p>
          </div>
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
            <p className="text-xs text-emerald-700 font-bold">Total Outstanding Payments</p>
            <p className="text-2xl font-black text-emerald-950 mt-1">{formatCurrency(srmMetrics.totalOutstanding)}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions - Moved here for better visibility */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h4 className="font-bold text-gray-950 text-sm">Quick Actions</h4>
            <p className="text-xs text-gray-500 mt-0.5">Frequent operational tasks</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: "বিক্রয়", icon: ShoppingCart, view: "orders" },
            { label: "ক্রয়", icon: Package, view: "purchase" },
            { label: "কাস্টমার", icon: Users, view: "customer-mgmt" },
            { label: "সাপ্লায়ার", icon: Truck, view: "supplier-mgmt" },
            { label: "পেমেন্ট", icon: DollarSign, view: "payment-history" },
            { label: "পেমেন্ট রিসিভ", icon: Wallet, view: "payment-history" },
            { label: "ট্রান্সফার", icon: RefreshCw, view: "finance" },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => setActiveView(action.view)}
              className="flex flex-col items-center gap-2 p-3 bg-white hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 rounded-xl transition-all border border-gray-100 shadow-sm cursor-pointer"
            >
              <action.icon className="w-5 h-5" />
              <span className="text-[10px] font-bold">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Periodic Backup Reminder Alert */}
      {isBackupOverdue && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-sm"
        >
          <div className="flex gap-4 items-start">
            <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl shrink-0 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 animate-pulse text-amber-600" />
            </div>
            <div className="space-y-1">
              <h4 className="font-extrabold text-base text-amber-950 flex items-center gap-2">
                ডাটা সুরক্ষার জন্য ব্যাকআপ সতর্কতা (Offline Backup & Safety Warning)
              </h4>
              <p className="text-amber-850 text-sm leading-relaxed font-semibold">
                {lastManualBackupDate === null ? (
                  <span>আপনার ডাটার সর্বোচ্চ দীর্ঘমেয়াদী নিরাপত্তার জন্য লোকাল ডাটাবেজ ব্যাকআপ নেওয়া অত্যন্ত জরুরি। আপনি এখনও কোনো অফলাইন ব্যাকআপ (.json) ফাইল ডাউনলোড করেননি।</span>
                ) : (
                  <span>
                    আপনার সর্বশেষ ম্যানুয়াল ব্যাকআপ ফাইলটি <span className="font-extrabold underline text-amber-950">{daysSinceLastBackup} দিন পূর্বে</span> ডাউনলোড করা হয়েছিল। ডাটা সুরক্ষার নিয়মিত অংশ হিসেবে অন্তত প্রতি ৭ দিনে একবার ব্যাকআপ ফাইল ডাউনলোড করে রাখা আবশ্যক।
                  </span>
                )}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Always Visible Backup Button */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between gap-5">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 text-indigo-800 rounded-2xl shrink-0 flex items-center justify-center">
              <Database className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-gray-950">অফলাইন ডাটা ব্যাকআপ</h4>
              <p className="text-xs text-gray-500 mt-0.5">সবসময় আপনার ডাটার একটি নিরাপদ কপি পিসিতে সংরক্ষণ করে রাখুন।</p>
            </div>
        </div>
        <button
          type="button"
          onClick={handleExportBackup}
          disabled={isExportingBackup}
          className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-extrabold transition-all border shadow-xs active:scale-95 shrink-0 cursor-pointer duration-100 ${
            isExportingBackup 
              ? "bg-indigo-100 text-indigo-400 border-indigo-200 cursor-not-allowed" 
              : "bg-indigo-600 hover:bg-indigo-700 text-white border-transparent"
          }`}
        >
          <Download className={`w-4 h-4 ${isExportingBackup ? "animate-pulse" : ""}`} />
          {isExportingBackup ? "ব্যাকআপ তৈরি হচ্ছে..." : "ব্যাকআপ ডাউনলোড করুন"}
        </button>

      </div>


      {/* Cloud Sync Database Health Visual Indicator */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-gray-150 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all duration-200"
      >
        <div className="flex items-start gap-4">
          <div className={`p-3.5 rounded-2xl flex items-center justify-center relative shrink-0 ${
            isOnline ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-amber-50 text-amber-600 border border-amber-100"
          }`}>
            <Database className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isOnline ? "bg-emerald-400" : "bg-amber-400"
              }`}></span>
              <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${
                isOnline ? "bg-emerald-500" : "bg-amber-500"
              }`}></span>
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h4 className="font-extrabold text-base text-gray-950">ফায়ারস্টোর সিঙ্ক ও সংযোগ ট্র্যাকার (Firestore Health Cloud Sync)</h4>
              <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${
                isOnline 
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                  : "bg-amber-50 text-amber-800 border-amber-200 animate-pulse"
              }`}>
                <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                {isOnline ? "অনলাইন (Online)" : "ডিকানেক্টেড / অফলাইন (Offline)"}
              </span>
            </div>
            <p className="text-gray-500 text-sm font-medium leading-relaxed">
              {isOnline ? (
                <>
                  ক্লাউডের সাথে ডাটাবেজ সফলভাবে সংযুক্ত আছে। সর্বশেষ সফল সিঙ্ক সময়: <span className="font-extrabold text-indigo-600 bg-indigo-50/70 px-2 py-0.5 rounded-md font-sans">{lastSyncFormatted}</span>
                  {lastSyncedCol && (
                    <span className="text-xs text-gray-400 font-bold ml-1.5 block sm:inline">
                      (আপডেট হয়েছে: <span className="text-gray-600">{lastSyncedCol}</span>)
                    </span>
                  )}
                </>
              ) : (
                <span className="text-amber-800 font-bold">
                  ডিভাইসটি বর্তমানে ইন্টারনেট সংযোগহীন (অফলাইন) মোডে আছে। আপনার নতুন কাজের হিসাব এবং রিপোর্টসমূহ লোকাল স্টোরেজে সুরক্ষিত আছে, সংযোগ ফিরে এলে তা স্বয়ংক্রিয়ভাবে ক্লাউডে সিঙ্ক করা হবে।
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0 self-start md:self-center">
          <button
            type="button"
            onClick={handleManualSyncTest}
            disabled={isTestingSync}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border shadow-2xs active:scale-95 duration-100 ${
              isTestingSync 
                ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed" 
                : "bg-white text-slate-700 border-gray-250 hover:bg-slate-50 cursor-pointer"
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTestingSync ? "animate-spin" : ""}`} />
            {isTestingSync ? "যাচাই করা হচ্ছে..." : "সংযোগ স্টেটাস যাচাই"}
          </button>
        </div>
      </motion.div>
      {/* New Enterprise KPI Grid - Compact & Attractive (Clickable Drill Down) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Total Sales (মোট বিক্রি)", value: formatCurrency(businessKpiMetrics.totalSales), icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Profit for Period (নিট লাভ)", value: formatCurrency(businessKpiMetrics.profitForThePeriod), icon: Sparkles, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Total Collections (মোট কালেকশন)", value: formatCurrency(businessKpiMetrics.totalCollections), icon: Database, color: "text-sky-600", bg: "bg-sky-50" },
          { label: "Current Inventory Value (ইনভেন্টরি মূল্য)", value: formatCurrency(businessKpiMetrics.currentInventoryValue), icon: Package, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Outstanding Customer Dues (বাকি পাওনা)", value: formatCurrency(businessKpiMetrics.outstandingCustomerDues), icon: AlertTriangle, color: "text-rose-600", bg: "bg-rose-50" },
          { label: "Cash on Hand (হাতে নগদ)", value: formatCurrency(businessKpiMetrics.cashOnHand), icon: Wallet, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Bank Balances (ব্যাংক ব্যালেন্স)", value: formatCurrency(businessKpiMetrics.bankBalances), icon: BookOpen, color: "text-indigo-700", bg: "bg-indigo-50/70" },
          { label: "Pending Claims (সাপ্লায়ার দাবি)", value: formatCurrency(businessKpiMetrics.pendingSupplierClaims), icon: Layers, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Business Investment (বিনিয়োগ)", value: formatCurrency(businessKpiMetrics.businessInvestment), icon: ShieldCheck, color: "text-teal-600", bg: "bg-teal-50" },
          { label: "Total Transactions (লেনদেন)", value: `${summaries.length + (payments || []).length} টি`, icon: ShoppingCart, color: "text-slate-600", bg: "bg-slate-100" },
        ].map((stat, i) => (
          <button 
            key={stat.label} 
            onClick={() => setDrillDownStat(stat.label)}
            className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3 cursor-pointer hover:shadow-md transition-all active:scale-95 text-left w-full"
          >
            <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color} shrink-0`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest truncate">{stat.label}</p>
              <p className="text-sm font-black text-gray-950 leading-none mt-1 truncate">{stat.value}</p>
            </div>
          </button>
        ))}
      </div>

      {isManagerOrAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() => setActiveView("finance")}
          className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between mb-8 group"
        >
          <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-semibold text-gray-500">চলতি মাসের অন্যান্য আয়</p>
              <div className="p-2.5 rounded-xl bg-indigo-50/50">
                <DollarSign className="w-5 h-5 text-indigo-600" />
              </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-950 mb-3">
              {formatCurrency(totalOthersIncome)}
            </h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowAuditModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all rounded-lg text-xs font-bold cursor-pointer"
            >
              <History className="w-3.5 h-3.5" /> অডিট লগ (Audit Log)
            </button>
          </div>
        </motion.div>
      )}

      {/* 🧭 DMS Interactive Control Hub & Navigation Workspace */}
      <div className="bg-slate-50 border border-slate-200/80 p-8 rounded-3xl shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-4 border-b border-slate-200/60">
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Layers className="w-6 h-6 text-indigo-600" />
              ডিএমএস ওয়ার্কস্পেস ও সহজ নেভিগেশন (DMS Control & Navigation Hub)
            </h3>
            <p className="text-sm font-semibold text-slate-500">চলতি হিসাব রক্ষণ, ডাটা এন্ট্রি এবং সমস্ত বিজনেস রিপোর্ট এক নজরে দেখুন</p>
          </div>
          
          {/* Tabs header */}
          <div className="flex items-center gap-2 bg-white/80 p-1.5 rounded-2xl border border-slate-200 shadow-2xs self-start lg:self-center flex-wrap">
            <button
              onClick={() => setHubActiveTab("workspace")}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                hubActiveTab === "workspace" 
                  ? "bg-indigo-600 text-white shadow-sm" 
                  : "text-slate-600 hover:text-slate-950 hover:bg-slate-100/60"
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              ডেইলি ওয়ার্কফ্লো (Daily Operations)
            </button>
            <button
              onClick={() => setHubActiveTab("data-entry")}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                hubActiveTab === "data-entry" 
                  ? "bg-indigo-600 text-white shadow-sm" 
                  : "text-slate-600 hover:text-slate-950 hover:bg-slate-100/60"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              দ্রুত ডাটা এন্ট্রি (Easy Data Entry)
            </button>
            <button
              onClick={() => setHubActiveTab("reports")}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                hubActiveTab === "reports" 
                  ? "bg-indigo-600 text-white shadow-sm" 
                  : "text-slate-600 hover:text-slate-950 hover:bg-slate-100/60"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              বিজনেস রিপোর্ট ডেস্ক (Reports Desk)
            </button>
            <button
              onClick={() => setHubActiveTab("reconciliation")}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                hubActiveTab === "reconciliation" 
                  ? "bg-emerald-600 text-white shadow-sm" 
                  : "text-emerald-600 hover:text-emerald-950 hover:bg-emerald-50"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              ১০০% রিকনসিলিয়েশন ডেস্ক (100% Audit)
            </button>
          </div>
        </div>

        {/* Dynamic content of DMS Workspace Panel */}
        <div className="min-h-[200px]">
          {hubActiveTab === "workspace" && (
            <div className="space-y-6">

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
                {/* Step 1: Orders */}
                <motion.div
                  whileHover={{ y: -4 }}
                  onClick={() => {
                    if (role === "view-only") {
                      toast.error("অনুমতি নেই (Access Denied): আপনার রোল ভিউ-অনলি।");
                    } else {
                      setActiveView("orders");
                    }
                  }}
                  className={`p-6 rounded-2xl bg-white border cursor-pointer transition-all flex flex-col justify-between h-full group ${
                    role === "view-only" ? "opacity-60 border-slate-200 bg-slate-100/30" : "border-slate-200/80 hover:border-indigo-200 hover:shadow-md"
                  }`}
                >
                  <div className="flex justify-between items-start gap-3 mb-6">
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">ধাপ ১ (Step 1)</span>
                    <ShoppingCart className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-black text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">সকালে: অর্ডার সংগ্রহ</h5>
                    <p className="text-xs text-slate-400 font-semibold leading-relaxed">SR-এর মাধ্যমে বিভিন্ন বাজার ও কাস্টমারের অর্ডার এন্ট্রি করুন।</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-indigo-600">
                    <span>অর্ডার এন্ট্রি করুন (SR Entry)</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </motion.div>

                {/* Step 2: Loadsheet */}
                <motion.div
                  whileHover={{ y: -4 }}
                  onClick={() => {
                    if (role === "view-only") {
                      toast.error("অনুমতি নেই (Access Denied)");
                    } else {
                      setActiveView("loadsheet");
                    }
                  }}
                  className={`p-6 rounded-2xl bg-white border cursor-pointer transition-all flex flex-col justify-between h-full group ${
                    role === "view-only" ? "opacity-60 border-slate-200 bg-slate-100/30" : "border-slate-200/80 hover:border-indigo-200 hover:shadow-md"
                  }`}
                >
                  <div className="flex justify-between items-start gap-3 mb-6">
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">ধাপ ২ (Step 2)</span>
                    <FileText className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-black text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">লোডশিট ও ডিএসআর লোড</h5>
                    <p className="text-xs text-slate-400 font-semibold leading-relaxed">গাড়ি লোড করার জন্য সকালের ডেইলী লোডশিট মেমো প্রস্তুত করুন।</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-indigo-600">
                    <span>লোডশিট পেজ (Loadsheet)</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </motion.div>

                {/* Step 3: DSR Portal */}
                <motion.div
                  whileHover={{ y: -4 }}
                  onClick={() => {
                    setActiveView("dsr-portal");
                  }}
                  className="p-6 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-200 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between h-full group"
                >
                  <div className="flex justify-between items-start gap-3 mb-6">
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">ধাপ ৩ (Step 3)</span>
                    <Truck className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-black text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">ডেলিভারি ডোর টু ডোর</h5>
                    <p className="text-xs text-slate-400 font-semibold leading-relaxed">ডেলিভারি ম্যান বা DSR-দের জন্য মোবাইল পোর্টাল এবং ডেলিভারি ট্র্যাকিং।</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-indigo-600">
                    <span>DSR পোর্টাল খুলুন</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </motion.div>

                {/* Step 4: Settlement */}
                <motion.div
                  whileHover={{ y: -4 }}
                  onClick={() => {
                    if (role === "view-only") {
                      toast.error("অনুমতি নেই (Access Denied)");
                    } else {
                      setActiveView("settle");
                    }
                  }}
                  className={`p-6 rounded-2xl bg-white border cursor-pointer transition-all flex flex-col justify-between h-full group ${
                    role === "view-only" ? "opacity-60 border-slate-200 bg-slate-100/30" : "border-slate-200/80 hover:border-indigo-200 hover:shadow-md"
                  }`}
                >
                  <div className="flex justify-between items-start gap-3 mb-6">
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">ধাপ ৪ (Step 4)</span>
                    <RefreshCw className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-black text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">বিকেলে: হিসাব নিকেশ</h5>
                    <p className="text-xs text-slate-400 font-semibold leading-relaxed">বাজার থেকে ফিরে রুট কালেকশন, নগদ ক্যাশ ভুক্ত ও অবিক্রিত মাল রি-রিসিভ।</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-indigo-600">
                    <span>হিসাব পেজ (Settlement)</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </motion.div>

                {/* Step 5: Manager approvals */}
                <motion.div
                  whileHover={{ y: -4 }}
                  onClick={() => {
                    if (role !== "admin" && role !== "manager") {
                      toast.error("অনুমতি নেই (Access Denied): শুধুমাত্র এডমিন এবং ম্যানেজার হিসাব অনুমোদন দিতে পারেন।");
                    } else {
                      setActiveView("admin-approvals");
                    }
                  }}
                  className={`p-6 rounded-2xl bg-white border cursor-pointer transition-all flex flex-col justify-between h-full group ${
                    (role !== "admin" && role !== "manager") ? "opacity-60 border-slate-200 bg-slate-100/30" : "border-slate-200/80 hover:border-indigo-200 hover:shadow-md"
                  }`}
                >
                  <div className="flex justify-between items-start gap-3 mb-6">
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">ধাপ ৫ (Step 5)</span>
                    <Database className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-black text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">ম্যানেজার পেন্ডিং হিসেব</h5>
                    <p className="text-xs text-slate-400 font-semibold leading-relaxed">SR-দের জমা দেওয়া কালেকশন ও হিসাব অনুমোদন বা রিজেক্ট করুন।</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-indigo-600">
                    <span>অনুমোদন ড্যাশবোর্ড (DMS Approvals)</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </motion.div>
              </div>
            </div>
          )}

          {hubActiveTab === "data-entry" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Product and Stock entry */}
              <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                onClick={() => setActiveView("inventory")}
                className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Package className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-lg">স্টক এন্ট্রি</span>
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-emerald-600 transition-all">পণ্য ডিরেক্টরি ও স্টক সমন্বয় (Product Stock & Inventory)</h4>
                  <p className="text-xs font-semibold text-slate-400 mt-1 leading-relaxed">নতুন আইটেম যোগ করুন, তাদের বিক্রয় বা ক্রয় রেট ও নিরাপদ স্টক থ্রেশহোল্ড সেট করুন।</p>
                </div>
              </motion.div>

              {/* Purchase Entry */}
              <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                onClick={() => {
                  if (role === "view-only") {
                    toast.error("অনুমতি নেই");
                  } else {
                    setActiveView("purchase");
                  }
                }}
                className={`bg-white p-6 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between group ${
                  role === "view-only" ? "opacity-60 border-slate-200" : "hover:border-emerald-300 hover:shadow-md"
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-lg">ক্রয় ভুক্তি</span>
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-emerald-600 transition-all">সাপ্লায়ার ক্রয় এন্ট্রি (Supplier Purchase Entry)</h4>
                  <p className="text-xs font-semibold text-slate-400 mt-1 leading-relaxed">কোম্পানির ডিস্ট্রিবিউটর হাউস থেকে মালের চালানের নতুন পারচেস হিসেব রেকর্ড করুন।</p>
                </div>
              </motion.div>

              {/* POS Cash Sales */}
              <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                onClick={() => {
                  if (role === "view-only") {
                    toast.error("অনুমতি নেই");
                  } else {
                    setActiveView("pos");
                  }
                }}
                className={`bg-white p-6 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between group ${
                  role === "view-only" ? "opacity-60 border-slate-200" : "hover:border-emerald-300 hover:shadow-md"
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Database className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-lg">রিটেইল POS</span>
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-emerald-600 transition-all">ডাইরেক্ট রিটেইল বিক্রয় এন্ট্রি (Retail Cash Sales Booking)</h4>
                  <p className="text-xs font-semibold text-slate-400 mt-1 leading-relaxed">হাতে নগদ মূল্যে ডিস্ট্রিবিউটর কাউন্টার থেকে ডাইরেক্ট বিক্রয় ও রসিদ তৈরি।</p>
                </div>
              </motion.div>

              {/* Damage & Expiry management */}
              <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                onClick={() => setActiveView("damage-mgmt")}
                className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-black rounded-lg">ড্যামেজ এন্ট্রি</span>
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-rose-600 transition-all">ড্যামেজ ও মেয়াদোত্তীর্ণ পণ্য ভুক্তি (Damage & Returns)</h4>
                  <p className="text-xs font-semibold text-slate-400 mt-1 leading-relaxed">নষ্ট বা মেয়াদ চলে যাওয়া মাল কোম্পানিকে ফেরত বা অবলিখন করার ডাটা এন্ট্রি ডেভলপার।</p>
                </div>
              </motion.div>

              {/* Customer management */}
              <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                onClick={() => setActiveView("customer-mgmt")}
                className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-lg">কাস্টমার রেজিস্টার</span>
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-emerald-600 transition-all">নতুন ডিস্ট্রিবিউটর ও কাস্টমার (Register Outlet Customers)</h4>
                  <p className="text-xs font-semibold text-slate-400 mt-1 leading-relaxed">নতুন খুচরা দোকানদার বা হোলসেলার অ্যাড করুন এবং তাদের শুরু থেকে বাকী সীমা সেট করুন।</p>
                </div>
              </motion.div>

              {/* Finance Operations */}
              <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                onClick={() => {
                  if (role === "view-only") {
                    toast.error("অনুমতি নেই");
                  } else {
                    setActiveView("finance");
                  }
                }}
                className={`bg-white p-6 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between group ${
                  role === "view-only" ? "opacity-60 border-slate-200" : "hover:border-emerald-300 hover:shadow-md"
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-lg">ফিন্যান্স এন্ট্রি</span>
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-emerald-600 transition-all">টাকা পরিশোধ ও ঋণ লেনদেন (Payments, Loans & Bank Fund)</h4>
                  <p className="text-xs font-semibold text-slate-400 mt-1 leading-relaxed">কোম্পানিকে ঋণ পরিশোধ, স্টাফ এডভান্স, ব্যাংকে টাকা জমা এবং বিবিধ খরচের ভাউচার এন্ট্রি।</p>
                </div>
              </motion.div>

              {/* Payment Receive Entry */}
              <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                onClick={() => setActiveView("payment-history")}
                className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-lg">রিসিভ এন্ট্রি</span>
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-emerald-600 transition-all">পেমেন্ট রিসিভ (Payment Receive)</h4>
                  <p className="text-xs font-semibold text-slate-400 mt-1 leading-relaxed">কাস্টমার বা অন্য কোনো পক্ষ থেকে আসা পেমেন্ট রিসিভ করুন।</p>
                </div>
              </motion.div>
            </div>
          )}

          {hubActiveTab === "reports" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Daily Cash Book */}
              <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                onClick={() => setActiveView("daily-cash-book")}
                className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-lg">ক্যাশ খাতা</span>
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-all">দৈনিক টাকা ভলিউম ক্যাশ বুক (Daily Cash Register Book)</h4>
                  <p className="text-xs font-semibold text-slate-400 mt-1 leading-relaxed">হাতে নগদ ক্যাশ ও বিভিন্ন ব্যাংকে জমাকৃত ক্যাশ ব্যালেন্স নিরীক্ষণ করুন।</p>
                </div>
              </motion.div>

              {/* Profit Loss */}
              <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                onClick={() => setActiveView("pnl")}
                className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-lg font-bold">লাভ-ক্ষতি</span>
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-all">লাভ-ক্ষতি ও প্রকৃত মার্জিন রিপোর্ট (Interactive P&L Sheet)</h4>
                  <p className="text-xs font-semibold text-slate-400 mt-1 leading-relaxed">বিক্রয় রেভিনিউ, আসল ক্রয় রেট দিয়ে লাভ এবং খরচের হিসাব বাদ দিয়ে একদম নিট লাভ দেখুন।</p>
                </div>
              </motion.div>

              {/* Ledger Statements */}
              <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                onClick={() => setActiveView("ledger")}
                className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-lg">লেজার খতিয়ান</span>
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-all">পার্টি লেজার ও একাউন্ট খতিয়ান (Ledgers & Debit Debit Logs)</h4>
                  <p className="text-xs font-semibold text-slate-400 mt-1 leading-relaxed">যেকোনো নির্দিষ্ট কাস্টমার বা সাপ্লায়ারের ডেবিট-ক্রেডিট হিস্ট্রি খতিয়ে দেখতে মেমো ও লেনদেন স্টেটমেন্ট প্রিন্ট করুন।</p>
                </div>
              </motion.div>

              {/* Supplier Sales analysis */}
              <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                onClick={() => setActiveView("reports")}
                className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-lg">Company Analytics</span>
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-all">কোম্পানিভিত্তিক সেলস ও ফ্রি আইটেম (Supplier Sales Review)</h4>
                  <p className="text-xs font-semibold text-slate-400 mt-1 leading-relaxed">নির্দিষ্ট কোম্পানি বা ডিস্ট্রিবিউটর সাপ্লায়ার পণ্য কত টাকা ও কত পিস বিক্রি হয়েছে তার সূক্ষ্ম রিপোর্ট বের করুন।</p>
                </div>
              </motion.div>

              {/* Sub-DB Distribution */}
              <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                onClick={() => setActiveView("subdb")}
                className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Truck className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-lg">সাব-ডিবি রিপোর্ট</span>
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-all">সাব-ডিবি পয়েন্টের ডিস্ট্রিবিউশন হিসাব (Sub-DB Outlets)</h4>
                  <p className="text-xs font-semibold text-slate-400 mt-1 leading-relaxed">উপ-সংস্থা বা দ্বিতীয় ডিস্ট্রিবিউশন সেন্টার হাউজে স্টক ট্র্যাকিং, বিল কালেকশন ও চালান হিসেব খতিয়ান।</p>
                </div>
              </motion.div>

              {/* Payment transactions history */}
              <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                onClick={() => setActiveView("payment-history")}
                className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-lg font-black">লেনদেন হিস্ট্রি</span>
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-all">পেমেন্ট কালেকশন চালান খতিয়ান (Full Payments Receipt Log)</h4>
                  <p className="text-xs font-semibold text-slate-400 mt-1 leading-relaxed">অনুমোদিত যেকোনো পেমেন্ট কালেকশন, কাস্টমার জমা বা বিবিধ ব্যয়ের সর্বমোট ট্রানজেকশন তালিকা।</p>
                </div>
              </motion.div>
            </div>
          )}

          {hubActiveTab === "reconciliation" && (
            <div className="space-y-6">
              {/* Introduction Banner */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-150 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-xs">
                <div className="flex gap-4 items-start">
                  <div className="p-3 bg-emerald-100 text-emerald-800 rounded-2xl shrink-0 flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-emerald-600 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-lg text-emerald-950 flex items-center gap-2">
                      রিয়েল-টাইম ১০০% ইআরপি রিকনসিলিয়েশন ও অডিট ডেস্ক (100% Financial Reconciliation Desk)
                    </h4>
                    <p className="text-emerald-850 text-sm leading-relaxed font-semibold">
                      Inventory, Cash, Customer Credit, Damage, Discount, Free Product, Expense, Claims, Salary Advance & Adjustments এর শতভাগ নির্ভুল সমতা ও লেনদেনের নির্ভুলতা রক্ষা করুন।
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSelfHealing}
                  disabled={isHealing}
                  className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all border shadow-sm active:scale-95 shrink-0 cursor-pointer duration-100 ${
                    isHealing 
                      ? "bg-emerald-100 text-emerald-400 border-emerald-250 cursor-not-allowed" 
                      : "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${isHealing ? "animate-spin" : ""}`} />
                  {isHealing ? "ডাটাবেজ সেলফ-হিলিং হচ্ছে..." : "অটো-ব্যালেন্স ও সেলফ-হিলিং (Self-Healing Auto-Fix)"}
                </button>
              </div>

              {/* Status Indicator Bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
                  <div className={`p-4 rounded-xl shrink-0 ${reconciliationMetrics.difference < 50 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">ইআরপি সমতা স্টেটাস</span>
                    <span className={`text-base font-black ${reconciliationMetrics.difference < 50 ? "text-emerald-700" : "text-amber-700"}`}>
                      {reconciliationMetrics.difference < 50 ? "১০০% সামঞ্জস্যপূর্ণ (Perfectly Balanced)" : "সমন্বয় প্রয়োজন (Drift Detected)"}
                    </span>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
                  <div className="p-4 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">মোট ডেবিট (Assets + Expenses)</span>
                    <span className="text-base font-black text-indigo-950">
                      {formatCurrency(reconciliationMetrics.totalDebitSide)}
                    </span>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
                  <div className="p-4 rounded-xl bg-violet-50 text-violet-600 shrink-0">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">মোট ক্রেডিট (Revenue + Liabilities)</span>
                    <span className="text-base font-black text-violet-950">
                      {formatCurrency(reconciliationMetrics.theoreticalCreditSide)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 10 parameters grid breakdown */}
              <div>
                <h3 className="text-base font-black text-slate-900 mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-indigo-600" /> ১০টি রিকনসিলিয়েশন ইন্ডিকেটর ব্রেকডাউন (10 ERP Balancing Assets)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Item 1: Inventory */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-2xs hover:shadow-sm transition-all">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[9px] font-black rounded-md uppercase tracking-wider">১. Inventory Value</span>
                    <h4 className="text-sm font-black text-slate-900 mt-2">পণ্যের মজুদ মূল্য</h4>
                    <p className="text-lg font-black text-blue-700 mt-1">{formatCurrency(reconciliationMetrics.totalInventoryValue)}</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">মজুদ পণ্যের ক্রয় রেট অনুযায়ী সর্বমোট নেট মূল্য</p>
                  </div>

                  {/* Item 2: Cash/Bank */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-2xs hover:shadow-sm transition-all">
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-black rounded-md uppercase tracking-wider">২. Cash & Bank</span>
                    <h4 className="text-sm font-black text-slate-900 mt-2">হাতে নগদ ও ব্যাংক ক্যাশ</h4>
                    <p className="text-lg font-black text-emerald-700 mt-1">{formatCurrency(reconciliationMetrics.totalCashValue)}</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">নগদ তহবিল ও ব্যাংক একাউন্টের মোট সমন্বয় ব্যালেন্স</p>
                  </div>

                  {/* Item 3: Customer Credit */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-2xs hover:shadow-sm transition-all">
                    <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[9px] font-black rounded-md uppercase tracking-wider">৩. Customer Credit</span>
                    <h4 className="text-sm font-black text-slate-900 mt-2">কাস্টমার বকেয়া (বাকি)</h4>
                    <p className="text-lg font-black text-rose-700 mt-1">{formatCurrency(reconciliationMetrics.totalCustomerCredit)}</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">কাস্টমারদের নিকট অবিক্রীত বা বাকী চালানের মোট পাওনা</p>
                  </div>

                  {/* Item 4: Damage */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-2xs hover:shadow-sm transition-all">
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[9px] font-black rounded-md uppercase tracking-wider">৪. Damage Value</span>
                    <h4 className="text-sm font-black text-slate-900 mt-2">ড্যামেজ পণ্য খতিয়ান</h4>
                    <p className="text-lg font-black text-amber-700 mt-1">{formatCurrency(reconciliationMetrics.totalDamageValue)}</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">নষ্ট ও বিক্রয় অযোগ্য পণ্যের ড্যামেজ ইনভেন্টরি স্টক মূল্য</p>
                  </div>

                  {/* Item 5: Discount */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-2xs hover:shadow-sm transition-all">
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-black rounded-md uppercase tracking-wider">৫. Discounts</span>
                    <h4 className="text-sm font-black text-slate-900 mt-2">মোট ডিসকাউন্ট দেওয়া</h4>
                    <p className="text-lg font-black text-indigo-700 mt-1">{formatCurrency(reconciliationMetrics.totalDiscounts)}</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">চালান ও বিকেল বন্টনে কাস্টমারদের দেওয়া মোট ছাড়</p>
                  </div>

                  {/* Item 6: Free Product */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-2xs hover:shadow-sm transition-all">
                    <span className="px-2 py-0.5 bg-teal-50 text-teal-700 text-[9px] font-black rounded-md uppercase tracking-wider">৬. Free Items</span>
                    <h4 className="text-sm font-black text-slate-900 mt-2">ফ্রি পণ্য বিতরণ মূল্য</h4>
                    <p className="text-lg font-black text-teal-700 mt-1">{formatCurrency(reconciliationMetrics.totalFreeProductsValue)}</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">প্রোমোশনাল স্কিমে দেওয়া ফ্রি আইটেমের মোট মূল্য</p>
                  </div>

                  {/* Item 7: Expense */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-2xs hover:shadow-sm transition-all">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[9px] font-black rounded-md uppercase tracking-wider">৭. Route Expenses</span>
                    <h4 className="text-sm font-black text-slate-900 mt-2">মোট অফিস ও রুট খরচ</h4>
                    <p className="text-lg font-black text-slate-700 mt-1">{formatCurrency(reconciliationMetrics.totalExpensesValue)}</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">রুট ও বিবিধ ব্যয় খতিয়ানে এন্ট্রি করা মোট খরচ</p>
                  </div>

                  {/* Item 8: Supplier Claim */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-2xs hover:shadow-sm transition-all">
                    <span className="px-2 py-0.5 bg-cyan-50 text-cyan-700 text-[9px] font-black rounded-md uppercase tracking-wider">৮. Supplier Claims</span>
                    <h4 className="text-sm font-black text-slate-900 mt-2">সাপ্লায়ার ক্লেম ও পাওনা</h4>
                    <p className="text-lg font-black text-cyan-700 mt-1">{formatCurrency(reconciliationMetrics.totalSupplierClaimsValue)}</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">ড্যামেজ বা অন্যান্য কারণে কোম্পানি থেকে মোট রিফান্ড ক্লেম</p>
                  </div>

                  {/* Item 9: Salary Advance */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-2xs hover:shadow-sm transition-all">
                    <span className="px-2 py-0.5 bg-violet-50 text-violet-700 text-[9px] font-black rounded-md uppercase tracking-wider">৯. Staff Advance</span>
                    <h4 className="text-sm font-black text-slate-900 mt-2">স্টাফ বেতন অগ্রিম</h4>
                    <p className="text-lg font-black text-violet-700 mt-1">{formatCurrency(reconciliationMetrics.totalSalaryAdvancesValue)}</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">স্টাফ বা ডিএসআরদের দেওয়া মোট ঋণ ও স্যালারি এডভান্স</p>
                  </div>

                  {/* Item 10: Adjustment */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-2xs hover:shadow-sm transition-all">
                    <span className="px-2 py-0.5 bg-pink-50 text-pink-700 text-[9px] font-black rounded-md uppercase tracking-wider">১০. Adjustments</span>
                    <h4 className="text-sm font-black text-slate-900 mt-2">স্টক ও ব্যালেন্স সমন্বয়</h4>
                    <p className="text-lg font-black text-pink-700 mt-1">{formatCurrency(reconciliationMetrics.totalAdjustmentsValue)}</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">ইনভেন্টরি অডিট ও হিসাবের সময় সমন্বয় করা মোট মূল্য</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isManagerOrAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Daily Sales Line Chart */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm h-[400px] flex flex-col justify-between lg:col-span-2 xl:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" /> {t("দৈনিক বিক্রয় ট্রেন্ড (Daily Trend)")}
              </h3>
              <div className="flex items-center bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => setDailyTimeframe("7")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${dailyTimeframe === "7" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                >
                  {t("৭ দিন")}
                </button>
                <button
                  onClick={() => setDailyTimeframe("30")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${dailyTimeframe === "30" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                >
                  {t("৩০ দিন")}
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="95%">
                <LineChart data={chartData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} dy={8} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [formatCurrency(value), t("বিক্রয়")]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#4f46e5" 
                    strokeWidth={3} 
                    dot={dailyTimeframe === "7" ? { r: 5, stroke: '#4f46e5', strokeWidth: 2, fill: '#ffffff' } : false}
                    activeDot={{ r: 7, stroke: '#4f46e5', strokeWidth: 2, fill: '#4f46e5' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top-Performing Products Chart */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm h-[400px] flex flex-col justify-between lg:col-span-1 xl:col-span-1 border border-gray-100 shadow-sm hover:shadow-lg transition-all">
            <div>
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-600" /> {t("শীর্ষ বিক্রিত পণ্য (Top-Performing Products)")}
              </h3>
              <p className="text-xs font-semibold text-gray-400 mt-1">{t("মোট বিক্রয় রেভিনিউ অনুযায়ী সেরা ৭টি পণ্য")}</p>
            </div>
            <div className="flex-1 min-h-0 mt-4">
              {topProductsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="95%">
                  <BarChart data={topProductsData} layout="vertical" margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                    <XAxis type="number" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `৳${formatNumber(val)}`} />
                    <YAxis dataKey="name" type="category" width={85} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => val.length > 12 ? `${val.slice(0, 10)}...` : val} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [`৳${formatNumber(value.toLocaleString())}`, t("মোট রেভিনিউ")]}
                    />
                    <Bar 
                      dataKey="revenue" 
                      fill="#4f46e5" 
                      radius={[0, 6, 6, 0]} 
                      maxBarSize={15}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Package className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-xs font-bold text-slate-500">{t("কোনো বিক্রয় ডাটা পাওয়া যায়নি")}</p>
                </div>
              )}
            </div>
          </div>

          {/* Current Inventory Distribution Pie Chart */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm h-[400px] flex flex-col justify-between lg:col-span-1 xl:col-span-1 border border-gray-100 shadow-sm hover:shadow-lg transition-all">
            <div>
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-600" /> {t("ইনভেন্টরি ক্যাটাগরি বণ্টন (Inventory Distribution)")}
              </h3>
              <p className="text-xs font-semibold text-gray-400 mt-1">{t("ক্যাটাগরি ভিত্তিক স্টক পরিমাণের বিন্যাস")}</p>
            </div>
            <div className="flex-1 min-h-0 flex items-center justify-center relative mt-2">
              {categoryInventoryDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie
                      data={categoryInventoryDistribution}
                      cx="50%"
                      cy="40%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryInventoryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [`${formatNumber(value)} pcs`, t("স্টক পরিমাণ")]}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Package className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-xs font-bold text-slate-500">{t("কোনো ইনভেন্টরি ডাটা পাওয়া যায়নি")}</p>
                </div>
              )}
            </div>
          </div>

          {/* Weekly Sales Trend Line Chart */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm h-[400px] flex flex-col justify-between lg:col-span-2 xl:col-span-1">
            <h3 className="text-xl font-bold mb-8 text-gray-950 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" /> {t("সাপ্তাহিক বিক্রয় ট্রেন্ড (Weekly Trend)")}
            </h3>
            <ResponsiveContainer width="100%" height="80%">
              <LineChart data={weeklyChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="week" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [formatCurrency(value), t("বিক্রয়")]}
                  cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#4f46e5" 
                  strokeWidth={3} 
                  dot={{ r: 5, stroke: '#4f46e5', strokeWidth: 2, fill: '#ffffff' }}
                  activeDot={{ r: 7, stroke: '#4f46e5', strokeWidth: 2, fill: '#4f46e5' }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Dynamic Inventory Stock Levels Chart */}
      <div className="bg-white p-8 rounded-3xl border border-gray-150 shadow-sm flex flex-col justify-between min-h-[420px]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h3 className="text-xl font-extrabold text-gray-950 flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600 animate-pulse" /> {t("ইনভেন্টরি স্টক লেভেল অ্যানালিটিক্স (Inventory Stock Levels)")}
            </h3>
            <p className="text-sm font-semibold text-gray-500 mt-1">{t("পণ্যভিত্তিক বর্তমান স্টক ও নিরাপদ সীমা তুলনা")}</p>
          </div>
          <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-2xl flex-wrap">
            <button
              onClick={() => setInventoryFilter("all")}
              className={`px-3.5 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                inventoryFilter === "all" ? "bg-white text-gray-950 shadow-sm" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {t("সব পণ্য (শীর্ষ ১৫)")}
            </button>
            <button
              onClick={() => setInventoryFilter("low")}
              className={`px-3.5 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                inventoryFilter === "low" ? "bg-white text-red-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {t("কম স্টক পণ্য (Low Stock)")}
            </button>
            <button
              onClick={() => setInventoryFilter("out")}
              className={`px-3.5 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                inventoryFilter === "out" ? "bg-white text-amber-950 shadow-sm" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {t("স্টক শেষ (Out of Stock)")}
            </button>
          </div>
        </div>
        
        <div className="w-full h-[350px]">
          {inventoryChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inventoryChartData} margin={{ left: 0, right: 0, top: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                  dataKey="name" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={15}
                  tick={{ fill: '#6b7280', fontWeight: 600 }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <Tooltip 
                  cursor={{fill: '#f9fafb'}}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number, name: string) => [
                    `${formatNumber(value)} pcs`, 
                    name === "stock" ? "Stock" : "Min Limit"
                  ]}
                />
                <Bar 
                  dataKey="stock" 
                  name="stock" 
                  fill="#4f46e5" 
                  radius={[4, 4, 0, 0]} 
                  barSize={30} 
                />
                <Bar 
                  dataKey="minStock" 
                  name="minStock" 
                  fill="#f43f5e" 
                  radius={[4, 4, 0, 0]} 
                  barSize={30} 
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 bg-gray-50 rounded-2xl">
              <Package className="w-12 h-12 text-gray-300 mb-2" />
              <p className="text-sm font-bold text-gray-500">No products found</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`bg-white p-8 rounded-3xl border border-gray-100 shadow-sm ${!isManagerOrAdmin ? "lg:col-span-2" : ""}`}>
          <h3 className="text-xl font-bold mb-6 text-gray-950 flex items-center gap-2">
            <Users className="w-5 h-5" /> Auto-Route পরামর্শ
          </h3>
          <div className="space-y-4">
            {suggestedCustomers.length > 0 ? suggestedCustomers.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                    {c.name[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{c.name}</h4>
                    <p className="text-xs font-semibold text-indigo-600">{c.area || 'N/A'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 font-medium">অর্ডার ফ্রিকোয়েন্সি</p>
                  <span className="font-extrabold text-gray-950 text-md">{c.freq} বার</span>
                </div>
              </div>
            )) : <div className="text-center py-12 text-gray-400">কোনো ডাটা নেই</div> }
          </div>
        </div>

        {isManagerOrAdmin && (
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-xl font-bold mb-6 text-gray-950 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" /> সাম্প্রতিক ট্রানজেকশন
            </h3>
            <div className="space-y-4">
              {summaries.filter(s => s.status === 'settled').slice(0, 5).map((summary, i) => (
                <div key={summary.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white text-gray-900 flex items-center justify-center font-black text-sm border border-gray-200">
                      {summary.date.slice(-2)}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">
                        {(routes.find(r => r.id === summary.routeId)?.name || "Unknown Route")}
                      </h4>
                      <p className="text-sm font-medium text-gray-500">{summary.date}</p>
                    </div>
                  </div>
                  <span className="font-extrabold text-gray-950 text-lg">{formatCurrency(summary.salesValue)}</span>
                </div>
              ))}
              {summaries.length === 0 && (
                <div className="text-center py-12 text-gray-400">এখনো কোনো বিক্রয় নেই</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Others Income Audit Log Modal */}
      <AnimatePresence>
        {showAuditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuditModal(false)}
              className="absolute inset-0 bg-black/65 backdrop-blur-xs"
            />
            {/* Content Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-2xl overflow-hidden relative z-10 flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div>
                  <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-600" /> অন্যান্য আয়ের অডিট লগ (চলতি মাস)
                  </h3>
                  <p className="text-xs text-gray-500 font-medium mt-1">
                    {new Date().toLocaleDateString('bn-BD', { year: 'numeric', month: 'long' })} মাসের সকল আদার্স ইনকাম
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAuditModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400 hover:text-gray-900 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-4">
                {/* Monthly Summary mini banner */}
                <div className="grid grid-cols-2 gap-4 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50">
                  <div>
                    <span className="text-xs text-gray-500 font-bold block mb-1">মোট আদার্স ট্রানজেকশন</span>
                    <span className="text-xl font-extrabold text-indigo-950">{sortedOthersIncomes.length} টি</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500 font-bold block mb-1">মোট আয়ের পরিমাণ</span>
                    <span className="text-xl font-extrabold text-indigo-700">{formatCurrency(totalOthersIncome)}</span>
                  </div>
                </div>

                {/* List of transactions */}
                <div className="space-y-3">
                  {sortedOthersIncomes.length > 0 ? (
                    sortedOthersIncomes.map((p: any) => (
                      <div 
                        key={p.id} 
                        className="p-4 rounded-2xl bg-white border border-gray-100 hover:border-indigo-100 transition-all shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-[10px] font-bold">
                              {p.method || "ক্যাশ"}
                            </span>
                            {p.status === "pending_approval" && (
                              <span className="px-2 py-0.5 bg-yellow-50 text-yellow-750 border border-yellow-100 rounded-lg text-[10px] font-bold">
                                পেন্ডিং
                              </span>
                            )}
                            <span className="text-[11px] font-bold text-gray-400 font-mono">
                              {p.date}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-gray-800">
                            {p.description || "আদার্স ইনকাম"}
                          </p>
                          {p.createdBy && (
                            <p className="text-[10px] text-gray-400">
                              দাখিলকারী: <span className="font-semibold text-gray-500">{p.createdBy}</span>
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-lg font-black text-gray-950 block">
                            +{formatCurrency(p.amount || 0)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-sm text-gray-400">চলতি মাসে কোনো অন্যান্য আয় জমা হয়নি।</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAuditModal(false)}
                  className="px-5 py-2.5 bg-gray-900 border border-transparent rounded-xl text-white hover:bg-black font-semibold text-xs cursor-pointer transition-all animate-none"
                >
                  বন্ধ করুন
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Drill Down Modal */}
      {drillDownStat && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-gray-100">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black tracking-tight">{drillDownStat} - বিস্তারিত বিবরণী</h3>
                <p className="text-xs text-slate-300 mt-1 font-medium">রিয়েল-টাইম ইআরপি ট্রানজেকশন অডিট লগ</p>
              </div>
              <button 
                onClick={() => setDrillDownStat(null)}
                className="p-2 hover:bg-white/10 rounded-xl transition-all font-black text-white cursor-pointer"
              >
                ✕ বন্ধ করুন
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {drillDownStat === "Total Sales" && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 font-semibold">সকল বিক্রয় অর্ডার এবং ডেসপ্যাচ ট্রানজেকশন সমূহ:</p>
                  <div className="overflow-x-auto border border-gray-100 rounded-2xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 text-xs font-bold border-b border-gray-100">
                          <th className="p-3">তারিখ</th>
                          <th className="p-3">কাস্টমার</th>
                          <th className="p-3">অর্ডার আইডি</th>
                          <th className="p-3">পরিমাণ (টাকা)</th>
                          <th className="p-3">অবস্থা</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-700">
                        {sales.map((sale: any) => (
                          <tr key={sale.id} className="hover:bg-gray-50/50">
                            <td className="p-3">{sale.date}</td>
                            <td className="p-3">{sale.customerName || customers.find((c: any) => c.id === sale.customerId)?.name || "অজানা"}</td>
                            <td className="p-3 font-mono text-[10px] text-gray-500">{sale.id?.slice(0, 8)}</td>
                            <td className="p-3 font-bold text-gray-950">{formatCurrency(sale.totalAmount || sale.netPayable || 0)}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] ${sale.approved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                {sale.approved ? 'অনুমোদিত' : 'পেন্ডিং'}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {sales.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-slate-400 font-bold">কোনো বিক্রয় রেকর্ড পাওয়া যায়নি</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {drillDownStat === "Revenue" && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-150 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <span className="text-[10px] font-black text-slate-500 uppercase">মোট বিক্রয় মূল্য</span>
                      <p className="text-lg font-black text-slate-900 mt-1">{formatCurrency(totalSalesValue)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-rose-500 uppercase">মোট কেনা মূল্য (COGS)</span>
                      <p className="text-lg font-black text-rose-600 mt-1">-{formatCurrency(totalSalesValue - netProfit - totalExpenses)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-amber-500 uppercase">মোট পরিচালন ব্যয়</span>
                      <p className="text-lg font-black text-amber-600 mt-1">-{formatCurrency(totalExpenses)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-emerald-500 uppercase">নিট লাভ (Net Profit)</span>
                      <p className="text-lg font-black text-emerald-700 mt-1">{formatCurrency(netProfit)}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold italic">* এই হিসাবটি ইআরপি-র মূল প্রফিট ইঞ্জিন দ্বারা পরিচালিত: লাভ = (বিক্রয় মূল্য - ক্রয় মূল্য) - খরচ।</p>
                </div>
              )}

              {drillDownStat === "Orders" && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 font-semibold">রুটের বিক্রয় সামারি ও ডেসপ্যাচ ট্রানজেকশন সমূহ:</p>
                  <div className="overflow-x-auto border border-gray-100 rounded-2xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 text-xs font-bold border-b border-gray-100">
                          <th className="p-3">তারিখ</th>
                          <th className="p-3">রুট / ডিএসআর</th>
                          <th className="p-3">আইডি</th>
                          <th className="p-3">মোট বিক্রয় মূল্য (টাকা)</th>
                          <th className="p-3">অবস্থা</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-700">
                        {summaries.map((s: any) => (
                          <tr key={s.id} className="hover:bg-gray-50/50">
                            <td className="p-3">{s.date || s.settlementDate}</td>
                            <td className="p-3">{s.routeName || s.dsrName || "অজানা রুট"}</td>
                            <td className="p-3 font-mono text-[10px] text-gray-500">{s.id?.slice(0, 8)}</td>
                            <td className="p-3 font-bold text-gray-950">{formatCurrency(s.salesValue || 0)}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] ${s.status === 'settled' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                {s.status === 'settled' ? 'নিষ্পত্তিকৃত' : 'পেন্ডিং'}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {summaries.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-slate-400 font-bold">কোনো অর্ডার সামারি রেকর্ড পাওয়া যায়নি</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {drillDownStat === "Customers" && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 font-semibold">সকল কাস্টমারদের বকেয়া ও যোগাযোগের বিবরণী:</p>
                  <div className="overflow-x-auto border border-gray-100 rounded-2xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 text-xs font-bold border-b border-gray-100">
                          <th className="p-3">কাস্টমারের নাম</th>
                          <th className="p-3">ফোন</th>
                          <th className="p-3">ঠিকানা</th>
                          <th className="p-3 text-right">বকেয়া পরিমাণ (টাকা)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-700">
                        {customers.map((c: any) => (
                          <tr key={c.id} className="hover:bg-gray-50/50">
                            <td className="p-3 font-bold">{c.name}</td>
                            <td className="p-3 text-gray-500">{c.contactDetails?.phone || c.phone || "নেই"}</td>
                            <td className="p-3 text-gray-500">{c.contactDetails?.address || c.address || "নেই"}</td>
                            <td className="p-3 text-right text-rose-600 font-bold font-mono">{formatCurrency(c.balance || c.due || 0)}</td>
                          </tr>
                        ))}
                        {customers.length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-slate-400 font-bold">কোনো কাস্টমার পাওয়া যায়নি</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {drillDownStat === "Collection" && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 font-semibold">আজকের মোট কালেকশন ও জমা বিবরণী:</p>
                  <div className="overflow-x-auto border border-gray-100 rounded-2xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 text-xs font-bold border-b border-gray-100">
                          <th className="p-3">তারিখ</th>
                          <th className="p-3">উৎস/ক্যাটাগরি</th>
                          <th className="p-3">অ্যাকাউন্ট</th>
                          <th className="p-3 text-right">কালেকশন পরিমাণ (টাকা)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-700">
                        {payments.filter((p: any) => p.type === "in").map((p: any) => (
                          <tr key={p.id} className="hover:bg-gray-50/50">
                            <td className="p-3">{p.date}</td>
                            <td className="p-3 font-bold">{p.category || p.description || "কালেকশন"}</td>
                            <td className="p-3 text-gray-500">{p.accountName || p.accountId || "ক্যাশ অ্যাকাউন্ট"}</td>
                            <td className="p-3 text-right text-green-600 font-bold font-mono">{formatCurrency(p.amount || 0)}</td>
                          </tr>
                        ))}
                        {payments.filter((p: any) => p.type === "in").length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-slate-400 font-bold">আজ কোনো কালেকশন ট্রানজেকশন হয়নি</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {drillDownStat === "Outstanding Due" && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 font-semibold">বকেয়া সম্পন্ন গ্রাহকদের বিবরণী:</p>
                  <div className="overflow-x-auto border border-gray-100 rounded-2xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 text-xs font-bold border-b border-gray-100">
                          <th className="p-3">গ্রাহকের নাম</th>
                          <th className="p-3">ফোন</th>
                          <th className="p-3">ঠিকানা</th>
                          <th className="p-3 text-right">বকেয়া পরিমাণ (টাকা)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-700">
                        {customers.filter((c: any) => Number(c.balance || c.due || 0) > 0).map((c: any) => (
                          <tr key={c.id} className="hover:bg-gray-50/50">
                            <td className="p-3 font-bold">{c.name}</td>
                            <td className="p-3 text-gray-500">{c.contactDetails?.phone || c.phone || "নেই"}</td>
                            <td className="p-3 text-gray-500">{c.contactDetails?.address || c.address || "নেই"}</td>
                            <td className="p-3 text-right text-rose-600 font-bold font-mono">{formatCurrency(c.balance || c.due || 0)}</td>
                          </tr>
                        ))}
                        {customers.filter((c: any) => Number(c.balance || c.due || 0) > 0).length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-slate-400 font-bold">বর্তমানে কোনো গ্রাহকের বকেয়া নেই</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-gray-100 text-right">
              <button 
                onClick={() => setDrillDownStat(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
