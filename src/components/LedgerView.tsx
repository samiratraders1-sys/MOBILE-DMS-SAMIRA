import React, { useState, useMemo } from "react";
import { 
  Plus, 
  Search, 
  User, 
  Users,
  Filter, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Printer, 
  ShoppingCart, 
  Wallet, 
  CreditCard, 
  Download, 
  Share2, 
  Phone, 
  MessageSquare, 
  Clock, 
  Send, 
  MoreVertical, 
  Calendar, 
  ArrowLeft, 
  Check, 
  Settings, 
  ChevronRight, 
  Info, 
  X, 
  ExternalLink, 
  FileText, 
  Loader2 
} from "lucide-react";
import toast from "react-hot-toast";
import { getGroupColors } from "../lib/utils";
import { calculateRunningBalance, LedgerTransaction } from "../lib/ledgerEngine";
import { calculateLedger } from "../utils/ledgerCalculator";

// Format numbers in "Lakh" formatting (e.g., 2,70,836 Tk.)
const showTk = (val: number) => {
  return Math.abs(val).toLocaleString("en-IN") + " Tk.";
};

interface LedgerProps {
  summaries: any[];
  staff: any[];
  customers: any[];
  suppliers: any[];
  products: any[];
  payments: any[];
  purchases: any[];
  sales?: any[];
  transactions?: any[];
  
  // Real DB actions injected from App.tsx
  addCustomer?: (item: any) => Promise<any>;
  updateCustomer?: (id: string, data: any) => Promise<any>;
  addSupplier?: (item: any) => Promise<any>;
  updateSupplier?: (id: string, data: any) => Promise<any>;
  addPayment?: (item: any) => Promise<any>;
  addSale?: (item: any) => Promise<any>;
  updateProduct?: (id: string, data: any) => Promise<any>;
  accounts?: any[];
  role?: string;
  user?: any;
  setActiveView?: (view: string) => void;
  selectedParty?: { id: string; type: "customer" | "supplier" | "staff" } | null;
  setSelectedParty?: (party: { id: string; type: "customer" | "supplier" | "staff" } | null) => void;
}

