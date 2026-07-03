import React, { useState, useMemo } from "react";
import { recordStockMovement } from "../lib/inventoryEngine";
import { MovementType } from "../lib/stockMovement";
import { Plus, Search, User, Phone, MapPin, Trash2, Calendar, DollarSign, CheckCircle2, AlertCircle, Sparkles, UserCheck, Edit, ShoppingCart, ArrowUpCircle, ArrowDownCircle, X, Check, Loader2, Tag, Percent, MessageSquare } from "lucide-react";
import CSVUploader from "./CSVUploader";
import DataPreviewModal from "./DataPreviewModal";
import toast from "react-hot-toast";
import { getGroupColors } from "../lib/utils";
import { useConfirm } from "../context/ConfirmContext";

interface EntitiesViewProps {
  title: string;
  subtitle: string;
  data: any[];
  add: (item: any) => Promise<any>;
  update?: (id: string, item: any) => Promise<void>;
  remove: (id: string) => Promise<void>;
  type: "customer" | "supplier" | "staff" | "route";
  payments?: any[];
  addPayment?: (payment: any) => Promise<any>;
  products?: any[];
  addSale?: (sale: any) => Promise<any>;
  updateProduct?: (id: string, prod: any) => Promise<any>;
  accounts?: any[];
  user?: any;
  setActiveView?: (view: string) => void;
  setSelectedLedgerParty?: (party: { id: string; type: "customer" | "supplier" | "staff" } | null) => void;
  sales?: any[];
  orders?: any[];
}

