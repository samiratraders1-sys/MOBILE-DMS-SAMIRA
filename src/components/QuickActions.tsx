import React, { useState, useMemo } from "react";
import { recordStockMovement } from "../lib/inventoryEngine";
import { MovementType } from "../lib/stockMovement";
import { Plus, X, ShoppingBag, Truck, DollarSign, Trash2, Loader2, Sparkles, Calendar, User, Wallet } from "lucide-react";
import QuickReceipt from "./QuickReceipt";
import toast from "react-hot-toast";


interface QuickActionsProps {
  products: any[];
  updateProduct: (id: string, data: any) => Promise<any>;
  addSale: (data: any) => Promise<any>;
  addPurchase: (data: any) => Promise<any>;
  addPayment: (data: any) => Promise<any>;
  customers: any[];
  updateCustomer: (id: string, data: any) => Promise<any>;
  suppliers: any[];
  routes: any[];
  accounts: any[];
  staff: any[];
  user: any;
  role: string;
}

interface SaleCartItem {
  productId: string;
  cartons: number;
  pieces: number;
  rate: number;
  freeQty: number;
  discount: number;
}

interface PurchaseCartItem {
  productId: string;
  cartons: number;
  pieces: number;
  purchasePrice: number;
}

export default function QuickActions({
  products,
  updateProduct,
  addSale,
  addPurchase,
  addPayment,
  customers,
  updateCustomer,
  suppliers,
  routes,
  accounts,
  staff,
  user,
  role,
}: QuickActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<"sale" | "purchase" | "expense" | "payment" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ----------------------------------------------------
  // --- STATE FOR QUICK SALE FORM ---
  // ----------------------------------------------------
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [saleCustomer, setSaleCustomer] = useState("");
  const [saleRoute, setSaleRoute] = useState("");
  const [saleCart, setSaleCart] = useState<SaleCartItem[]>([]);
  const [selectedProductToAddSale, setSelectedProductToAddSale] = useState("");
  const [salePaidAmount, setSalePaidAmount] = useState<number | null>(null);
  const [saleAccount, setSaleAccount] = useState("");

  // ----------------------------------------------------
  // --- STATE FOR QUICK PURCHASE FORM ---
  // ----------------------------------------------------
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [purchaseSupplier, setPurchaseSupplier] = useState("");
  const [purchaseInvoiceId, setPurchaseInvoiceId] = useState("");
  const [purchaseCart, setPurchaseCart] = useState<PurchaseCartItem[]>([]);
  const [selectedProductToAddPurchase, setSelectedProductToAddPurchase] = useState("");
  const [purchasePaidAmount, setPurchasePaidAmount] = useState<number | null>(null);
  const [purchaseAccount, setPurchaseAccount] = useState("");

  // ----------------------------------------------------
  // --- STATE FOR QUICK EXPENSE FORM ---
  // ----------------------------------------------------
  const [expDate, setExpDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState("Office Operation");
  const [expDescription, setExpDescription] = useState("");
  const [expMethod, setExpMethod] = useState("Cash");
  const [expAccount, setExpAccount] = useState("");
  const [expEntity, setExpEntity] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentCustomer, setPaymentCustomer] = useState("");
  const [paymentAccount, setPaymentAccount] = useState("");
  const [paymentDescription, setPaymentDescription] = useState("");
  const [generatedReceipt, setGeneratedReceipt] = useState<any>(null);

  // Auto-initialize account selects if data exists
  useMemo(() => {
    if (accounts.length > 0) {
      if (!saleAccount) setSaleAccount(accounts[0].id);
      if (!purchaseAccount) setPurchaseAccount(accounts[0].id);
      if (!expAccount) setExpAccount(accounts[0].id);
    }
  }, [accounts]);

  // Safe helper to grab product by ID
  const findProduct = (id: string) => products.find((p) => p.id === id);

  // ----------------------------------------------------
  // --- SALE ACTIONS & CALCS ---
  // ----------------------------------------------------
  const addProductToSaleCart = (prodId: string) => {
    if (!prodId) return;
    const prod = findProduct(prodId);
    if (!prod) return;

    // Check if duplicate
    if (saleCart.some((item) => item.productId === prodId)) {
      toast.error("পণ্যটি ইতিমধ্যেই কার্টে যোগ করা হয়েছে!");
      setSelectedProductToAddSale("");
      return;
    }

    setSaleCart((prev) => [
      ...prev,
      {
        productId: prodId,
        cartons: 0,
        pieces: 0,
        rate: prod.price || 0,
        freeQty: 0,
        discount: 0,
      },
    ]);
    setSelectedProductToAddSale("");
  };

  const removeProductFromSaleCart = (index: number) => {
    setSaleCart((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSaleCartItem = (index: number, key: keyof SaleCartItem, val: number) => {
    setSaleCart((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: val };
      return copy;
    });
  };

  const saleTotals = useMemo(() => {
    let subtotal = 0;
    let totalPiecesCount = 0;

    const items = saleCart.map((item) => {
      const prod = findProduct(item.productId);
      const cartonSize = prod?.cartoonSize || 12;
      const totalPiecesItem = item.cartons * cartonSize + item.pieces;
      const rowTotal = Math.max(0, totalPiecesItem * item.rate - item.discount);

      subtotal += rowTotal;
      totalPiecesCount += totalPiecesItem;

      return {
        ...item,
        totalPiecesItem,
        rowTotal,
        stock: prod?.stock || 0,
      };
    });

    const netTotal = subtotal;
    const finalPaid = salePaidAmount !== null ? salePaidAmount : netTotal;
    const finalDue = Math.max(0, netTotal - finalPaid);

    return {
      items,
      netTotal,
      finalPaid,
      finalDue,
      totalPiecesCount,
    };
  }, [saleCart, salePaidAmount, products]);

  const handleSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saleCart.length === 0) {
      toast.error("অন্তত একটি পণ্য কার্টে যোগ করুন!");
      return;
    }
    if (submitting) return;

    // Validate stocks
    for (const item of saleTotals.items) {
      const demandedAndFree = item.totalPiecesItem + (item.freeQty || 0);
      if (demandedAndFree === 0) {
        toast.error(`দয়া করে ${findProduct(item.productId)?.name || "পণ্য"}-এর জন্য কার্টন বা পিস পরিমাণ ইনপুট করুন`);
        return;
      }
      if (demandedAndFree > item.stock) {
        toast.error(`পর্যাপ্ত স্টক নেই! ${findProduct(item.productId)?.name || "পণ্য"}-এর স্টকে আছে ${item.stock} পিস, আপনি বিক্রয় করছেন ${demandedAndFree} পিস`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const customerObj = customers.find((c) => c.id === saleCustomer);
      const customerName = customerObj?.name || "Walk-in Cash Customer";

      // 1. Submit Sale Invoice
      const saleRecord = {
        date: saleDate,
        createdAt: new Date().toISOString(),
        customerId: saleCustomer || "cash",
        customerName,
        routeId: saleRoute || "N/A",
        dsrId: "N/A",
        items: saleTotals.items.map((item) => ({
          productId: item.productId,
          name: findProduct(item.productId)?.name || "Unknown Product",
          cartons: item.cartons,
          pieces: item.pieces,
          freeQty: item.freeQty,
          discount: item.discount,
          rate: item.rate,
          total: item.rowTotal,
          qty: item.totalPiecesItem,
        })),
        total: saleTotals.netTotal,
        paidAmount: saleTotals.finalPaid,
        dueAmount: saleTotals.finalDue,
        status: "paid",
        approved: true,
        createdBy: user?.email || "Manager",
      };

      await addSale(saleRecord);

      // 2. Adjust Product Inventory
      for (const item of saleTotals.items) {
        const totalOutput = (Number(item.totalPiecesItem) || 0) + (Number(item.freeQty) || 0);
        await recordStockMovement(item.productId, 'SALES', -totalOutput, "QUICK_SALE_" + Date.now());
      }

      // 3. Track payment
      if (saleTotals.finalPaid > 0) {
        await addPayment({
          date: saleDate,
          createdAt: new Date().toISOString(),
          type: "in",
          amount: saleTotals.finalPaid,
          category: "POS Sales",
          description: `Quick Sale সংগৃহীত পেমেন্ট (কাস্টমার: ${customerName})`,
          entityId: saleCustomer || "cash",
          method: "Cash",
          status: "approved",
          approved: true,
          accountId: saleAccount || (accounts[0]?.id || "default"),
          createdBy: user?.email || "Manager",
        });
      }

      // 4. Update customer outstanding dues if applicable
      if (saleCustomer && saleTotals.finalDue > 0 && customerObj) {
        await updateCustomer(saleCustomer, {
          balance: (customerObj.balance || 0) + saleTotals.finalDue,
        });
      }

      toast.success("জরুরি ক্যাশ বিক্রয় সফলভাবে সম্পন্ন হয়েছে!");
      setActiveModal(null);
      resetSaleForm();
    } catch (err: any) {
      toast.error("ত্রুটি: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetSaleForm = () => {
    setSaleCart([]);
    setSalePaidAmount(null);
    setSaleCustomer("");
    setSaleRoute("");
  };

  // ----------------------------------------------------
  // --- PURCHASE ACTIONS & CALCS ---
  // ----------------------------------------------------
  const addProductToPurchaseCart = (prodId: string) => {
    if (!prodId) return;
    const prod = findProduct(prodId);
    if (!prod) return;

    if (purchaseCart.some((it) => it.productId === prodId)) {
      toast.error("পণ্যটি ইতিমধ্যেই ক্রয় তালিকায় যোগ করা রয়েছে!");
      setSelectedProductToAddPurchase("");
      return;
    }

    setPurchaseCart((prev) => [
      ...prev,
      {
        productId: prodId,
        cartons: 0,
        pieces: 0,
        purchasePrice: prod.cost || 0,
      },
    ]);
    setSelectedProductToAddPurchase("");
  };

  const removeProductFromPurchaseCart = (index: number) => {
    setPurchaseCart((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePurchaseCartItem = (index: number, key: keyof PurchaseCartItem, val: number) => {
    setPurchaseCart((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: val };
      return copy;
    });
  };

  const purchaseTotals = useMemo(() => {
    let totalValue = 0;
    const items = purchaseCart.map((item) => {
      const prod = findProduct(item.productId);
      const cartonSize = prod?.cartoonSize || 12;
      const totalPiecesVal = item.cartons * cartonSize + item.pieces;
      const rowTotal = totalPiecesVal * item.purchasePrice;

      totalValue += rowTotal;

      return {
        ...item,
        cartonSize,
        totalPiecesVal,
        rowTotal,
        stock: prod?.stock || 0,
      };
    });

    const finalPaid = purchasePaidAmount !== null ? purchasePaidAmount : totalValue;
    const finalDue = Math.max(0, totalValue - finalPaid);

    return {
      items,
      totalValue,
      finalPaid,
      finalDue,
    };
  }, [purchaseCart, purchasePaidAmount, products]);

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseSupplier) {
      toast.error("দয়া করে সাপ্লায়ার সিলেক্ট করুন!");
      return;
    }
    if (purchaseCart.length === 0) {
      toast.error("ক্রয় করতে অন্তত একটি পণ্য যোগ করুন!");
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    try {
      const invoiceNo = purchaseInvoiceId.trim() || `QA-PUR-${Date.now().toString().slice(-6)}`;

      // 1. Submit Purchase entry
      const purchaseRecord = {
        date: purchaseDate,
        createdAt: new Date().toISOString(),
        invoiceId: invoiceNo,
        supplierId: purchaseSupplier,
        total: purchaseTotals.totalValue,
        items: purchaseTotals.items.map((item) => ({
          id: item.productId,
          name: findProduct(item.productId)?.name || "Unknown Product",
          carton: item.cartons,
          pieces: item.pieces,
          piecesInCarton: item.cartonSize,
          purchasePrice: item.purchasePrice,
          stock: item.stock,
        })),
        paidAmount: purchaseTotals.finalPaid,
        approved: true,
      };

      await addPurchase(purchaseRecord);

      // 2. Adjust Product stock
      for (const item of purchaseTotals.items) {
        await recordStockMovement(item.productId, 'PURCHASE', item.totalPiecesVal, "QUICK_PURCHASE_" + Date.now());
      }

      // 3. Track Supplier outstanding/payment log
      if (purchaseTotals.finalPaid > 0) {
        await addPayment({
          date: purchaseDate,
          createdAt: new Date().toISOString(),
          type: "out",
          amount: purchaseTotals.finalPaid,
          category: "Supplier Payment",
          description: `Quick Purchase ক্যাশ পেমেন্ট (ইনভয়েস: ${invoiceNo})`,
          entityId: purchaseSupplier,
          method: "Cash",
          status: "approved",
          approved: true,
          accountId: purchaseAccount || (accounts[0]?.id || "default"),
          createdBy: user?.email || "Manager",
        });
      }

      toast.success("মাল ক্রয় এবং স্টক আপডেট সম্পন্ন হয়েছে!");
      setActiveModal(null);
      resetPurchaseForm();
    } catch (err: any) {
      toast.error("ত্রুটি: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetPurchaseForm = () => {
    setPurchaseCart([]);
    setPurchasePaidAmount(null);
    setPurchaseSupplier("");
    setPurchaseInvoiceId("");
  };

  // ----------------------------------------------------
  // --- EXPENSE ACTIONS ---
  // ----------------------------------------------------
  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(expAmount);
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error("সঠিক খরচের পরিমাণ ইনপুট করুন!");
      return;
    }
    if (!expDescription.trim()) {
      toast.error("খরচের বিস্তারিত বিবরণ লিখুন!");
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    try {
      const isManager = role === "manager";

      const expenseRecord = {
        date: expDate,
        createdAt: new Date().toISOString(),
        type: "out",
        amount: parsedAmount,
        category: expCategory,
        description: expDescription.trim(),
        entityId: expEntity || "",
        method: expMethod,
        accountId: expAccount || (accounts[0]?.id || "default"),
        createdBy: user?.email || "",
        approved: !isManager,
        status: isManager ? "pending_approval" : "approved",
      };

      await addPayment(expenseRecord);

      toast.success(
        isManager
          ? "খরচ সফলভাবে এন্ট্রি হয়েছে এবং অনুমোদনের অপেক্ষায় রয়েছে!"
          : "খরচ সফলভাবে এন্ট্রি সম্পন্ন হয়েছে!"
      );
      
      if (!isManager) {
        setGeneratedReceipt(expenseRecord);
      } else {
        setActiveModal(null);
        setExpAmount("");
        setExpDescription("");
        setExpEntity("");
      }
    } catch (err: any) {
      toast.error("ভুল হয়েছে: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 print:hidden font-sans">
      {/* Dynamic Backdrop to dismiss speed dial easily */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-transparent cursor-default z-40"
        />
      )}

      {/* Speed Dial Stack Menu */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 mb-3 bg-white border border-[#E9ECEF] rounded-3xl p-3.5 shadow-2xl flex flex-col gap-2.5 min-w-[210px] z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div className="text-[10px] font-black tracking-widest text-[#ADB5BD] uppercase px-2 mb-1">
            দ্রুত এন্ট্রি করুন (Quick Entry)
          </div>

          <button
            onClick={() => {
              setActiveModal("sale");
              setIsOpen(false);
            }}
            className="flex items-center gap-2.5 px-3 py-2.5 text-xs text-slate-800 hover:text-emerald-700 hover:bg-emerald-50 rounded-2xl font-bold transition-all text-left group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center text-emerald-600 transition-colors">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-[12px]">জরুরি বিক্রয় (Sale)</div>
              <div className="text-[9px] text-gray-400 font-normal">সরাসরি ক্যাশ মেমো</div>
            </div>
          </button>

          <button
            onClick={() => {
              setActiveModal("purchase");
              setIsOpen(false);
            }}
            className="flex items-center gap-2.5 px-3 py-2.5 text-xs text-slate-800 hover:text-indigo-700 hover:bg-indigo-50 rounded-2xl font-bold transition-all text-left group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center text-indigo-600 transition-colors">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-[12px]">মাল ক্রয় সম্পন্ন (Purchase)</div>
              <div className="text-[9px] text-gray-400 font-normal">স্টকে পণ্য ঢুকানো</div>
            </div>
          </button>

          <button
            onClick={() => {
              setActiveModal("expense");
              setIsOpen(false);
            }}
            className="flex items-center gap-2.5 px-3 py-2.5 text-xs text-slate-800 hover:text-red-700 hover:bg-red-50 rounded-2xl font-bold transition-all text-left group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-red-50 group-hover:bg-red-100 flex items-center justify-center text-red-600 transition-colors">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-[12px]">খরচ এন্ট্রি (Expense)</div>
              <div className="text-[9px] text-gray-400 font-normal">অফিস বা বিবিধ খরচ</div>
            </div>
          </button>
        </div>
      )}

      {/* Primary Floating Action Button */}
      <button
        id="quick-actions-fab"
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-black hover:bg-gray-900 text-white rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 duration-200 cursor-pointer border border-neutral-800 select-none flex-shrink-0"
        title="কুইক অ্যাকশন মেনু"
      >
        <Plus
          className={`w-6 h-6 transition-transform duration-300 ${
            isOpen ? "rotate-45 text-amber-400" : ""
          }`}
        />
      </button>

      {/* ----------------------------------------------------
          --- MODAL 1: POS QUICK CASH SALE ---
          ---------------------------------------------------- */}
      {activeModal === "sale" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
          <div className="bg-white max-w-2xl w-full max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl border border-gray-150 flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-[#E9ECEF] flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-2 text-emerald-600">
                <ShoppingBag className="w-5 h-5 text-emerald-600 animate-pulse" />
                <h3 className="text-base font-black text-slate-900">জরুরি ক্যাশ বিক্রয় (Direct Sale)</h3>
              </div>
              <button
                onClick={() => {
                  setActiveModal(null);
                  resetSaleForm();
                }}
                className="p-1 px-2.5 bg-gray-200 text-gray-500 rounded-lg hover:bg-gray-300 transition-colors"
                title="বন্ধ করুন"
              >
                <X className="w-4 h-4 font-bold" />
              </button>
            </div>

            {/* Form Scroll Body */}
            <form onSubmit={handleSaleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Sale Date */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">তারিখ (Date)</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      required
                      value={saleDate}
                      onChange={(e) => setSaleDate(e.target.value)}
                      className="w-full pl-9 p-3 border rounded-xl text-xs font-semibold font-sans focus:ring-1 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                </div>

                {/* Customer Dropdown */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">কাস্টমার (Customer)</label>
                  <select
                    value={saleCustomer}
                    onChange={(e) => setSaleCustomer(e.target.value)}
                    className="w-full p-3 border rounded-xl text-xs font-semibold bg-white"
                  >
                    <option value="">Walk-in Cash Customer (নগদ খদ্দের)</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (বাকি: ৳{c.balance || 0})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Route Dropdown */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">সংশ্লিষ্ট রুট / রোড</label>
                  <select
                    value={saleRoute}
                    onChange={(e) => setSaleRoute(e.target.value)}
                    className="w-full p-3 border rounded-xl text-xs font-semibold bg-white"
                  >
                    <option value="">নির্বাচন করুন (ঐচ্ছিক)</option>
                    {routes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Add Product Dropdown Selector */}
              <div className="bg-[#EBFBEE] p-3 rounded-2xl border border-[#D3F9D8]">
                <label className="text-[11px] font-bold text-[#2B8A3E] block mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> পণ্য সিলেক্ট করে কুইক কার্টে যোগ করুন:
                </label>
                <select
                  value={selectedProductToAddSale}
                  onChange={(e) => {
                    setSelectedProductToAddSale(e.target.value);
                    addProductToSaleCart(e.target.value);
                  }}
                  className="w-full p-2.5 border border-[#B2F2BB] rounded-xl text-xs font-bold bg-white text-gray-850"
                >
                  <option value="">পণ্য খুঁজতে ক্লিক করুন...</option>
                  {products
                    .filter((p) => p.stock > 0)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (স্টক: {p.stock} পিস | রেট: ৳{p.price})
                      </option>
                    ))}
                </select>
              </div>

              {/* Sale Cart Table list */}
              <div className="border border-slate-150 rounded-2xl overflow-hidden bg-white">
                <div className="bg-slate-50 text-[10px] font-bold text-[#868E96] uppercase p-3 border-b border-slate-150 grid grid-cols-12 gap-2">
                  <span className="col-span-4">পণ্যের বিবরণ</span>
                  <span className="col-span-2 text-center">কার্টন</span>
                  <span className="col-span-2 text-center">পিস্</span>
                  <span className="col-span-2 text-right">রেট (৳)</span>
                  <span className="col-span-2 text-right">মোট (৳)</span>
                </div>

                <div className="divide-y divide-slate-100 max-h-[220px] overflow-y-auto">
                  {saleCart.length === 0 ? (
                    <div className="p-8 text-center text-xs text-gray-400 font-semibold leading-relaxed">
                      কার্টে কোনো নতুন পণ্য যোগ করা হয়নি!<br />দয়া করে ওপরের সিলেক্টর থেকে আইটেম যোগ করুন।
                    </div>
                  ) : (
                    saleCart.map((item, idx) => {
                      const prod = findProduct(item.productId);
                      const cartonSize = prod?.cartoonSize || 12;
                      const linePieces = item.cartons * cartonSize + item.pieces;
                      const lineValuation = linePieces * item.rate;

                      return (
                        <div
                          key={item.productId}
                          className="p-3 text-xs grid grid-cols-12 gap-2 items-center hover:bg-slate-50"
                        >
                          <div className="col-span-4">
                            <p className="font-extrabold text-[#212529]">{prod?.name}</p>
                            <p className="text-[9px] text-[#868E96] font-mono leading-none mt-1">
                              স্টক: {prod?.stock || 0} পিস, কার্টন সাইজ: {cartonSize}
                            </p>
                          </div>

                          <div className="col-span-2">
                            <input
                              type="number"
                              min="0"
                              placeholder="০"
                              value={item.cartons || ""}
                              onChange={(e) =>
                                updateSaleCartItem(idx, "cartons", Math.max(0, Number(e.target.value)))
                              }
                              className="w-full text-center border rounded-lg p-1.5 font-mono text-xs text-gray-900 bg-white"
                            />
                          </div>

                          <div className="col-span-2">
                            <input
                              type="number"
                              min="0"
                              placeholder="০"
                              value={item.pieces || ""}
                              onChange={(e) =>
                                updateSaleCartItem(idx, "pieces", Math.max(0, Number(e.target.value)))
                              }
                              className="w-full text-center border rounded-lg p-1.5 font-mono text-xs text-gray-900 bg-white"
                            />
                          </div>

                          <div className="col-span-2 text-right">
                            <input
                              type="number"
                              min="0"
                              value={item.rate}
                              onChange={(e) =>
                                updateSaleCartItem(idx, "rate", Math.max(0, Number(e.target.value)))
                              }
                              className="w-full text-right border rounded-lg p-1.5 font-mono text-xs text-slate-800 bg-white"
                            />
                          </div>

                          <div className="col-span-2 text-right font-extrabold text-slate-900 flex items-center justify-end gap-1 font-mono">
                            <span>৳{lineValuation.toLocaleString()}</span>
                            <button
                              type="button"
                              onClick={() => removeProductFromSaleCart(idx)}
                              className="p-1 px-1.5 font-sans hover:bg-red-50 hover:text-red-650 rounded-md text-gray-400 text-[10px] transition-colors"
                              title="বাদ দিন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Checkout Accounting Area */}
              <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">পেমেন্ট মেলাবেন কোন হিসাবে (Account)*</label>
                    <select
                      value={saleAccount}
                      onChange={(e) => setSaleAccount(e.target.value)}
                      required
                      className="w-full p-2.5 border rounded-xl text-xs bg-white text-[#1b2a4a]"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.type})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">সংগৃহীত ক্যাশ (Cash Paid Amount)*</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-bold">৳</span>
                      <input
                        type="number"
                        min="0"
                        placeholder={saleTotals.netTotal.toString()}
                        value={salePaidAmount !== null ? salePaidAmount : ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? null : Math.max(0, Number(e.target.value));
                          setSalePaidAmount(val);
                        }}
                        className="w-full pl-6 p-2.5 border rounded-xl font-mono text-xs text-gray-900 bg-white"
                      />
                    </div>
                    <span className="text-[9px] text-[#868E96] font-normal leading-none mt-1.5 block">
                      অফিসিয়াল পেমেন্ট লগে সম্পূর্ণ টাকা নগদ জমা ধরবে। বাকি থাকলে তা কাস্টমার খাতায় ডলবে।
                    </span>
                  </div>
                </div>

                <div className="bg-white border rounded-2xl p-4 flex flex-col justify-between space-y-2">
                  <div className="flex justify-between items-center text-gray-500 border-b pb-1">
                    <span>প্রোডাক্ট সংখ্যা:</span>
                    <strong className="text-gray-900 font-mono text-sm">{saleCart.length} টি</strong>
                  </div>
                  <div className="flex justify-between items-center text-gray-500 border-b pb-1">
                    <span>মোট বিক্রয়মূল্য:</span>
                    <strong className="text-gray-950 font-mono text-sm">৳{saleTotals.netTotal.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between items-center text-gray-500 border-b pb-1">
                    <span>সংগৃহীত জমা:</span>
                    <strong className="text-emerald-600 font-mono text-sm">৳{saleTotals.finalPaid.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between items-center text-base font-black pt-1">
                    <span className="text-rose-700">বাকি পরিমাণ (Due):</span>
                    <strong className="text-rose-650 font-mono">৳{saleTotals.finalDue.toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null);
                    resetSaleForm();
                  }}
                  className="flex-1 py-3 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-2xl text-xs transition-colors cursor-pointer"
                >
                  বাতিল করুন
                </button>
                <button
                  type="submit"
                  disabled={submitting || saleCart.length === 0}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-2xl text-xs shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> বিক্রয় প্রসেস হচ্ছে...
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" /> বিক্রয় অনুমোদন দিন
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          --- MODAL 2: QUICK INVENTORY PURCHASE EVENT ---
          ---------------------------------------------------- */}
      {activeModal === "purchase" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
          <div className="bg-white max-w-2xl w-full max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl border border-gray-150 flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-[#E9ECEF] flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-2 text-indigo-600">
                <Truck className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900">মাল ক্রয় ভুক্তি (Quick Purchase Entry)</h3>
              </div>
              <button
                onClick={() => {
                  setActiveModal(null);
                  resetPurchaseForm();
                }}
                className="p-1 px-2.5 bg-gray-200 text-gray-500 rounded-lg hover:bg-gray-300 transition-colors"
                title="বন্ধ করুন"
              >
                <X className="w-4 h-4 font-bold" />
              </button>
            </div>

            {/* Form scroll Body */}
            <form onSubmit={handlePurchaseSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Purchase Date */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">তারিখ (Date)</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      required
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      className="w-full pl-9 p-3 border rounded-xl text-xs font-semibold font-sans focus:ring-1 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                </div>

                {/* Supplier Dropdown */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">সাপ্লায়ার (Supplier)*</label>
                  <select
                    value={purchaseSupplier}
                    onChange={(e) => setPurchaseSupplier(e.target.value)}
                    required
                    className="w-full p-3 border rounded-xl text-xs font-semibold bg-white"
                  >
                    <option value="">সাপ্লায়ার নির্বাচন করুন</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Invoice ID / Memo */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">মেমো / ইনভয়েস নং</label>
                  <input
                    type="text"
                    placeholder="উদা: QA-9801"
                    value={purchaseInvoiceId}
                    onChange={(e) => setPurchaseInvoiceId(e.target.value)}
                    className="w-full p-3 border rounded-xl text-xs font-semibold font-sans bg-white"
                  />
                </div>
              </div>

              {/* Add Product Dropdown */}
              <div className="bg-[#EEF2FF] p-3 rounded-2xl border border-[#D0EBFF]">
                <label className="text-[11px] font-bold text-indigo-700 block mb-1.5 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5 text-indigo-600" /> মাল ক্রয় তালিকায় পণ্য যোগ করুন:
                </label>
                <select
                  value={selectedProductToAddPurchase}
                  onChange={(e) => {
                    setSelectedProductToAddPurchase(e.target.value);
                    addProductToPurchaseCart(e.target.value);
                  }}
                  className="w-full p-2.5 border border-[#BAC8FF] rounded-xl text-xs font-bold bg-white text-gray-850"
                >
                  <option value="">পণ্য খুঁজতে ক্লিক করুন...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (স্টক: {p.stock} পিস | ডামি কেনা দাম: ৳{p.cost || 0})
                    </option>
                  ))}
                </select>
              </div>

              {/* Purchases Cart Grid List */}
              <div className="border border-slate-150 rounded-2xl overflow-hidden bg-white">
                <div className="bg-slate-50 text-[10px] font-bold text-[#868E96] uppercase p-3 border-b border-slate-150 grid grid-cols-12 gap-2">
                  <span className="col-span-4">পণ্যের বিবরণ</span>
                  <span className="col-span-2 text-center">কার্টন</span>
                  <span className="col-span-2 text-center">পিস্</span>
                  <span className="col-span-2 text-right">কেনা দাম (৳)</span>
                  <span className="col-span-2 text-right">মোট (৳)</span>
                </div>

                <div className="divide-y divide-slate-100 max-h-[200px] overflow-y-auto">
                  {purchaseCart.length === 0 ? (
                    <div className="p-8 text-center text-xs text-gray-400 font-semibold leading-relaxed">
                      ক্রয় তালিকায় কোনো পণ্য এখনও এন্ট্রি করা হয়নি!<br />দয়া করে ওপরের নীল সিলেক্টর ব্যবহার করুন।
                    </div>
                  ) : (
                    purchaseCart.map((item, idx) => {
                      const prod = findProduct(item.productId);
                      const cartonSize = prod?.cartoonSize || 12;
                      const linePieces = item.cartons * cartonSize + item.pieces;
                      const lineValuation = linePieces * item.purchasePrice;

                      return (
                        <div
                          key={item.productId}
                          className="p-3 text-xs grid grid-cols-12 gap-2 items-center hover:bg-slate-50"
                        >
                          <div className="col-span-4">
                            <p className="font-extrabold text-[#212529]">{prod?.name}</p>
                            <p className="text-[9px] text-[#868E96] font-mono leading-none mt-1">
                              কার্টন সাইজ: {cartonSize} পিস, বর্তমান স্টক: {prod?.stock || 0} পিস
                            </p>
                          </div>

                          <div className="col-span-2">
                            <input
                              type="number"
                              min="0"
                              placeholder="০"
                              value={item.cartons || ""}
                              onChange={(e) =>
                                updatePurchaseCartItem(idx, "cartons", Math.max(0, Number(e.target.value)))
                              }
                              className="w-full text-center border rounded-lg p-1.5 font-mono text-xs text-slate-800 bg-white"
                            />
                          </div>

                          <div className="col-span-2">
                            <input
                              type="number"
                              min="0"
                              placeholder="০"
                              value={item.pieces || ""}
                              onChange={(e) =>
                                updatePurchaseCartItem(idx, "pieces", Math.max(0, Number(e.target.value)))
                              }
                              className="w-full text-center border rounded-lg p-1.5 font-mono text-xs text-slate-800 bg-white"
                            />
                          </div>

                          <div className="col-span-2 text-right">
                            <input
                              type="number"
                              min="0"
                              value={item.purchasePrice}
                              onChange={(e) =>
                                updatePurchaseCartItem(idx, "purchasePrice", Math.max(0, Number(e.target.value)))
                              }
                              className="w-full text-right border rounded-lg p-1.5 font-mono text-xs text-slate-800 bg-white"
                            />
                          </div>

                          <div className="col-span-2 text-right font-extrabold text-[#212529] flex items-center justify-end gap-1 font-mono">
                            <span>৳{lineValuation.toLocaleString()}</span>
                            <button
                              type="button"
                              onClick={() => removeProductFromPurchaseCart(idx)}
                              className="p-1 px-1.5 font-sans hover:bg-red-50 hover:text-red-650 rounded-md text-gray-400 text-[10px] transition-colors animate-pulse"
                              title="বাদ দিন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Purchase Calculation Summary */}
              <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">পেমেন্ট মেলাবেন কোন হিসাবে (Account)*</label>
                    <select
                      value={purchaseAccount}
                      onChange={(e) => setPurchaseAccount(e.target.value)}
                      required
                      className="w-full p-2.5 border rounded-xl text-xs bg-white text-[#1b2a4a]"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.type})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">পরিশোধিত মূল্য (Paid Amount)*</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-bold">৳</span>
                      <input
                        type="number"
                        min="0"
                        placeholder={purchaseTotals.totalValue.toString()}
                        value={purchasePaidAmount !== null ? purchasePaidAmount : ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? null : Math.max(0, Number(e.target.value));
                          setPurchasePaidAmount(val);
                        }}
                        className="w-full pl-6 p-2.5 border rounded-xl font-mono text-xs text-slate-900 bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white border rounded-2xl p-4 flex flex-col justify-between space-y-2">
                  <div className="flex justify-between items-center text-gray-500 border-b pb-1">
                    <span>আইটেম প্রকারসংখ্যা:</span>
                    <strong className="text-gray-900 font-mono text-sm">{purchaseCart.length} টি</strong>
                  </div>
                  <div className="flex justify-between items-center text-gray-500 border-b pb-1">
                    <span>মোট ক্রয়মূল্য:</span>
                    <strong className="text-gray-950 font-mono text-sm">৳{purchaseTotals.totalValue.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between items-center text-gray-500 border-b pb-1">
                    <span>প্রদান করা হলো ক্যাশ:</span>
                    <strong className="text-amber-700 font-mono text-sm">৳{purchaseTotals.finalPaid.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between items-center text-base font-black pt-1">
                    <span className="text-rose-700">বাকি থাকল (Due):</span>
                    <strong className="text-rose-650 font-mono">৳{purchaseTotals.finalDue.toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              {/* Action trigger buttons */}
              <div className="flex gap-4 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null);
                    resetPurchaseForm();
                  }}
                  className="flex-1 py-3 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-2xl text-xs transition-colors cursor-pointer"
                >
                  বাতিল করুন
                </button>
                <button
                  type="submit"
                  disabled={submitting || purchaseCart.length === 0}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-2xl text-xs shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> স্টক প্রসেস হচ্ছে...
                    </>
                  ) : (
                    <>
                      <Truck className="w-4 h-4" /> ক্রয় ভুক্তি নিশ্চিত করুন
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          --- MODAL 3: QUICK OFFICE EXPENSE ADDITION ---
          ---------------------------------------------------- */}
      {activeModal === "expense" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl overflow-hidden shadow-2xl border border-gray-150 flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-[#E9ECEF] flex justify-between items-center bg-gray-55">
              <div className="flex items-center gap-2 text-rose-600">
                <DollarSign className="w-5 h-5 text-rose-600 font-bold" />
                <h3 className="text-base font-black text-slate-900">খরচ এন্ট্রি (Add Expense Transaction)</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 px-2.5 bg-gray-200 text-gray-500 rounded-lg hover:bg-gray-300 transition-colors"
                title="বন্ধ করুন"
              >
                <X className="w-4 h-4 font-bold" />
              </button>
            </div>

            {/* Form scroll Body */}
            <form onSubmit={handleExpenseSubmit} className="p-6 space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-3">
                {/* Exp Date */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">তারিখ (Date)</label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full p-2.5 border rounded-xl text-xs font-semibold font-sans bg-white"
                  />
                </div>

                {/* Expense category dropdown */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">খরচের খাত (Category)</label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className="w-full p-2.5 border rounded-xl text-xs font-semibold bg-white"
                  >
                    <option value="Salary">Salary (বেতন-ভাতা)</option>
                    <option value="Rent">Rent (ভাড়া)</option>
                    <option value="Conveyance">Conveyance (যাতায়াত বিল)</option>
                    <option value="Office Operation">Office Operation (অফিস পরিচালনা)</option>
                    <option value="Supplier Payment">Supplier Payment (সাপ্লায়ার পেমেন্ট)</option>
                    <option value="Others">Others (বিবিধ খরচ)</option>
                  </select>
                </div>

                {/* Paid amount */}
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">খরচের পরিমাণ (Amount)*</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-medium text-xs">৳</span>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="খরচের অংক টাকার পরিমাপে লিখুন"
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                      className="w-full pl-6 p-2.5 border rounded-xl font-mono text-slate-900 focus:ring-1 focus:ring-red-400 bg-white"
                    />
                  </div>
                </div>

                {/* Payment method */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">পরিশোধের মাধ্যম (Method)</label>
                  <select
                    value={expMethod}
                    onChange={(e) => setExpMethod(e.target.value)}
                    className="w-full p-2.5 border rounded-xl text-xs font-semibold bg-white"
                  >
                    <option>Cash</option>
                    <option>bKash</option>
                    <option>Nagad</option>
                    <option>Bank</option>
                  </select>
                </div>

                {/* Match Account */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">সংশ্লিষ্ট অ্যাকাউন্ট (Account)*</label>
                  <select
                    value={expAccount}
                    onChange={(e) => setExpAccount(e.target.value)}
                    required
                    className="w-full p-2.5 border rounded-xl text-xs font-semibold bg-white text-[#1b2a4a]"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Optional entity */}
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">গ্রহীতা / সংশ্লিষ্ট পক্ষ (ঐচ্ছিক)</label>
                  <select
                    value={expEntity}
                    onChange={(e) => setExpEntity(e.target.value)}
                    className="w-full p-2.5 border rounded-xl text-xs bg-white"
                  >
                    <option value="">None (অনির্দিষ্ট পক্ষ)</option>
                    <optgroup label="DSR / স্টাফ">
                      {staff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="সাপ্লায়ারস">
                      {suppliers.map((su) => (
                        <option key={su.id} value={su.id}>
                          {su.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Exp Description */}
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">বিবরণ / ব্যাখ্যা (Description)*</label>
                  <input
                    type="text"
                    required
                    placeholder="উদা: অফিস চা সল্ট ও বিদ্যুৎ বিল"
                    value={expDescription}
                    onChange={(e) => setExpDescription(e.target.value)}
                    className="w-full p-2.5 border rounded-xl text-slate-800 bg-white"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-4 pt-4 border-t mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null);
                    setExpAmount("");
                    setExpDescription("");
                    setExpEntity("");
                  }}
                  className="flex-1 py-3 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-2xl text-xs transition-colors cursor-pointer"
                >
                  বাতিল করুন
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-red-650 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-2xl text-xs shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> সেভ হচ্ছে...
                    </>
                  ) : (
                    <>
                      <Wallet className="w-4 h-4 text-rose-105" /> খরচ সেভ করুন
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {generatedReceipt && (
        <QuickReceipt 
          payment={generatedReceipt} 
          onClose={() => { 
            setGeneratedReceipt(null); 
            setActiveModal(null); 
            setExpAmount("");
            setExpDescription("");
            setExpEntity("");
          }} 
        />
      )}

      {/* Payment Receive Modal */}
      {activeModal === "payment" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-bold text-lg mb-4">পেমেন্ট রিসিভ করুন</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setSubmitting(true);
              try {
                await addPayment({
                  amount: Number(paymentAmount),
                  customer: paymentCustomer,
                  account: paymentAccount,
                  description: paymentDescription,
                  date: new Date().toISOString(),
                  type: "receive",
                  user: user?.email
                });
                toast.success("পেমেন্ট রিসিভ হয়েছে!");
                setActiveModal(null);
                setPaymentAmount("");
                setPaymentDescription("");
              } catch (err) {
                toast.error("ভুল হয়েছে!");
              } finally {
                setSubmitting(false);
              }
            }}>
              <input type="number" placeholder="পরিমাণ" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} required className="w-full p-2 border rounded-lg mb-2" />
              <select value={paymentCustomer} onChange={(e) => setPaymentCustomer(e.target.value)} required className="w-full p-2 border rounded-lg mb-2">
                <option value="">কাস্টমার সিলেক্ট করুন</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={paymentAccount} onChange={(e) => setPaymentAccount(e.target.value)} required className="w-full p-2 border rounded-lg mb-2">
                <option value="">অ্যাকাউন্ট সিলেক্ট করুন</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <input type="text" placeholder="বিবরণ" value={paymentDescription} onChange={(e) => setPaymentDescription(e.target.value)} className="w-full p-2 border rounded-lg mb-4" />
              <div className="flex gap-2">
                <button type="button" onClick={() => setActiveModal(null)} className="flex-1 p-2 bg-gray-100 rounded-lg">বাতিল</button>
                <button type="submit" disabled={submitting} className="flex-1 p-2 bg-emerald-600 text-white rounded-lg">{submitting ? "সেভ হচ্ছে..." : "রিসিভ করুন"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