export default function LedgerView({ 
  summaries = [], 
  staff = [], 
  customers = [], 
  suppliers = [], 
  products = [], 
  payments = [], 
  purchases = [], 
  sales = [],
  transactions = [],
  addCustomer,
  updateCustomer,
  addSupplier,
  updateSupplier,
  addPayment,
  addSale,
  updateProduct,
  accounts = [],
  role = "staff",
  user,
  setActiveView,
  selectedParty: propSelectedParty,
  setSelectedParty: propSetSelectedParty
}: LedgerProps) {

  // Selected party details state
  // If selectedParty exists, we are in the "Party Detail ledger" view
  const [localSelectedParty, setLocalSelectedParty] = useState<{ id: string; type: "customer" | "supplier" | "staff" } | null>(null);

  const selectedParty = propSelectedParty !== undefined ? propSelectedParty : localSelectedParty;
  const setSelectedParty = propSetSelectedParty !== undefined ? propSetSelectedParty : setLocalSelectedParty;

  // Filter States inside Parties List
  const [partySearch, setPartySearch] = useState("");
  const [relationshipFilter, setRelationshipFilter] = useState<"all" | "receive" | "give" | "settled">("all");
  const [partyTypeTab, setPartyTypeTab] = useState<"all" | "customer" | "supplier" | "staff">("all");

  // Inside Selected Party ledger history filter
  const [historySearch, setHistorySearch] = useState("");

  // Modals controller states
  const [showAddPartyModal, setShowAddPartyModal] = useState(false);
  const [showPaymentInModal, setShowPaymentInModal] = useState(false);
  const [showPaymentOutModal, setShowPaymentOutModal] = useState(false);
  const [showDirectSaleModal, setShowDirectSaleModal] = useState(false);
  const [showQuickPayConfirm, setShowQuickPayConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Party Form inputs
  const [newPartyName, setNewPartyName] = useState("");
  const [newPartyPhone, setNewPartyPhone] = useState("");
  const [newPartyAddress, setNewPartyAddress] = useState("");
  const [newPartyType, setNewPartyType] = useState<"customer" | "supplier">("customer");
  const [newPartyOpeningBal, setNewPartyOpeningBal] = useState("");

  // Payment Form inputs
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Cash");
  const [payAccountId, setPayAccountId] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [paySupplierId, setPaySupplierId] = useState("all");

  // Direct Sale Form builder state
  const [saleItems, setSaleItems] = useState<any[]>([]); // { productId, qtyCartons, qtyPieces, rate, freeQty, name, cartonSize }
  const [selectedSaleProduct, setSelectedSaleProduct] = useState("");
  const [inputCartons, setInputCartons] = useState("");
  const [inputPieces, setInputPieces] = useState("");
  const [inputFree, setInputFree] = useState("");
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split("T")[0]);

  // Calculate Party Balance dynamically from real ledger data,
  // back-combining with database .balance or computed chronologically
  const enrichedParties = useMemo(() => {
    const list: any[] = [];

    // 1. Process Customers
    customers.forEach(c => {
      const computedBalance = Number(c.balance) || 0;

      list.push({
        id: c.id,
        name: c.name,
        phone: c.phone || "No Phone",
        address: c.address || "",
        type: "customer",
        groupId: c.groupId || "",
        computedBalance,
        raw: c
      });
    });

    // 2. Process Suppliers
    suppliers.forEach(s => {
      const computedBalance = Number(s.balance) || 0;

      list.push({
        id: s.id,
        name: s.name,
        phone: s.phone || "No Phone",
        address: s.address || "",
        type: "supplier",
        computedBalance,
        raw: s
      });
    });

    // 3. Process Staff of Samira Traders
    staff.forEach(st => {
      const computedBalance = Number(st.balance) || 0;

      list.push({
        id: st.id,
        name: st.name,
        phone: st.phone || "No Phone",
        address: st.address || "",
        type: "staff",
        computedBalance,
        raw: st
      });
    });

    return list;
  }, [customers, suppliers, staff, summaries, sales, payments, purchases]);

  // Handle active filters on parties list
  const filteredParties = useMemo(() => {
    return enrichedParties.filter(p => {
      // 1. Search filter
      const term = partySearch.toLowerCase();
      const matchesSearch = p.name.toLowerCase().includes(term) || p.phone.includes(term) || p.address.toLowerCase().includes(term);

      if (!matchesSearch) return false;

      // 2. Party Type Tab filter
      if (partyTypeTab !== "all" && p.type !== partyTypeTab) return false;

      // 3. Relationship Outstanding filters (Matches Image 1 filters: To Give, To Receive, Settled)
      // For general logic:
      // Customers: Balance > 0 means outstanding we are "To Receive" (পাবে)
      // Suppliers: Balance > 0 means we owe them, so we have "To Give" (দিতে হবে)
      // Staff: Balance > 0 means they held cash, so they have to submit to us "To Receive"
      
      const val = p.computedBalance;
      if (relationshipFilter === "receive") {
        if (p.type === "customer" && val <= 0) return false;
        if (p.type === "supplier" && val >= 0) return false; // if supplier balance is negative, it's prepaid, so we are to receive
        if (p.type === "staff" && val <= 0) return false;
      } else if (relationshipFilter === "give") {
        if (p.type === "customer" && val >= 0) return false; // customer with advance payment, we have to give
        if (p.type === "supplier" && val <= 0) return false; // normal supplier outstanding dues
        if (p.type === "staff" && val >= 0) return false;
      } else if (relationshipFilter === "settled") {
        if (val !== 0) return false;
      }

      return true;
    });
  }, [enrichedParties, partySearch, partyTypeTab, relationshipFilter]);

  // Real-time matched results for the quick autocomplete dropdown under search input
  const matchingSearchParties = useMemo(() => {
    const term = partySearch.trim().toLowerCase();
    if (!term) return [];
    return enrichedParties.filter(p => {
      return (
        p.name.toLowerCase().includes(term) ||
        (p.phone && p.phone.includes(term)) ||
        (p.address && p.address.toLowerCase().includes(term)) ||
        (p.groupId && p.groupId.toLowerCase().includes(term))
      );
    });
  }, [enrichedParties, partySearch]);

  // Helper to get raw recent transaction logs for any party
  const getRecentTransactions = (partyId: string, type: string, limit: number = 2) => {
    const logs: any[] = [];

    if (type === "customer") {
      // 1. Credit Sales from settlements
      summaries.filter(s => s.status === 'settled').forEach(s => {
        (s.credits || []).filter((c: any) => c.customerId === partyId).forEach((c: any, idx: number) => {
          logs.push({
            date: s.settlementDate || s.date || "N/A",
            ref: `Sale: Route Settle`,
            type: "Debit",
            amount: Number(c.amount || 0),
            description: `এসআর রুট ক্রেডিটে বিক্রয় (${s.routeId || "সাধারণ"})`,
            id: `settle_credit_${s.id}_${idx}`
          });
        });
      });

      // 2. Client direct POS Sales
      sales.filter(s => s.customerId === partyId).forEach((s, idx) => {
        logs.push({
          date: s.date ? s.date.split("T")[0] : s.createdAt?.split("T")[0] || "N/A",
          ref: `POS Bill #${s.id?.slice(-4).toUpperCase() || idx}`,
          type: "Debit",
          amount: Number(s.total || 0),
          description: `সরাসরি বিক্রয় (POS)`,
          id: `pos_sale_${s.id || idx}`
        });
      });

      // 3. Client payments / cash receipt
      payments.filter(p => p.entityId === partyId).forEach((p, idx) => {
        logs.push({
          date: p.date || p.createdAt?.split("T")[0] || "N/A",
          ref: `Payment ${p.type === "in" ? "In" : "Out"} #${p.id?.slice(-4).toUpperCase() || idx}`,
          type: p.type === "in" ? "Credit" : "Debit",
          amount: Number(p.amount || 0),
          description: p.description || (p.type === "in" ? "টাকা গ্রহণ" : "টাকা পরিশোধ"),
          id: `payment_${p.id || idx}`
        });
      });
    }

    if (type === "supplier") {
      // 1. Purchase Invoices
      purchases.filter(p => p.supplierId === partyId).forEach((p, idx) => {
        logs.push({
          date: p.date || "N/A",
          ref: `Purchase Invoice #${p.invoiceId || p.id?.slice(-4).toUpperCase() || idx}`,
          type: "Credit",
          amount: Number(p.total || 0),
          description: `পণ্য ক্রয় ইনভয়েস`,
          id: `purchase_${p.id || idx}`
        });
      });

      // 2. Payments to suppliers
      payments.filter(p => p.entityId === partyId).forEach((p, idx) => {
        logs.push({
          date: p.date || p.createdAt?.split("T")[0] || "N/A",
          ref: `Payment ${p.type === "in" ? "In" : "Out"} #${p.id?.slice(-4).toUpperCase() || idx}`,
          type: p.type === "in" ? "Credit" : "Debit",
          amount: Number(p.amount || 0),
          description: p.description || (p.type === "in" ? "সাপ্লায়ার রিফান্ড" : "সাপ্লায়ার বিল পরিশোধ"),
          id: `payment_${p.id || idx}`
        });
      });
    }

    if (type === "staff") {
      summaries.filter(s => s.dsrId === partyId && s.status === 'settled').forEach(s => {
        logs.push({
          date: s.settlementDate || s.date || "N/A",
          ref: `DSR Route Settle`,
          type: "Credit",
          amount: Number(s.salesValue || 0),
          description: `রুট বিক্রয় কালেকশন জমা (${s.routeId})`,
          id: `settle_staff_${s.id}`
        });

        if (s.expenses && s.expenses.length > 0) {
          const totalExp = s.expenses.reduce((acc: number, e: any) => acc + (e.amount || 0), 0);
          logs.push({
            date: s.settlementDate || s.date || "N/A",
            ref: `Expense Voucher`,
            type: "Debit",
            amount: totalExp,
            description: `রুট খরচ ভাউচার সমীকরণ`,
            id: `expense_staff_${s.id}`
          });
        }
      });
    }

    // Sort logs descending by date
    return logs
      .sort((a, b) => {
        return String(b.date || "").localeCompare(String(a.date || ""));
      })
      .slice(0, limit);
  };

  // Target Selected Party Object
  const selectedPartyObj = useMemo(() => {
    if (!selectedParty) return null;
    return enrichedParties.find(p => p.id === selectedParty.id && p.type === selectedParty.type) || null;
  }, [selectedParty, enrichedParties]);

  // Target Customer's Dues split per Supplier (Requested: Customer ledgers per supplier)
  const customerSupplierDues = useMemo(() => {
    if (!selectedParty || selectedParty.type !== "customer" || !selectedPartyObj) {
      return [];
    }

    const { supplierBreakdown } = calculateLedger(
      selectedParty.id,
      "customer",
      transactions,
      suppliers,
      products,
      0
    );

    return supplierBreakdown
      .map(item => ({
        id: item.supplierId,
        name: item.supplierName,
        company: item.supplierName,
        due: item.due,
        sales: item.sales,
        payments: item.payments,
        returns: item.returns
      }))
      .filter(item => Math.abs(item.due) > 0.01 || item.sales > 0 || item.payments > 0 || item.returns > 0);
  }, [selectedParty, selectedPartyObj, transactions, suppliers, products]);

  // Target Selected Party's detailed chronological ledger logs
  const selectedPartyLedgerLogs = useMemo(() => {
    if (!selectedParty) return [];
    const partyId = selectedParty.id;
    const type = selectedParty.type;

    const { logs } = calculateLedger(
      partyId,
      type,
      transactions,
      suppliers,
      products,
      0
    );

    const finishedLogs = logs.map(item => {
      let isDebit = false;
      if (type === "customer") {
        isDebit = item.type === "sale" || item.type === "payment_out" || (item.type === "opening" && item.amount > 0);
      } else if (type === "supplier") {
        isDebit = item.type === "payment_out" || item.type === "return" || (item.type === "opening" && item.amount < 0);
      } else if (type === "staff") {
        isDebit = item.type === "payment_out" || item.type === "purchase";
      }

      return {
        id: item.id,
        date: item.date,
        ref: item.refId ? `রসিদ #${item.refId.slice(-4).toUpperCase()}` : "লেনদেন",
        type: isDebit ? "Debit" : "Credit",
        amount: item.amount,
        description: item.description,
        runningBalance: item.runningBalance
      };
    });

    // Apply history query filter
    const term = historySearch.toLowerCase();
    const filteredLogs = finishedLogs.filter(l => 
      l.description.toLowerCase().includes(term) || 
      l.ref.toLowerCase().includes(term) || 
      l.date.includes(term)
    );

    return filteredLogs;
  }, [selectedParty, transactions, suppliers, products, historySearch]);

  // Quick reminder SMS builder helper
  const handleCopySMS = (party: any) => {
    if (!party) return;
    const txt = `সম্মানিত কাস্টমার, সমীরা ট্রেডার্সে আপনার বকেয়া হিসাব অনুযায়ী বকেয়ার পরিমাণ হল ${showTk(party.computedBalance)}। দ্রুত পরিশোধ করার জন্য অনুরোধ রইল। যোগাযোগ: ০১৯২৬৬০৭৬২৮`;
    navigator.clipboard.writeText(txt);
    toast.success("বকেয়া রিমাইন্ডার মেসেজ ক্লিপবোর্ডে কপি হয়েছে!");
  };

  const handlePhoneCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
    toast.success(`কল করার চেষ্টা করা হচ্ছে: ${phone}`);
  };

  const handleOpenWhatsApp = (party: any) => {
    if (!party) return;
    const txt = `📂 *সমীূরা ট্রেডার্স (Samira Traders)*\n` +
                `👤 পক্ষ: *${party.name}*\n` +
                `📌 ব্যবসার ধরণ: *${party.type === "customer" ? "কাস্টমার" : party.type === "supplier" ? "সাপ্লায়ার" : "স্টাফ/এসআর"}*\n` +
                `━━━━━━━━━━━━━━━━━━━━━\n` +
                `💰 বকেয়া সম্পর্ক: *${party.computedBalance >= 0 ? "পাবেন / To Receive" : "দিতে হবে / To Pay"}*\n` +
                `📈 মোট বকেয়ার পরিমাণ: *${showTk(party.computedBalance)}*\n` +
                `━━━━━━━━━━━━━━━━━━━━━\n` +
                `ধন্যবাদ, সমীরা ট্রেডার্স।`;
    window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, "_blank");
  };

  // 1. HANDLER FOR NEW PARTY CREATION
  const handleAddNewParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartyName.trim()) {
      toast.error("পার্টির নাম দেওয়া বাধ্যতামূলক!");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const opening = Number(newPartyOpeningBal) || 0;
      const record = {
        name: newPartyName.trim(),
        phone: newPartyPhone.trim(),
        address: newPartyAddress.trim(),
        balance: opening,
        createdAt: new Date().toISOString()
      };

      if (newPartyType === "customer") {
        if (addCustomer) {
          await addCustomer(record);
          toast.success("কাস্টমার পার্টি সফলভাবে সিস্টেমে যুক্ত হয়েছে!");
        } else {
          toast.error("addCustomer API কনফিগার করা নেই।");
        }
      } else {
        if (addSupplier) {
          await addSupplier(record);
          toast.success("সাপ্লায়ার পার্টি সফলভাবে সিস্টেমে যুক্ত হয়েছে!");
        } else {
          toast.error("addSupplier API কনফিগার করা নেই।");
        }
      }

      // Reset
      setNewPartyName("");
      setNewPartyPhone("");
      setNewPartyAddress("");
      setNewPartyOpeningBal("");
      setShowAddPartyModal(false);
    } catch (err: any) {
      toast.error("পার্টি যোগ করতে ত্রুটি হয়েছে: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. HANDLER FOR PAYMENT IN / RECEIVE (টাকা জমা)
  const handleSavePaymentIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(payAmount);
    if (!selectedPartyObj || !amount || amount <= 0) {
      toast.error("অনুগ্রহ করে সঠিক টাকার পরিমাণ দিন!");
      return;
    }

    setIsSubmitting(true);
    try {
      const paymentRecord = {
        date: payDate,
        type: "in",
        amount: amount,
        category: selectedPartyObj.type === "customer" ? "Customer Collection" : "Refunding Inward",
        description: payNote.trim() || `ক্যাশ ইন: ${selectedPartyObj.name} থেকে টাকা জমা`,
        entityId: selectedPartyObj.id,
        supplierId: selectedPartyObj.type === "customer" ? paySupplierId : selectedPartyObj.id,
        method: payMethod,
        accountId: payAccountId || "cash",
        status: "approved",
        approved: true,
        createdBy: user?.email || "Manager",
        createdAt: new Date().toISOString()
      };

      if (addPayment) {
        await addPayment(paymentRecord);
      } else {
        throw new Error("addPayment callback missing");
      }

      // Update local party schema balance
      if (selectedPartyObj.type === "customer" && updateCustomer) {
        const newBal = (Number(selectedPartyObj.raw.balance) || 0) - amount;
        await updateCustomer(selectedPartyObj.id, { balance: newBal });
      } else if (selectedPartyObj.type === "supplier" && updateSupplier) {
        const newBal = (Number(selectedPartyObj.raw.balance) || 0) + amount;
        await updateSupplier(selectedPartyObj.id, { balance: newBal });
      }

      toast.success("পেমেন্ট-ইন (টাকা জমা) সফলভাবে সম্পন্ন হয়েছে!");
      setPayAmount("");
      setPayNote("");
      setShowPaymentInModal(false);
    } catch (e: any) {
      toast.error("পেমেন্ট সেভ করতে ত্রুটি: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. HANDLER FOR PAYMENT OUT / GIVE (টাকা খরচ)
  const handleSavePaymentOut = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(payAmount);
    if (!selectedPartyObj || !amount || amount <= 0) {
      toast.error("অনুগ্রহ করে সঠিক টাকার পরিমাণ দিন!");
      return;
    }

    setIsSubmitting(true);
    try {
      const paymentRecord = {
        date: payDate,
        type: "out",
        amount: amount,
        category: selectedPartyObj.type === "supplier" ? "Supplier Payment" : "Expense Collection",
        description: payNote.trim() || `ক্যাশ আউট: ${selectedPartyObj.name} কে পরিশোধ`,
        entityId: selectedPartyObj.id,
        supplierId: selectedPartyObj.type === "customer" ? paySupplierId : selectedPartyObj.id,
        method: payMethod,
        accountId: payAccountId || "cash",
        status: "approved",
        approved: true,
        createdBy: user?.email || "Manager",
        createdAt: new Date().toISOString()
      };

      if (addPayment) {
        await addPayment(paymentRecord);
      } else {
        throw new Error("addPayment callback missing");
      }

      // Update local supplier/customer balance
      if (selectedPartyObj.type === "supplier" && updateSupplier) {
        const newBal = (Number(selectedPartyObj.raw.balance) || 0) - amount;
        await updateSupplier(selectedPartyObj.id, { balance: newBal });
      } else if (selectedPartyObj.type === "customer" && updateCustomer) {
        const newBal = (Number(selectedPartyObj.raw.balance) || 0) + amount;
        await updateCustomer(selectedPartyObj.id, { balance: newBal });
      }

      toast.success("পেমেন্ট-আউট (টাকা পরিশোধ) সফল হয়েছে!");
      setPayAmount("");
      setPayNote("");
      setShowPaymentOutModal(false);
    } catch (e: any) {
      toast.error("পেমেন্ট সেভ করতে ত্রুটি: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // HANDLER FOR QUICK PAY (বকেয়া কুইক পরিশোধ)
  const handleQuickPay = async () => {
    if (!selectedPartyObj) return;
    if (selectedPartyObj.type !== "customer") {
      toast.error("শুধুমাত্র কাস্টমারদের জন্য কুইক পে প্রযোজ্য!");
      return;
    }
    const amount = Number(selectedPartyObj.computedBalance);
    if (amount <= 0) {
      toast.error("পরিশোধ করার মতো কোনো বকেয়া নেই!");
      return;
    }

    setIsSubmitting(true);
    try {
      const defaultAcc = accounts.find(a => a.name?.toLowerCase().includes("cash") || a.id?.toLowerCase().includes("cash"))?.id || "cash";

      const paymentRecord = {
        date: new Date().toISOString().split("T")[0],
        type: "in",
        amount: amount,
        category: "Customer Collection",
        description: `কুইক পে: কাস্টমার বকেয়া পরিশোধ (${selectedPartyObj.name})`,
        entityId: selectedPartyObj.id,
        method: "Cash",
        accountId: defaultAcc,
        status: "approved",
        approved: true,
        createdBy: user?.email || "Manager",
        createdAt: new Date().toISOString()
      };

      if (addPayment) {
        await addPayment(paymentRecord);
      } else {
        throw new Error("addPayment callback missing");
      }

      // Update local party schema balance
      if (updateCustomer) {
        const newBal = (Number(selectedPartyObj.raw.balance) || 0) - amount;
        await updateCustomer(selectedPartyObj.id, { balance: newBal });
      }

      toast.success(`সফলভাবে সম্পূর্ণ বকেয়া ${showTk(amount)} কুইক পরিশোধ সম্পন্ন হয়েছে!`);
      setShowQuickPayConfirm(false);
    } catch (e: any) {
      toast.error("কুইক পে সম্পন্ন করতে ত্রুটি: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. DIRECT MOB-SALE BASKET HELPERS
  const currentSelectedProductInfo = useMemo(() => {
    return products.find(p => p.id === selectedSaleProduct);
  }, [selectedSaleProduct, products]);

  const handleAddProductToSaleBasket = () => {
    if (!selectedSaleProduct) {
      toast.error("অনুগ্রহ করে পণ্য নির্বাচন করুন!");
      return;
    }

    const prod = products.find(p => p.id === selectedSaleProduct);
    if (!prod) return;

    const cartons = Number(inputCartons) || 0;
    const pieces = Number(inputPieces) || 0;
    const free = Number(inputFree) || 0;
    const cSize = Number(prod.cartoonSize || prod.piecesInCarton || 1);

    const totalPieces = (cartons * cSize) + pieces;

    if (totalPieces <= 0) {
      toast.error("কার্টুন বা পিস এর পরিমাণ ০ এর বেশি হতে হবে!");
      return;
    }

    // Check inventory stock safety
    const totalDemanded = totalPieces + free;
    if (totalDemanded > (Number(prod.stock) || 0)) {
      toast.error(`পর্যাপ্ত স্টক নেই! ক্যাটালগ স্টক: ${prod.stock || 0} পিস`);
      return;
    }

    // Checking if already in cart
    const existsIdx = saleItems.findIndex(item => item.productId === prod.id);
    const cartItem = {
      productId: prod.id,
      name: prod.name,
      cartons,
      pieces,
      freeQty: free,
      rate: Number(prod.price || prod.tradePrice || 0),
      cartonSize: cSize,
      totalPieces
    };

    if (existsIdx > -1) {
      const updated = [...saleItems];
      updated[existsIdx] = cartItem;
      setSaleItems(updated);
    } else {
      setSaleItems([...saleItems, cartItem]);
    }

    // Clear inputs
    setSelectedSaleProduct("");
    setInputCartons("");
    setInputPieces("");
    setInputFree("");
    toast.success("পণ্য বিক্রয় কার্টে যুক্ত করা হয়েছে!");
  };

  const handleSumSaleTotal = useMemo(() => {
    return saleItems.reduce((acc, item) => acc + (item.totalPieces * item.rate), 0);
  }, [saleItems]);

  const handleSaveDirectSale = async () => {
    if (!selectedPartyObj || saleItems.length === 0) {
      toast.error("কার্ট খালি! প্রথমে পণ্য সিলেক্ট করে কার্টে যোগ করুন।");
      return;
    }

    setIsSubmitting(true);
    try {
      const netTotal = handleSumSaleTotal;
      const checkoutDate = new Date().toISOString();

      const saleRecord = {
        date: saleDate,
        customerId: selectedPartyObj.id,
        customerName: selectedPartyObj.name,
        items: saleItems.map(item => ({
          productId: item.productId,
          name: item.name,
          quantity: item.totalPieces, // in pieces
          cartons: item.cartons,
          pieces: item.pieces,
          freeQty: item.freeQty,
          cartoonSize: item.cartonSize,
          price: item.rate, // unit trade price
          total: item.totalPieces * item.rate
        })),
        total: netTotal,
        paidAmount: 0, // Recorded as 100% outstanding credit in this fast-ledger sale
        dueAmount: netTotal,
        status: "pending_approval",
        approved: false,
        createdBy: user?.email || "Manager",
        createdAt: checkoutDate
      };

      if (addSale) {
        await addSale(saleRecord);
      } else {
        throw new Error("addSale callback not configured");
      }

      // Deduct stock immediately in local DB
      if (updateProduct) {
        for (const item of saleItems) {
          const prod = products.find(p => p.id === item.productId);
          if (prod) {
            const currentStock = Number(prod.stock) || 0;
            const deduction = (Number(item.totalPieces) || 0) + (Number(item.freeQty) || 0);
            const updatedStock = Math.max(0, currentStock - deduction);
            await updateProduct(item.productId, {
              stock: isNaN(updatedStock) ? 0 : updatedStock
            });
          }
        }
      }

      // Increment customer outstanding balance (since it's unpaid credit sale)
      if (selectedPartyObj.type === "customer" && updateCustomer) {
        const newBal = (Number(selectedPartyObj.raw.balance) || 0) + netTotal;
        await updateCustomer(selectedPartyObj.id, { balance: newBal });
      }

      toast.success(`সরাসরি বাকিতে পণ্য বিক্রয় সম্পন্ন! অনুমোদনের জন্য পেন্ডিং টেবে পাঠানো হয়েছে।`);
      setSaleItems([]);
      setShowDirectSaleModal(false);
    } catch (e: any) {
      toast.error("বিক্রয় সেভ করতে ত্রুটি: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintStatement = () => {
    if (!selectedPartyObj) return;
    const printContent = `
      <html>
        <head>
          <title>Samira Traders Ledger Statement: ${selectedPartyObj.name}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #1e293b; }
            .header-box { text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 20px; }
            .brand { font-size: 24px; font-weight: 800; text-transform: uppercase; margin: 0; }
            .caption { font-size: 13px; color: #64748b; margin-top: 4px; }
            .meta-section { display: flex; justify-content: space-between; margin-top: 24px; font-size: 13px; }
            .meta-left { line-height: 1.6; }
            .meta-right { text-align: right; line-height: 1.6; }
            table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            th { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 10px; font-size: 11px; text-transform: uppercase; font-weight: 800; text-align: left; }
            td { border: 1px solid #e2e8f0; padding: 12px 10px; font-size: 12px; }
            .tot-row { font-weight: 850; background: #f8fafc; }
            .badge-p { padding: 4px 8px; background: #ecfdf5; color: #047857; font-weight: bold; border-radius: 6px; }
            .badge-g { padding: 4px 8px; background: #fef2f2; color: #b91c1c; font-weight: bold; border-radius: 6px; }
          </style>
        </head>
        <body>
          <div class="header-box">
            <h1 class="brand">সমীূরা ট্রেডার্স (Samira Traders)</h1>
            <div class="caption">ডিস্ট্রিবিউশন অ্যান্ড ডিলারশিপ ডেমো হিসাব স্টেটমেন্ট</div>
          </div>
          
          <div class="meta-section">
            <div class="meta-left">
              <strong>পার্টি প্রোফাইল:</strong><br />
              নাম: ${selectedPartyObj.name}<br />
              মোবাইল: ${selectedPartyObj.phone}<br />
              ঠিকানা: ${selectedPartyObj.address || "N/A"}<br />
              ধরণ: ${selectedPartyObj.type === "customer" ? "কাস্টমার (রটেল/রুট)" : selectedPartyObj.type === "supplier" ? "সাপ্লায়ার" : "স্টাফ/এসআর"}
            </div>
            <div class="meta-right">
              <strong>তারিখ:</strong> ${new Date().toLocaleDateString("bn-BD")}<br />
              <strong>খতিয়ান স্থিতি:</strong> <span class="${selectedPartyObj.computedBalance >= 0 ? 'badge-p' : 'badge-g'}">${selectedPartyObj.computedBalance >= 0 ? 'পাবেন (To Receive)' : 'দিতে হবে (To Give)'}</span><br />
              <strong>সর্বমোট বকেয়া:</strong> <strong>${showTk(selectedPartyObj.computedBalance)}</strong>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>তারিখ (Date)</th>
                <th>রেফারেন্স (Ref)</th>
                <th>বিবরণ (Description)</th>
                <th style="text-align: right;">পরিমাণ (Amount)</th>
                <th style="text-align: right;">চলতি বকেয়া (Balance)</th>
              </tr>
            </thead>
            <tbody>
              ${selectedPartyLedgerLogs.map(l => `
                <tr>
                  <td>${l.date}</td>
                  <td style="font-family: monospace;">${l.ref}</td>
                  <td>${l.description}</td>
                  <td style="text-align: right; font-weight: bold; color: ${l.type === 'Debit' ? '#ef4444' : '#10b981'};">
                    ${l.type === 'Debit' ? '-' : '+'}${showTk(l.amount)}
                  </td>
                  <td style="text-align: right; font-weight: bold;">
                    ${showTk(l.runningBalance)}
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          
          <div style="margin-top: 50px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 20px;">
            রিপোর্টটি সমীরা ট্রেডার্স ডিজিটাল খতিয়ান খাতা দ্বারা অটো-জেনারেট করা হয়েছে।
          </div>
        </body>
      </html>
    `;
    const win = window.open("", "_blank");
    win?.document.write(printContent);
    win?.document.close();
  };

  return (
    <div className="space-y-6">
      
      {/* ──────────────────────────────────────────────────────── */}
      {/* 1. SCENARIO A: NO SELECTED PARTY (PARTIES LIST INDEX)     */}
      {/* ──────────────────────────────────────────────────────── */}
      {!selectedParty ? (
        <div className="space-y-5">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-white rounded-3xl border border-gray-150 gap-4">
            <div>
              <h2 className="text-3xl font-black text-gray-950 tracking-tight flex items-center gap-2">
                <Users className="w-8 h-8 text-emerald-600 bg-emerald-50 p-1.5 rounded-2xl" />
                পার্টি খাতা ও লেনদেন
              </h2>
              <p className="text-gray-500 font-medium text-sm mt-1">
                আপনার ব্যবসায়ের কাস্টমার, সাপ্লায়ার এবং কর্মচারীদের আউটস্ট্যান্ডিং ক্রেডিট সমন্বয়ের খতা খতিয়ান।
              </p>
            </div>
            
            {/* Quick Summary Box */}
            <div className="flex gap-4 bg-slate-50 border p-4 rounded-2xl w-full sm:w-auto">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">মোট প্রাপ্য (To Receive)</p>
                <p className="text-md font-extrabold text-emerald-600 mt-0.5">
                  {showTk(enrichedParties.reduce((sum, p) => sum + (p.type === "customer" && p.computedBalance > 0 ? p.computedBalance : 0), 0))}
                </p>
              </div>
              <div className="border-l border-gray-200" />
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">মোট প্রদেয় (To Give)</p>
                <p className="text-md font-extrabold text-red-650 mt-0.5">
                  {showTk(enrichedParties.reduce((sum, p) => sum + (p.type === "supplier" && p.computedBalance > 0 ? p.computedBalance : 0), 0))}
                </p>
              </div>
            </div>
          </div>

          {/* Enterprise-grade Tab Selector - Perfect alignment with dashboard standards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                id: "all",
                label: "সব পার্টি খাতা (All Ledgers)",
                count: enrichedParties.length,
                color: "emerald",
                icon: Users,
                desc: "ব্যবসায়ের সামগ্রিক হিসাবের সারসংক্ষেপ",
                totalLabel: "নেট বকেয়া (Net Owed)",
                totalValue: enrichedParties.reduce((sum, p) => {
                  const isReceive = (p.type === "customer" && p.computedBalance > 0) || (p.type === "staff" && p.computedBalance > 0) || (p.type === "supplier" && p.computedBalance < 0);
                  return sum + (isReceive ? p.computedBalance : -Math.abs(p.computedBalance));
                }, 0)
              },
              {
                id: "customer",
                label: "কাস্টমার লেজার (Customer)",
                count: customers.length,
                color: "indigo",
                icon: User,
                desc: "গ্রাহকদের প্রাপ্য ও কালেকশন হিসাব",
                totalLabel: "মোট প্রাপ্য বকেয়া",
                totalValue: enrichedParties.reduce((sum, p) => sum + (p.type === "customer" && p.computedBalance > 0 ? p.computedBalance : 0), 0)
              },
              {
                id: "supplier",
                label: "সাপ্লায়ার লেজার (Supplier)",
                count: suppliers.length,
                color: "amber",
                icon: ShoppingCart,
                desc: "সরবরাহকারীদের প্রদেয় ও ক্রয় হিসাব",
                totalLabel: "মোট প্রদেয় বকেয়া",
                totalValue: enrichedParties.reduce((sum, p) => sum + (p.type === "supplier" && p.computedBalance > 0 ? p.computedBalance : 0), 0)
              },
              {
                id: "staff",
                label: "কর্মচারী ও SR লেজার (Staff)",
                count: staff.length,
                color: "purple",
                icon: Wallet,
                desc: "স্টাফ ও এসআরদের ক্যাশ ও সমন্বয় হিসাব",
                totalLabel: "মোট স্টাফ ব্যালেন্স",
                totalValue: enrichedParties.reduce((sum, p) => sum + (p.type === "staff" && p.computedBalance > 0 ? p.computedBalance : 0), 0)
              }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = partyTypeTab === tab.id;
              
              const colors = {
                emerald: {
                  activeBg: "bg-emerald-600",
                  activeText: "text-white",
                  border: "border-emerald-100",
                  bgLight: "bg-emerald-50 text-emerald-700",
                  ring: "ring-2 ring-emerald-500 ring-offset-2",
                  iconColor: "text-emerald-600",
                },
                indigo: {
                  activeBg: "bg-indigo-600",
                  activeText: "text-white",
                  border: "border-indigo-100",
                  bgLight: "bg-indigo-50 text-indigo-700",
                  ring: "ring-2 ring-indigo-500 ring-offset-2",
                  iconColor: "text-indigo-600",
                },
                amber: {
                  activeBg: "bg-amber-600",
                  activeText: "text-white",
                  border: "border-amber-100",
                  bgLight: "bg-amber-50 text-amber-700",
                  ring: "ring-2 ring-amber-500 ring-offset-2",
                  iconColor: "text-amber-600",
                },
                purple: {
                  activeBg: "bg-purple-600",
                  activeText: "text-white",
                  border: "border-purple-100",
                  bgLight: "bg-purple-50 text-purple-700",
                  ring: "ring-2 ring-purple-500 ring-offset-2",
                  iconColor: "text-purple-600",
                }
              }[tab.color as "emerald" | "indigo" | "amber" | "purple"];

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setPartyTypeTab(tab.id as any);
                    setRelationshipFilter("all");
                  }}
                  className={`flex flex-col text-left p-5 rounded-3xl border transition-all duration-300 cursor-pointer outline-none relative overflow-hidden group shadow-xs ${
                    isActive 
                      ? `${colors.activeBg} ${colors.activeText} border-transparent ${colors.ring} shadow-md scale-[1.02]` 
                      : `bg-white hover:bg-slate-50 border-gray-150`
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    <div className={`p-2.5 rounded-2xl ${isActive ? 'bg-white/20 text-white' : `${colors.bgLight}`} transition-colors`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {tab.count} টি রেকর্ড
                    </span>
                  </div>

                  <div className="mt-4">
                    <h3 className="font-extrabold text-sm tracking-tight">{tab.label}</h3>
                    <p className={`text-[11px] mt-0.5 font-medium ${isActive ? 'text-white/80' : 'text-gray-400'}`}>
                      {tab.desc}
                    </p>
                  </div>

                  <div className={`mt-4 pt-3 border-t w-full flex justify-between items-center ${isActive ? 'border-white/20' : 'border-gray-100'}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-white/70' : 'text-gray-400'}`}>
                      {tab.totalLabel}
                    </span>
                    <span className="font-black text-xs tracking-tight">
                      {showTk(tab.totalValue)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          
          {/* Tab Filters and Search Bar Container */}
          <div className="bg-white p-5 rounded-3xl border border-gray-150 space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search Field with Dynamic Autocomplete Dropdown List */}
              <div className="relative flex-1 z-30">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={partySearch}
                  onChange={e => setPartySearch(e.target.value)}
                  placeholder="পার্টির নাম, মোবাইল বা ঠিকানা দিয়ে খুঁজুন..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-250 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none font-medium"
                />

                {/* Suggestions Dropdown (Directly below search input, in sequence) */}
                {partySearch.trim() !== "" && matchingSearchParties.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-72 overflow-y-auto divide-y divide-gray-100 z-50">
                    {matchingSearchParties.map((p, idx) => {
                      const txs = getRecentTransactions(p.id, p.type, 2);
                      return (
                        <button
                          key={p.id + "_suggest_" + p.type}
                          type="button"
                          onClick={() => {
                            setSelectedParty({ id: p.id, type: p.type });
                            setPartySearch("");
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex flex-col gap-2 cursor-pointer font-sans"
                        >
                          <div className="flex justify-between items-center w-full">
                            <div className="flex items-center gap-2">
                              {/* Sequence number */}
                              <span className="text-slate-400 font-mono text-[10px] w-4 text-right mr-1">
                                {idx + 1}.
                              </span>
                              {/* Customer Group Name IN FRONT OF customer name as requested */}
                              {p.type === "customer" && p.groupId && (() => {
                                const colors = getGroupColors(p.groupId);
                                return (
                                  <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded border transition-all ${colors.bg} ${colors.text} ${colors.border}`}>
                                    {p.groupId}
                                  </span>
                                );
                              })()}
                              {p.type === "customer" && !p.groupId && (
                                <span className="inline-block bg-slate-55 text-slate-440 text-[10px] font-bold px-1.5 py-0.5 rounded border">
                                  সাধারণ
                                </span>
                              )}
                              <span className="text-sm font-black text-slate-900">
                                {p.name}
                              </span>
                              {p.type === "customer" && p.raw.shopName && (
                                <span className="text-xs text-slate-400 font-medium ml-1">
                                  ({p.raw.shopName})
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] bg-slate-50 text-slate-500 border rounded px-1.5 py-0.5 font-bold">
                                {p.type === "customer" ? "কাস্টমার" : p.type === "supplier" ? "সাপ্লায়ার" : "স্টাফ"}
                              </span>
                              {p.phone && p.phone !== "No Phone" && (
                                <span className="text-xs text-gray-400 font-mono">
                                  {p.phone}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Recent Transactions Section under searched name */}
                          <div className="pl-6 pt-1.5 border-t border-dashed border-gray-100 flex flex-col gap-1 w-full text-left">
                            <p className="text-[9px] font-black text-slate-450 flex items-center gap-1 uppercase tracking-wider">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                              <span>সাম্প্রতিক লেনদেন:</span>
                            </p>
                            {txs.length === 0 ? (
                              <p className="text-[10px] text-gray-400 font-bold italic leading-tight">কোনো সাম্প্রতিক লেনদেন নেই</p>
                            ) : (
                              <div className="space-y-1">
                                {txs.map(tx => (
                                  <div key={tx.id} className="flex justify-between items-center text-[10px] leading-tight">
                                    <span className="truncate max-w-[280px] font-medium text-slate-550">
                                      {tx.date} • {tx.description}
                                    </span>
                                    <span className={`font-mono font-black shrink-0 ${tx.type === "Debit" ? "text-red-550 text-red-500" : "text-emerald-600"}`}>
                                      {tx.type === "Debit" ? "-" : "+"}{tx.amount}৳
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Relationship Filters (Matches Image 1 style: To Give, To Receive, Settled) */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-2">আর্থিক ফিল্টার:</span>
              <button
                onClick={() => setRelationshipFilter("all")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                  relationshipFilter === "all" 
                    ? "bg-slate-900 border-slate-900 text-white" 
                    : "bg-slate-50 text-gray-500 border-gray-200 hover:bg-slate-100"
                }`}
              >
                সবাই ({enrichedParties.length})
              </button>
              <button
                onClick={() => setRelationshipFilter("receive")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                  relationshipFilter === "receive" 
                    ? "bg-emerald-600 border-emerald-600 text-white" 
                    : "bg-emerald-50/50 text-emerald-700 border-emerald-100 hover:bg-emerald-100/50"
                }`}
              >
                টাকা পাবেন (To Receive)
              </button>
              <button
                onClick={() => setRelationshipFilter("give")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                  relationshipFilter === "give" 
                    ? "bg-red-600 border-red-650 text-white" 
                    : "bg-red-50/50 text-red-750 border-red-100 hover:bg-red-100/50"
                }`}
              >
                দিতে হবে (To Give)
              </button>
              <button
                onClick={() => setRelationshipFilter("settled")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                  relationshipFilter === "settled" 
                    ? "bg-[#64748b] border-[#64748b] text-white" 
                    : "bg-slate-50 text-slate-505 border-slate-200 hover:bg-slate-100"
                }`}
              >
                পরিশোধিত (Settled)
              </button>
            </div>
          </div>

          {/* Party Cards List Section - Perfect imitation of Image 1 style */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredParties.map(p => {
              // Create initial avatar symbol
              const initials = (p.name || "").trim().slice(0, 2).toUpperCase();
              const isReceiveType = (p.type === "customer" && p.computedBalance > 0) || (p.type === "staff" && p.computedBalance > 0) || (p.type === "supplier" && p.computedBalance < 0);
              const isGiveType = (p.type === "supplier" && p.computedBalance > 0) || (p.type === "customer" && p.computedBalance < 0);
              const isSettled = p.computedBalance === 0;

              return (
                <div
                  key={p.id + "_" + p.type}
                  onClick={() => setSelectedParty({ id: p.id, type: p.type })}
                  className="bg-white p-5 rounded-3xl border border-gray-150 shadow-xs hover:shadow-md transition-all duration-250 hover:border-emerald-200 cursor-pointer flex flex-col justify-between items-stretch relative overflow-hidden group gap-3.5"
                >
                  <div className="flex justify-between items-center w-full">
                    <div className="flex items-center gap-3.5">
                      {/* Rounded Intials Avatar */}
                      <div className={`w-12 h-12 rounded-full font-black text-sm flex items-center justify-center border shrink-0 transition-colors ${
                        p.type === "customer" 
                          ? "bg-indigo-50/30 text-indigo-700 border-indigo-100" 
                          : p.type === "supplier" 
                          ? "bg-amber-50/30 text-amber-700 border-amber-100" 
                          : "bg-purple-50/30 text-purple-700 border-purple-100"
                      }`}>
                        {initials}
                      </div>

                      {/* Subtitles & details */}
                      <div className="space-y-1">
                        <h4 className="font-bold text-gray-950 text-sm group-hover:text-emerald-700 transition-colors flex flex-wrap items-center gap-1.5 align-middle">
                          <span>{p.name}</span>
                          {p.type === "customer" && (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 hover:text-blue-800 rounded-md text-[9px] font-black border border-blue-200">
                              কাস্টমার
                            </span>
                          )}
                          {p.type === "customer" && p.groupId && (() => {
                            const colors = getGroupColors(p.groupId);
                            return (
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-black border uppercase tracking-wider transition-all ${colors.bg} ${colors.text} ${colors.border}`}>
                                {p.groupId}
                              </span>
                            );
                          })()}
                        </h4>
                        <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1.5 uppercase">
                          <span className="px-1.5 py-0.2 bg-slate-100 rounded text-slate-600 border text-[9px] font-black">
                            {p.type === "customer" ? "কাস্টমার" : p.type === "supplier" ? "সাপ্লায়ার" : "এসআর / স্টাফ"}
                          </span>
                          {p.phone || "No Phone"}
                        </p>
                      </div>
                    </div>

                    {/* Financial Status representation matching the right side of Image 1 */}
                    <div className="text-right shrink-0">
                      <p className={`font-black text-sm tracking-tight ${
                        isReceiveType ? "text-emerald-600" : isGiveType ? "text-red-550" : "text-gray-450"
                      }`}>
                        {showTk(p.computedBalance)}
                      </p>
                      <p className={`text-[9px] font-extrabold mt-0.5 tracking-wider uppercase ${
                        isReceiveType ? "text-emerald-600" : isGiveType ? "text-red-500" : "text-gray-400"
                      }`}>
                        {isReceiveType ? "পাবে / Receive" : isGiveType ? "প্রদেয় / Give" : "পরিশোধিত / Settled"}
                      </p>
                    </div>
                  </div>

                  {/* Recent Transactions Section under searched name */}
                  <div className="pt-2.5 border-t border-slate-100/80">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>সাম্প্রতিক লেনদেন</span>
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600 hover:underline">
                        খোলো &rarr;
                      </span>
                    </div>

                    {(() => {
                      const latestTx = getRecentTransactions(p.id, p.type, 2);
                      if (latestTx.length === 0) {
                        return <p className="text-[10px] text-gray-400 font-bold italic py-1 pl-1">কোনো সাম্প্রতিক লেনদেন নেই</p>;
                      }
                      return (
                        <div className="space-y-1">
                          {latestTx.map(tx => (
                            <div key={tx.id} className="flex justify-between items-center text-[10px] leading-relaxed bg-slate-50/50 px-2.5 py-1 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                              <span className="text-gray-500 font-medium truncate max-w-[170px]" title={tx.description}>
                                {tx.date} • {tx.description}
                              </span>
                              <span className={`font-mono font-black shrink-0 ${tx.type === "Debit" ? "text-red-500" : "text-emerald-600"}`}>
                                {tx.type === "Debit" ? "-" : "+"}{tx.amount}৳
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}

            {filteredParties.length === 0 && (
              <div className="col-span-full py-24 text-center bg-white rounded-3xl border border-gray-150">
                <User className="w-12 h-12 text-slate-100 mx-auto mb-2" />
                <p className="text-sm font-bold text-[#1e1b4b]">কোনো ম্যাচিং পার্টি মিলছে না!</p>
                <p className="text-xs text-gray-450 mt-1">সব ফিল্টার রিসেট করতে অথবা অন্য কিছু সার্চ করতে অনুসন্ধান করুন।</p>
              </div>
            )}
          </div>

          {/* Floating Bottom Action Button Styled from Image 1 ("+ New Party") */}
          <div className="flex justify-center pt-8">
            <button
              onClick={() => setShowAddPartyModal(true)}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-black text-sm flex items-center gap-2 shadow-lg hover:shadow-emerald-250 transition-all cursor-pointer scale-100 hover:scale-105 active:scale-95"
            >
              <Plus className="w-5 h-5" /> নতুন পার্টি যোগ করুন (New Party)
            </button>
          </div>
        </div>
      ) : (
        /* ──────────────────────────────────────────────────────── */
        /* 2. SCENARIO B: PARTY DETAIL LEDGER TIMELINE (IMAGE 2)      */
        /* ──────────────────────────────────────────────────────── */
        <div className="space-y-5">
          {/* Main Top Header matching Image 2 details */}
          <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden pb-4">
            {/* Header Navbar */}
            <div className="p-4 border-b flex justify-between items-center bg-white">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setSelectedParty(null); setHistorySearch(""); }}
                  className="p-1.5 hover:bg-slate-100 rounded-xl transition-all cursor-pointer text-gray-500"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                
                {/* Visual Circle Initial avatar */}
                <div className={`w-10 h-10 rounded-full font-black text-xs flex items-center justify-center border ${
                  selectedPartyObj?.type === "customer" 
                    ? "bg-indigo-50 text-indigo-700 border-indigo-100" 
                    : "bg-[#fffbeb] text-[#b45309] border-[#fde68a]"
                }`}>
                  {(selectedPartyObj?.name || "P").slice(0, 1).toUpperCase()}
                </div>

                <div>
                  <h3 className="font-extrabold text-[#111827] text-md line-clamp-1">{selectedPartyObj?.name}</h3>
                  <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1.5 uppercase mt-0.5 cursor-help" title={`ঠিকানা: ${selectedPartyObj?.address}`}>
                    <span>{selectedPartyObj?.type === "customer" ? "কাস্টমার" : "সাপ্লায়ার"}</span> • <span>{selectedPartyObj?.phone}</span>
                  </p>
                </div>
              </div>

              {/* PDF and share menu triggers */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrintStatement}
                  label="Statement PDF"
                  className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 text-slate-700 transition-all flex items-center gap-1 text-xs font-bold cursor-pointer"
                >
                  <Download className="w-4 h-4 text-emerald-600" /> স্টেটমেন্ট PDF
                </button>
                <button
                  onClick={() => selectedPartyObj && handleOpenWhatsApp(selectedPartyObj)}
                  className="p-2 text-white bg-green-500 hover:bg-green-600 rounded-xl transition-all font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Share2 className="w-4 h-4" /> শেয়ার
                </button>
              </div>
            </div>

            {/* Overall Outstanding Relation Balance Display block - High typography style */}
            <div className="p-6 text-center bg-slate-50/50 flex flex-col items-center justify-center border-b border-gray-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {selectedPartyObj && selectedPartyObj.computedBalance >= 0 
                  ? "মোট প্রাপ্য বকেয়া পরিমাণ (To Receive)" 
                  : "মোট প্রদেয় বকেয়া পরিমাণ (To Give)"}
              </span>
              <h2 className={`text-4xl font-black mt-2 tracking-tight ${
                selectedPartyObj && selectedPartyObj.computedBalance >= 0 ? "text-emerald-600" : "text-red-650"
              }`}>
                {selectedPartyObj ? showTk(selectedPartyObj.computedBalance) : "—"}
              </h2>
              
              <div className="flex flex-wrap items-center justify-center gap-2 mt-3.5">
                <button 
                  onClick={handlePrintStatement}
                  className="flex items-center gap-1.5 px-3 py-1 bg-white border rounded-full text-xs font-bold text-slate-600 shadow-xs hover:bg-slate-50 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-450" /> হিসাব খতিয়ান রিপোর্ট
                </button>

                {selectedPartyObj?.type === "customer" && selectedPartyObj.computedBalance > 0 && (
                  <button 
                    onClick={() => setShowQuickPayConfirm(true)}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 border border-emerald-700 hover:bg-emerald-700 text-white rounded-full text-xs font-black shadow-md transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-250" /> কুইক পে (Quick Pay)
                  </button>
                )}
              </div>
            </div>

            {/* Supplier-wise Dues Breakdown Panel (Requested: Customer ledgers per supplier) */}
            {selectedPartyObj?.type === "customer" && customerSupplierDues.length > 0 && (
              <div className="px-6 py-4 bg-amber-50/40 border-b border-gray-100">
                <p className="text-[10px] font-black text-amber-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  🏢 সাপ্লায়ার ভিত্তিক বকেয়া খতিয়ান (Dues per Supplier)
                </p>
                <div className="space-y-2">
                  {customerSupplierDues.map((item) => (
                    <div key={item.id} className="flex justify-between items-center bg-white px-3 py-2 rounded-xl border border-amber-100 shadow-2xs">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-900">{item.name}</span>
                        {item.company && item.company !== item.name && (
                          <span className="text-[10px] text-gray-400 font-medium">{item.company}</span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-red-650 bg-red-50 px-2.5 py-1 rounded-lg">
                        {showTk(item.due)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center border-t border-dashed border-amber-200/65 pt-2 text-[11px] font-bold text-slate-500">
                    <span>সর্বমোট বকেয়া (Total Due):</span>
                    <span>{showTk(selectedPartyObj.computedBalance)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Action Interactive Buttons (Imitation of Image 2 UI row) */}
            <div className="grid grid-cols-4 gap-2 px-6 py-4 border-b border-gray-100 bg-white text-center">
              <button
                onClick={() => selectedPartyObj && handlePhoneCall(selectedPartyObj.phone)}
                className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-slate-50 transition-all cursor-pointer text-slate-700 group"
              >
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-full group-hover:scale-105 transition-transform">
                  <Phone className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold mt-1 text-slate-500">Call (মোবাইল)</span>
              </button>

              <button
                onClick={() => selectedPartyObj && handleCopySMS(selectedPartyObj)}
                className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-slate-50 transition-all cursor-pointer text-slate-700 group"
              >
                <div className="p-2 bg-blue-50 text-blue-600 rounded-full group-hover:scale-105 transition-transform">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold mt-1 text-slate-500">SMS রিমাইন্ডার</span>
              </button>

              <button
                onClick={() => {
                  toast.success("অটো রিমাইন্ডার সিস্টেম সচল রয়েছে।");
                }}
                className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-slate-50 transition-all cursor-pointer text-slate-700 group"
              >
                <div className="p-2 bg-amber-50 text-amber-600 rounded-full group-hover:scale-105 transition-transform">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold mt-1 text-slate-500">তদারকি এলার্ট</span>
              </button>

              <button
                onClick={() => selectedPartyObj && handleOpenWhatsApp(selectedPartyObj)}
                className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-slate-50 transition-all cursor-pointer text-slate-700 group"
              >
                <div className="p-2 bg-green-50 text-green-600 rounded-full group-hover:scale-105 transition-transform">
                  <Share2 className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold mt-1 text-slate-500">শেয়ার খতিয়ান</span>
              </button>
            </div>

            {/* Inner ledger history search filter */}
            <div className="px-6 pt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  placeholder="খাতা থেকে খুঁজুন (যেমন: Payment, POS)..."
                  className="w-full pl-9 pr-4 py-2 text-xs border border-gray-250 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none font-medium text-slate-700"
                />
              </div>
            </div>
          </div>

          {/* Chronological Ledger Logs list - Styled exactly matching Image 2 */}
          <div className="bg-white rounded-3xl border border-gray-150 p-6 shadow-xs space-y-4">
            <h4 className="text-xs font-black text-[#1e1b4b] uppercase tracking-wider border-b border-gray-100 pb-2">লেনদেন সময়রেখা (Ledger Logs)</h4>
            
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {selectedPartyLedgerLogs.map((log, idx) => {
                const isDebitVal = log.type === "Debit";
                return (
                  <div
                    key={log.id + "_" + idx}
                    className="flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100/50 rounded-2xl border border-slate-100 transition-all"
                  >
                    <div className="space-y-1">
                      <p className="font-bold text-[#1e1b4b] text-xs flex items-center gap-2">
                        <span>{log.ref}</span>
                        <span className="text-[9px] font-normal text-slate-400 font-mono">({log.date})</span>
                      </p>
                      <p className="text-[10px] text-gray-400 font-bold select-none">{log.description}</p>
                      
                      {/* Accumulator running outstanding tag - Matches the Balance Pill in Image 2 */}
                      <span className="inline-block mt-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-black text-[9px] tracking-tight">
                        Bal: {showTk(log.runningBalance)}
                      </span>
                    </div>

                    {/* Transaction Amount - green/red colored */}
                    <div className="text-right">
                      <span className={`font-black text-[13px] tracking-tight ${isDebitVal ? 'text-red-600' : 'text-emerald-600'}`}>
                        {isDebitVal ? '-' : '+'}{showTk(log.amount)}
                      </span>
                    </div>
                  </div>
                );
              })}

              {selectedPartyLedgerLogs.length === 0 && (
                <div className="py-16 text-center text-gray-300">
                  <Info className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-bold">এই হিসাবের খাতায় কোনো ট্রানজেকশন বা পেমেন্ট হিস্ট্রি নেই।</p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Floating Sticky Control Board - Replication of Image 2 buttons with custom Sales added */}
          <div className="bg-white rounded-3xl p-5 border border-gray-150 shadow-lg grid grid-cols-3 gap-3.5 no-print sticky bottom-4 z-40">
            {/* GREEN BUTTON: PAYMENT IN */}
            <button
              onClick={() => setShowPaymentInModal(true)}
              className="py-3 px-4 bg-emerald-600 hover:bg-emerald-750 text-white rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-1.5 shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
            >
              <ArrowDownLeft className="w-4 h-4 shrink-0" /> টাকা জমা (Payment In)
            </button>

            {/* RED BUTTON: PAYMENT OUT */}
            <button
              onClick={() => setShowPaymentOutModal(true)}
              className="py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-1.5 shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4 shrink-0" /> টাকা খরচ (Payment Out)
            </button>

            {/* INTERACTIVE BLUE/INDIGO DIRECT SALE BUTTON */}
            <button
              onClick={() => {
                if (selectedPartyObj?.type === "customer") {
                  setShowDirectSaleModal(true);
                } else {
                  toast.error("সরাসরি বিক্রয় করার জন্য কাস্টমার পার্টি নির্বাচিত থাকতে হবে!");
                }
              }}
              disabled={selectedPartyObj?.type !== "customer"}
              className="py-3 px-4 bg-indigo-600 hover:bg-indigo-750 text-white rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-1.5 shadow-md hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4 shrink-0" /> সরাসরি বিক্রয় (POS Sale)
            </button>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* 3. POPUP MODAL: ADD NEW PARTY                             */}
      {/* ──────────────────────────────────────────────────────── */}
      {showAddPartyModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div className="bg-white rounded-3xl border shadow-2xl w-full max-w-md overflow-hidden relative">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-extrabold text-[#111827] text-md">নতুন হিসাব খাতা খুলুন (Add Party)</h3>
              <button 
                onClick={() => setShowAddPartyModal(false)}
                className="p-1.5 hover:bg-slate-200 rounded-xl transition-all cursor-pointer text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewParty} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">পার্টির ধরণ বা ক্যাটাগরি</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewPartyType("customer")}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border cursor-pointer transition-all ${
                      newPartyType === "customer" 
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200" 
                        : "bg-white text-gray-500 border-gray-200"
                    }`}
                  >
                    কাস্টমার (রটেল/রুট)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPartyType("supplier")}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border cursor-pointer transition-all ${
                      newPartyType === "supplier" 
                        ? "bg-amber-50 text-amber-750 border-amber-200" 
                        : "bg-white text-gray-500 border-gray-200"
                    }`}
                  >
                    সাপ্লায়ার (Supplier)
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 block uppercase">পার্টির নাম (Name) *</label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: দিলার আলমগীর ভাই..."
                  value={newPartyName}
                  onChange={e => setNewPartyName(e.target.value)}
                  className="w-full text-xs p-3 border border-gray-250 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 block uppercase">মোবাইল ফোন (Phone Number)</label>
                <input
                  type="tel"
                  placeholder="যেমন: ০১৯২৬৬০৭৬২৮..."
                  value={newPartyPhone}
                  onChange={e => setNewPartyPhone(e.target.value)}
                  className="w-full text-xs p-3 border border-gray-250 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 block uppercase">ঠিকানা (Address)</label>
                <input
                  type="text"
                  placeholder="যেমন: ঢাকা রোড, নরসিংদী..."
                  value={newPartyAddress}
                  onChange={e => setNewPartyAddress(e.target.value)}
                  className="w-full text-xs p-3 border border-gray-250 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 block uppercase">প্রারম্ভিক বকেয়া ব্যালেন্স (Opening Balance)</label>
                <input
                  type="number"
                  placeholder="প্রারম্ভিক টাকা (ঐচ্ছিক)..."
                  value={newPartyOpeningBal}
                  onChange={e => setNewPartyOpeningBal(e.target.value)}
                  className="w-full text-xs p-3 border border-gray-250 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-800"
                />
                <p className="text-[9px] text-gray-400 font-bold select-none">নতুন একাউন্টে আগে থেকে বকেয়া থাকলে তা ইনপুট করুন।</p>
              </div>

              <div className="pt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddPartyModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer transition-all"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1 cursor-pointer transition-all"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  পার্টি সেভ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* 4. POPUP MODAL: PAYMENT IN (RECEIVE CASH / টাকা জমা)    */}
      {/* ──────────────────────────────────────────────────────── */}
      {showPaymentInModal && selectedPartyObj && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div className="bg-white rounded-3xl border shadow-2xl w-full max-w-md overflow-hidden relative">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-extrabold text-[#111827] text-md">টাকা গ্রহন জমা করুন (Payment In)</h3>
                <p className="text-[9px] text-[#6b7280] font-bold uppercase mt-0.5">সংশ্লিষ্ট পার্টি: {selectedPartyObj.name}</p>
              </div>
              <button 
                onClick={() => setShowPaymentInModal(false)}
                className="p-1.5 hover:bg-slate-200 rounded-xl transition-all cursor-pointer text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePaymentIn} className="p-6 space-y-4">
              <div className="bg-emerald-50 rounded-2xl p-4 text-emerald-800 text-xs font-bold flex flex-col gap-1">
                <p>📌 কাস্টমারের থেকে সংগৃহীত পেমেন্ট জমা করুন।</p>
                <p>📌 এটি এই কাস্টমারের মোট বকেয়া ডেবিট কমিয়ে দিবে।</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 block uppercase">তারিখ (Date)</label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={e => setPayDate(e.target.value)}
                  className="w-full text-xs p-3 border border-gray-250 rounded-xl focus:ring-1 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 block uppercase">টাকার পরিমাণ (Paid Amount - BDT) *</label>
                <input
                  type="number"
                  required
                  placeholder="টাকার পরিমাণ দিন..."
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  className="w-full text-xs p-3 border border-gray-250 rounded-xl focus:ring-1 focus:ring-indigo-500 outline-none font-bold text-emerald-700 text-md"
                />
              </div>

              {selectedPartyObj.type === "customer" && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 block uppercase">সাপ্লায়ার নির্বাচন (Supplier Selection) *</label>
                  <select
                    value={paySupplierId}
                    onChange={e => setPaySupplierId(e.target.value)}
                    className="w-full text-xs p-3 border border-gray-250 rounded-xl bg-white text-slate-700 font-bold"
                  >
                    <option value="all">সাধারণ / সমস্ত সাপ্লায়ার (All Suppliers)</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.company || s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 block uppercase">পেমেন্ট মাধ্যম</label>
                  <select
                    value={payMethod}
                    onChange={e => setPayMethod(e.target.value)}
                    className="w-full text-xs p-3 border border-gray-250 rounded-xl bg-white text-slate-700 font-bold"
                  >
                    <option value="Cash">নগদ (Cash Box)</option>
                    <option value="Bkash">বিকাশ (bKash)</option>
                    <option value="Rocket">রকেট (Rocket)</option>
                    <option value="Bank">ব্যাংক অ্যাকাউন্ট</option>
                    <option value="DBBL">ডাচ বাংলা ব্যাংক</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 block uppercase">জমা হওয়ার ব্যাংক খাতা</label>
                  <select
                    value={payAccountId}
                    onChange={e => setPayAccountId(e.target.value)}
                    className="w-full text-xs p-3 border border-gray-250 rounded-xl bg-white text-slate-700 font-bold"
                  >
                    <option value="">ডিফল্ট ক্যাশ ব্যাংক (Default)</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 block uppercase">লেনদেন বিবরণ (Note/Description)</label>
                <input
                  type="text"
                  placeholder="যেমন: নগদ পরিশোধ বা বিল বাবদ..."
                  value={payNote}
                  onChange={e => setPayNote(e.target.value)}
                  className="w-full text-xs p-3 border border-gray-250 rounded-xl focus:ring-1 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="pt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentInModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  টাকা জমা করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* 5. POPUP MODAL: PAYMENT OUT (PAY CASH / টাকা খরচ)      */}
      {/* ──────────────────────────────────────────────────────── */}
      {showPaymentOutModal && selectedPartyObj && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div className="bg-white rounded-3xl border shadow-2xl w-full max-w-md overflow-hidden relative">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-extrabold text-[#111827] text-md">টাকা প্রদান খরচ করুন (Payment Out)</h3>
                <p className="text-[9px] text-[#6b7280] font-bold uppercase mt-0.5">সংশ্লিষ্ট পার্টি: {selectedPartyObj.name}</p>
              </div>
              <button 
                onClick={() => setShowPaymentOutModal(false)}
                className="p-1.5 hover:bg-slate-200 rounded-xl transition-all cursor-pointer text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePaymentOut} className="p-6 space-y-4">
              <div className="bg-red-50 rounded-2xl p-4 text-red-800 text-xs font-bold flex flex-col gap-1">
                <p>📌 সাপ্লায়ার বা সংশ্লিষ্ট পক্ষকে বকেয়া পরিশোধ করুন।</p>
                <p>📌 এটি আপনার ক্যাশ বক্স বা ব্যাংক ব্যাক অ্যাকাউন্ট থেকে টাকা কমিয়ে দিবে।</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 block uppercase">তারিখ</label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={e => setPayDate(e.target.value)}
                  className="w-full text-xs p-3 border border-gray-250 rounded-xl focus:ring-1 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 block uppercase">টাকার পরিমাণ (BDT) *</label>
                <input
                  type="number"
                  required
                  placeholder="টাকার পরিমাণ দিন..."
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  className="w-full text-xs p-3 border border-gray-250 rounded-xl focus:ring-1 focus:ring-indigo-500 font-bold text-red-650 text-md"
                />
              </div>

              {selectedPartyObj.type === "customer" && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 block uppercase">সাপ্লায়ার নির্বাচন (Supplier Selection) *</label>
                  <select
                    value={paySupplierId}
                    onChange={e => setPaySupplierId(e.target.value)}
                    className="w-full text-xs p-3 border border-gray-250 rounded-xl bg-white text-slate-700 font-bold"
                  >
                    <option value="all">সাধারণ / সমস্ত সাপ্লায়ার (All Suppliers)</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.company || s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 block uppercase">লেনদেন মাধ্যম (Mothed)</label>
                  <select
                    value={payMethod}
                    onChange={e => setPayMethod(e.target.value)}
                    className="w-full text-xs p-3 border border-gray-250 rounded-xl bg-white text-slate-700 font-bold"
                  >
                    <option value="Cash">নগদ (Cash Box)</option>
                    <option value="Bkash">বিকাশ (bKash)</option>
                    <option value="Rocket">রকেট (Rocket)</option>
                    <option value="Bank">ব্যাংক অ্যাকাউন্ট</option>
                    <option value="DBBL">ডাচ বাংলা ব্যাংক</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 block uppercase">খরচ পরিশোধ ব্যাংক অ্যাকাউন্ট</label>
                  <select
                    value={payAccountId}
                    onChange={e => setPayAccountId(e.target.value)}
                    className="w-full text-xs p-3 border border-gray-250 rounded-xl bg-white text-slate-700 font-bold"
                  >
                    <option value="">ডিফল্ট ক্যাশ ব্যাংক (Default)</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 block uppercase">টাকা প্রদানের বিবরণ (Note/Description)</label>
                <input
                  type="text"
                  placeholder="যেমন: সাপ্লায়ার বকেয়া পরিশোধ বা ক্যাশ প্রদান..."
                  value={payNote}
                  onChange={e => setPayNote(e.target.value)}
                  className="w-full text-xs p-3 border border-gray-250 rounded-xl focus:ring-1 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="pt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentOutModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-750 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  টাকা প্রদান করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* 6. POPUP DRAWDER: DIRECT SECURE SALE IN CUSTOMER NAME     */}
      {/* ──────────────────────────────────────────────────────── */}
      {showDirectSaleModal && selectedPartyObj && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div className="bg-white rounded-3xl border shadow-2xl w-full max-w-2xl overflow-hidden relative">
            <div className="p-6 border-b flex justify-between items-center bg-indigo-50/50">
              <div>
                <h3 className="font-extrabold text-indigo-950 text-md flex items-center gap-1.5">
                  <ShoppingCart className="w-5 h-5 text-indigo-700" />
                  সরাসরি বাকিতে পণ্য বিক্রয় এন্ট্রি (Direct Invoice)
                </h3>
                <p className="text-[10px] text-indigo-600 font-bold uppercase mt-0.5">কাস্টমার নাম: {selectedPartyObj.name}</p>
              </div>
              <button 
                onClick={() => {
                  setShowDirectSaleModal(false);
                  setSaleItems([]);
                }}
                className="p-1.5 hover:bg-indigo-150 rounded-xl transition-all cursor-pointer text-indigo-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[550px] overflow-y-auto">
              
              {/* Product Selector and Cart Builders */}
              <div className="space-y-4">
                <h4 className="font-black text-[11px] text-gray-400 uppercase tracking-wider pb-1 border-b">পণ্য যোগ করুন (Add Asset)</h4>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 block uppercase">পণ্য নির্বাচন (Product Item) *</label>
                  <select
                    value={selectedSaleProduct}
                    onChange={e => {
                      setSelectedSaleProduct(e.target.value);
                      setInputCartons("");
                      setInputPieces("");
                      setInputFree("");
                    }}
                    className="w-full text-xs p-3 border border-gray-250 rounded-xl bg-white text-slate-700 font-bold"
                  >
                    <option value="">নির্বাচন করুন...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (স্টক: {p.stock || 0}টি)</option>
                    ))}
                  </select>
                </div>

                {currentSelectedProductInfo && (
                  <div className="bg-indigo-50 border p-3 rounded-2xl space-y-1">
                    <p className="text-[10px] text-indigo-950 font-bold">পণ্য স্পেসিফিকেশন:</p>
                    <div className="grid grid-cols-3 text-[9px] text-[#475569] font-extrabold mt-1">
                      <span>কার্টুন সাইজ: {currentSelectedProductInfo.cartoonSize || currentSelectedProductInfo.piecesInCarton || 1} পিস</span>
                      <span>ট্রেড রেট: {showTk(currentSelectedProductInfo.price || currentSelectedProductInfo.tradePrice || 0)}</span>
                      <span>স্টক: <b className="text-indigo-700">{currentSelectedProductInfo.stock || 0} পিস</b></span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 block uppercase">কত কার্টুন?</label>
                    <input
                      type="number"
                      placeholder="কার্টুন..."
                      value={inputCartons}
                      onChange={e => setInputCartons(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-250 rounded-xl font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 block uppercase">কত পিস?</label>
                    <input
                      type="number"
                      placeholder="পিস..."
                      value={inputPieces}
                      onChange={e => setInputPieces(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-250 rounded-xl font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 block uppercase">ফ্রি পিস (ফ্রি স্কিম)</label>
                    <input
                      type="number"
                      placeholder="ফ্রি..."
                      value={inputFree}
                      onChange={e => setInputFree(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-250 rounded-xl font-bold text-indigo-700"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddProductToSaleBasket}
                  className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-750 rounded-xl text-xs font-black border border-indigo-200 flex items-center justify-center gap-1 cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" /> পণ্যের পরিমাণ কার্টে যোগ দিন
                </button>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 block uppercase">তারিখ (Sale Date)</label>
                  <input
                    type="date"
                    required
                    value={saleDate}
                    onChange={e => setSaleDate(e.target.value)}
                    className="w-full text-xs p-2.5 border border-gray-250 rounded-xl"
                  />
                </div>
              </div>

              {/* Shopping Cart List */}
              <div className="space-y-4 flex flex-col justify-between">
                <div>
                  <h4 className="font-black text-[11px] text-gray-400 uppercase tracking-wider pb-1 border-b">নির্ধারিত পণ্য কার্ট (Selected Cart)</h4>
                  
                  <div className="space-y-2 mt-3 max-h-[220px] overflow-y-auto pr-1">
                    {saleItems.map((item, index) => (
                      <div key={item.productId} className="p-3 bg-slate-50 border rounded-2xl flex justify-between items-center text-xs">
                        <div className="space-y-1 flex-1">
                          <p className="font-bold text-slate-900">{item.name}</p>
                          <p className="text-[9px] text-[#64748b] font-bold">
                            পরিমাণ: {item.cartons > 0 ? `${item.cartons} কার্টুন ` : ""}{item.pieces > 0 ? `${item.pieces} পিস` : ""} ({item.totalPieces} পিস) 
                            {item.freeQty > 0 ? ` + ফ্রি ${item.freeQty}টি` : ""}
                          </p>
                        </div>

                        <div className="text-right flex items-center gap-3">
                          <div>
                            <p className="font-black text-slate-800">{showTk(item.totalPieces * item.rate)}</p>
                            <p className="text-[8px] text-gray-400 font-bold select-none">রেট: {showTk(item.rate)}</p>
                          </div>
                          
                          <button
                            onClick={() => setSaleItems(saleItems.filter((_, i) => i !== index))}
                            className="p-1 px-1.5 text-red-500 hover:bg-red-50 rounded-lg text-[10px] font-bold border border-red-100 cursor-pointer"
                          >
                            বাদ
                          </button>
                        </div>
                      </div>
                    ))}

                    {saleItems.length === 0 && (
                      <div className="py-12 text-center text-slate-350 text-xs font-bold">
                        কার্টে কোনো ডিস্ট্রিবিউশন প্রোডাক্ট যোগ করা হয়নি।
                      </div>
                    )}
                  </div>
                </div>

                {saleItems.length > 0 && (
                  <div className="border-t pt-4 space-y-4 mt-auto">
                    <div className="flex justify-between items-center bg-slate-50 border p-3 rounded-2xl font-black text-[#1e1b4b]">
                      <span className="text-xs">মোট ইনভয়েস ভ্যালু:</span>
                      <span className="text-lg text-indigo-700">{showTk(handleSumSaleTotal)}</span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDirectSaleModal(false);
                          setSaleItems([]);
                        }}
                        className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer transition-all"
                      >
                        বাতিল
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveDirectSale}
                        disabled={isSubmitting}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1 cursor-pointer transition-all"
                      >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        বিক্রয় নিশ্চিত করুন
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* 5. POPUP MODAL: QUICK PAY CONFIRMATION                     */}
      {/* ──────────────────────────────────────────────────────── */}
      {showQuickPayConfirm && selectedPartyObj && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div className="bg-white rounded-3xl border shadow-2xl w-full max-w-md overflow-hidden relative">
            <div className="p-6 border-b flex justify-between items-center bg-emerald-50">
              <div>
                <h3 className="font-extrabold text-emerald-900 text-md">কুইক পে পেমেন্ট রিসিভ (Quick Pay)</h3>
                <p className="text-[9px] text-emerald-700 font-bold uppercase mt-0.5">সব বকেয়া এক ক্লিকে পরিশোধ</p>
              </div>
              <button 
                onClick={() => setShowQuickPayConfirm(false)}
                className="p-1.5 hover:bg-emerald-100 text-emerald-800 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-slate-50 p-4 rounded-2xl border text-center space-y-1">
                <p className="text-[10px] text-gray-400 font-black uppercase">কাস্টমার নাম</p>
                <p className="font-black text-slate-800 text-base">{selectedPartyObj?.name}</p>
                <p className="text-xs text-gray-500">{selectedPartyObj?.phone}</p>
              </div>

              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 text-center space-y-1">
                <p className="text-[10px] text-emerald-700 font-black uppercase">সর্বমোট বকেয়া টাকার পরিমাণ</p>
                <p className="text-3xl font-black text-emerald-600">{showTk(selectedPartyObj?.computedBalance || 0)}</p>
              </div>

              <div className="space-y-3.5 text-xs font-bold text-gray-600">
                <div className="flex justify-between items-center bg-slate-50 p-2 px-3 rounded-xl">
                  <span>পেমেন্ট মেথড (Method):</span>
                  <span className="text-slate-800 font-black">Cash (ক্যাশ)</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-2 px-3 rounded-xl">
                  <span>কোথায় জমা হবে:</span>
                  <span className="text-slate-800 font-black">Cash Box (ক্যাশ বক্স)</span>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickPayConfirm(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer transition-all"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  onClick={handleQuickPay}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-750 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  নিশ্চিত করুন (Confirm)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
