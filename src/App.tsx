/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, db } from "./lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { toast, Toaster } from "react-hot-toast";
import { Menu, X, LayoutDashboard, Package, FileText, ShoppingCart, Users, Truck, LogIn, Wifi, WifiOff, Smartphone, Plus, Trash2, Loader2, Sparkles, DollarSign, Wallet, ShoppingBag, Keyboard } from "lucide-react";
import { snapshotAll } from "./lib/snapshot";
import { useLanguage } from "./context/LanguageContext";
import { performAppStorageCleanup } from "./lib/cleanup";
import { calculateLedger } from "./utils/ledgerCalculator";


import Sidebar from "./components/Sidebar";
import AuthScreen from "./components/AuthScreen";
import ActivityLogView from "./components/ActivityLogView";
import GlobalSearchOverlay from "./components/GlobalSearchOverlay";
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
import DeliveryRouteView from "./components/DeliveryRouteView";
import SuperAdminView from "./components/SuperAdminView";

import { useCollection } from "./hooks/useCollection";
import { RolePermissions } from "./lib/permissions";

export default function App() {
  const { language, setLanguage, t, formatNumber } = useLanguage();

  // Run IndexedDB and localStorage cache/schema cleanup on app mount
  useEffect(() => {
    performAppStorageCleanup();
  }, []);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState("dashboard");
  const [selectedLedgerParty, setSelectedLedgerParty] = useState<{ id: string; type: "customer" | "supplier" | "staff" } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [activeQuickAction, setActiveQuickAction] = useState<"sale" | "purchase" | "expense" | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

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
    snapshotAll(); 
    const timer = setInterval(() => {
        snapshotAll();
    }, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

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

  // Wrapped transaction helper methods to ensure real-time consistency
  const addPaymentWithTx = async (payRecord: any) => {
    const payId = await payments.add(payRecord);
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
    await payments.remove(payId);
    await transactions.remove(payId);
  };

  const addSaleWithTx = async (saleRecord: any) => {
    const saleId = await sales.add(saleRecord);
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
    const retId = await returns.add(retRecord);
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

  const onApproveSettlement = async (summaryId: string) => {
    const summ = summaries.data.find(s => s.id === summaryId);
    if (!summ || summ.approved || summ.status === "settled") return;

    // 1. Returns update
    for (const item of summ.items || []) {
      const p = products.data.find(prod => prod.id === item.productId);
      if (p && item.returns > 0) {
        await products.update(p.id, {
          stock: (p.stock || 0) + Number(item.returns)
        });
      }
    }

    // 2. Damage items logged to damageInventory
    for (const d of summ.damageItems || []) {
      const p = products.data.find(prod => prod.id === d.productId);
      await damageInventory.add({
        productId: d.productId,
        supplierId: p?.supplierId || "unknown",
        quantity: d.quantity,
        price: d.price || p?.price || 0,
        date: new Date().toISOString().split('T')[0]
      });
    }

    // 3. Customer credits (dues) increase their ledger outstanding balance
    for (const credit of summ.credits || []) {
      const cust = customers.data.find(c => c.id === credit.customerId);
      if (cust) {
        await customers.update(cust.id, {
          balance: (cust.balance || 0) + Number(credit.amount)
        });
      }
    }

    // 4. Update Summary record status to settled and approved
    await summaries.update(summaryId, {
      status: "settled",
      approved: true
    });

    try {
      const dsr = staff.data.find(st => st.id === summ.dsrId);
      await logAdminActivity("approve_settlement", `ডিএসআর বিকাল হিসাব (সেটেলমেন্ট) অনুমোদন করা হয়েছে: স্টাফ '${dsr?.name || "N/A"}' (মোট বিক্রয়: ${summ.salesValue || 0} ৳, ID: ${summaryId})`);
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
    if (user?.email !== "samiratraders1@gmail.com") return;
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
    return () => unsubscribe();
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

  const currentUserRecord = users.data.find(u => u.email === user?.email);
  console.log("DEBUG App.tsx users.data:", users.data);
  console.log("DEBUG App.tsx currentUser:", user);
  console.log("DEBUG App.tsx currentUserRecord:", currentUserRecord);
  const role = user?.email === 'samiratraders1@gmail.com' ? 'admin' : (currentUserRecord?.role || 'view-only'); // default to view-only
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
            updateOrder={orders.update}
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
            setActiveView={setActiveView} 
            role={role}
            allowedViews={role === 'admin' ? (RolePermissions as any).admin.allowedViews : (roleData?.allowedViews || (RolePermissions as any)[role]?.allowedViews || [])}
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
        if (user?.email !== 'samiratraders1@gmail.com') return <AccessDeniedView />;
        return <SuperAdminView />;
      case "delivery-route":
        return (
          <DeliveryRouteView
            orders={orders.data}
            customers={customers.data}
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
          />
        );
      case "pnl":
        return (
          <ProfitLossView 
             sales={sales.data}
             purchases={purchases.data}
             payments={payments.data}
             summaries={summaries.data}
             products={products.data}
             subDbShipments={subDbShipments.data}
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
            incomeCategories={incomeCategories.data}
          />
        );
      case "payment-history":
        return (
          <PaymentHistoryView
            payments={payments.data}
            customers={customers.data}
            suppliers={suppliers.data}
            staff={staff.data}
            accounts={accounts.data}
            removePayment={payments.remove}
            addPayment={payments.add}
            role={role}
            user={user}
          />
        );
      case "daily-cash-book":
        return (
          <DailyCashBookView
            accounts={accounts.data}
            payments={payments.data}
            transfers={transfers.data}
            summaries={summaries.data}
            customers={customers.data}
            suppliers={suppliers.data}
            staff={staff.data}
            role={role}
            user={user}
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
            addCustomer={customers.add}
            updateCustomer={customers.update}
            addSupplier={suppliers.add}
            updateSupplier={suppliers.update}
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
            add={async (user) => { await users.add(user); }}
            update={users.update}
            remove={async (id) => { await users.remove(id); }}
            updateRole={roles.update}
          />
        );
      case "settings":
        if (role !== 'admin') return <AccessDeniedView />;
        return (
          <SettingsView 
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
      case "activity-log":
        if (role !== 'admin') return <AccessDeniedView />;
        return (
          <ActivityLogView 
            logs={activityLogs.data}
            onClearLogs={onClearLogs}
            role={role}
            userEmail={user?.email || ""}
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
            setActiveView={setActiveView} 
            role={role}
            allowedViews={role === 'admin' ? (RolePermissions as any).admin.allowedViews : (roleData?.allowedViews || (RolePermissions as any)[role]?.allowedViews || [])}
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
        <header className="sticky top-0 z-45 flex justify-between items-center gap-4 flex-wrap bg-[#F8F9FA]/90 backdrop-blur-md py-4 px-4 lg:px-8 border-b border-gray-200/30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 bg-white rounded-xl border shadow-sm"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-lg lg:text-3xl font-black font-sans tracking-tighter">SAMIRA BMS v1.0</h1>
              <p className="text-[10px] lg:text-xs text-[#ADB5BD] uppercase font-bold tracking-widest leading-none">{t("Powered by Samira Traders")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Language Toggle Component */}
            <div className="flex items-center gap-0.5 bg-white border border-[#E9ECEF] p-1 rounded-xl shadow-xs shrink-0 select-none">
              <button
                type="button"
                onClick={() => setLanguage("bn")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all duration-200 flex items-center gap-1 cursor-pointer ${
                  language === "bn" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-50"
                }`}
                id="lang-toggle-bn"
                title="Bengali Language"
              >
                <span>🇧🇩</span>
                <span className="hidden xs:inline">বাংলা</span>
                <span className="xs:hidden">বাং</span>
              </button>
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all duration-200 flex items-center gap-1 cursor-pointer ${
                  language === "en" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-50"
                }`}
                id="lang-toggle-en"
                title="English Language"
              >
                <span>🇬🇧</span>
                <span className="hidden xs:inline">English</span>
                <span className="xs:hidden">EN</span>
              </button>
            </div>

            <button
               onClick={() => setShowShortcuts(true)}
               className="hidden sm:flex items-center gap-1.5 bg-white border border-[#E9ECEF] hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer select-none active:scale-95 shrink-0"
               title={t("শর্টকাট (Shift+?)")}
            >
               <Keyboard className="w-4 h-4 text-slate-500 shrink-0" />
               <span>{t("শর্টকাট (Shift+?)")}</span>
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
               <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3.5 py-2 rounded-xl">
                 <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse shrink-0" />
                 <span className="text-xs font-black text-indigo-700">{t("ডেমো মোড সক্রিয়")}</span>
               </div>
            )}

            {isOnline ? (
               <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3.5 py-2 rounded-xl">
                 <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                 <span className="text-xs font-black text-emerald-700">{t("অনলাইন সিঙ্ক সক্রিয়")}</span>
               </div>
            ) : (
               <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3.5 py-2 rounded-xl">
                 <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                 <span className="text-xs font-black text-amber-700">{t("অফলাইন স্টোরেজ সক্রিয়")}</span>
               </div>
            )}
            {totalPendingSync > 0 && (
              <div className="relative group w-full lg:w-auto">
                <div className="flex flex-col gap-1 bg-rose-50 border border-rose-200 px-3.5 py-2 rounded-xl cursor-help hover:bg-rose-100 transition-all shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                    <span className="text-xs font-black text-rose-700">{t("সিঙ্ক পেন্ডিং:")} {formatNumber(totalPendingSync)}</span>
                  </div>
                  <div className="w-full bg-rose-200 h-1 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full animate-pulse" style={{ width: `${Math.min((totalPendingSync / 500) * 100, 100)}%` }}></div>
                  </div>
                </div>
                <div className="absolute right-0 top-full mt-2 w-64 bg-white p-4 rounded-2xl shadow-xl border border-gray-150 z-50 hidden group-hover:block hover:block">
                  <h4 className="text-xs font-black text-gray-800 border-b pb-1.5 mb-2 flex justify-between items-center">
                    <span>{t("সিঙ্ক পেন্ডিং গাইড")}</span>
                    <span className="bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded text-[10px] font-bold">{formatNumber(totalPendingSync)} {t("টি আইটেম")}</span>
                  </h4>
                  <ul className="space-y-1.5 text-[11px] text-gray-650 font-semibold font-sans">
                    {pendingItemsMap.map((p, i) => (
                      <li key={p.name} className="flex justify-between items-center bg-gray-50 p-1.5 rounded-lg">
                        <span>{t(p.name)}</span>
                        <span className="bg-gray-200 text-gray-700 font-bold px-1.5 py-0.5 rounded">{formatNumber(p.count)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[9px] text-gray-400 mt-3 leading-relaxed">
                    {t("ইন্টারনেট পুনরায় সংযোগ পাওয়া মাত্রই ডাটাবেজের সাথে এগুলো ক্লাউডে সিঙ্ক হয়ে যাবে।")}
                  </p>
                </div>
              </div>
            )}
            <div className="hidden lg:flex items-center gap-4 bg-white px-4 py-2 rounded-xl shadow-sm border border-[#E9ECEF]">
               <span className="text-xs font-bold text-gray-600">{new Date().toLocaleDateString(language === "en" ? 'en-US' : 'bn-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>
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

