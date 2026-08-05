/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, db } from "./lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { toast, Toaster } from "react-hot-toast";
import { Menu, X, LayoutDashboard, Package, FileText, ShoppingCart, Users, Truck, LogIn, Wifi, WifiOff, Smartphone, Plus, Trash2, Loader2, Sparkles, DollarSign, Wallet, ShoppingBag, Keyboard, ShieldCheck, Camera, Check, Search, MoreVertical, ChevronDown } from "lucide-react";
import { snapshotAll } from "./lib/snapshot";
import { useLanguage } from "./context/LanguageContext";
import { performAppStorageCleanup, APP_VERSION } from "./lib/cleanup";
import { calculateLedger, checkTransactionDrift } from "./utils/ledgerCalculator";
import { recordStockMovement } from "./lib/inventoryEngine";


import Sidebar from "./components/Sidebar";
import AuthScreen from "./components/AuthScreen";
import ActivityLogView from "./components/ActivityLogView";
import GlobalSearchOverlay from "./components/GlobalSearchOverlay";
import GlobalSearchHeader from "./components/GlobalSearchHeader";
import MainMenuView from "./components/MainMenuView";
import OrderManagementView from "./components/OrderManagementView";
import DashboardView from "./components/DashboardView";
import InventoryView from "./components/InventoryView";
import EntitiesView from "./components/EntitiesView";
import CustomerManagementView from "./components/CustomerManagementView";
import SupplierManagementView from "./components/SupplierManagementView";
import PurchaseView from "./components/PurchaseView";
import SettlementView from "./components/SettlementView";
import ReportsView from "./components/ReportsView";
import SROrderView from "./components/SROrderView";
import SROrderListPanel from "./components/SROrderListPanel";
import FinanceView from "./components/FinanceView";
import ProfitLossView from "./components/ProfitLossView";
import LedgerView from "./components/LedgerView";
import UnifiedLedgerView from "./components/UnifiedLedgerView";
import PointOfSaleView from "./components/PointOfSaleView";
import SettingsView from "./components/SettingsView";
import LoadingView from "./components/LoadingView";
import SalesView from "./components/SalesView";
import UsersView from "./components/UsersView";
import RolesView from "./components/RolesView";
import DSRPortalView from "./components/DSRPortalView";
import AdminApprovalsView from "./components/AdminApprovalsView";
import SubDbView from "./components/SubDbView";
import PaymentHistoryView from "./components/PaymentHistoryView";
import DailyCashBookView from "./components/DailyCashBookView";
import QuickActions from "./components/QuickActions";
import DamageView from "./components/DamageView";
import AdvancedOpsView from "./components/AdvancedOpsView";
import DMSEnterpriseView from "./components/DMSEnterpriseView";
import EnterpriseSuitesView from "./components/EnterpriseSuitesView";
import SuperAdminView from "./components/SuperAdminView";
import ReportsPage from "./pages/Reports";
import OrderManagementPage from "./pages/OrderManagement";
import { handleCompleteSale } from "./services/salesService";
import ExpenseLedgerView from "./components/ExpenseLedgerView";
import SupplierClaimsView from "./components/SupplierClaimsView";
import CustomerCollectionModule from "./components/CustomerCollectionModule";
import AuditComplianceView from "./components/AuditComplianceView";
import DocumentScannerModal from "./components/DocumentScannerModal";

import { useCollection } from "./hooks/useCollection";
import { RolePermissions } from "./lib/permissions";
import { applyThemePalette } from "./lib/theme";

