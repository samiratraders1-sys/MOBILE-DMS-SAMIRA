import { useState, useMemo } from "react";
import { 
  Layers, Settings, Activity, Calendar, DollarSign, Users, Scissors, FileText, 
  Database, Undo2, Repeat, Building2, TrendingDown, Clock, Coins, Plus, Trash, 
  Loader2, Check, ArrowRight, ShieldAlert, Sparkles, UserCheck, CalendarCheck2,
  BookmarkCheck, PlusCircle, CalendarRange
} from "lucide-react";
import { recordStockMovement } from "../lib/inventoryEngine";
import { MovementType } from "../lib/stockMovement";
import { formatCurrency } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";

interface AdvancedOpsViewProps {
  products: any[];
  updateProduct: (id: string, data: any) => Promise<void>;
  suppliers: any[];
  customers: any[];
  staff: any[];
  payments: any[];
  boms: { data: any[]; add: (item: any) => Promise<any>; remove: (id: string) => Promise<void> };
  productions: { data: any[]; add: (item: any) => Promise<any>; remove: (id: string) => Promise<void> };
  attendance: { data: any[]; add: (item: any) => Promise<any>; remove: (id: string) => Promise<void> };
  payroll: { data: any[]; add: (item: any) => Promise<any>; remove: (id: string) => Promise<void> };
  fixedAssets: { data: any[]; add: (item: any) => Promise<any>; remove: (id: string) => Promise<void> };
  loans: { data: any[]; add: (item: any) => Promise<any>; remove: (id: string) => Promise<void>; update: (id: string, item: any) => Promise<void> };
  returns: { data: any[]; add: (item: any) => Promise<any>; remove: (id: string) => Promise<void> };
  transfers: { data: any[]; add: (item: any) => Promise<any>; remove: (id: string) => Promise<void> };
}

