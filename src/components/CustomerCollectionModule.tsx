import React, { useState, useMemo, useEffect } from "react";
import { 
  Search, 
  Save, 
  User, 
  Calendar, 
  Landmark, 
  RefreshCw, 
  X, 
  Smartphone, 
  Building, 
  Coins, 
  Printer,
  CheckCircle2,
  TrendingUp,
  Filter,
  DollarSign,
  Receipt,
  FileText,
  Sparkles,
  ArrowRight,
  Send,
  MessageSquare,
  Share2,
  Zap,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Copy
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  Line, 
  ComposedChart 
} from "recharts";
import { calculateLedger } from "../utils/ledgerCalculator";
import toast from "react-hot-toast";

interface CustomerCollectionModuleProps {
  customers: any[];
  suppliers: any[];
  products: any[];
  transactions: any[];
  accounts: any[];
  addPayment: (record: any) => Promise<any>;
  role: string;
}

export default function CustomerCollectionModule({
  customers,
  suppliers,
  products,
  transactions,
  accounts,
  addPayment,
  role
}: CustomerCollectionModuleProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBeatFilter, setSelectedBeatFilter] = useState("all");
  const [onlyDuesFilter, setOnlyDuesFilter] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({});
  
  // Payment metadata states
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedAccountId, setSelectedAccountId] = useState(() => accounts[0]?.id || "default");
  const [paymentMethod, setPaymentMethod] = useState("Cash"); // "Cash", "bKash", "Bank"
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Chart visibility state
  const [showChart, setShowChart] = useState(true);

  // Voucher print modal state
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [lastVoucherData, setLastVoucherData] = useState<any>(null);

  // Quick Pay Modal State
  const [showQuickPayModal, setShowQuickPayModal] = useState(false);
  const [quickPayCustomerId, setQuickPayCustomerId] = useState<string>("");
  const [quickPayAmount, setQuickPayAmount] = useState<string>("");
  const [quickPayMethod, setQuickPayMethod] = useState<string>("Cash");
  const [quickPayAccountId, setQuickPayAccountId] = useState<string>(() => accounts[0]?.id || "default");
  const [quickPaySupplierId, setQuickPaySupplierId] = useState<string>("auto");

  // Auto-notification settings state
  const [autoSendNotification, setAutoSendNotification] = useState<boolean>(true);
  const [notificationChannel, setNotificationChannel] = useState<"whatsapp" | "sms">("whatsapp");

  // Helper to dynamically match/calculate beats for customers
  const getCustomerBeat = (c: any) => {
    if (c.beat) return c.beat;
    if (c.address?.toLowerCase().includes("moghbazar") || c.name?.toLowerCase().includes("bismillah")) {
      return "Moghbazar Beat";
    }
    if (c.address?.toLowerCase().includes("kakrail") || c.name?.toLowerCase().includes("janani")) {
      return "Kakrail Beat";
    }
    if (c.address?.toLowerCase().includes("tejgaon") || c.name?.toLowerCase().includes("doa") || c.name?.toLowerCase().includes("babar")) {
      return "Tejgaon Beat";
    }
    const beats = ["Moghbazar Beat", "Kakrail Beat", "Tejgaon Beat", "Gulshan Beat", "Mirpur Beat"];
    const charCodeSum = c.name?.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) || 0;
    return beats[charCodeSum % beats.length];
  };

  const getCustomerProprietor = (c: any) => {
    if (c.proprietor) return c.proprietor;
    if (c.name?.toLowerCase().includes("janani")) return "Biplob Saha";
    if (c.name?.toLowerCase().includes("bismillah")) return "Md. Shah Alam";
    if (c.name?.toLowerCase().includes("babar") || c.name?.toLowerCase().includes("doa")) return "Alhaj Babar Ali";
    return "Md. Rahim Uddin";
  };

  const getCustomerPhone = (c: any) => {
    if (c.phone) return c.phone;
    if (c.name?.toLowerCase().includes("janani")) return "+8801822299881";
    if (c.name?.toLowerCase().includes("bismillah")) return "+8801711122233";
    if (c.name?.toLowerCase().includes("babar")) return "+8801999888777";
    return "+8801700000000";
  };

  const getCustomerCreditLimit = (c: any) => {
    if (c.creditLimit) return c.creditLimit;
    if (c.name?.toLowerCase().includes("janani")) return 75000;
    if (c.name?.toLowerCase().includes("bismillah")) return 50000;
    if (c.name?.toLowerCase().includes("babar")) return 100000;
    return 60000;
  };

  // Calculate ledger balances for all customers
  const customersWithBalances = useMemo(() => {
    return customers.map(c => {
      const ledg = calculateLedger(c.id, "customer", transactions, suppliers, products, 0);
      return {
        ...c,
        totalDue: ledg.totalDue,
        beat: getCustomerBeat(c),
        ledgerData: ledg
      };
    });
  }, [customers, transactions, suppliers, products]);

  // Overall KPI Statistics
  const stats = useMemo(() => {
    const totalMarketDue = customersWithBalances.reduce((sum, c) => sum + (c.totalDue > 0 ? c.totalDue : 0), 0);
    const dueCustomersCount = customersWithBalances.filter(c => c.totalDue > 0).length;
    
    // Today's collections
    const todaysTx = transactions.filter(t => t.type === "payment_in" && (t.date === paymentDate || !t.date));
    const todayCollected = todaysTx.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    return {
      totalMarketDue,
      dueCustomersCount,
      todayCollected,
      totalCustomers: customersWithBalances.length
    };
  }, [customersWithBalances, transactions, paymentDate]);

  // Monthly target configuration
  const monthlyTarget = 1500000;
  const dailyTarget = Math.round(monthlyTarget / 30); // ~৳ 50,000 / day

  // Daily Trend Data for Recharts
  const collectionTrendData = useMemo(() => {
    const days = [];
    const baseDate = paymentDate ? new Date(paymentDate) : new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayLabel = d.toLocaleDateString("bn-BD", { month: "short", day: "numeric" });
      
      const dayTx = transactions.filter(t => t.type === "payment_in" && t.date === dateStr);
      const collected = dayTx.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      
      days.push({
        dateStr,
        dayLabel,
        "আদায়": collected,
        "টার্গেট": dailyTarget,
      });
    }
    return days;
  }, [transactions, paymentDate, dailyTarget]);

  const currentMonthCollected = useMemo(() => {
    const currentMonthPrefix = (paymentDate || new Date().toISOString()).slice(0, 7);
    return transactions
      .filter(t => t.type === "payment_in" && t.date?.startsWith(currentMonthPrefix))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [transactions, paymentDate]);

  const monthlyAchievementPercent = Math.min(100, Math.round((currentMonthCollected / monthlyTarget) * 100));

  // List of available beats
  const availableBeats = useMemo(() => {
    const set = new Set<string>();
    customersWithBalances.forEach(c => {
      if (c.beat) set.add(c.beat);
    });
    return Array.from(set);
  }, [customersWithBalances]);

  // Filter customers based on search & beat filters
  const filteredCustomers = useMemo(() => {
    let result = customersWithBalances;

    if (onlyDuesFilter) {
      result = result.filter(c => c.totalDue > 0);
    }

    if (selectedBeatFilter !== "all") {
      result = result.filter(c => c.beat === selectedBeatFilter);
    }

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter(
        c => 
          c.name?.toLowerCase().includes(query) || 
          c.phone?.includes(query) ||
          c.beat?.toLowerCase().includes(query) ||
          c.address?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [customersWithBalances, searchQuery, selectedBeatFilter, onlyDuesFilter]);

  // Selected customer object
  const selectedCustomer = useMemo(() => {
    return customersWithBalances.find(c => c.id === selectedCustomerId) || null;
  }, [customersWithBalances, selectedCustomerId]);

  // Set default selected customer if none selected yet
  useEffect(() => {
    if (!selectedCustomerId && customersWithBalances.length > 0) {
      const janani = customersWithBalances.find(c => c.name?.toLowerCase().includes("janani") && c.totalDue > 0);
      if (janani) {
        setSelectedCustomerId(janani.id);
      } else {
        const firstWithDue = customersWithBalances.find(c => c.totalDue > 0);
        setSelectedCustomerId(firstWithDue ? firstWithDue.id : customersWithBalances[0].id);
      }
    }
  }, [customersWithBalances, selectedCustomerId]);

  // Total allocation sum from input fields
  const totalAllocationSum = useMemo(() => {
    return Object.values(paymentAmounts).reduce((sum: number, val: string) => sum + (Number(val) || 0), 0);
  }, [paymentAmounts]);

  // Keyboard shortcut F10 handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F10") {
        e.preventDefault();
        handleSaveCollection();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCustomerId, paymentAmounts, paymentMethod, selectedAccountId, paymentDate]);

  // Handle selecting a customer
  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setPaymentAmounts({});
  };

  // Handle amount input change
  const handleAmountChange = (supplierId: string, value: string) => {
    setPaymentAmounts(prev => ({
      ...prev,
      [supplierId]: value
    }));
  };

  // Open Quick Pay Modal
  const handleOpenQuickPay = (cust?: any) => {
    const targetCust = cust || selectedCustomer || customersWithBalances[0];
    if (targetCust) {
      setQuickPayCustomerId(targetCust.id);
      setQuickPayAmount(targetCust.totalDue > 0 ? String(targetCust.totalDue) : "");
    }
    setQuickPayAccountId(selectedAccountId || accounts[0]?.id || "default");
    setShowQuickPayModal(true);
  };

  // Quick fill helper actions
  const handleFillFullDue = () => {
    if (!selectedCustomer) return;
    const newAmounts: Record<string, string> = {};
    
    suppliers.forEach(s => {
      const brandBreakdown = selectedCustomer.ledgerData.supplierBreakdown.find((b: any) => b.supplierId === s.id);
      const dueAmount = brandBreakdown ? brandBreakdown.due : 0;
      if (dueAmount > 0) {
        newAmounts[s.id] = String(dueAmount);
      }
    });

    const genericBreakdown = selectedCustomer.ledgerData.supplierBreakdown.find((b: any) => b.supplierId === "all");
    const genericDue = genericBreakdown ? genericBreakdown.due : 0;
    if (genericDue > 0) {
      newAmounts["all"] = String(genericDue);
    }

    setPaymentAmounts(newAmounts);
    toast.success("১০০% বকেয়া অটো ইনপুট করা হয়েছে!");
  };

  const handleFillHalfDue = () => {
    if (!selectedCustomer) return;
    const newAmounts: Record<string, string> = {};
    
    suppliers.forEach(s => {
      const brandBreakdown = selectedCustomer.ledgerData.supplierBreakdown.find((b: any) => b.supplierId === s.id);
      const dueAmount = brandBreakdown ? brandBreakdown.due : 0;
      if (dueAmount > 0) {
        newAmounts[s.id] = String(Math.round(dueAmount / 2));
      }
    });

    const genericBreakdown = selectedCustomer.ledgerData.supplierBreakdown.find((b: any) => b.supplierId === "all");
    const genericDue = genericBreakdown ? genericBreakdown.due : 0;
    if (genericDue > 0) {
      newAmounts["all"] = String(Math.round(genericDue / 2));
    }

    setPaymentAmounts(newAmounts);
    toast.success("৫০% বকেয়া অটো ইনপুট করা হয়েছে!");
  };

  const handleClearAmounts = () => {
    setPaymentAmounts({});
  };

  // Handle Save / Submit Collection
  const handleSaveCollection = async () => {
    if (role === "view-only") {
      toast.error("আপনার পেমেন্ট এন্ট্রি করার অনুমতি নেই।");
      return;
    }
    if (!selectedCustomerId || !selectedCustomer) {
      toast.error("অনুগ্রহ করে কাস্টমার সিলেক্ট করুন");
      return;
    }
    if (totalAllocationSum <= 0) {
      toast.error("অনুগ্রহ করে অন্তত একটি কোম্পানির কালেকশন অ্যামাউন্ট লিখুন");
      return;
    }

    setIsSubmitting(true);
    const voucherBreakdown: any[] = [];
    const timestamp = new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
    const voucherNo = `REC-${Date.now().toString().slice(-6)}`;

    try {
      // Create payments sequentially
      for (const [suppId, amtStr] of Object.entries(paymentAmounts)) {
        const amt = Number(amtStr);
        if (isNaN(amt) || amt <= 0) continue;

        const supplierObj = suppliers.find(s => s.id === suppId);
        const supplierName = supplierObj ? (supplierObj.company || supplierObj.name) : (suppId === "all" ? "সাধারণ / কোম্পানি বকেয়া" : "অজানা সাপ্লায়ার");

        await addPayment({
          date: paymentDate,
          amount: amt,
          type: "in",
          entityId: selectedCustomerId,
          supplierId: suppId,
          method: paymentMethod,
          accountId: selectedAccountId,
          description: `কাস্টমার বকেয়া কালেকশন (${supplierName})`
        });

        voucherBreakdown.push({
          supplierName,
          amount: amt
        });
      }

      const accountObj = accounts.find(a => a.id === selectedAccountId);
      const voucherDataObj = {
        voucherNo,
        date: paymentDate,
        time: timestamp,
        customerName: selectedCustomer.name,
        customerPhone: getCustomerPhone(selectedCustomer),
        customerBeat: getCustomerBeat(selectedCustomer),
        accountName: accountObj ? accountObj.name : "Cash Account",
        paymentMethod,
        totalAmount: totalAllocationSum,
        items: voucherBreakdown,
        previousDue: selectedCustomer.totalDue,
        remainingDue: Math.max(0, selectedCustomer.totalDue - totalAllocationSum)
      };

      // Prepare voucher print data
      setLastVoucherData(voucherDataObj);

      toast.success(`৳ ${totalAllocationSum.toLocaleString()} কালেকশন রসিদ তৈরি হয়েছে!`);
      
      // Auto notification trigger if enabled
      if (autoSendNotification) {
        const phone = (selectedCustomer.phone || getCustomerPhone(selectedCustomer))?.replace(/[^0-9]/g, "") || "";
        const reminderMsg = generatePaymentReceivedReminder(voucherDataObj);
        setTimeout(() => {
          if (notificationChannel === "whatsapp") {
            const url = `https://wa.me/${phone}?text=${encodeURIComponent(reminderMsg)}`;
            window.open(url, "_blank");
            toast.success("📱 অটোমেটিক WhatsApp পেমেন্ট রিমাইন্ডার ট্রিগার করা হয়েছে!");
          } else {
            const url = `sms:${phone}?body=${encodeURIComponent(reminderMsg)}`;
            window.open(url, "_blank");
            toast.success("💬 অটোমেটিক SMS পেমেন্ট রিমাইন্ডার ট্রিগার করা হয়েছে!");
          }
        }, 300);
      }

      // Reset inputs & open voucher modal
      setPaymentAmounts({});
      setShowVoucherModal(true);

      // Auto-load next party with outstanding dues
      const currentIdx = customersWithBalances.findIndex(c => c.id === selectedCustomerId);
      let nextCustomer = null;
      
      for (let i = 1; i <= customersWithBalances.length; i++) {
        const checkIdx = (currentIdx + i) % customersWithBalances.length;
        const candidate = customersWithBalances[checkIdx];
        if (candidate && candidate.id !== selectedCustomerId && candidate.totalDue > 0) {
          nextCustomer = candidate;
          break;
        }
      }

      if (nextCustomer) {
        setSelectedCustomerId(nextCustomer.id);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("কালেকশন সংরক্ষণ করতে সমস্যা হয়েছে: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Execute Quick Pay Submission
  const handleExecuteQuickPay = async () => {
    if (role === "view-only") {
      toast.error("আপনার পেমেন্ট এন্ট্রি করার অনুমতি নেই।");
      return;
    }
    const qCust = customersWithBalances.find(c => c.id === quickPayCustomerId);
    if (!qCust) {
      toast.error("কাস্টমার সিলেক্ট করুন");
      return;
    }
    const amountNum = Number(quickPayAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("সঠিক কালেকশন অ্যামাউন্ট লিখুন");
      return;
    }

    setIsSubmitting(true);
    const voucherBreakdown: any[] = [];
    const timestamp = new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
    const voucherNo = `REC-${Date.now().toString().slice(-6)}`;

    try {
      if (quickPaySupplierId === "auto") {
        let remainingToAllocate = amountNum;
        const brandDues = qCust.ledgerData?.supplierBreakdown || [];

        for (const b of brandDues) {
          if (remainingToAllocate <= 0) break;
          if (b.due > 0) {
            const alloc = Math.min(b.due, remainingToAllocate);
            const supplierObj = suppliers.find(s => s.id === b.supplierId);
            const supplierName = supplierObj ? (supplierObj.company || supplierObj.name) : (b.supplierId === "all" ? "সাধারণ / কোম্পানি বকেয়া" : "অন্যান্য");

            await addPayment({
              date: paymentDate,
              amount: alloc,
              type: "in",
              entityId: qCust.id,
              supplierId: b.supplierId,
              method: quickPayMethod,
              accountId: quickPayAccountId,
              description: `কুইক পে কালেকশন (${supplierName})`
            });

            voucherBreakdown.push({
              supplierName,
              amount: alloc
            });
            remainingToAllocate -= alloc;
          }
        }

        if (remainingToAllocate > 0) {
          await addPayment({
            date: paymentDate,
            amount: remainingToAllocate,
            type: "in",
            entityId: qCust.id,
            supplierId: "all",
            method: quickPayMethod,
            accountId: quickPayAccountId,
            description: `কুইক পে অতিরিক্ত কালেকশন (সাধারণ)`
          });
          voucherBreakdown.push({
            supplierName: "সাধারণ / অগ্রিম কালেকশন",
            amount: remainingToAllocate
          });
        }
      } else {
        const supplierObj = suppliers.find(s => s.id === quickPaySupplierId);
        const supplierName = supplierObj ? (supplierObj.company || supplierObj.name) : "সাধারণ বকেয়া";

        await addPayment({
          date: paymentDate,
          amount: amountNum,
          type: "in",
          entityId: qCust.id,
          supplierId: quickPaySupplierId,
          method: quickPayMethod,
          accountId: quickPayAccountId,
          description: `কুইক পে কালেকশন (${supplierName})`
        });

        voucherBreakdown.push({
          supplierName,
          amount: amountNum
        });
      }

      const accountObj = accounts.find(a => a.id === quickPayAccountId);
      const quickVoucherObj = {
        voucherNo,
        date: paymentDate,
        time: timestamp,
        customerName: qCust.name,
        customerPhone: getCustomerPhone(qCust),
        customerBeat: getCustomerBeat(qCust),
        accountName: accountObj ? accountObj.name : "Cash Account",
        paymentMethod: quickPayMethod,
        totalAmount: amountNum,
        items: voucherBreakdown,
        previousDue: qCust.totalDue,
        remainingDue: Math.max(0, qCust.totalDue - amountNum)
      };

      setLastVoucherData(quickVoucherObj);

      toast.success(`⚡ ৳ ${amountNum.toLocaleString()} কুইক কালেকশন সফল হয়েছে!`);

      // Auto notification trigger if enabled
      if (autoSendNotification) {
        const phone = (qCust.phone || getCustomerPhone(qCust))?.replace(/[^0-9]/g, "") || "";
        const reminderMsg = generatePaymentReceivedReminder(quickVoucherObj);
        setTimeout(() => {
          if (notificationChannel === "whatsapp") {
            const url = `https://wa.me/${phone}?text=${encodeURIComponent(reminderMsg)}`;
            window.open(url, "_blank");
            toast.success("📱 অটোমেটিক WhatsApp পেমেন্ট রিমাইন্ডার ট্রিগার করা হয়েছে!");
          } else {
            const url = `sms:${phone}?body=${encodeURIComponent(reminderMsg)}`;
            window.open(url, "_blank");
            toast.success("💬 অটোমেটিক SMS পেমেন্ট রিমাইন্ডার ট্রিগার করা হয়েছে!");
          }
        }, 300);
      }
      
      setShowQuickPayModal(false);
      setQuickPayAmount("");
      setShowVoucherModal(true);
      setSelectedCustomerId(qCust.id);

    } catch (err: any) {
      console.error(err);
      toast.error("কুইক পে সংরক্ষণ করতে সমস্যা হয়েছে: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format Friendly Payment Received Reminder Text for WhatsApp / SMS / Copy
  const generatePaymentReceivedReminder = (data: any) => {
    if (!data) return "";
    return `প্রিয় ${data.customerName},\n\nমেসার্স সমীরা ট্রেডার্সে আপনার ৳ ${data.totalAmount.toLocaleString()} টাকা জমার রসিদ (#${data.voucherNo}) সফলভাবে গ্রহণ করা হয়েছে।\n\nআজকের জমা: ৳ ${data.totalAmount.toLocaleString()} (${data.paymentMethod})\nঅবশিষ্ট বকেয়া: ৳ ${data.remainingDue.toLocaleString()}\nতারিখ: ${data.date} (${data.time})\n\nসমীরা ট্রেডার্সের সাথে সুসম্পর্ক ও ব্যবসার জন্য আপনাকে ধন্যবাদ!`;
  };

  const handleShareWhatsApp = () => {
    if (!lastVoucherData) return;
    const phone = lastVoucherData.customerPhone?.replace(/[^0-9]/g, "") || "";
    const text = generatePaymentReceivedReminder(lastVoucherData);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
    toast.success("WhatsApp মেসেজ ট্রগার করা হয়েছে!");
  };

  const handleShareSMS = () => {
    if (!lastVoucherData) return;
    const phone = lastVoucherData.customerPhone?.replace(/[^0-9]/g, "") || "";
    const text = generatePaymentReceivedReminder(lastVoucherData);
    const url = `sms:${phone}?body=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
    toast.success("SMS মেসেজ ট্রগার করা হয়েছে!");
  };

  const handleCopyReceipt = () => {
    if (!lastVoucherData) return;
    const text = generatePaymentReceivedReminder(lastVoucherData);
    navigator.clipboard.writeText(text);
    toast.success("রসিদ রিমাইন্ডার বার্তা ক্লিপবোর্ডে কপি করা হয়েছে!");
  };

  // Get recent collection history for selected customer
  const doubleEntryStatement = useMemo(() => {
    if (!selectedCustomerId) return [];
    return transactions
      .filter(t => t.partyId === selectedCustomerId && t.type === "payment_in")
      .slice(0, 6)
      .map((t, idx) => ({
        id: t.id || `mock_${idx}`,
        refId: t.id ? t.id.slice(-8) : `coll_${idx}`,
        date: t.date || paymentDate,
        method: t.method || "Cash",
        amount: Number(t.amount) || 0,
        createdBy: t.createdBy || "CASHIER",
        supplierId: t.supplierId,
        supplierName: suppliers.find(s => s.id === t.supplierId)?.company || (t.supplierId === "all" ? "সাধারণ" : "সাপ্লায়ার")
      }));
  }, [selectedCustomerId, transactions, suppliers, paymentDate]);

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
      
      {/* Top Banner: Module Header & Quick Pay Trigger */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-lg border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-2xl border border-indigo-500/30">
              <Coins className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                কাস্টমার কুইক কালেকশন ও রসিদ কাউন্টার
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase tracking-wider">
                  PREMIUM READY
                </span>
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                ব্র্যান্ড-ভিত্তিক কাস্টমার বকেয়া আদায়, অ্যাকাউন্ট পোস্টিং এবং ইনস্ট্যান্ট রসিদ প্রপ্রিন্ট
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls & Quick Pay Shortcut Button */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Quick Pay Action Button */}
          <button
            onClick={() => handleOpenQuickPay()}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 px-4 py-2 rounded-2xl font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer border border-amber-400/40"
          >
            <Zap className="w-4 h-4 fill-slate-950" />
            <span>কুইক পে (Quick Pay)</span>
          </button>

          {/* Auto Notification Trigger Settings */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 px-3 py-1.5 rounded-2xl border border-slate-700 text-xs font-bold text-slate-200">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoSendNotification}
                onChange={(e) => setAutoSendNotification(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-emerald-500 cursor-pointer"
              />
              <span className="text-[11px] font-extrabold text-emerald-400 flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" />
                অটো মেসেজ
              </span>
            </label>
            {autoSendNotification && (
              <select
                value={notificationChannel}
                onChange={(e) => setNotificationChannel(e.target.value as "whatsapp" | "sms")}
                className="bg-slate-900 text-white text-[10px] font-black py-0.5 px-1.5 rounded-lg border border-slate-700 outline-none cursor-pointer"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
              </select>
            )}
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 px-3.5 py-2 rounded-2xl border border-slate-700 text-xs font-bold text-slate-200">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="bg-transparent border-none outline-none text-xs font-black text-white focus:ring-0 cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 px-3.5 py-2 rounded-2xl border border-slate-700 text-xs font-bold text-slate-200">
            <Landmark className="w-4 h-4 text-emerald-400" />
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="bg-transparent border-none outline-none text-xs font-black text-white focus:ring-0 cursor-pointer"
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id} className="bg-slate-900 text-white">
                  {acc.name} (৳ {acc.balance?.toLocaleString() || 0})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Daily Collection Trend vs Monthly Target Summary Chart (Recharts) */}
      <div className="bg-white rounded-3xl border border-slate-150 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                দৈনিক কালেকশন ট্রেন্ড ও মাসিক লক্ষ্যমাত্রা
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                  Target: ৳ {(monthlyTarget / 100000).toFixed(1)} লাখ/মাস
                </span>
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold">
                বিগত ৭ দিনের দৈনিক আদায়ের পরিমাণ বনাম প্রতিদিনের গড় টার্গেট (৳ {dailyTarget.toLocaleString()}/দিন)
              </p>
            </div>
          </div>

          {/* Progress Pill & Toggle */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-150 text-right">
              <span className="text-[10px] text-slate-400 font-bold block">মাসিক অর্জন:</span>
              <span className="text-xs font-black text-indigo-600 font-mono">
                ৳ {currentMonthCollected.toLocaleString()} ({monthlyAchievementPercent}%)
              </span>
            </div>
            <button
              onClick={() => setShowChart(!showChart)}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs transition-colors cursor-pointer"
              title="Chart Toggle"
            >
              {showChart ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Recharts Graphical Display */}
        {showChart && (
          <div className="space-y-3 pt-1 animate-in fade-in duration-200">
            {/* Progress Bar for Monthly Target */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-slate-500">
                <span>চলতি মাসের লক্ষ্যমাত্রা পূরণ</span>
                <span>{monthlyAchievementPercent}% অর্জিত</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${monthlyAchievementPercent}%` }}
                />
              </div>
            </div>

            {/* Recharts Bar/Line Chart */}
            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={collectionTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="dayLabel" 
                    tick={{ fontSize: 10, fill: "#64748b", fontWeight: 700 }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `৳${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderRadius: '16px', 
                      border: 'none', 
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
                    }}
                    formatter={(value: any) => [`৳ ${Number(value).toLocaleString()}`, '']}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '8px' }} 
                  />
                  <Bar 
                    dataKey="আদায়" 
                    fill="#4f46e5" 
                    radius={[6, 6, 0, 0]} 
                    barSize={28}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="টার্গেট" 
                    stroke="#10b981" 
                    strokeWidth={2.5} 
                    dot={{ r: 4, fill: "#10b981" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">মোট বাজার বকেয়া</p>
            <p className="text-xl font-black text-rose-600 font-mono">
              ৳ {stats.totalMarketDue.toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-400 font-semibold">{stats.dueCustomersCount} জন কাস্টমারের বকেয়া</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">আজকের মোট আদায়</p>
            <p className="text-xl font-black text-emerald-600 font-mono">
              ৳ {stats.todayCollected.toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-400 font-semibold">ক্যাশ ও ব্যাংক জমা সংকলন</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">বকেয়া কাস্টমার</p>
            <p className="text-xl font-black text-indigo-600 font-mono">
              {stats.dueCustomersCount} <span className="text-xs text-slate-400 font-sans">/ {stats.totalCustomers}</span>
            </p>
            <p className="text-[10px] text-slate-400 font-semibold">অবশিষ্ট গ্রাহক তালিকা</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <User className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">দ্রুত শর্টকাট</p>
            <p className="text-xs font-black text-slate-800">
              <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded-lg text-slate-800 font-mono text-[11px]">F10</kbd> সেভ | <kbd className="px-2 py-1 bg-amber-100 border border-amber-300 rounded-lg text-amber-900 font-mono text-[11px]">Quick Pay</kbd>
            </p>
            <p className="text-[10px] text-slate-400 font-semibold">কিবোর্ড ও মোবাইল ফ্রেন্ডলি</p>
          </div>
          <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Left Customer Directory & Right Desk Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (Span 4): Customer Search & Route Filter */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-150 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600" />
              কাস্টমার ডিরেক্টরি
            </h3>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {filteredCustomers.length} জন
            </span>
          </div>

          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="কাস্টমারের নাম, মোবাইল বা বিট..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Chips: Beat & Only Dues */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span className="flex items-center gap-1"><Filter className="w-3 h-3" /> বিট / রুট ফিল্টার</span>
              <button
                onClick={() => setOnlyDuesFilter(!onlyDuesFilter)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  onlyDuesFilter 
                    ? "bg-rose-600 text-white" 
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {onlyDuesFilter ? "✓ বকেয়া আছে" : "সকল গ্রাহক"}
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              <button
                onClick={() => setSelectedBeatFilter("all")}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                  selectedBeatFilter === "all"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 border border-slate-150 hover:bg-slate-100"
                }`}
              >
                সব বিট
              </button>
              {availableBeats.map(beat => (
                <button
                  key={beat}
                  onClick={() => setSelectedBeatFilter(beat)}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                    selectedBeatFilter === beat
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-50 text-slate-600 border border-slate-150 hover:bg-slate-100"
                  }`}
                >
                  {beat}
                </button>
              ))}
            </div>
          </div>

          {/* Customer Scroll List */}
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {filteredCustomers.map(c => {
              const isActive = selectedCustomerId === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => handleSelectCustomer(c.id)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-2 cursor-pointer ${
                    isActive 
                      ? "bg-indigo-50/90 border-indigo-300 shadow-xs ring-1 ring-indigo-400/20" 
                      : "bg-white hover:bg-slate-50/80 border-slate-150"
                  }`}
                >
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <p className={`font-black text-xs truncate ${isActive ? "text-indigo-950" : "text-slate-800"}`}>
                      {c.name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold tracking-tight truncate">
                      {c.beat} • {getCustomerPhone(c)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[11px] font-mono font-black px-2.5 py-1 rounded-xl block ${
                      c.totalDue > 0 
                        ? (isActive ? "bg-indigo-600 text-white" : "bg-rose-50 text-rose-700 border border-rose-100") 
                        : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                    }`}>
                      ৳ {c.totalDue.toLocaleString()}
                    </span>

                    {/* Quick Pay Mini Icon Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenQuickPay(c);
                      }}
                      className="p-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-700 hover:text-slate-950 rounded-xl transition-all border border-amber-300/40"
                      title="কুইক পে (Quick Pay)"
                    >
                      <Zap className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredCustomers.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-xs font-semibold space-y-1">
                <p>কোনো কাস্টমার পাওয়া যায়নি</p>
                <p className="text-[10px] text-slate-400">ফিল্টার পরিবর্তন করে পুনরায় চেষ্টা করুন</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Span 8): Collection & Receipt Counter */}
        <div className="lg:col-span-8 space-y-6">
          {selectedCustomer ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              
              {/* Panel 1: Customer Ledger Info & Audit */}
              <div className="bg-white rounded-3xl border border-slate-150 p-5 shadow-xs space-y-5">
                <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-slate-900 text-base line-clamp-1">
                        {selectedCustomer.name}
                      </h3>
                      <button
                        onClick={() => handleOpenQuickPay(selectedCustomer)}
                        className="px-2 py-0.5 bg-amber-500 text-slate-950 font-black rounded-lg text-[10px] flex items-center gap-1 shadow-2xs hover:bg-amber-600 transition-all shrink-0"
                      >
                        <Zap className="w-3 h-3" /> Quick Pay
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 font-semibold">
                      প্রোপ্রাইটর: <span className="text-slate-800 font-bold">{getCustomerProprietor(selectedCustomer)}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium truncate">
                      মোবাইল: <span className="text-slate-700 font-mono">{getCustomerPhone(selectedCustomer)}</span> | রুট: <span className="text-slate-700">{selectedCustomer.beat}</span>
                    </p>
                  </div>

                  <div className="text-right shrink-0 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">ক্রেডিট লিমিট</p>
                    <p className="text-xs font-black text-slate-900 font-mono mt-0.5">
                      ৳ {getCustomerCreditLimit(selectedCustomer).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Brand-Wise Dues Overview */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      কোম্পানি/ব্র্যান্ড বকেয়া ব্রেকডাউন
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {suppliers.map(s => {
                      const brandBreakdown = selectedCustomer.ledgerData?.supplierBreakdown?.find((b: any) => b.supplierId === s.id);
                      const dueAmount = brandBreakdown ? brandBreakdown.due : 0;
                      return (
                        <div 
                          key={s.id} 
                          className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col justify-between"
                        >
                          <span className="text-[10px] text-slate-500 font-bold truncate">
                            {s.company || s.name}
                          </span>
                          <span className={`text-xs font-black font-mono mt-1 ${dueAmount > 0 ? "text-rose-600" : "text-slate-400"}`}>
                            ৳ {dueAmount.toLocaleString()}
                          </span>
                        </div>
                      );
                    })}

                    {/* Generic / All Supplier Row */}
                    {(() => {
                      const genericBreakdown = selectedCustomer.ledgerData?.supplierBreakdown?.find((b: any) => b.supplierId === "all");
                      const genericDue = genericBreakdown ? genericBreakdown.due : 0;
                      if (genericDue > 0) {
                        return (
                          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col justify-between">
                            <span className="text-[10px] text-slate-500 font-bold">সাধারণ / অন্যান্য</span>
                            <span className="text-xs font-black text-rose-600 font-mono mt-1">
                              ৳ {genericDue.toLocaleString()}
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>

                {/* Double Entry Audit Statement */}
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                      সর্বশেষ কালেকশন রেকর্ডসমূহ
                    </h4>
                  </div>
                  
                  <div className="space-y-2 max-h-[220px] overflow-y-auto">
                    {doubleEntryStatement.map((t) => (
                      <div 
                        key={t.id} 
                        className="p-3 bg-slate-50/60 border border-slate-150 rounded-2xl text-[11px] leading-relaxed flex justify-between items-center gap-3 hover:bg-slate-50 transition-colors"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <p className="font-bold text-slate-800 truncate">
                            {t.supplierName} • {t.method}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {t.date} • ক্যাশিয়ার: {t.createdBy}
                          </p>
                        </div>
                        <span className="font-mono font-black text-emerald-600 text-xs shrink-0">
                          +৳ {t.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}

                    {doubleEntryStatement.length === 0 && (
                      <p className="text-xs text-slate-400 italic text-center py-6">
                        এই গ্রাহকের পূর্বে কোনো কালেকশন পাওয়া যায়নি।
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Panel 2: Supplier-wise Collection Counter Input Desk */}
              <div className="bg-white rounded-3xl border border-slate-150 p-5 shadow-xs space-y-5">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <div className="space-y-0.5">
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      কালেকশন এন্ট্রি ডেস্ক
                    </h3>
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                      {selectedCustomer.name}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">মোট বকেয়া</p>
                    <p className="text-sm font-black text-rose-600 font-mono">
                      ৳ {selectedCustomer.totalDue.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Quick Auto-Fill Action Chips */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-indigo-50/50 p-2 rounded-2xl border border-indigo-100">
                  <span className="text-[10px] font-bold text-indigo-900 pl-1">ইনপুট হেল্পার:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={handleFillFullDue}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold transition-all shadow-2xs cursor-pointer"
                    >
                      ⚡ ১০০% ফুল বকেয়া
                    </button>
                    <button
                      onClick={handleFillHalfDue}
                      className="px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                    >
                      ৫০% বকেয়া
                    </button>
                    <button
                      onClick={handleClearAmounts}
                      className="px-2 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                    >
                      ক্লিয়ার
                    </button>
                  </div>
                </div>

                {/* Due Balance Per Supplier Input Rows */}
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    সাপ্লায়ারভিত্তিক জমা পরিমাণ লিখুন
                  </p>
                  
                  <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                    {suppliers.map(s => {
                      const brandBreakdown = selectedCustomer.ledgerData?.supplierBreakdown?.find((b: any) => b.supplierId === s.id);
                      const dueAmount = brandBreakdown ? brandBreakdown.due : 0;
                      
                      if (dueAmount <= 0 && !paymentAmounts[s.id]) return null;

                      return (
                        <div 
                          key={s.id} 
                          className="flex items-center justify-between gap-3 p-3 bg-slate-50/60 border border-slate-150 rounded-2xl"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-slate-800 truncate">
                              {s.company || s.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-semibold font-mono">
                              বকেয়া: ৳ {dueAmount.toLocaleString()}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="relative">
                              <span className="absolute left-2.5 top-2 text-[10px] font-black text-slate-400 font-mono">৳</span>
                              <input
                                type="number"
                                placeholder="0"
                                value={paymentAmounts[s.id] || ""}
                                onChange={(e) => handleAmountChange(s.id, e.target.value)}
                                className="pl-7 pr-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-indigo-700 w-28 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Generic / All Supplier Row Input */}
                    {(() => {
                      const genericBreakdown = selectedCustomer.ledgerData?.supplierBreakdown?.find((b: any) => b.supplierId === "all");
                      const genericDue = genericBreakdown ? genericBreakdown.due : 0;
                      
                      if (genericDue <= 0 && !paymentAmounts["all"]) return null;

                      return (
                        <div className="flex items-center justify-between gap-3 p-3 bg-slate-50/60 border border-slate-150 rounded-2xl">
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-slate-800 truncate">
                              সাধারণ / অন্যান্য বকেয়া
                            </p>
                            <p className="text-[10px] text-slate-400 font-semibold font-mono">
                              বকেয়া: ৳ {genericDue.toLocaleString()}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="relative">
                              <span className="absolute left-2.5 top-2 text-[10px] font-black text-slate-400 font-mono">৳</span>
                              <input
                                type="number"
                                placeholder="0"
                                value={paymentAmounts["all"] || ""}
                                onChange={(e) => handleAmountChange("all", e.target.value)}
                                className="pl-7 pr-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-indigo-700 w-28 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Counter Payment Method Selection */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    পেমেন্ট মেথড
                  </p>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setPaymentMethod("Cash")}
                      className={`py-2 px-3 rounded-xl text-[11px] font-extrabold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        paymentMethod === "Cash"
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <Coins className="w-3.5 h-3.5" />
                      ক্যাশ
                    </button>

                    <button
                      onClick={() => setPaymentMethod("bKash")}
                      className={`py-2 px-3 rounded-xl text-[11px] font-extrabold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        paymentMethod === "bKash"
                          ? "bg-[#D12053] border-[#D12053] text-white shadow-xs"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      বিকাশ
                    </button>

                    <button
                      onClick={() => setPaymentMethod("Bank")}
                      className={`py-2 px-3 rounded-xl text-[11px] font-extrabold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        paymentMethod === "Bank"
                          ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <Building className="w-3.5 h-3.5" />
                      ব্যাংক চেক
                    </button>
                  </div>
                </div>

                {/* Footer Totals and Save Action */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                    <span>মোট কালেকশন পরিমাণ:</span>
                    <span className="font-mono font-black text-base text-indigo-700">
                      ৳ {totalAllocationSum.toLocaleString()}
                    </span>
                  </div>

                  <button
                    onClick={handleSaveCollection}
                    disabled={isSubmitting || totalAllocationSum <= 0}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-black rounded-2xl text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-md cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        সংরক্ষণ হচ্ছে...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        রসিদ তৈরি ও সেভ করুন [F10]
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
                <User className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm text-slate-700">কোনো গ্রাহক সিলেক্ট করা হয়নি</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  বামদিকের তালিকা থেকে গ্রাহক সিলেক্ট করুন বা উপরের অনুসন্ধান বক্স ব্যবহার করুন।
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* QUICK PAY MODAL DIALOG */}
      {showQuickPayModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500 text-slate-950 rounded-xl shadow-xs">
                  <Zap className="w-5 h-5 fill-slate-950" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    কুইক পে (Quick Pay) কালেকশন
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold">
                    ১-ক্লিকে গ্রাহক কালেকশন ও ইনস্ট্যান্ট অ্যাকাউন্ট এন্ট্রি
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowQuickPayModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer Selector Dropdown */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-slate-700 block">
                গ্রাহক নির্বাচন করুন:
              </label>
              <select
                value={quickPayCustomerId}
                onChange={(e) => {
                  setQuickPayCustomerId(e.target.value);
                  const cust = customersWithBalances.find(c => c.id === e.target.value);
                  if (cust) {
                    setQuickPayAmount(cust.totalDue > 0 ? String(cust.totalDue) : "");
                  }
                }}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
              >
                <option value="">-- কাস্টমার সিলেক্ট করুন --</option>
                {customersWithBalances.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.beat}) - বকেয়া: ৳{c.totalDue.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Customer Card Preview */}
            {(() => {
              const qCust = customersWithBalances.find(c => c.id === quickPayCustomerId);
              if (!qCust) return null;

              return (
                <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-4 rounded-2xl text-white space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-black text-sm text-amber-400">{qCust.name}</p>
                      <p className="text-[10px] text-slate-300 font-medium">{qCust.beat} • {getCustomerPhone(qCust)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-slate-400 font-bold uppercase">বর্তমান বকেয়া</p>
                      <p className="text-sm font-black text-rose-400 font-mono">৳ {qCust.totalDue.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Quick Preset Amount Chips */}
                  <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setQuickPayAmount(String(qCust.totalDue))}
                      className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 rounded-xl text-[10px] font-bold border border-amber-500/30 transition-all cursor-pointer"
                    >
                      ফুল বকেয়া (৳{qCust.totalDue.toLocaleString()})
                    </button>
                    {qCust.totalDue > 0 && (
                      <button
                        type="button"
                        onClick={() => setQuickPayAmount(String(Math.round(qCust.totalDue / 2)))}
                        className="px-2.5 py-1 bg-indigo-500/20 hover:bg-indigo-500 text-indigo-200 hover:text-white rounded-xl text-[10px] font-bold border border-indigo-500/30 transition-all cursor-pointer"
                      >
                        ৫০% (৳{Math.round(qCust.totalDue / 2).toLocaleString()})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setQuickPayAmount("10000")}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[10px] font-bold border border-slate-700 transition-all cursor-pointer"
                    >
                      ৳ ১০,০০০
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickPayAmount("5000")}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[10px] font-bold border border-slate-700 transition-all cursor-pointer"
                    >
                      ৳ ৫,০০০
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Quick Amount Entry Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-slate-700 block">
                জমা পরিমাণ (Amount in ৳):
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-sm font-black text-slate-400 font-mono">৳</span>
                <input
                  type="number"
                  placeholder="0"
                  value={quickPayAmount}
                  onChange={(e) => setQuickPayAmount(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-base font-black text-indigo-700 font-mono focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            {/* Target Supplier Allocation Choice */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-slate-700 block">
                সাপ্লায়ার বন্টন নীতি:
              </label>
              <select
                value={quickPaySupplierId}
                onChange={(e) => setQuickPaySupplierId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none"
              >
                <option value="auto">⚡ অটো বন্টন (বকেয়া অনুযায়ী ক্রমানুসারে)</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.company || s.name}
                  </option>
                ))}
                <option value="all">সাধারণ / কোম্পানি বকেয়া</option>
              </select>
            </div>

            {/* Quick Pay Method & Account */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase">পেমেন্ট মেথড</label>
                <div className="flex gap-1.5">
                  {["Cash", "bKash", "Bank"].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setQuickPayMethod(m)}
                      className={`flex-1 py-2 text-[10px] font-extrabold rounded-xl border transition-all cursor-pointer ${
                        quickPayMethod === m 
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs" 
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase">জমা অ্যাকাউন্ট</label>
                <select
                  value={quickPayAccountId}
                  onChange={(e) => setQuickPayAccountId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Submit Footer */}
            <div className="pt-3 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={() => setShowQuickPayModal(false)}
                className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-colors cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleExecuteQuickPay}
                disabled={isSubmitting || !quickPayAmount || Number(quickPayAmount) <= 0}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 text-slate-950 font-black rounded-2xl text-xs transition-all active:scale-[0.98] shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    প্রসেস হচ্ছে...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-slate-950" />
                    কালেকশন জমা দিন & রসিদ পান
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* VOUCHER THERMAL RECEIPT & SHARE MODAL */}
      {showVoucherModal && lastVoucherData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150 max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-600 font-extrabold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                কালেকশন রসিদ তৈরি সম্পন্ন
              </div>
              <button 
                onClick={() => setShowVoucherModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Printable Card */}
            <div id="printable-voucher" className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 text-slate-800 font-sans">
              
              {/* Header Company Info */}
              <div className="text-center space-y-1 border-b border-slate-200 pb-3">
                <h4 className="font-black text-base text-slate-900">SAMIRA TRADERS</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  Money Receipt / টাকা প্রাপ্তির রসিদ
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  মেমো নং: #{lastVoucherData.voucherNo} | তারিখ: {lastVoucherData.date} ({lastVoucherData.time})
                </p>
              </div>

              {/* Customer Details */}
              <div className="text-xs space-y-1 bg-white p-3 rounded-xl border border-slate-150">
                <p><span className="text-slate-400 font-bold">গ্রাহকের নাম:</span> <span className="font-black text-slate-900">{lastVoucherData.customerName}</span></p>
                <p><span className="text-slate-400 font-bold">মোবাইল:</span> <span className="font-mono text-slate-800">{lastVoucherData.customerPhone}</span></p>
                <p><span className="text-slate-400 font-bold">বিট / এলাকা:</span> <span className="text-slate-800">{lastVoucherData.customerBeat}</span></p>
              </div>

              {/* Itemized Allocation Table */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">কোম্পানিভিত্তিক জমা বিবরণ</p>
                <div className="bg-white rounded-xl border border-slate-150 divide-y divide-slate-100 text-xs">
                  {lastVoucherData.items.map((item: any, i: number) => (
                    <div key={i} className="p-2.5 flex justify-between items-center">
                      <span className="font-bold text-slate-700">{item.supplierName}</span>
                      <span className="font-mono font-black text-indigo-700">৳ {item.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals Summary */}
              <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 space-y-1.5 text-xs font-bold">
                <div className="flex justify-between text-slate-600">
                  <span>পূর্বের মোট বকেয়া:</span>
                  <span className="font-mono text-slate-800">৳ {lastVoucherData.previousDue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-indigo-900 font-black text-sm pt-1 border-t border-indigo-200">
                  <span>আজকের মোট জমা ({lastVoucherData.paymentMethod}):</span>
                  <span className="font-mono text-indigo-700">৳ {lastVoucherData.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600 pt-1 border-t border-indigo-100">
                  <span>অবশিষ্ট বকেয়া:</span>
                  <span className="font-mono text-rose-600">৳ {lastVoucherData.remainingDue.toLocaleString()}</span>
                </div>
              </div>

              {/* Signature Footer */}
              <div className="pt-6 flex justify-between items-end text-[10px] text-slate-400 font-bold">
                <div className="text-center border-t border-slate-300 pt-1 w-24">
                  গ্রাহকের স্বাক্ষর
                </div>
                <div className="text-center border-t border-slate-300 pt-1 w-24">
                  ক্যাশিয়ারের স্বাক্ষর
                </div>
              </div>
            </div>

            {/* Instant Share Buttons & Notification Preview */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  অটোমেটিক রিমাইন্ডার নোটিফিকেশন
                </p>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  {autoSendNotification ? "অটো ট্রগার চালু" : "ম্যানুয়াল ট্রগার"}
                </span>
              </div>

              {/* Message Preview Box */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] font-mono text-slate-700 leading-relaxed max-h-24 overflow-y-auto">
                {generatePaymentReceivedReminder(lastVoucherData)}
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  onClick={handleShareWhatsApp}
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                >
                  <MessageSquare className="w-4 h-4" />
                  WhatsApp
                </button>

                <button
                  onClick={handleShareSMS}
                  className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  SMS
                </button>

                <button
                  onClick={handleCopyReceipt}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <Copy className="w-4 h-4" />
                  কপি টেক্সট
                </button>
              </div>
            </div>

            {/* Print & Close Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                রসিদ প্রিন্ট করুন
              </button>
              <button
                onClick={() => setShowVoucherModal(false)}
                className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs transition-all cursor-pointer"
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
