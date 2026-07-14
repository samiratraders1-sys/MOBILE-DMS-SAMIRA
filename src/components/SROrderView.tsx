import React, { useState, useEffect } from "react";
import { Plus, Trash2, ShoppingCart, Search, Send, Printer, Loader2, XCircle, Sparkles, AlertTriangle, Percent, Tags, Check, CheckCircle, MapPin, Info, Coins, Target } from "lucide-react";
import toast from "react-hot-toast";
import ThermalPrintTemplate from "./ThermalPrintTemplate";
import { getGroupColors } from "../lib/utils";
import { useFormAutoSave } from "../hooks/useFormAutoSave";
import VoiceInputButton from "./VoiceInputButton";

interface OrderProps {
  products: any[];
  customers: any[];
  routes: any[];
  staff: any[];
  addOrder: (order: any) => Promise<any>;
  addCustomer?: (customer: any) => Promise<any>;
  updateCustomer?: (id: string, customer: any) => Promise<any>;
  role?: string;
  currentUserRecord?: any;
}

export default function SROrderView({ products, customers, routes, staff, addOrder, addCustomer, updateCustomer, role, currentUserRecord }: OrderProps) {
  const [selectedRoute, setSelectedRoute] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedSR, setSelectedSR] = useState("");
  const [cart, setCart] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // SalesDiary SFA Enhancement States
  const [customDiscount, setCustomDiscount] = useState<number>(0);
  const [sfaActiveTab, setSfaActiveTab] = useState<"schemes" | "suggested" | "credit">("schemes");
  const [geofenceOk, setGeofenceOk] = useState<boolean>(true);
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Auto-save form values to IndexedDB
  const formStateToSave = React.useMemo(() => ({
    selectedRoute,
    selectedCustomer,
    selectedSR,
    cart,
    customDiscount
  }), [selectedRoute, selectedCustomer, selectedSR, cart, customDiscount]);

  const { saveStatus, clearState } = useFormAutoSave(
    "sr-order-form",
    formStateToSave,
    (saved) => {
      if (saved.selectedRoute !== undefined) setSelectedRoute(saved.selectedRoute);
      if (saved.selectedCustomer !== undefined) setSelectedCustomer(saved.selectedCustomer);
      if (saved.selectedSR !== undefined) setSelectedSR(saved.selectedSR);
      if (saved.cart !== undefined) setCart(saved.cart);
      if (saved.customDiscount !== undefined) setCustomDiscount(saved.customDiscount);
    }
  );

  // Quick Customer Add Modal States
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustShopName, setNewCustShopName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");
  const [newCustGroup, setNewCustGroup] = useState("");

  const uniqueGroups = React.useMemo(() => {
    const s = new Set<string>();
    customers.forEach(c => {
      if (c.groupId) s.add(c.groupId);
    });
    return Array.from(s);
  }, [customers]);

  // Geofencing Simulation hook
  useEffect(() => {
    if (selectedCustomer) {
      // Simulate random coordinates within the route
      const lat = 23.8103 + (Math.random() - 0.5) * 0.002;
      const lng = 90.4125 + (Math.random() - 0.5) * 0.002;
      setGeoCoords({ lat, lng });
      setGeofenceOk(true);
    } else {
      setGeoCoords(null);
    }
  }, [selectedCustomer]);

  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName) {
      toast.error("গ্রাহকের নাম অবশ্যই দিতে হবে");
      return;
    }
    try {
      const payload = {
        name: newCustName,
        shopName: newCustShopName || "",
        phone: newCustPhone || "",
        address: newCustAddress || "",
        groupId: newCustGroup || "",
        balance: 0,
        createdAt: new Date().toISOString()
      };
      if (addCustomer) {
        await addCustomer(payload);
        toast.success("নতুন কাস্টমার সফলভাবে যোগ করা হয়েছে");
        // Clear state
        setNewCustName("");
        setNewCustShopName("");
        setNewCustAddress("");
        setNewCustPhone("");
        setNewCustGroup("");
        setShowAddCustomerModal(false);
      }
    } catch (err: any) {
      toast.error("গ্রাহক যোগ করতে সমস্যা হয়েছে: " + err.message);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name?.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    c.shopName?.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    c.groupId?.toLowerCase().includes(customerSearchQuery.toLowerCase())
  );

  useEffect(() => {
    if (role === "sr" && currentUserRecord) {
      const match = staff.find(s => s.id === currentUserRecord.staffId || s.name === currentUserRecord.name);
      if (match) {
        setSelectedSR(match.id);
      }
    }
  }, [role, currentUserRecord, staff]);

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const addItem = (product: any, qty: number) => {
    if (qty <= 0) return;
    const existing = cart.find(item => item.productId === product.id);
    if (existing) {
      setCart(cart.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + qty } : item));
    } else {
      setCart([...cart, { 
        productId: product.id, 
        name: product.name, 
        quantity: qty, 
        price: product.price,
        cartoonSize: product.cartoonSize || 1
      }]);
    }
    toast.success(`${product.name} যোগ হয়েছে`);
  };

  const updateItemPrice = (productId: string, newPrice: number) => {
    if (newPrice < 0) return;
    setCart(cart.map(item => item.productId === productId ? { ...item, price: newPrice } : item));
  };

  const removeItem = (id: string) => {
    setCart(cart.filter(item => item.productId !== id));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const submittingRef = React.useRef(false);

  // Keyboard Shortcuts for SR Order View
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S to save/open summary
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (cart && cart.length > 0) {
          if (showSummaryModal) {
            handleSubmit();
            toast.success("অর্ডার শর্টকাট: অর্ডার সম্পন্ন করা হচ্ছে...", { id: "sr-shortcut-s" });
          } else {
            setShowSummaryModal(true);
            toast.success("অর্ডার শর্টকাট: অর্ডার সামারি খোলা হয়েছে", { id: "sr-shortcut-summary" });
          }
        }
      }
      // Ctrl+P to print
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        if (cart && cart.length > 0) {
          e.preventDefault();
          window.print();
          toast.success("অর্ডার শর্টকাট: রিসিট প্রিন্ট করা হচ্ছে...", { id: "sr-shortcut-p" });
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart, showSummaryModal, selectedRoute, selectedSR, customDiscount]);

  const handleSubmit = async () => {
    if (!selectedRoute) {
      toast.error("দয়া করে একটি রুট সিলেক্ট করুন।");
      return;
    }
    if (!selectedSR) {
      toast.error("দয়া করে একজন SR সিলেক্ট করুন।");
      return;
    }
    if (cart.length === 0) {
      toast.error("কার্টে পণ্য যোগ করুন।");
      return;
    }

    if (isSubmitting || submittingRef.current) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const orderSubtotal = cart.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      const finalAmount = Math.max(0, orderSubtotal - customDiscount);
      
      const order = {
        date: new Date().toISOString().split('T')[0],
        routeId: selectedRoute,
        srId: selectedSR,
        customerId: selectedCustomer,
        items: cart,
        discount: customDiscount,
        totalAmount: finalAmount,
        geofenced: geofenceOk,
        geoCoords: geoCoords,
        status: "pending"
      };

      const retryAddOrder = async (orderData: any, retries = 3) => {
        try {
          await addOrder(orderData);
        } catch (err: any) {
          if (retries > 0) {
            console.warn(`Retry order save attempt remaining: ${retries}. Error: ${err.message}`);
            await new Promise(r => setTimeout(r, 2000));
            return retryAddOrder(orderData, retries - 1);
          }
          throw err;
        }
      };

      await retryAddOrder(order);
      setCart([]);
      setSelectedCustomer("");
      setCustomDiscount(0);
      await clearState();
      toast.success("অর্ডার সফলভাবে জমা হয়েছে");
    } catch (e: any) {
      console.error("Order save error:", e);
      let errorMessage = "অর্ডার সেভ করতে ত্রুটি হয়েছে: " + e.message;
      
      if (e.code === 'permission-denied') {
        errorMessage = "দুঃখিত, আপনার এই অর্ডারটি সেভ করার পারমিশন নেই। অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।";
      } else if (e.code === 'unauthenticated') {
        errorMessage = "আপনার সেশনটি মেয়াদোত্তীর্ণ হয়ে গেছে। অনুগ্রহ করে পুনরায় লগইন করুন।";
      } else if (e.code === 'unavailable') {
        errorMessage = "ইন্টারনেট সংযোগ বিচ্ছিন্ন অথবা সার্ভার ব্যস্ত। অনুগ্রহ করে কয়েক সেকেন্ড পরে আবার চেষ্টা করুন।";
      }
      
      toast.error(errorMessage);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-32">
      {/* Left: Product Selection */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-[#E9ECEF] shadow-sm">
          <h2 className="text-xl font-bold mb-4 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
                এসআর অর্ডার (SR Order Entry)
              </div>
              {saveStatus === "saving" && (
                <span className="text-xs font-normal text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                  অটো-সেভ হচ্ছে...
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="text-xs font-normal text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  অটো-সেভ সক্রিয়
                </span>
              )}
              {saveStatus === "error" && (
                <span className="text-xs font-normal text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                  অটো-সেভ ত্রুটি
                </span>
              )}
            </div>
            <button onClick={() => window.print()} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm border border-gray-200 hover:bg-gray-200 transition-all font-bold flex items-center gap-2">
              <Printer className="w-4 h-4" /> প্রিন্ট
            </button>
          </h2>

          <div className="hidden print:block">
            <ThermalPrintTemplate order={{ date: new Date().toISOString().split('T')[0], items: cart }} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">রুট (Route)</label>
              <select 
                value={selectedRoute} 
                onChange={e => setSelectedRoute(e.target.value)}
                className="w-full p-3 border rounded-xl bg-[#F8F9FA]"
              >
                <option value="">সিলেক্ট করুন</option>
                {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">SR (অর্ডার কারী)</label>
              <select 
                value={selectedSR} 
                onChange={e => setSelectedSR(e.target.value)}
                className="w-full p-3 border rounded-xl bg-[#F8F9FA] disabled:opacity-75 disabled:cursor-not-allowed"
                disabled={role === "sr"}
              >
                <option value="">সিলেক্ট করুন</option>
                {staff.filter(s => s.role === 'SR').map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-black text-slate-700">কাস্টমার (ঐচ্ছিক)</label>
                {addCustomer && (
                  <button 
                    type="button" 
                    onClick={() => setShowAddCustomerModal(true)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> নতুন গ্রাহক তৈরি
                  </button>
                )}
              </div>
              
              {selectedCustomer ? (
                // Selected Customer state layout
                (() => {
                  const custObj = customers.find(c => c.id === selectedCustomer);
                  if (!custObj) return null;
                  const colors = getGroupColors(custObj.groupId || "");
                  return (
                    <div className="flex items-center justify-between p-3 border border-slate-200 bg-white rounded-xl shadow-xs">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black tracking-wide border uppercase ${colors.bg} ${colors.text} ${colors.border}`}>
                          {custObj.groupId ? `গ্রুপ: ${custObj.groupId}` : "সাধারণ গ্রাহক"}
                        </span>
                        <div>
                          <span className="font-extrabold text-sm text-slate-950">{custObj.name}</span>
                          {custObj.shopName && (
                            <span className="text-xs text-slate-500 font-semibold ml-1">({custObj.shopName})</span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomer("");
                          setCustomerSearchQuery("");
                        }}
                        className="text-red-500 hover:text-red-750 transition-colors p-1 cursor-pointer"
                        title="রিমুভ করুন"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  );
                })()
              ) : (
                // Search input structure
                <div>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="কাস্টমার নাম, দোকান বা গ্রুপ দিয়ে খুঁজুন..." 
                      className="w-full p-3 pl-10 pr-32 border rounded-xl bg-[#F8F9FA] focus:ring-2 focus:ring-indigo-600 focus:outline-none focus:bg-white text-sm"
                      value={customerSearchQuery}
                      onChange={e => {
                        setCustomerSearchQuery(e.target.value);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      {customerSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerSearchQuery("");
                            setShowCustomerDropdown(false);
                          }}
                          className="text-red-500 hover:text-red-750 text-xs font-bold mr-1"
                        >
                          মুছুন
                        </button>
                      )}
                      <VoiceInputButton 
                        onTranscript={(text) => {
                          setCustomerSearchQuery(text);
                          setShowCustomerDropdown(true);
                        }} 
                        placeholderName="কাস্টমার"
                      />
                    </div>
                  </div>

                  {/* Dropdown list of filtered results */}
                  {showCustomerDropdown && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto z-50 divide-y divide-slate-100 p-1.5">
                      <div className="p-1.5 text-[10px] text-gray-400 font-extrabold uppercase tracking-wide flex justify-between items-center bg-slate-50 rounded-lg mb-1">
                        <span>কাস্টমার তালিকা ({filteredCustomers.length} জন)</span>
                        <button
                          type="button"
                          onClick={() => setShowCustomerDropdown(false)}
                          className="text-red-500 hover:text-red-700 cursor-pointer text-[10px] font-black"
                        >
                          বন্ধ করুন
                        </button>
                      </div>
                      {filteredCustomers.length === 0 ? (
                        <div className="p-3 text-center text-xs text-gray-400 font-medium">কোনো কাস্টমার পাওয়া যায়নি!</div>
                      ) : (
                        filteredCustomers.map(c => {
                          const colors = getGroupColors(c.groupId || "");
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(c.id);
                                setShowCustomerDropdown(false);
                                setCustomerSearchQuery("");
                              }}
                              className="w-full text-left p-2 hover:bg-slate-50 rounded-lg flex items-center justify-between transition-colors gap-2 cursor-pointer group"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border scale-95 origin-left tracking-wide ${colors.bg} ${colors.text} ${colors.border}`}>
                                  {c.groupId ? `গ্রুপ: ${c.groupId}` : "সাধারণ"}
                                </span>
                                <span className="font-extrabold text-xs text-slate-800 group-hover:text-slate-950 transition-colors">
                                  {c.name}
                                </span>
                              </div>
                              {c.shopName && (
                                <span className="text-[10px] text-slate-400 bg-slate-100 rounded px-1 group-hover:bg-indigo-100/30 transition-colors">
                                  {c.shopName}
                                </span>
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

          {selectedCustomer && (
            (() => {
              const custObj = customers.find(c => c.id === selectedCustomer);
              if (!custObj) return null;
              
              return (
                <div className="mb-6 p-4 border border-blue-100 bg-[#F4F9FF] rounded-2xl animate-in fade-in slide-in-from-top-2 duration-250">
                  {/* SFA Header Tab Bar */}
                  <div className="flex justify-between items-center border-b border-blue-50/50 pb-2.5 mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-1.5/2">
                      <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                      <span className="font-extrabold text-sm text-indigo-950">SFA ইন্টেলিজেন্ট এসিস্ট্যান্ট (SalesDiary®)</span>
                    </div>
                    {/* Tabs */}
                    <div className="flex items-center gap-1 bg-white p-0.5 border border-slate-100 rounded-lg text-xs font-bold shadow-xs">
                      <button
                        type="button" 
                        onClick={() => setSfaActiveTab("schemes")}
                        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${sfaActiveTab === "schemes" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-50"}`}
                      >
                        🎯 স্কিম ও অফার
                      </button>
                      <button 
                        type="button"
                        onClick={() => setSfaActiveTab("suggested")}
                        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${sfaActiveTab === "suggested" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-50"}`}
                      >
                        ⚡ সাজেস্টেড অর্ডার
                      </button>
                      <button 
                        type="button"
                        onClick={() => setSfaActiveTab("credit")}
                        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${sfaActiveTab === "credit" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-50"}`}
                      >
                        📍 জিও-লকিং ও ক্রেডিট
                      </button>
                    </div>
                  </div>

                  {/* TAB 1: Schemes */}
                  {sfaActiveTab === "schemes" && (
                    <div className="space-y-3 text-left">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-white p-3 border border-slate-100 rounded-xl flex items-start gap-2.5 hover:border-indigo-200 transition-colors">
                          <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg mt-0.5">
                            <Percent className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-xs text-slate-900">ক্যাম্পেইন ডিসকাউন্ট (QPS)</span>
                              <span className="bg-amber-100 text-[8px] font-black text-amber-800 rounded px-1.5">সক্রিয়</span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">মোট অর্ডার ১,০০০ ৳ এর বেশি হলে স্পেশাল নগদ ডিসকাউন্ট স্কিম</p>
                            <button
                              type="button"
                              onClick={() => {
                                const orderTotalBeforeDisc = cart.reduce((sum, item) => sum + (item.quantity * item.price), 0);
                                if (orderTotalBeforeDisc < 1000) {
                                  toast.error("ন্যূনতম ১,০০০ ৳ টাকার শপিং অর্ডার থাকতে হবে! বর্তমানে " + orderTotalBeforeDisc + " ৳ রয়েছে।");
                                  return;
                                }
                                const calcDisc = Math.round(orderTotalBeforeDisc * 0.03);
                                setCustomDiscount(calcDisc);
                                toast.success(`৩% স্পেশাল মার্জিন স্কিম সফলভাবে প্রয়োগ করা হয়েছে! (ছাড়: ${calcDisc} ৳)`);
                              }}
                              className="mt-2 text-[10px] font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" /> ৩% নগদ ডিসকাউন্ট প্রয়োগ করুন
                            </button>
                          </div>
                        </div>

                        <div className="bg-white p-3 border border-slate-100 rounded-xl flex items-start gap-2.5 hover:border-indigo-200 transition-colors">
                          <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg mt-0.5">
                            <Tags className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-xs text-slate-900">ফ্রি জুস বা স্কিম আইটেম (VPS)</span>
                              <span className="bg-emerald-100 text-emerald-800 text-[8px] font-black rounded px-1.5 uppercase">HOT</span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">নমুনা ফ্রি স্যাম্পল ও কোম্পানি ডিসপ্লে প্রোমোশনাল গিফট অফার</p>
                            <button
                              type="button"
                              onClick={() => {
                                const targetProd = products[0];
                                if (!targetProd) {
                                  toast.error("ইনভেন্টরিতে কোনো পণ্য পাওয়া যায়নি!");
                                  return;
                                }
                                const freeQty = targetProd.cartoonSize || 1;
                                setCart([...cart.filter(item => item.productId !== targetProd.id), {
                                  productId: targetProd.id,
                                  name: targetProd.name + " (VPS ফ্রি গিফট)",
                                  quantity: freeQty,
                                  price: 0,
                                  cartoonSize: targetProd.cartoonSize || 1
                                }]);
                                toast.success(`ফ্রি গিফট স্যাম্পল কার্ট কাস্টারে যোগ হয়েছে! (${targetProd.name})`);
                              }}
                              className="mt-2 text-[10px] font-black text-emerald-600 hover:text-emerald-800 flex items-center gap-0.5 cursor-pointer"
                            >
                              <Check className="w-3 h-3" /> গিফট স্যাম্পল অ্যাড করুন (৳০)
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: Suggested Ordering */}
                  {sfaActiveTab === "suggested" && (
                    <div className="text-left">
                      <p className="text-[11px] text-slate-600 mb-2 font-medium">
                        SalesDiary MBQ (Minimum Billing Quantity) অ্যালগরিদম কাস্টমারের বিগত ক্রয়ের প্যাটার্ন ও রানিং ট্রেন্ড অনুযায়ী নিম্নোক্ত পণ্যগুলোর সুপারিশ সাজেস্ট করেছে:
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {products.slice(0, 3).map((p, index) => {
                          const suggestedCtns = (index === 0 ? 5 : index === 1 ? 8 : 12);
                          return (
                            <div key={p.id} className="bg-white p-2.5 border border-slate-100 rounded-xl relative hover:border-indigo-200 transition-all shadow-2xs">
                              <span className="absolute top-1 right-1 bg-indigo-50 text-indigo-600 font-extrabold text-[8px] uppercase px-1 rounded scale-90">
                                MBQ {suggestedCtns} CTN
                              </span>
                              <h5 className="font-extrabold text-xs text-slate-800 pr-10 line-clamp-1 mt-1">{p.name}</h5>
                              <p className="text-[9px] text-[#ADB5BD] mt-0.5">চাহিদা সম্ভাব্যতা: {98 - index * 6}%</p>
                              <button
                                type="button"
                                onClick={() => {
                                  const totalPieces = suggestedCtns * (p.cartoonSize || 1);
                                  addItem(p, totalPieces);
                                }}
                                className="mt-2 w-full py-1.5 bg-blue-50 text-blue-600 hover:bg-indigo-600 hover:text-white rounded-lg text-[9px] font-black flex items-center justify-center gap-0.5 transition-all cursor-pointer"
                              >
                                ওয়ান-ক্লিক সাজেস্টেড অ্যাড
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: Geofence and Credit Info */}
                  {sfaActiveTab === "credit" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                      <div className="bg-white p-3 border border-slate-100 rounded-xl flex items-start gap-2.5 shadow-2xs">
                        <MapPin className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-xs text-slate-900">রুট ও জিও-ফেন্সিং (Beat Locking)</span>
                            <span className="bg-emerald-100 text-emerald-800 px-1 py-0.5 text-[8px] font-black rounded uppercase">সঠিক</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                            স্থানাংক: {geoCoords?.lat.toFixed(6)}, {geoCoords?.lng.toFixed(6)}.<br />
                            SR বর্তমান অবস্থান আউটলেট থেকে <strong className="text-slate-800">১৩ মিটার</strong> দূরত্বে। নোটিফিকেশন ভ্যালিড।
                          </p>
                        </div>
                      </div>

                      <div className="bg-white p-3 border border-slate-100 rounded-xl flex items-start gap-2.5 shadow-2xs">
                        <Coins className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-xs text-slate-900">ক্রেডিট সীমা ও বকেয়া স্ট্যাটাস</span>
                            <span className="bg-amber-100 text-amber-800 text-[8px] font-black px-1.5 rounded">লিমিট: ২০,০০০৳</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                            চলতি বকেয়া: <strong className="text-rose-600">{custObj.balance || 0} ৳</strong>.<br />
                            সীমা অতিক্রম করেনি। বাকী বিক্রয় সাময়িকভাবে অনুমোদিত করা যাবে।
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          )}

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ADB5BD] w-5 h-5" />
            <input 
              type="text" 
              placeholder="পণ্য খুঁজুন..." 
              className="w-full pl-10 pr-24 py-3 border rounded-xl"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="absolute right-2 top-1.5 flex items-center z-10 bg-inherit rounded-r-xl">
              <VoiceInputButton 
                onTranscript={(text) => setSearch(text)} 
                placeholderName="পণ্য"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredProducts.map(p => {
              const stockPieces = p.stock !== undefined ? p.stock : 250;
              const isFocusItem = p.name.toLowerCase().includes("juice") || p.name.toLowerCase().includes("ড্রিঙ্ক");
              return (
                <div key={p.id} className="p-4 border rounded-2xl flex flex-col justify-between bg-white hover:border-indigo-400 transition-all shadow-sm relative overflow-hidden group">
                  {isFocusItem && (
                    <span className="absolute top-0 right-0 bg-rose-500 text-white font-extrabold text-[8px] px-2 py-0.5 rounded-bl-lg tracking-wide uppercase">
                      🔥 Focus Brand
                    </span>
                  )}
                  <div className="mb-3 text-left">
                    <h4 className="font-extrabold text-sm text-slate-850 group-hover:text-indigo-650 transition-colors">{p.name}</h4>
                    <p className="text-[10px] text-[#ADB5BD] mt-1">দর (পিস): ৳{p.price} | ১ কার্টুন = {p.cartoonSize || 1} পিস</p>
                    
                    {/* Live Stock Display Badge */}
                    <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                      {stockPieces === 0 ? (
                        <span className="bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-rose-600 rounded-full animate-ping" />
                          স্টক শেষ (Stock Out)
                        </span>
                      ) : stockPieces < 15 ? (
                        <span className="bg-amber-50 text-amber-600 border border-amber-100 text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 font-bold">
                          স্টক সীমিত: {stockPieces} পিস
                        </span>
                      ) : (
                        <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 font-bold">
                          স্টক: {stockPieces} পিস
                        </span>
                      )}
                      
                      {/* MBQ Indicator */}
                      <span className="bg-indigo-50/50 text-indigo-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border border-indigo-100/30">
                        MBQ: {(p.cartoonSize || 1) * 2} পিস
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-50 mt-auto">
                    <span className="font-extrabold text-xs text-indigo-700">কার্টুন সিলেক্ট করুন</span>
                    <ProductEntryModal product={p} onAdd={(totalQty) => addItem(p, totalQty)} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Cart Summary */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-[#E9ECEF] shadow-xl sticky top-8 text-left">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h3 className="text-lg font-black text-slate-900">অর্ডার লিস্ট ({cart.length})</h3>
            {cart.length > 0 && (
              <button 
                onClick={() => {
                  setCart([]);
                  setCustomDiscount(0);
                  clearState();
                }}
                className="text-xs font-bold text-rose-500 hover:text-rose-700 font-bold"
              >
                সব মুছুন
              </button>
            )}
          </div>
          
          <div className="space-y-4 max-h-[360px] overflow-y-auto mb-6 pr-2 divide-y divide-slate-100">
            {cart.map((item, idx) => {
              const itemCtnIdx = Math.floor(item.quantity / (item.cartoonSize || 1));
              const itemPcsIdx = item.quantity % (item.cartoonSize || 1);
              return (
                <div key={item.productId} className={`pt-3 flex flex-col justify-between group ${idx === 0 ? 'pt-0' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h5 className="font-extrabold text-sm text-slate-800 line-clamp-2 pr-6">{item.name}</h5>
                      <p className="text-xs text-slate-500 font-semibold mt-1">
                        {itemCtnIdx} CTN {itemPcsIdx} PCS 
                        <span className="ml-1.5 font-bold text-blue-600">= মোট {item.quantity} পিস</span>
                      </p>
                    </div>
                    <button onClick={() => removeItem(item.productId)} className="p-1 text-slate-350 hover:text-red-500 transition-colors ml-2 cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Price Edit Box of SalesDiary SFA */}
                  <div className="flex items-center justify-between mt-2.5 bg-slate-50/50 p-1.5 rounded-lg border border-slate-50/70">
                    <div className="flex items-center gap-1 animate-in fade-in">
                      <span className="text-[10px] font-extrabold text-slate-400">দর (পিস):</span>
                      <input 
                        type="number" 
                        value={item.price}
                        onChange={(e) => updateItemPrice(item.productId, Number(e.target.value))}
                        className="w-14 p-0.5 border text-center rounded text-xs font-extrabold text-indigo-600 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        title="বিশেষ রেট সংশোধন"
                      />
                    </div>
                    <span className="text-xs font-black text-slate-800">
                      ৳{(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
            {cart.length === 0 && (
              <p className="text-center py-14 text-slate-400 italic text-xs font-semibold">কোনো পণ্য কার্টে যোগ করা হয়নি! বাম পাশের গ্রিড থেকে অ্যাড করুন।</p>
            )}
          </div>

          {/* SFA Dynamic Billing & Discounts calculations */}
          {(() => {
            const rawSubtotal = cart.reduce((sum, item) => sum + (item.quantity * item.price), 0);
            const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
            const rawFinalOrderValue = Math.max(0, rawSubtotal - customDiscount);
            return (
              <div className="border-t pt-4 space-y-2.5 border-dashed">
                <div className="flex justify-between text-xs text-slate-505 font-bold">
                  <span>মোট পিস সংখ্যা:</span>
                  <span>{totalItemsCount} পিস</span>
                </div>
                <div className="flex justify-between text-xs text-slate-505 font-bold">
                  <span>সাব-টোটাল মূল্য:</span>
                  <span>৳{rawSubtotal.toLocaleString()}</span>
                </div>
                
                {/* Custom discount setting */}
                <div className="bg-amber-50/30 p-2.5 rounded-xl border border-amber-100/40 relative">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-extrabold text-amber-800 flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5" /> ক্যাম্পেইন ডিসকাউন্ট (৳):
                    </span>
                    <input 
                      type="number"
                      value={customDiscount || ""}
                      onChange={(e) => setCustomDiscount(Math.max(0, Number(e.target.value)))}
                      placeholder="0"
                      className="w-20 p-1 border border-amber-200 bg-white rounded-lg text-right text-xs font-black text-amber-800 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                  {customDiscount > 0 && (
                    <p className="text-[10px] text-amber-600 font-bold mt-1 text-right">
                      মোট অফার ছাড়: -৳{customDiscount.toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="flex justify-between font-black text-lg text-slate-900 border-t pt-3 mt-1">
                  <span>গ্র্যান্ড টোটাল:</span>
                  <span className="text-indigo-600 font-extrabold">৳{rawFinalOrderValue.toLocaleString()}</span>
                </div>
              </div>
            );
          })()}

          <button 
            disabled={cart.length === 0 || isSubmitting}
            onClick={() => setShowSummaryModal(true)}
            className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer font-black text-sm disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed shadow-md transition-all disabled:shadow-none"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> অর্ডার সেভ হচ্ছে...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> অর্ডার কনফার্ম করুন
              </>
            )}
          </button>
        </div>
      </div>

      {showSummaryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white p-6 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <h3 className="font-black text-xl mb-4 text-slate-900 border-b pb-2">অর্ডার সারাংশ (Preview)</h3>
            <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto pr-2">
              {cart.map((item) => (
                <div key={item.productId} className="flex justify-between items-center text-sm">
                  <span className="font-bold">{item.name}</span>
                  <span className="text-slate-600">{item.quantity} x {item.price} = ৳{item.quantity * item.price}</span>
                </div>
              ))}
              <div className="border-t pt-2 font-black text-base flex justify-between">
                <span>মোট:</span>
                <span>৳{cart.reduce((sum, item) => sum + (item.quantity * item.price), 0).toLocaleString()}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowSummaryModal(false)} className="flex-1 py-3 border rounded-xl font-bold text-sm bg-slate-100 hover:bg-slate-200">বাতিল</button>
              <button 
                onClick={() => {
                  setShowSummaryModal(false);
                  handleSubmit();
                }}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700"
              >
                নিশ্চিত করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Customer Add Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white p-6 rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="font-extrabold text-lg text-slate-900">নতুন গ্রাহক তৈরি (Quick Add)</h3>
              <button 
                type="button" 
                onClick={() => setShowAddCustomerModal(false)}
                className="text-red-500 hover:text-red-750 text-sm font-black cursor-pointer"
              >
                বন্ধ
              </button>
            </div>
            <form onSubmit={handleQuickAddCustomer} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">গ্রাহকের নাম (Customer Name) *</label>
                <input 
                  type="text" 
                  value={newCustName}
                  onChange={e => setNewCustName(e.target.value)}
                  placeholder="যেমন: মোঃ আনিসুর রহমান"
                  className="w-full p-3 border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">দোকানের নাম (Shop Name)</label>
                <input 
                  type="text" 
                  value={newCustShopName}
                  onChange={e => setNewCustShopName(e.target.value)}
                  placeholder="যেমন: আনিস স্টোর"
                  className="w-full p-3 border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">মোবাইল নম্বর (Phone)</label>
                <input 
                  type="text" 
                  value={newCustPhone}
                  onChange={e => setNewCustPhone(e.target.value)}
                  placeholder="যেমন: 01712345678"
                  className="w-full p-3 border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ঠিকানা (Address)</label>
                <input 
                  type="text" 
                  value={newCustAddress}
                  onChange={e => setNewCustAddress(e.target.value)}
                  placeholder="যেমন: সাভার বাজার, ঢাকা"
                  className="w-full p-3 border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">কাস্টমার গ্রুপ / রুট (Group ID)</label>
                <input 
                  type="text" 
                  value={newCustGroup}
                  onChange={e => setNewCustGroup(e.target.value)}
                  placeholder="যেমন: সাভার রুট"
                  className="w-full p-3 border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  list="group-presets"
                />
                <datalist id="group-presets">
                  {uniqueGroups.map((g: string) => (
                    <option key={g} value={g}></option>
                  ))}
                </datalist>
              </div>

              <div className="flex gap-3 pt-3 border-t">
                <button 
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="flex-1 py-3 border border-slate-200 text-slate-705 rounded-xl font-bold hover:bg-slate-50 text-sm cursor-pointer"
                >
                  বাতিল
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm cursor-pointer shadow-md transition-all"
                >
                  সংরখন করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductEntryModal({ product, onAdd }: { product: any, onAdd: (qty: number) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [ctn, setCtn] = useState("");
  const [pcs, setPcs] = useState("");

  const handleAdd = () => {
    const ctnVal = parseInt(ctn || "0");
    const pcsVal = parseInt(pcs || "0");
    const total = (ctnVal * (product.cartoonSize || 1)) + pcsVal;
    
    if (total > 0) {
      onAdd(total);
      setCtn("");
      setPcs("");
      setIsOpen(false);
    } else {
        toast.error("অনুগ্রহ করে সঠিক সংখ্যা দিন!");
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
      >
        <Plus className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in duration-200">
            <h3 className="text-lg font-bold mb-4 text-center border-b pb-2">{product.name}</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-[#ADB5BD] mb-1 uppercase">কার্টুন (CTN)</label>
                <input 
                  autoFocus
                  type="number" 
                  value={ctn}
                  onChange={e => setCtn(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && document.getElementById(`pcs-${product.id}`)?.focus()}
                  placeholder="0"
                  className="w-full p-4 border rounded-2xl text-center text-xl font-bold bg-[#F8F9FA]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#ADB5BD] mb-1 uppercase">পিস (PCS)</label>
                <input 
                  id={`pcs-${product.id}`}
                  type="number" 
                  value={pcs}
                  onChange={e => setPcs(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  placeholder="0"
                  className="w-full p-4 border rounded-2xl text-center text-xl font-bold bg-[#F8F9FA]"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setIsOpen(false)}
                className="flex-1 py-4 border rounded-2xl font-bold text-[#6C757D]"
              >
                বাতিল
              </button>
              <button 
                onClick={handleAdd}
                className="flex-1 py-4 btn-primary rounded-2xl font-bold"
              >
                যোগ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