export default function AdvancedOpsView({
  products = [],
  updateProduct,
  suppliers = [],
  customers = [],
  staff = [],
  payments = [],
  boms,
  productions,
  attendance,
  payroll,
  fixedAssets,
  loans,
  returns,
  transfers
}: AdvancedOpsViewProps) {
  const [activeTab, setActiveTab] = useState<"production" | "transfer" | "returns" | "hrm" | "assets">("production");

  // --- SUB MODULE 1: PRODUCTION & BOM STATES ---
  const [showBomModal, setShowBomModal] = useState(false);
  const [showProdModal, setShowProdModal] = useState(false);
  const [newBomName, setNewBomName] = useState("");
  const [newBomOutputProd, setNewBomOutputProd] = useState("");
  const [newBomOutputQty, setNewBomOutputQty] = useState(1);
  const [bomIngredients, setBomIngredients] = useState<{ productId: string; qty: number }[]>([]);
  const [selectedIngredient, setSelectedIngredient] = useState("");
  const [selectedIngredientQty, setSelectedIngredientQty] = useState(1);

  const [prodSelectedBom, setProdSelectedBom] = useState("");
  const [prodQty, setProdQty] = useState(1);
  const [isProducing, setIsProducing] = useState(false);

  // --- SUB MODULE 2: STORE TRANSFERS STATES ---
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [trProductId, setTrProductId] = useState("");
  const [trSource, setTrSource] = useState("Main Godown (প্রধান গোডাউন)");
  const [trTarget, setTrTarget] = useState("DSR Car (গাড়ি / ডেলিভারি রুট)");
  const [trQty, setTrQty] = useState(1);
  const [trRef, setTrRef] = useState("");

  // --- SUB MODULE 3: RETURNS & EXCHANGES STATES ---
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [retType, setRetType] = useState<"sales_return" | "purchase_return">("sales_return");
  const [retPartyId, setRetPartyId] = useState(""); // customer or supplier
  const [retProductId, setRetProductId] = useState("");
  const [retQty, setRetQty] = useState(1);
  const [retRefund, setRetRefund] = useState(0);
  const [retExchangeProdId, setRetExchangeProdId] = useState(""); // exchange option
  const [retExchangeQty, setRetExchangeQty] = useState(0);

  // --- SUB MODULE 4: HRM & PAYROLL STATES ---
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  
  // Attendance
  const [attDate, setAttDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [attRecords, setAttRecords] = useState<Record<string, { status: "Present" | "Absent" | "Leave", shift: string, overtime: number }>>({});
  
  // Payroll Payout
  const [payStaffId, setPayStaffId] = useState("");
  const [payMonth, setPayMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [payBasic, setPayBasic] = useState(0);
  const [payOvertimeHrs, setPayOvertimeHrs] = useState(0);
  const [payOvertimeRate, setPayOvertimeRate] = useState(100);
  const [payDeductions, setPayDeductions] = useState(0);
  const [payBonus, setPayBonus] = useState(0);

  // --- SUB MODULE 5: ASSETS & LOANS STATES ---
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  
  // Assets
  const [assetName, setAssetName] = useState("");
  const [assetCost, setAssetCost] = useState(0);
  const [assetDeprRate, setAssetDeprRate] = useState(10); // annual straight-line %
  const [assetPurchaseDate, setAssetPurchaseDate] = useState(() => new Date().toISOString().split("T")[0]);
  
  // Loans
  const [loanSource, setLoanSource] = useState("");
  const [loanPrincipal, setLoanPrincipal] = useState(0);
  const [loanInterestPercent, setLoanInterestPercent] = useState(5);
  const [loanDurationMonths, setLoanDurationMonths] = useState(12);
  const [loanMonthlyEmi, setLoanMonthlyEmi] = useState(0);

  // --- HELPER HANDLERS ---
  
  // BOM Recipe Builder helpers
  const handleAddIngredient = () => {
    if (!selectedIngredient) return toast.error("অনুগ্রহ করে একটি উপাদান সিলেক্ট করুন");
    if (newBomOutputProd === selectedIngredient) return toast.error("তৈরি প্রোডাক্ট এবং কাঁচামাল একই হতে পারবে না");
    if (bomIngredients.find(i => i.productId === selectedIngredient)) {
      return toast.error("এই উপাদানটি ইতিমধ্যেই রেসিপিতে যোগ করা হয়েছে");
    }
    setBomIngredients(prev => [...prev, { productId: selectedIngredient, qty: selectedIngredientQty }]);
    setSelectedIngredient("");
    setSelectedIngredientQty(1);
  };

  const handleCreateBom = async () => {
    if (!newBomName || !newBomOutputProd || bomIngredients.length === 0) {
      return toast.error("অনুগ্রহ করে সকল তথ্য এবং কমপক্ষে একটি উপাদান সিলেক্ট করুন");
    }
    const outputProductObj = products.find(p => p.id === newBomOutputProd);
    const newBom = {
      name: newBomName,
      outputProductId: newBomOutputProd,
      outputProductName: outputProductObj?.name || "Unknown Product",
      outputQty: newBomOutputQty,
      ingredients: bomIngredients.map(ing => {
        const pObj = products.find(p => p.id === ing.productId);
        return {
          productId: ing.productId,
          productName: pObj?.name || "Unknown Ingredient",
          qty: ing.qty
        };
      })
    };
    try {
      await boms.add(newBom);
      setShowBomModal(false);
      setNewBomName("");
      setNewBomOutputProd("");
      setBomIngredients([]);
    } catch {}
  };

  // Run real production run inside Firestore
  const handleRunProduction = async () => {
    if (!prodSelectedBom) return toast.error("অনুগ্রহ করে একটি রেসিপি সিলেক্ট করুন");
    const bomObj = boms.data.find(b => b.id === prodSelectedBom);
    if (!bomObj) return;

    setIsProducing(true);
    try {
      // 1. Verify ingredient stock levels
      for (const ing of bomObj.ingredients) {
        const prod = products.find(p => p.id === ing.productId);
        const requiredQty = ing.qty * prodQty;
        if (!prod || (prod.stock || 0) < requiredQty) {
          throw new Error(`উপাদান "${ing.productName}" এর পর্যাপ্ত স্টক নেই! প্রয়োজন: ${requiredQty}, বর্তমান স্টক: ${prod?.stock || 0}`);
        }
      }

      // 2. Deduct raw materials & add finished ready goods in Firestore
      for (const ing of bomObj.ingredients) {
        const prod = products.find(p => p.id === ing.productId);
        const codeQty = ing.qty * prodQty;
        await recordStockMovement(ing.productId, 'ADJUSTMENT', -codeQty, "PRODUCTION_RUN_" + bomObj.id);
      }

      // 3. Add to output finished goods
      const finishedQty = bomObj.outputQty * prodQty;
      await recordStockMovement(bomObj.outputProductId, 'ADJUSTMENT', finishedQty, "PRODUCTION_RUN_" + bomObj.id);

      // 4. Log production run
      await productions.add({
        bomId: bomObj.id,
        bomName: bomObj.name,
        outputProductId: bomObj.outputProductId,
        outputProductName: bomObj.outputProductName,
        qtyProduced: finishedQty,
        timestamp: new Date().toISOString(),
        rawMaterialsUsed: bomObj.ingredients.map((ing: any) => ({
          productId: ing.productId,
          productName: ing.productName,
          qtyUsed: ing.qty * prodQty
        }))
      });

      toast.success("অভিনন্দন! উৎপাদন সম্পন্ন হয়েছে এবং স্টক স্বয়ংক্রিয়ভাবে আপডেট করা হয়েছে।");
      setShowProdModal(false);
      setProdQty(1);
    } catch (e: any) {
      toast.error(e.message || "উৎপাদন ব্যর্থ হয়েছে");
    } finally {
      setIsProducing(false);
    }
  };

  // Store Transfer handler
  const handleStoreTransfer = async () => {
    if (!trProductId) return toast.error("পণ্য সিলেক্ট করুন");
    const prod = products.find(p => p.id === trProductId);
    if (!prod || (prod.stock || 0) < trQty) {
      return toast.error(`এই পণ্যের ট্র্যান্সফার করার জন্য পর্যাপ্ত স্টক নেই। বর্তমান স্টক: ${prod?.stock || 0}`);
    }

    try {
      // Create transfer log
      await transfers.add({
        productId: trProductId,
        productName: prod.name,
        source: trSource,
        target: trTarget,
        qty: trQty,
        reference: trRef,
        date: new Date().toISOString()
      });

      // If source or target impacts main inventory stack, we'd adjust it.
      // E.g., moving to mobile car/route. We can deduct principal inventory for vehicle operations.
      await recordStockMovement(trProductId, 'ADJUSTMENT', -trQty, "STORE_TRANSFER_" + Date.now());

      toast.success("স্টোর স্টক সাকসেসফুলি ট্র্যান্সফার করা হয়েছে!");
      setShowTransferModal(false);
      setTrProductId("");
      setTrQty(1);
      setTrRef("");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Sales & Purchase Return/Exchange handler
  const handleReturnExchange = async () => {
    if (!retProductId || !retPartyId) return toast.error("সবগুলো ঘর সঠিকভাবে পূরণ করুন");
    const prod = products.find(p => p.id === retProductId);

    try {
      if (retType === "sales_return") {
        // Customer returned product -> add back to principal stock
        if (prod) {
          await recordStockMovement(retProductId, 'RETURN', retQty, "SALES_RETURN_" + Date.now());
        }
        
        // If there's an exchange item
        if (retExchangeProdId && retExchangeQty > 0) {
          const exProd = products.find(p => p.id === retExchangeProdId);
          if (exProd && (exProd.stock || 0) < retExchangeQty) {
            throw new Error(`এক্সচেঞ্জ পণ্য "${exProd.name}" এর প্রয়োজনীয় পরিমাণ স্টক নেই`);
          }
          if (exProd) {
            await recordStockMovement(retExchangeProdId, 'SALES', -retExchangeQty, "EXCHANGE_OUT_" + Date.now());
          }
        }

        await returns.add({
          type: "sales_return",
          partyId: retPartyId,
          partyName: customers.find(c => c.id === retPartyId)?.name || "Unknown Customer",
          productId: retProductId,
          productName: prod?.name || "Unknown",
          qty: retQty,
          refundAmount: retRefund,
          exchangeProductId: retExchangeProdId || null,
          exchangeProductName: products.find(p => p.id === retExchangeProdId)?.name || null,
          exchangeQty: retExchangeQty,
          date: new Date().toISOString()
        });

        toast.success("কাস্টমার সেলস রিটার্ন ও এক্সচেঞ্জ সফলভাবে সম্পন্ন!");

      } else {
        // Purchase return to Supplier -> deduct from local product stock
        if (prod && (prod.stock || 0) < retQty) {
          throw new Error("সাপ্লায়ারকে ফেরত দেওয়ার মত যথেষ্ট পণ্য ইনভেন্টরিতে নেই!");
        }
        if (prod) {
          await recordStockMovement(retProductId, 'RETURN', -retQty, "PURCHASE_RETURN_" + Date.now());
        }

        await returns.add({
          type: "purchase_return",
          partyId: retPartyId,
          partyName: suppliers.find(s => s.id === retPartyId)?.name || "Unknown Supplier",
          productId: retProductId,
          productName: prod?.name || "Unknown",
          qty: retQty,
          refundAmount: retRefund,
          date: new Date().toISOString()
        });

        toast.success("সাপ্লায়ার পারচেজ রিটার্ন সফল হয়েছে ও স্থানীয় স্টক অ্যাডজাস্ট করা হয়েছে।");
      }

      setShowReturnModal(false);
      setRetProductId("");
      setRetPartyId("");
      setRetQty(1);
      setRetRefund(0);
      setRetExchangeProdId("");
      setRetExchangeQty(0);
    } catch (e: any) {
      toast.error(e.message || "রিটার্ন প্রসেস ব্যর্থ হয়েছে");
    }
  };

  // HRM Attendance Tracker helpers
  const handleSaveAttendance = async () => {
    try {
      const recordsToSave = staff.map(st => {
        const rec = attRecords[st.id] || { status: "Present", shift: "Day-Shift (সকাল ৮ - বিকাল ৫)", overtime: 0 };
        return {
          staffId: st.id,
          staffName: st.name,
          status: rec.status,
          shift: rec.shift,
          overtimeHours: Number(rec.overtime) || 0
        };
      });

      await attendance.add({
        date: attDate,
        records: recordsToSave,
        timestamp: new Date().toISOString()
      });

      toast.success(`তারিখ ${attDate} এর জন্য স্টাফ হাজিরা ও ডিউটি শিফট সফলভাবে রক্ষিত হয়েছে`);
      setShowAttendanceModal(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleUpdateAttRow = (staffId: string, field: "status" | "shift" | "overtime", value: any) => {
    setAttRecords(prev => {
      const current = prev[staffId] || { status: "Present", shift: "Day-Shift (সকাল ৮ - বিকাল ৫)", overtime: 0 };
      return {
        ...prev,
        [staffId]: {
          ...current,
          [field]: value
        }
      };
    });
  };

  // Payroll / Monthly Salary sheet calculation
  const handleSavePayroll = async () => {
    if (!payStaffId) return toast.error("স্টাফ সিলেক্ট করুন");
    
    const staffObj = staff.find(st => st.id === payStaffId);
    const basicPay = payBasic || Number(staffObj?.salary || 0);
    const otPay = payOvertimeHrs * payOvertimeRate;
    const netSalary = basicPay + otPay + payBonus - payDeductions;

    try {
      await payroll.add({
        staffId: payStaffId,
        staffName: staffObj?.name || "Unknown",
        month: payMonth,
        basicPay,
        overtimeHrs: payOvertimeHrs,
        overtimePay: otPay,
        deductions: payDeductions,
        bonus: payBonus,
        netSalary,
        status: "Paid (পরিশোধিত)",
        date: new Date().toISOString()
      });

      toast.success(`${staffObj?.name} এর পে-রোল ও বেতন সফলভাবে প্রসেস করা হয়েছে!`);
      setShowPayrollModal(false);
      setPayStaffId("");
      setPayOvertimeHrs(0);
      setPayBonus(0);
      setPayDeductions(0);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Fixed Asset Registration
  const handleSaveAsset = async () => {
    if (!assetName || assetCost <= 0) return toast.error("পর্যাপ্ত বিবরণ এবং ক্রয়মূল্য লিখুন");

    try {
      await fixedAssets.add({
        name: assetName,
        purchasedAt: assetCost,
        deprRateAnnualPercent: assetDeprRate,
        purchaseDate: assetPurchaseDate,
        status: "Active (সচল)",
        salvageValue: assetCost * 0.1, // standard 10% salvage value default
        currentBookValue: assetCost
      });

      toast.success("স্থায়ী ফার্নিচার/সম্পদ রেজিস্টারে যুক্ত করা হয়েছে!");
      setShowAssetModal(false);
      setAssetName("");
      setAssetCost(0);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Loan EMI accounts tracker
  const handleSaveLoan = async () => {
    if (!loanSource || loanPrincipal <= 0) return toast.error("ঋণদাতা ও ঋণের পরিমাণ লিখুন");
    
    // EMI estimation: Principal + interest total split over months
    const totalAmount = loanPrincipal + (loanPrincipal * (loanInterestPercent / 100));
    const emi = Math.round(totalAmount / loanDurationMonths);

    try {
      await loans.add({
        source: loanSource,
        principal: loanPrincipal,
        interestPercent: loanInterestPercent,
        totalPayable: totalAmount,
        durationMonths: loanDurationMonths,
        monthlyEmi: emi,
        outstanding: totalAmount,
        paidInstallments: 0,
        paymentsList: [],
        status: "Ongoing (চলতি)"
      });

      toast.success("ঋণ অ্যাকাউন্ট ও ইএমআই শিডিউল সাকসেসফুলি রেজিস্টার হয়েছে!");
      setShowLoanModal(false);
      setLoanSource("");
      setLoanPrincipal(0);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Pay loan EMI installment
  const handlePayEmi = async (loanItem: any) => {
    const installmentAmount = loanItem.monthlyEmi;
    const nextOutstanding = Math.max(0, loanItem.outstanding - installmentAmount);
    const nextPaidCount = loanItem.paidInstallments + 1;
    const isCompleted = nextOutstanding <= 0;

    try {
      await loans.update(loanItem.id, {
        outstanding: nextOutstanding,
        paidInstallments: nextPaidCount,
        status: isCompleted ? "Paid Off (পরিশোধিত)" : "Ongoing (চলতি)",
        paymentsList: [...(loanItem.paymentsList || []), {
          amount: installmentAmount,
          date: new Date().toISOString()
        }]
      });
      toast.success("ঋণের কিস্তি (EMI) সফলভাবে পরিশোধ করা হয়েছে ও ব্যালেন্স আপডেট হয়েছে।");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-950 dark:text-gray-100 flex items-center gap-2">
            <Layers className="w-7 h-7 text-indigo-600 animate-pulse" />
            অ্যাডভান্সড অপারেশনস ও এইচআর হাব (Advanced Operational ERP)
          </h2>
          <p className="text-gray-500 text-sm mt-1 font-medium">
            উন্নত ম্যানুফ্যাকচারিং, কাঁচামাল/প্রোডাকশন হিসাব, স্টোর ট্রান্সফার, এক্সচেঞ্জ পলিসি, স্টাফ পে-রোল ও ঋণের সমন্বিত মডিউল।
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-2.5 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-gray-150 max-w-fit">
        <button
          onClick={() => setActiveTab("production")}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
            activeTab === "production"
              ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-800"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-400"
          }`}
        >
          <Scissors className="w-4 h-4" />
          উৎপাদন ও রেসিপি (BOM)
        </button>

        <button
          onClick={() => setActiveTab("transfer")}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
            activeTab === "transfer"
              ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-800"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-400"
          }`}
        >
          <Building2 className="w-4 h-4" />
          স্টোর ট্রান্সফার
        </button>

        <button
          onClick={() => setActiveTab("returns")}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
            activeTab === "returns"
              ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-800"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-400"
          }`}
        >
          <Undo2 className="w-4 h-4" />
          ফেরত ও এক্সচেঞ্জ পলিসি
        </button>

        <button
          onClick={() => setActiveTab("hrm")}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
            activeTab === "hrm"
              ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-800"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-400"
          }`}
        >
          <Users className="w-4 h-4" />
          এইচআরএম ও পে-রোল
        </button>

        <button
          onClick={() => setActiveTab("assets")}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
            activeTab === "assets"
              ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-800"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-400"
          }`}
        >
          <Coins className="w-4 h-4" />
          স্থায়ী সম্পদ ও ঋণ খতিয়ান
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* TAB 1: PRODUCTION & BOM */}
        {activeTab === "production" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
            id="production-tab-container"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Summary Stats Cards */}
              <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-xs font-extrabold uppercase">সচল রেসিপি (BOM)</span>
                  <div className="p-2 bg-indigo-50/70 rounded-lg text-indigo-600"><FileText className="w-5 h-5"/></div>
                </div>
                <h3 className="text-3xl font-black text-gray-950">{boms.data?.length || 0} টি</h3>
                <p className="text-xs text-gray-400 font-bold">তৈরি পণ্যের জন্য কাঁচামাল কাঠামোর খতিয়ান</p>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-xs font-extrabold uppercase">মোট উৎপাদন সম্পন্ন</span>
                  <div className="p-2 bg-emerald-50/70 rounded-lg text-emerald-600"><Check className="w-5 h-5"/></div>
                </div>
                <h3 className="text-3xl font-black text-emerald-700">{productions.data?.reduce((acc, p) => acc + (p.qtyProduced || 0), 0) || 0} ইউনিট</h3>
                <p className="text-xs text-gray-400 font-bold">কাঁচামাল থেকে ফিনিশড পণ্য প্রক্রিয়াকরণ</p>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-2xs space-y-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-sm text-gray-900">ম্যানুফ্যাকচারিং কুইক অ্যাকশন</h4>
                    <p className="text-gray-400 text-xs">রেসিপি সেটআপ করুন ও উৎপাদন চালাক</p>
                  </div>
                  <Sparkles className="w-5 h-5 text-amber-500 animate-bounce" />
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setShowBomModal(true)}
                    className="flex-1 px-4 py-2.5 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer transition-all text-center"
                  >
                    + নতুন রেসিপি (BOM)
                  </button>
                  <button
                    onClick={() => setShowProdModal(true)}
                    className="flex-1 px-4 py-2.5 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition-all text-center"
                    disabled={boms.data?.length === 0}
                  >
                    🚀 উৎপাদন শুরু করুন
                  </button>
                </div>
              </div>
            </div>

            {/* List Of Recipe BOMs */}
            <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-150 flex items-center justify-between">
                <h3 className="font-black text-gray-950 text-base">অনুমোদিত প্রোডাক্ট রেসিপি খতিয়ান (BOM Recipes)</h3>
                <span className="text-xs text-indigo-600 font-bold px-2.5 py-1 bg-indigo-50/60 rounded-lg">মোট ফরম্যাট: {boms.data?.length || 0}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="p-4 text-xs font-extrabold text-gray-500">রেসিপির নাম (BOM Name)</th>
                      <th className="p-4 text-xs font-extrabold text-gray-500">তৈরিযোগ্য পণ্য (Output Product)</th>
                      <th className="p-4 text-xs font-extrabold text-gray-500">উপাদান সামগ্রী (Ingredients Structure)</th>
                      <th className="p-4 text-xs font-extrabold text-gray-500 text-center">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150">
                    {boms.data?.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-gray-400 font-bold text-xs">
                          কোন রেসিপি (BOM) পাওয়া যায়নি। কাঁচামাল এবং তৈরি পণ্য ম্যাপিং এর জন্য একটি রেসিপি তৈরি করুন।
                        </td>
                      </tr>
                    ) : (
                      boms.data?.map((bom) => (
                        <tr key={bom.id} className="hover:bg-slate-50/40">
                          <td className="p-4 font-extrabold text-gray-900 text-xs">{bom.name}</td>
                          <td className="p-4 text-xs text-slate-700">
                            <span className="font-black text-indigo-700">{bom.outputProductName}</span>
                            <span className="text-[10px] text-gray-400 block mt-0.5">ব্যাচ পরিমাণ: <strong className="text-gray-900">{bom.outputQty} Unit</strong></span>
                          </td>
                          <td className="p-4 text-xs">
                            <div className="flex flex-wrap gap-1.5 max-w-lg">
                              {bom.ingredients?.map((ing: any, i: number) => (
                                <span key={i} className="px-2 py-1 rounded-lg bg-slate-100 text-[10px] font-bold text-slate-800 border border-slate-200">
                                  {ing.productName} ({ing.qty} Unit)
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => boms.remove(bom.id)}
                              className="p-1 px-2.5 rounded-lg text-red-600 hover:bg-red-50 text-[11px] font-extrabold border border-red-150 transition-all cursor-pointer"
                            >
                              ডিলিট
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Production Logs History */}
            <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-150">
                <h3 className="font-black text-gray-950 text-base">উৎপাদন ও চালানের রিয়েল-টাইম লগ (Production Runs)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="p-4 text-xs font-extrabold text-gray-500">সময় ও তারিখ</th>
                      <th className="p-4 text-xs font-extrabold text-gray-500">রেসিপির রেফারেন্স</th>
                      <th className="p-4 text-xs font-extrabold text-gray-500">তৈরিকৃত ফিনিশড পণ্য</th>
                      <th className="p-4 text-xs font-extrabold text-gray-500">ব্যবহৃত কাঁচামালের পরিমাণ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150">
                    {productions.data?.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-gray-400 font-bold text-xs">
                          কোন উৎপাদন চালানোর তথ্য এখনও রেকর্ড করা হয়নি।
                        </td>
                      </tr>
                    ) : (
                      productions.data?.map((prod) => (
                        <tr key={prod.id} className="hover:bg-slate-50/40">
                          <td className="p-4 text-xs text-gray-500 font-sans">{new Date(prod.timestamp).toLocaleString()}</td>
                          <td className="p-4 font-extrabold text-gray-800 text-xs">{prod.bomName}</td>
                          <td className="p-4 text-xs">
                            <span className="font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-150">
                              + {prod.qtyProduced} Unit {prod.outputProductName}
                            </span>
                          </td>
                          <td className="p-4 text-xs text-gray-500">
                            <div className="flex flex-wrap gap-1">
                              {prod.rawMaterialsUsed?.map((rw: any, idx: number) => (
                                <span key={idx} className="text-[10px] text-gray-600 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5">
                                  - {rw.qtyUsed} Unit {rw.productName}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: STORE TRANSFERS */}
        {activeTab === "transfer" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
            id="transfer-tab-container"
          >
            <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-gray-950 text-base">স্টোর ও রোড সেলস ভেহিকেল স্টক ট্রান্সফার</h3>
                <p className="text-gray-500 text-xs mt-1">প্রধান গোডাউন থেকে গাড়ির রোড সাব-স্টোরে পণ্য লোড বা ট্রান্সফার খতিয়ান পরিচালনা করুন।</p>
              </div>
              <button
                type="button"
                onClick={() => setShowTransferModal(true)}
                className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs cursor-pointer transition-all"
              >
                + স্টক ট্রান্সফার করুন
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-150">
                <h3 className="font-black text-gray-950 text-base">ট্রান্সফার রেকর্ড খতিয়ান (Store Transfer History)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="p-4 text-xs font-extrabold text-gray-500">তারিখ ও সময়</th>
                      <th className="p-4 text-xs font-extrabold text-gray-500">পণ্যের বিবরণ</th>
                      <th className="p-4 text-xs font-extrabold text-gray-500">উৎস গোডাউন (From)</th>
                      <th className="p-4 text-xs font-extrabold text-gray-500">গন্তব্য সাব-লোকেশন (To)</th>
                      <th className="p-4 text-xs font-extrabold text-gray-500">পরিমাণ (Quantity)</th>
                      <th className="p-4 text-xs font-extrabold text-gray-500">রেফারেন্স / রুট নং</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150">
                    {transfers.data?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-400 font-bold text-xs">
                          কোন স্টোর ট্রান্সফার লগ পাওয়া যায়নি।
                        </td>
                      </tr>
                    ) : (
                      transfers.data?.map((tr) => (
                        <tr key={tr.id} className="hover:bg-slate-50/40">
                          <td className="p-4 text-xs text-gray-500 font-sans">{new Date(tr.date).toLocaleString()}</td>
                          <td className="p-4 font-extrabold text-gray-900 text-xs">{tr.productName}</td>
                          <td className="p-4 text-xs text-gray-600 font-medium">{tr.source}</td>
                          <td className="p-4 text-xs text-indigo-700 font-bold">{tr.target}</td>
                          <td className="p-4 text-xs text-slate-800 font-extrabold">{tr.qty} Unit</td>
                          <td className="p-4 text-xs text-slate-500">{tr.reference || "N/A"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 3: RETURNS & EXCHANGES */}
        {activeTab === "returns" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
            id="returns-tab-container"
          >
            <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-gray-950 text-base">বিক্রয় ফেরত (Sales Return) এবং সাপ্লায়ার রিফান্ড ম্যানেজার (Purchase Return)</h3>
                <p className="text-gray-500 text-xs mt-1">কাস্টমার ক্লেইম অ্যাডজাস্টমেন্ট ও নষ্ট মালামাল সাপ্লায়ার ফেরত দেয়ার সমন্বয়ক।</p>
              </div>
              <button
                type="button"
                onClick={() => setShowReturnModal(true)}
                className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs cursor-pointer transition-all"
              >
                + রিটার্ন বা এক্সচেঞ্জ অনুমোদন করুন
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-150">
                <h3 className="font-black text-gray-950 text-base">রিটার্ন ও এক্সচেঞ্জ স্টেটমেন্ট লগ (Returns Tracker Statement)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="p-4 text-xs font-extrabold text-gray-500">তারিখ</th>
                      <th className="p-4 text-xs font-extrabold text-gray-500">ধরণ</th>
                      <th className="p-4 text-xs font-extrabold text-gray-500">পার্টি (কাস্টমার/সাপ্লায়ার)</th>
                      <th className="p-4 text-xs font-extrabold text-gray-500">ফেরতকৃত পণ্য ও পরিমাণ</th>
                      <th className="p-4 text-xs font-extrabold text-gray-500">রিফান্ড / সমন্বয় টাকা</th>
                      <th className="p-4 text-xs font-extrabold text-gray-500">এক্সচেঞ্জ / নতুন পরিবর্তন পণ্য</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150">
                    {returns.data?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-400 font-bold text-xs">
                          কোন রিটার্ন ট্র্যাকিং রেকর্ড পাওয়া যায়নি।
                        </td>
                      </tr>
                    ) : (
                      returns.data?.map((ret) => (
                        <tr key={ret.id} className="hover:bg-slate-50/40">
                          <td className="p-4 text-xs text-gray-500 font-sans">{new Date(ret.date).toLocaleDateString()}</td>
                          <td className="p-4 text-xs">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                              ret.type === "sales_return" 
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-150" 
                                : "bg-rose-50 text-rose-800 border border-rose-150"
                            }`}>
                              {ret.type === "sales_return" ? "Sales Return (বিক্রয় ফেরত)" : "Purchase Return (ক্রয় ফেরত)"}
                            </span>
                          </td>
                          <td className="p-4 font-extrabold text-gray-900 text-xs">{ret.partyName}</td>
                          <td className="p-4 text-xs font-bold text-gray-700">{ret.productName} ({ret.qty} Bag/Unit)</td>
                          <td className="p-4 text-xs font-extrabold text-emerald-700">{formatCurrency(ret.refundAmount)}</td>
                          <td className="p-4 text-xs">
                            {ret.exchangeProductName ? (
                              <span className="text-gray-700 font-bold flex items-center gap-1">
                                <Repeat className="w-3 h-3 text-indigo-500" />
                                {ret.exchangeProductName} ({ret.exchangeQty} Unit)
                              </span>
                            ) : (
                              <span className="text-gray-400">শুধু রিফান্ড সম্পন্ন</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 4: HRM, ATTENDANCE & PAYROLL */}
        {activeTab === "hrm" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
            id="hrm-tab-container"
          >
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-2xs space-y-2">
                <span className="text-gray-400 text-[10px] font-extrabold uppercase block">মোট স্টাফ দল (Active Staff)</span>
                <h3 className="text-2xl font-black text-gray-900">{staff.length} জন</h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold inline-block">সক্রিয় কর্মী দল</span>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-2xs space-y-2">
                <span className="text-gray-400 text-[10px] font-extrabold uppercase block">মোট হাজিরা রেকর্ড</span>
                <h3 className="text-2xl font-black text-gray-900">{attendance.data?.length || 0} টি শীট</h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold inline-block">ডেইলি সিঙ্ক লগ</span>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-2xs space-y-2">
                <span className="text-gray-400 text-[10px] font-extrabold uppercase block">প্রসেসড পে-রোল (Payroll This Month)</span>
                <h3 className="text-2xl font-black text-gray-900">{payroll.data?.length || 0} জন</h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 font-bold inline-block">মাসিক বিতরণ রেকর্ড</span>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-gray-150 shadow-2xs flex flex-col justify-between gap-1">
                <button
                  onClick={() => {
                    // Populate initial attendance grid with P (Present)
                    const initial: any = {};
                    staff.forEach(s => {
                      initial[s.id] = { status: "Present", shift: "Day-Shift (সকাল ৮ - বিকাল ৫)", overtime: 0 };
                    });
                    setAttRecords(initial);
                    setShowAttendanceModal(true);
                  }}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] rounded-xl transition-all cursor-pointer text-center"
                >
                  📝 ডেইলি হাজিরা এন্ট্রি
                </button>
                <button
                  onClick={() => setShowPayrollModal(true)}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] rounded-xl transition-all cursor-pointer text-center"
                >
                  💵 স্টাফ পে-রোল ও বেতন ক্যাল্কুলেটর
                </button>
              </div>
            </div>

            {/* Attendance Logs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 border-b border-gray-150 flex items-center justify-between">
                  <h3 className="font-black text-gray-950 text-sm">হাজিরা খতিয়ান (Daily Attendance Logs)</h3>
                  <CalendarRange className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="p-3 text-[11px] font-extrabold text-gray-500">তারিখ</th>
                        <th className="p-3 text-[11px] font-extrabold text-gray-500">সদস্যবৃন্দ তথ্য</th>
                        <th className="p-3 text-[11px] font-extrabold text-gray-500">হাজিরা স্ট্যাটাস ও ওভারটাইম</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {attendance.data?.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-6 text-center text-gray-400 font-bold text-xs">
                            কোন ডেইলি হাজিরা ডেটাবেজে রক্ষিত নেই।
                          </td>
                        </tr>
                      ) : (
                        attendance.data?.map((att) => (
                          <tr key={att.id} className="hover:bg-slate-50/40">
                            <td className="p-3 text-xs text-gray-500 font-sans font-extrabold">{att.date}</td>
                            <td className="p-3 text-xs text-gray-400" colSpan={2}>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                                {att.records?.map((rec: any, i: number) => (
                                  <div key={i} className="px-2 py-1 rounded bg-slate-100 border border-slate-200 flex items-center justify-between gap-1 text-[10px]">
                                    <span className="font-extrabold text-slate-800 truncate max-w-[80px]">{rec.staffName}</span>
                                    <span className={`px-1.5 py-0.2 rounded-sm text-[9px] font-bold ${
                                      rec.status === "Present" ? "bg-emerald-150 text-emerald-800" : "bg-rose-150 text-rose-800"
                                    }`}>{rec.status}</span>
                                    {rec.overtimeHours > 0 && (
                                      <span className="text-[9px] font-black text-indigo-700 font-sans">+{rec.overtimeHours}h OT</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payroll Statement */}
              <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 border-b border-gray-150 flex items-center justify-between">
                  <h3 className="font-black text-gray-950 text-sm">মাসিক পে-রোল বিতরণী (Payroll & Wages Statements)</h3>
                  <DollarSign className="w-4 h-4 text-emerald-500 animate-pulse" />
                </div>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="p-3 text-[11px] font-extrabold text-gray-500">স্টাফ</th>
                        <th className="p-3 text-[11px] font-extrabold text-gray-500">মাস ও ডেট</th>
                        <th className="p-3 text-[11px] font-extrabold text-gray-500 text-right">নেট বেতন পরিশোধিত (Total)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {payroll.data?.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-6 text-center text-gray-400 font-bold text-xs">
                            কোন বেতনের পে-রোল ক্লিয়ারেন্স স্টেটমেন্ট পাওয়া যায়নি।
                          </td>
                        </tr>
                      ) : (
                        payroll.data?.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50/40">
                            <td className="p-3 font-extrabold text-gray-900 text-xs">{p.staffName}</td>
                            <td className="p-3 text-xs text-gray-500">
                              <span className="font-bold text-slate-800 font-sans">{p.month}</span>
                              <span className="text-[9px] block text-gray-400">তারিখ: {new Date(p.date).toLocaleDateString()}</span>
                            </td>
                            <td className="p-3 text-right text-xs font-black text-indigo-700 font-sans">
                              {formatCurrency(p.netSalary)}
                              <span className="text-[9px] block text-emerald-700 font-bold">পরিশোধিত</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 5: ASSET REGISTER & LOANS */}
        {activeTab === "assets" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
            id="assets-tab-container"
          >
            {/* Header Cards Actions */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch justify-between bg-white rounded-3xl p-6 border border-gray-150 shadow-2xs">
              <div className="space-y-1">
                <h3 className="font-black text-gray-950 text-base">ফিক্সড ক্যাপিটাল অ্যাসেট এবং লোন / ইএমআই খতিয়ান</h3>
                <p className="text-gray-500 text-xs">ব্যবসায়িক ক্যাপিটাল সম্পদ ও অন্যান্য ঋণদাতার কিস্তি পেমেন্ট ও বাকি পাওনার রিয়েল-টাইম হিসাব।</p>
              </div>
              <div className="flex gap-2 shrink-0 self-center">
                <button
                  onClick={() => setShowAssetModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs cursor-pointer transition-all"
                >
                  + ফিক্সড অ্যাসেট যোগ করুন
                </button>
                <button
                  onClick={() => setShowLoanModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs cursor-pointer transition-all"
                >
                  + ঋণ অ্যাকাউন্ট খুলুন
                </button>
              </div>
            </div>

            {/* Asset Table and Loan Table Split Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ASSET REGISTER */}
              <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 border-b border-gray-150 flex items-center justify-between">
                  <h3 className="font-black text-gray-950 text-sm">স্থায়ী ফার্নিচার ও সম্পত্তি খতিয়ান (Asset Register)</h3>
                  <Building2 className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="p-3 text-[11px] font-extrabold text-gray-500">সম্পদের বিবরণ</th>
                        <th className="p-3 text-[11px] font-extrabold text-gray-500">ক্রয় তারিখ ও মূল্য</th>
                        <th className="p-3 text-[11px] font-extrabold text-gray-500 text-right">বুক ভ্যালু (Depreciated)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {fixedAssets.data?.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-6 text-center text-gray-400 font-bold text-xs animate-pulse">
                            কোন স্থায়ী ক্যাপিটাল সম্পত্তি এখনো রেকর্ডভুক্ত নেই।
                          </td>
                        </tr>
                      ) : (
                        fixedAssets.data?.map((ast) => {
                          // Straight-line visual estimation of depreciation over years passed
                          const yearsPassed = (Date.now() - new Date(ast.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
                          const totalDeprPercent = Math.min(90, yearsPassed * (ast.deprRateAnnualPercent || 10)); // max 90%
                          const currentVal = Math.round(ast.purchasedAt - (ast.purchasedAt * (totalDeprPercent / 100)));
                          return (
                            <tr key={ast.id} className="hover:bg-slate-50/40">
                              <td className="p-3 text-xs font-extrabold text-gray-900">{ast.name}</td>
                              <td className="p-3 text-xs text-gray-500">
                                <span className="font-bold text-slate-800">{new Date(ast.purchaseDate).toLocaleDateString()}</span>
                                <span className="text-[9px] block text-gray-400">ক্রয়মূল্য: {formatCurrency(ast.purchasedAt)}</span>
                              </td>
                              <td className="p-3 text-right text-xs font-black text-indigo-700 font-sans">
                                {formatCurrency(currentVal)}
                                <span className="text-[9px] block text-rose-500 font-bold">-{totalDeprPercent.toFixed(1)}% অবচিত</span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* LOANS MANAGEMENT */}
              <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 border-b border-gray-150 flex items-center justify-between">
                  <h3 className="font-black text-gray-950 text-sm">ঋণ কিস্তি ট্র্যাকার (Loans & EMI Schedule)</h3>
                  <Coins className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="p-3 text-[11px] font-extrabold text-gray-500">ঋণদাতা ও মূলধন</th>
                        <th className="p-3 text-[11px] font-extrabold text-gray-500">কিস্তি হার (EMI Rate)</th>
                        <th className="p-3 text-[11px] font-extrabold text-gray-500">অবশিষ্ট ঋণ</th>
                        <th className="p-3 text-[11px] font-extrabold text-gray-500 text-center">কিস্তি প্রদান</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {loans.data?.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-gray-400 font-bold text-xs">
                            কোন অ্যাক্টিভ পাওনা বা ঋণ খতিয়ান পাওয়া যায়নি।
                          </td>
                        </tr>
                      ) : (
                        loans.data?.map((ln) => (
                          <tr key={ln.id} className="hover:bg-slate-50/40">
                            <td className="p-3 text-xs text-gray-800">
                              <span className="font-extrabold block text-gray-900">{ln.source}</span>
                              <span className="text-[9px] text-gray-400 block font-sans">মূল: {formatCurrency(ln.principal)} (সুদ: {ln.interestPercent}%)</span>
                            </td>
                            <td className="p-3 text-xs font-bold text-slate-700">
                              <span className="font-sans block text-indigo-700">{formatCurrency(ln.monthlyEmi)}/মাস</span>
                              <span className="text-[9px] block text-gray-400">মেয়াদ: {ln.durationMonths} মাস ({ln.paidInstallments} প্রদত্ত)</span>
                            </td>
                            <td className="p-3 text-xs font-black text-rose-700 font-sans font-extrabold">
                              {formatCurrency(ln.outstanding)}
                              {ln.outstanding <= 0 && <span className="text-[8px] text-emerald-600 font-bold block">Paid Off</span>}
                            </td>
                            <td className="p-3 text-center">
                              {ln.outstanding > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => handlePayEmi(ln)}
                                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] font-black rounded-lg transition-all cursor-pointer"
                                >
                                  পরিশোধ করুন
                                </button>
                              ) : (
                                <span className="text-[10px] text-emerald-600 font-bold">সম্পূর্ণ পরিশোধিত</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MODAL DIALOGS FOR USER CREATIONS --- */}

      {/* MODAL 1: Create Recipe BOM */}
      {showBomModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-3xl max-w-lg w-full p-6 border border-gray-200 shadow-xl space-y-4">
            <h3 className="text-lg font-black text-gray-950">নতুন রেসিপি / বিল অফ মেটেরিয়ালস (BOM Recipe)</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-extrabold text-gray-600 mb-1">রেসিপির নাম বা আইডেন্টিফায়ার</label>
                <input
                  type="text"
                  placeholder="যেমন: মিনি প্যাকেট চিনি রেসিপি"
                  value={newBomName}
                  onChange={(e) => setNewBomName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-gray-600 mb-1">তৈরিযোগ্য ফিনিশড পণ্য (Output)</label>
                  <select
                    value={newBomOutputProd}
                    onChange={(e) => setNewBomOutputProd(e.target.value)}
                    className="w-full p-2.5 rounded-xl border text-xs"
                  >
                    <option value="">পড়ুন / প্রোডাক্ট সিলেক্ট করুন</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (স্টক: {p.stock})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-gray-600 mb-1">ব্যাচ পরিমাণ (Output Batch Qty)</label>
                  <input
                    type="number"
                    value={newBomOutputQty}
                    onChange={(e) => setNewBomOutputQty(Math.max(1, Number(e.target.value)))}
                    className="w-full p-2.5 rounded-xl border text-xs"
                  />
                </div>
              </div>

              {/* Ingredient List State Block */}
              <div className="border border-slate-150 p-3 rounded-2xl bg-slate-50/50 space-y-2">
                <span className="font-extrabold text-xs text-slate-800 block">কাঁচামাল ও প্রয়োজনীয় পরিমাণ অ্যাড করুন</span>
                <div className="flex gap-2">
                  <select
                    value={selectedIngredient}
                    onChange={(e) => setSelectedIngredient(e.target.value)}
                    className="flex-1 p-2 rounded-lg border text-xs bg-white"
                  >
                    <option value="">উপাদান সিলেক্ট করুন</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Qty"
                    value={selectedIngredientQty}
                    onChange={(e) => setSelectedIngredientQty(Math.max(1, Number(e.target.value)))}
                    className="w-20 p-2 rounded-lg border text-xs bg-white text-center"
                  />
                  <button
                    type="button"
                    onClick={handleAddIngredient}
                    className="px-3 bg-indigo-600 text-white font-extrabold text-xs rounded-lg hover:bg-indigo-700 cursor-pointer"
                  >
                    যোগ
                  </button>
                </div>

                {/* List Ingredients added so far */}
                <div className="space-y-1.5 pt-2 max-h-[120px] overflow-y-auto">
                  {bomIngredients.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px] bg-white border px-2 py-1 rounded-lg">
                      <span className="font-bold text-gray-700">{products.find(p => p.id === item.productId)?.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-black font-sans text-indigo-700">{item.qty} Bag/Unit</span>
                        <button
                          type="button"
                          onClick={() => setBomIngredients(prev => prev.filter((_, i) => i !== idx))}
                          className="text-red-500 font-bold shrink-0 text-xs"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 justify-end">
              <button
                onClick={() => setShowBomModal(false)}
                className="px-4 py-2.5 rounded-xl border text-xs font-extrabold hover:bg-slate-50 cursor-pointer"
              >
                বাতিল করুন
              </button>
              <button
                onClick={handleCreateBom}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs cursor-pointer"
              >
                রেসিপি সেভ করুন
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL 2: Run Production */}
      {showProdModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-3xl max-w-sm w-full p-6 border border-gray-200 shadow-xl space-y-4">
            <h3 className="text-lg font-black text-gray-950 flex items-center gap-1.5">
              <span>🚀 কাঁচামাল নিয়ে প্রোডাকশন শুরু</span>
              <Activity className="w-4 h-4 text-emerald-500 animate-spin" />
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-extrabold text-gray-600 mb-1">অ্যাক্টিভ রেসিপি সিলেক্ট করুন</label>
                <select
                  value={prodSelectedBom}
                  onChange={(e) => setProdSelectedBom(e.target.value)}
                  className="w-full p-2.5 rounded-xl border text-xs"
                >
                  <option value="">রেসিপি সিলেক্ট করুন</option>
                  {boms.data?.map(b => (
                    <option key={b.id} value={b.id}>{b.name} (Output: {b.outputProductName})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-gray-600 mb-1">উৎপাদন ব্যাচ গুণনক (Multiplier)</label>
                <input
                  type="number"
                  value={prodQty}
                  onChange={(e) => setProdQty(Math.max(1, Number(e.target.value)))}
                  className="w-full p-2.5 rounded-xl border text-xs"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  বি.দ্র.: এই সংখ্যাটি দিয়ে রেসিপির কাঁচামাল ও তৈরি পণ্যের মূল পরিমাণ গুণ হবে।
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2 justify-end">
              <button
                onClick={() => setShowProdModal(false)}
                className="px-4 py-2.5 rounded-xl border text-xs font-extrabold hover:bg-slate-50 cursor-pointer"
                disabled={isProducing}
              >
                বাতিল
              </button>
              <button
                onClick={handleRunProduction}
                disabled={isProducing}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-750 text-white font-extrabold text-xs cursor-pointer flex items-center gap-1"
              >
                {isProducing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                প্রোডাকশন সম্পন্ন করুন
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL 3: Store & Vehicle Transfer */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-3xl max-w-sm w-full p-6 border border-gray-200 shadow-xl space-y-4">
            <h3 className="text-lg font-black text-gray-950 flex items-center gap-1">
              <span>📦 স্টোর স্টক স্থানান্তর ইন্টিগ্রেশন</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-extrabold text-gray-600 mb-1">স্থানান্তরযোগ্য পণ্য</label>
                <select
                  value={trProductId}
                  onChange={(e) => setTrProductId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border text-xs"
                >
                  <option value="">পণ্য সিলেক্ট করুন</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (প্রধান স্টক: {p.stock || 0})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-gray-600 mb-1">স্থানান্তরকারী উৎস (From)</label>
                <input
                  type="text"
                  value={trSource}
                  onChange={(e) => setTrSource(e.target.value)}
                  className="w-full p-2.5 rounded-xl border text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-gray-600 mb-1">গন্তব্য বা ডেলিভারি গাড়ি (To)</label>
                <input
                  type="text"
                  value={trTarget}
                  onChange={(e) => setTrTarget(e.target.value)}
                  className="w-full p-2.5 rounded-xl border text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-gray-600 mb-1">পরিমাণ (Qty)</label>
                  <input
                    type="number"
                    value={trQty}
                    onChange={(e) => setTrQty(Math.max(1, Number(e.target.value)))}
                    className="w-full p-2.5 rounded-xl border text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-gray-600 mb-1">রেফারেন্স / চালানি নং</label>
                  <input
                    type="text"
                    placeholder="যেমন: রুট-৩ লোড"
                    value={trRef}
                    onChange={(e) => setTrRef(e.target.value)}
                    className="w-full p-2.5 rounded-xl border text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 justify-end">
              <button
                onClick={() => setShowTransferModal(false)}
                className="px-4 py-2.5 rounded-xl border text-xs font-extrabold hover:bg-slate-50 cursor-pointer"
              >
                বাতিল
              </button>
              <button
                onClick={handleStoreTransfer}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs cursor-pointer"
              >
                স্থানান্তর কনফার্ম করুন
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL 4: Return & Exchange policies */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-3xl max-w-md w-full p-6 border border-gray-200 shadow-xl space-y-4">
            <h3 className="text-lg font-black text-gray-950">পণ্য ফেরত ও বিনিময় সমাধান</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-extrabold text-gray-600 mb-1">রিটার্ন পলিসি টাইপ</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setRetType("sales_return"); setRetPartyId(""); }}
                    className={`py-2 rounded-xl text-xs font-extrabold border ${
                      retType === "sales_return" 
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : "bg-white text-gray-600 border-gray-200"
                    }`}
                  >
                    কাস্টমার বিক্রয় ফেরত
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRetType("purchase_return"); setRetPartyId(""); }}
                    className={`py-2 rounded-xl text-xs font-extrabold border ${
                      retType === "purchase_return" 
                        ? "bg-rose-50 text-rose-800 border-rose-300"
                        : "bg-white text-gray-600 border-gray-200"
                    }`}
                  >
                    সাপ্লায়ার ক্রয় ফেরত
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-gray-600 mb-1">সংশ্লিষ্ট পার্টি</label>
                <select
                  value={retPartyId}
                  onChange={(e) => setRetPartyId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border text-xs"
                >
                  <option value="">সিলেক্ট করুন</option>
                  {retType === "sales_return" 
                    ? customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.route || "রুট অজানা"})</option>)
                    : suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.companyName || "কোম্পানি"})</option>)
                  }
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-gray-600 mb-1">ফেরতকৃত পণ্য</label>
                  <select
                    value={retProductId}
                    onChange={(e) => setRetProductId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border text-xs"
                  >
                    <option value="">পণ্য সিলেক্ট করুন</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} (স্টক: {p.stock || 0})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-gray-600 mb-1">কোয়ান্টিটি</label>
                  <input
                    type="number"
                    value={retQty}
                    onChange={(e) => setRetQty(Math.max(1, Number(e.target.value)))}
                    className="w-full p-2.5 rounded-xl border text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-gray-600 mb-1">রিফান্ড পরিমাণ (টাকা / সমন্বয়)</label>
                <input
                  type="number"
                  value={retRefund}
                  onChange={(e) => setRetRefund(Math.max(0, Number(e.target.value)))}
                  className="w-full p-2.5 rounded-xl border text-xs"
                />
              </div>

              {retType === "sales_return" && (
                <div className="border-t border-gray-150 pt-2 space-y-2">
                  <span className="text-xs font-extrabold text-indigo-700 block mt-1">বিনিময় / নতুন পণ্য সমন্বয় (ঐচ্ছিক EXCHANGE)</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <select
                        value={retExchangeProdId}
                        onChange={(e) => setRetExchangeProdId(e.target.value)}
                        className="w-full p-2 rounded-xl border text-[11px]"
                      >
                        <option value="">এক্সচেঞ্জ পণ্য সিলেক্ট করুন</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <input
                        type="number"
                        placeholder="পরিমাণ"
                        value={retExchangeQty}
                        onChange={(e) => setRetExchangeQty(Math.max(0, Number(e.target.value)))}
                        className="w-full p-2 rounded-xl border text-[11px] text-center"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2 justify-end">
              <button
                onClick={() => setShowReturnModal(false)}
                className="px-4 py-2.5 rounded-xl border text-xs font-extrabold hover:bg-slate-50 cursor-pointer"
              >
                বাতিল
              </button>
              <button
                onClick={handleReturnExchange}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs cursor-pointer"
              >
                অনুযায়ী স্টক আপডেট করুন
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL 5: Daily Attendance & shifts allocation */}
      {showAttendanceModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-3xl max-w-2xl w-full p-6 border border-gray-200 shadow-xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-gray-950 flex items-center gap-1">
                <CalendarCheck2 className="w-5 h-5 text-indigo-600" />
                <span>ডেইলি স্টাফ হাজিরা ও রুট রোস্টার মডিউল</span>
              </h3>
              <input
                type="date"
                value={attDate}
                onChange={(e) => setAttDate(e.target.value)}
                className="p-1 px-3 border rounded-xl text-xs font-extrabold leading-tight focus:ring-0"
              />
            </div>

            <div className="space-y-3">
              {staff.map((st) => {
                const rec = attRecords[st.id] || { status: "Present", shift: "Day-Shift (সকাল ৮ - বিকাল ৫)", overtime: 0 };
                return (
                  <div key={st.id} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 gap-3">
                    <div className="truncate min-w-[120px]">
                      <span className="font-extrabold text-xs text-gray-950 block">{st.name}</span>
                      <span className="text-[10px] text-gray-400 font-bold">পদবী: {st.designation || "স্টাফ"}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={rec.status}
                        onChange={(e) => handleUpdateAttRow(st.id, "status", e.target.value)}
                        className="p-1.5 rounded-lg border text-[11px] bg-white font-black"
                      >
                        <option value="Present">Present (উপস্থিত)</option>
                        <option value="Absent">Absent (অনুপস্থিত)</option>
                        <option value="Leave">Leave (ছুটি)</option>
                      </select>

                      <select
                        value={rec.shift}
                        onChange={(e) => handleUpdateAttRow(st.id, "shift", e.target.value)}
                        className="p-1.5 rounded-lg border text-[11px] bg-white text-gray-700"
                      >
                        <option value="Day-Shift (সকাল ৮ - বিকাল ৫)">Morning-Shift (ডে)</option>
                        <option value="Night-Shift (বিকাল ৫ - রাত ১)">Night-Shift (নাইট)</option>
                        <option value="Double-Duty (২৪ ঘণ্টা)">Double-Duty</option>
                      </select>

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-500 font-bold shrink-0">OT (Hr):</span>
                        <input
                          type="number"
                          value={rec.overtime}
                          onChange={(e) => handleUpdateAttRow(st.id, "overtime", Number(e.target.value))}
                          className="w-12 text-center p-1 border rounded bg-white text-xs"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2 justify-end">
              <button
                onClick={() => setShowAttendanceModal(false)}
                className="px-4 py-2.5 rounded-xl border text-xs font-extrabold hover:bg-slate-50 cursor-pointer"
              >
                বাতিল
              </button>
              <button
                onClick={handleSaveAttendance}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs cursor-pointer"
              >
                হাজিরা রিপোর্ট সেভ করুন
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL 6: Payroll Wage processing form */}
      {showPayrollModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-3xl max-w-sm w-full p-6 border border-gray-200 shadow-xl space-y-4">
            <h3 className="text-lg font-black text-gray-950 flex items-center gap-1.5">
              <span>Wages & Pay-roll Generator</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-extrabold text-gray-600 mb-1">স্টাফ সদস্য</label>
                <select
                  value={payStaffId}
                  onChange={(e) => {
                    setPayStaffId(e.target.value);
                    const selected = staff.find(st => st.id === e.target.value);
                    setPayBasic(Number(selected?.salary || 0));
                  }}
                  className="w-full p-2.5 rounded-xl border text-xs"
                >
                  <option value="">সিলেক্ট করুন</option>
                  {staff.map(st => <option key={st.id} value={st.id}>{st.name} (বেসিক বেতন: {st.salary || 0} Tk)</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-gray-600 mb-1">বিল মাস (Month)</label>
                  <input
                    type="month"
                    value={payMonth}
                    onChange={(e) => setPayMonth(e.target.value)}
                    className="w-full p-2 rounded-xl border text-xs font-sans text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-gray-600 mb-1">বেসিক বেতন (টাকা)</label>
                  <input
                    type="number"
                    value={payBasic}
                    onChange={(e) => setPayBasic(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border text-xs text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t pt-2.5 border-dashed">
                <div>
                  <label className="block text-xs font-extrabold text-gray-600 mb-1">ওভারটাইম ঘণ্টা</label>
                  <input
                    type="number"
                    value={payOvertimeHrs}
                    onChange={(e) => setPayOvertimeHrs(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border text-xs text-center font-sans"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-gray-600 mb-1">ওটি রেট (প্রতি ঘণ্টা)</label>
                  <input
                    type="number"
                    value={payOvertimeRate}
                    onChange={(e) => setPayOvertimeRate(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border text-xs text-center font-sans"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-1">
                <div>
                  <label className="block text-xs font-extrabold text-gray-600 mb-1">বোনাস / ইনসেনটিভ</label>
                  <input
                    type="number"
                    value={payBonus}
                    onChange={(e) => setPayBonus(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border text-xs text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-gray-600 mb-1">কর্তন (Deductions)</label>
                  <input
                    type="number"
                    value={payDeductions}
                    onChange={(e) => setPayDeductions(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border text-xs text-center"
                  />
                </div>
              </div>

              {/* Instant dynamic estimate indicator */}
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-950">হিসাবকৃত সর্বমোট নেট পরিশোধ:</span>
                <span className="text-sm font-black text-indigo-700 font-sans">{formatCurrency(payBasic + (payOvertimeHrs * payOvertimeRate) + payBonus - payDeductions)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2 justify-end">
              <button
                onClick={() => setShowPayrollModal(false)}
                className="px-4 py-2.5 rounded-xl border text-xs font-extrabold hover:bg-slate-50 cursor-pointer"
              >
                বাতিল
              </button>
              <button
                onClick={handleSavePayroll}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs cursor-pointer"
              >
                বেতন প্রদান করুন (Post Wages)
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL 7: Fixed Asset creation form */}
      {showAssetModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-3xl max-w-sm w-full p-6 border border-gray-200 shadow-xl space-y-4">
            <h3 className="text-lg font-black text-gray-950">স্থায়ী রাজকীয় সম্পদ / অফিস রেজিস্টার</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-extrabold text-gray-600 mb-1">সম্পদের বর্ণনা (Asset Name)</label>
                <input
                  type="text"
                  placeholder="যেমন: ডোর ডেলিভারি মোটর রুট ভ্যান - ২"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-gray-600 mb-1">ক্রয়মূল্য (টাকা)</label>
                  <input
                    type="number"
                    value={assetCost}
                    onChange={(e) => setAssetCost(Math.max(0, Number(e.target.value)))}
                    className="w-full p-2.5 rounded-xl border text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-gray-600 mb-1">বার্ষিক অবচয় (%)</label>
                  <input
                    type="number"
                    value={assetDeprRate}
                    onChange={(e) => setAssetDeprRate(Math.max(0, Number(e.target.value)))}
                    className="w-full p-2.5 rounded-xl border text-xs text-center font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-gray-600 mb-1">ক্রয় ও চালুর তারিখ</label>
                <input
                  type="date"
                  value={assetPurchaseDate}
                  onChange={(e) => setAssetPurchaseDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border text-xs font-sans text-center"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 justify-end">
              <button
                onClick={() => setShowAssetModal(false)}
                className="px-4 py-2.5 rounded-xl border text-xs font-extrabold hover:bg-slate-50 cursor-pointer"
              >
                বাতিল
              </button>
              <button
                onClick={handleSaveAsset}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs cursor-pointer"
              >
                সম্পদ সেভ করুন
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL 8: Register Loan accounts */}
      {showLoanModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-3xl max-w-sm w-full p-6 border border-gray-200 shadow-xl space-y-4">
            <h3 className="text-lg font-black text-gray-950">ঋণ হিসাব ও কিস্তি (EMI) রেজিস্টার</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-extrabold text-gray-600 mb-1">ঋণদাতা সংস্থা বা ব্যক্তি (Lender)</label>
                <input
                  type="text"
                  placeholder="যেমন: জনতা ব্যাংক লিমিটেড অথবা লোকাল ফাইন্যান্স"
                  value={loanSource}
                  onChange={(e) => setLoanSource(e.target.value)}
                  className="w-full p-2.5 rounded-xl border text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-gray-600 mb-1">ঋণের পরিমাণ (Principal)</label>
                  <input
                    type="number"
                    value={loanPrincipal}
                    onChange={(e) => setLoanPrincipal(Math.max(0, Number(e.target.value)))}
                    className="w-full p-2.5 rounded-xl border text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-gray-600 mb-1">ধার্যকৃত মোট লাভ/সুদ (%)</label>
                  <input
                    type="number"
                    value={loanInterestPercent}
                    onChange={(e) => setLoanInterestPercent(Math.max(0, Number(e.target.value)))}
                    className="w-full p-2.5 rounded-xl border text-xs text-center font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-gray-600 mb-1">পরিশোধের মেয়াদ (মাস)</label>
                <input
                  type="number"
                  value={loanDurationMonths}
                  onChange={(e) => setLoanDurationMonths(Math.max(1, Number(e.target.value)))}
                  className="w-full p-2.5 rounded-xl border text-xs text-center font-sans"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 justify-end">
              <button
                onClick={() => setShowLoanModal(false)}
                className="px-4 py-2.5 rounded-xl border text-xs font-extrabold hover:bg-slate-50 cursor-pointer"
              >
                বাতিল
              </button>
              <button
                onClick={handleSaveLoan}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs cursor-pointer"
              >
                ঋণ হিসাব চালু করুন
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