export default function EntitiesView({ 
  title, 
  subtitle, 
  data = [], 
  add, 
  update, 
  remove, 
  type, 
  payments = [], 
  addPayment,
  products = [],
  addSale,
  updateProduct,
  accounts = [],
  user,
  setActiveView,
  setSelectedLedgerParty,
  sales = [],
  orders = []
}: EntitiesViewProps) {
  const [showAdd, setShowAdd] = useState(false);
  const { confirmDelete } = useConfirm();
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [groupFilter, setGroupFilter] = useState("");

  const getDynamicGroups = () => {
    try {
      const saved = localStorage.getItem("customer_group_colors");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((g: any) => g.name);
        }
      }
    } catch(e) {
      console.error(e);
    }
    return ["Retailer", "Wholesaler", "VIP", "Dealer", "General"];
  };

  // Modals and transaction states
  const [showDirectSaleModal, setShowDirectSaleModal] = useState(false);
  const [showPaymentInModal, setShowPaymentInModal] = useState(false);
  const [showPaymentOutModal, setShowPaymentOutModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payment forms
  const [payAmount, setPayAmount] = useState("");
  const [payMethodOption, setPayMethodOption] = useState("Cash");
  const [payAccountId, setPayAccountId] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);

  // Sale basket states
  const [saleItems, setSaleItems] = useState<any[]>([]); // { productId, name, cartons, pieces, freeQty, discount, discountType: "flat" | "percent", rate, cartonSize, totalPieces, total }
  const [selectedSaleProduct, setSelectedSaleProduct] = useState("");
  const [inputCartons, setInputCartons] = useState("");
  const [inputPieces, setInputPieces] = useState("");
  const [inputFree, setInputFree] = useState("");
  const [itemDiscount, setItemDiscount] = useState("");
  const [itemDiscountType, setItemDiscountType] = useState<"flat" | "percent">("flat");
  const [grandDiscount, setGrandDiscount] = useState("");
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split("T")[0]);
  
  // Custom states for searchable direct product selection and rate editing
  const [customItemRate, setCustomItemRate] = useState("");
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Sub-Navigation Tabs for Staff & Customer Management
  const [activeTab, setActiveTab] = useState<"directory" | "attendance" | "payroll" | "crm">("directory");

  // CRM state for selected customer profile
  const [selectedCustomerCRM, setSelectedCustomerCRM] = useState<any | null>(null);

  React.useEffect(() => {
    if (type === "customer" && activeTab === "crm" && !selectedCustomerCRM && data.length > 0) {
      setSelectedCustomerCRM(data[0]);
    }
  }, [type, activeTab, data, selectedCustomerCRM]);

  // Attendance Date Selector
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  // Salary Payroll Month Selector
  const [salaryMonth, setSalaryMonth] = useState(new Date().toISOString().slice(0, 7)); // e.g. "2026-05"
  const [deductAbsences, setDeductAbsences] = useState(true);

  // Payment popup states
  const [payingStaffItem, setPayingStaffItem] = useState<any | null>(null);
  const [payingAmount, setPayingAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<string>("Cash");
  const [payAccount, setPayAccount] = useState<string>("cash");
  const [payDescription, setPayDescription] = useState<string>("");

  // Bulk messaging states for customers
  const [selectedCustomersForBulk, setSelectedCustomersForBulk] = useState<string[]>([]);
  const [showBulkMessageModal, setShowBulkMessageModal] = useState(false);
  const [bulkMessageTemplate, setBulkMessageTemplate] = useState(
    "আসসালামু আলাইকুম {name},\nসমীরা ট্রেডার্স থেকে আপনার বর্তমান বাকি বকেয়া {balance} ৳ পরিশোধের জন্য বিনীত অনুরোধ করা হচ্ছে। কোনো জিজ্ঞাসা থাকলে যোগাযোগ করুন।"
  );
  const [bulkSentStatus, setBulkSentStatus] = useState<Record<string, "unsent" | "sent">>({});
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [lastImportedIds, setLastImportedIds] = useState<string[]>([]);

  const groups = useMemo(() => {
    if (type !== 'customer') return [];
    return Array.from(new Set(data.map(item => item.groupId).filter(Boolean)));
  }, [data, type]);

  const filtered = data.filter(item => 
    (item.name?.toLowerCase().includes(search.toLowerCase()) || 
    item.phone?.includes(search)) &&
    (type !== 'customer' || !groupFilter || item.groupId === groupFilter)
  );

  const totalBalance = useMemo(() => {
    if (type !== 'customer') return 0;
    return filtered.reduce((acc, item) => acc + (Number(item.balance) || 0), 0);
  }, [filtered, type]);

  // Derived state configurations for the selected sale product popup
  const configProduct = useMemo(() => {
    return products.find((p: any) => p.id === selectedSaleProduct);
  }, [selectedSaleProduct, products]);

  const configCSize = useMemo(() => {
    if (!configProduct) return 1;
    return Number(configProduct.cartoonSize || configProduct.piecesInCarton || 1);
  }, [configProduct]);

  const configTotalPieces = useMemo(() => {
    const cartons = Number(inputCartons) || 0;
    const pieces = Number(inputPieces) || 0;
    return (cartons * configCSize) + pieces;
  }, [inputCartons, inputPieces, configCSize]);

  const configGrossTotal = useMemo(() => {
    if (!configProduct) return 0;
    const rateToUse = customItemRate !== "" ? Number(customItemRate) : Number(configProduct.price || configProduct.tradePrice || 0);
    return configTotalPieces * rateToUse;
  }, [configTotalPieces, customItemRate, configProduct]);

  const configLineTotal = useMemo(() => {
    const itemDisc = Number(itemDiscount) || 0;
    return Math.max(0, configGrossTotal - itemDisc);
  }, [configGrossTotal, itemDiscount]);

  // Open Modal Helpers
  const handleOpenPaymentIn = (cust: any) => {
    setSelectedCustomer(cust);
    setPayAmount("");
    setPayNote("");
    const defaultCash = accounts.find((a: any) => a.name?.toLowerCase().includes("cash") || a.id?.toLowerCase().includes("cash"))?.id || "cash";
    setPayAccountId(defaultCash);
    setPayMethodOption("Cash");
    setPayDate(new Date().toISOString().split("T")[0]);
    setShowPaymentInModal(true);
  };

  const handleOpenPaymentOut = (cust: any) => {
    setSelectedCustomer(cust);
    setPayAmount("");
    setPayNote("");
    const defaultCash = accounts.find((a: any) => a.name?.toLowerCase().includes("cash") || a.id?.toLowerCase().includes("cash"))?.id || "cash";
    setPayAccountId(defaultCash);
    setPayMethodOption("Cash");
    setPayDate(new Date().toISOString().split("T")[0]);
    setShowPaymentOutModal(true);
  };

  const handleOpenDirectSale = (cust: any) => {
    setSelectedCustomer(cust);
    setSaleItems([]);
    setSelectedSaleProduct("");
    setInputCartons("");
    setInputPieces("");
    setInputFree("");
    setItemDiscount("");
    setItemDiscountType("flat");
    setGrandDiscount("");
    setSaleDate(new Date().toISOString().split("T")[0]);
    setProductSearchQuery("");
    setShowProductDropdown(false);
    setCustomItemRate("");
    setShowDirectSaleModal(true);
  };

  // Payment Execution Helpers
  const handleSavePaymentIn = async () => {
    if (!selectedCustomer || !payAmount || Number(payAmount) <= 0) {
      toast.error("অনুগ্রহ করে একটি সঠিক পরিমান লিখুন!");
      return;
    }

    setIsSubmitting(true);
    try {
       const amount = Number(payAmount);
       const paymentRecord = {
         date: payDate,
         type: "in",
         amount: amount,
         category: "Customer Collection",
         description: payNote.trim() || `ক্যাশ ইন: ${selectedCustomer.name} থেকে টাকা জমা`,
         entityId: selectedCustomer.id,
         method: payMethodOption,
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

       if (update) {
         const newBal = (Number(selectedCustomer.balance) || 0) - amount;
         await update(selectedCustomer.id, { balance: newBal });
       }

       toast.success("পেমেন্ট-ইন (টাকা গ্রহণ) সফল হয়েছে!");
       setPayAmount("");
       setPayNote("");
       setShowPaymentInModal(false);
    } catch (e: any) {
       toast.error("পেমেন্ট সেভ করতে ত্রুটি: " + e.message);
    } finally {
       setIsSubmitting(false);
    }
  };

  const handleSavePaymentOut = async () => {
    if (!selectedCustomer || !payAmount || Number(payAmount) <= 0) {
      toast.error("অনুগ্রহ করে একটি সঠিক পরিমান লিখুন!");
      return;
    }

    setIsSubmitting(true);
    try {
       const amount = Number(payAmount);
       const paymentRecord = {
         date: payDate,
         type: "out",
         amount: amount,
         category: "Refunding Inward",
         description: payNote.trim() || `ক্যাশ আউট: ${selectedCustomer.name} কে পরিশোধ`,
         entityId: selectedCustomer.id,
         method: payMethodOption,
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

       if (update) {
         const newBal = (Number(selectedCustomer.balance) || 0) + amount;
         await update(selectedCustomer.id, { balance: newBal });
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

  // Direct Sale Basket Helpers
  const currentSelectedProductInfo = useMemo(() => {
    return products.find((p: any) => p.id === selectedSaleProduct);
  }, [selectedSaleProduct, products]);

  const handleAddProductToSaleBasket = () => {
    if (!selectedSaleProduct) {
      toast.error("অনুগ্রহ করে পণ্য নির্বাচন করুন!");
      return;
    }

    const prod = products.find((p: any) => p.id === selectedSaleProduct);
    if (!prod) return;

    const cartons = Number(inputCartons) || 0;
    const pieces = Number(inputPieces) || 0;
    const free = Number(inputFree) || 0;
    const itemDisc = Number(itemDiscount) || 0;
    const cSize = Number(prod.cartoonSize || prod.piecesInCarton || 1);

    const totalPieces = (cartons * cSize) + pieces;

    if (totalPieces <= 0) {
      toast.error("কার্টুন বা পিস এর পরিমাণ ০ এর বেশি হতে হবে!");
      return;
    }

    const totalDemanded = totalPieces + free;
    if (totalDemanded > (Number(prod.stock) || 0)) {
      toast.error(`পর্যাপ্ত স্টক নেই! ক্যাটালগ স্টক: ${prod.stock || 0} পিস`);
      return;
    }

    const itemRate = customItemRate !== "" ? Number(customItemRate) : Number(prod.price || prod.tradePrice || 0);
    const subtotal = totalPieces * itemRate;

    let calculatedDiscount = 0;
    if (itemDiscountType === "flat") {
      calculatedDiscount = itemDisc;
    } else {
      calculatedDiscount = (subtotal * itemDisc) / 100;
    }

    const itemTotal = Math.max(0, subtotal - calculatedDiscount);

    const existsIdx = saleItems.findIndex(item => item.productId === prod.id);
    const cartItem = {
      productId: prod.id,
      name: prod.name,
      cartons,
      pieces,
      freeQty: free,
      discount: itemDisc,
      discountType: itemDiscountType,
      calculatedDiscount,
      rate: itemRate,
      cartonSize: cSize,
      totalPieces,
      total: itemTotal
    };

    if (existsIdx > -1) {
      const updated = [...saleItems];
      updated[existsIdx] = cartItem;
      setSaleItems(updated);
    } else {
      setSaleItems([...saleItems, cartItem]);
    }

    setSelectedSaleProduct("");
    setInputCartons("");
    setInputPieces("");
    setInputFree("");
    setItemDiscount("");
    setItemDiscountType("flat");
    setCustomItemRate("");
    toast.success("পণ্য বিক্রয় কার্টে যুক্ত করা হয়েছে!");
  };

  const handleSumSaleTotal = useMemo(() => {
    return saleItems.reduce((acc, item) => acc + item.total, 0);
  }, [saleItems]);

  const handleSumGrandTotal = useMemo(() => {
    const total = handleSumSaleTotal;
    const gDisc = Number(grandDiscount) || 0;
    return Math.max(0, total - gDisc);
  }, [handleSumSaleTotal, grandDiscount]);

  const handleSaveDirectSale = async () => {
    if (!selectedCustomer || saleItems.length === 0) {
      toast.error("কার্ট খালি! প্রথমে পণ্য সিলেক্ট করে কার্টে যোগ করুন।");
      return;
    }

    setIsSubmitting(true);
    try {
      const netTotal = handleSumGrandTotal;
      const checkoutDate = new Date().toISOString();

      const saleRecord = {
        date: saleDate,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        items: saleItems.map(item => ({
          productId: item.productId,
          name: item.name,
          quantity: item.totalPieces,
          cartons: item.cartons,
          pieces: item.pieces,
          freeQty: item.freeQty,
          cartoonSize: item.cartonSize,
          price: item.rate,
          discount: item.discount,
          discountType: item.discountType,
          calculatedDiscount: item.calculatedDiscount,
          total: item.total
        })),
        total: netTotal,
        grandDiscount: Number(grandDiscount) || 0,
        paidAmount: 0,
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

      if (updateProduct) {
        for (const item of saleItems) {
          const deduction = (Number(item.totalPieces) || 0) + (Number(item.freeQty) || 0);
          await recordStockMovement(item.productId, 'SALES', -deduction, "DIRECT_SALE_" + Date.now());
        }
      }

      if (update) {
        const newBal = (Number(selectedCustomer.balance) || 0) + netTotal;
        await update(selectedCustomer.id, { balance: newBal });
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const item: any = {
        name: formData.get("name") as string,
      };

      if (type !== "route") {
        item.phone = formData.get("phone") as string;
        item.address = formData.get("address") as string;
        if (type === "customer") {
          item.email = formData.get("email") as string;
        }
      }

      if (type === "staff") {
        item.role = formData.get("role") as string;
        item.salary = Number(formData.get("salary") || 0);
        item.attendance = {};
        item.bonuses = {};
        item.advances = {};
      }

      if (type === "route") {
        item.area = formData.get("area") as string;
      }

      if (type === "customer") {
        item.groupId = formData.get("groupId") as string;
        item.balance = 0;
      }

      await add(item);
      toast.success(`${getTypeName()} সফলভাবে সংরক্ষণ করা হয়েছে!`);
      setShowAdd(false);
    } catch (err: any) {
      console.error(err);
      toast.error("সংরক্ষণ করতে সমস্যা হয়েছে: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUndoImport = async () => {
      if (lastImportedIds.length === 0) return;
      
      for (const id of lastImportedIds) {
          await remove(id);
      }
      setLastImportedIds([]);
      toast.success("ইম্পোর্টটি আনডু করা হয়েছে");
  };

  const handleImport = (data: any[]) => {
      setPreviewData(data);
  };

  const confirmImport = async () => {
    let count = 0;
    const newIds: string[] = [];
    for (const itemData of previewData) {
      if (!itemData.Name && !itemData.name) continue;
      const item: any = { name: itemData.Name || itemData.name };
      
      if (type !== "route") {
        item.phone = itemData.Phone || itemData.phone || "";
        item.address = itemData.Address || itemData.address || "";
      }
      if (type === "customer") {
          item.groupId = itemData.GroupId || itemData.groupId || "";
          item.balance = Number(itemData.Balance || itemData.balance) || 0;
      }
      if (type === "staff") {
          item.role = itemData.Role || itemData.role || "DSR";
          item.salary = Number(itemData.Salary || itemData.salary) || 12000;
          item.attendance = {};
          item.bonuses = {};
          item.advances = {};
      }
      const newId = await add(item);
      if (newId) newIds.push(newId);
      count++;
    }
    setPreviewData([]);
    setShowBulk(false);
    setLastImportedIds(newIds);
    toast.success(`${count} টি এন্ট্রি সফলভাবে ইম্পোর্ট করা হয়েছে`, {
        duration: 5000,
    });
  };

  const handleBulkSave = async () => {
    const lines = bulkText.split("\n").filter(l => l.trim());
    let count = 0;
    for (const line of lines) {
      if (line.toLowerCase().includes("name")) continue; 
      
      const parts = line.split(/[,\t]/).map(p => p.trim());
      if (parts[0]) {
        const item: any = { name: parts[0] };
        if (type !== "route") {
          item.phone = parts[1] || "";
          item.address = parts[2] || "";
        }
        if (type === "customer") {
            item.groupId = parts[3] || "";
            item.balance = Number(parts[4]) || 0;
        }
        if (type === "staff") {
            item.role = parts[3] || "DSR";
            item.salary = Number(parts[4]) || 12000;
            item.attendance = {};
            item.bonuses = {};
            item.advances = {};
        }
        await add(item);
        count++;
      }
    }
    setBulkText("");
    setShowBulk(false);
    toast.success(`${count} টি এন্ট্রি সফলভাবে যোগ করা হয়েছে`);
  };

  const downloadSampleCSV = () => {
    let csvContent = "";
    if (type === "customer") {
      csvContent = "data:text/csv;charset=utf-8,Name,Phone,Address,GroupId,Balance\nSample Customer,017xxxxxxxx,Dhaka,Group A,1000";
    } else if (type === "staff") {
      csvContent = "data:text/csv;charset=utf-8,Name,Phone,Address,Role,Salary\nKamal Hossain,018xxxxxxxx,Dhaka,DSR,12000";
    } else {
      csvContent = "data:text/csv;charset=utf-8,Name,Phone,Address\nSample Entity,019xxxxxxxx,Dhaka";
    }
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${getTypeName()}_bulk_sample.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTypeName = () => {
    switch (type) {
      case "customer": return "কাস্টমার";
      case "supplier": return "সাপ্লায়ার";
      case "staff": return "স্টাফ";
      case "route": return "রোড";
      default: return "";
    }
  };

  // Staff Attendance Helpers
  const handleUpdateAttendance = async (staffId: string, date: string, status: string) => {
    if (!update) return;
    const staffMember = data.find(s => s.id === staffId);
    if (!staffMember) return;
    
    // Toggle logic: if already has this status, unmark (delete), otherwise save status
    const currentAtt = staffMember.attendance || {};
    const newAttendance = { ...currentAtt };
    if (currentAtt[date] === status) {
      delete newAttendance[date];
    } else {
      newAttendance[date] = status;
    }

    await update(staffId, { attendance: newAttendance });
  };

  const handleMarkAllAttendance = async (status: string) => {
    if (!update) return;
    for (const item of filtered) {
      const newAttendance = { ...(item.attendance || {}), [attendanceDate]: status };
      await update(item.id, { attendance: newAttendance });
    }
    toast.success(`সকল স্টাফের হাজিরা "${status === 'present' ? 'উপস্থিত' : 'ছুটি'}" করা হয়েছে`);
  };

  // Staff Wages Helpers
  const getAttendanceStats = (item: any, monthStr: string) => {
    const att = item.attendance || {};
    let present = 0;
    let absent = 0;
    let halfDay = 0;
    let leave = 0;

    Object.entries(att).forEach(([date, status]) => {
      if (date.startsWith(monthStr)) {
        if (status === "present") present++;
        else if (status === "absent") absent++;
        else if (status === "half-day") halfDay++;
        else if (status === "leave") leave++;
      }
    });

    return { present, absent, halfDay, leave };
  };

  const handleUpdateBonus = async (staffId: string, val: number) => {
    if (!update) return;
    const staffMember = data.find(s => s.id === staffId);
    if (!staffMember) return;

    const newBonuses = { ...(staffMember.bonuses || {}), [salaryMonth]: val };
    await update(staffId, { bonuses: newBonuses });
  };

  const handleUpdateAdvance = async (staffId: string, val: number) => {
    if (!update) return;
    const staffMember = data.find(s => s.id === staffId);
    if (!staffMember) return;

    const newAdvances = { ...(staffMember.advances || {}), [salaryMonth]: val };
    await update(staffId, { advances: newAdvances });
  };

  const handleOpenPayModal = (item: any, amount: number) => {
    setPayingStaffItem(item);
    setPayingAmount(amount);
    setPayMethod("Cash");
    setPayAccount("cash");
    setPayDescription(`${salaryMonth} মাসের স্টাফ বেতন (${item.name})`);
  };

  const handleConfirmPaySalary = async () => {
    if (!payingStaffItem || !addPayment) return;

    try {
      const paymentData = {
        date: new Date().toISOString().split('T')[0],
        type: "out",
        amount: payingAmount,
        category: "Salary", // Maps perfectly with "Salary" categorized outflow expenses
        description: payDescription || `${salaryMonth} মাসের স্টাফ বেতন (${payingStaffItem.name})`,
        entityId: payingStaffItem.id,
        method: payMethod,
        accountId: payAccount,
        createdBy: "Admin",
        approved: true,
        status: "approved"
      };

      await addPayment(paymentData);
      setPayingStaffItem(null);
      toast.success(`${payingStaffItem.name} এর বেতন পরিশোধ এন্ট্রি সম্পন্ন হয়েছে!`);
    } catch (err: any) {
      toast.error("বেতন পরিশোধ রেকর্ড করতে সমস্যা সৃষ্টি হয়েছে: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {previewData.length > 0 && <DataPreviewModal data={previewData} onCancel={() => setPreviewData([])} onConfirm={confirmImport} />}
      {/* Title with Subtitles */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-950">{title}</h2>
          <p className="text-sm font-semibold text-[#6C757D]">{subtitle}</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={() => setShowBulk(true)}
            className="flex-1 md:flex-none px-4 py-2.5 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs border border-blue-100 hover:bg-blue-100 transition-all cursor-pointer"
          >
            বাল্ক এন্ট্রি (Bulk)
          </button>
          <button 
            onClick={() => setShowAdd(true)}
            className="flex-1 md:flex-none btn-primary flex items-center justify-center gap-2 text-xs font-bold"
          >
            <Plus className="w-4 h-4" /> নতুন {getTypeName()} যোগ করুন
          </button>
        </div>
      </div>

      {/* Navigation tabs ONLY for staff directory */}
      {type === "staff" && (
        <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl max-w-md">
          <button 
            onClick={() => setActiveTab("directory")}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all ${
              activeTab === "directory" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            স্টাফ তালিকা
          </button>
          <button 
            onClick={() => setActiveTab("attendance")}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all ${
              activeTab === "attendance" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            হাজিরা খাতা (Attendance)
          </button>
          <button 
            onClick={() => setActiveTab("payroll")}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all ${
              activeTab === "payroll" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            বেতন হিসাব (Payroll)
          </button>
        </div>
      )}

      {/* Navigation tabs ONLY for customer directory */}
      {type === "customer" && (
        <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl max-w-sm">
          <button 
            onClick={() => setActiveTab("directory")}
            className={`flex-1 py-2 px-3 text-xs font-black rounded-xl transition-all ${
              activeTab === "directory" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-950"
            }`}
          >
            📋 কাস্টমার তালিকা
          </button>
          <button 
            onClick={() => setActiveTab("crm")}
            className={`flex-1 py-2 px-3 text-xs font-black rounded-xl transition-all ${
              activeTab === "crm" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-955"
            }`}
          >
            👤 কাস্টমার CRM পোর্টাল
          </button>
        </div>
      )}

      {/* Directory Searches */}
      {activeTab === "directory" && (
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ADB5BD] w-5 h-5" />
            <input 
              type="text" 
              placeholder="নাম বা ফোন দিয়ে খুঁজুন..." 
              className="w-full pl-10 pr-4 py-3 bg-white border border-[#E9ECEF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#000] text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {type === "customer" && search.trim() !== "" && (
              <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-150 rounded-2xl shadow-xl max-h-96 overflow-y-auto divide-y divide-gray-100 z-50 p-2">
                <div className="p-2 mb-1 bg-slate-50/50 rounded-xl text-[10px] text-gray-400 font-extrabold uppercase tracking-wide px-3 flex justify-between items-center">
                  <span>অনুসন্ধান ফলাফল ({filtered.length} জন)</span>
                  <button 
                    onClick={() => setSearch("")} 
                    className="text-red-500 hover:text-red-700 font-bold cursor-pointer"
                  >
                    বন্ধ করুন
                  </button>
                </div>
                {filtered.map((item, idx) => (
                  <div key={item.id} className="p-3 hover:bg-slate-50 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition-colors">
                    <div className="flex items-center gap-3">
                      {/* Serial Number */}
                      <span className="font-mono text-[11px] font-black text-slate-400 bg-slate-100 w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Group display in front of name as requested */}
                          {item.groupId ? (() => {
                            const colors = getGroupColors(item.groupId);
                            return (
                              <span className={`px-2 py-0.5 text-[10px] font-black rounded border uppercase tracking-wider scale-95 origin-left transition-all ${colors.bg} ${colors.text} ${colors.border}`}>
                                {item.groupId}
                              </span>
                            );
                          })() : (
                            <span className="px-1.5 py-0.5 bg-slate-55 text-slate-400 text-[10px] font-extrabold rounded border scale-95 origin-left">
                              সাধারণ
                            </span>
                          )}
                          <span className="font-extrabold text-sm text-gray-900">{item.name}</span>
                        </div>
                        <div className="text-[10px] text-[#8C9098] font-bold mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span>ফোন: {item.phone || "N/A"}</span>
                          {item.phone && (
                            <a 
                              href={`tel:${item.phone}`} 
                              className="px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded text-[9px] font-black tracking-wide inline-flex items-center gap-0.5 transition-all cursor-pointer shadow-3xs"
                              title="সরাসরি কল করতে ক্লিক করুন"
                            >
                              📞 কল করুন
                            </a>
                          )}
                          <span>• বাকী ব্যালেন্স: <span className="text-rose-600 font-mono font-black">{item.balance || 0} ৳</span></span>
                        </div>
                        
                        {/* 'Recent Transactions' Section with Click-to-open-Ledger Trigger */}
                        <div className="mt-1.5 pt-1.5 border-t border-dashed border-gray-100">
                          <button
                            type="button"
                            onClick={() => {
                              if (setSelectedLedgerParty && setActiveView) {
                                setSelectedLedgerParty({ id: item.id, type: "customer" });
                                setActiveView("ledger");
                                setSearch(""); // Clear search to reset view
                              } else {
                                toast.error("লেজার ভিউ খোলা সম্ভব হচ্ছে না!");
                              }
                            }}
                            className="text-[10px] font-black text-indigo-700 hover:text-indigo-900 transition-all flex items-center gap-1 cursor-pointer bg-indigo-50/60 hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-indigo-100"
                          >
                            <span>🕒 সাম্প্রতিক লেনদেন (লেজার ভিউ)</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Quick action icons as requested */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleOpenPaymentIn(item)}
                        className="py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-lg transition-all flex items-center gap-1 text-[11px] font-black cursor-pointer shadow-2xs"
                        title="টাকা গ্রহণ (Receive Payment)"
                      >
                        <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        রিসিভ
                      </button>
                      <button
                        onClick={() => handleOpenPaymentOut(item)}
                        className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-lg transition-all flex items-center gap-1 text-[11px] font-black cursor-pointer shadow-2xs"
                        title="টাকা পরিশোধ (Pay Out)"
                      >
                        <ArrowDownCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        পেমেন্ট
                      </button>
                      <button
                        onClick={() => handleOpenDirectSale(item)}
                        className="py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 rounded-lg transition-all flex items-center gap-1 text-[11px] font-black cursor-pointer shadow-2xs"
                        title="পণ্য বিক্রয় (Direct Sale)"
                      >
                        <ShoppingCart className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        সেলস
                      </button>
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div className="p-8 text-center text-gray-450 font-bold text-xs">
                    কোনো কাস্টমার পাওয়া যায়নি!
                  </div>
                )}
              </div>
            )}
          </div>
          
          {type === 'customer' && (
            <select 
              value={groupFilter} 
              onChange={(e) => setGroupFilter(e.target.value)}
              className="px-4 py-3 bg-white border border-[#E9ECEF] rounded-xl focus:outline-none text-sm font-bold"
            >
              <option value=""> সকল গ্রুপ </option>
              {groups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          )}
        </div>
      )}

      {/* Total Due for Customers */}
      {type === 'customer' && activeTab === "directory" && (
        <div className="flex flex-col gap-4 w-full">
          <div className="bg-white border rounded-xl p-4 flex justify-between items-center shadow-xs">
              <span className="font-bold text-gray-700 text-sm">মোট বাকি:</span>
              <span className="text-xl font-black text-red-600 font-mono">{totalBalance} ৳</span>
          </div>

          <div className="bg-indigo-50 border border-indigo-200/60 rounded-3xl p-5 flex flex-col md:flex-row justify-between items-center gap-4 shadow-3xs w-full">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 text-white p-2.5 rounded-2xl shadow-3xs shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-indigo-950 uppercase tracking-widest">কাস্টমার বাল্ক হোয়াটসঅ্যাপ (WhatsApp Bulk)</h4>
                <p className="text-[11px] font-bold text-indigo-750 mt-0.5 leading-snug">
                  {selectedCustomersForBulk.length === 0 
                    ? "গ্রাহকদের সিলেক্ট করে যেকোনো এক বা একাধিক কাস্টমারকে এক সাথে মেসেজ টেমপ্লেট পাঠান।" 
                    : `সিলেক্টেড গ্রাহক: ${selectedCustomersForBulk.length} জন`}
                </p>
              </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto shrink-0">
              {filtered.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedCustomersForBulk.length === filtered.length) {
                      setSelectedCustomersForBulk([]);
                    } else {
                      setSelectedCustomersForBulk(filtered.map(c => c.id));
                    }
                  }}
                  className="flex-1 md:flex-initial py-2.5 px-4 bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded-xl transition-all font-black text-xs cursor-pointer shadow-3xs"
                >
                  {selectedCustomersForBulk.length === filtered.length ? "❌ সব আনসিলেক্ট" : "✅ সব সিলেক্ট করুন"}
                </button>
              )}
              <button
                type="button"
                disabled={selectedCustomersForBulk.length === 0}
                onClick={() => {
                  setBulkSentStatus({});
                  setShowBulkMessageModal(true);
                }}
                className={`flex-1 md:flex-initial py-2.5 px-5 rounded-xl transition-all font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
                  selectedCustomersForBulk.length > 0 
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white" 
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                💬 টেমপ্লেট পাঠান ({selectedCustomersForBulk.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN VIEW CONTENTS */}

      {/* Tab 1: Directory view (Standard Listings) */}
      {activeTab === "directory" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(item => {
            const attStats = type === 'staff' ? getAttendanceStats(item, new Date().toISOString().slice(0, 7)) : null;
            return (
              <div key={item.id} className="data-card group relative bg-white border border-gray-100 rounded-3xl p-5 shadow-xs flex flex-col hover:shadow-md transition-all">
                <div className="absolute top-4 right-4 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  {update && (
                    <button 
                      onClick={() => setEditingItem(item)}
                      className="p-1 px-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 rounded-lg transition-all cursor-pointer"
                      title="সম্পাদনা করুন (Edit)"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      confirmDelete({
                        recordName: item.name || item.id,
                        onConfirm: async () => {
                          try {
                            await remove(item.id);
                            toast.success(`${getTypeName()} সফলভাবে ডিলিট করা হয়েছে!`);
                          } catch (err: any) {
                            console.error(err);
                            toast.error("ডিলিট করতে সমস্যা হয়েছে: " + err.message);
                            throw err;
                          }
                        }
                      });
                    }}
                    className="p-1 px-1.5 text-gray-400 hover:text-red-600 hover:bg-rose-50 border border-transparent hover:border-red-100 rounded-lg transition-all cursor-pointer"
                    title="ডিলিট করুন"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                <div className="flex items-center gap-3 mb-4">
                  {type === "customer" && activeTab === "directory" && (
                    <input 
                      type="checkbox"
                      checked={selectedCustomersForBulk.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCustomersForBulk(prev => [...prev, item.id]);
                        } else {
                          setSelectedCustomersForBulk(prev => prev.filter(id => id !== item.id));
                        }
                      }}
                      className="w-4.5 h-4.5 rounded-md border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0 transition-transform active:scale-95"
                    />
                  )}
                  <div 
                    onClick={() => {
                      if (type === "customer" && activeTab === "directory") {
                        if (selectedCustomersForBulk.includes(item.id)) {
                          setSelectedCustomersForBulk(prev => prev.filter(id => id !== item.id));
                        } else {
                          setSelectedCustomersForBulk(prev => [...prev, item.id]);
                        }
                      }
                    }}
                    className={`w-11 h-11 bg-[#F1F3F5] rounded-2xl flex items-center justify-center font-black text-base text-gray-700 font-sans shadow-xs shrink-0 select-none ${
                      type === "customer" && activeTab === "directory" ? "cursor-pointer active:scale-95 transition-transform" : ""
                    }`}
                  >
                    {item.name?.slice(0, 1)}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-gray-900">{item.name}</h3>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.role && <span className="px-2 py-0.5 bg-indigo-650 text-white text-[9px] rounded font-bold uppercase">{item.role}</span>}
                      {item.area && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[9px] rounded font-extrabold uppercase border border-amber-100">{item.area}</span>}
                      {item.groupId && (() => {
                        const colors = getGroupColors(item.groupId);
                        return (
                          <span className={`px-2 py-0.5 text-[9px] rounded font-extrabold uppercase border transition-all ${colors.bg} ${colors.text} ${colors.border}`}>
                            {item.groupId}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-[10px] font-bold font-mono text-[#ADB5BD] mt-1">{getTypeName()} আইডি: {item.id.slice(0, 8)}</p>
                  </div>
                </div>
                
                <div className="space-y-2 text-xs border-t border-gray-50 pt-3 mt-auto font-medium">
                  {type === 'customer' && (
                    <div className="flex justify-between items-center text-red-700 font-black mb-2 text-sm bg-rose-50/20 p-2.5 rounded-xl border border-rose-100/30">
                      <span>মোট বাকী:</span>
                      <span className="font-mono text-rose-600 font-extrabold">{item.balance || 0} ৳</span>
                    </div>
                  )}

                  {item.salary && (
                    <div className="flex justify-between items-center text-indigo-600 font-black mb-2 text-sm bg-indigo-50/20 p-2.5 rounded-xl border border-indigo-50/50">
                      <span>মাসিক মূল বেতন:</span>
                      <span className="font-mono">{item.salary} ৳</span>
                    </div>
                  )}

                  {/* Attendance Micro Summary on Card */}
                  {attStats && (
                    <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 mb-2 text-gray-600 flex justify-between items-center text-[11px]">
                      <span>চলতি মাসের উপস্থিতি:</span>
                      <span className="font-bold flex items-center gap-1 text-emerald-600">
                        {attStats.present} দিন উপস্থিত
                      </span>
                    </div>
                  )}

                  {item.phone && (
                    <div className="flex items-center justify-between text-[#6C757D] p-1 bg-slate-50/50 rounded-xl border border-gray-100/50">
                      <div className="flex items-center gap-2 pl-1.5">
                        <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="font-semibold">{item.phone}</span>
                      </div>
                      <a 
                        href={`tel:${item.phone}`} 
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black tracking-wide inline-flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
                        title="সরাসরি কল করতে ক্লিক করুন"
                      >
                        📞 কল করুন
                      </a>
                    </div>
                  )}
                  {type === 'customer' && item.email && (
                    <div className="flex items-center gap-2 text-[#6C757D] p-1.5 bg-slate-50/30 rounded-xl border border-gray-100/30">
                      <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-black shrink-0">✉️ ইমেইল</span>
                      <span className="truncate font-mono font-bold text-[11px] text-indigo-755">{item.email}</span>
                    </div>
                  )}
                  {item.address && (
                    <div className="flex items-center gap-2 text-[#6C757D]">
                      <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="truncate">{item.address}</span>
                    </div>
                  )}

                  {type === 'customer' && (
                    <div className="grid grid-cols-3 gap-1.5 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => handleOpenPaymentIn(item)}
                        className="py-2.5 px-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl transition-all font-black text-[10px] flex flex-col items-center gap-1 cursor-pointer border border-emerald-100"
                      >
                        <ArrowUpCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        রিসিভ
                      </button>
                      <button
                        onClick={() => handleOpenPaymentOut(item)}
                        className="py-2.5 px-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl transition-all font-black text-[10px] flex flex-col items-center gap-1 cursor-pointer border border-rose-100"
                      >
                        <ArrowDownCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        পেমেন্ট
                      </button>
                      <button
                        onClick={() => handleOpenDirectSale(item)}
                        className="py-2.5 px-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl transition-all font-black text-[10px] flex flex-col items-center gap-1 cursor-pointer border border-indigo-100"
                      >
                        <ShoppingCart className="w-4 h-4 text-indigo-600 shrink-0" />
                        সেলস
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Daily Attendance View */}
      {type === "staff" && activeTab === "attendance" && (
        <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-xs space-y-6">
          {/* Attendance Controls */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">হাজিরার তারিখ</label>
                <input 
                  type="date" 
                  value={attendanceDate} 
                  onChange={e => setAttendanceDate(e.target.value)} 
                  className="bg-transparent border-none p-0 text-sm font-extrabold focus:outline-none text-gray-900 cursor-pointer" 
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <button 
                onClick={() => handleMarkAllAttendance("present")}
                className="flex-1 md:flex-none px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold rounded-xl border border-emerald-100 transition-all cursor-pointer"
              >
                আজ সবাইকে উপস্থিত করুন
              </button>
              <button 
                onClick={() => handleMarkAllAttendance("leave")}
                className="flex-1 md:flex-none px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold rounded-xl border border-blue-100 transition-all cursor-pointer"
              >
                আজ সবাইকে ছুটি দিন
              </button>
            </div>
          </div>

          {/* Interactive Attendance List */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FA] text-[10px] uppercase font-black text-gray-400 tracking-wider">
                <tr>
                  <th className="px-6 py-4">স্টাফের নাম ও পদবী</th>
                  <th className="px-6 py-4">হাজিরা স্ট্যাটাস সিলেক্ট করুন</th>
                  <th className="px-6 py-4 text-center">আজকের অবস্থা</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filtered.map(item => {
                  const currentStatus = (item.attendance || {})[attendanceDate] || "unmarked";
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                        <div className="font-extrabold text-[#212529] text-sm">{item.name}</div>
                        <div className="text-[10px] font-bold text-indigo-600 uppercase mt-0.5">{item.role || "Staff"}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button 
                            onClick={() => handleUpdateAttendance(item.id, attendanceDate, "present")}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                              currentStatus === "present" 
                                ? "bg-emerald-600 text-white border-emerald-650 shadow-xs" 
                                : "bg-white text-gray-600 border-gray-150 hover:bg-gray-100"
                            }`}
                          >
                            উপস্থিত (Present)
                          </button>
                          <button 
                            onClick={() => handleUpdateAttendance(item.id, attendanceDate, "absent")}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                              currentStatus === "absent" 
                                ? "bg-red-650 text-white border-red-700 shadow-xs" 
                                : "bg-white text-gray-600 border-gray-150 hover:bg-gray-100"
                            }`}
                          >
                            অনুপস্থিত (Absent)
                          </button>
                          <button 
                            onClick={() => handleUpdateAttendance(item.id, attendanceDate, "half-day")}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                              currentStatus === "half-day" 
                                ? "bg-amber-600 text-white border-amber-650 shadow-xs" 
                                : "bg-white text-gray-600 border-gray-150 hover:bg-gray-100"
                            }`}
                          >
                            অর্ধ-দিবস (Half-Day)
                          </button>
                          <button 
                            onClick={() => handleUpdateAttendance(item.id, attendanceDate, "leave")}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                              currentStatus === "leave" 
                                ? "bg-indigo-600 text-white border-indigo-650 shadow-xs" 
                                : "bg-white text-gray-600 border-gray-150 hover:bg-gray-100"
                            }`}
                          >
                            ছুটি (Leave)
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {currentStatus === "present" && <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full font-black text-[10px] border border-emerald-100 border-dashed">উপস্থিত</span>}
                        {currentStatus === "absent" && <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full font-black text-[10px] border border-red-100 border-dashed">অনুপস্থিত</span>}
                        {currentStatus === "half-day" && <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full font-black text-[10px] border border-amber-100 border-dashed">অর্ধ-দিবস</span>}
                        {currentStatus === "leave" && <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-black text-[10px] border border-blue-100 border-dashed">ছুটি</span>}
                        {currentStatus === "unmarked" && <span className="px-3 py-1 bg-gray-50 text-gray-450 rounded-full font-bold text-[10px] border border-gray-100">হাজিরা নেই</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Wages & Salaries Sheets */}
      {type === "staff" && activeTab === "payroll" && (
        <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-xs space-y-6">
          {/* Month picker and Controls */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#F8F9FA] p-4 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">বেতন হিসাব মাস</label>
                <input 
                  type="month" 
                  value={salaryMonth} 
                  onChange={e => setSalaryMonth(e.target.value)} 
                  className="bg-transparent border-none p-0 text-sm font-extrabold focus:outline-none text-gray-900 cursor-pointer" 
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="deductToggle" 
                checked={deductAbsences} 
                onChange={e => setDeductAbsences(e.target.checked)} 
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded-md focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="deductToggle" className="text-xs font-black text-gray-600 select-none cursor-pointer">
                অনুপস্থিতির জন্য বেতন কর্তন সক্রিয় করুন
              </label>
            </div>
          </div>

          {/* Interactive Payroll Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs align-middle">
              <thead className="bg-[#F8F9FA] text-[10px] uppercase font-black text-gray-400 tracking-wider">
                <tr>
                  <th className="px-4 py-4">স্টাফ</th>
                  <th className="px-4 py-4 text-right">মূল বেতন</th>
                  <th className="px-4 py-4 text-center">হাজিরা বিবরণ (এই মাস)</th>
                  <th className="px-4 py-4 text-right">অনুপস্থিতি কর্তন</th>
                  <th className="px-4 py-4 text-right">বোনাস / ইনসেন্টিভ</th>
                  <th className="px-4 py-4 text-right">অগ্রিম / অন্যান্য</th>
                  <th className="px-4 py-4 text-right font-black text-gray-900">নীট প্রদেয় বেতন</th>
                  <th className="px-4 py-4 text-center">অ্যাকশন / পরিশোধ স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filtered.map(item => {
                  const basic = Number(item.salary || 0);
                  const stats = getAttendanceStats(item, salaryMonth);
                  
                  // Calculations
                  const dailyWage = Math.round(basic / 30);
                  // Absence deduction: absents and half_days counts
                  const absentDaysFraction = stats.absent + (stats.halfDay * 0.5);
                  const deduction = deductAbsences ? Math.round(absentDaysFraction * dailyWage) : 0;

                  // Bonus/Incentive & Advance values stored in staff doc maps
                  const bonus = Number((item.bonuses || {})[salaryMonth] || 0);
                  const advance = Number((item.advances || {})[salaryMonth] || 0);

                  const netPayable = Math.max(0, basic - deduction + bonus - advance);

                  // Check if payment already exists in payments collection for this month & employee
                  const matchedPayment = payments.find(p => 
                    p.entityId === item.id && 
                    p.category === "Salary" && 
                    p.date?.startsWith(salaryMonth) &&
                    p.status !== "rejected"
                  );
                  const isPaid = !!matchedPayment;

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-4 bg-gray-50/20">
                        <div className="font-extrabold text-[#212529] text-xs">{item.name}</div>
                        <div className="text-[10px] font-bold text-gray-400 mt-0.5 uppercase">{item.role || "DSR"}</div>
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-bold text-gray-700">
                        {basic} ৳
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-gray-500 scale-95">
                          <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-100">উ: {stats.present}</span>
                          <span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded border border-red-100">অ: {stats.absent}</span>
                          <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-100">অ.দি: {stats.halfDay}</span>
                          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100">ছু: {stats.leave}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right text-red-600 font-bold font-mono">
                        {deduction > 0 ? `-${deduction} ৳` : '০ ৳'}
                        {deductAbsences && absentDaysFraction > 0 && (
                          <div className="text-[9px] font-bold text-gray-400 mt-0.5">({absentDaysFraction} দিন)</div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end">
                          <input 
                            type="number" 
                            value={bonus || ""} 
                            placeholder="0"
                            onChange={e => handleUpdateBonus(item.id, Number(e.target.value))}
                            className="w-16 border border-gray-200 rounded-lg p-1 text-right text-xs bg-white text-gray-700 font-mono font-extrabold focus:ring-1 focus:ring-indigo-300"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end">
                          <input 
                            type="number" 
                            value={advance || ""} 
                            placeholder="0"
                            onChange={e => handleUpdateAdvance(item.id, Number(e.target.value))}
                            className="w-16 border border-gray-200 rounded-lg p-1 text-right text-xs bg-white text-gray-750 font-mono font-extrabold focus:ring-1 focus:ring-indigo-300"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-black text-gray-900 bg-gray-50/30">
                        <span className="text-xs text-indigo-750 font-mono font-black">{netPayable} ৳</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {isPaid ? (
                          <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-100 font-black text-[10px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> পরিশোধিত ({matchedPayment.amount} ৳)
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleOpenPayModal(item, netPayable)}
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl font-bold transition-all text-[10px] cursor-pointer shadow-xs"
                          >
                            বেতন পে করুন
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Salary payment popup overlay */}
      {payingStaffItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-black text-gray-900 mb-2 border-b pb-2">স্টাফ বেতন পরিশোধ ভাউচার</h3>
            <p className="text-xs text-gray-400 font-bold mb-4 uppercase tracking-wider">ভাউচার আইডি: PAY-{Math.random().toString(36).slice(2, 8).toUpperCase()}</p>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-2xl border border-gray-100 text-xs">
                <div>
                  <span className="text-gray-400 font-bold block">স্টাফের নাম:</span>
                  <span className="text-sm font-black text-gray-900">{payingStaffItem.name}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-bold block font-sans">পদবী:</span>
                  <span className="text-[11px] font-black text-indigo-600 uppercase block mt-0.5">{payingStaffItem.role}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">পরিশোধের পরিমাণ</label>
                <input 
                  type="number" 
                  value={payingAmount} 
                  onChange={e => setPayingAmount(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl p-2.5 font-mono font-black text-gray-900" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">পেমেন্ট পদ্ধতি</label>
                  <select 
                    value={payMethod} 
                    onChange={e => setPayMethod(e.target.value)} 
                    className="w-full border border-gray-200 rounded-xl p-2.5 bg-white text-xs font-bold font-sans"
                  >
                    <option value="Cash">Cash (নগদ)</option>
                    <option value="Bank">Bank (ব্যাংক ট্রান্সফার)</option>
                    <option value="Mobile Cash">Mobile Cash (বিকাশ/রকেট)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">অ্যাকাউন্ট</label>
                  <select 
                    value={payAccount} 
                    onChange={e => setPayAccount(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-2.5 bg-white text-xs font-bold text-sans"
                  >
                    <option value="cash">প্রধান ক্যাশ বাক্স</option>
                    <option value="bank">ব্যাংক একাউন্ট</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">বিবরণ / নোট</label>
                <textarea 
                  value={payDescription} 
                  onChange={e => setPayDescription(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-xs text-gray-700 h-20" 
                  placeholder="উদা: মে ২০২৬ মাসের বেতন পরিশোধ"
                />
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setPayingStaffItem(null)} className="flex-1 border border-gray-100 hover:bg-gray-100 py-3 rounded-xl font-bold text-xs transition-colors cursor-pointer">বাতিল</button>
                <button type="button" onClick={handleConfirmPaySalary} className="flex-1 btn-primary py-3 text-xs font-black">পরিশোধ নিশ্চিত করুন</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          CUSTOMER CRM PORTAL / WORKSPACE
          ========================================== */}
      {type === "customer" && activeTab === "crm" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
          
          {/* LEFT COLUMN: Customer Selection & General stats */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-5 border border-gray-150 shadow-xs space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  👤 কাস্টমার তালিকা ({filtered.length} জন)
                </h4>
              </div>

              {/* Small Search inside CRM List */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="গ্রাহক খুঁজুন..."
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 text-xs"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="bg-slate-50 rounded-2xl max-h-[460px] overflow-y-auto divide-y divide-gray-100 p-2 border border-gray-100">
                {filtered.map(cust => {
                  const isSelected = selectedCustomerCRM?.id === cust.id;
                  const colors = cust.groupId ? getGroupColors(cust.groupId) : { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200" };
                  return (
                    <button
                      key={cust.id}
                      onClick={() => setSelectedCustomerCRM(cust)}
                      className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        isSelected 
                          ? "bg-indigo-600 text-white shadow-sm" 
                          : "hover:bg-white bg-transparent text-gray-700"
                      }`}
                    >
                      <div className="truncate pr-1">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className={`px-1.5 py-0.5 text-[8px] font-black rounded border scale-95 origin-left ${
                            isSelected 
                              ? "bg-white/10 text-white border-white/20" 
                              : `${colors.bg} ${colors.text} ${colors.border}`
                          }`}>
                            {cust.groupId || "General"}
                          </span>
                        </div>
                        <p className={`font-black text-xs ${isSelected ? "text-white" : "text-gray-900"}`}>{cust.name}</p>
                        <p className={`text-[10px] ${isSelected ? "text-slate-100" : "text-gray-500"} font-mono mt-0.5`}>{cust.phone || "N/A"}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-[10px] uppercase font-black block ${isSelected ? "text-slate-100" : "text-gray-400"}`}>বাকী:</span>
                        <span className={`font-mono font-black text-xs ${isSelected ? "text-amber-300" : "text-rose-600"}`}>{cust.balance || 0} ৳</span>
                      </div>
                    </button>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="p-8 text-center text-gray-400 font-bold text-xs">
                    কোন কাস্টমার পাওয়া যায়নি!
                  </div>
                )}
              </div>
            </div>

            {/* Quick Summary overview KPI chart of CRM context */}
            <div className="bg-slate-900 text-white p-5 rounded-3xl space-y-4 shadow-sm">
              <span className="text-[10px] font-black text-indigo-400 block uppercase tracking-widest flex items-center gap-1.5">
                📊 CRM OVERVIEW METRICS
              </span>
              <div className="space-y-3 font-semibold text-xs text-slate-300">
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span>সর্বমোট প্রাপ্য বকেয়া:</span>
                  <span className="font-mono text-amber-400 font-black text-sm">{totalBalance} ৳</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span>মোট ডাটাবেজ কাস্টমার:</span>
                  <span className="font-mono text-white text-sm font-black">{data.length} জন</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span>গ্রুপ ভিত্তিক বকেয়া বন্টন:</span>
                </div>
                <div className="space-y-2 pt-1 text-[10px]">
                  {Object.entries(
                    data.reduce((acc: any, c: any) => {
                      const group = c.groupId || "General";
                      acc[group] = (acc[group] || 0) + (Number(c.balance) || 0);
                      return acc;
                    }, {})
                  ).map(([groupName, bal]: [string, any]) => {
                    const pct = totalBalance > 0 ? (bal / totalBalance) * 100 : 0;
                    return (
                      <div key={groupName} className="space-y-1">
                        <div className="flex justify-between font-medium text-slate-400">
                          <span>{groupName}</span>
                          <span className="font-mono text-slate-200">{pct.toFixed(0)}% ({bal} ৳)</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-indigo-500 h-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (2/3 width on desktop): Detailed customer interaction & orders */}
          <div className="lg:col-span-2 space-y-6">
            {selectedCustomerCRM ? (() => {
              const cust = selectedCustomerCRM;
              
              // Filter orders and sales belonging to this customer
              const custOrders = (orders || []).filter((o: any) => o.customerId === cust.id || o.customerName === cust.name);
              const custSales = (sales || []).filter((s: any) => s.customerId === cust.id || s.customerName === cust.name);

              // Calculate total spending (paid sales + due sales or orders)
              const approvedSales = custSales.filter((s: any) => s.status === "approved" || s.status === "completed" || s.status === "Paid" || !s.status);
              const totalSpentSales = approvedSales.reduce((acc: number, s: any) => acc + (Number(s.total) || 0), 0);
              
              // Total order counts
              const totalOrdersCount = custOrders.length + custSales.length;

              // Combined Order timeline sorted by date descending
              const combinedOrdersTimeline = [
                ...custOrders.map((o: any) => ({
                  id: o.id,
                  type: "Order (SR)",
                  date: o.date || o.createdAt?.split("T")[0] || "N/A",
                  total: o.total || o.grandTotal || 0,
                  items: o.items || [],
                  status: o.status || "Pending",
                  raw: o
                })),
                ...custSales.map((s: any) => ({
                  id: s.id,
                  type: "POS Direct Invoice",
                  date: s.date || "N/A",
                  total: s.total || s.totalAmount || 0,
                  items: s.items || [],
                  status: s.status === "approved" ? "Approved Invoice" : s.status === "pending_approval" ? "Pending Manager Approval" : s.status || "Approved",
                  raw: s
                }))
              ].sort((a, b) => b.date.localeCompare(a.date));

              return (
                <div className="space-y-6">
                  
                  {/* Customer Information Panel */}
                  <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-xs relative overflow-hidden">
                    {/* Visual Accent */}
                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 to-indigo-600" />
                    
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-2">
                      <div>
                        {/* Group ID pill */}
                        {cust.groupId ? (() => {
                          const colors = getGroupColors(cust.groupId);
                          return (
                            <span className={`px-2 py-0.5 text-[9px] font-black rounded border uppercase tracking-wider mb-2 inline-block ${colors.bg} ${colors.text} ${colors.border}`}>
                              {cust.groupId}
                            </span>
                          );
                        })() : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black rounded border uppercase tracking-wider mb-2 inline-block">
                            General Member
                          </span>
                        )}
                        <h3 className="text-xl font-black text-gray-950 flex items-center gap-2">
                          {cust.name}
                        </h3>
                        <p className="text-[10px] font-bold text-gray-400 mt-1 font-mono">কাস্টমার ইউআইডি: {cust.id}</p>
                      </div>

                      <div className="bg-amber-50 text-amber-900 border border-amber-200/60 rounded-2xl p-4 flex flex-col items-center justify-center text-center shrink-0 min-w-[140px] shadow-3xs hover:scale-[1.01] transition-transform">
                        <span className="text-[9px] font-black uppercase text-amber-700 tracking-wider">রানিং বকেয়া ব্যালেন্স</span>
                        <span className="text-xl font-mono font-black text-rose-600 mt-1">{cust.balance || 0} ৳</span>
                      </div>
                    </div>

                    {/* Detailed Card Contacts and Address Info as required */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 mt-6 border-t border-gray-100">
                      
                      {/* Phone Contact */}
                      <div className="p-3.5 bg-slate-50/60 rounded-2xl border border-gray-100/60 space-y-1">
                        <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-wider block">মোবাইল কন্টাক্ট</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-gray-800">{cust.phone || "যোগ করা হয়নি"}</span>
                        </div>
                        {cust.phone && (() => {
                          const cleanNumber = cust.phone.replace(/\D/g, "");
                          const formattedNumber = cleanNumber.startsWith("01") ? `88${cleanNumber}` : cleanNumber;
                          const message = encodeURIComponent(`আসসালামু আলাইকুম ${cust.name ?? ""}, সমীরা ট্রেডার্স থেকে আপনার সাথে যোগাযোগ করা হচ্ছে।`);
                          const whatsappUrl = `https://wa.me/${formattedNumber}?text=${message}`;
                          return (
                            <div className="flex flex-wrap gap-2 mt-1.5">
                              <a
                                href={`tel:${cust.phone}`}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[9px] font-black inline-flex items-center gap-0.5 transition-all cursor-pointer"
                              >
                                📞 কল করুন
                              </a>
                              <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-black inline-flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                              >
                                💬 Message Customer
                              </a>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Email Contact - explicit user requirement */}
                      <div className="p-3.5 bg-slate-50/60 rounded-2xl border border-gray-100/60 space-y-1">
                        <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-wider block">ইমেল কন্টাক্ট</span>
                        <span className="text-xs font-black text-gray-800 font-mono truncate block" title={cust.email}>
                          {cust.email || "যোগ করা হয়নি"}
                        </span>
                        {cust.email && (
                          <a
                            href={`mailto:${cust.email}`}
                            className="mt-1.5 w-max px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 rounded-lg text-[9px] font-black inline-flex items-center gap-0.5 transition-all cursor-pointer"
                          >
                            ✉️ ইমেল পাঠান
                          </a>
                        )}
                      </div>

                      {/* Address Contact - explicit user requirement */}
                      <div className="p-3.5 bg-slate-50/60 rounded-2xl border border-gray-100/60 space-y-1">
                        <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-wider block">ডেলিভারি ঠিকানা</span>
                        <p className="text-xs font-bold text-gray-800 leading-tight border-none bg-transparent p-0">
                          {cust.address || "ঠিকানা প্রদান করা হয়নি"}
                        </p>
                      </div>

                    </div>
                  </div>

                  {/* Customer Analytics KPI Counters */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="bg-white p-4 border rounded-2xl shadow-3xs">
                      <span className="text-[9px] text-gray-400 font-black uppercase tracking-wider block">মোট ক্রয় আদেশ</span>
                      <span className="text-base font-mono font-black text-indigo-950 mt-1 block">
                        {totalOrdersCount} টি
                      </span>
                    </div>
                    <div className="bg-white p-4 border rounded-2xl shadow-3xs">
                      <span className="text-[9px] text-gray-400 font-black uppercase tracking-wider block">মোট ক্রয়মূল্য</span>
                      <span className="text-base font-mono font-black text-emerald-600 mt-1 block">
                        {totalSpentSales} ৳
                      </span>
                    </div>
                    <div className="bg-white p-4 border rounded-2xl shadow-3xs col-span-2 sm:col-span-1">
                      <span className="text-[9px] text-gray-400 font-black uppercase tracking-wider block">গড় আদেশ সাইজ (Avg)</span>
                      <span className="text-base font-mono font-black text-slate-700 mt-1 block">
                        {totalOrdersCount > 0 ? Math.round(totalSpentSales / totalOrdersCount) : 0} ৳
                      </span>
                    </div>
                  </div>

                  {/* PAST ORDERS & SALES TIMELINE LEDGER - EXPLICIT USER MANDATE */}
                  <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-xs space-y-4">
                    <h4 className="text-xs font-black text-gray-950 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-gray-100">
                      ⏱️ পূর্ববর্তী অর্ডার ও বিক্রয় ইতিহাস (Order Ledger)
                    </h4>
                    
                    <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
                      {combinedOrdersTimeline.map((item, idx) => {
                        return (
                          <div key={item.id || idx} className="p-4 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-gray-150/40 transition-colors">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-gray-150/30">
                              <div>
                                <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded text-[9px] text-indigo-700 font-black tracking-wide mr-1.5 mt-1 inline-block">
                                  {item.type}
                                </span>
                                <span className="text-[10px] font-black text-slate-500 font-mono">আইডি: {item.id?.slice(0, 10).toUpperCase()}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-gray-400 font-bold">{item.date}</span>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black border ${
                                  item.status === 'delivered' || item.status === 'approved' || item.status === 'Approved' || item.status === 'Approved Invoice'
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                }`}>
                                  {item.status}
                                </span>
                              </div>
                            </div>

                            {/* Render Ordered items */}
                            <div className="pt-2.5 space-y-2">
                              {item.items && item.items.length > 0 ? (
                                <div className="space-y-1.5">
                                  {item.items.map((prod: any, pIdx: number) => {
                                    const qtyLabel = prod.cartons !== undefined || prod.pieces !== undefined
                                      ? `${prod.cartons || 0} কার্টন ${prod.pieces || 0} পিস`
                                      : `${prod.quantity || prod.qty || 0} পিস`;
                                    
                                    const rate = prod.price || prod.rate || 0;
                                    const prodTotal = prod.total || (Number(rate) * (prod.quantity || prod.totalPieces || 0));

                                    return (
                                      <div key={pIdx} className="flex justify-between items-center text-[11px] font-semibold text-gray-600">
                                        <span className="text-gray-900 truncate max-w-[200px]">📦 {prod.name || prod.productName}</span>
                                        <div className="flex gap-4 font-mono font-bold">
                                          <span>{qtyLabel} @ {rate}৳</span>
                                          <span className="text-indigo-600 font-black">{prodTotal} ৳</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-[11px] text-gray-400 font-bold">আইটেমের বিবরণ পাওয়া যায়নি</span>
                              )}

                              {/* Total footer */}
                              <div className="pt-2.5 mt-2.5 border-t border-dashed border-gray-200 flex justify-between items-center text-xs font-black">
                                <span className="text-gray-500 uppercase tracking-wide">সর্বমোট বিল মূল্য:</span>
                                <span className="font-mono text-indigo-700 text-sm">{item.total} ৳</span>
                              </div>
                            </div>

                          </div>
                        );
                      })}

                      {combinedOrdersTimeline.length === 0 && (
                        <div className="py-12 text-center text-gray-400 font-bold text-xs bg-slate-50/50 border border-dashed rounded-2xl">
                          এই কাস্টমারের কোনো পূর্ববর্তী অর্ডার বা ক্রয়ের রেকর্ড পাওয়া যায়নি।
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              );
            })() : (
              <div className="bg-white p-12 text-center text-gray-450 rounded-3xl border border-gray-150 shadow-xs flex flex-col items-center justify-center space-y-3 py-24">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-gray-100 flex items-center justify-center shadow-3xs">
                  <User className="w-8 h-8 text-indigo-400 animate-pulse" />
                </div>
                <h3 className="font-black text-gray-950 text-sm">কোনো কাস্টমার সিলেক্ট করা হয়নি</h3>
                <p className="text-xs font-semibold text-gray-500 max-w-sm leading-relaxed">
                  বামদিকের তালিকা থেকে যেকোনো কাস্টমার সিলেক্ট করুন, তাদের পূর্ণ পরিচিতি, যোগাযোগের তথ্য, ঠিকানা এবং পূর্ববর্তী অর্ডারের লগ দেখতে।
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Bulk Add Overlay */}
      {showBulk && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-2xl w-full rounded-3xl p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-black mb-1">বাল্ক এন্ট্রি (Bulk Entry)</h3>
            <div className="flex justify-between items-center mb-4">
              <p className="text-xs font-semibold text-gray-500">প্রতি লাইনে একটি করে স্টাফের তথ্য লিখুন। ফরম্যাট: নাম, ফোন, ঠিকানা, পদবী, মূলবেতন</p>
              <button onClick={downloadSampleCSV} className="text-blue-600 text-xs font-extrabold underline cursor-pointer">স্যাম্পল CSV ডাউনলোড</button>
            </div>
            <textarea 
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              placeholder="রহমান হোসেন, ০১৮xxxxxxxx , ঢাকা, DSR, ১২০০০"
              className="w-full h-80 border rounded-2xl p-4 font-mono text-xs mb-4 focus:ring-2 focus:ring-indigo-300"
            />
            <div className="flex gap-4">
              <button onClick={() => setShowBulk(false)} className="flex-1 border py-3 rounded-xl font-bold text-xs cursor-pointer">বাতিল</button>
              <button 
                onClick={handleBulkSave}
                disabled={!bulkText.trim()}
                className="flex-1 btn-primary py-3 font-black text-xs disabled:opacity-50 cursor-pointer"
              >
                সবগুলো একত্রে সেভ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Overlay */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-black mb-4">নতুন {getTypeName()} তথ্য সংগ্রহ</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">পূর্ণ নাম</label>
                <input name="name" required className="w-full border border-gray-200 rounded-xl p-2.5 font-bold" />
              </div>
              
              {type === "staff" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">পদবী (Role)</label>
                    <select name="role" required className="w-full border border-gray-200 rounded-xl p-2.5 bg-white text-xs font-bold">
                      <option value="DSR">DSR (Delivery)</option>
                      <option value="SR">SR (Order Collector)</option>
                      <option value="Manager">Manager</option>
                      <option value="Admin">Admin (অ্যাডমিন)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">মাসিক মূল বেতন</label>
                    <input name="salary" type="number" placeholder="12000" className="w-full border border-gray-200 rounded-xl p-2.5 font-mono font-bold" />
                  </div>
                </div>
              )}

              {type === "route" && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">এরিয়া (Area)</label>
                  <input name="area" placeholder="উদা: মতিঝিল" className="w-full border border-gray-200 rounded-xl p-2.5" />
                </div>
              )}

              {type === "customer" && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">কাস্টমার গ্রুপ (বাধ্যতামূলক) *</label>
                  <select name="groupId" required className="w-full border border-gray-200 rounded-xl p-2.5 bg-white font-bold text-xs">
                    <option value="">নির্বাচন করুন</option>
                    {getDynamicGroups().map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              )}

              {type !== "route" && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">মোবাইল নম্বর</label>
                    <input name="phone" placeholder="01XXXXXXXXX" className="w-full border border-gray-200 rounded-xl p-2.5 font-mono" />
                  </div>
                  {type === "customer" && (
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">ইমেইল ঠিকানা</label>
                      <input name="email" type="email" placeholder="customer@example.com" className="w-full border border-gray-200 rounded-xl p-2.5 font-mono text-sm font-semibold" />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">ঠিকানা</label>
                    <textarea name="address" className="w-full border border-gray-200 rounded-xl p-2.5 h-20 text-xs" />
                  </div>
                </>
              )}

              <div className="flex gap-4 pt-4 border-t border-gray-100">
                <button type="button" disabled={isSaving} onClick={() => setShowAdd(false)} className="flex-1 border py-3 rounded-xl font-bold text-xs cursor-pointer disabled:opacity-50">বাতিল</button>
                <button type="submit" disabled={isSaving} className="flex-1 btn-primary py-3 font-black text-xs cursor-pointer disabled:opacity-50 flex items-center justify-center">
                  {isSaving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal Overlay */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-black mb-4">{getTypeName()} তথ্য সম্পাদনা (Edit)</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (isUpdating || !update) return;
              setIsUpdating(true);
              try {
                const formData = new FormData(e.currentTarget);
                const updated: any = {
                  name: formData.get("name") as string,
                };

                if (type !== "route") {
                  updated.phone = formData.get("phone") as string;
                  updated.address = formData.get("address") as string;
                  if (type === "customer") {
                    updated.email = formData.get("email") as string;
                  }
                }

                if (type === "staff") {
                  updated.role = formData.get("role") as string;
                  updated.salary = Number(formData.get("salary") || 0);
                }

                if (type === "route") {
                  updated.area = formData.get("area") as string;
                }

                if (type === "customer") {
                  updated.groupId = formData.get("groupId") as string;
                  updated.balance = Number(formData.get("balance") || 0);
                }

                await update(editingItem.id, updated);
                toast.success(`${getTypeName()} তথ্য সফলভাবে আপডেট করা হয়েছে!`);
                setEditingItem(null);
              } catch (err: any) {
                console.error(err);
                toast.error("আপডেট করতে সমস্যা হয়েছে: " + err.message);
              } finally {
                setIsUpdating(false);
              }
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 api-form-label mb-1 uppercase tracking-wider">পূর্ণ নাম</label>
                <input name="name" required defaultValue={editingItem.name} className="w-full border border-gray-200 rounded-xl p-2.5 font-bold focus:ring-2 focus:ring-black outline-none bg-gray-50 focus:bg-white transition-all text-sm" />
              </div>
              
              {type === "staff" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 api-form-label mb-1 uppercase tracking-wider">পদবী (Role)</label>
                    <select name="role" required defaultValue={editingItem.role || "DSR"} className="w-full border border-gray-200 rounded-xl p-2.5 bg-white text-xs font-bold focus:ring-2 focus:ring-black outline-none transition-all">
                      <option value="DSR">DSR (Delivery)</option>
                      <option value="SR">SR (Order Collector)</option>
                      <option value="Manager">Manager</option>
                      <option value="Admin">Admin (অ্যাডমিন)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 api-form-label mb-1 uppercase tracking-wider">মাসিক মূল বেতন</label>
                    <input name="salary" type="number" defaultValue={editingItem.salary} className="w-full border border-gray-200 rounded-xl p-2.5 font-mono font-bold focus:ring-2 focus:ring-black outline-none bg-gray-50 focus:bg-white transition-all text-sm" />
                  </div>
                </div>
              )}

              {type === "route" && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 api-form-label mb-1 uppercase tracking-wider">এরিয়া (Area)</label>
                  <input name="area" defaultValue={editingItem.area} placeholder="উদা: মতিঝিল" className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-black outline-none bg-gray-50 focus:bg-white transition-all text-sm" />
                </div>
              )}

              {type === "customer" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 api-form-label mb-1 uppercase tracking-wider">কাস্টমার গ্রুপ *</label>
                    <select name="groupId" required defaultValue={editingItem.groupId || ""} className="w-full border border-gray-250 rounded-xl p-2.5 bg-white font-bold text-xs focus:ring-2 focus:ring-black outline-none transition-all">
                      <option value="">নির্বাচন করুন</option>
                      {getDynamicGroups().map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 api-form-label mb-1 uppercase tracking-wider">পূর্বের বাকি (টাকা)</label>
                    <input name="balance" type="number" defaultValue={editingItem.balance || 0} className="w-full border border-gray-250 rounded-xl p-2.5 font-mono font-bold focus:ring-2 focus:ring-black outline-none bg-gray-50 focus:bg-white transition-all text-sm" />
                  </div>
                </div>
              )}

              {type !== "route" && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 api-form-label mb-1 uppercase tracking-wider">মোবাইল নম্বর</label>
                    <input name="phone" defaultValue={editingItem.phone} placeholder="01XXXXXXXXX" className="w-full border border-gray-200 rounded-xl p-2.5 font-mono focus:ring-2 focus:ring-black outline-none bg-gray-50 focus:bg-white transition-all text-sm" />
                  </div>
                  {type === "customer" && (
                    <div>
                      <label className="block text-xs font-bold text-gray-400 api-form-label mb-1 uppercase tracking-wider">ইমেইল ঠিকানা</label>
                      <input name="email" type="email" defaultValue={editingItem.email || ""} placeholder="customer@example.com" className="w-full border border-gray-200 rounded-xl p-2.5 font-mono focus:ring-2 focus:ring-black outline-none bg-gray-50 focus:bg-white transition-all text-sm font-semibold" />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 api-form-label mb-1 uppercase tracking-wider">ঠিকানা</label>
                    <textarea name="address" defaultValue={editingItem.address} className="w-full border border-gray-200 rounded-xl p-2.5 h-20 text-xs focus:ring-2 focus:ring-black outline-none bg-gray-50 focus:bg-white transition-all" />
                  </div>
                </>
              )}

              <div className="flex gap-4 pt-4 border-t border-gray-100">
                <button type="button" disabled={isUpdating} onClick={() => setEditingItem(null)} className="flex-1 border py-3 rounded-xl font-bold text-xs cursor-pointer disabled:opacity-50 hover:bg-gray-50 transition-colors">বাতিল</button>
                <button type="submit" disabled={isUpdating} className="flex-1 btn-primary py-3 font-black text-xs cursor-pointer disabled:opacity-50 flex items-center justify-center">
                  {isUpdating ? "আপডেট হচ্ছে..." : "সংরক্ষণ করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 💬 BULK WHATSAPP MESSAGE MODAL WITH DYNAMIC TEMPLATE RENDERING */}
      {showBulkMessageModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs animate-in fade-in duration-250">
          <div className="bg-white rounded-3xl max-w-4xl w-full border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 bg-indigo-650 text-white">
              <div className="flex items-center gap-2.5">
                <div className="bg-white/15 p-2 rounded-xl">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="lg:text-sm text-xs font-black uppercase tracking-wider">কাস্টমার বাল্ক হোয়াটসঅ্যাপ স্যান্ডার</h3>
                  <p className="text-[10px] text-indigo-100 font-bold mt-0.5">গ্রাহকদের কাছে সহজে ও নির্ভুলভাবে বকেয়া বা নোটিশের তথ্য হোয়াটসঅ্যাপে পাঠান</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowBulkMessageModal(false)} 
                className="p-1.5 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto divide-y lg:divide-y-0 lg:grid lg:grid-cols-5 gap-6 flex-1 bg-slate-50/50">
              {/* Template settings (Col 2/5) */}
              <div className="lg:col-span-2 space-y-4 pb-6 lg:pb-0">
                <div className="bg-white rounded-2xl p-4 border border-gray-150 shadow-3xs space-y-3">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest pb-1 border-b">
                    📝 মেসেজ টেমপ্লেট তৈরি করুন
                  </h4>
                  <div className="text-[11px] font-bold text-gray-550 leading-relaxed bg-indigo-50/40 p-2.5 rounded-xl border border-indigo-100/50">
                    মেসেজ বডিতে নিম্নোক্ত ডাইনামিক ভেরিয়েবলগুলো ব্যবহার করতে পারেন:
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setBulkMessageTemplate(p => p + "{name}")}
                        className="px-2 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-black cursor-pointer active:scale-95 transition-all"
                        title="গ্রাহকের নাম বসাতে ক্লিক করুন"
                      >
                        {"{name}"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkMessageTemplate(p => p + "{balance}")}
                        className="px-2 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-black cursor-pointer active:scale-95 transition-all"
                        title="বকেয়ার পরিমাণ বসাতে ক্লিক করুন"
                      >
                        {"{balance}"}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase font-black text-gray-400">মেসেজ কন্টেন্ট</label>
                    <textarea
                      value={bulkMessageTemplate}
                      onChange={(e) => setBulkMessageTemplate(e.target.value)}
                      placeholder="মেসেজ টেমপ্লেট লিখুন..."
                      className="w-full border border-gray-200 rounded-xl p-3 h-44 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 focus:bg-white"
                    />
                  </div>

                  {/* Sample message preview */}
                  <div className="bg-slate-900 text-slate-200 rounded-xl p-3.5 space-y-2">
                    <span className="text-[9px] font-black uppercase text-indigo-400 tracking-wider">রেন্ডারড মেসেজ প্রিভিউ (নমুনা)</span>
                    <p className="text-[11px] font-medium leading-relaxed whitespace-pre-wrap selection:bg-indigo-500 font-sans">
                      {data.length > 0 
                        ? bulkMessageTemplate
                            .replace(/{name}/g, data[0].name || "ফরহাদ হোসেন")
                            .replace(/{balance}/g, String(data[0].balance || 4500))
                        : "মেসেজ লিখলে এখানে প্রিভিউ দেখা যাবে।"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Queue Lists & Actions (Col 3/5) */}
              <div className="lg:col-span-3 space-y-4 pt-6 lg:pt-0">
                {(() => {
                  const selectedProfiles = data.filter(c => selectedCustomersForBulk.includes(c.id));
                  const sentCount = selectedProfiles.filter(p => bulkSentStatus[p.id] === "sent").length;
                  const totalCount = selectedProfiles.length;
                  const pct = totalCount > 0 ? (sentCount / totalCount) * 100 : 0;

                  return (
                    <div className="bg-white rounded-2xl p-4 border border-gray-150 shadow-3xs space-y-4">
                      {/* Stats Overview */}
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">
                          📋 প্রাপক তালিকা এবং অগ্রগতি
                        </h4>
                        <span className="text-[11px] font-mono font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl">
                          {sentCount} / {totalCount} প্রেরিত ({pct.toFixed(0)}%)
                        </span>
                      </div>

                      {/* Progress Line */}
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border">
                        <div 
                          className="bg-emerald-500 h-full transition-all duration-300" 
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      {/* Scrollable customers list */}
                      <div className="space-y-4 max-h-[380px] overflow-y-auto divide-y divide-gray-100 pr-1">
                        {selectedProfiles.map((customer, idx) => {
                          const customText = bulkMessageTemplate
                            .replace(/{name}/g, customer.name || "")
                            .replace(/{balance}/g, String(customer.balance || 0));
                          const isSent = bulkSentStatus[customer.id] === "sent";

                          // Format phone number helper
                          let cleanNumber = (customer.phone || "").replace(/\D/g, "");
                          if (cleanNumber.length === 11 && cleanNumber.startsWith("01")) {
                            cleanNumber = "88" + cleanNumber;
                          }
                          const directUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(customText)}`;

                          return (
                            <div key={customer.id} className="pt-3 first:pt-0 flex flex-col gap-2.5">
                              <div className="flex justify-between items-start gap-4">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-mono text-[10px] font-black text-gray-400 bg-gray-100 w-5 h-5 rounded-full flex items-center justify-center">
                                      {idx + 1}
                                    </span>
                                    <span className="font-black text-xs text-gray-900 truncate max-w-[150px]">
                                      {customer.name}
                                    </span>
                                    {customer.groupId && (
                                      <span className="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded bg-slate-100 text-gray-500 border">
                                        {customer.groupId}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] font-bold text-gray-400 font-mono mt-0.5">
                                    ফোন: {customer.phone || "N/A"} | বাকী: <span className="text-rose-600 font-black">{customer.balance || 0} ৳</span>
                                  </p>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={`px-2 py-0.5 text-[9px] font-black rounded border ${
                                    isSent 
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-250" 
                                      : "bg-amber-50 text-amber-700 border-amber-200"
                                  }`}>
                                    {isSent ? "✅ প্রেরিত" : "🟡 পাঠানো হয়নি"}
                                  </span>
                                  
                                  <button
                                    type="button"
                                    onClick={() => setSelectedCustomersForBulk(prev => prev.filter(id => id !== customer.id))}
                                    className="p-1 hover:bg-rose-50 hover:text-red-600 text-gray-400 border border-transparent hover:border-rose-100 rounded-lg transition-colors cursor-pointer"
                                    title="প্রাপক তালিকা থেকে বাদ দিন"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="bg-slate-50/60 rounded-xl p-2.5 border border-dashed border-slate-200 text-[10.5px] font-bold text-gray-650 whitespace-pre-wrap leading-relaxed">
                                {customText}
                              </div>

                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(customText);
                                    toast.success(`${customer.name}-এর জন্য মেসেজ কপি করা হয়েছে!`);
                                  }}
                                  className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-750 border rounded-lg text-[10px] font-extrabold transition-all cursor-pointer flex items-center gap-1"
                                >
                                  📋 মেসেজ কপি
                                </button>

                                <a
                                  href={directUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => {
                                    setBulkSentStatus(prev => ({ ...prev, [customer.id]: "sent" }));
                                  }}
                                  className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer shadow-3xs text-white ${
                                    isSent 
                                      ? "bg-emerald-600 hover:bg-emerald-700" 
                                      : "bg-[#25D366] hover:bg-[#20ba59]"
                                  }`}
                                >
                                  💬 {isSent ? "আবার পাঠান" : "হোয়াটসঅ্যাপে পাঠান"}
                                </a>
                              </div>
                            </div>
                          );
                        })}

                        {selectedProfiles.length === 0 && (
                          <div className="p-12 text-center text-gray-400 font-bold text-xs border border-dashed rounded-xl">
                            কোন কাস্টমার সিলেক্ট করা হয়নি। বাম তালিকা বা সার্চ রেজাল্ট থেকে নির্বাচন করুন।
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
              <span className="text-[11px] font-bold text-gray-400">সমীরা ট্রেডার্স বাল্ক ডাইনামিক নোটিফিকেশন সিস্টেম v1.0</span>
              
              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    confirmDelete({
                      title: "সম্পূর্ণ ডেটা রিসেট নিশ্চিতকরণ",
                      recordName: "বাল্ক কাস্টমার কিউ",
                      warning: "আপনি কি নিশ্চিতভাবে আপনার সকল সিলেক্টেড কাস্টমার কিউ এবং স্যান্ড স্ট্যাটাস রিসেট করতে চান?",
                      onConfirm: async () => {
                        setSelectedCustomersForBulk([]);
                        setBulkSentStatus({});
                        setShowBulkMessageModal(false);
                        toast.success("বাল্ক কিউ রিসেট করা হয়েছে!");
                      }
                    });
                  }}
                  className="flex-1 sm:flex-initial py-2.5 px-4 border text-red-650 hover:bg-rose-50 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  🧹 রিসেট এবং বন্ধ করুন
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkMessageModal(false)}
                  className="flex-1 sm:flex-initial py-2.5 px-5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl font-black text-xs transition-all cursor-pointer shadow-2xs"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 💵 PAYMENT RECEIVE MODAL (টাকা গ্রহণ / রিসিভ) */}
      {showPaymentInModal && selectedCustomer && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="text-base font-black text-emerald-700 flex items-center gap-2">
                <ArrowUpCircle className="w-5 h-5 text-emerald-600" /> কাস্টমার কালেকশন (রিসিভ)
              </h3>
              <button onClick={() => setShowPaymentInModal(false)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-extrabold text-gray-400">কাস্টমার নাম:</span>
                <p className="text-sm font-black text-gray-900">{selectedCustomer.name}</p>
                <p className="text-[10px] font-bold text-red-500 font-mono">পূর্বের বকেয়া: {selectedCustomer.balance || 0} ৳</p>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-black text-gray-400 mb-1">তারিখ</label>
                <input 
                  type="date" 
                  value={payDate} 
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-black text-gray-400 mb-1">অর্থের পরিমাণ (৳)</label>
                <input 
                  type="number" 
                  placeholder="0.00" 
                  value={payAmount} 
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full border rounded-xl p-2.5 font-mono font-black text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-black text-gray-400 mb-1">পেমেন্ট মেথড</label>
                  <select 
                    value={payMethod} 
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full border rounded-xl p-2.5 text-xs font-bold focus:outline-none"
                  >
                    <option value="Cash">Cash (নগদ)</option>
                    <option value="bKash">bKash (বিকাশ)</option>
                    <option value="Rocket">Rocket (রকেট)</option>
                    <option value="Nagad">Nagad (নগদ)</option>
                    <option value="Bank Transfer">Bank (ব্যাংক ট্রান্সফার)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-black text-gray-400 mb-1">হিসাব খাত (Account)</label>
                  <select 
                    value={payAccountId} 
                    onChange={(e) => setPayAccountId(e.target.value)}
                    className="w-full border rounded-xl p-2.5 text-xs font-bold focus:outline-none"
                  >
                    {accounts.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.name || a.id}</option>
                    ))}
                    {accounts.length === 0 && <option value="cash">کاش (Cash)</option>}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-black text-gray-400 mb-1">মন্তব্য (নোট)</label>
                <textarea 
                  placeholder="কালেকশন সংক্রান্ত বিবরণ..." 
                  value={payNote} 
                  onChange={(e) => setPayNote(e.target.value)}
                  className="w-full border rounded-xl p-2 h-16 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t">
              <button 
                onClick={() => setShowPaymentInModal(false)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold rounded-xl text-xs transition-all cursor-pointer"
                disabled={isSubmitting}
              >
                বাতিল
              </button>
              <button 
                onClick={handleSavePaymentIn}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "জমা করুন"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 💸 PAYMENT REFUND MODAL (টাকা পরিশোধ / পেমেন্ট) */}
      {showPaymentOutModal && selectedCustomer && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="text-base font-black text-rose-700 flex items-center gap-2">
                <ArrowDownCircle className="w-5 h-5 text-rose-600" /> টাকা ফেরত / পরিশোধ (পেমেন্ট)
              </h3>
              <button onClick={() => setShowPaymentOutModal(false)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-extrabold text-gray-400">কাস্টমার নাম:</span>
                <p className="text-sm font-black text-gray-900">{selectedCustomer.name}</p>
                <p className="text-[10px] font-bold text-red-500 font-mono">পূর্বের বকেয়া: {selectedCustomer.balance || 0} ৳</p>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-black text-gray-400 mb-1">তারিখ</label>
                <input 
                  type="date" 
                  value={payDate} 
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-black text-gray-400 mb-1">অর্থের পরিমাণ (৳)</label>
                <input 
                  type="number" 
                  placeholder="0.00" 
                  value={payAmount} 
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full border rounded-xl p-2.5 font-mono font-black text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-black text-gray-400 mb-1">পেমেন্ট মেথড</label>
                  <select 
                    value={payMethod} 
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full border rounded-xl p-2.5 text-xs font-bold focus:outline-none"
                  >
                    <option value="Cash">Cash (নগদ)</option>
                    <option value="bKash">bKash (বিকাশ)</option>
                    <option value="Nagad">Nagad (নগদ)</option>
                    <option value="Bank Transfer">Bank (ব্যাংক ট্রান্সফার)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-black text-gray-400 mb-1">হিসাব খাত (Account)</label>
                  <select 
                    value={payAccountId} 
                    onChange={(e) => setPayAccountId(e.target.value)}
                    className="w-full border rounded-xl p-2.5 text-xs font-bold focus:outline-none"
                  >
                    {accounts.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.name || a.id}</option>
                    ))}
                    {accounts.length === 0 && <option value="cash">ক্যাশ (Cash)</option>}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-black text-gray-400 mb-1">মন্তব্য (নোট)</label>
                <textarea 
                  placeholder="পরিশোধ সংক্রান্ত নোট..." 
                  value={payNote} 
                  onChange={(e) => setPayNote(e.target.value)}
                  className="w-full border rounded-xl p-2 h-16 text-xs focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t">
              <button 
                onClick={() => setShowPaymentOutModal(false)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold rounded-xl text-xs transition-all cursor-pointer"
                disabled={isSubmitting}
              >
                বাতিল
              </button>
              <button 
                onClick={handleSavePaymentOut}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "পরিশোধ করুন"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🛒 DIRECT SALE MODAL WITH DISCOUNTS & FREE SCHEMES */}
      {showDirectSaleModal && selectedCustomer && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 overflow-y-auto backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full border shadow-2xl my-8 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="text-base font-black text-indigo-850 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-indigo-600" /> সরাসরি বাকিতে বিক্রয় (মেগা-ফরম্যাট)
              </h3>
              <button onClick={() => setShowDirectSaleModal(false)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Meta information */}
              <div>
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-gray-400">ক্রেতা কাস্টমার:</span>
                <p className="text-sm font-black text-gray-900">{selectedCustomer.name}</p>
                <p className="text-[10px] font-bold text-red-500">চলতি বাকি: {selectedCustomer.balance || 0} ৳</p>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-black text-gray-450 mb-0.5">বিক্রয় তারিখ</label>
                <input 
                  type="date" 
                  value={saleDate} 
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full border rounded-xl p-2 text-xs font-bold"
                />
              </div>
            </div>

            {/* PRODUCT ADD FORM */}
            <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-2xl space-y-3">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#4F46E5] bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">পণ্য যোগ করুন</span>
              
              <div className="relative">
                <label className="block text-xs font-black text-gray-500 mb-1">পণ্য সার্চ করুন বা নির্বাচন করুন</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="পণ্য খুঁজুন (নাম বা টাইপ করুন)..."
                    value={productSearchQuery}
                    onChange={(e) => {
                      setProductSearchQuery(e.target.value);
                      setShowProductDropdown(true);
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    className="w-full pl-9 pr-8 py-2.5 border border-gray-250 bg-white rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {productSearchQuery && (
                    <button 
                      type="button" 
                      onClick={() => setProductSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {showProductDropdown && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-250 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-gray-100 z-50 p-1">
                    {products
                      .filter((p: any) =>
                        p.name?.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
                        p.id?.toLowerCase().includes(productSearchQuery.toLowerCase())
                      )
                      .map((p: any) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedSaleProduct(p.id);
                            setCustomItemRate(p.price || p.tradePrice || 0);
                            setInputCartons("");
                            setInputPieces("");
                            setInputFree("");
                            setItemDiscount("");
                            setItemDiscountType("flat");
                            setProductSearchQuery("");
                            setShowProductDropdown(false);
                          }}
                          className="w-full text-left p-2.5 hover:bg-slate-50 rounded-lg flex justify-between items-center transition-colors cursor-pointer"
                        >
                          <div>
                            <p className="font-extrabold text-xs text-gray-900">{p.name}</p>
                            <p className="text-[10px] text-gray-400 font-bold">স্টক: {p.stock || 0} পিস | কার্টুন সাইজ: {p.cartoonSize || p.piecesInCarton || 1} পিস</p>
                          </div>
                          <span className="font-mono text-[11px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                            {p.price || p.tradePrice || 0} ৳
                          </span>
                        </button>
                      ))}
                    {products.filter((p: any) =>
                      p.name?.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
                      p.id?.toLowerCase().includes(productSearchQuery.toLowerCase())
                    ).length === 0 && (
                      <div className="p-4 text-center text-gray-400 text-xs font-bold">
                        কোনো পণ্য পাওয়া যায়নি!
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 📦 BEAUTIFUL PRODUCT QUANTITY CONFIGURATION SUBMODAL OVERLAY (SECOND IMAGE) */}
            {selectedSaleProduct && configProduct && (
              <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                <div className="bg-white rounded-3xl p-6 max-w-sm w-full border shadow-2xl space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-base font-black text-gray-900 leading-tight">{configProduct.name}</h4>
                      <p className="text-xs text-gray-400 font-bold mt-1">
                        ১ কার্টুন = {configCSize} পিস | স্টক: {configProduct.stock || 0} পিস
                      </p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setSelectedSaleProduct("")} 
                      className="p-1.5 hover:bg-gray-100 border rounded-full text-gray-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    {/* কার্টুন (CTN) */}
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 mb-1">কার্টুন (CTN)</label>
                      <input
                        type="number"
                        placeholder="যেমনঃ ৫"
                        value={inputCartons}
                        onChange={(e) => setInputCartons(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl p-2.5 text-xs font-black text-center font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    {/* পিস (PCS) */}
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 mb-1">পিস (PCS)</label>
                      <input
                        type="number"
                        placeholder="যেমনঃ ১০"
                        value={inputPieces}
                        onChange={(e) => setInputPieces(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl p-2.5 text-xs font-black text-center font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    {/* ফ্রি প্রোডাক্ট (PCS) */}
                    <div>
                      <label className="block text-[11px] font-black text-[#E03131] mb-1">ফ্রি প্রোডাক্ট (PCS)</label>
                      <input
                        type="number"
                        placeholder="যেমনঃ ২"
                        value={inputFree}
                        onChange={(e) => setInputFree(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl p-2.5 text-xs font-black text-center font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none text-rose-600 bg-rose-50/10 border-rose-100"
                      />
                    </div>

                    {/* ডিসকাউন্ট (৳ - টাকা) */}
                    <div>
                      <label className="block text-[11px] font-black text-emerald-705 mb-1">ডিসকাউন্ট (৳ - টাকা)</label>
                      <input
                        type="number"
                        placeholder="যেমনঃ ৫০"
                        value={itemDiscount}
                        onChange={(e) => setItemDiscount(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl p-2.5 text-xs font-black text-center font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none text-emerald-600 bg-emerald-50/10 border-emerald-100"
                      />
                    </div>
                  </div>

                  {/* দাম / রেট (প্রতি পিস) */}
                  <div className="pt-0.5">
                    <label className="block text-[11px] font-black text-slate-500 mb-1">দাম / রেট (প্রতি পিস)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={customItemRate}
                      onChange={(e) => setCustomItemRate(e.target.value)}
                      className="w-full border border-gray-250 rounded-xl p-2.5 text-xs font-black text-center font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50"
                    />
                  </div>

                  {/* CALCULATION OVERVIEW CARD */}
                  <div className="border border-gray-150 rounded-2xl p-4 bg-slate-50/50 space-y-2.5 text-xs font-bold text-gray-500">
                    <div className="flex justify-between items-center">
                      <span>মোট পরিমাণ:</span>
                      <span className="text-gray-900 font-mono font-black">{configTotalPieces} পিস</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-gray-100 pt-2">
                      <span>মোট গ্রস মূল্য:</span>
                      <span className="text-gray-900 font-mono font-black">{configGrossTotal.toFixed(2)} ৳</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-gray-200 pt-2 font-black text-sm text-emerald-600">
                      <span>চূড়ান্ত মূল্য (লাইনের মাথায়):</span>
                      <span className="font-mono text-emerald-600 font-extrabold">{configLineTotal.toFixed(2)} ৳</span>
                    </div>
                  </div>

                  {/* SUBMODAL FOOTER ACTION BUTTONS */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedSaleProduct("")}
                      className="py-3 border border-gray-200 hover:bg-slate-50 text-gray-700 font-extrabold rounded-xl text-xs transition-colors cursor-pointer text-center"
                    >
                      বাতিল করুন
                    </button>
                    <button
                      type="button"
                      onClick={handleAddProductToSaleBasket}
                      className="py-3 bg-slate-950 hover:bg-black text-white font-black rounded-xl text-xs transition-colors cursor-pointer text-center shadow-md"
                    >
                      পণ্য যোগ করুন
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* CART BASKET ITEMS LIST */}
            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase text-gray-400">বর্তমানে ঝুড়িতে থাকা পণ্যসমূহ ({saleItems.length})</span>
              <div className="border rounded-2xl overflow-hidden bg-white max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b text-[10px] font-extrabold text-slate-500 uppercase">
                      <th className="p-2.5 pl-4">পণ্য</th>
                      <th className="p-2.5 text-center font-mono">টি.পি (৳)</th>
                      <th className="p-2.5 text-center">পরিমাণ</th>
                      <th className="p-2.5 text-center text-red-500">ফ্রি</th>
                      <th className="p-2.5 text-center text-emerald-600">ডিসকাউন্ট</th>
                      <th className="p-2.5 text-right font-mono pr-4">মোট (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-slate-700">
                    {saleItems.map((item, idx) => (
                      <tr key={item.productId} className="hover:bg-slate-50/50">
                        <td className="p-2.5 pl-4">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setSaleItems(saleItems.filter(x => x.productId !== item.productId))} 
                              className="text-red-500 hover:text-red-700 font-bold"
                              title="বাদ দিন"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-extrabold text-slate-900">{item.name}</span>
                          </div>
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold">{item.rate} ৳</td>
                        <td className="p-2.5 text-center font-mono text-indigo-700 font-extrabold">
                          {item.cartons > 0 && `${item.cartons} C `}
                          {item.pieces > 0 && `${item.pieces} P`}
                          <span className="text-[10px] text-gray-400 block font-normal">({item.totalPieces} পিস)</span>
                        </td>
                        <td className="p-2.5 text-center text-red-600 font-extrabold font-mono">{item.freeQty || 0}</td>
                        <td className="p-2.5 text-center text-emerald-600 font-extrabold font-mono">
                          {item.discount > 0 ? `-${item.calculatedDiscount} ৳` : "-"}
                          {item.discount > 0 && <span className="text-[9px] text-[#A6ADB8] block font-semibold">({item.discount}{item.discountType === 'percent' ? '%' : '৳'})</span>}
                        </td>
                        <td className="p-2.5 text-right font-mono font-black text-slate-950 pr-4">{item.total} ৳</td>
                      </tr>
                    ))}
                    {saleItems.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-450 font-bold text-xs">
                          ঝুড়ি সম্পূর্ণ খালি! পণ্য সিলেক্ট করে অ্যাড করুন।
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CHECKOUT SUMMARY */}
            <div className="bg-indigo-50/10 p-4 border border-indigo-100/50 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1 uppercase tracking-wide">ইনভয়েস অতিরিক্ত ডিসকাউন্ট (৳)</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 w-4 h-4 shrink-0" />
                  <input 
                    type="number" 
                    placeholder="Flat ৳" 
                    value={grandDiscount} 
                    onChange={(e) => setGrandDiscount(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border rounded-xl font-mono text-xs font-black text-emerald-600"
                  />
                </div>
              </div>
              <div className="flex flex-col items-end justify-center">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase">মোট বিক্রয় সাবটোটাল: {handleSumSaleTotal} ৳</span>
                <span className="text-[10px] font-extrabold text-emerald-600 uppercase">ডিসকাউন্ট বাদ দিয়ে: {handleSumGrandTotal} ৳</span>
                <span className="text-sm font-black text-slate-900 mt-1 uppercase">বাকী ব্যালেন্স যুক্ত হবে: <span className="text-red-600 font-mono text-base">{handleSumGrandTotal} ৳</span></span>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t">
              <button 
                onClick={() => setShowDirectSaleModal(false)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold rounded-xl text-xs transition-all cursor-pointer"
                disabled={isSubmitting}
              >
                বাতিল করুন
              </button>
              <button 
                onClick={handleSaveDirectSale}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1"
                disabled={isSubmitting || saleItems.length === 0}
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "বিক্রয় সেভ করুন (Save Sale)"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
