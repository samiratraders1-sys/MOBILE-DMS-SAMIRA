import React, { useState, useMemo } from "react";
import { 
  Search, Printer, ListFilter, Merge, Plus, Edit, Trash2, 
  Users, ShoppingCart, UserCheck, MapPin, Phone, Store, CheckSquare, X, RefreshCw
} from "lucide-react";
import ThermalPrintTemplate from "./ThermalPrintTemplate";
import toast from "react-hot-toast";
import { getGroupColors } from "../lib/utils";

export default function SROrderListPanel({ 
  orders, 
  products, 
  updateOrder, 
  removeOrder, 
  addOrder,
  routes, 
  staff, 
  customers, 
  addCustomer, 
  updateCustomer, 
  currentUserRole, 
  currentUserRecord 
}: any) {
  const [activeTab, setActiveTab] = useState<"orders" | "customers">("orders");
  const [routeFilter, setRouteFilter] = useState("");
  const [srFilter, setSrFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [orderQuery, setOrderQuery] = useState("");
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [isMergedPrint, setIsMergedPrint] = useState(false);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [newProductId, setNewProductId] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // New States for Creating an Order inside SROrderListPanel
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  const [newOrderRoute, setNewOrderRoute] = useState("");
  const [newOrderSR, setNewOrderSR] = useState("");
  const [newOrderCustomer, setNewOrderCustomer] = useState("");
  const [newOrderCart, setNewOrderCart] = useState<any[]>([]);
  const [isSubmittingNewOrder, setIsSubmittingNewOrder] = useState(false);
  const [newOrderSearchKeyword, setNewOrderSearchKeyword] = useState("");
  const [newOrderCustSearch, setNewOrderCustSearch] = useState("");
  const [newOrderShowCustDropdown, setNewOrderShowCustDropdown] = useState(false);

  // Customer Management states
  const [customerSearch, setCustomerSearch] = useState("");
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [showAddCustomerSec, setShowAddCustomerSec] = useState(false);
  
  // Backing fields for create/edit customer
  const [custName, setCustName] = useState("");
  const [custShopName, setCustShopName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custAddress, setCustAddress] = useState("");
  const [custGroup, setCustGroup] = useState("");

  const isSRUser = currentUserRole === "sr";
  
  const srStaffId = useMemo(() => {
    if (!isSRUser) return "";
    return currentUserRecord?.staffId || staff.find((s: any) => s.id === currentUserRecord?.staffId || s.name === currentUserRecord?.name)?.id || "";
  }, [isSRUser, currentUserRecord, staff]);

  React.useEffect(() => {
    if (isSRUser && srStaffId) {
      setSrFilter(srStaffId);
    }
  }, [isSRUser, srStaffId]);

  const getStatusLabelAndColor = (status: string) => {
    switch (status) {
      case "processing":
        return { label: "প্রক্রিয়াকরণে", bg: "bg-blue-50 text-blue-700 border-blue-200", textClass: "text-blue-600" };
      case "shipped":
        return { label: "পাঠানো হয়েছে", bg: "bg-purple-50 text-purple-700 border-purple-200", textClass: "text-purple-600" };
      case "delivered":
        return { label: "বিতরণ করা হয়েছে", bg: "bg-emerald-50 text-emerald-700 border-emerald-250", textClass: "text-emerald-600" };
      case "cancelled":
        return { label: "বাতিল", bg: "bg-rose-50 text-rose-700 border-rose-200", textClass: "text-rose-500" };
      case "pending":
      default:
        return { label: "মুলতুবি", bg: "bg-amber-50 text-amber-700 border-amber-200", textClass: "text-amber-500" };
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o: any) => {
      if (isSRUser && srStaffId && o.srId !== srStaffId) return false;
      
      const matchRoute = !routeFilter || o.routeId === routeFilter;
      const matchSr = !srFilter || o.srId === srFilter;
      const matchDate = !dateFilter || o.date === dateFilter;
      const matchStatus = !statusFilter || (o.status || "pending") === statusFilter;
      
      let matchQuery = true;
      if (orderQuery) {
        const q = orderQuery.toLowerCase();
        const oId = String(o.id || "").toLowerCase();
        const customerObj = customers.find((c: any) => c.id === o.customerId);
        const cName = String(customerObj?.name || "").toLowerCase();
        const cShop = String(customerObj?.shopName || "").toLowerCase();
        matchQuery = oId.includes(q) || cName.includes(q) || cShop.includes(q);
      }

      return matchRoute && matchSr && matchDate && matchStatus && matchQuery;
    });
  }, [orders, routeFilter, srFilter, dateFilter, statusFilter, orderQuery, isSRUser, srStaffId, customers]);

  const filteredCustomersList = useMemo(() => {
    return customers.filter((c: any) => {
      const query = customerSearch.toLowerCase();
      const n = String(c.name || "").toLowerCase();
      const s = String(c.shopName || "").toLowerCase();
      const p = String(c.phone || "").toLowerCase();
      const a = String(c.address || "").toLowerCase();
      const g = String(c.groupId || "").toLowerCase();
      return n.includes(query) || s.includes(query) || p.includes(query) || a.includes(query) || g.includes(query);
    });
  }, [customers, customerSearch]);

  const modalFilteredProducts = useMemo(() => {
    return products.filter((p: any) => p.name.toLowerCase().includes(newOrderSearchKeyword.toLowerCase()));
  }, [products, newOrderSearchKeyword]);

  const newOrderFilteredCustomers = useMemo(() => {
    if (!newOrderCustSearch) return customers;
    const q = newOrderCustSearch.toLowerCase();
    return customers.filter((c: any) => 
      String(c.name || "").toLowerCase().includes(q) ||
      String(c.shopName || "").toLowerCase().includes(q) ||
      String(c.groupId || "").toLowerCase().includes(q)
    );
  }, [customers, newOrderCustSearch]);

  const getCartQtyForProduct = (productId: string) => {
    const item = newOrderCart.find(i => i.productId === productId);
    if (!item) return { ctn: "", pcs: "" };
    const ctnSize = item.cartoonSize || 1;
    const ctn = Math.floor(item.quantity / ctnSize);
    const pcs = item.quantity % ctnSize;
    return {
      ctn: ctn > 0 ? String(ctn) : "",
      pcs: pcs > 0 ? String(pcs) : ""
    };
  };

  const handleUpdateCartQty = (product: any, field: "ctn" | "pcs", valStr: string) => {
    const ctnSize = product.cartoonSize || 1;
    const currentQty = newOrderCart.find(i => i.productId === product.id)?.quantity || 0;
    let ctn = Math.floor(currentQty / ctnSize);
    let pcs = currentQty % ctnSize;
    
    // Allow empty string to reset, otherwise parse
    const parsed = valStr === "" ? 0 : (parseInt(valStr) || 0);
    if (field === "ctn") {
      ctn = parsed;
    } else {
      pcs = parsed;
    }
    
    const totalQty = (ctn * ctnSize) + pcs;
    
    if (totalQty > 0) {
      const existingIndex = newOrderCart.findIndex(i => i.productId === product.id);
      if (existingIndex > -1) {
        const updated = [...newOrderCart];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: totalQty
        };
        setNewOrderCart(updated);
      } else {
        setNewOrderCart([...newOrderCart, {
          productId: product.id,
          name: product.name,
          quantity: totalQty,
          price: product.price || 0,
          cartoonSize: ctnSize
        }]);
      }
    } else {
      setNewOrderCart(newOrderCart.filter(i => i.productId !== product.id));
    }
  };

  const mergedOrder = useMemo(() => {
    const selected = orders.filter((o: any) => selectedOrders.has(o.id));
    if (selected.length === 0) return null;
    
    const itemsMap = new Map();
    
    selected.forEach((o: any) => {
      o.items?.forEach((item: any) => {
        const existing = itemsMap.get(item.productId) || { ...item, quantity: 0 };
        existing.quantity += Number(item.quantity) || 0;
        itemsMap.set(item.productId, existing);
      });
    });
    
    return {
      date: dateFilter,
      id: "MERGED-" + Date.now(),
      customerName: "Consolidated Delivery",
      items: Array.from(itemsMap.values())
    };
  }, [selectedOrders, orders, dateFilter]);

  const selectedSummary = useMemo(() => {
    const selected = orders.filter((o: any) => selectedOrders.has(o.id));
    const itemsMap = new Map();
    let totalQuantity = 0;
    
    selected.forEach((o: any) => {
      o.items?.forEach((item: any) => {
        const qty = Number(item.quantity) || 0;
        totalQuantity += qty;
        
        const existingQty = itemsMap.get(item.productId) || 0;
        itemsMap.set(item.productId, existingQty + qty);
      });
    });
    
    return {
      orderCount: selected.length,
      uniqueProductCount: itemsMap.size,
      totalQuantity
    };
  }, [selectedOrders, orders]);

  const toggleOrder = (id: string) => {
    const next = new Set(selectedOrders);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedOrders(next);
    setIsMergedPrint(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleUpdate = () => {
    updateOrder(activeOrder.id, { ...activeOrder, items: editItems });
    setActiveOrder(null);
    setIsEditing(false);
    toast.success("অর্ডার সফলভাবে আপডেট হয়েছে");
  };
  
  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const addItemToOrder = () => {
    if (!newProductId) return;
    const product = products.find((p: any) => p.id === newProductId);
    if (product) {
      setEditItems([...editItems, { productId: product.id, name: product.name, quantity: 1, price: product.price }]);
      setNewProductId("");
    }
  };

  // Customer handlers
  const startEditCustomer = (cust: any) => {
    setEditingCustomer(cust);
    setCustName(cust.name || "");
    setCustShopName(cust.shopName || "");
    setCustPhone(cust.phone || "");
    setCustAddress(cust.address || "");
    setCustGroup(cust.groupId || "");
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName) {
      toast.error("নাম অবশই প্রদান করতে হবে");
      return;
    }
    try {
      const payload = {
        name: custName,
        shopName: custShopName || "",
        phone: custPhone || "",
        address: custAddress || "",
        groupId: custGroup || "",
      };
      if (editingCustomer) {
        if (updateCustomer) {
          await updateCustomer(editingCustomer.id, payload);
          toast.success("গ্রাহকের তথ্য আপডেট হয়েছে");
        }
        setEditingCustomer(null);
      } else {
        if (addCustomer) {
          await addCustomer({ ...payload, balance: 0, createdAt: new Date().toISOString() });
          toast.success("নতুন গ্রাহক সফলভাবে নিবন্ধিত হয়েছে");
        }
        setShowAddCustomerSec(false);
      }
      // Reset fields
      setCustName("");
      setCustShopName("");
      setCustPhone("");
      setCustAddress("");
      setCustGroup("");
    } catch (err: any) {
      toast.error("তথ্য সংরক্ষণ করতে ব্যর্থ: " + err.message);
    }
  };

  React.useEffect(() => {
    if (showCreateOrderModal) {
      if (isSRUser && srStaffId) {
        setNewOrderSR(srStaffId);
        const lastOrder = orders.find((o: any) => o.srId === srStaffId);
        if (lastOrder && lastOrder.routeId) {
          setNewOrderRoute(lastOrder.routeId);
        }
      }
    }
  }, [showCreateOrderModal, isSRUser, srStaffId, orders]);

  const newCartTotalQty = useMemo(() => {
    return newOrderCart.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0);
  }, [newOrderCart]);

  const newCartTotalPrice = useMemo(() => {
    return newOrderCart.reduce((sum: number, item: any) => sum + ((Number(item.quantity) || 0) * (Number(item.price) || 0)), 0);
  }, [newOrderCart]);

  const submitNewOrder = async () => {
    if (!newOrderRoute) {
      toast.error("অনুগ্রহ করে রুট সিলেক্ট করুন");
      return;
    }
    if (!newOrderSR) {
      toast.error("অনুগ্রহ করে SR সিলেক্ট করুন");
      return;
    }
    if (newOrderCart.length === 0) {
      toast.error("অর্ডারে অন্তত একটি পণ্য যোগ করুন");
      return;
    }
    
    setIsSubmittingNewOrder(true);
    try {
      const payload = {
        date: new Date().toISOString().split('T')[0],
        routeId: newOrderRoute,
        srId: newOrderSR,
        customerId: newOrderCustomer || "",
        items: newOrderCart,
        status: "pending"
      };
      
      if (addOrder) {
        await addOrder(payload);
        toast.success("নতুন অর্ডার সফলভাবে তৈরি হয়েছে!");
        setShowCreateOrderModal(false);
        // Reset states
        setNewOrderRoute("");
        setNewOrderSR("");
        setNewOrderCustomer("");
        setNewOrderCart([]);
        setNewOrderCustSearch("");
      } else {
        toast.error("অর্ডার তৈরি করার অনুমতি বা সিস্টেম সংযোগ পাওয়া যায়নি");
      }
    } catch (err: any) {
      toast.error("অর্ডার তৈরি করতে ব্যর্থ হয়েছে: " + err.message);
    } finally {
      setIsSubmittingNewOrder(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-3xl border shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-indigo-650" /> 
            ডিস্ট্রিবিউশন অর্ডার ও গ্রাহক পরিচালনা (Order & Customer System)
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            নতুন অর্ডার তৈরি করুন, গ্রাহক নিবন্ধিত করুন এবং বিভিন্ন স্ট্যাটাসে বিতরণ মনিটর করুন
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === "orders" ? (
            <>
              <button 
                onClick={() => {
                  setNewOrderRoute("");
                  setNewOrderSR("");
                  setNewOrderCustomer("");
                  setNewOrderCart([]);
                  setNewOrderCustSearch("");
                  setNewOrderShowCustDropdown(false);
                  setShowCreateOrderModal(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all cursor-pointer shadow-sm shadow-emerald-600/10 active:scale-95 duration-100"
              >
                <Plus className="w-4 h-4" /> নতুন অর্ডার তৈরি করুন
              </button>
              {selectedOrders.size > 1 && (
                 <button 
                    onClick={() => setIsMergedPrint(!isMergedPrint)}
                    className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all cursor-pointer ${isMergedPrint ? 'bg-[#4f46e5] text-white' : 'bg-gray-100 text-gray-700'}`}
                 >
                   <Merge className="w-4 h-4" /> {isMergedPrint ? 'মার্জিত প্রিন্ট অন' : 'মার্জ করুন'}
                 </button>
              )}
              <button 
                onClick={handlePrint}
                disabled={selectedOrders.size === 0}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 disabled:bg-gray-300 transition-all cursor-pointer shadow-sm"
              >
                <Printer className="w-4 h-4" /> নির্বাচিত প্রিন্ট ({selectedOrders.size})
              </button>
            </>
          ) : (
            <button 
              onClick={() => {
                setCustName("");
                setCustShopName("");
                setCustPhone("");
                setCustAddress("");
                setCustGroup("");
                setShowAddCustomerSec(true);
              }}
              className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" /> নতুন গ্রাহক যোগ
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Tab Switcher */}
      <div className="flex border-b border-gray-100 mb-6 font-bold text-sm">
        <button
          onClick={() => setActiveTab("orders")}
          className={`pb-3 px-4 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "orders" 
              ? "border-indigo-600 text-indigo-600 font-black" 
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <ShoppingCart className="w-4 h-4" /> অর্ডার ট্র্যাকিং ও তালিকা ({filteredOrders.length})
        </button>
        <button
          onClick={() => setActiveTab("customers")}
          className={`pb-3 px-4 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "customers" 
              ? "border-indigo-600 text-indigo-600 font-black" 
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <Users className="w-4 h-4" /> গ্রাহক তথ্য ও ডিরেক্টরি ({customers.length})
        </button>
      </div>

      {/* TAB content: Orders */}
      {activeTab === "orders" && (
        <div className="space-y-6">
          {/* Real-time Order Tracking Dashboard Tracker KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <button 
              type="button"
              onClick={() => setStatusFilter("")}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between h-24 ${
                statusFilter === "" 
                  ? "bg-slate-900 text-white border-slate-900 ring-4 ring-slate-900/10 scale-102 shadow-md" 
                  : "bg-white text-gray-700 border-gray-200 hover:bg-slate-50 hover:border-gray-300"
              }`}
            >
              <div className="flex justify-between items-center w-full">
                <span className="text-[10px] font-black tracking-wider uppercase opacity-80">সকল অর্ডার</span>
                <span className={`p-1 rounded-lg text-xs ${statusFilter === "" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-800 font-bold"}`}>📦</span>
              </div>
              <p className="text-2xl font-black mt-2">{orders.length}</p>
            </button>

            <button 
              type="button"
              onClick={() => setStatusFilter("pending")}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between h-24 ${
                statusFilter === "pending" 
                  ? "bg-amber-500 text-white border-amber-500 ring-4 ring-amber-500/15 scale-102 shadow-md" 
                  : "bg-white text-gray-700 border-gray-250 hover:bg-amber-50/20 hover:border-amber-200"
              }`}
            >
              <div className="flex justify-between items-center w-full">
                <span className="text-[10px] font-black tracking-wider uppercase opacity-80">মুলতুবি (Pending)</span>
                <span className="bg-amber-100 text-amber-800 p-1 rounded-lg text-xs font-bold">🕒</span>
              </div>
              <p className="text-2xl font-black mt-2">{orders.filter((o: any) => (o.status || "pending") === "pending").length}</p>
            </button>

            <button 
              type="button"
              onClick={() => setStatusFilter("processing")}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between h-24 ${
                statusFilter === "processing" 
                  ? "bg-blue-600 text-white border-blue-600 ring-4 ring-blue-600/15 scale-102 shadow-md" 
                  : "bg-white text-gray-700 border-gray-250 hover:bg-blue-50/20 hover:border-blue-200"
              }`}
            >
              <div className="flex justify-between items-center w-full">
                <span className="text-[10px] font-black tracking-wider uppercase opacity-80">প্রক্রিয়াধীন</span>
                <span className="bg-blue-100 text-blue-800 p-1 rounded-lg text-xs font-bold">⚙️</span>
              </div>
              <p className="text-2xl font-black mt-2">{orders.filter((o: any) => o.status === "processing").length}</p>
            </button>

            <button 
              type="button"
              onClick={() => setStatusFilter("shipped")}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between h-24 ${
                statusFilter === "shipped" 
                  ? "bg-purple-650 text-white border-purple-650 ring-4 ring-purple-650/15 scale-102 shadow-md" 
                  : "bg-white text-gray-700 border-gray-250 hover:bg-purple-50/30 hover:border-purple-200"
              }`}
            >
              <div className="flex justify-between items-center w-full">
                <span className="text-[10px] font-black tracking-wider uppercase opacity-80">পাঠানো হয়েছে</span>
                <span className="bg-purple-100 text-purple-800 p-1 rounded-lg text-xs font-bold">🚚</span>
              </div>
              <p className="text-2xl font-black mt-2">{orders.filter((o: any) => o.status === "shipped").length}</p>
            </button>

            <button 
              type="button"
              onClick={() => setStatusFilter("delivered")}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between h-24 ${
                statusFilter === "delivered" 
                  ? "bg-emerald-600 text-white border-emerald-600 ring-4 ring-emerald-600/15 scale-102 shadow-md" 
                  : "bg-white text-gray-700 border-gray-250 hover:bg-emerald-50/20 hover:border-emerald-250"
              }`}
            >
              <div className="flex justify-between items-center w-full">
                <span className="text-[10px] font-black tracking-wider uppercase opacity-80">বিতরণ করা হয়েছে</span>
                <span className="bg-emerald-100 text-emerald-800 p-1 rounded-lg text-xs font-bold">✓</span>
              </div>
              <p className="text-2xl font-black mt-2">{orders.filter((o: any) => o.status === "delivered").length}</p>
            </button>

            <button 
              type="button"
              onClick={() => setStatusFilter("cancelled")}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between h-24 ${
                statusFilter === "cancelled" 
                  ? "bg-rose-600 text-white border-rose-600 ring-4 ring-rose-600/15 scale-102 shadow-md" 
                  : "bg-white text-gray-700 border-gray-250 hover:bg-rose-50/20 hover:border-rose-200"
              }`}
            >
              <div className="flex justify-between items-center w-full">
                <span className="text-[10px] font-black tracking-wider uppercase opacity-80">বাতিল</span>
                <span className="bg-rose-100 text-rose-800 p-1 rounded-lg text-xs font-bold">✗</span>
              </div>
              <p className="text-2xl font-black mt-2">{orders.filter((o: any) => o.status === "cancelled").length}</p>
            </button>
          </div>

          {selectedOrders.size > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl text-center animate-in slide-in-from-top-1">
                <p className="text-xs font-bold text-gray-500 uppercase">নির্বাচিত অর্ডার</p>
                <p className="text-2xl font-extrabold text-indigo-900">{selectedSummary.orderCount}</p>
              </div>
              <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl text-center animate-in slide-in-from-top-1">
                <p className="text-xs font-bold text-gray-500 uppercase">ইউনিক পণ্য</p>
                <p className="text-2xl font-extrabold text-blue-900">{selectedSummary.uniqueProductCount}</p>
              </div>
              <div className="p-4 bg-green-50/60 border border-green-100 rounded-2xl text-center animate-in slide-in-from-top-1">
                <p className="text-xs font-bold text-gray-500 uppercase">মোট পরিমাণ (Qty)</p>
                <p className="text-2xl font-extrabold text-green-905">{selectedSummary.totalQuantity}</p>
              </div>
            </div>
          )}

          {/* Filters shelf */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <input 
                type="text" 
                placeholder="অর্ডার বা গ্রাহক খুঁজুন..." 
                className="w-full p-3 pl-9 border rounded-xl text-sm"
                value={orderQuery}
                onChange={e => setOrderQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>
            <input 
              type="date" 
              value={dateFilter} 
              onChange={e => setDateFilter(e.target.value)} 
              className="p-3 border rounded-xl text-sm w-full focus:outline-none" 
            />
            <select 
              value={routeFilter} 
              onChange={e => setRouteFilter(e.target.value)} 
              className="p-3 border rounded-xl text-sm"
            >
              <option value="">সকল রুট</option>
              {routes.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            {!isSRUser && (
              <select 
                value={srFilter} 
                onChange={e => setSrFilter(e.target.value)} 
                className="p-3 border rounded-xl text-sm"
              >
                <option value="">সকল SR</option>
                {staff.filter((s:any) => s.role === 'SR').map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)} 
              className="p-3 border rounded-xl text-sm"
            >
              <option value="">সকল স্ট্যাটাস</option>
              <option value="pending">মুলতুবি (Pending)</option>
              <option value="processing">প্রক্রিয়াকরণে (Processing)</option>
              <option value="shipped">পাঠানো হয়েছে (Shipped)</option>
              <option value="delivered">বিতরণ করা হয়েছে (Delivered)</option>
              <option value="cancelled">বাতিল (Cancelled)</option>
            </select>
          </div>

          <div className="border rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                <tr>
                  <th className="p-4 w-12 text-center">
                    <input 
                      type="checkbox" 
                      onChange={e => {
                        setSelectedOrders(e.target.checked ? new Set(filteredOrders.map((o: any) => o.id)) : new Set());
                        setIsMergedPrint(false);
                      }} 
                    />
                  </th>
                  <th className="p-4">অর্ডার আইডি / তারিখ</th>
                  <th className="p-4">গ্রাহক ও দোকান</th>
                  <th className="p-4">SR ও রুট</th>
                  <th className="p-4 text-center">আইটেম সংখ্যা</th>
                  <th className="p-4">স্ট্যাটাস</th>
                  <th className="p-4">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center p-10 text-gray-400 italic">
                      কোনো অর্ডার তথ্য পাওয়া যায়নি!
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((o: any) => {
                    const statusInfo = getStatusLabelAndColor(o.status || "pending");
                    const customerObj = customers.find((c: any) => c.id === o.customerId);
                    const srObj = staff.find((s: any) => s.id === o.srId);
                    const routeObj = routes.find((r: any) => r.id === o.routeId);
                    
                    return (
                      <tr key={o.id} onClick={() => setActiveOrder(o)} className="cursor-pointer hover:bg-gray-50 transition-colors">
                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            checked={selectedOrders.has(o.id)} 
                            onChange={() => toggleOrder(o.id)} 
                          />
                        </td>
                        <td className="p-4">
                          <p className="font-extrabold text-gray-900 font-mono text-xs">{o.id?.slice(0, 8)}...</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{o.date}</p>
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-gray-800 flex items-center gap-1.5 flex-wrap">
                            {customerObj?.name || "সাধারণ কাস্টমার"}
                            {customerObj?.groupId && (() => {
                              const colors = getGroupColors(customerObj.groupId);
                              return (
                                <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase border tracking-wider ${colors.bg} ${colors.text} ${colors.border}`}>
                                  {customerObj.groupId}
                                </span>
                              );
                            })()}
                          </p>
                          {customerObj?.shopName && (
                            <p className="text-[11px] text-slate-505 font-bold">{customerObj.shopName}</p>
                          )}
                        </td>
                        <td className="p-4">
                          <p className="text-xs font-semibold text-gray-700">{srObj?.name || "SR N/A"}</p>
                          <p className="text-[10px] text-indigo-600 font-bold">{routeObj?.name || "রুট N/A"}</p>
                        </td>
                        <td className="p-4 text-center font-extrabold text-gray-800">
                          {o.items?.length || 0} টি
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 text-[11px] font-black rounded-lg border uppercase tracking-wider ${statusInfo.bg}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                          <button 
                            className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-black hover:bg-indigo-100 transition-colors cursor-pointer"
                            onClick={() => setActiveOrder(o)}
                          >
                            বিস্তারিত
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB content: Customers Directory */}
      {activeTab === "customers" && (
        <div className="space-y-6">
          {/* Search bar */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="relative w-full md:max-w-md">
              <input 
                type="text" 
                placeholder="গ্রাহকের নাম, মোবাইল, দোকান বা রোড দিয়ে খুঁজুন..." 
                className="w-full p-3 pl-9 border rounded-xl text-sm"
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>
            <div className="text-xs text-slate-500 font-bold">
              মোট ফলিত গ্রাহক: <span className="text-indigo-600 text-sm font-black">{filteredCustomersList.length}</span> জন
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCustomersList.length === 0 ? (
              <div className="col-span-full py-12 text-center text-gray-400 italic text-sm">
                কোনো গ্রাহক তথ্য খুঁজে পাওয়া যায়নি!
              </div>
            ) : (
              filteredCustomersList.map((c: any) => {
                const recentCustOrders = orders.filter((o: any) => o.customerId === c.id);
                return (
                  <div key={c.id} className="bg-white border rounded-2xl p-5 hover:shadow-md transition-all flex flex-col justify-between group">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-extrabold text-base text-gray-900 group-hover:text-indigo-600 transition-colors">{c.name}</h4>
                          {c.shopName && (
                            <p className="text-xs text-indigo-600 font-black mt-0.5 flex items-center gap-1">
                              <Store className="w-3.5 h-3.5 shrink-0" /> {c.shopName}
                            </p>
                          )}
                        </div>
                        {c.groupId && (() => {
                          const colors = getGroupColors(c.groupId);
                          return (
                            <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md border shadow-2xs transition-all ${colors.bg} ${colors.text} ${colors.border}`}>
                              {c.groupId}
                            </span>
                          );
                        })()}
                      </div>

                      <div className="space-y-1.5 text-xs text-gray-600 py-3 border-y border-gray-50 mb-3">
                        {c.phone && (
                          <p className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" /> {c.phone}
                          </p>
                        )}
                        {c.address && (
                          <p className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" /> {c.address}
                          </p>
                        )}
                        <p className="flex items-center gap-2 text-indigo-650">
                          <CheckSquare className="w-3.5 h-3.5 text-gray-400 shrink-0" /> মোট অর্ডার: {recentCustOrders.length} টি
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <p className="text-xs font-bold text-gray-400">
                        পূর্বের বাকী: <span className="font-mono text-red-650 font-extrabold">{(c.balance || 0).toFixed(2)} ৳</span>
                      </p>
                      
                      <button
                        type="button"
                        onClick={() => startEditCustomer(c)}
                        className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-800 rounded-lg transition-all flex items-center gap-1 text-xs font-extrabold cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" /> এডিট
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Hidden print templates */}
      <div className="hidden print:block">
        {isMergedPrint && mergedOrder ? (
            <div className="page-break-after">
             <ThermalPrintTemplate order={mergedOrder} />
            </div>
        ) : (
            orders.filter((o: any) => selectedOrders.has(o.id)).map((o: any) => (
               <div key={o.id} className="page-break-after">
                 <ThermalPrintTemplate order={o} />
               </div>
            ))
        )}
      </div>

      {activeOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-3xl w-full max-w-lg shadow-xl border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-start mb-4 border-b pb-2">
              <div>
                <h3 className="font-extrabold text-lg text-gray-950">অর্ডার ডিটেইলস</h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">আইডি: {activeOrder.id}</p>
              </div>
              <button 
                onClick={() => { setActiveOrder(null); setIsEditing(false); }}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* RELATIONAL Order dynamic status updates */}
            <div className="mb-4 p-4 bg-indigo-50/40 border border-indigo-100/50 rounded-2xl text-left">
              <label className="block text-xs font-black text-[#4f46e5] mb-1.5 uppercase tracking-wide">
                অর্ডারের বর্তমান ট্র্যাকিং স্ট্যাটাস (Set Tracking Status)
              </label>
              <div className="flex gap-2 flex-wrap">
                {(["pending", "processing", "shipped", "delivered", "cancelled"] as const).map((st) => {
                  const info = getStatusLabelAndColor(st);
                  const isSelected = (activeOrder.status || "pending") === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={async () => {
                        const updated = { ...activeOrder, status: st };
                        setActiveOrder(updated);
                        try {
                          await updateOrder(activeOrder.id, updated);
                          toast.success(`স্ট্যাটাস '${info.label}' এ আপডেট হয়েছে`);
                        } catch (err: any) {
                          toast.error("স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে");
                        }
                      }}
                      className={`px-3 py-1.5 text-xs font-extrabold rounded-lg border transition-all cursor-pointer ${
                        isSelected 
                          ? `${info.bg} ring-2 ring-indigo-500 font-extrabold shadow-sm scale-102` 
                          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {info.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <table className="w-full text-sm mb-6 text-left">
              <thead>
                <tr className="border-b border-gray-150">
                  <th className="py-3 font-semibold text-gray-500">পণ্য</th>
                  <th className="text-right py-3 font-semibold text-gray-500">পরিমাণ</th>
                  <th className="text-right py-3 font-semibold text-gray-500">মূল্য</th>
                  <th className="text-right py-3 font-semibold text-gray-500">টোটাল</th>
                  {isEditing && <th className="text-right py-3 font-semibold text-gray-500">অ্যাকশন</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(isEditing ? editItems : activeOrder.items)?.map((i: any, index: number) => {
                  const product = products.find((p: any) => p.id === i.productId);
                  const price = Number(i.price || product?.price || 0);
                  const total = price * Number(i.quantity);
                  return (
                    <tr key={i.productId || index}>
                      <td className="py-3 text-gray-900">{i.name || "Unknown Product"}</td>
                      <td className="text-right py-3">
                        {isEditing ? (
                          <input type="number" className="w-16 p-1 border rounded text-right" value={i.quantity} onChange={(e) => {
                            const newItems = [...editItems];
                            newItems[index].quantity = Math.max(1, Number(e.target.value));
                            setEditItems(newItems);
                          }}/>
                        ) : (
                          <span className="font-extrabold text-gray-950 font-mono">{i.quantity}</span>
                        )}
                      </td>
                      <td className="text-right py-3 text-gray-600 font-mono">{price.toFixed(2)}</td>
                      <td className="text-right py-3 font-extrabold text-gray-950 font-mono">{total.toFixed(2)}</td>
                      {isEditing && (
                        <td className="text-right py-3">
                          <button onClick={() => setEditItems(editItems.filter((_, idx) => idx !== index))} className="text-red-600 font-bold cursor-pointer">ডিলিট</button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-gray-150">
                <tr>
                  <td colSpan={3} className="py-3 text-right font-bold text-gray-950">সর্বমোট:</td>
                  <td className="py-3 text-right font-black text-gray-950 text-base font-mono">
                    {(
                      (isEditing ? editItems : activeOrder?.items || [])?.reduce((acc: number, i: any) => {
                        const product = products.find((p: any) => p.id === i.productId);
                        const price = Number(i.price || product?.price || 0);
                        return acc + (price * Number(i.quantity || 0));
                      }, 0) || 0
                    ).toFixed(2)} ৳
                  </td>
                </tr>
              </tfoot>
            </table>
            
            {isEditing && (
              <div className="mb-4 flex gap-2">
                <select className="flex-1 p-2 border rounded-lg text-sm bg-gray-50 focus:outline-none" value={newProductId} onChange={e => setNewProductId(e.target.value)}>
                  <option value="">পণ্য নির্বাচন করুন</option>
                  {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button onClick={addItemToOrder} className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm transition-all cursor-pointer">যোগ করুন</button>
              </div>
            )}

            {(currentUserRole === 'admin' || currentUserRole === 'manager') && (
              <div className="flex gap-2 mb-4">
                {isEditing ? (
                  <>
                    <button onClick={handleUpdate} className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all cursor-pointer">সংরক্ষণ</button>
                    <button onClick={() => setIsEditing(false)} className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-xl font-bold transition-all cursor-pointer">বাতিল</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setIsEditing(true); setEditItems(activeOrder.items || []); }} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all cursor-pointer">এডিট</button>
                    <button onClick={handleDelete} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all cursor-pointer">ডিলিট</button>
                  </>
                )}
              </div>
            )}

            <button onClick={() => { setActiveOrder(null); setIsEditing(false); }} className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold hover:shadow-md transition-all cursor-pointer">
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}

      {/* Edit Customer Modal Overlay */}
      {editingCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white p-6 rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="font-extrabold text-lg text-slate-900">গ্রাহকের তথ্য পরিবর্তন (Edit Customer)</h3>
              <button 
                type="button" 
                onClick={() => setEditingCustomer(null)}
                className="text-red-500 hover:text-red-750 text-sm font-black cursor-pointer"
              >
                বন্ধ
              </button>
            </div>
            <form onSubmit={handleSaveCustomer} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-705 mb-1">গ্রাহকের নাম (Customer Name) *</label>
                <input 
                  type="text" 
                  value={custName}
                  onChange={e => setCustName(e.target.value)}
                  className="w-full p-3 border rounded-xl text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-705 mb-1">দোকানের নাম (Shop Name)</label>
                <input 
                  type="text" 
                  value={custShopName}
                  onChange={e => setCustShopName(e.target.value)}
                  className="w-full p-3 border rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-705 mb-1">মোবাইল নম্বর (Phone)</label>
                <input 
                  type="text" 
                  value={custPhone}
                  onChange={e => setCustPhone(e.target.value)}
                  className="w-full p-3 border rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-705 mb-1">ঠিকানা (Address)</label>
                <input 
                  type="text" 
                  value={custAddress}
                  onChange={e => setCustAddress(e.target.value)}
                  className="w-full p-3 border rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-705 mb-1">কাস্টমার গ্রুপ / রুট (Group ID)</label>
                <input 
                  type="text" 
                  value={custGroup}
                  onChange={e => setCustGroup(e.target.value)}
                  className="w-full p-3 border rounded-xl text-sm"
                  list="group-presets-edit"
                />
                <datalist id="group-presets-edit">
                  {Array.from(new Set(customers.map((c: any) => c.groupId).filter(Boolean))).map((g: any) => (
                    <option key={g} value={g}></option>
                  ))}
                </datalist>
              </div>

              <div className="flex gap-3 pt-3 border-t">
                <button 
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="flex-1 py-3 border border-slate-205 text-slate-700 rounded-xl font-bold hover:bg-slate-50 text-sm cursor-pointer"
                >
                  বাতিল
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm cursor-pointer transition-all shadow-md"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Customer Section Modal */}
      {showAddCustomerSec && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white p-6 rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="font-extrabold text-lg text-slate-900">নতুন গ্রাহক নিবন্ধন (Customer Registry)</h3>
              <button 
                type="button" 
                onClick={() => setShowAddCustomerSec(false)}
                className="text-red-500 hover:text-red-750 text-sm font-black cursor-pointer"
              >
                বন্ধ
              </button>
            </div>
            <form onSubmit={handleSaveCustomer} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">গ্রাহকের নাম (Customer Name) *</label>
                <input 
                  type="text" 
                  value={custName}
                  onChange={e => setCustName(e.target.value)}
                  placeholder="গ্রাহকের নাম"
                  className="w-full p-3 border rounded-xl text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">দোকানের নাম (Shop Name)</label>
                <input 
                  type="text" 
                  value={custShopName}
                  onChange={e => setCustShopName(e.target.value)}
                  placeholder="দোকানের নাম"
                  className="w-full p-3 border rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">মোবাইল নম্বর (Phone)</label>
                <input 
                  type="text" 
                  value={custPhone}
                  onChange={e => setCustPhone(e.target.value)}
                  placeholder="মোবাইল নম্বর"
                  className="w-full p-3 border rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ঠিকানা (Address)</label>
                <input 
                  type="text" 
                  value={custAddress}
                  onChange={e => setCustAddress(e.target.value)}
                  placeholder="গ্রাম / রোড ইত্যাদি"
                  className="w-full p-3 border rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">কাস্টমার গ্রুপ / রুট (Group ID)</label>
                <input 
                  type="text" 
                  value={custGroup}
                  onChange={e => setCustGroup(e.target.value)}
                  placeholder="যেমন: ধামরাই রুট"
                  className="w-full p-3 border rounded-xl text-sm"
                  list="group-presets-registry"
                />
                <datalist id="group-presets-registry">
                  {Array.from(new Set(customers.map((c: any) => c.groupId).filter(Boolean))).map((g: any) => (
                    <option key={g} value={g}></option>
                  ))}
                </datalist>
              </div>

              <div className="flex gap-3 pt-3 border-t">
                <button 
                  type="button"
                  onClick={() => setShowAddCustomerSec(false)}
                  className="flex-1 py-3 border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 text-sm cursor-pointer"
                >
                  বাতিল
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm cursor-pointer shadow-md transition-all"
                >
                  নিবন্ধন করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999] backdrop-blur-xs">
          <div className="bg-white p-6 rounded-3xl w-full max-w-md shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-150">
            <h3 className="font-extrabold text-lg text-gray-950 mb-2">অর্ডারটি ডিলিট করতে চান?</h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-6">
              আপনি কি নিশ্চিত যে আপনি এই অর্ডারটি ডিলিট করতে চান? ডিলিট করার পর এই ডেটা পুনরুদ্ধার করা সম্ভব হবে না।
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  removeOrder(activeOrder.id);
                  setActiveOrder(null);
                  setShowDeleteConfirm(false);
                }}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all cursor-pointer"
              >
                হ্যাঁ, ডিলিট করুন
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition-all cursor-pointer"
              >
                বাতিল
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateOrderModal && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 z-[999] overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in duration-200 text-left">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50 shrink-0">
              <div>
                <h3 className="font-extrabold text-lg text-gray-950 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-emerald-600" />
                  নতুন অর্ডার তৈরি করুন (New Order Creator)
                </h3>
                <p className="text-xs text-gray-400 font-bold">রুট এবং এসআর নির্বাচন করার পর পণ্য তালিকা থেকে কার্টুন ও পিস এন্ট্রি করুন</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowCreateOrderModal(false)}
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
              
              {/* Left Column (60%): Configuration & Product Selection */}
              <div className="lg:col-span-7 space-y-6 flex flex-col">
                
                {/* Meta Config Block */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 shrink-0">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase mb-1">রুট (Route) <span className="text-red-500">*</span></label>
                    <select 
                      value={newOrderRoute} 
                      onChange={e => setNewOrderRoute(e.target.value)}
                      className="w-full p-2.5 bg-white border border-gray-250 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                    >
                      <option value="">নির্বাচন করুন</option>
                      {routes.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase mb-1">SR (অর্ডার কারী) <span className="text-red-500">*</span></label>
                    <select 
                      value={newOrderSR} 
                      onChange={e => setNewOrderSR(e.target.value)}
                      className="w-full p-2.5 bg-white border border-gray-250 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold disabled:opacity-75 disabled:bg-gray-100"
                      disabled={isSRUser}
                    >
                      <option value="">নির্বাচন করুন</option>
                      {staff.filter((s: any) => s.role === 'SR').map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Customer search & select autocomplete block */}
                  <div className="md:col-span-2 relative">
                    <label className="block text-xs font-black text-slate-500 uppercase mb-1">গ্রাহক / দোকান (Customer)</label>

                    {newOrderCustomer ? (
                      (() => {
                        const cust = customers.find((c: any) => c.id === newOrderCustomer);
                        if (!cust) return null;
                        const colors = getGroupColors(cust.groupId || "");
                        return (
                          <div className="flex items-center justify-between p-2.5 border border-emerald-100 bg-emerald-50/15 rounded-xl">
                            <div className="flex items-center gap-2">
                              {cust.groupId && (
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide border ${colors.bg} ${colors.text} ${colors.border}`}>
                                  {cust.groupId}
                                </span>
                              )}
                              <div>
                                <span className="font-extrabold text-xs text-slate-900">{cust.name}</span>
                                {cust.shopName && <span className="text-xs text-slate-500 ml-1">({cust.shopName})</span>}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setNewOrderCustomer("");
                                setNewOrderCustSearch("");
                              }}
                              className="text-red-650 hover:text-red-800 text-xs font-black px-2 py-1.5 hover:bg-red-50 rounded-lg transition-all"
                            >
                              মুছুন
                            </button>
                          </div>
                        );
                      })()
                    ) : (
                      <div>
                        <div className="relative">
                          <input 
                            type="text" 
                            placeholder="গ্রাহকের নাম, দোকান বা গ্রুপ দিয়ে সার্চ করুন..."
                            className="w-full p-2.5 pl-9 border border-gray-250 rounded-xl bg-white text-xs focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 text-slate-800"
                            value={newOrderCustSearch}
                            onChange={e => {
                              setNewOrderCustSearch(e.target.value);
                              setNewOrderShowCustDropdown(true);
                            }}
                            onFocus={() => setNewOrderShowCustDropdown(true)}
                          />
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                          {newOrderCustSearch && (
                            <button
                              type="button"
                              onClick={() => {
                                setNewOrderCustSearch("");
                                setNewOrderShowCustDropdown(false);
                              }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 text-xs font-extrabold"
                            >
                              মুছুন
                            </button>
                          )}
                        </div>

                        {newOrderShowCustDropdown && (
                          <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-[9999] p-1.5 divide-y divide-slate-100">
                            <div className="p-1 px-2 text-[10px] text-gray-400 font-extrabold uppercase tracking-wide flex justify-between bg-slate-50 rounded-md mb-1 items-center">
                              <span>ম্যাচিং গ্রাহক তালিকা ({newOrderFilteredCustomers.length})</span>
                              <button
                                type="button"
                                onClick={() => setNewOrderShowCustDropdown(false)}
                                className="text-red-500 text-[10px] font-black px-1"
                              >
                                বন্ধ
                              </button>
                            </div>
                            {newOrderFilteredCustomers.length === 0 ? (
                              <div className="p-3 text-center text-xs text-gray-400 italic">কোনো গ্রাহক পাওয়া যায়নি!</div>
                            ) : (
                              newOrderFilteredCustomers.map((c: any) => {
                                const colors = getGroupColors(c.groupId || "");
                                return (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                      setNewOrderCustomer(c.id);
                                      setNewOrderShowCustDropdown(false);
                                      setNewOrderCustSearch("");
                                    }}
                                    className="w-full text-left p-2 hover:bg-slate-50 rounded-lg flex items-center justify-between transition-all gap-2 cursor-pointer text-xs"
                                  >
                                    <div className="flex items-center gap-2">
                                      {c.groupId && (
                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border scale-95 origin-left ${colors.bg} ${colors.text} ${colors.border}`}>
                                          {c.groupId}
                                        </span>
                                      )}
                                      <span className="font-extrabold text-slate-800">{c.name}</span>
                                    </div>
                                    {c.shopName && (
                                      <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-1 rounded">{c.shopName}</span>
                                    )}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Products Grid Selection */}
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex justify-between items-center mb-2.5 shrink-0">
                    <h4 className="font-extrabold text-xs text-slate-600 uppercase tracking-wider">পণ্য ইনপুট (Products CTN/PCS)</h4>
                    <div className="relative w-44">
                      <input 
                        type="text" 
                        placeholder="পণ্য খুঁজুন..."
                        className="w-full pl-7 pr-3 py-1.5 border border-gray-250 rounded-lg text-xs"
                        value={newOrderSearchKeyword}
                        onChange={e => setNewOrderSearchKeyword(e.target.value)}
                      />
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-2xl overflow-y-auto divide-y divide-gray-100 flex-1 min-h-[220px]">
                    {modalFilteredProducts.length === 0 ? (
                      <div className="p-8 text-center text-gray-450 italic text-xs">কোনো পণ্য পাওয়া যায়নি!</div>
                    ) : (
                      modalFilteredProducts.map((p: any) => {
                        const { ctn, pcs } = getCartQtyForProduct(p.id);
                        return (
                          <div key={p.id} className="p-3 flex items-center justify-between hover:bg-slate-50/40 transition-colors gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-xs text-gray-950 truncate">{p.name}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">দর: <span className="font-extrabold text-gray-700">{p.price || 0} ৳</span> | সাইজ: <span className="font-bold">{p.cartoonSize || 1} পিস/CTN</span></p>
                            </div>
                            
                            {/* Inline Quantities Enter Fields pairs */}
                            <div className="flex items-center gap-1.5 bg-slate-55/40 p-1.5 rounded-xl border border-slate-200/50 shrink-0">
                              <div className="flex items-center gap-1">
                                <input 
                                  type="number" 
                                  min="0"
                                  placeholder="0"
                                  className="w-10 p-1 bg-white border border-gray-250 rounded-lg text-center font-black text-xs font-mono"
                                  value={ctn}
                                  onChange={e => handleUpdateCartQty(p, "ctn", e.target.value)}
                                />
                                <span className="text-[9px] font-black text-gray-400 uppercase">CTN</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <input 
                                  type="number" 
                                  min="0"
                                  placeholder="0"
                                  className="w-10 p-1 bg-white border border-gray-250 rounded-lg text-center font-black text-xs font-mono"
                                  value={pcs}
                                  onChange={e => handleUpdateCartQty(p, "pcs", e.target.value)}
                                />
                                <span className="text-[9px] font-black text-gray-400 uppercase">PCS</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column (40%): Live Cart summary and totals */}
              <div className="lg:col-span-5 bg-slate-50 p-5 rounded-2xl border border-slate-200/60 flex flex-col justify-between max-h-[500px] overflow-hidden">
                <div className="flex flex-col h-full overflow-hidden">
                  <h4 className="font-extrabold text-xs text-slate-705 border-b pb-2 mb-3 flex items-center justify-between uppercase shrink-0">
                    <span>কার্ট সারসংক্ষেপ (Cart Summary)</span>
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] rounded-full font-black">{newOrderCart.length} টি</span>
                  </h4>
                  
                  <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-1">
                    {newOrderCart.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center p-8 text-slate-400 italic text-xs text-center">
                        <span className="text-2xl mb-1 flex">🛒</span>
                        কোনো পণ্য যোগ করা হয়নি। বাম তালিকা থেকে পরিমাণ প্রদান করুন।
                      </div>
                    ) : (
                      newOrderCart.map((item: any) => {
                        const totalItemPrice = (item.quantity * (item.price || 0));
                        const ctn = Math.floor(item.quantity / (item.cartoonSize || 1));
                        const pcs = item.quantity % (item.cartoonSize || 1);
                        return (
                          <div key={item.productId} className="p-3 bg-white border rounded-xl shadow-2xs flex items-center justify-between text-xs hover:border-[#10b981] transition-all group">
                            <div className="min-w-0 flex-1 pr-2">
                              <p className="font-extrabold text-slate-900 truncate text-xs">{item.name}</p>
                              <p className="text-[10px] text-gray-500 mt-1 font-bold">
                                {ctn > 0 ? `${ctn} CTN ` : ""}{pcs > 0 ? `${pcs} PCS` : ""} <span className="text-emerald-600 font-extrabold ml-1 font-mono">(= {item.quantity} পিস)</span>
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-extrabold text-slate-950 font-mono">৳{totalItemPrice.toFixed(2)}</p>
                              <button 
                                type="button"
                                onClick={() => setNewOrderCart(newOrderCart.filter(i => i.productId !== item.productId))}
                                className="text-red-500 text-[10px] hover:underline font-bold mt-1 cursor-pointer block ml-auto"
                              >
                                রিমুভ
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-3 space-y-2.5 shrink-0">
                  <div className="flex justify-between items-center text-xs text-slate-500 font-bold">
                    <span>মোট পিস:</span>
                    <span className="font-mono font-extrabold text-slate-800">{newCartTotalQty} পিস</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-black border-t pt-2 border-slate-205">
                    <span className="text-slate-900">সর্বমোট মূল্য:</span>
                    <span className="text-sm font-sans text-emerald-600 font-black">৳{newCartTotalPrice.toFixed(2)}</span>
                  </div>

                  <button 
                    type="button"
                    disabled={newOrderCart.length === 0 || isSubmittingNewOrder}
                    onClick={submitNewOrder}
                    className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/10 active:scale-98 transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-xs"
                  >
                    {isSubmittingNewOrder ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0"></span>
                        অর্ডার পোস্টিং হচ্ছে...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4" />
                        সংরক্ষণ ও কনফার্ম করুন
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      <style>{`.page-break-after { page-break-after: always; }`}</style>
    </div>
  );
}
