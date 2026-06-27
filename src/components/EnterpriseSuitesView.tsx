import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BarChart3, Briefcase, Calendar, CheckCircle2, ChevronRight, DollarSign, Download, 
  FileSpreadsheet, FileText, Filter, HardDrive, Heart, Layers, Lock, 
  Plus, Settings, ShoppingBag, ShoppingCart, Smartphone, Sparkles, 
  Trash2, TrendingUp, Truck, Users, Wrench, AlertTriangle, Eye, ShieldCheck, Cpu,
  Coins, Receipt, CreditCard, ArrowUpRight, ArrowDownRight, ClipboardCheck
} from "lucide-react";
import toast from "react-hot-toast";
import { useLanguage } from "../context/LanguageContext";

interface EnterpriseSuitesViewProps {
  role: string;
  userEmail: string;
}

// Low storage state helper
const useLocalStorage = <T,>(key: string, initialValue: T): [T, (val: T) => void] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn("Storage read error:", error);
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error("Storage write error:", error);
    }
  };

  return [storedValue, setValue];
};

export default function EnterpriseSuitesView({ role, userEmail }: EnterpriseSuitesViewProps) {
  const { language, formatNumber } = useLanguage();
  const [activeSuite, setActiveSuite] = useState<
    "marketing" | "finance" | "hrm" | "procurement" | "supplier" | "plm" | "maintenance" | "accounting" | "distribution" | "cost-mgmt" | "eway-bill" | "accounts-payable" | "accounts-receivable"
  >("marketing");

  // ==========================================
  // MODULE 1: MARKETING MANAGEMENT STATE
  // ==========================================
  const [campaigns, setCampaigns] = useLocalStorage("ent_marketing_campaigns", [
    { id: "c-1", name: "Summer Blast Discount", status: "Active", budget: 45000, reach: 180000, leads: 4200, conversion: 15.5 },
    { id: "c-2", name: "DSR Local Retail Flyer", status: "Active", budget: 12000, reach: 50000, leads: 1100, conversion: 18.2 },
    { id: "c-3", name: "Eid Festival Mega Campaign", status: "Completed", budget: 95000, reach: 450000, leads: 14200, conversion: 22.4 },
    { id: "c-4", name: "Sub-Dealer Point Promo", status: "Planned", budget: 25000, reach: 0, leads: 0, conversion: 0.0 }
  ]);
  const [newCampaign, setNewCampaign] = useState({ name: "", budget: 0, reach: 0, status: "Planned" });

  const marketingStats = useMemo(() => {
    const totalBudget = campaigns.reduce((sum, c) => sum + (Number(c.budget) || 0), 0);
    const totalLeads = campaigns.reduce((sum, c) => sum + (Number(c.leads) || 0), 0);
    const avgConversion = campaigns.length > 0 
      ? (campaigns.reduce((sum, c) => sum + (Number(c.conversion) || 0), 0) / campaigns.length).toFixed(1)
      : "0";
    return { totalBudget, totalLeads, avgConversion };
  }, [campaigns]);

  const handleAddCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaign.name.trim()) return;
    const item = {
      id: "c-" + Date.now(),
      name: newCampaign.name,
      status: newCampaign.status,
      budget: Number(newCampaign.budget) || 0,
      reach: Number(newCampaign.reach) || 0,
      leads: newCampaign.status === "Active" ? Math.round(newCampaign.reach * 0.05) : 0,
      conversion: newCampaign.status === "Active" ? 12.5 : 0
    };
    setCampaigns([...campaigns, item]);
    setNewCampaign({ name: "", budget: 0, reach: 0, status: "Planned" });
    toast.success("মার্কেটিং ক্যাম্পেইন যুক্ত করা হয়েছে");
  };

  const handleDeleteCampaign = (id: string) => {
    setCampaigns(campaigns.filter(c => c.id !== id));
    toast.success("ক্যাম্পেইন ডিলিট করা হয়েছে");
  };

  // ==========================================
  // MODULE 2: FINANCE & ACCOUNTING STATE
  // ==========================================
  const [transactions, setTransactions] = useLocalStorage("ent_finance_transactions", [
    { id: "t-1", date: "2026-06-10", desc: "Warehouse Roof Maintenance Expense", category: "Expense", type: "Utility", amount: 18500, state: "Approved" },
    { id: "t-2", date: "2026-06-09", desc: "Enterprise Client Special Direct Payment", category: "Income", type: "Sales Revenue", amount: 245000, state: "Approved" },
    { id: "t-3", date: "2026-06-08", desc: "Bulk Printer Toner Cartridges Procurement", category: "Expense", type: "Office Supply", amount: 8400, state: "Approved" },
    { id: "t-4", date: "2026-06-07", desc: "Sub-Dealer Security Deposit Transfer", category: "Liability", type: "Deposit", amount: 120000, state: "Pending" }
  ]);
  const [newTx, setNewTx] = useState({ desc: "", category: "Expense", type: "General", amount: 0 });

  const financeStats = useMemo(() => {
    const revenue = transactions.filter(t => t.category === "Income" && t.state === "Approved").reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.category === "Expense" && t.state === "Approved").reduce((sum, t) => sum + t.amount, 0);
    const netProfit = revenue - expenses;
    return { revenue, expenses, netProfit };
  }, [transactions]);

  const handleAddTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTx.desc.trim() || !newTx.amount) return;
    const item = {
      id: "t-" + Date.now(),
      date: new Date().toISOString().split("T")[0],
      desc: newTx.desc,
      category: newTx.category,
      type: newTx.type,
      amount: Number(newTx.amount) || 0,
      state: role === "admin" ? "Approved" : "Pending"
    };
    setTransactions([item, ...transactions]);
    setNewTx({ desc: "", category: "Expense", type: "General", amount: 0 });
    toast.success(role === "admin" ? "লেনদেন যুক্ত এবং অনুমোদন করা হয়েছে" : "লেনদেন অনুমোদনের জন্য পেন্ডিং রয়েছে");
  };

  const handleApproveTx = (id: string) => {
    setTransactions(transactions.map(t => t.id === id ? { ...t, state: "Approved" } : t));
    toast.success("অর্থ লেনদেন সফলভাবে অনুমোদন করা হয়েছে");
  };

  // ==========================================
  // MODULE 3: HUMAN RESOURCES MANAGEMENT (HRM)
  // ==========================================
  const [candidates, setCandidates] = useLocalStorage("ent_hrm_candidates", [
    { id: "h-1", name: "Hasibul Hasan", phone: "+8801552123445", position: "Delivery Officer", stage: "Interview Scheduled", date: "2026-06-08" },
    { id: "h-2", name: "Tania Sultana", phone: "+8801733221144", position: "Junior Accountant", stage: "Under Review", date: "2026-06-10" },
    { id: "h-3", name: "Mohammad Rony", phone: "+8801911443322", position: "DSR Driver", stage: "Hired (Introductory)", date: "2026-06-05" }
  ]);
  const [newCandidate, setNewCandidate] = useState({ name: "", phone: "", position: "Delivery Officer", stage: "Under Review" });

  const handleAddCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandidate.name.trim() || !newCandidate.phone.trim()) return;
    const item = {
      id: "h-" + Date.now(),
      ...newCandidate,
      date: new Date().toISOString().split("T")[0],
    };
    setCandidates([item, ...candidates]);
    setNewCandidate({ name: "", phone: "", position: "Delivery Officer", stage: "Under Review" });
    toast.success("চাকরিপ্রার্থীর আবেদনপত্র নিবন্ধিত হয়েছে");
  };

  const handleUpdateCandidateStage = (id: string, stage: string) => {
    setCandidates(candidates.map(c => c.id === id ? { ...c, stage } : c));
    toast.success("সফলভাবে প্রার্থীর বর্তমান স্ট্যাটাস পরিবর্তন করা হয়েছে");
  };

  // ==========================================
  // MODULE 4: PROCUREMENT MANAGEMENT
  // ==========================================
  const [requisitions, setRequisitions] = useLocalStorage("ent_procure_requisitions", [
    { id: "pr-1", date: "2026-06-09", item: "Warehouse High-output Ceiling Exhaust", qty: 4, estimate: 34000, status: "Approved" },
    { id: "pr-2", date: "2026-06-11", item: "Barcode Scanners and Label Printers", qty: 10, estimate: 58000, status: "Submitted" },
    { id: "pr-3", date: "2026-06-03", item: "DSR Vehicle Spare Tires & Oils", qty: 6, estimate: 22000, status: "Ordered" }
  ]);
  const [newPr, setNewPr] = useState({ item: "", qty: 1, estimate: 0 });

  const handleAddPR = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPr.item.trim() || !newPr.estimate) return;
    const item = {
      id: "pr-" + Date.now(),
      date: new Date().toISOString().split("T")[0],
      item: newPr.item,
      qty: Number(newPr.qty) || 1,
      estimate: Number(newPr.estimate) || 0,
      status: "Submitted"
    };
    setRequisitions([item, ...requisitions]);
    setNewPr({ item: "", qty: 1, estimate: 0 });
    toast.success("ক্রয় চাহিদা পত্র (Purchase Requisition) দাখিল করা হয়েছে");
  };

  const handleApprovePR = (id: string) => {
    setRequisitions(requisitions.map(r => r.id === id ? { ...r, status: "Approved" } : r));
    toast.success("ক্রয় রিকুইজিশন অনুমোদন করা হয়েছে");
  };

  const handleOrderPR = (id: string) => {
    setRequisitions(requisitions.map(r => r.id === id ? { ...r, status: "Ordered" } : r));
    toast.success("পণ্য সরবরাহ আদেশ (Purchase Order) পাঠানো হয়েছে");
  };

  // ==========================================
  // MODULE 5: SUPPLIER MANAGEMENT
  // ==========================================
  const [supplierCards, setSupplierCards] = useLocalStorage("ent_supplier_cards", [
    { id: "s-1", name: "United Distribution Ltd", contact: "Saiful Bari", score: 92, deliveryDays: 3, reliability: "Excellent", overdue: 0 },
    { id: "s-2", name: "Bengal Lubricants and Oils", contact: "Asif Iqbal", score: 85, deliveryDays: 5, reliability: "Good", overdue: 42000 },
    { id: "s-3", name: "Paper & Print Solutions Corp", contact: "Nargis Akhter", score: 79, deliveryDays: 7, reliability: "Standard", overdue: 0 }
  ]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("s-1");
  const [newSupplierForm, setNewSupplierForm] = useState({ name: "", contact: "", score: 85, deliveryDays: 4 });

  const handleAddSupplierCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierForm.name.trim() || !newSupplierForm.contact.trim()) return;
    const item = {
      id: "s-" + Date.now(),
      name: newSupplierForm.name,
      contact: newSupplierForm.contact,
      score: Number(newSupplierForm.score) || 85,
      deliveryDays: Number(newSupplierForm.deliveryDays) || 4,
      reliability: newSupplierForm.score >= 90 ? "Excellent" : newSupplierForm.score >= 80 ? "Good" : "Standard",
      overdue: 0
    };
    setSupplierCards([...supplierCards, item]);
    setNewSupplierForm({ name: "", contact: "", score: 85, deliveryDays: 4 });
    toast.success("নতুন সাপ্লাইয়ার প্রোফাইল তৈরি হয়েছে");
  };

  // ==========================================
  // MODULE 6: PRODUCT LIFECYCLE MANAGEMENT (PLM)
  // ==========================================
  const [plmProducts, setPlmProducts] = useLocalStorage("ent_plm_products", [
    { id: "p-l1", name: "Power 9V Super Engine Oil", code: "P9V-Lub", stage: "Production", riskIndex: "Low Risk", customerRating: 4.8, testDate: "2025-11-10" },
    { id: "p-l2", name: "Premium Filter Mesh T3", code: "PFM-T3", stage: "R&D Simulation", riskIndex: "Moderate Risk", customerRating: 4.2, testDate: "2026-02-15" },
    { id: "p-l3", name: "S-1 Spark Plugs Titanium Series", code: "S1SPT-Titanium", stage: "Piloting & Trial", riskIndex: "Low Risk", customerRating: 0.0, testDate: "2026-05-20" },
    { id: "p-l4", name: "Vintage 2T Classic Grease Formulation", code: "V2CG-Grease", stage: "Decline (Phase-Out)", riskIndex: "High Risk", customerRating: 3.5, testDate: "2024-01-08" }
  ]);
  const [newPlmProduct, setNewPlmProduct] = useState({ name: "", code: "", stage: "R&D Simulation" });

  const handleAddPLMItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlmProduct.name.trim() || !newPlmProduct.code.trim()) return;
    const item = {
      id: "p-l" + Date.now(),
      name: newPlmProduct.name,
      code: newPlmProduct.code,
      stage: newPlmProduct.stage,
      riskIndex: newPlmProduct.stage.includes("Decline") ? "High Risk" : "Low Risk",
      customerRating: 0.0,
      testDate: new Date().toISOString().split("T")[0]
    };
    setPlmProducts([...plmProducts, item]);
    setNewPlmProduct({ name: "", code: "", stage: "R&D Simulation" });
    toast.success("পণ্য লাইফসাইকেল প্রোডাক্ট ও আরএন্ডডি ডিজাইন ল্যাবে নিবন্ধিত হয়েছে");
  };

  const handleUpdatePLMStage = (id: string, stage: string) => {
    setPlmProducts(plmProducts.map(p => {
      if (p.id === id) {
        return {
          ...p,
          stage,
          riskIndex: stage.includes("Decline") ? "High Risk" : "Low Risk"
        };
      }
      return p;
    }));
    toast.success("পণ্যের বর্তমান লাইফসাইকেল স্টেজ আপডেট হয়েছে");
  };

  // ==========================================
  // MODULE 7: MAINTENANCE MANAGEMENT STATE
  // ==========================================
  const [maintenanceSchedule, setMaintenanceSchedule] = useLocalStorage("ent_maint_schedule", [
    { id: "m-1", asset: "Delivery Van (Dhaka-Metro-Ta-9912)", type: "Urgent Mechanical Repair", scheduledDate: "2026-06-11", cost: 12500, state: "In Progress" },
    { id: "m-2", asset: "Warehouse Cold AC Hub", type: "Regular Filter Cleaning", scheduledDate: "2026-06-15", cost: 3000, state: "Assigned" },
    { id: "m-3", asset: "POS System Server Machine", type: "Backup Cloud Storage Migration", scheduledDate: "2026-06-10", cost: 5000, state: "Completed" },
    { id: "m-4", asset: "Electric Forklift Fork Assembly", type: "Lubricating Gears & Re-alignment", scheduledDate: "2026-06-19", cost: 8500, state: "Assigned" }
  ]);
  const [newMaint, setNewMaint] = useState({ asset: "", type: "Regular Servicing", date: "", cost: 0 });

  const handleAddMaint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaint.asset.trim() || !newMaint.date) return;
    const item = {
      id: "m-" + Date.now(),
      asset: newMaint.asset,
      type: newMaint.type,
      scheduledDate: newMaint.date,
      cost: Number(newMaint.cost) || 0,
      state: "Assigned"
    };
    setMaintenanceSchedule([item, ...maintenanceSchedule]);
    setNewMaint({ asset: "", type: "Regular Servicing", date: "", cost: 0 });
    toast.success("নতুন রক্ষণাবেক্ষণ কর্ম-পরিকল্পনা যুক্ত করা হয়েছে");
  };

  const handleCompleteMaint = (id: string) => {
    setMaintenanceSchedule(maintenanceSchedule.map(m => m.id === id ? { ...m, state: "Completed" } : m));
    toast.success("মেনটেন্যান্স সম্পন্ন ঘোষণা করা হয়েছে; দৈনিক ফান্ড বুক হালনাগাদ হবে");
  };

  // ==========================================
  // MODULE 8: ACCOUNTING MANAGEMENT STATE
  // ==========================================
  const [recurringInvoices, setRecurringInvoices] = useLocalStorage("ent_accounting_recurring", [
    { id: "i-1", desc: "Main Office Warehouse Rent", periodicity: "Monthly", amount: 75000, nextDueDate: "2026-07-01", autoCharge: true },
    { id: "i-2", desc: "DMS Cloud ERP Enterprise Subscription", periodicity: "Annually", amount: 150000, nextDueDate: "2026-12-15", autoCharge: true },
    { id: "i-3", desc: "High-Speed Internet Bandwidth Line", periodicity: "Monthly", amount: 3500, nextDueDate: "2026-07-05", autoCharge: false },
    { id: "i-4", desc: "Corporate Municipal Trade License", periodicity: "Annually", amount: 28000, nextDueDate: "2026-09-30", autoCharge: false }
  ]);
  const [newInvoice, setNewInvoice] = useState({ desc: "", periodicity: "Monthly", amount: 0, nextDueDate: "" });

  const handleAddRecurring = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvoice.desc.trim() || !newInvoice.amount || !newInvoice.nextDueDate) return;
    const item = {
      id: "i-" + Date.now(),
      desc: newInvoice.desc,
      periodicity: newInvoice.periodicity,
      amount: Number(newInvoice.amount) || 0,
      nextDueDate: newInvoice.nextDueDate,
      autoCharge: false
    };
    setRecurringInvoices([...recurringInvoices, item]);
    setNewInvoice({ desc: "", periodicity: "Monthly", amount: 0, nextDueDate: "" });
    toast.success("পুনরাবৃত্তিমূলক চালান (Recurring Invoice) তফসিলভুক্ত করা হয়েছে");
  };

  // ==========================================
  // MODULE 9: DISTRIBUTION MANAGEMENT STATE
  // ==========================================
  const [distributionVehicles, setDistributionVehicles] = useLocalStorage("ent_dist_vehicles", [
    { id: "v-1", vehicleType: "Tata Pickup 1.5-Ton", driver: "Karim Uddin", currentRoute: "Dhanmondi Sector 4", fuelCapacity: "85%", status: "On-Route" },
    { id: "v-2", vehicleType: "Three-Wheeler Hydraulic Van", driver: "Sujan Ali", currentRoute: "Mirpur Local Shops", fuelCapacity: "40%", status: "On-Route" },
    { id: "v-3", vehicleType: "Cargo Truck Large Capacity", driver: "Milon Miah", currentRoute: "Sylhet Warehouse Transfer", fuelCapacity: "100%", status: "Dispatched" },
    { id: "v-4", vehicleType: "Express Delivery Rickshaw Auto", driver: "Babu Sheikh", currentRoute: "Uttara Sector 14 Corner", fuelCapacity: "N/A (Battery)", status: "Completed" }
  ]);
  const [newVehicle, setNewVehicle] = useState({ vehicleType: "Tata Pickup 1.5-Ton", driver: "", currentRoute: "", fuelCapacity: "100%" });

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.driver.trim() || !newVehicle.currentRoute.trim()) return;
    const item = {
      id: "v-" + Date.now(),
      vehicleType: newVehicle.vehicleType,
      driver: newVehicle.driver,
      currentRoute: newVehicle.currentRoute,
      fuelCapacity: newVehicle.fuelCapacity,
      status: "Dispatched"
    };
    setDistributionVehicles([...distributionVehicles, item]);
    setNewVehicle({ vehicleType: "Tata Pickup 1.5-Ton", driver: "", currentRoute: "", fuelCapacity: "100%" });
    toast.success("ডিস্ট্রিবিউশন রুট ট্রিপ ডিসপ্যাচ করা হয়েছে");
  };

  const handleUpdateVehicleStatus = (id: string, status: string) => {
    setDistributionVehicles(distributionVehicles.map(v => v.id === id ? { ...v, status } : v));
    toast.success("গাড়ির বর্তমান বিতরণ কার্যাবলীর স্ট্যাটাস হালনাগাদ করা হয়েছে");
  };

  // ==========================================
  // MODULE 10: COST MANAGEMENT STATE
  // ==========================================
  const [costs, setCosts] = useLocalStorage("ent_cost_mgmt_records", [
    { id: "co-1", date: "2026-06-11", name: "Direct Labor Overtime Wages", category: "Direct Labor", center: "Production Plant A", amount: 28500 },
    { id: "co-2", date: "2026-06-10", name: "High-Grade Base Oil Import Tax", category: "Raw Materials", center: "Logistics Hub", amount: 145000 },
    { id: "co-3", date: "2026-06-09", name: "Production Mixer Machine Electricity Grid", category: "Factory Overhead", center: "Production Plant A", amount: 12400 },
    { id: "co-4", date: "2026-06-08", name: "Admin Office Stationary & Software Subscription", category: "Administrative Support", center: "Headquarters", amount: 9600 }
  ]);
  const [newCost, setNewCost] = useState({ name: "", category: "Raw Materials", center: "Production Plant A", amount: 0 });

  const costStats = useMemo(() => {
    const totalCost = costs.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const byCategory = costs.reduce((acc, c) => {
      acc[c.category] = (acc[c.category] || 0) + (Number(c.amount) || 0);
      return acc;
    }, {} as Record<string, number>);
    return { totalCost, byCategory };
  }, [costs]);

  const handleAddCost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCost.name.trim() || !newCost.amount) return;
    const item = {
      id: "co-" + Date.now(),
      date: new Date().toISOString().split("T")[0],
      name: newCost.name,
      category: newCost.category,
      center: newCost.center,
      amount: Number(newCost.amount) || 0
    };
    setCosts([item, ...costs]);
    setNewCost({ name: "", category: "Raw Materials", center: "Production Plant A", amount: 0 });
    toast.success("নতুন খরচ কেন্দ্র রেকর্ড যুক্ত হয়েছে");
  };

  const handleDeleteCost = (id: string) => {
    setCosts(costs.filter(c => c.id !== id));
    toast.success("খরচ রেকর্ড সফলভাবে মুছে ফেলা হয়েছে");
  };

  // ==========================================
  // MODULE 11: E-WAY BILL GENERATION STATE
  // ==========================================
  const [ewayBills, setEwayBills] = useLocalStorage("ent_eway_bills", [
    { id: "ew-1", ewayBillNo: "EWB-20260611-98711", invoiceNo: "INV-99081", vehicleType: "Tata Pickup 1.5-Ton", vehicleNo: "Dhaka Metro-Th-7102", transporter: "Samira Dedicated Carrier", origin: "Dhaka Warehouse", destination: "Chittagong Outlet", totalValue: 125000, date: "2026-06-11", status: "In-Transit" },
    { id: "ew-2", ewayBillNo: "EWB-20260610-12891", invoiceNo: "INV-98542", vehicleType: "Cargo Truck Large Capacity", vehicleNo: "Sylhet Metro-D-4301", transporter: "Dhaka Transport Agency", origin: "Dhaka Warehouse", destination: "Sylhet Warehouse", totalValue: 380000, date: "2026-06-10", status: "Generated" },
    { id: "ew-3", ewayBillNo: "EWB-20260608-41002", invoiceNo: "INV-97211", vehicleType: "Three-Wheeler Hydraulic Van", vehicleNo: "Dhaka Metro-M-0925", transporter: "Samira Local Logistics", origin: "Mirpur Local Hub", destination: "Mirpur Retail Shops", totalValue: 45000, date: "2026-06-08", status: "Delivered" }
  ]);
  const [newEway, setNewEway] = useState({ invoiceNo: "", vehicleType: "Tata Pickup 1.5-Ton", vehicleNo: "", transporter: "Samira Dedicated Carrier", origin: "Dhaka Warehouse", destination: "", totalValue: 0 });

  const handleAddEwayBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEway.invoiceNo.trim() || !newEway.vehicleNo.trim() || !newEway.destination.trim() || !newEway.totalValue) return;
    const item = {
      id: "ew-" + Date.now(),
      ewayBillNo: "EWB-" + new Date().toISOString().replace(/[-:T]/g, "").slice(0, 8) + "-" + Math.floor(10000 + Math.random() * 90000),
      invoiceNo: newEway.invoiceNo,
      vehicleType: newEway.vehicleType,
      vehicleNo: newEway.vehicleNo,
      transporter: newEway.transporter,
      origin: newEway.origin,
      destination: newEway.destination,
      totalValue: Number(newEway.totalValue) || 0,
      date: new Date().toISOString().split("T")[0],
      status: "Generated"
    };
    setEwayBills([item, ...ewayBills]);
    setNewEway({ invoiceNo: "", vehicleType: "Tata Pickup 1.5-Ton", vehicleNo: "", transporter: "Samira Dedicated Carrier", origin: "Dhaka Warehouse", destination: "", totalValue: 0 });
    toast.success("নতুন ই-ওয়ে বিল জেনারেট করা হয়েছে");
  };

  const handleUpdateEwayStatus = (id: string, status: string) => {
    setEwayBills(ewayBills.map(b => b.id === id ? { ...b, status } : b));
    toast.success("ই-ওয়ে বিলের অবস্থা হালনাগাদ করা হয়েছে");
  };

  const handleDeleteEwayBill = (id: string) => {
    setEwayBills(ewayBills.filter(b => b.id !== id));
    toast.success("ই-ওয়ে বিল ডিলিট করা হয়েছে");
  };

  // ==========================================
  // MODULE 12: ACCOUNTS PAYABLE STATE
  // ==========================================
  const [payables, setPayables] = useLocalStorage("ent_accounts_payable", [
    { id: "ap-1", supplierName: "United Distribution Ltd", invoiceNo: "INV-SUP-881", amount: 140000, amountPaid: 60000, dueDate: "2026-06-25", status: "Partially Paid" },
    { id: "ap-2", supplierName: "Bengal Lubricants and Oils", invoiceNo: "INV-SUP-902", amount: 95000, amountPaid: 0, dueDate: "2026-06-18", status: "Unpaid" },
    { id: "ap-3", supplierName: "Padma Printing & Bags Group", invoiceNo: "INV-SUP-762", amount: 24000, amountPaid: 24000, dueDate: "2026-06-05", status: "Paid" },
    { id: "ap-4", supplierName: "Apex Engine Spares PLC", invoiceNo: "INV-SUP-910", amount: 220000, amountPaid: 0, dueDate: "2026-06-30", status: "Unpaid" }
  ]);
  const [newPayable, setNewPayable] = useState({ supplierName: "United Distribution Ltd", invoiceNo: "", amount: 0, dueDate: "" });

  const apStats = useMemo(() => {
    const totalAp = payables.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const paidAp = payables.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);
    const outstandingAp = totalAp - paidAp;
    return { totalAp, paidAp, outstandingAp };
  }, [payables]);

  const handleAddPayable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayable.invoiceNo.trim() || !newPayable.amount || !newPayable.dueDate) return;
    const item = {
      id: "ap-" + Date.now(),
      supplierName: newPayable.supplierName,
      invoiceNo: newPayable.invoiceNo,
      amount: Number(newPayable.amount) || 0,
      amountPaid: 0,
      dueDate: newPayable.dueDate,
      status: "Unpaid"
    };
    setPayables([...payables, item]);
    setNewPayable({ supplierName: "United Distribution Ltd", invoiceNo: "", amount: 0, dueDate: "" });
    toast.success("প্রদেয় হিসাব (Accounts Payable) বিল নিবন্ধিত হয়েছে");
  };

  const handleRecordApPayment = (id: string, amountToPay: number) => {
    setPayables(payables.map(p => {
      if (p.id === id) {
        const nextPaid = (Number(p.amountPaid) || 0) + amountToPay;
        const finalPaid = Math.min(nextPaid, p.amount);
        const status = finalPaid >= p.amount ? "Paid" : finalPaid > 0 ? "Partially Paid" : "Unpaid";
        return {
          ...p,
          amountPaid: finalPaid,
          status
        };
      }
      return p;
    }));
    toast.success("সাপ্লায়ার পেমেন্ট সফলভাবে রেকর্ড করা হয়েছে");
  };

  const handleDeletePayable = (id: string) => {
    setPayables(payables.filter(p => p.id !== id));
    toast.success("প্রদেয় ডেবিট ভাউচার অপসারণ করা হয়েছে");
  };

  // ==========================================
  // MODULE 13: ACCOUNTS RECEIVABLE STATE
  // ==========================================
  const [receivables, setReceivables] = useLocalStorage("ent_accounts_receivable", [
    { id: "ar-1", customerName: "Zaman Motors (মেসার্স জামান মটরস)", invoiceNo: "INV-CUST-8812A", amount: 125000, amountReceived: 45000, dueDate: "2026-06-20", status: "Partially Paid" },
    { id: "ar-2", customerName: "Sakib Hasan (সাকিব হাসান)", invoiceNo: "INV-CUST-7651X", amount: 45000, amountReceived: 0, dueDate: "2026-06-15", status: "Unpaid" },
    { id: "ar-3", customerName: "Mostafa Filling Station (মোস্তফা ফিলিং)", invoiceNo: "INV-CUST-2231A", amount: 320000, amountReceived: 320000, dueDate: "2026-06-01", status: "Paid" },
    { id: "ar-4", customerName: "Azim & Co Kushtia (আজিম এন্ড কোং)", invoiceNo: "INV-CUST-9011B", amount: 185000, amountReceived: 0, dueDate: "2026-06-24", status: "Unpaid" }
  ]);
  const [newReceivable, setNewReceivable] = useState({ customerName: "", invoiceNo: "", amount: 0, dueDate: "" });

  const arStats = useMemo(() => {
    const totalAr = receivables.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const receivedAr = receivables.reduce((sum, r) => sum + (Number(r.amountReceived) || 0), 0);
    const outstandingAr = totalAr - receivedAr;
    return { totalAr, receivedAr, outstandingAr };
  }, [receivables]);

  const handleAddReceivable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReceivable.customerName.trim() || !newReceivable.invoiceNo.trim() || !newReceivable.amount || !newReceivable.dueDate) return;
    const item = {
      id: "ar-" + Date.now(),
      customerName: newReceivable.customerName,
      invoiceNo: newReceivable.invoiceNo,
      amount: Number(newReceivable.amount) || 0,
      amountReceived: 0,
      dueDate: newReceivable.dueDate,
      status: "Unpaid"
    };
    setReceivables([...receivables, item]);
    setNewReceivable({ customerName: "", invoiceNo: "", amount: 0, dueDate: "" });
    toast.success("প্রাপ্য হিসাব (Accounts Receivable) বিল নিবন্ধিত হয়েছে");
  };

  const handleRecordArReceipt = (id: string, amountToReceive: number) => {
    setReceivables(receivables.map(r => {
      if (r.id === id) {
        const nextReceived = (Number(r.amountReceived) || 0) + amountToReceive;
        const finalReceived = Math.min(nextReceived, r.amount);
        const status = finalReceived >= r.amount ? "Paid" : finalReceived > 0 ? "Partially Paid" : "Unpaid";
        return {
          ...r,
          amountReceived: finalReceived,
          status
        };
      }
      return r;
    }));
    toast.success("গ্রাহক পেমেন্ট প্রাপ্তি সফলভাবে রেকর্ড করা হয়েছে");
  };

  const handleDeleteReceivable = (id: string) => {
    setReceivables(receivables.filter(r => r.id !== id));
    toast.success("প্রাপ্য ক্রেডিট ভাউচার অপসারণ করা হয়েছে");
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Visual Workspace Hero Banner */}
      <div className="bg-slate-950 text-white p-6 md:p-8 rounded-3xl shadow-2xl border border-slate-900 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl -mr-12 -mt-12" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-emerald-600/5 rounded-full blur-3xl -ml-12 -mb-12" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2 font-black text-indigo-400 text-xs uppercase tracking-widest bg-indigo-500/10 p-1.5 px-3 rounded-xl w-max border border-indigo-500/20">
              <Cpu className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
              <span>Samira Traders Consolidated ERP</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-indigo-400" />
              এন্টারপ্রাইজ ইআরপি ম্যানেজমেন্ট মডিউলসমূহ (ERP Suite)
            </h2>
            <p className="text-slate-400 text-xs md:text-sm max-w-2xl mt-1 leading-relaxed">
              মার্কেটিং, ফিন্যান্স, কর্মী পরিচালনা (HRM), মেটেরিয়াল রিকোয়ারমেন্ট, সাপ্লাইয়ার চেইন, প্রোডাক্ট লাইফসাইকেল (PLM), রক্ষণাবেক্ষণ, এবং ডিস্ট্রিবিউশন নেটওয়ার্কের একীভূত ড্যাশবোর্ড।
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 p-3 rounded-2xl border border-slate-800 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-extrabold text-slate-350 uppercase tracking-widest text-[9.5px]">ADMIN SECURED PRIVILEGES ON</span>
          </div>
        </div>
      </div>

      {/* Grid Sub-Tab Swapper Container */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-13 gap-2.5 p-1.5 bg-slate-100 rounded-3xl border border-gray-150">
        {[
          { id: "marketing", label: language === "bn" ? "মার্কেটিং" : "Marketing", bnText: "প্রচার ও লিড", icon: Sparkles },
          { id: "finance", label: language === "bn" ? "ফাইন্যান্স" : "Finance & Acc", bnText: "রাজস্ব ও লাভ", icon: DollarSign },
          { id: "hrm", label: language === "bn" ? "এইচআরএম" : "HRM Systems", bnText: "কর্মী নিয়োগ", icon: Users },
          { id: "procurement", label: language === "bn" ? "প্রকিউরমেন্ট" : "Requisitions", bnText: "ক্রয় চাহিদা", icon: ShoppingBag },
          { id: "supplier", label: language === "bn" ? "সাপ্লায়ার" : "Supplier Hub", bnText: "কর্মদক্ষতা", icon: Wrench },
          { id: "plm", label: language === "bn" ? "প্রোডাক্ট PLM" : "PLM Lab", bnText: "আরএন্ডডি ল্যাব", icon: Layers },
          { id: "maintenance", label: language === "bn" ? "মেনটেন্যান্স" : "Maintenance", bnText: "সার্ভিস শিডিউল", icon: HardDrive },
          { id: "accounting", label: language === "bn" ? "অ্যাকাউন্টিং" : "Accounting", bnText: "নিয়মিত বিল", icon: FileText },
          { id: "distribution", label: language === "bn" ? "ডিস্ট্রিবিউশন" : "Distribution", bnText: "বিতরণ গাড়ি", icon: Truck },
          { id: "cost-mgmt", label: language === "bn" ? "কস্ট ম্যানেজমেন্ট" : "Cost Mgmt", bnText: "উৎপাদন খরচ", icon: Coins },
          { id: "eway-bill", label: language === "bn" ? "ই-ওয়ে বিল" : "E-Way Bill", bnText: "পরিবহন চালান", icon: ClipboardCheck },
          { id: "accounts-payable", label: language === "bn" ? "প্রদেয় (AP)" : "Payables", bnText: "সাপ্লায়ার দেনা", icon: CreditCard },
          { id: "accounts-receivable", label: language === "bn" ? "প্রাপ্য (AR)" : "Receivables", bnText: "গ্রাহক পাওনা", icon: Receipt }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveSuite(item.id as any)}
            className={`flex flex-col items-center justify-center p-3 py-4 rounded-2xl text-[11px] font-black cursor-pointer transition-all border ${
              activeSuite === item.id
                ? "bg-white text-indigo-600 border-indigo-200 shadow-md scale-[1.03]"
                : "bg-transparent text-gray-500 border-transparent hover:bg-white/50"
            }`}
          >
            <item.icon className={`w-5 h-5 mb-1 text-center ${activeSuite === item.id ? "text-indigo-600 scale-110" : "text-gray-400"}`} />
            <span className="block font-black truncate max-w-full text-center">{item.label}</span>
            <span className="block text-[8px] text-gray-400 font-semibold truncate max-w-full text-center">{item.bnText}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ==========================================
            SUITE 1: MARKETING MANAGEMENT WORKSPACE
            ========================================== */}
        {activeSuite === "marketing" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            key="marketing-panel"
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl p-6 border shadow-xs">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-black text-gray-950 uppercase tracking-widest">চলতি প্রমোশন ও মার্কেটিং সেগমেন্ট (Live Campaign Pipeline)</h3>
                  <span className="text-[10px] bg-slate-50 border border-slate-150 p-2.5 py-1 text-slate-500 font-extrabold rounded-lg">সক্রিয় বিজ্ঞাপন বাজেট</span>
                </div>

                <div className="overflow-hidden border border-slate-100 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-150 text-[10px] text-gray-500 font-black uppercase">
                        <th className="p-3">ক্যাম্পেইনের নাম</th>
                        <th className="p-3">অবস্থা</th>
                        <th className="p-3">বাজেট</th>
                        <th className="p-3">পৌঁছেছে (Reach)</th>
                        <th className="p-3">কনভার্শন রেট</th>
                        <th className="p-3 text-right">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {campaigns.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50/20">
                          <td className="p-3 font-bold text-gray-900">{c.name}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-md border text-[9px] font-black ${
                              c.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-250" :
                              c.status === "Completed" ? "bg-slate-50 text-slate-700 border-slate-205" :
                              "bg-amber-50 text-amber-700 border-amber-205"
                            }`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold text-indigo-700">{formatNumber(c.budget)} ৳</td>
                          <td className="p-3 font-mono text-gray-500">{formatNumber(c.reach)}</td>
                          <td className="p-3 font-mono font-black text-emerald-600">{c.conversion}%</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleDeleteCampaign(c.id)}
                              className="text-rose-600 hover:text-rose-800 p-1 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Add Campaign Form */}
              <div className="bg-white rounded-3xl p-6 border shadow-xs">
                <h4 className="text-xs font-black text-gray-950 uppercase tracking-widest mb-4 flex items-center gap-1.5 border-b pb-2">
                  <Plus className="w-3.5 h-3.5 text-indigo-600" /> নতুন ক্যাম্পেইন এন্ট্রি (Launch Promo)
                </h4>
                <form onSubmit={handleAddCampaign} className="space-y-4 text-xs font-semibold">
                  <div>
                    <label className="block text-slate-500 font-extrabold mb-1">প্রকৌশল ও ক্যাম্পেইনের বিবরণ</label>
                    <input
                      type="text"
                      className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none"
                      placeholder="e.g. Free Oil Filter Promo Eid"
                      value={newCampaign.name}
                      onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 font-extrabold mb-1">মোট বাজেট (৳)</label>
                      <input
                        type="number"
                        className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none"
                        placeholder="25000"
                        value={newCampaign.budget || ""}
                        onChange={(e) => setNewCampaign({ ...newCampaign, budget: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-extrabold mb-1">প্রাক্কলিত রিচ (Target)</label>
                      <input
                        type="number"
                        className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none"
                        placeholder="50000"
                        value={newCampaign.reach || ""}
                        onChange={(e) => setNewCampaign({ ...newCampaign, reach: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-500 font-extrabold mb-1">অবস্থা</label>
                    <select
                      className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none bg-white"
                      value={newCampaign.status}
                      onChange={(e) => setNewCampaign({ ...newCampaign, status: e.target.value })}
                    >
                      <option value="Planned">Planned (পরিকল্পিত)</option>
                      <option value="Active">Active (চলতি)</option>
                      <option value="Completed">Completed (সম্পন্ন)</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-extrabold rounded-xl hover:bg-indigo-700 cursor-pointer">
                    ক্যাম্পেইন যোগ করুন
                  </button>
                </form>
              </div>

              {/* Marketing Analytics Overview */}
              <div className="bg-slate-900 text-white p-5 rounded-3xl space-y-4">
                <span className="text-[10px] font-black text-indigo-400 block uppercase tracking-widest">MARKETING KPI ANALYTICS</span>
                <div className="space-y-3 font-bold text-xs text-slate-350">
                  <div className="flex justify-between">
                    <span>মোট বাজেট খরচ:</span>
                    <span className="font-mono text-white text-sm font-extrabold">{formatNumber(marketingStats.totalBudget)} ৳</span>
                  </div>
                  <div className="flex justify-between">
                    <span>সংগৃহীত মোট লিড:</span>
                    <span className="font-mono text-white text-sm font-extrabold">{formatNumber(marketingStats.totalLeads)} টি</span>
                  </div>
                  <div className="flex justify-between pb-1 border-b border-slate-800">
                    <span>গড় লিড কনভার্শন রেট:</span>
                    <span className="font-mono text-white text-sm font-extrabold">{marketingStats.avgConversion}%</span>
                  </div>
                  <div className="pt-2">
                    <span className="text-[9px] text-indigo-300 block mb-1">ROAS VALUE SCORECARD (CAC target)</span>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full w-[84%]" />
                    </div>
                    <span className="block text-[8px] text-slate-400 mt-1">কাস্টমার একুইজিশন কস্ট (CAC) সীমা অপেক্ষা ১৬% নিচে রয়েছে</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==========================================
            SUITE 2: FINANCE & ACCOUNTING WORKSPACE
            ========================================== */}
        {activeSuite === "finance" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            key="finance-panel"
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl p-6 border shadow-xs">
                <h3 className="text-sm font-black text-gray-950 uppercase tracking-widest mb-4">জেনারেল লেজার ও ট্রানজেকশন জার্নাল (General Ledger Journal)</h3>
                
                {/* Financial Health Snapshot Row */}
                <div className="grid grid-cols-3 gap-4 mb-5">
                  <div className="bg-emerald-50/50 p-4 border border-emerald-100 rounded-2xl">
                    <span className="text-[9px] text-emerald-700 font-extrabold uppercase">অ্যাপ্রুভড সেভড রেভিনিউ</span>
                    <span className="block text-xl font-mono font-black text-emerald-800 mt-0.5">+{formatNumber(financeStats.revenue)} ৳</span>
                  </div>
                  <div className="bg-rose-50/50 p-4 border border-rose-100 rounded-2xl">
                    <span className="text-[9px] text-rose-700 font-extrabold uppercase">অ্যাপ্রুভড মোট ব্যয়</span>
                    <span className="block text-xl font-mono font-black text-rose-800 mt-0.5">-{formatNumber(financeStats.expenses)} ৳</span>
                  </div>
                  <div className="bg-indigo-50/50 p-4 border border-indigo-100 rounded-2xl">
                    <span className="text-[9px] text-indigo-700 font-extrabold uppercase">নেট ক্যাশ ফ্লো লাভ</span>
                    <span className="block text-xl font-mono font-black text-indigo-800 mt-0.5">{formatNumber(financeStats.netProfit)} ৳</span>
                  </div>
                </div>

                <div className="overflow-hidden border border-slate-100 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-150 text-[10px] text-gray-500 font-black uppercase">
                        <th className="p-3">তারিখ</th>
                        <th className="p-3">বিবরণ (Description)</th>
                        <th className="p-3">শ্রেণী</th>
                        <th className="p-3">খাত</th>
                        <th className="p-3">টাকার অংক (৳)</th>
                        <th className="p-3">অবস্থা</th>
                        {role === "admin" && <th className="p-3 text-right">অনুমোদন</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {transactions.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50/20">
                          <td className="p-3 font-mono text-gray-500">{t.date}</td>
                          <td className="p-3 text-gray-900 font-bold">{t.desc}</td>
                          <td className="p-3 text-gray-650">{t.category}</td>
                          <td className="p-3">
                            <span className="bg-slate-100 text-slate-700 rounded p-1 px-1.5 text-[10px]">{t.type}</span>
                          </td>
                          <td className={`p-3 font-mono font-black ${t.category === "Income" ? "text-emerald-600" : "text-rose-600"}`}>
                            {t.category === "Income" ? "+" : "-"}{formatNumber(t.amount)} ৳
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded border text-[9px] font-black ${
                              t.state === "Approved" ? "bg-emerald-50 text-emerald-700 border-emerald-250" : "bg-amber-50 text-amber-700 border-amber-250 animate-pulse"
                            }`}>
                              {t.state}
                            </span>
                          </td>
                          {role === "admin" && (
                            <td className="p-3 text-right">
                              {t.state === "Pending" ? (
                                <button
                                  onClick={() => handleApproveTx(t.id)}
                                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded p-1 px-2.5 cursor-pointer font-bold"
                                >
                                  Approve
                                </button>
                              ) : (
                                <span className="text-[10px] text-gray-400">অনুমোদিত</span>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 border shadow-xs">
                <h4 className="text-xs font-black text-gray-950 uppercase tracking-widest mb-4 flex items-center gap-1.5 border-b pb-2">
                  <Plus className="w-3.5 h-3.5 text-indigo-600" /> নতুন জেনারেল ট্রানজেকশন এন্ট্রি
                </h4>
                <form onSubmit={handleAddTx} className="space-y-4 text-xs font-semibold">
                  <div>
                    <label className="block text-slate-500 font-extrabold mb-1">লেনদেনের খরচ/আয়ের বিবরণ</label>
                    <input
                      required
                      type="text"
                      className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none"
                      placeholder="e.g. Electric Power Utility Bill June"
                      value={newTx.desc}
                      onChange={(e) => setNewTx({ ...newTx, desc: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 font-extrabold mb-1">পার্বত্য শ্রেণী</label>
                      <select
                        className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none bg-white font-bold"
                        value={newTx.category}
                        onChange={(e) => setNewTx({ ...newTx, category: e.target.value })}
                      >
                        <option value="Expense">Expense (ব্যয়)</option>
                        <option value="Income">Income (আয়)</option>
                        <option value="Asset">Asset (সম্পদ)</option>
                        <option value="Liability">Liability (দায়)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-500 font-extrabold mb-1">টাকার অংক (৳)</label>
                      <input
                        required
                        type="number"
                        className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none font-mono"
                        placeholder="15000"
                        value={newTx.amount || ""}
                        onChange={(e) => setNewTx({ ...newTx, amount: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-500 font-extrabold mb-1">অ্যাকাউন্টিং খাত (Sub-account Type)</label>
                    <input
                      type="text"
                      className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none"
                      placeholder="e.g. Utility, Sales, Asset purchase"
                      value={newTx.type}
                      onChange={(e) => setNewTx({ ...newTx, type: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-extrabold rounded-xl hover:bg-indigo-700 cursor-pointer">
                    লেনদেন দাখিল করুন
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==========================================
            SUITE 3: HUMAN RESOURCES MANAGEMENT (HRM)
            ========================================== */}
        {activeSuite === "hrm" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            key="hrm-panel"
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl p-6 border shadow-xs">
                <h3 className="text-sm font-black text-gray-950 uppercase tracking-widest mb-4">কর্মী নিয়োগ ট্র্যাকিং ও সিভি শর্টলিস্ট (Recruitment Pipeline)</h3>
                
                <div className="overflow-hidden border border-slate-100 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-150 text-[10px] text-gray-500 font-black uppercase">
                        <th className="p-3">প্রার্থীর নাম</th>
                        <th className="p-3">মোবাইল নম্বর</th>
                        <th className="p-3">পদের নাম (Role)</th>
                        <th className="p-3">তারিখ</th>
                        <th className="p-3">সিলেক্ট ধাপ / স্ট্যাটাস</th>
                        <th className="p-3 text-right">পরবর্তী অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {candidates.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50/20">
                          <td className="p-3 font-bold text-gray-900">{c.name}</td>
                          <td className="p-3 font-mono text-gray-500">{c.phone}</td>
                          <td className="p-3 text-slate-700">{c.position}</td>
                          <td className="p-3 font-mono text-gray-400">{c.date}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-md border text-[9px] font-black ${
                              c.stage.includes("Hired") ? "bg-emerald-50 text-emerald-700 border-emerald-250" :
                              c.stage.includes("Interview") ? "bg-indigo-50 text-indigo-700 border-indigo-255" :
                              "bg-slate-50 text-slate-700 border-slate-205"
                            }`}>
                              {c.stage}
                            </span>
                          </td>
                          <td className="p-3 text-right space-x-1">
                            <button
                              onClick={() => handleUpdateCandidateStage(c.id, "Interview Scheduled")}
                              className="text-[10px] border border-indigo-150 bg-indigo-50/50 hover:bg-indigo-100 rounded px-1.5 p-0.5 cursor-pointer text-indigo-700 font-bold"
                            >
                              Schedules
                            </button>
                            <button
                              onClick={() => handleUpdateCandidateStage(c.id, "Hired (Introductory)")}
                              className="text-[10px] border border-emerald-150 bg-emerald-50/50 hover:bg-emerald-100 rounded px-1.5 p-0.5 cursor-pointer text-emerald-750 font-bold"
                            >
                              Hire!
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 border shadow-xs">
                <h4 className="text-xs font-black text-gray-950 uppercase tracking-widest mb-4 flex items-center gap-1.5 border-b pb-2">
                  <Plus className="w-3.5 h-3.5 text-indigo-600" /> নতুন চাকরি আবেদন নিবন্ধক
                </h4>
                <form onSubmit={handleAddCandidate} className="space-y-4 text-xs font-semibold">
                  <div>
                    <label className="block text-slate-500 font-extrabold mb-1">আবেদনকারীর নাম</label>
                    <input
                      required
                      type="text"
                      className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none"
                      placeholder="e.g. Hasibul Hasan"
                      value={newCandidate.name}
                      onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-extrabold mb-1">মোবাইল ফোন নম্বর</label>
                    <input
                      required
                      type="text"
                      className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none font-mono"
                      placeholder="+88017XXXXXXXX"
                      value={newCandidate.phone}
                      onChange={(e) => setNewCandidate({ ...newCandidate, phone: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 font-extrabold mb-1">আবেদনকৃত পদ</label>
                      <select
                        className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none bg-white font-bold"
                        value={newCandidate.position}
                        onChange={(e) => setNewCandidate({ ...newCandidate, position: e.target.value })}
                      >
                        <option value="Delivery Officer">Delivery Officer</option>
                        <option value="Junior Accountant">Junior Accountant</option>
                        <option value="DSR Sales Representative">DSR Sales Rep</option>
                        <option value="Warehouse Supervisor">Stock Supervisor</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-500 font-extrabold mb-1">প্রাথমিক স্ট্যাটাস</label>
                      <select
                        className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none bg-white"
                        value={newCandidate.stage}
                        onChange={(e) => setNewCandidate({ ...newCandidate, stage: e.target.value })}
                      >
                        <option value="Under Review">Under Review</option>
                        <option value="Shortlisted">Shortlisted</option>
                        <option value="Interview Scheduled">Scheduled Interview</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-extrabold rounded-xl hover:bg-indigo-700 cursor-pointer">
                    রেজিস্ট্রেশন করুন
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==========================================
            SUITE 4: PROCUREMENT MANAGEMENT WORKSPACE
            ========================================== */}
        {activeSuite === "procurement" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            key="procurement-panel"
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl p-6 border shadow-xs">
                <h3 className="text-sm font-black text-gray-950 uppercase tracking-widest mb-4">ক্রয় চাহিদা ও বাজেট রিকুইজিশন (Material Procurement Requisitions)</h3>
                
                <div className="overflow-hidden border border-slate-100 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-150 text-[10px] text-gray-500 font-black uppercase">
                        <th className="p-3">তারিখ</th>
                        <th className="p-3">পণ্যের বিবরণ / সার্ভিস রিকুইজিশন</th>
                        <th className="p-3">পরিমাণ</th>
                        <th className="p-3">আনুমানিক বাজেট (৳)</th>
                        <th className="p-3">অনুমোদন স্ট্যাটাস</th>
                        <th className="p-3 text-right">পরবর্তী কার্যাবলী</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {requisitions.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50/20">
                          <td className="p-3 font-mono text-gray-500">{r.date}</td>
                          <td className="p-3 font-bold text-gray-900">{r.item}</td>
                          <td className="p-3 font-mono font-bold text-slate-600">{r.qty} টি</td>
                          <td className="p-3 font-mono font-black text-indigo-700">{formatNumber(r.estimate)} ৳</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-md border text-[9px] font-black ${
                              r.status === "Ordered" ? "bg-emerald-50 text-emerald-700 border-emerald-250 animate-pulse" :
                              r.status === "Approved" ? "bg-indigo-50 text-indigo-700 border-indigo-255" :
                              "bg-amber-50 text-amber-700 border-amber-205"
                            }`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="p-3 text-right space-x-1">
                            {r.status === "Submitted" && (
                              <button
                                onClick={() => handleApprovePR(r.id)}
                                className="text-[10px] bg-slate-900 text-white rounded px-2 py-1 cursor-pointer font-bold"
                              >
                                Approve PR
                              </button>
                            )}
                            {r.status === "Approved" && (
                              <button
                                onClick={() => handleOrderPR(r.id)}
                                className="text-[10px] bg-emerald-650 hover:bg-emerald-700 text-white rounded px-2 py-1 cursor-pointer font-bold"
                              >
                                Issue PO
                              </button>
                            )}
                            {r.status === "Ordered" && (
                              <span className="text-[9px] text-gray-400">অর্ডার প্রেরিত</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 border shadow-xs">
                <h4 className="text-xs font-black text-gray-950 uppercase tracking-widest mb-4 flex items-center gap-1.5 border-b pb-2">
                  <Plus className="w-3.5 h-3.5 text-indigo-600" /> নতুন অভ্যন্তরীণ রিকুইজিশন জমা দিন
                </h4>
                <form onSubmit={handleAddPR} className="space-y-4 text-xs font-semibold">
                  <div>
                    <label className="block text-slate-500 font-extrabold mb-1">পণ্য বা যন্ত্রপাতির বিবরণ</label>
                    <input
                      required
                      type="text"
                      className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none"
                      placeholder="e.g. Laser Multi-function Printer"
                      value={newPr.item}
                      onChange={(e) => setNewPr({ ...newPr, item: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 font-extrabold mb-1">প্রয়োজনীয় পরিমাণ</label>
                      <input
                        required
                        type="number"
                        className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none"
                        value={newPr.qty || ""}
                        min={1}
                        onChange={(e) => setNewPr({ ...newPr, qty: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-extrabold mb-1">প্রাক্কলিত মোট বাজেট (৳)</label>
                      <input
                        required
                        type="number"
                        className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none font-mono"
                        placeholder="22000"
                        value={newPr.estimate || ""}
                        onChange={(e) => setNewPr({ ...newPr, estimate: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-extrabold rounded-xl hover:bg-indigo-700 cursor-pointer">
                    রিকুইজিশন জমা দিন
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==========================================
            SUITE 5: SUPPLIER MANAGEMENT WORKSPACE
            ========================================== */}
        {activeSuite === "supplier" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            key="supplier-panel"
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl p-6 border shadow-xs">
                <h3 className="text-sm font-black text-gray-950 uppercase tracking-widest mb-4">সরবরাহকারী কর্মদক্ষতা ও বকেয়া (Supplier Performance Cards)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {supplierCards.map(s => (
                    <div 
                      key={s.id} 
                      onClick={() => setSelectedSupplierId(s.id)}
                      className={`p-5 rounded-3xl border cursor-pointer transition-all ${
                        selectedSupplierId === s.id ? "border-indigo-600 bg-indigo-50/20" : "border-slate-100 hover:border-slate-350"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-black block text-slate-900 truncate max-w-[150px]">{s.name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-black ${
                          s.score >= 90 ? "bg-emerald-50 text-emerald-700 border border-emerald-150" : "bg-amber-50 text-amber-700 border border-amber-150"
                        }`}>{s.reliability}</span>
                      </div>
                      <div className="space-y-1 font-semibold text-[10.5px] text-gray-500 pt-2 border-t">
                        <p>স্পিড রেট: <strong className="text-gray-850 font-mono font-black">{s.score}/100</strong></p>
                        <p>অগ্রিম সময়সীমা: <strong className="text-gray-850 font-black">{s.deliveryDays} দিন</strong></p>
                        <p className="text-rose-600">সবচেয়ে বকেয়া: <strong className="font-mono">{formatNumber(s.overdue)} ৳</strong></p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Scorecard Focus Details */}
                {selectedSupplierId && (
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                    {(() => {
                      const sup = supplierCards.find(s => s.id === selectedSupplierId);
                      if (!sup) return null;
                      return (
                        <div className="space-y-4">
                          <h4 className="font-black text-xs uppercase tracking-wider text-slate-500">কার্যকরী নিরীক্ষা স্কোরেকার্ড (Auditor Evaluation)</h4>
                          <h3 className="text-base font-black text-slate-900">{sup.name}</h3>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="bg-white p-3.5 rounded-xl border text-center">
                              <span className="text-[10px] text-slate-450 block font-extrabold uppercase">গুণগত মান</span>
                              <span className="text-base font-black font-mono text-emerald-600 mt-1">৯৬%</span>
                            </div>
                            <div className="bg-white p-3.5 rounded-xl border text-center">
                              <span className="text-[10px] text-slate-450 block font-extrabold uppercase">সময়ানুবর্তিতা</span>
                              <span className="text-base font-black font-mono text-indigo-600 mt-1">{sup.score}%</span>
                            </div>
                            <div className="bg-white p-3.5 rounded-xl border text-center">
                              <span className="text-[10px] text-slate-450 block font-extrabold uppercase">দামের সামঞ্জস্যতা</span>
                              <span className="text-base font-black font-mono text-gray-700 mt-1">৮৯%</span>
                            </div>
                          </div>
                          <p className="text-[10.5px] text-gray-500 font-bold leading-normal">
                            প্রোফাইল পর্যালোচনা অনুযায়ী, <strong className="text-slate-800">{sup.name}</strong> নিয়মিত সময় বজায় রাখতে সচেষ্ট। বিলম্বিত সরবরাহের গড় রেকর্ড গত ৩ মাসে নিম্নতম স্তরে আছে।
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 border shadow-xs">
                <h4 className="text-xs font-black text-gray-950 uppercase tracking-widest mb-4 flex items-center gap-1.5 border-b pb-2">
                  <Plus className="w-3.5 h-3.5 text-indigo-600" /> নতুন সাপ্লায়ার কার্ড রেজিস্ট্রেশন
                </h4>
                <form onSubmit={handleAddSupplierCard} className="space-y-4 text-xs font-semibold">
                  <div>
                    <label className="block text-slate-500 font-extrabold mb-1">সরবরাহকারী প্রতিষ্ঠানের নাম</label>
                    <input
                      required
                      type="text"
                      className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none font-bold"
                      placeholder="e.g. Bangladesh Motor Oils Corp"
                      value={newSupplierForm.name}
                      onChange={(e) => setNewSupplierForm({ ...newSupplierForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-extrabold mb-1">যোগাযোগ ব্যক্তি ও ডেসিনেশন</label>
                    <input
                      required
                      type="text"
                      className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none"
                      placeholder="e.g. Amit Kumar Chakrabortty"
                      value={newSupplierForm.contact}
                      onChange={(e) => setNewSupplierForm({ ...newSupplierForm, contact: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 font-extrabold mb-1">পারফরমেন্স স্কোর</label>
                      <input
                        required
                        type="number"
                        className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none"
                        placeholder="85"
                        min={1}
                        max={100}
                        value={newSupplierForm.score || ""}
                        onChange={(e) => setNewSupplierForm({ ...newSupplierForm, score: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-extrabold mb-1">গড় লিড সময় (দিন)</label>
                      <input
                        required
                        type="number"
                        className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none"
                        placeholder="5"
                        min={1}
                        value={newSupplierForm.deliveryDays || ""}
                        onChange={(e) => setNewSupplierForm({ ...newSupplierForm, deliveryDays: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-extrabold rounded-xl hover:bg-indigo-700 cursor-pointer">
                    সাপ্লায়ার কার্ড যোগ করুন
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==========================================
            SUITE 6: PRODUCT LIFECYCLE MANAGEMENT (PLM)
            ========================================== */}
        {activeSuite === "plm" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            key="plm-panel"
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl p-6 border shadow-xs">
                <h3 className="text-sm font-black text-gray-950 uppercase tracking-widest mb-4">পণ্য জীবদ্দশা ও আরএন্ডডি সেগমেন্ট (R&D Launch Schedules & PLM Phase)</h3>
                
                <div className="overflow-hidden border border-slate-100 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-150 text-[10px] text-gray-500 font-black uppercase">
                        <th className="p-3">পণ্যের নাম (PLM Inventory)</th>
                        <th className="p-3">কোড</th>
                        <th className="p-3">লাইফসাইকেল ধাপ (Stage)</th>
                        <th className="p-3">ঝুঁকি মূল্যায়ন সূচক</th>
                        <th className="p-3">গ্রাহক সন্তুষ্টি রেটিং</th>
                        <th className="p-3 text-right">স্টেজ মডিফিকেশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {plmProducts.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/20">
                          <td className="p-3 font-bold text-gray-900">{p.name}</td>
                          <td className="p-3 font-mono text-indigo-700">{p.code}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-md border text-[9px] font-black ${
                              p.stage.includes("Production") ? "bg-emerald-50 text-emerald-700 border-emerald-250" :
                              p.stage.includes("Piloting") ? "bg-indigo-50 text-indigo-700 border-indigo-255" :
                              p.stage.includes("Decline") ? "bg-rose-50 text-rose-700 border-rose-250 animate-pulse" :
                              "bg-slate-50 text-slate-700 border-slate-205"
                            }`}>
                              {p.stage}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`text-[10px] font-bold ${
                              p.riskIndex === "High Risk" ? "text-rose-600" : p.riskIndex === "Moderate Risk" ? "text-amber-600" : "text-emerald-600"
                            }`}>{p.riskIndex}</span>
                          </td>
                          <td className="p-3 font-mono font-black text-amber-500">★ {p.customerRating > 0 ? p.customerRating : "N/A"}</td>
                          <td className="p-3 text-right">
                            <select
                              className="text-[10.5px] border rounded bg-white font-bold p-1"
                              value={p.stage}
                              onChange={(e) => handleUpdatePLMStage(p.id, e.target.value)}
                            >
                              <option value="R&D Simulation">R&D</option>
                              <option value="Piloting & Trial">Trial</option>
                              <option value="Production">Active Sell</option>
                              <option value="Decline (Phase-Out)">Phase Out</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 border shadow-xs">
                <h4 className="text-xs font-black text-gray-950 uppercase tracking-widest mb-4 flex items-center gap-1.5 border-b pb-2">
                  <Plus className="w-3.5 h-3.5 text-indigo-600" /> নতুন পণ্য আরএন্ডডি ল্যাবে নথিভুক্ত করুন
                </h4>
                <form onSubmit={handleAddPLMItem} className="space-y-4 text-xs font-semibold">
                  <div>
                    <label className="block text-slate-500 font-extrabold mb-1">পণ্যের বিস্তারিত বিবরণ / মেটেরিয়াল কোড</label>
                    <input
                      required
                      type="text"
                      className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none"
                      placeholder="e.g. S-2 Engine Spark Spark Plugs Pro"
                      value={newPlmProduct.name}
                      onChange={(e) => setNewPlmProduct({ ...newPlmProduct, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 font-extrabold mb-1">পণ্য আইডেন্টিফিকেশন কোড</label>
                      <input
                        required
                        type="text"
                        className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none"
                        placeholder="e.g. LUB-P9V"
                        value={newPlmProduct.code}
                        onChange={(e) => setNewPlmProduct({ ...newPlmProduct, code: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-extrabold mb-1">প্রাথমিক লাইফসাইকেল স্টেজ</label>
                      <select
                        className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none bg-white font-bold"
                        value={newPlmProduct.stage}
                        onChange={(e) => setNewPlmProduct({ ...newPlmProduct, stage: e.target.value })}
                      >
                        <option value="R&D Simulation">R&D Simulation</option>
                        <option value="Piloting & Trial">Piloting & Trial</option>
                        <option value="Production">Active Production</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-extrabold rounded-xl hover:bg-indigo-700 cursor-pointer">
                    আরএন্ডডি ডকে যোগ করুন
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==========================================
            SUITE 7: MAINTENANCE MANAGEMENT WORKSPACE
            ========================================== */}
        {activeSuite === "maintenance" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            key="maintenance-panel"
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl p-6 border shadow-xs">
                <h3 className="text-sm font-black text-gray-950 uppercase tracking-widest mb-4">যানবাহন, গোডাউন ও হার্ডওয়্যার রক্ষণাবেক্ষণ সময়সূচী (Preventive Maintenance Hub)</h3>
                
                <div className="overflow-hidden border border-slate-100 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-150 text-[10px] text-gray-500 font-black uppercase">
                        <th className="p-3">রক্ষণাবেক্ষণীয় বিষয় / সম্পদ (Asset)</th>
                        <th className="p-3">সেবার ধরণ (Type)</th>
                        <th className="p-3">নির্ধারিত দিন</th>
                        <th className="p-3">সার্ভিস বাজেট (৳)</th>
                        <th className="p-3">অগ্রগতি / অবস্থা</th>
                        <th className="p-3 text-right">সার্ভিস সমাপ্তি</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {maintenanceSchedule.map(m => (
                        <tr key={m.id} className="hover:bg-slate-50/20">
                          <td className="p-3 font-bold text-gray-900">{m.asset}</td>
                          <td className="p-3 font-semibold text-indigo-700">{m.type}</td>
                          <td className="p-3 font-mono text-gray-500">{m.scheduledDate}</td>
                          <td className="p-3 font-mono font-black text-rose-600">{formatNumber(m.cost)} ৳</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-md border text-[9px] font-black ${
                              m.state === "Completed" ? "bg-emerald-50 text-emerald-700 border-emerald-250" :
                              m.state === "In Progress" ? "bg-rose-50 text-rose-700 border-rose-250 animate-pulse" :
                              "bg-indigo-50 text-indigo-700 border-indigo-255"
                            }`}>
                              {m.state}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            {m.state !== "Completed" ? (
                              <button
                                onClick={() => handleCompleteMaint(m.id)}
                                className="text-[10px] bg-slate-900 text-white rounded px-2.5 py-1.5 cursor-pointer font-extrabold"
                              >
                                Mark Complete
                              </button>
                            ) : (
                              <span className="text-[10px] text-emerald-600 font-black">সমাপ্ত</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 border shadow-xs">
                <h4 className="text-xs font-black text-gray-950 uppercase tracking-widest mb-4 flex items-center gap-1.5 border-b pb-2">
                  <Plus className="w-3.5 h-3.5 text-indigo-600" /> নতুন সাধারণ রক্ষণাবেক্ষণ সিডিউল
                </h4>
                <form onSubmit={handleAddMaint} className="space-y-4 text-xs font-semibold">
                  <div>
                    <label className="block text-slate-500 font-extrabold mb-1">রক্ষণাবেক্ষণযোগ্য সম্পদ / যন্ত্রপাতির নাম</label>
                    <input
                      required
                      type="text"
                      className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none"
                      placeholder="e.g. Delivery Pickup Dhaka-Metro-12"
                      value={newMaint.asset}
                      onChange={(e) => setNewMaint({ ...newMaint, asset: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-550 font-extrabold mb-1">সার্ভিস ক্যাটাগরি / ত্রুটি</label>
                    <input
                      type="text"
                      className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none"
                      placeholder="e.g. Regular Brake Grease, AC Servicing"
                      value={newMaint.type}
                      onChange={(e) => setNewMaint({ ...newMaint, type: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 font-extrabold mb-1">নির্ধারিত দিনক্ষণ</label>
                      <input
                        required
                        type="date"
                        className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none"
                        value={newMaint.date}
                        onChange={(e) => setNewMaint({ ...newMaint, date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-extrabold mb-1">প্রাক্কলিত রিয়ার খরচ (৳)</label>
                      <input
                        required
                        type="number"
                        className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none"
                        placeholder="4500"
                        value={newMaint.cost || ""}
                        onChange={(e) => setNewMaint({ ...newMaint, cost: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-extrabold rounded-xl hover:bg-indigo-700 cursor-pointer">
                    সিডিউল সংরক্ষণ করুন
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==========================================
            SUITE 8: ACCOUNTING MANAGEMENT WORKSPACE
            ========================================== */}
        {activeSuite === "accounting" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            key="accounting-panel"
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl p-6 border shadow-xs">
                <h3 className="text-sm font-black text-gray-950 uppercase tracking-widest mb-4">পুনরাবৃত্তিমূলক চালান তফসীল (Recurring Invoices & Depreciation schedules)</h3>
                
                <div className="overflow-hidden border border-slate-100 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-150 text-[10px] text-gray-500 font-black uppercase">
                        <th className="p-3">চালানের বিবরণ (Fixed Incomes/Expenses)</th>
                        <th className="p-3">সময়সীমা চক্র</th>
                        <th className="p-3">মোট বাজেট পরিমাণ (৳)</th>
                        <th className="p-3">পরবর্তী দেওয়াল তারিখ (Due Date)</th>
                        <th className="p-3">স্বয়ংক্রিয় তহবিল খাতা ডেবিট</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {recurringInvoices.map(i => (
                        <tr key={i.id} className="hover:bg-slate-50/20">
                          <td className="p-3 font-bold text-gray-900">{i.desc}</td>
                          <td className="p-3">
                            <span className="bg-indigo-50 text-indigo-700 rounded p-1 px-2 text-[10px] font-black">{i.periodicity}</span>
                          </td>
                          <td className="p-3 font-mono font-black text-rose-600">{formatNumber(i.amount)} ৳</td>
                          <td className="p-3 font-mono text-gray-500">{i.nextDueDate}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded border text-[9px] font-black ${
                              i.autoCharge ? "bg-emerald-50 text-emerald-700 border-emerald-250 animate-pulse" : "bg-slate-50 text-slate-700 border-slate-205"
                            }`}>
                              {i.autoCharge ? "Auto-Deducted" : "Manual Pay Check"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 border shadow-xs">
                <h4 className="text-xs font-black text-gray-950 uppercase tracking-widest mb-4 flex items-center gap-1.5 border-b pb-2">
                  <Plus className="w-3.5 h-3.5 text-indigo-600" /> নতুন পুনরাবৃত্তিমূলক বিল নিবন্ধন
                </h4>
                <form onSubmit={handleAddRecurring} className="space-y-4 text-xs font-semibold">
                  <div>
                    <label className="block text-slate-500 font-extrabold mb-1">বিল/চালান বিবরণ</label>
                    <input
                      required
                      type="text"
                      className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none"
                      placeholder="e.g. Warehouse Rent Subscription"
                      value={newInvoice.desc}
                      onChange={(e) => setNewInvoice({ ...newInvoice, desc: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 font-extrabold mb-1">সময়সীমা চক্র</label>
                      <select
                        className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none bg-white font-bold"
                        value={newInvoice.periodicity}
                        onChange={(e) => setNewInvoice({ ...newInvoice, periodicity: e.target.value })}
                      >
                        <option value="Monthly">Monthly (মাসিক)</option>
                        <option value="Quarterly">Quarterly (ত্রৈমাসিক)</option>
                        <option value="Annually">Annually (বার্ষিক)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-500 font-extrabold mb-1">টাকার পরিমাণ (৳)</label>
                      <input
                        required
                        type="number"
                        className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none font-mono"
                        placeholder="75000"
                        value={newInvoice.amount || ""}
                        onChange={(e) => setNewInvoice({ ...newInvoice, amount: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-500 font-extrabold mb-1">পরবর্তী পরি পরিশোধের তারিখ (DueDate)</label>
                    <input
                      required
                      type="date"
                      className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none"
                      value={newInvoice.nextDueDate}
                      onChange={(e) => setNewInvoice({ ...newInvoice, nextDueDate: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-extrabold rounded-xl hover:bg-indigo-700 cursor-pointer">
                    বিল সিডিউলভুক্ত করুন
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==========================================
            SUITE 9: DISTRIBUTION MANAGEMENT WORKSPACE
            ========================================== */}
        {activeSuite === "distribution" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            key="distribution-panel"
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl p-6 border shadow-xs">
                <h3 className="text-sm font-black text-gray-950 uppercase tracking-widest mb-4">ডিস্ট্রিবিউশন রুট ট্র্যাকিং ও দ্রুত ডেলিভারি কার্যাবলী (Fleet & Route Load sheet Dispatch)</h3>
                
                <div className="overflow-hidden border border-slate-100 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-150 text-[10px] text-gray-500 font-black uppercase">
                        <th className="p-3">যানবাহনের ধরণ (Fleet Type)</th>
                        <th className="p-3">চালক (Driver)</th>
                        <th className="p-3">নির্ধারিত ডিস্ট্রিবিউশন রুট (Route)</th>
                        <th className="p-3">জ্বালানি স্তরের পরিমাপ</th>
                        <th className="p-3">চলতি ট্রিপ অবস্থা (Status)</th>
                        <th className="p-3 text-right">স্ট্যাটাস পরিবর্তন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {distributionVehicles.map(v => (
                        <tr key={v.id} className="hover:bg-slate-50/20">
                          <td className="p-3 font-bold text-gray-900">{v.vehicleType}</td>
                          <td className="p-3 font-semibold text-slate-800">{v.driver}</td>
                          <td className="p-3 text-slate-600">{v.currentRoute}</td>
                          <td className="p-3 font-mono text-slate-500">{v.fuelCapacity}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-md border text-[9px] font-black ${
                              v.status === "Completed" ? "bg-emerald-50 text-emerald-700 border-emerald-250" :
                              v.status === "On-Route" ? "bg-rose-50 text-rose-700 border-rose-250 animate-pulse" :
                              "bg-indigo-50 text-indigo-700 border-indigo-255"
                            }`}>
                              {v.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <select
                              className="text-[10.5px] border rounded bg-white font-bold p-1"
                              value={v.status}
                              onChange={(e) => handleUpdateVehicleStatus(v.id, e.target.value)}
                            >
                              <option value="Dispatched">Dispatched</option>
                              <option value="On-Route">On Route</option>
                              <option value="Completed">Completed</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 border shadow-xs">
                <h4 className="text-xs font-black text-gray-950 uppercase tracking-widest mb-4 flex items-center gap-1.5 border-b pb-2">
                  <Plus className="w-3.5 h-3.5 text-indigo-600" /> নতুন ডিস্ট্রিবিউশন ট্রিপ ডিসপ্যাচ
                </h4>
                <form onSubmit={handleAddVehicle} className="space-y-4 text-xs font-semibold">
                  <div>
                    <label className="block text-slate-500 font-extrabold mb-1">ডিস্ট্রিবিউশন গাড়ির ধরণ</label>
                    <select
                      className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none bg-white font-bold"
                      value={newVehicle.vehicleType}
                      onChange={(e) => setNewVehicle({ ...newVehicle, vehicleType: e.target.value })}
                    >
                      <option value="Tata Pickup 1.5-Ton">Tata Pickup 1.5-Ton</option>
                      <option value="Three-Wheeler Hydraulic Van">Three-Wheeler hydraulic Van</option>
                      <option value="Cargo Truck Large Capacity">Cargo Truck Large Capacity</option>
                      <option value="Express Delivery Rickshaw Auto">Express Rickshaw Auto</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 font-extrabold mb-1">ডিস্ট্রিবিউশন চালক / ডিএসআর অপারেটর</label>
                    <input
                      required
                      type="text"
                      className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none"
                      placeholder="e.g. Karim Uddin"
                      value={newVehicle.driver}
                      onChange={(e) => setNewVehicle({ ...newVehicle, driver: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 font-extrabold mb-1">নির্ধারিত রোড (Route)</label>
                      <input
                        required
                        type="text"
                        className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none"
                        placeholder="e.g. Mirpur Retail Area"
                        value={newVehicle.currentRoute}
                        onChange={(e) => setNewVehicle({ ...newVehicle, currentRoute: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-extrabold mb-1">জ্বালানি স্তর প্রাক্কলন</label>
                      <input
                        required
                        type="text"
                        className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none"
                        placeholder="85% or N/A"
                        value={newVehicle.fuelCapacity}
                        onChange={(e) => setNewVehicle({ ...newVehicle, fuelCapacity: e.target.value })}
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-extrabold rounded-xl hover:bg-indigo-700 cursor-pointer">
                    শিপমেন্ট ডিসপ্যাচ করুন
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==========================================
            SUITE 10: COST MANAGEMENT WORKSPACE
            ========================================== */}
        {activeSuite === "cost-mgmt" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            key="cost-panel"
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl p-6 border shadow-xs">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-black text-gray-950 uppercase tracking-widest flex items-center gap-2">
                    <Coins className="w-5 h-5 text-indigo-600 animate-pulse" />
                    উৎপাদন ও পরিচালনা খরচ কেন্দ্র (Overhead Cost Centers)
                  </h3>
                  <span className="text-[10px] bg-slate-50 border border-slate-150 p-2.5 py-1 text-slate-500 font-extrabold rounded-lg">
                    রিয়েলটাইম ম্যানুফ্যাকচারিং কস্টিং
                  </span>
                </div>

                <div className="overflow-hidden border border-slate-100 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-150 text-[10px] text-gray-500 font-black uppercase">
                        <th className="p-3">তারিখ</th>
                        <th className="p-3">খরচের নাম / বিবরণ</th>
                        <th className="p-3">শ্রেণী বিভাগ</th>
                        <th className="p-3">কস্ট সেন্টার (Center)</th>
                        <th className="p-3">মূল্য (৳)</th>
                        <th className="p-3 text-right">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {costs.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50/20">
                          <td className="p-3 font-mono text-gray-500">{c.date}</td>
                          <td className="p-3 font-bold text-gray-900">{c.name}</td>
                          <td className="p-3">
                            <span className="bg-slate-100 text-slate-800 rounded p-1 px-2 text-[10px] font-bold">
                              {c.category}
                            </span>
                          </td>
                          <td className="p-3 text-indigo-650 font-semibold">{c.center}</td>
                          <td className="p-3 font-mono font-black text-rose-600">
                            {formatNumber(c.amount)} ৳
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleDeleteCost(c.id)}
                              className="text-rose-600 hover:text-white p-1.5 bg-rose-50 hover:bg-rose-600 hover:border-rose-600 border border-rose-200 rounded-lg cursor-pointer transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {costs.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-gray-400 font-bold">
                            কোন খরচ কেন্দ্র রেকর্ড পাওয়া যায়নি।
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Add Cost Form */}
              <div className="bg-white rounded-3xl p-6 border shadow-xs">
                <h4 className="text-xs font-black text-gray-950 uppercase tracking-widest mb-4 flex items-center gap-1.5 border-b pb-2">
                  <Plus className="w-3.5 h-3.5 text-indigo-600" /> নতুন খরচ রেকর্ড এন্ট্রি
                </h4>
                <form onSubmit={handleAddCost} className="space-y-4 text-xs font-semibold">
                  <div>
                    <label className="block text-slate-500 font-extrabold mb-1">খরচের সুনির্দিষ্ট নাম</label>
                    <input
                      required
                      type="text"
                      className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none"
                      placeholder="e.g. Engine Oil Import Custom Duty"
                      value={newCost.name}
                      onChange={(e) => setNewCost({ ...newCost, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 font-extrabold mb-1">মোট খরচ (৳)</label>
                      <input
                        required
                        type="number"
                        className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none font-mono"
                        placeholder="50000"
                        value={newCost.amount || ""}
                        onChange={(e) => setNewCost({ ...newCost, amount: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-extrabold mb-1">কস্ট সেন্টার (Center)</label>
                      <input
                        required
                        type="text"
                        className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none"
                        placeholder="e.g. Plant B / Fleet"
                        value={newCost.center}
                        onChange={(e) => setNewCost({ ...newCost, center: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-500 font-extrabold mb-1">ব্যয় বিভাগ (Overhead Category)</label>
                    <select
                      className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none bg-white font-bold"
                      value={newCost.category}
                      onChange={(e) => setNewCost({ ...newCost, category: e.target.value })}
                    >
                      <option value="Raw Materials">Raw Materials (কাঁচামাল আমদানি)</option>
                      <option value="Direct Labor">Direct Labor (অপারেটর মজুরি)</option>
                      <option value="Factory Overhead">Factory Overhead (কারখানা রক্ষণাবেক্ষণ)</option>
                      <option value="Administrative Support">Administrative Support (প্রশাসনিক সহায়তা)</option>
                      <option value="Sales & Logistics">Sales & Logistics (বণ্টন ও পরিবহন)</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full py-3 bg-rose-600 text-white font-extrabold rounded-xl hover:bg-rose-700 cursor-pointer transition-all">
                    খরচ রেকর্ড করুন
                  </button>
                </form>
              </div>

              {/* Cost Center Breakdown */}
              <div className="bg-slate-900 text-white p-5 rounded-3xl space-y-4">
                <span className="text-[10px] font-black text-rose-400 block uppercase tracking-widest flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-rose-400" />
                  COST OVERHEAD KPI METRICS
                </span>
                <div className="space-y-3 font-bold text-xs text-slate-350">
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span>সর্বমোট খরচ লাইনে:</span>
                    <span className="font-mono text-white text-sm font-extrabold">{formatNumber(costStats.totalCost)} ৳</span>
                  </div>
                  
                  {/* Render Breakdown Bars */}
                  <div className="space-y-2 pt-1 text-[10px]">
                    {Object.entries(costStats.byCategory).map(([cat, val]) => {
                      const pct = costStats.totalCost > 0 ? (Number(val) / costStats.totalCost) * 100 : 0;
                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex justify-between font-medium text-slate-400">
                            <span>{cat}</span>
                            <span className="font-mono text-slate-200">{pct.toFixed(0)}% ({formatNumber(val)} ৳)</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-rose-500 h-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==========================================
            SUITE 11: E-WAY BILL GENERATION WORKSPACE
            ========================================== */}
        {activeSuite === "eway-bill" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            key="eway-bill-panel"
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl p-6 border shadow-xs">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-black text-gray-950 uppercase tracking-widest flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5 text-indigo-600 animate-bounce" />
                    ই-ওয়ে বিল জেনারেশন ও পরিবহন চালান (Logistics E-Way Bills)
                  </h3>
                  <span className="text-[10px] bg-slate-50 border border-slate-150 p-2.5 py-1 text-slate-500 font-extrabold rounded-lg">
                    ডিজিটাল ডিক্লারেশন রুট ট্রাইং
                  </span>
                </div>

                <div className="overflow-hidden border border-slate-100 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-150 text-[10px] text-gray-500 font-black uppercase">
                        <th className="p-3">বিল নম্বর</th>
                        <th className="p-3">চালান নং / উৎস</th>
                        <th className="p-3">গাড়ি নং / ট্রান্সপোর্ট</th>
                        <th className="p-3">গন্তব্য (Destination)</th>
                        <th className="p-3">মোট পণ্যমূল্য</th>
                        <th className="p-3">অবস্থা (Status)</th>
                        <th className="p-3 text-right">পরিবর্তন / অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {ewayBills.map(b => (
                        <tr key={b.id} className="hover:bg-slate-50/20">
                          <td className="p-3 font-mono font-bold text-gray-900 text-[11px]">{b.ewayBillNo}</td>
                          <td className="p-3">
                            <div className="font-bold">{b.invoiceNo}</div>
                            <div className="text-[9px] text-slate-400">উৎস: {b.origin}</div>
                          </td>
                          <td className="p-3">
                            <span className="bg-slate-100 text-slate-700 p-1 px-1.5 rounded text-[10px] font-mono font-bold block w-max">
                              {b.vehicleNo}
                            </span>
                            <span className="text-[9px] text-gray-500">{b.transporter}</span>
                          </td>
                          <td className="p-3 font-semibold text-gray-800">{b.destination}</td>
                          <td className="p-3 font-mono font-black text-indigo-600">
                            {formatNumber(b.totalValue)} ৳
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-md border text-[9px] font-black ${
                              b.status === "Delivered" ? "bg-emerald-50 text-emerald-700 border-emerald-250" :
                              b.status === "In-Transit" ? "bg-rose-50 text-rose-700 border-rose-250 animate-pulse" :
                              "bg-indigo-50 text-indigo-700 border-indigo-205"
                            }`}>
                              {b.status}
                            </span>
                          </td>
                          <td className="p-3 text-right flex items-center justify-end gap-1.5 mt-1.5">
                            <select
                              className="text-[9.5px] border border-slate-200 rounded p-1 font-bold bg-white"
                              value={b.status}
                              onChange={(e) => handleUpdateEwayStatus(b.id, e.target.value)}
                            >
                              <option value="Generated">Generated</option>
                              <option value="In-Transit">In Transit</option>
                              <option value="Delivered">Delivered</option>
                            </select>
                            <button
                              onClick={() => handleDeleteEwayBill(b.id)}
                              className="text-rose-600 hover:text-white p-1 hover:bg-rose-600 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {ewayBills.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-gray-400 font-bold">
                            কোন ই-ওয়ে বিল চালান জেনারেট করা হয়নি।
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Add E-way bill Form */}
              <div className="bg-white rounded-3xl p-6 border shadow-xs">
                <h4 className="text-xs font-black text-gray-950 uppercase tracking-widest mb-4 flex items-center gap-1.5 border-b pb-2">
                  <Plus className="w-3.5 h-3.5 text-indigo-600" /> নতুন ই-ওয়ে বিল জেনারেশন ফরম
                </h4>
                <form onSubmit={handleAddEwayBill} className="space-y-4 text-xs font-semibold">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 font-extrabold mb-1">চালান নম্বর (Invoice No)</label>
                      <input
                        required
                        type="text"
                        className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none"
                        placeholder="e.g. INV-99081"
                        value={newEway.invoiceNo}
                        onChange={(e) => setNewEway({ ...newEway, invoiceNo: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-extrabold mb-1">মোট পণ্যমূল্য ডিক্লেয়ারেশন (৳)</label>
                      <input
                        required
                        type="number"
                        className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none font-mono"
                        placeholder="125000"
                        value={newEway.totalValue || ""}
                        onChange={(e) => setNewEway({ ...newEway, totalValue: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 font-extrabold mb-1">গাড়ির নম্বর (Plate No)</label>
                      <input
                        required
                        type="text"
                        className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none"
                        placeholder="ঢাকা মেট্রো-ঠ-৭১০২"
                        value={newEway.vehicleNo}
                        onChange={(e) => setNewEway({ ...newEway, vehicleNo: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-extrabold mb-1">পরিবহন সরবরাহকারী (Carrier)</label>
                      <input
                        required
                        type="text"
                        className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none"
                        value={newEway.transporter}
                        onChange={(e) => setNewEway({ ...newEway, transporter: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 font-extrabold mb-1">উৎসের ঠিকানা</label>
                      <input
                        required
                        type="text"
                        className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none"
                        value={newEway.origin}
                        onChange={(e) => setNewEway({ ...newEway, origin: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-extrabold mb-1">ডেলিভারি গন্তব্য (Destination)</label>
                      <input
                        required
                        type="text"
                        className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none"
                        placeholder="e.g. Sylhet Warehouse"
                        value={newEway.destination}
                        onChange={(e) => setNewEway({ ...newEway, destination: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-500 font-extrabold mb-1">যানবাহন টাইপ (Vehicle Fleet)</label>
                    <select
                      className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none bg-white font-bold"
                      value={newEway.vehicleType}
                      onChange={(e) => setNewEway({ ...newEway, vehicleType: e.target.value })}
                    >
                      <option value="Tata Pickup 1.5-Ton">Tata Pickup 1.5-Ton</option>
                      <option value="Three-Wheeler Hydraulic Van">Three-Wheeler Hydraulic Van</option>
                      <option value="Cargo Truck Large Capacity">Cargo Truck Large Capacity</option>
                      <option value="Express Delivery Rickshaw Auto">Express Delivery Rickshaw Auto</option>
                    </select>
                  </div>

                  <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-extrabold rounded-xl hover:bg-indigo-700 cursor-pointer">
                    ডিজিটাল ই-ওয়ে বিল রুট ও কিউআর জেনারেট
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==========================================
            SUITE 12: ACCOUNTS PAYABLE WORKSPACE
            ========================================== */}
        {activeSuite === "accounts-payable" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            key="payable-panel"
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl p-6 border shadow-xs">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-black text-gray-950 uppercase tracking-widest flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-indigo-600" />
                    প্রদেয় হিসাব ট্র্যাকিং ও সাপ্লায়ার আউটস্ট্যান্ডিং (Accounts Payable Ledger)
                  </h3>
                  <span className="text-[10px] bg-slate-50 border border-slate-150 p-2.5 py-1 text-slate-500 font-extrabold rounded-lg">
                    সাপ্লায়ার দেনা নিয়ন্ত্রণ
                  </span>
                </div>

                {/* KPI Section */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-rose-50/50 p-4 border border-rose-100 rounded-2xl">
                    <span className="text-[9px] text-rose-700 font-extrabold uppercase">মোট সাপ্লায়ার বিল দেনা</span>
                    <span className="block text-lg font-mono font-black text-rose-800 mt-0.5">
                      {formatNumber(apStats.totalAp)} ৳
                    </span>
                  </div>
                  <div className="bg-emerald-50/50 p-4 border border-emerald-100 rounded-2xl">
                    <span className="text-[9px] text-emerald-700 font-extrabold uppercase">পরিশোধিত ডেবিয়েল</span>
                    <span className="block text-lg font-mono font-black text-emerald-800 mt-0.5">
                      {formatNumber(apStats.paidAp)} ৳
                    </span>
                  </div>
                  <div className="bg-indigo-50/50 p-4 border border-indigo-100 rounded-2xl">
                    <span className="text-[9px] text-indigo-700 font-extrabold uppercase">বাকি দেনা (Outstanding AP)</span>
                    <span className="block text-lg font-mono font-black text-indigo-800 mt-0.5">
                      {formatNumber(apStats.outstandingAp)} ৳
                    </span>
                  </div>
                </div>

                <div className="overflow-hidden border border-slate-100 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-150 text-[10px] text-gray-500 font-black uppercase">
                        <th className="p-3">সাপ্লায়ারের নাম</th>
                        <th className="p-3">ইনভয়েস নম্বর</th>
                        <th className="p-3">মোট বিল (৳)</th>
                        <th className="p-3">পরিশোধিত মূল (৳)</th>
                        <th className="p-3">পরিশোধের শেষ দিন</th>
                        <th className="p-3">অবস্থা</th>
                        <th className="p-3 text-right">আংশিক পেমেন্ট</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {payables.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/20">
                          <td className="p-3 font-bold text-gray-900">{p.supplierName}</td>
                          <td className="p-3 font-mono text-gray-500 text-[10.5px]">{p.invoiceNo}</td>
                          <td className="p-3 font-mono font-bold text-gray-800">{formatNumber(p.amount)} ৳</td>
                          <td className="p-3 font-mono text-emerald-600 font-bold">{formatNumber(p.amountPaid)} ৳</td>
                          <td className="p-3 font-mono text-gray-400">{p.dueDate}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded border text-[9px] font-black ${
                              p.status === "Paid" ? "bg-emerald-50 text-emerald-700 border-emerald-250" :
                              p.status === "Partially Paid" ? "bg-amber-50 text-amber-700 border-amber-250 animate-pulse" :
                              "bg-rose-50 text-rose-700 border-rose-250"
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="p-3 text-right flex items-center justify-end gap-1">
                            {p.status !== "Paid" ? (
                              <button
                                onClick={() => {
                                  const raw = prompt("পেমেন্ট প্রদানের পরিমাণ লিখুন (Enter Payment Amount):", String(p.amount - p.amountPaid));
                                  if (raw && !isNaN(Number(raw))) {
                                    handleRecordApPayment(p.id, Number(raw));
                                  }
                                }}
                                className="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white rounded p-1.5 px-3 font-black cursor-pointer"
                              >
                                Pay Out
                              </button>
                            ) : (
                              <span className="text-[10px] text-gray-400">Paid Clear</span>
                            )}
                            <button
                              onClick={() => handleDeletePayable(p.id)}
                              className="text-rose-600 hover:text-white p-1 hover:bg-rose-650 rounded border border-transparent hover:border-gray-200"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Add Payable / Supplier Bill Form */}
              <div className="bg-white rounded-3xl p-6 border shadow-xs">
                <h4 className="text-xs font-black text-gray-950 uppercase tracking-widest mb-4 flex items-center gap-1.5 border-b pb-2">
                  <Plus className="w-3.5 h-3.5 text-indigo-600" /> নতুন সাপ্লায়ার বিল দাখিল (Accounts Payable)
                </h4>
                <form onSubmit={handleAddPayable} className="space-y-4 text-xs font-semibold">
                  <div>
                    <label className="block text-slate-500 font-extrabold mb-1">সাপ্লায়ার প্রতিনিধি চয়ন</label>
                    <select
                      className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none bg-white font-bold"
                      value={newPayable.supplierName}
                      onChange={(e) => setNewPayable({ ...newPayable, supplierName: e.target.value })}
                    >
                      <option value="United Distribution Ltd">United Distribution Ltd</option>
                      <option value="Bengal Lubricants and Oils">Bengal Lubricants and Oils</option>
                      <option value="Padma Printing & Bags Group">Padma Printing & Bags Group</option>
                      <option value="Apex Engine Spares PLC">Apex Engine Spares PLC</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 font-extrabold mb-1">বিল রেফারেন্স / ইনভয়েস নম্বর</label>
                    <input
                      required
                      type="text"
                      className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none"
                      placeholder="e.g. INSUP-8812"
                      value={newPayable.invoiceNo}
                      onChange={(e) => setNewPayable({ ...newPayable, invoiceNo: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 font-extrabold mb-1">বিল পরিমাণ (৳)</label>
                      <input
                        required
                        type="number"
                        className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none font-mono"
                        placeholder="75000"
                        value={newPayable.amount || ""}
                        onChange={(e) => setNewPayable({ ...newPayable, amount: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-extrabold mb-1">পরিশোধের শেষ তারিখ (Due Date)</label>
                      <input
                        required
                        type="date"
                        className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none"
                        value={newPayable.dueDate}
                        onChange={(e) => setNewPayable({ ...newPayable, dueDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-extrabold rounded-xl hover:bg-indigo-700 cursor-pointer">
                    সাপ্লায়ার দেনা বিল যুক্ত করুন
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==========================================
            SUITE 13: ACCOUNTS RECEIVABLE WORKSPACE
            ========================================== */}
        {activeSuite === "accounts-receivable" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            key="receivable-panel"
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl p-6 border shadow-xs">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-black text-gray-950 uppercase tracking-widest flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-indigo-600 animate-pulse" />
                    প্রাপ্য হিসাব ট্র্যাকিং ও কাস্টমার দেনা উসুল (Accounts Receivable Ledger)
                  </h3>
                  <span className="text-[10px] bg-slate-50 border border-slate-150 p-2.5 py-1 text-slate-500 font-extrabold rounded-lg">
                    কাস্টমার দেনা উসুল নিয়ন্ত্রণ
                  </span>
                </div>

                {/* KPI Section */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-indigo-50/50 p-4 border border-indigo-100 rounded-2xl">
                    <span className="text-[9px] text-indigo-700 font-extrabold uppercase">সর্বমোট কাস্টমার প্রাপ্য বিল</span>
                    <span className="block text-lg font-mono font-black text-indigo-800 mt-0.5">
                      {formatNumber(arStats.totalAr)} ৳
                    </span>
                  </div>
                  <div className="bg-emerald-50/50 p-4 border border-emerald-100 rounded-2xl">
                    <span className="text-[9px] text-emerald-700 font-extrabold uppercase">বিজ্ঞপ্তি / প্রাপ্ত সংগ্রহ</span>
                    <span className="block text-lg font-mono font-black text-emerald-800 mt-0.5">
                      {formatNumber(arStats.receivedAr)} ৳
                    </span>
                  </div>
                  <div className="bg-rose-50/50 p-4 border border-rose-100 rounded-2xl">
                    <span className="text-[9px] text-rose-700 font-extrabold uppercase">আউটস্ট্যান্ডিং বাকি দেনা (Outstanding AR)</span>
                    <span className="block text-lg font-mono font-black text-rose-800 mt-0.5">
                      {formatNumber(arStats.outstandingAr)} ৳
                    </span>
                  </div>
                </div>

                <div className="overflow-hidden border border-slate-100 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-150 text-[10px] text-gray-500 font-black uppercase">
                        <th className="p-3">গ্রাহকের নাম (Customer)</th>
                        <th className="p-3">বিল নম্বর / চালান</th>
                        <th className="p-3">মোট পাওনা অর্থমূল্য</th>
                        <th className="p-3">সংগৃহীত নগদ (৳)</th>
                        <th className="p-3">পরিশোধের শেষ সময়</th>
                        <th className="p-3">অবস্থা</th>
                        <th className="p-3 text-right">আংশিক প্রাপ্তি রেকর্ড</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {receivables.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50/20">
                          <td className="p-3 font-bold text-gray-900">{r.customerName}</td>
                          <td className="p-3 font-mono text-gray-500 text-[10.5px]">{r.invoiceNo}</td>
                          <td className="p-3 font-mono font-bold text-gray-800">{formatNumber(r.amount)} ৳</td>
                          <td className="p-3 font-mono text-emerald-600 font-bold">{formatNumber(r.amountReceived)} ৳</td>
                          <td className="p-3 font-mono text-gray-400">{r.dueDate}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded border text-[9px] font-black ${
                              r.status === "Paid" ? "bg-emerald-50 text-emerald-700 border-emerald-250" :
                              r.status === "Partially Paid" ? "bg-amber-50 text-amber-700 border-amber-250 animate-pulse" :
                              "bg-rose-50 text-rose-700 border-rose-250"
                            }`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="p-3 text-right flex items-center justify-end gap-1">
                            {r.status !== "Paid" ? (
                              <button
                                onClick={() => {
                                  const raw = prompt("প্রাপ্ত সংগ্রহের পরিমাণ লিখুন (Enter Collected Amount):", String(r.amount - r.amountReceived));
                                  if (raw && !isNaN(Number(raw))) {
                                    handleRecordArReceipt(r.id, Number(raw));
                                  }
                                }}
                                className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded p-1.5 px-3 font-black cursor-pointer"
                              >
                                Collect Cash
                              </button>
                            ) : (
                              <span className="text-[10px] text-gray-400 font-extrabold text-emerald-600">Collected Clear</span>
                            )}
                            <button
                              onClick={() => handleDeleteReceivable(r.id)}
                              className="text-rose-600 hover:text-white p-1 hover:bg-rose-600 hover:border-rose-600 border border-transparent rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Add Customer Receivable Invoice form */}
              <div className="bg-white rounded-3xl p-6 border shadow-xs">
                <h4 className="text-xs font-black text-gray-950 uppercase tracking-widest mb-4 flex items-center gap-1.5 border-b pb-2">
                  <Plus className="w-3.5 h-3.5 text-indigo-600" /> নতুন গ্রাহক প্রাপ্য বিল রেকর্ড (Accounts Receivable)
                </h4>
                <form onSubmit={handleAddReceivable} className="space-y-4 text-xs font-semibold">
                  <div>
                    <label className="block text-slate-500 font-extrabold mb-1">গ্রাহকের নাম বা প্রতিষ্ঠানের বিবরণ</label>
                    <input
                      required
                      type="text"
                      className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none"
                      placeholder="e.g. Zaman Motors (মেসার্স জামান মটরস)"
                      value={newReceivable.customerName}
                      onChange={(e) => setNewReceivable({ ...newReceivable, customerName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-extrabold mb-1">বিল রেফারেন্স / মেমো নম্বর</label>
                    <input
                      required
                      type="text"
                      className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none font-mono"
                      placeholder="e.g. INV-CUST-9912A"
                      value={newReceivable.invoiceNo}
                      onChange={(e) => setNewReceivable({ ...newReceivable, invoiceNo: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 font-extrabold mb-1">বিল পাওনা পরিমান (৳)</label>
                      <input
                        required
                        type="number"
                        className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none font-mono"
                        placeholder="75000"
                        value={newReceivable.amount || ""}
                        onChange={(e) => setNewReceivable({ ...newReceivable, amount: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-extrabold mb-1">টাকা উসুলের শেষ সময় (DueDate)</label>
                      <input
                        required
                        type="date"
                        className="w-full border rounded-xl p-2.5 focus:border-indigo-600 focus:outline-none"
                        value={newReceivable.dueDate}
                        onChange={(e) => setNewReceivable({ ...newReceivable, dueDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-extrabold rounded-xl hover:bg-indigo-700 cursor-pointer">
                    গ্রাহক দেনা বিল তালিকাভুক্ত করুন
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