export default function App() {
  const { language, setLanguage, t, formatNumber } = useLanguage();

  // Run IndexedDB and localStorage cache/schema cleanup on app mount
  useEffect(() => {
    performAppStorageCleanup();
    // Load and apply brand color palette from localStorage on startup
    const savedPalette = localStorage.getItem("brand-palette") || "default";
    applyThemePalette(savedPalette);
  }, []);

  // Global Tactile Haptic Feedback and Ripple Effect
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      // 1. Subtle Physical Haptic on Mobile Devices
      if (navigator.vibrate) {
        try {
          navigator.vibrate(10);
        } catch (err) {
          // Ignore security/unsupported errors
        }
      }

      // 2. High-Fidelity Visual Ripple Animation
      const target = (e.target as HTMLElement).closest("button, a, [role='button'], .cursor-pointer") as HTMLElement | null;
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const ripple = document.createElement("span");
      ripple.className = "absolute bg-indigo-500/20 dark:bg-white/20 rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2 animate-ripple";
      
      const size = Math.max(rect.width, rect.height) * 2;
      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;

      // Set styles on parent to make it clip perfectly
      const originalPosition = window.getComputedStyle(target).position;
      if (originalPosition === "static" || !originalPosition) {
        target.style.position = "relative";
      }
      
      const originalOverflow = window.getComputedStyle(target).overflow;
      if (originalOverflow !== "hidden") {
        target.style.overflow = "hidden";
      }

      target.appendChild(ripple);

      setTimeout(() => {
        ripple.remove();
      }, 600);
    };

    window.addEventListener("mousedown", handleGlobalClick);
    toast.success("Cleanup Complete. App Optimized");
    return () => window.removeEventListener("mousedown", handleGlobalClick);
  }, []);

  // Periodically check for application updates and show a subtle toast
  useEffect(() => {
    let updateFound = false;

    const showUpdateToast = (newVersion: string) => {
      if (updateFound) return;
      updateFound = true;

      toast((t) => (
        <div className="flex flex-col gap-2 p-1" style={{ minWidth: "260px" }}>
          <div className="flex items-start gap-2.5">
            <span className="text-xl">✨</span>
            <div className="flex-1">
              <p className="font-semibold text-sm text-slate-900 dark:text-white">
                {language === "bn" ? "নতুন আপডেট পাওয়া গেছে!" : "New Update Available!"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5 leading-relaxed">
                {language === "bn" 
                  ? `ভার্সন v${newVersion} এখন সহজলভ্য। সর্বশেষ ফিচার পেতে রিফ্রেশ করুন।` 
                  : `Version v${newVersion} is available. Please refresh to get the latest fixes & features.`}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-1">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition"
            >
              {language === "bn" ? "পরে" : "Later"}
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                window.location.reload();
              }}
              className="bg-indigo-600 text-white px-3 py-1 text-xs font-semibold rounded-md shadow-sm hover:bg-indigo-500 active:bg-indigo-700 transition"
            >
              {language === "bn" ? "রিফ্রেশ" : "Refresh"}
            </button>
          </div>
        </div>
      ), {
        duration: Infinity,
        id: "app-update-notification",
      });
    };

    const checkForUpdates = async () => {
      try {
        const res = await fetch("/sw.js", { cache: "no-store" });
        if (!res.ok) return;
        const text = await res.text();
        const match = text.match(/CACHE_NAME\s*=\s*['"]samira-traders-v([^'"]+)['"]/);
        if (match && match[1]) {
          const serverVersion = match[1];
          if (serverVersion !== APP_VERSION) {
            showUpdateToast(serverVersion);
          }
        }
      } catch (err) {
        console.debug("Update check skipped/failed:", err);
      }
    };

    // 1. Initial check after a short delay
    const initialCheck = setTimeout(checkForUpdates, 3000);

    // 2. Poll for updates every 3 minutes
    const interval = setInterval(checkForUpdates, 3 * 60 * 1000);

    // 3. Listen for native service worker updates
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) return;
        
        // If there's already a waiting service worker
        if (reg.waiting) {
          checkForUpdates(); // verify and show toast
        }

        // On update found
        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          if (!installingWorker) return;
          installingWorker.onstatechange = () => {
            if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
              checkForUpdates();
            }
          };
        };
      });
    }

    return () => {
      clearTimeout(initialCheck);
      clearInterval(interval);
    };
  }, [language]);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState("dashboard");
  const [selectedLedgerParty, setSelectedLedgerParty] = useState<{ id: string; type: "customer" | "supplier" | "staff" } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [activeQuickAction, setActiveQuickAction] = useState<"sale" | "purchase" | "expense" | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [mobileQuickActionsOpen, setMobileQuickActionsOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileMoreMenuOpen, setMobileMoreMenuOpen] = useState(false);
  const [ocrPreFill, setOcrPreFill] = useState<any | null>(null);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);

  // Sync activeView with browser history for graceful PWA & Android hardware Back button behavior
  useEffect(() => {
    try {
      const savedState = window.history.state;
      if (!savedState || savedState.view !== activeView) {
        window.history.pushState({ view: activeView }, "");
      }
    } catch (err) {
      console.warn("History push failed:", err);
    }
  }, [activeView]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e?.state && typeof e.state.view === "string") {
        setActiveView(e.state.view);
      } else {
        setActiveView("dashboard");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const triggerInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try {
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          toast.success("নিশ্চিত করা হয়েছে! অ্যাপটি আপনার মোবাইলে ইনস্টল হচ্ছে।");
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.error("Install prompt choice error:", err);
      }
    } else {
      setShowInstallGuide(true);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("ইন্টারনেট সংযুক্ত হয়েছে! সফলভাবে ক্লাউডের সাথে সিঙ্ক করা হচ্ছে।");
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.error("ইন্টারনেট সংযোগ বিচ্ছিন্ন হয়েছে। সমীরা ট্রেডার্স সম্পূর্ণ অফলাইনে কাজ করছে।");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    let idleTimer: ReturnType<typeof setTimeout>;
    
    const resetTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (user) {
            signOut(auth).then(() => {
                toast.success("নিষ্ক্রিয়তার কারণে লগ আউট হয়েছে।");
            }).catch(err => {
                console.error("Sign out error:", err);
            });
        }
      }, 30 * 60 * 1000); // 30 minutes
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    
    resetTimer();

    return () => {
        events.forEach(event => window.removeEventListener(event, resetTimer));
        clearTimeout(idleTimer);
    };
  }, [user]);

  useEffect(() => {
    const isDemoMode = localStorage.getItem("demo_user_session") !== null;
    if (user && !isDemoMode) {
      snapshotAll(); 
      const timer = setInterval(() => {
          snapshotAll();
      }, 5 * 60 * 1000);
      return () => clearInterval(timer);
    }
  }, [user]);

  const products = useCollection<any>("products");
  const routes = useCollection<any>("routes");
  const staff = useCollection<any>("staff");
  const summaries = useCollection<any>("summaries");
  const customers = useCollection<any>("customers");
  const suppliers = useCollection<any>("suppliers");
  const orders = useCollection<any>("orders");
  const customerGroups = useCollection<any>("customerGroups");

  useEffect(() => {
    if (customerGroups.data) {
      localStorage.setItem("customer_group_colors", JSON.stringify(customerGroups.data));
    }
  }, [customerGroups.data]);
  const sales = useCollection<any>("sales");
  const users = useCollection<any>("users");
  const roles = useCollection<any>("roles");
  const transfers = useCollection<any>("transfers");
  const payments = useCollection<any>("payments");
  const categories = useCollection<any>("categories");
  const damageInventory = useCollection<any>("damageInventory");
  const purchases = useCollection<any>("purchases");
  const accounts = useCollection<any>("accounts");
  const incomeCategories = useCollection<any>("incomeCategories");
  const subDbs = useCollection<any>("subDbs");
  const subDbShipments = useCollection<any>("subDbShipments");
  const subDbSettings = useCollection<any>("subDbSettings");
  const stockAdjustments = useCollection<any>("stockAdjustments");
  const boms = useCollection<any>("boms");
  const productions = useCollection<any>("productions");
  const attendance = useCollection<any>("attendance");
  const payroll = useCollection<any>("payroll");
  const fixedAssets = useCollection<any>("fixedAssets");
  const loans = useCollection<any>("loans");
  const returns = useCollection<any>("returns");
  const activityLogs = useCollection<any>("activity_logs");
  const transactions = useCollection<any>("transactions");
  const expenses = useCollection<any>("expenses");
  const supplierClaims = useCollection<any>("supplierClaims");

  // Dynamically calculate non-drifted customer/supplier balances on the fly
  const enrichedCustomers = useMemo(() => {
    if (customers.loading || transactions.loading) return customers.data || [];
    return (customers.data || []).map(c => {
      const { totalDue } = calculateLedger(
        c.id,
        "customer",
        transactions.data || [],
        suppliers.data || [],
        products.data || [],
        0
      );
      return {
        ...c,
        balance: totalDue
      };
    });
  }, [customers.data, customers.loading, transactions.data, transactions.loading, suppliers.data, products.data]);

  const enrichedSuppliers = useMemo(() => {
    if (suppliers.loading || transactions.loading) return suppliers.data || [];
    return (suppliers.data || []).map(s => {
      const { totalDue } = calculateLedger(
        s.id,
        "supplier",
        transactions.data || [],
        suppliers.data || [],
        products.data || [],
        0
      );
      return {
        ...s,
        balance: totalDue
      };
    });
  }, [suppliers.data, suppliers.loading, transactions.data, transactions.loading, products.data]);

  const auditHealth = useMemo(() => {
    if (customers.loading || suppliers.loading || staff.loading || transactions.loading) {
      return { totalDriftAmount: 0, hasDrift: false, loading: true };
    }
    return {
      ...checkTransactionDrift(
        customers.data || [],
        suppliers.data || [],
        staff.data || [],
        transactions.data || [],
        products.data || []
      ),
      loading: false
    };
  }, [customers.data, customers.loading, suppliers.data, suppliers.loading, staff.data, staff.loading, transactions.data, transactions.loading, products.data]);

  // Wrapped transaction helper methods to ensure real-time consistency
  const addPaymentWithTx = async (payRecord: any) => {
    const payId = await rawPaymentsAddRef.current(payRecord);
    if (payId) {
      const isCust = customers.data.some((c: any) => c.id === payRecord.entityId);
      const isSupp = suppliers.data.some((s: any) => s.id === payRecord.entityId);
      let partyType: "customer" | "supplier" | "staff" = "customer";
      if (isSupp) partyType = "supplier";
      else if (isCust) partyType = "customer";
      else partyType = "staff";

      await transactions.add({
        id: payId,
        partyId: payRecord.entityId,
        partyType,
        type: payRecord.type === "in" ? "payment_in" : "payment_out",
        amount: Number(payRecord.amount || 0),
        supplierId: payRecord.supplierId || "all",
        date: payRecord.date || new Date().toISOString().split("T")[0],
        description: payRecord.description || (payRecord.type === "in" ? "টাকা গ্রহণ" : "টাকা পরিশোধ"),
        refId: payId,
        method: payRecord.method,
        accountId: payRecord.accountId,
        createdAt: new Date().toISOString()
      });
    }
    return payId;
  };

  const removePaymentWithTx = async (payId: string) => {
    await rawPaymentsRemoveRef.current(payId);
    await transactions.remove(payId);
  };

  const addSaleWithTx = async (saleRecord: any) => {
    const saleId = await rawSalesAddRef.current(saleRecord);
    if (saleId) {
      const supplierTotals: Record<string, number> = {};
      (saleRecord.items || []).forEach((item: any) => {
        const p = products.data.find((prod: any) => prod.id === (item.productId || item.id));
        const sId = p?.supplierId || "all";
        const val = Number(item.total || (Number(item.qty || item.quantity || 0) * Number(item.price || 0)) || 0);
        supplierTotals[sId] = (supplierTotals[sId] || 0) + val;
      });

      const saleTotal = Number(saleRecord.total || saleRecord.totalAmount || 0);
      const calculatedTotal = Object.values(supplierTotals).reduce((a, b) => a + b, 0);

      if (calculatedTotal > 0 && Object.keys(supplierTotals).length > 0) {
        for (const [sId, val] of Object.entries(supplierTotals)) {
          const share = val / calculatedTotal;
          const txAmount = saleTotal * share;
          const txId = `${saleId}_${sId}`;

          await transactions.add({
            id: txId,
            partyId: saleRecord.customerId,
            partyType: "customer",
            type: "sale",
            amount: txAmount,
            supplierId: sId,
            date: saleRecord.date ? saleRecord.date.split("T")[0] : new Date().toISOString().split("T")[0],
            description: `পণ্য বিক্রয় (POS/রুট বিল #${saleId.slice(-4).toUpperCase()})`,
            refId: saleId,
            createdAt: new Date().toISOString()
          });
        }
      } else {
        await transactions.add({
          id: saleId,
          partyId: saleRecord.customerId,
          partyType: "customer",
          type: "sale",
          amount: saleTotal,
          supplierId: "all",
          date: saleRecord.date ? saleRecord.date.split("T")[0] : new Date().toISOString().split("T")[0],
          description: `পণ্য বিক্রয় (POS/রুট)`,
          refId: saleId,
          createdAt: new Date().toISOString()
        });
      }
    }
    return saleId;
  };

  const addReturnWithTx = async (retRecord: any) => {
    const retId = await rawReturnsAddRef.current(retRecord);
    if (retId) {
      const p = products.data.find((prod: any) => prod.id === retRecord.productId);
      const sId = p?.supplierId || "all";

      await transactions.add({
        id: retId,
        partyId: retRecord.customerId,
        partyType: "customer",
        type: "return",
        amount: Number(retRecord.amount || 0),
        supplierId: sId,
        date: retRecord.date || new Date().toISOString().split("T")[0],
        description: `পণ্য ফেরত সমন্বয় (পণ্য: ${p?.name || "N/A"})`,
        refId: retId,
        createdAt: new Date().toISOString()
      });
    }
    return retId;
  };

  // Store raw collection methods before overriding to prevent recursion in wrapped helper methods
  const rawSalesAddRef = useRef(sales.add);
  if (sales.add && !(sales.add as any).__isWrapper) rawSalesAddRef.current = sales.add;

  const rawPaymentsAddRef = useRef(payments.add);
  if (payments.add && !(payments.add as any).__isWrapper) rawPaymentsAddRef.current = payments.add;

  const rawPaymentsRemoveRef = useRef(payments.remove);
  if (payments.remove && !(payments.remove as any).__isWrapper) rawPaymentsRemoveRef.current = payments.remove;

  const rawReturnsAddRef = useRef(returns.add);
  if (returns.add && !(returns.add as any).__isWrapper) rawReturnsAddRef.current = returns.add;

  (addSaleWithTx as any).__isWrapper = true;
  (addPaymentWithTx as any).__isWrapper = true;
  (removePaymentWithTx as any).__isWrapper = true;
  (addReturnWithTx as any).__isWrapper = true;

  // Assign the overrides to prevent drift and integrate transactions
  customers.data = enrichedCustomers;
  suppliers.data = enrichedSuppliers;
  payments.add = addPaymentWithTx;
  payments.remove = removePaymentWithTx;
  sales.add = addSaleWithTx;
  returns.add = addReturnWithTx;

  // Background self-healing sync
  useEffect(() => {
    const isDemoMode = localStorage.getItem("demo_user_session") !== null;
    if (
      !loading &&
      !sales.loading &&
      !payments.loading &&
      !returns.loading &&
      !purchases.loading &&
      !customers.loading &&
      !suppliers.loading &&
      !products.loading &&
      !transactions.loading
    ) {
      import("./utils/ledgerCalculator").then(({ syncExistingToTransactions }) => {
        syncExistingToTransactions(
          sales.data || [],
          payments.data || [],
          returns.data || [],
          purchases.data || [],
          customers.data || [],
          suppliers.data || [],
          products.data || [],
          transactions.data || [],
          isDemoMode
        );
      });
    }
  }, [
    loading,
    sales.loading,
    payments.loading,
    returns.loading,
    purchases.loading,
    customers.loading,
    suppliers.loading,
    products.loading,
    transactions.loading,
    sales.data,
    payments.data,
    returns.data,
    purchases.data,
    transactions.data
  ]);

  const syncingSettlementsRef = useRef<Set<string>>(new Set());

  // Self-healing: Automatically ensure all settled settlements hit sales, cash & expense ledgers
  useEffect(() => {
    if (loading || summaries.loading || sales.loading || payments.loading) return;
    const unSyncedSettled = (summaries.data || []).filter(
      (s: any) => (s.status === "settled" || s.approved === true) &&
                  !(sales.data || []).some((sale: any) => sale.refId === s.id) &&
                  !syncingSettlementsRef.current.has(s.id)
    );
    if (unSyncedSettled.length > 0) {
      unSyncedSettled.forEach((summ: any) => {
        syncingSettlementsRef.current.add(summ.id);
        onApproveSettlement(summ.id, true).catch(err => {
          console.error("Settlement auto-sync error:", err);
        });
      });
    }
  }, [loading, summaries.loading, sales.loading, payments.loading, summaries.data, sales.data]);

  const logAdminActivity = async (actionType: string, details: string) => {
    try {
      await addDoc(collection(db, "activity_logs"), {
        userEmail: user?.email || "unknown",
        userId: user?.uid || "unknown",
        actionType,
        details,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Failed to log admin activity:", err);
    }
  };

  const pendingCollections = [
    { name: "পণ্য (Products)", list: products.data },
    { name: "রোড (Routes)", list: routes.data },
    { name: "স্টাফ (Staff)", list: staff.data },
    { name: "দিনশেষের সামারি (Summaries)", list: summaries.data },
    { name: "কাস্টমার (Customers)", list: customers.data },
    { name: "সাপ্লায়ার (Suppliers)", list: suppliers.data },
    { name: "অর্ডার (Orders)", list: orders.data },
    { name: "বিক্রয় (Sales)", list: sales.data },
    { name: "ইউজার (Users)", list: users.data },
    { name: "রোল (Roles)", list: roles.data },
    { name: "ফান্ড ট্রান্সফার (Transfers)", list: transfers.data },
    { name: "পেমেন্ট (Payments)", list: payments.data },
    { name: "ক্যাটাগরি (Categories)", list: categories.data },
    { name: "ড্যামেজ ইনভেন্টরি (Damage)", list: damageInventory.data },
    { name: "ক্রয় (Purchases)", list: purchases.data },
    { name: "অ্যাকাউন্ট (Accounts)", list: accounts.data },
    { name: "সাব-ডিবি পয়েন্ট (SubDB)", list: subDbs.data },
  ];

  const pendingItemsMap = pendingCollections.map(c => ({
    name: c.name,
    count: (c.list || []).filter((x: any) => x.pending_changes === true).length
  })).filter(c => c.count > 0);

  const totalPendingSync = pendingItemsMap.reduce((sum, item) => sum + item.count, 0);

  const onApproveSale = async (saleId: string) => {
    const sale = sales.data.find(s => s.id === saleId);
    if (!sale || sale.approved || sale.status === "paid") return;

    // 1. Stock deduction
    for (const item of sale.items || []) {
      const p = products.data.find(prod => prod.id === item.id || prod.id === item.productId);
      if (p) {
        const qty = Number(item.qty || item.quantity) || 0;
        await products.update(p.id, {
          stock: (p.stock || 0) - qty
        });
      }
    }

    // 2. Adjust customer balance
    if (sale.customerId) {
      const c = customers.data.find(cust => cust.id === sale.customerId);
      if (c) {
        await customers.update(c.id, {
          balance: (c.balance || 0) + (Number(sale.total) || 0)
        });
      }
    }

    // 3. Mark sale as approved
    await sales.update(saleId, {
      status: "paid",
      approved: true
    });

    try {
      const cust = customers.data.find(c => c.id === sale.customerId);
      await logAdminActivity("approve_sale", `সেলস এন্ট্রি অনুমোদন করা হয়েছে: কাস্টমার '${cust?.name || "নগদ বিক্রয়"}' (টাকার পরিমাণ: ${sale.total || 0} ৳, ID: ${saleId})`);
    } catch (e) {}
  };

  const onRejectSale = async (saleId: string) => {
    const sale = sales.data.find(s => s.id === saleId);
    if (!sale || sale.approved || sale.status === "paid" || sale.status === "rejected") return;

    await sales.update(saleId, {
      status: "rejected",
      approved: false
    });

    try {
      const cust = customers.data.find(c => c.id === sale.customerId);
      await logAdminActivity("reject_sale", `সেলস এন্ট্রি প্রত্যাখ্যান/বাতিল করা হয়েছে: কাস্টমার '${cust?.name || "নগদ বিক্রয়"}' (ID: ${saleId})`);
    } catch (e) {}
  };

  const onApproveSubDb = async (subDbId: string) => {
    const subDb = subDbs.data.find(s => s.id === subDbId);
    if (!subDb || subDb.approved || subDb.status === "approved") return;

    await subDbs.update(subDbId, {
      approved: true,
      status: "approved"
    });

    try {
      await logAdminActivity("approve_subdb", `সাব-ডিবি ডিস্ট্রিবিউশন অনুমোদন করা হয়েছে: '${subDb.name || "N/A"}' (ID: ${subDbId})`);
    } catch (e) {}
  };

  const onRejectSubDb = async (subDbId: string) => {
    const subDb = subDbs.data.find(s => s.id === subDbId);
    if (!subDb) return;

    await subDbs.remove(subDbId);

    try {
      await logAdminActivity("reject_subdb", `সাব-ডিবি ডিস্ট্রিবিউশন বাতিল/উচ্ছেদ করা হয়েছে: '${subDb.name || "N/A"}' (ID: ${subDbId})`);
    } catch (e) {}
  };

  const onApproveSettlement = async (summaryId: string, forceSync = false) => {
    const summ = summaries.data.find(s => s.id === summaryId);
    if (!summ) return;

    // Check if already completely synced (unless forceSync is requested)
    if (!forceSync && summ.approved && summ.status === "settled") {
      const hasSales = (sales.data || []).some((s: any) => s.refId === summaryId);
      if (hasSales) return;
    }

    if (syncingSettlementsRef.current.has(summaryId) && !forceSync) return;
    syncingSettlementsRef.current.add(summaryId);

    const settlementDate = summ.settlementDate || summ.date || new Date().toISOString().split('T')[0];
    const routeObj = routes.data.find((r: any) => r.id === summ.routeId);
    const dsrObj = staff.data.find((st: any) => st.id === summ.dsrId);

    // Idempotency check: don't duplicate main sale if it already exists
    const existingSales = (sales.data || []).filter((s: any) => s.refId === summaryId);
    const hasMainSale = existingSales.some((s: any) => s.type === "dsr_settlement");

    // 1. Returns update to warehouse product stock
    for (const item of summ.items || []) {
      const p = products.data.find((prod: any) => prod.id === item.productId);
      const returnQty = Number(item.returns || 0);
      if (p && returnQty > 0) {
        if (!summ.approved) {
          await products.update(p.id, {
            stock: (p.stock || 0) + returnQty
          });
        }
        await recordStockMovement(p.id, 'RETURN', returnQty, summaryId);
      }
    }

    // 2. Main Route Sales Invoice & Ledger Hit (if not already created)
    const soldItems = (summ.items || []).filter((item: any) => {
      const soldQty = item.soldQty !== undefined ? Number(item.soldQty) : (Number(item.totalPieces || 0) - Number(item.returns || 0));
      return soldQty > 0;
    });

    const calculatedSalesVal = soldItems.reduce((acc: number, item: any) => {
      const soldQty = item.soldQty !== undefined ? Number(item.soldQty) : (Number(item.totalPieces || 0) - Number(item.returns || 0));
      return acc + (Number(item.saleValue) || (soldQty * Number(item.price || 0)));
    }, 0);

    const totalSalesValue = Number(summ.salesValue) || calculatedSalesVal;

    if (!hasMainSale && totalSalesValue > 0) {
      const saleRecord = {
        date: settlementDate,
        customerId: summ.routeId ? `route_${summ.routeId}` : "dsr_route_sales",
        customerName: `রুট বিক্রয় (${routeObj?.name || summ.route || "বিকেলের লোডশিট"}) - SR: ${dsrObj?.name || summ.srName || "DSR"}`,
        routeId: summ.routeId || "",
        dsrId: summ.dsrId || "",
        items: soldItems.map((item: any) => {
          const p = products.data.find((prod: any) => prod.id === item.productId);
          const soldCount = item.soldQty !== undefined ? Number(item.soldQty) : (Number(item.totalPieces || 0) - Number(item.returns || 0));
          return {
            productId: item.productId,
            productName: item.productName || p?.name || "Product",
            totalPieces: soldCount,
            cartonSize: p?.piecesInCarton || 1,
            price: Number(item.price || p?.price || 0),
            total: Number(item.saleValue) || (soldCount * Number(item.price || p?.price || 0))
          };
        }),
        total: totalSalesValue,
        paidAmount: Number(summ.totalPayments || 0),
        dueAmount: Number(summ.totalCredits || 0),
        discount: Number(summ.totalDiscountValue || 0),
        status: "approved",
        approved: true,
        type: "dsr_settlement",
        refId: summaryId,
        createdAt: new Date().toISOString()
      };

      await sales.add(saleRecord);
    }

    // 3. Customer Credits (Due cards / বাকিতে বিক্রি)
    for (const credit of summ.credits || []) {
      if (credit.customerId && Number(credit.amount) > 0) {
        const cust = customers.data.find((c: any) => c.id === credit.customerId);
        if (cust) {
          const hasCustCreditSale = (sales.data || []).some((s: any) => s.refId === summaryId && s.customerId === cust.id && s.type === "customer_due_settlement");
          if (!hasCustCreditSale) {
            if (!summ.approved) {
              await customers.update(cust.id, {
                balance: (Number(cust.balance) || 0) + Number(credit.amount)
              });
            }
            await sales.add({
              date: settlementDate,
              customerId: cust.id,
              customerName: cust.name,
              items: [],
              total: Number(credit.amount),
              paidAmount: 0,
              dueAmount: Number(credit.amount),
              status: "approved",
              approved: true,
              type: "customer_due_settlement",
              note: `কাস্টমার বকেয়া বিক্রয় - বিকেলের সেটেলমেন্ট (মেমো/রুট: ${routeObj?.name || "N/A"}, DSR: ${dsrObj?.name || "N/A"})`,
              refId: summaryId,
              createdAt: new Date().toISOString()
            });
          }
        }
      }
    }

    // 4. Free / Gift Product Outflow
    const totalFreeVal = Number(summ.totalFreeValue) || (summ.freeItems || []).reduce((acc: number, f: any) => {
      const p = products.data.find((x: any) => x.id === f.productId);
      return acc + (Number(f.quantity || 0) * Number(p?.price || 0));
    }, 0);

    for (const f of summ.freeItems || []) {
      if (f.productId && Number(f.quantity) > 0) {
        await recordStockMovement(f.productId, 'FREE', -Number(f.quantity), summaryId);
      }
    }

    if (totalFreeVal > 0) {
      const hasFreeExp = (expenses.data || []).some((e: any) => e.refId === summaryId && e.category === "ফ্রি ও উপহার সামগ্রী বিতরণ");
      if (!hasFreeExp) {
        await expenses.add({
          date: settlementDate,
          amount: totalFreeVal,
          source: "DSR",
          category: "ফ্রি ও উপহার সামগ্রী বিতরণ",
          description: `ফ্রি ও উপহার প্রোডাক্ট বিতরণ খরচ - রুট: ${routeObj?.name || "N/A"} (${dsrObj?.name || "DSR"})`,
          refId: summaryId,
          status: "approved",
          approved: true,
          createdAt: new Date().toISOString()
        });
      }
    }

    // 5. Special Cash Discounts
    const totalDiscVal = Number(summ.totalDiscountValue) || (summ.discountItems || []).reduce((acc: number, d: any) => acc + Number(d.amount || 0), 0);
    if (totalDiscVal > 0) {
      const hasDiscExp = (expenses.data || []).some((e: any) => e.refId === summaryId && e.category === "স্পেশাল ক্যাশ ডিসকাউন্ট");
      if (!hasDiscExp) {
        await expenses.add({
          date: settlementDate,
          amount: totalDiscVal,
          source: "DSR",
          category: "স্পেশাল ক্যাশ ডিসকাউন্ট",
          description: `স্পেশাল ক্যাশ ছাড়/ডিসকাউন্ট - রুট: ${routeObj?.name || "N/A"} (${dsrObj?.name || "DSR"})`,
          refId: summaryId,
          status: "approved",
          approved: true,
          createdAt: new Date().toISOString()
        });
      }
    }

    // 6. Damage Returns
    const totalDamVal = Number(summ.totalDamageValue) || (summ.damageItems || []).reduce((acc: number, d: any) => acc + (Number(d.quantity || 0) * Number(d.price || 0)), 0);
    for (const d of summ.damageItems || []) {
      if (d.productId && Number(d.quantity) > 0) {
        const p = products.data.find((prod: any) => prod.id === d.productId);
        await damageInventory.add({
          productId: d.productId,
          supplierId: p?.supplierId || "unknown",
          quantity: Number(d.quantity),
          price: Number(d.price || p?.price || 0),
          date: settlementDate,
          createdAt: new Date().toISOString()
        });
        await recordStockMovement(d.productId, 'DAMAGE', -Number(d.quantity), summaryId);
      }
    }

    if (totalDamVal > 0) {
      const hasDamExp = (expenses.data || []).some((e: any) => e.refId === summaryId && e.category === "নষ্ট ও ড্যামেজ পণ্য ফেরত");
      if (!hasDamExp) {
        await expenses.add({
          date: settlementDate,
          amount: totalDamVal,
          source: "DSR",
          category: "নষ্ট ও ড্যামেজ পণ্য ফেরত",
          description: `নষ্ট ও ড্যামেজ পণ্য ক্ষতি - রুট: ${routeObj?.name || "N/A"} (${dsrObj?.name || "DSR"})`,
          refId: summaryId,
          status: "approved",
          approved: true,
          createdAt: new Date().toISOString()
        });
      }
    }

    // 7. Route Expenses
    for (const e of summ.expenses || []) {
      if (Number(e.amount) > 0) {
        const hasRouteExp = (expenses.data || []).some((ex: any) => ex.refId === summaryId && ex.category === (e.type || "বিকেলের রুট খরচ") && Number(ex.amount) === Number(e.amount));
        if (!hasRouteExp) {
          await expenses.add({
            date: settlementDate,
            amount: Number(e.amount),
            source: "DSR",
            category: e.type || "বিকেলের রুট খরচ",
            description: `DSR রুট খরচ (${e.type || "বিবিধ"}) - SR: ${dsrObj?.name || "DSR"} (বিল #${summaryId.slice(-4).toUpperCase()})`,
            refId: summaryId,
            status: "approved",
            approved: true,
            createdAt: new Date().toISOString()
          });
        }
      }
    }

    // 8. Cash Collection into Cash Account
    const totalPaymentsVal = Number(summ.totalPayments) || (summ.payments || []).reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0);
    if (totalPaymentsVal > 0) {
      const hasCashPay = (payments.data || []).some((p: any) => p.refId === summaryId && p.category === "DSR Route Sales Collection");
      if (!hasCashPay) {
        await payments.add({
          date: settlementDate,
          type: "in",
          amount: totalPaymentsVal,
          category: "DSR Route Sales Collection",
          description: `বিকেলের রুট সেলস ক্যাশ কালেকশন (DSR: ${dsrObj?.name || "DSR"}, রুট: ${routeObj?.name || "N/A"})`,
          entityId: summ.dsrId || "cash",
          method: "Cash",
          accountId: "cash",
          status: "approved",
          approved: true,
          createdBy: "System",
          createdAt: new Date().toISOString(),
          refId: summaryId
        });
      }
    }

    // 9. Discrepancy (Short) handling
    const shortVal = Number(summ.dsrBalance !== undefined ? summ.dsrBalance : 0);
    if (shortVal < 0) {
      const shortAmount = Math.abs(shortVal);
      if (dsrObj) {
        const hasShortPay = (payments.data || []).some((p: any) => p.refId === summaryId && (p.category === "Manager Salary Advance" || p.category === "Recoverable Debt"));
        if (!hasShortPay) {
          const basicSalary = Number(dsrObj.salary || dsrObj.Salary || 12000);
          const advanceAmount = Math.min(shortAmount, basicSalary);
          const debtAmount = shortAmount > basicSalary ? shortAmount - basicSalary : 0;

          if (advanceAmount > 0) {
            await payments.add({
              date: settlementDate,
              type: "out",
              amount: advanceAmount,
              category: "Manager Salary Advance",
              description: `হিসাবের শর্ট সমন্বয় ও অগ্রিম বেতন (Short Balance Salary Advance) - রুট বিল #${summaryId.slice(-4).toUpperCase()}`,
              entityId: summ.dsrId,
              method: "Adjustment",
              accountId: "cash",
              status: "approved",
              approved: true,
              createdBy: "System",
              createdAt: new Date().toISOString(),
              refId: summaryId
            });
          }

          if (debtAmount > 0) {
            await payments.add({
              date: settlementDate,
              type: "out",
              amount: debtAmount,
              category: "Recoverable Debt",
              description: `অতিরিক্ত শর্ট রিকভারেবল ডেট (Recoverable Debt - Short exceeds Salary) - রুট বিল #${summaryId.slice(-4).toUpperCase()}`,
              entityId: summ.dsrId,
              method: "Adjustment",
              accountId: "cash",
              status: "approved",
              approved: true,
              createdBy: "System",
              createdAt: new Date().toISOString(),
              refId: summaryId
            });
          }

          if (!summ.approved) {
            await staff.update(dsrObj.id, {
              balance: (Number(dsrObj.balance) || 0) - shortAmount
            });
          }
        }
      }
    }

    // 10. Mark Summary as settled & approved
    await summaries.update(summaryId, {
      status: "settled",
      approved: true
    });

    try {
      await logAdminActivity("approve_settlement", `ডিএসআর বিকাল হিসাব (সেটেলমেন্ট) অনুমোদন ও লেজার সিঙ্ক সম্পন্ন: স্টাফ '${dsrObj?.name || "N/A"}' (মোট বিক্রয়: ${totalSalesValue} ৳, ID: ${summaryId})`);
    } catch (e) {}
  };

  const onRejectSettlement = async (summaryId: string) => {
    const summ = summaries.data.find(s => s.id === summaryId);
    if (!summ || summ.approved || summ.status === "settled" || summ.status === "rejected") return;

    await summaries.update(summaryId, {
      status: "rejected",
      approved: false
    });

    try {
      const dsr = staff.data.find(st => st.id === summ.dsrId);
      await logAdminActivity("reject_settlement", `ডিএসআর বিকাল হিসাব (সেটেলমেন্ট) বাতিল করা হয়েছে: স্টাফ '${dsr?.name || "N/A"}' (ID: ${summaryId})`);
    } catch (e) {}
  };

  const onApprovePayment = async (paymentId: string) => {
    const payment = payments.data.find(p => p.id === paymentId);
    if (!payment || payment.approved || payment.status === "approved") return;

    await payments.update(paymentId, {
      status: "approved",
      approved: true
    });

    try {
      await logAdminActivity("approve_payment", `ফিন্যান্স পেমেন্ট এন্ট্রি অনুমোদন করা হয়েছে: বিবরণ '${payment.description || "N/A"}' (টাকার পরিমাণ: ${payment.amount || 0} ৳, ID: ${paymentId})`);
    } catch (e) {}
  };

  const onRejectPayment = async (paymentId: string) => {
    const payment = payments.data.find(p => p.id === paymentId);
    if (!payment || payment.approved || payment.status === "approved" || payment.status === "rejected") return;

    await payments.update(paymentId, {
      status: "rejected",
      approved: false
    });

    try {
      await logAdminActivity("reject_payment", `ফিন্যান্স পেমেন্ট এন্ট্রি বাতিল করা হয়েছে: বিবরণ '${payment.description || "N/A"}' (টাকার পরিমাণ: ${payment.amount || 0} ৳, ID: ${paymentId})`);
    } catch (e) {}
  };

  const onClearLogs = async () => {
    if (user?.email !== "samiratraders1@gmail.com" && user?.email !== "samiratraders.barguna@gmail.com") return;
    try {
      const dbLogs = activityLogs.data;
      for (const log of dbLogs) {
        await activityLogs.remove(log.id);
      }
    } catch (err) {
      console.error("Failed to clear logs:", err);
    }
  };

  useEffect(() => {
    try {
      const savedDemoUser = localStorage.getItem("demo_user_session");
      if (savedDemoUser) {
        setUser(JSON.parse(savedDemoUser));
        setLoading(false);
        return;
      }
    } catch (e) {
      console.error("Failed to parse saved demo user:", e);
    }

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      const savedDemoUser = localStorage.getItem("demo_user_session");
      if (!u && !savedDemoUser) {
        setUser(null);
      } else if (u) {
        setUser(u);
      }
      setLoading(false);
    });

    const handleAuthChange = () => {
      try {
        const savedDemoUser = localStorage.getItem("demo_user_session");
        if (savedDemoUser) {
          setUser(JSON.parse(savedDemoUser));
        } else if (!auth.currentUser) {
          setUser(null);
        }
      } catch (e) {
        console.error("Auth change error in App.tsx:", e);
      }
    };
    window.addEventListener("auth-state-change", handleAuthChange);

    return () => {
      unsubscribe();
      window.removeEventListener("auth-state-change", handleAuthChange);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === '?') {
        const activeEl = document.activeElement;
        const isEditable = activeEl && (
          activeEl.tagName === 'INPUT' || 
          activeEl.tagName === 'TEXTAREA' || 
          (activeEl as HTMLElement).isContentEditable
        );
        if (!isEditable) {
          e.preventDefault();
          setShowShortcuts(prev => !prev);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const primaryBtn = document.querySelector('.btn-primary, button[type="submit"]') as HTMLButtonElement | null;
        if (primaryBtn) primaryBtn.click();
      }
      if (e.key === 'Escape') {
        const buttons = Array.from(document.querySelectorAll('button'));
        const closeBtn = buttons.find(b => b.innerText === 'বাতিল' || b.innerText === 'বন্ধ');
        if (closeBtn) closeBtn.click();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="খুঁজুন"]') as HTMLInputElement | null;
        if (searchInput) searchInput.focus();
      }
      if (e.key === 'Backspace') {
        const activeEl = document.activeElement;
        const isEditable = activeEl && (
          activeEl.tagName === 'INPUT' || 
          activeEl.tagName === 'TEXTAREA' || 
          (activeEl as HTMLElement).isContentEditable
        );
        if (!isEditable) {
          e.preventDefault();
          if (activeView !== 'dashboard') {
            setActiveView('dashboard');
            toast.success("ড্যাশবোর্ডে ফিরে যাওয়া হয়েছে");
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeView]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleEnterDemo = () => {
    const demoUser = {
      email: "samiratraders1@gmail.com",
      uid: "demo-admin",
      displayName: "Demo Admin",
      emailVerified: true
    };
    try {
      localStorage.setItem("demo_user_session", JSON.stringify(demoUser));
      setUser(demoUser);
      window.dispatchEvent(new Event("auth-state-change"));
      toast.success("ডেমো মোডে সফলভাবে লগইন করা হয়েছে!");
    } catch (e) {
      console.error(e);
    }
  };

  if (!user) {
    return (
      <>
        <AuthScreen onEnterDemo={handleEnterDemo} />
        <Toaster position="bottom-right" />
      </>
    );
  }

  const handleLogout = async () => {
    try {
      localStorage.removeItem("demo_user_session");
      setUser(null);
      window.dispatchEvent(new Event("auth-state-change"));
      await signOut(auth);
      toast.success("সফলভাবে লগ আউট করা হয়েছে।");
    } catch (err: any) {
      console.error("Logout error:", err);
      toast.error("লগ আউট করতে সমস্যা হয়েছে।");
    }
  };

  let currentUserRecord = users.data.find(u => u.email === user?.email);
  if (!currentUserRecord && user?.email) {
    try {
      const saved = localStorage.getItem(`user_record_${user.email}`);
      if (saved) {
        currentUserRecord = JSON.parse(saved);
      } else {
        const localUsers = JSON.parse(localStorage.getItem("local_users") || "[]");
        currentUserRecord = localUsers.find((u: any) => u.email === user.email);
      }
    } catch (e) {
      console.error(e);
    }
  }
  console.log("DEBUG App.tsx users.data:", users.data);
  console.log("DEBUG App.tsx currentUser:", user);
  console.log("DEBUG App.tsx currentUserRecord:", currentUserRecord);
  const role = (user?.email === 'samiratraders1@gmail.com' || user?.email === 'samiratraders.barguna@gmail.com') ? 'admin' : (currentUserRecord?.role || 'view-only'); // default to view-only
  console.log("DEBUG App.tsx role:", role);

  function AccessDeniedView() {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-gray-500">
        <h2 className="text-xl font-bold">অনুমতি নেই (Access Denied)</h2>
        <p>এই ফিচারটি ব্যবহার করার জন্য আপনার পর্যাপ্ত অনুমতি নেই।</p>
      </div>
    );
  }

  const renderView = () => {
    console.log("DEBUG App.tsx renderView activeView:", activeView, "role:", role);
    const roleData = roles.data.find(r => r.name === role);
    if (role !== 'admin' && roleData && roleData.allowedViews && !roleData.allowedViews.includes(activeView)) {
        console.log("DEBUG App.tsx Access Denied for activeView:", activeView);
        return <AccessDeniedView />;
    }

    switch (activeView) {
      case "menu":
        return <MainMenuView setActiveView={setActiveView} />;
      case "order-mgmt":
        return (
          <OrderManagementView
            orders={orders.data}
            addOrder={orders.add}
            updateOrder={orders.update}
            deleteOrder={orders.remove}
            products={products.data}
            customers={customers.data}
          />
        );
      case "dashboard":
        return (
          <DashboardView 
            products={products.data} 
            summaries={summaries.data} 
            customers={customers.data} 
            suppliers={suppliers.data}
            purchases={purchases.data}
            routes={routes.data} 
            payments={payments.data}
            sales={sales.data}
            activityLogs={activityLogs.data}
            subDbs={subDbs.data}
            subDbShipments={subDbShipments.data}
            expenses={expenses.data}
            setActiveView={setActiveView} 
            role={role}
            allowedViews={role === 'admin' ? (RolePermissions as any).admin.allowedViews : (roleData?.allowedViews || (RolePermissions as any)[role]?.allowedViews || [])}
            staff={staff.data}
            accounts={accounts.data}
            damageInventory={damageInventory.data}
            supplierClaims={supplierClaims.data}
            stockAdjustments={stockAdjustments.data}
            updateCustomer={customers.update}
            updateSupplier={suppliers.update}
            updateStaff={staff.update}
          />
        );
      case "advanced-ops":
        return (
          <AdvancedOpsView
            products={products.data}
            updateProduct={products.update}
            suppliers={suppliers.data}
            customers={customers.data}
            staff={staff.data}
            payments={payments.data}
            boms={boms}
            productions={productions}
            attendance={attendance}
            payroll={payroll}
            fixedAssets={fixedAssets}
            loans={loans}
            returns={returns}
            transfers={transfers}
            addDamage={damageInventory.add}
          />
        );
      case "dms-suite":
        return (
          <DMSEnterpriseView
            products={products.data}
            customers={customers.data}
            suppliers={suppliers.data}
            role={role}
            user={user}
          />
        );
      case "companies":
        if (user?.email !== 'samiratraders1@gmail.com' && user?.email !== 'samiratraders.barguna@gmail.com') return <AccessDeniedView />;
        return <SuperAdminView />;
      case "delivery-route":
        return (
          <ReportsPage
            sales={sales.data}
            customers={customers.data}
            transactions={transactions.data}
            damageInventory={damageInventory.data}
            expenses={expenses.data}
            products={products.data}
          />
        );
      case "inventory":
        return (
          <InventoryView 
            products={products.data} 
            add={async (item) => { await products.add(item); }} 
            update={products.update} 
            remove={products.remove} 
            suppliers={suppliers.data}
            summaries={summaries.data}
            purchases={purchases.data}
            sales={sales.data}
            damageInventory={damageInventory.data}
            role={role}
            stockAdjustments={stockAdjustments}
            user={user}
          />
        );
      case "damage-mgmt":
        return (
          <DamageView 
            products={products.data} 
            suppliers={suppliers.data}
            damageInventory={ { ...damageInventory, add: async (item) => { await damageInventory.add(item); } } }
            user={user}
            role={role}
          />
        );
      case "orders":
        return (
          <SROrderView 
            products={products.data}
            customers={customers.data}
            routes={routes.data}
            staff={staff.data}
            addOrder={orders.add}
            addCustomer={customers.add}
            updateCustomer={customers.update}
            role={role}
            currentUserRecord={currentUserRecord}
            ocrPreFill={ocrPreFill}
            clearOcrPreFill={() => setOcrPreFill(null)}
            onOpenScanner={() => setIsOcrModalOpen(true)}
          />
        );
      case "sr-order-list":
        return (
          <SROrderListPanel 
            orders={orders.data}
            products={products.data}
            updateOrder={orders.update}
            removeOrder={orders.remove}
            addOrder={orders.add}
            routes={routes.data}
            staff={staff.data}
            customers={customers.data}
            addCustomer={customers.add}
            updateCustomer={customers.update}
            currentUserRole={role}
            currentUserRecord={currentUserRecord}
          />
        );
      case "loadsheet":
        return (
          <LoadingView 
             products={products.data}
             routes={routes.data}
             staff={staff.data}
             summaries={summaries.data}
             orders={orders.data}
             customers={customers.data}
             addSummary={summaries.add}
             updateSummary={summaries.update}
             updateOrder={orders.update}
             updateProduct={products.update}
          />
        );
      case "scan-ocr":
        return (
          <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5.5 h-5.5 text-indigo-600 animate-pulse" />
                  এআই চালিত ডকুমেন্ট স্ক্যানার (DMS OCR)
                </h2>
                <p className="text-sm text-slate-500">আপনার মেমো, ভাউচার বা চালান স্ক্যান করে সরাসরি সিস্টেমে ক্রয় বা বিক্রয় রেকর্ড এন্ট্রি করুন।</p>
              </div>
              <button 
                onClick={() => setIsOcrModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-5 py-3 rounded-xl text-xs flex items-center gap-2 shadow-md hover:shadow transition-all active:scale-95 cursor-pointer"
              >
                <Camera className="w-4.5 h-4.5" /> নতুন স্ক্যান শুরু করুন (Start Scan)
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Manual instruction steps */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 md:col-span-1">
                <h3 className="text-sm font-black text-slate-800">কার্যপ্রণালী (How to Use)</h3>
                <div className="space-y-3 text-xs leading-normal">
                  <div className="flex gap-2.5">
                    <span className="w-5 h-5 bg-indigo-100 text-indigo-700 font-extrabold rounded-full flex items-center justify-center shrink-0">১</span>
                    <p className="text-slate-600"><strong className="text-slate-800">ক্যামেরা বা ফাইল আপলোড:</strong> উপরের বোতামটি চেপে সরাসরি ফোনের ক্যামেরা দিয়ে ছবি তুলুন অথবা গ্যালারি থেকে ভাউচার ফাইলটি আপলোড করুন।</p>
                  </div>
                  <div className="flex gap-2.5">
                    <span className="w-5 h-5 bg-indigo-100 text-indigo-700 font-extrabold rounded-full flex items-center justify-center shrink-0">২</span>
                    <p className="text-slate-600"><strong className="text-slate-800">এআই এনালাইসিস:</strong> "Process OCR" বোতাম চাপলে গুগল জেমিনি এআই আপনার ছবি থেকে সব তথ্য (মেমো নম্বর, তারিখ, পণ্যের তালিকা, রেট এবং মোট বিল) স্বয়ংক্রিয়ভাবে বের করবে।</p>
                  </div>
                  <div className="flex gap-2.5">
                    <span className="w-5 h-5 bg-indigo-100 text-indigo-700 font-extrabold rounded-full flex items-center justify-center shrink-0">৩</span>
                    <p className="text-slate-600"><strong className="text-slate-800">সরাসরি ডেটা ইমপোর্ট:</strong> সংগৃহীত ডেটা যাচাই করে এক ক্লিকে সরাসরি "ক্রয় বিল" বা "অর্ডার এন্ট্রি (Sales)" হিসেবে সিস্টেমে ইম্পোর্ট করুন। কোনো ডুপ্লিকেট এন্ট্রি করতে হবে না!</p>
                  </div>
                </div>
              </div>

              {/* Status / Active prefill card */}
              <div className="bg-white border border-slate-150 rounded-2xl p-5 space-y-4 md:col-span-2 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-800 border-b pb-2 mb-3">সরাসরি ইম্পোর্ট ডেটা স্ট্যাটাস (Import Queue)</h3>
                  
                  {ocrPreFill ? (
                    <div className="space-y-4 text-xs">
                      <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-start gap-3">
                        <Check className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-amber-900">ইম্পোর্টের জন্য প্রস্তুত ডেটা পাওয়া গেছে!</h4>
                          <p className="text-amber-700 mt-1">মেমো আইডি: <strong className="font-sans">#{ocrPreFill.invoiceNumber || "N/A"}</strong> | প্রতিষ্ঠান: {ocrPreFill.partyName || "N/A"}</p>
                          <p className="text-amber-700 mt-0.5">মোট লাইনের সংখ্যা: {ocrPreFill.items?.length || 0} টি পণ্য | নিট বিল: <strong className="font-sans">{ocrPreFill.grandTotal} ৳</strong></p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => {
                            setActiveView("purchase");
                            toast.success("ক্রয় এন্ট্রি মডিউলে রিডাইরেক্ট করা হচ্ছে...");
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-4 py-2.5 rounded-xl flex-1 text-center cursor-pointer"
                        >
                          ক্রয় এন্ট্রিতে ইম্পোর্ট করুন (Import to Purchase)
                        </button>
                        <button 
                          onClick={() => {
                            setActiveView("orders");
                            toast.success("অর্ডার এন্ট্রি মডিউলে রিডাইরেক্ট করা হচ্ছে...");
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2.5 rounded-xl flex-1 text-center cursor-pointer"
                        >
                          অর্ডার এন্ট্রিতে ইম্পোর্ট করুন (Import to Sales Order)
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400 flex flex-col items-center justify-center space-y-2">
                      <FileText className="w-10 h-10 text-slate-300" />
                      <p className="text-xs">ইম্পোর্ট কিউ ফাঁকা আছে। নতুন কোনো মেমো স্ক্যান করা হয়নি।</p>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 text-[11px] text-slate-500 leading-normal">
                  💡 <strong className="text-slate-700">টিপস:</strong> ডিস্ট্রিবিউটর হাউসের এসআররা দোকানে গিয়ে মেমো বা চালানের ছবি তুলে এক ক্লিকেই সম্পূর্ণ অর্ডার এন্ট্রি পূরণ করে সাবমিট করতে পারেন!
                </div>
              </div>

            </div>
          </div>
        );
      case "purchase":
        return (
          <PurchaseView 
            products={products.data}
            suppliers={suppliers.data}
            addPurchase={purchases.add}
            updateProduct={products.update}
            addPayment={payments.add}
            purchases={purchases.data}
            removePurchase={purchases.remove}
            updatePurchase={purchases.update}
            ocrPreFill={ocrPreFill}
            clearOcrPreFill={() => setOcrPreFill(null)}
            onOpenScanner={() => setIsOcrModalOpen(true)}
          />
        );
      case "settle":
        return (
          <SettlementView 
            summaries={summaries.data}
            products={products.data}
            staff={staff.data}
            routes={routes.data}
            customers={customers.data}
            updateSummary={summaries.update}
            updateCustomer={customers.update}
            updateProduct={products.update}
            role={role}
            addExpense={async (e) => { await expenses.add(e); }}
            onApproveSettlement={onApproveSettlement}
          />
        );
      case "dsr-portal":
        return (
            <DSRPortalView 
              summaries={summaries.data}
              products={products.data}
              customers={customers.data}
              staff={staff.data}
              routes={routes.data}
              orders={orders.data}
              currentUserRecord={currentUserRecord}
              role={role}
              updateSummary={summaries.update}
              transactions={transactions.data}
              suppliers={suppliers.data}
            />
        );
      case "admin-approvals":
        if (role !== 'admin') return <AccessDeniedView />;
        return (
          <AdminApprovalsView 
            sales={sales.data}
            summaries={summaries.data}
            payments={payments.data}
            customers={customers.data}
            staff={staff.data}
            routes={routes.data}
            products={products.data}
            suppliers={suppliers.data}
            onApproveSale={onApproveSale}
            onRejectSale={onRejectSale}
            onApproveSettlement={onApproveSettlement}
            onRejectSettlement={onRejectSettlement}
            onApprovePayment={onApprovePayment}
            onRejectPayment={onRejectPayment}
            subDbs={subDbs.data}
            onApproveSubDb={onApproveSubDb}
            onRejectSubDb={onRejectSubDb}
          />
        );
      case "customer-mgmt":
        return (
          <CustomerManagementView
            customers={customers.data}
            addCustomer={async (item) => { await customers.add(item); }}
            updateCustomer={async (id, item) => { await customers.update(id, item); }}
            removeCustomer={async (id) => { await customers.remove(id); }}
            sales={sales.data}
            payments={payments.data}
            summaries={summaries.data}
          />
        );
      case "supplier-mgmt":
        return (
          <SupplierManagementView
            suppliers={suppliers.data}
            purchases={purchases.data}
            payments={payments.data}
            addSupplier={async (item) => { await suppliers.add(item); }}
            updateSupplier={async (id, item) => { await suppliers.update(id, item); }}
            removeSupplier={async (id) => { await suppliers.remove(id); }}
            addPayment={async (item) => { await payments.add(item); }}
          />
        );
      case "staff":
        return (
          <EntitiesView 
            title="স্টাফ ও স্যালারি" 
            subtitle="স্টাফ এবং মাসিক বেতনের তালিকা" 
            data={staff.data} 
            add={async (item) => { await staff.add(item); }} 
            update={staff.update} 
            remove={staff.remove} 
            type="staff" 
            payments={payments.data}
            addPayment={payments.add}
          />
        );
      case "routes":
        return <EntitiesView title="রোড ম্যানেজমেন্ট" subtitle="ডেলিভারি রুটের তালিকা" data={routes.data} add={async (item) => { await routes.add(item); }} update={routes.update} remove={routes.remove} type="route" />;
      case "reports":
        return (
          <ReportsView 
            summaries={summaries.data} 
            products={products.data} 
            suppliers={suppliers.data} 
            addPayment={payments.add} 
            staff={staff.data} 
            sales={sales.data}
            purchases={purchases.data}
            payments={payments.data}
            customers={customers.data}
            customerGroups={customerGroups.data}
            accounts={accounts.data}
            transfers={transfers.data}
            subDbShipments={subDbShipments.data}
            removePayment={payments.remove}
            role={role}
            user={user}
            initialTab="sales"
            routes={routes.data}
            expenses={expenses.data}
            damageInventory={damageInventory.data}
            transactions={transactions.data}
          />
        );
      case "pnl":
        return (
          <ReportsView 
            summaries={summaries.data} 
            products={products.data} 
            suppliers={suppliers.data} 
            addPayment={payments.add} 
            staff={staff.data} 
            sales={sales.data}
            purchases={purchases.data}
            payments={payments.data}
            customers={customers.data}
            customerGroups={customerGroups.data}
            accounts={accounts.data}
            transfers={transfers.data}
            subDbShipments={subDbShipments.data}
            removePayment={payments.remove}
            role={role}
            user={user}
            initialTab="pnl"
            routes={routes.data}
            expenses={expenses.data}
            damageInventory={damageInventory.data}
            transactions={transactions.data}
          />
        );
      case "subdb":
        return (
          <SubDbView
            products={products.data}
            subDbs={subDbs.data}
            addSubDb={async (item) => { await subDbs.add(item); }}
            updateSubDb={subDbs.update}
            removeSubDb={async (id) => { await subDbs.remove(id); }}
            subDbShipments={subDbShipments.data}
            addSubDbShipment={async (item) => { await subDbShipments.add(item); }}
            removeSubDbShipment={async (id) => { await subDbShipments.remove(id); }}
            payments={payments.data}
            addPayment={async (item) => { await payments.add(item); }}
            removePayment={async (id) => { await payments.remove(id); }}
            accounts={accounts.data}
            updateProduct={products.update}
            user={user}
            role={role}
            subDbsLoading={subDbs.loading}
            subDbSettings={subDbSettings.data}
            updateSubDbSetting={subDbSettings.update}
            addSubDbSetting={async (item) => { await subDbSettings.add(item); }}
          />
        );
      case "customer-collection":
        return (
          <CustomerCollectionModule
            customers={customers.data}
            suppliers={suppliers.data}
            products={products.data}
            transactions={transactions.data}
            accounts={accounts.data}
            addPayment={payments.add}
            role={role}
          />
        );
      case "finance":
        if (role === 'view-only') return <AccessDeniedView />;
        return (
          <FinanceView 
            summaries={summaries.data} 
            staff={staff.data} 
            suppliers={suppliers.data} 
            payments={payments.data} 
            transfers={transfers.data}
            purchases={purchases.data}
            categories={categories.data}
            addPayment={async (p) => { await payments.add(p); }} 
            removePayment={async (id) => { await payments.remove(id); }} 
            addTransfer={async (t) => { await transfers.add(t); }}
            updateTransfer={transfers.update}
            role={role}
            user={user}
            accounts={accounts.data}
            addAccount={async (a) => { await accounts.add(a); }}
            updateAccount={accounts.update}
            removeAccount={async (id) => { await accounts.remove(id); }}
            addExpense={async (e) => { await expenses.add(e); }}
            incomeCategories={incomeCategories.data}
          />
        );
      case "expense-ledger":
        return (
          <ExpenseLedgerView
            expenses={expenses.data}
            addExpense={async (e) => { await expenses.add(e); }}
            removeExpense={async (id) => { await expenses.remove(id); }}
            updateExpense={expenses.update}
            role={role}
          />
        );
      case "supplier-claims":
        return (
          <SupplierClaimsView
            claims={supplierClaims.data}
            addClaim={async (c) => { await supplierClaims.add(c); }}
            updateClaim={supplierClaims.update}
            removeClaim={async (id) => { await supplierClaims.remove(id); }}
            suppliers={suppliers.data}
            products={products.data}
            addTransaction={async (tx) => { await transactions.add(tx); }}
            role={role}
            userEmail={user?.email || ""}
          />
        );
      case "payment-history":
        return (
          <ReportsView 
            summaries={summaries.data} 
            products={products.data} 
            suppliers={suppliers.data} 
            addPayment={payments.add} 
            staff={staff.data} 
            sales={sales.data}
            purchases={purchases.data}
            payments={payments.data}
            customers={customers.data}
            customerGroups={customerGroups.data}
            accounts={accounts.data}
            transfers={transfers.data}
            subDbShipments={subDbShipments.data}
            removePayment={payments.remove}
            role={role}
            user={user}
            initialTab="payment-history"
            routes={routes.data}
            expenses={expenses.data}
            damageInventory={damageInventory.data}
            transactions={transactions.data}
          />
        );
      case "daily-cash-book":
        return (
          <ReportsView 
            summaries={summaries.data} 
            products={products.data} 
            suppliers={suppliers.data} 
            addPayment={payments.add} 
            staff={staff.data} 
            sales={sales.data}
            purchases={purchases.data}
            payments={payments.data}
            customers={customers.data}
            customerGroups={customerGroups.data}
            accounts={accounts.data}
            transfers={transfers.data}
            subDbShipments={subDbShipments.data}
            removePayment={payments.remove}
            role={role}
            user={user}
            initialTab="daily-cash-book"
            routes={routes.data}
            expenses={expenses.data}
            damageInventory={damageInventory.data}
            transactions={transactions.data}
          />
        );
      case "ledger":
        return (
          <LedgerView 
            customers={customers.data} 
            suppliers={suppliers.data}
            staff={staff.data}
            payments={payments.data}
            purchases={purchases.data}
            summaries={summaries.data}
            products={products.data}
            sales={sales.data}
            transactions={transactions.data}
            routes={routes.data}
            addCustomer={customers.add}
            updateCustomer={customers.update}
            addSupplier={suppliers.add}
            updateSupplier={suppliers.update}
            updateStaff={staff.update}
            addPayment={payments.add}
            addSale={sales.add}
            updateProduct={products.update}
            accounts={accounts.data}
            role={role}
            user={user}
            setActiveView={setActiveView}
            selectedParty={selectedLedgerParty}
            setSelectedParty={setSelectedLedgerParty}
          />
        );
      case "pos":
        return (
          <PointOfSaleView
            products={products.data}
            customers={customers.data}
            routes={routes.data}
            staff={staff.data}
            user={user}
            add={async (item) => { await sales.add(item); }}
            role={role}
            updateProduct={products.update}
            updateCustomer={customers.update}
            addPayment={async (item) => { await payments.add(item); }}
            accounts={accounts.data}
          />
        );
      case "sales":
        return (
          <SalesView 
            sales={sales.data}
            products={products.data}
            customers={customers.data}
            suppliers={suppliers.data}
            routes={routes.data}
            staff={staff.data}
            user={user}
            add={async (item) => { await sales.add(item); }}
            remove={async (id) => { await sales.remove(id); }}
            update={sales.update}
            updateProduct={products.update}
            updateCustomer={customers.update}
          />
        );
      case "roles":
        if (role !== 'admin') return <AccessDeniedView />;
        return (
          <RolesView 
            roles={roles.data}
            add={async (role) => { await roles.add(role); }}
            remove={async (id) => { await roles.remove(id); }}
          />
        );
      case "users":
        if (role !== 'admin') return <AccessDeniedView />;
        return (
          <UsersView 
            users={users.data}
            staff={staff.data}
            roles={roles.data}
            add={users.add}
            update={users.update}
            remove={async (id) => { await users.remove(id); }}
            updateRole={roles.update}
          />
        );
      case "settings":
        if (role !== 'admin') return <AccessDeniedView />;
        return (
          <SettingsView 
            role={role}
            categories={categories.data} 
            incomeCategories={incomeCategories.data}
            addIncomeCategory={async (data) => { await incomeCategories.add(data); }}
            removeIncomeCategory={async (id) => { await incomeCategories.remove(id); }}
            customerGroups={customerGroups}
          />
        );
      case "enterprise-suites":
        if (role !== 'admin') return <AccessDeniedView />;
        return (
          <EnterpriseSuitesView 
            role={role}
            userEmail={user?.email || ""}
          />
        );
      case "audit-compliance":
        if (role !== 'admin') return <AccessDeniedView />;
        return (
          <AuditComplianceView
            customers={customers.data}
            suppliers={suppliers.data}
            staff={staff.data}
            transactions={transactions.data}
            products={products.data}
            activityLogs={activityLogs.data}
            logAdminActivity={logAdminActivity}
            setActiveView={setActiveView}
            setSelectedLedgerParty={setSelectedLedgerParty}
            updateCustomer={customers.update}
            updateSupplier={suppliers.update}
            updateStaff={staff.update}
            addTransaction={transactions.add}
          />
        );
      case "activity-log":
        if (role !== 'admin') return <AccessDeniedView />;
        return (
          <ActivityLogView 
            logs={activityLogs.data}
            onClearLogs={onClearLogs}
            role={role}
            userEmail={user?.email || ""}
            onUpdateLog={async (id, data) => { await activityLogs.update(id, data); }}
          />
        );
      default:
        return (
          <DashboardView 
            products={products.data} 
            summaries={summaries.data} 
            customers={customers.data} 
            suppliers={suppliers.data}
            purchases={purchases.data}
            routes={routes.data} 
            payments={payments.data}
            sales={sales.data}
            activityLogs={activityLogs.data}
            subDbs={subDbs.data}
            subDbShipments={subDbShipments.data}
            expenses={expenses.data}
            setActiveView={setActiveView} 
            role={role}
            allowedViews={role === 'admin' ? (RolePermissions as any).admin.allowedViews : (roleData?.allowedViews || (RolePermissions as any)[role]?.allowedViews || [])}
            staff={staff.data}
            accounts={accounts.data}
            damageInventory={damageInventory.data}
            supplierClaims={supplierClaims.data}
            stockAdjustments={stockAdjustments.data}
            updateCustomer={customers.update}
            updateSupplier={suppliers.update}
            updateStaff={staff.update}
          />
        );
    }
  };

  const pendingSalesCount = (sales.data || []).filter((s: any) => s.status === "pending_approval" || s.approved === false).length;
  const pendingSettlementsCount = (summaries.data || []).filter((s: any) => s.status === "pending_approval" || s.approved === false).length;
  const pendingPaymentsCount = (payments.data || []).filter((p: any) => p.status === "pending_approval" || p.approved === false).length;
  const pendingSubDbsCount = (subDbs.data || []).filter((s: any) => s.status === "pending_approval" || s.approved === false).length;
  const totalPendingApprovals = pendingSalesCount + pendingSettlementsCount + pendingPaymentsCount + pendingSubDbsCount;

  return (
    <div className="flex bg-[#F8F9FA] min-h-screen">
      <div className={`fixed inset-y-0 left-0 z-50 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:sticky lg:top-0 lg:self-start lg:h-screen lg:overflow-y-auto lg:shrink-0 lg:block transition-transform duration-300 ease-in-out`}>
        <Sidebar 
          active={activeView} 
          setActive={(v) => { setActiveView(v); setSidebarOpen(false); }} 
          user={user} 
          role={role}
          roles={roles.data}
          onLogout={handleLogout} 
          pendingApprovalsCount={totalPendingApprovals}
        />
      </div>
      
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-45 bg-[#F8F9FA]/95 backdrop-blur-md border-b border-gray-200/50 shadow-2xs">
          {/* Header main bar - Single row, fixed height on mobile, no multi-line wrapping */}
          <div className="flex justify-between items-center gap-2 px-3 py-2.5 md:py-3.5 md:px-6 lg:px-8 max-w-[1920px] mx-auto">
            
            {/* Left: Brand & Sidebar toggle */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 bg-white rounded-xl border border-gray-200/80 shadow-xs active:scale-95 transition-transform"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5 text-gray-700" />
              </button>
              <div className="flex flex-col">
                <h1 className="text-base sm:text-lg lg:text-2xl font-black font-sans tracking-tight leading-tight text-slate-900 flex items-center gap-1.5">
                  <span>SAMIRA BMS</span>
                  <span className="text-[10px] sm:text-xs font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100">v1.0</span>
                </h1>
                <p className="hidden sm:block text-[9px] lg:text-[10px] text-slate-400 uppercase font-bold tracking-widest leading-none">
                  {t("Powered by Samira Traders")}
                </p>
              </div>

              {/* Desktop Quick Action Buttons (hidden on mobile, shown on md+) */}
              <div className="hidden md:flex items-center gap-1.5 ml-3">
                <button 
                  onClick={() => setActiveView("loadsheet")}
                  className="px-2.5 py-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-150 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all shadow-2xs select-none active:scale-95 cursor-pointer"
                  title="Morning Load Sheet (সকাল: লোডশিট)"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse shrink-0"></span>
                  <span>Morning Load Sheet (সকাল: লোডশিট)</span>
                </button>
                <button 
                  onClick={() => setActiveView("settle")}
                  className="px-2.5 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-150 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all shadow-2xs select-none active:scale-95 cursor-pointer"
                  title="Afternoon Load Sheet (বিকাল: হিসাব নিকেশ)"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                  <span>Afternoon Load Sheet (বিকাল: হিসাব নিকেশ)</span>
                </button>
                <button 
                  onClick={() => setActiveView("customer-collection")}
                  className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-150 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all shadow-2xs select-none active:scale-95 cursor-pointer"
                  title="Customer Due Collection (কাস্টমার বকেয়া কালেকশন)"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                  <span>Customer Due Collection (কাস্টমার বকেয়া কালেকশন)</span>
                </button>
              </div>
            </div>

            {/* Center: Global Search (Desktop view) */}
            <div className="hidden md:block flex-1 max-w-md mx-2 lg:mx-4">
              <GlobalSearchHeader 
                products={products.data}
                customers={customers.data}
                sales={sales.data}
                setActiveView={setActiveView}
                language={language}
              />
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

              {/* Mobile Quick Actions Menu Trigger (Mobile only) */}
              <div className="relative md:hidden">
                <button
                  onClick={() => setMobileQuickActionsOpen(!mobileQuickActionsOpen)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl text-xs font-black shadow-2xs active:scale-95 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  <span>কুইক এন্ট্রি</span>
                  <ChevronDown className="w-3 h-3 text-indigo-200" />
                </button>

                {mobileQuickActionsOpen && (
                  <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-start justify-center pt-16 px-4" onClick={() => setMobileQuickActionsOpen(false)}>
                    <div className="w-full max-w-xs bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 space-y-2 animate-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          দ্রুত এন্ট্রি নেভিগেশন
                        </span>
                        <button onClick={() => setMobileQuickActionsOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <button 
                        onClick={() => { setActiveView("loadsheet"); setMobileQuickActionsOpen(false); }}
                        className="w-full p-2.5 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-xl text-xs font-black flex items-center gap-2 transition-all border border-sky-100 text-left"
                      >
                        <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse shrink-0"></span>
                        <div>
                          <div>Morning Load Sheet</div>
                          <div className="text-[10px] font-semibold text-sky-600">সকাল: লোডশিট প্রিপারেশন</div>
                        </div>
                      </button>
                      <button 
                        onClick={() => { setActiveView("settle"); setMobileQuickActionsOpen(false); }}
                        className="w-full p-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-black flex items-center gap-2 transition-all border border-amber-100 text-left"
                      >
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                        <div>
                          <div>Afternoon Load Sheet</div>
                          <div className="text-[10px] font-semibold text-amber-600">বিকাল: সেলস হিসাব নিকেশ</div>
                        </div>
                      </button>
                      <button 
                        onClick={() => { setActiveView("customer-collection"); setMobileQuickActionsOpen(false); }}
                        className="w-full p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-black flex items-center gap-2 transition-all border border-emerald-100 text-left"
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                        <div>
                          <div>Customer Due Collection</div>
                          <div className="text-[10px] font-semibold text-emerald-600">কাস্টমার বকেয়া কালেকশন</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Global Search Button */}
              <button
                onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                className="md:hidden p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl shadow-2xs active:scale-95 transition-all"
                title="Search"
              >
                <Search className="w-4 h-4 text-slate-600" />
              </button>

              {/* Mobile More Options Button */}
              <button
                onClick={() => setMobileMoreMenuOpen(!mobileMoreMenuOpen)}
                className="md:hidden p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl shadow-2xs active:scale-95 transition-all relative"
                title="More Options"
              >
                <MoreVertical className="w-4 h-4 text-slate-600" />
                {totalPendingSync > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
                )}
              </button>

              {/* Desktop Language, Shortcuts, Install, Audit, Online Status Controls */}
              <div className="hidden md:flex items-center gap-2">
                {/* Language Toggle */}
                <div className="flex items-center gap-0.5 bg-white border border-[#E9ECEF] p-1 rounded-xl shadow-xs shrink-0 select-none">
                  <button
                    type="button"
                    onClick={() => setLanguage("bn")}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all duration-200 flex items-center gap-1 cursor-pointer ${
                      language === "bn" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>🇧🇩</span>
                    <span>বাংলা</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage("en")}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all duration-200 flex items-center gap-1 cursor-pointer ${
                      language === "en" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>🇬🇧</span>
                    <span>EN</span>
                  </button>
                </div>

                <button
                  onClick={() => setShowShortcuts(true)}
                  className="hidden lg:flex items-center gap-1.5 bg-white border border-[#E9ECEF] hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer select-none active:scale-95 shrink-0"
                  title={t("শর্টকাট (Shift+?)")}
                >
                  <Keyboard className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>{t("শর্টকাট")}</span>
                </button>

                <button
                  onClick={triggerInstall}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white border border-indigo-600 px-3 py-2 rounded-xl text-xs font-extrabold shadow-sm hover:shadow transition-all cursor-pointer select-none active:scale-95 shrink-0"
                  title={t("মোবাইলে ইনস্টল")}
                >
                  <Smartphone className="w-4 h-4 shrink-0 text-amber-300 animate-pulse" />
                  <span>{t("মোবাইলে ইনস্টল")}</span>
                </button>

                {user?.uid === "demo-admin" && (
                  <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-2 rounded-xl">
                    <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse shrink-0" />
                    <span className="text-xs font-black text-indigo-700">{t("ডেমো মোড")}</span>
                  </div>
                )}

                {/* Audit Health */}
                <button
                  onClick={() => setActiveView("audit-compliance")}
                  className={`flex items-center gap-2 border px-3 py-2 rounded-xl transition-all cursor-pointer select-none active:scale-95 shrink-0 ${
                    auditHealth.loading
                      ? "bg-gray-50 border-gray-150 text-gray-500"
                      : auditHealth.hasDrift
                      ? "bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700 font-bold"
                      : "bg-emerald-50 hover:bg-emerald-100 border-emerald-100 text-emerald-700 font-bold"
                  }`}
                  title={auditHealth.loading ? "অডিট ডাটা লোড হচ্ছে..." : auditHealth.hasDrift ? `অডিট সতর্কতা: ${auditHealth.totalDriftAmount} ৳ অমিল সনাক্ত হয়েছে!` : "হিসাব ১০০% সঠিক আছে"}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    auditHealth.loading
                      ? "bg-gray-400"
                      : auditHealth.hasDrift
                      ? "bg-rose-600 animate-pulse"
                      : "bg-emerald-500"
                  }`} />
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span className="text-xs hidden lg:inline">
                    {auditHealth.loading 
                      ? "অডিট হচ্ছে..." 
                      : auditHealth.hasDrift 
                      ? `অমিল: ৳ ${auditHealth.totalDriftAmount.toLocaleString()}` 
                      : "১০০% ব্যালেন্সড"}
                  </span>
                </button>

                {/* Online Sync Status */}
                {isOnline ? (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-xl">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span className="text-xs font-black text-emerald-700">{t("অনলাইন")}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                    <span className="text-xs font-black text-amber-700">{t("অফলাইন")}</span>
                  </div>
                )}

                {totalPendingSync > 0 && (
                  <div className="relative group">
                    <div className="flex flex-col gap-0.5 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl cursor-help hover:bg-rose-100 transition-all shadow-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                        <span className="text-xs font-black text-rose-700">{t("সিঙ্ক:")} {formatNumber(totalPendingSync)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Mobile Search Overlay Bar */}
          {mobileSearchOpen && (
            <div className="md:hidden px-3 pb-3 pt-1 border-t border-slate-200/60 bg-white animate-in slide-in-from-top-2 duration-150">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <GlobalSearchHeader 
                    products={products.data}
                    customers={customers.data}
                    sales={sales.data}
                    setActiveView={(view) => {
                      setActiveView(view);
                      setMobileSearchOpen(false);
                    }}
                    language={language}
                  />
                </div>
                <button
                  onClick={() => setMobileSearchOpen(false)}
                  className="p-2 bg-slate-100 rounded-xl text-slate-500 hover:text-slate-700 text-xs font-bold"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Mobile More Options Sheet */}
          {mobileMoreMenuOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end justify-center" onClick={() => setMobileMoreMenuOpen(false)}>
              <div className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 p-5 space-y-3.5 animate-in slide-in-from-bottom duration-200" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800">সিস্টেম সেটিংস ও স্ট্যাটাস</span>
                  <button onClick={() => setMobileMoreMenuOpen(false)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Language selector */}
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="text-xs font-extrabold text-slate-700">ভাষা (Language)</span>
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                    <button
                      onClick={() => { setLanguage("bn"); setMobileMoreMenuOpen(false); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black ${language === "bn" ? "bg-indigo-600 text-white" : "text-slate-600"}`}
                    >
                      🇧🇩 বাংলা
                    </button>
                    <button
                      onClick={() => { setLanguage("en"); setMobileMoreMenuOpen(false); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black ${language === "en" ? "bg-indigo-600 text-white" : "text-slate-600"}`}
                    >
                      🇬🇧 EN
                    </button>
                  </div>
                </div>

                {/* Install Mobile App */}
                <button
                  onClick={() => { triggerInstall(); setMobileMoreMenuOpen(false); }}
                  className="w-full p-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-2xl text-xs font-extrabold flex items-center justify-between shadow-sm active:scale-95 transition-transform"
                >
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-amber-300 animate-pulse" />
                    <span>মোবাইলে অ্যাপ ইনস্টল করুন</span>
                  </div>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">PWA</span>
                </button>

                {/* Audit Status */}
                <button
                  onClick={() => { setActiveView("audit-compliance"); setMobileMoreMenuOpen(false); }}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>অডিট ও হিসাব ব্যালেন্স</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                    auditHealth.hasDrift ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                  }`}>
                    {auditHealth.hasDrift ? `অমিল ৳${auditHealth.totalDriftAmount}` : "১০০% ব্যালেন্সড"}
                  </span>
                </button>

                {/* Network Sync Status */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                    <span>নেটওয়ার্ক সিঙ্ক</span>
                  </div>
                  <span className="text-slate-500 font-bold">{isOnline ? "অনলাইন একটিভ" : "অফলাইন মোড"}</span>
                </div>
              </div>
            </div>
          )}
        </header>

        <main className="flex-1 w-full lg:px-8 lg:pb-8 p-4">
          <div className="max-w-7xl mx-auto w-full">
            {!isOnline && (
              <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-sm flex items-start gap-3">
                <WifiOff className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-amber-900 text-sm">আপনি এখন অফলাইন মোডে আছেন!</h4>
                  <p className="text-xs text-amber-700 leading-relaxed mt-1">
                    সমীরা ট্রেডার্স অ্যাপে অফলাইন ডেটা প্রটেকশন (IndexedDB Cache) সক্রিয় করা হয়েছে। আপনার নতুন অ্যাড করা কোনো কাস্টমার, অর্ডার বা ট্রানজেকশন মুছে যাবে না। আপনি নিশ্চিন্তে কাজ চালিয়ে যেতে পারেন; ইন্টারনেট পুনরায় সংযুক্ত হওয়া মাত্রই এগুলো স্বয়ংক্রিয়ভাবে ক্লাউডের সাথে সিঙ্ক হয়ে যাবে।
                  </p>
                </div>
              </div>
            )}
            {renderView()}
          </div>
        </main>
      </div>

      {showInstallGuide && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-150 transform transition-all duration-300 scale-100 p-6 relative">
            <button 
              onClick={() => setShowInstallGuide(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center text-center">
              <div className="p-4 bg-indigo-50 rounded-full text-indigo-600 mb-4 animate-bounce">
                <Smartphone className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black text-gray-950 font-sans tracking-tight mb-2">
                অ্যান্ড্রয়েড ইনস্টল ম্যানুয়াল
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mb-6 leading-relaxed">
                সমীয়া ট্রেডার্সের ডিস্ট্রিবিউশন সার্ভিসেস অ্যাপ্লিকেশনটি সম্পূর্ণ সুরক্ষিত এবং বিশ্বমানের Progressive Web App (PWA) প্রযুক্তিতে তৈরি। কোনো প্লেস্টোর ছাড়াই আপনার মোবাইলে ইনস্টল করতে নিচের পদ্ধতি অনুসরণ করুন:
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex gap-3.5 items-start">
                <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-sm font-black flex items-center justify-center shrink-0">১</span>
                <div>
                  <h4 className="font-extrabold text-[#1e1b4b] text-xs">স্বয়ংক্রিয় ইনস্টলেশন পদ্ধতি</h4>
                  <p className="text-[11px] text-[#475569] leading-relaxed mt-1 font-semibold">
                    আপনি যদি গুগল ক্রোম বা আধুনিক কোনো অ্যান্ড্রয়েড ব্রাউজার ব্যবহার করেন, তবে স্ক্রিনের উপরের <span className="text-indigo-600 font-bold">"মোবাইলে ইনস্টল"</span> বাটনে চাপ দিলে স্বয়ংক্রিয় ইনস্টল পপ-আপ দেখতে পাবেন।
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex gap-3.5 items-start">
                <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-sm font-black flex items-center justify-center shrink-0">২</span>
                <div>
                  <h4 className="font-extrabold text-[#1e1b4b] text-xs font-sans">ম্যানুয়াল ইনস্টল করুন (Chrome ব্রাউজার)</h4>
                  <p className="text-[11px] text-[#475569] leading-relaxed mt-1 font-semibold">
                    গুগল ক্রোম ব্রাউজারের উপরে ডান কোণায় থাকা থ্রি-ডট <span className="font-bold text-gray-900">(⋮)</span> মেনুতে ক্লিক করুন। এরপর মেনু থকে <span className="text-emerald-600 font-bold">"Add to Home screen"</span> অথবা <span className="text-emerald-600 font-bold">"Install App"</span> অপশনটি সিলেক্ট করুন।
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => {
                  setShowInstallGuide(false);
                  toast.success("পদ্ধতিটি বুঝতে পারার জন্য ধন্যবাদ!");
                }}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-sm tracking-wide transition-all cursor-pointer text-center"
              >
                ঠিক আছে, বুঝতে পেরেছি
              </button>
            </div>
            
            <p className="text-center text-[9px] text-gray-400 mt-4 leading-none">
              ইনস্টল হওয়ার পর এটি একদম রিয়েল অ্যান্ড্রয়েড অ্যাপের মত ইন্টারনেট ছাড়াও অফলাইনে চলবে।
            </p>
          </div>
        </div>
      )}

      {showShortcuts && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-150 p-6 relative animate-in zoom-in-95 duration-150">
            <button 
              type="button"
              onClick={() => setShowShortcuts(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              title="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 border-b pb-4 mb-4">
              <div className="p-2.5 bg-indigo-50 text-indigo-650 rounded-2xl">
                <Keyboard className="w-6 h-6 animate-pulse" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-black text-slate-900 font-sans tracking-tight">কীবোর্ড শর্টকাট গাইড</h3>
                <p className="text-[11px] text-slate-500 font-bold leading-none mt-1">পাওয়ার ইউজারদের জন্য সিস্টেম শর্টকাটসমূহ</p>
              </div>
            </div>

            <div className="space-y-2.5 font-sans">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                <span className="text-xs font-black text-slate-700">শর্টকাট গাইড খুলুন/বন্ধ করুন</span>
                <kbd className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-black shadow-xs text-slate-800 font-mono">Shift + ?</kbd>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                <span className="text-xs font-black text-slate-700">ফর্ম সংরক্ষণ (Save Submit) করুন</span>
                <div className="flex items-center gap-1">
                  <kbd className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-black shadow-xs text-slate-800 font-mono">Ctrl</kbd>
                  <span className="text-slate-400 text-xs font-bold font-mono">+</span>
                  <kbd className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-black shadow-xs text-slate-800 font-mono">S</kbd>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                <span className="text-xs font-black text-slate-700">খুঁজুন বা সার্চ বক্সে ফোকাস করুন</span>
                <div className="flex items-center gap-1">
                  <kbd className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-black shadow-xs text-slate-800 font-mono">Ctrl</kbd>
                  <span className="text-slate-400 text-xs font-bold font-mono">+</span>
                  <kbd className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-black shadow-xs text-slate-800 font-mono">F</kbd>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                <span className="text-xs font-black text-slate-700">গ্লোবাল সার্চ</span>
                <div className="flex items-center gap-1">
                  <kbd className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-black shadow-xs text-slate-800 font-mono">Ctrl</kbd>
                  <span className="text-slate-400 text-xs font-bold font-mono">+</span>
                  <kbd className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-black shadow-xs text-slate-800 font-mono">K</kbd>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                <span className="text-xs font-black text-slate-700">যেকোনো পপ-আপ বাতিল/বন্ধ করুন</span>
                <kbd className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-black shadow-xs text-slate-800 font-mono">Esc</kbd>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                <span className="text-xs font-black text-slate-700">ড্যাশবোর্ডে ফিরে যান (ইনপুটের বাইরে)</span>
                <kbd className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-black shadow-xs text-slate-800 font-mono">Backspace</kbd>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setShowShortcuts(false);
                  toast.success("পাওয়ার মোড উপভোগ করুন!");
                }}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-sm tracking-wide transition-all cursor-pointer text-center"
              >
                ঠিক আছে, বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      <QuickActions
        products={products.data}
        updateProduct={products.update}
        addSale={sales.add}
        addPurchase={purchases.add}
        addPayment={payments.add}
        customers={customers.data}
        updateCustomer={customers.update}
        suppliers={suppliers.data}
        routes={routes.data}
        accounts={accounts.data}
        staff={staff.data}
        user={user}
        role={role}
      />

      <GlobalSearchOverlay 
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        products={products.data}
        customers={customers.data}
        orders={orders.data}
        setActiveView={setActiveView}
      />

      <DocumentScannerModal
        isOpen={isOcrModalOpen}
        onClose={() => setIsOcrModalOpen(false)}
        onImportPurchase={(data) => {
          setOcrPreFill(data);
          setActiveView("purchase");
          toast.success("ক্রয় বিল মডিউলে ডেটা পাঠানো হয়েছে!");
        }}
        onImportSale={(data) => {
          setOcrPreFill(data);
          setActiveView("orders");
          toast.success("অর্ডার এন্ট্রি মডিউলে ডেটা পাঠানো হয়েছে!");
        }}
      />

      <Toaster position="bottom-right" />
    </div>
  );
}


function Placeholder({ title, icon }: { title: string, icon: string }) {
  return (
    <div className="h-[60vh] flex flex-col items-center justify-center text-[#ADB5BD] border-2 border-dashed border-[#DEE2E6] rounded-2xl">
       <span className="text-lg font-bold">{title} মডিউলটি শিঘ্রই আসছে...</span>
       <p className="text-sm">এটি একটি প্রোটোটাইপ সংস্করণ।</p>
    </div>
  );
}

