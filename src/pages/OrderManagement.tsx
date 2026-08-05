import React, { useState, useMemo } from "react";
import { 
  Search, 
  PackageCheck, 
  AlertCircle, 
  RefreshCw, 
  ShoppingBag, 
  Plus, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Truck, 
  DollarSign, 
  Printer, 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  CreditCard,
  FileText
} from "lucide-react";
import toast from "react-hot-toast";
import { calculateCartonPieces, calculateLineTotal } from "../utils/calculations";
import { exportToPDF } from "../services/reportService";

const ORDER_STATUSES = [
  { id: "pending", label: "মুলতুবি", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock },
  { id: "processing", label: "প্রক্রিয়াকরণাধীন", color: "bg-blue-100 text-blue-800 border-blue-200", icon: RefreshCw },
  { id: "shipped", label: "পাঠানো হয়েছে", color: "bg-purple-100 text-purple-800 border-purple-200", icon: Truck },
  { id: "delivered", label: "বিতরণ করা হয়েছে", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle2 },
  { id: "cancelled", label: "বাতিল", color: "bg-rose-100 text-rose-800 border-rose-200", icon: XCircle }
];

const PAYMENT_STATUSES = [
  { id: "paid", label: "পরিশোধিত", color: "bg-emerald-100 text-emerald-800" },
  { id: "partial", label: "আংশিক পরিশোধ", color: "bg-blue-100 text-blue-800" },
  { id: "unpaid", label: "সম্পূর্ণ বকেয়া", color: "bg-rose-100 text-rose-800" }
];

interface OrderItem {
  productId: string;
  name: string;
  cartons: number;
  pieces: number;
  cartoonSize: number;
  rate: number;
  discount: number;
  total: number;
}

interface OrderManagementProps {
  orders?: any[];
  addOrder?: (data: any) => Promise<any>;
  updateOrder?: (id: string, data: any) => Promise<void>;
  deleteOrder?: (id: string) => Promise<void>;
  products?: any[];
  customers?: any[];
}

export default function OrderManagementPage({
  orders = [],
  addOrder,
  updateOrder,
  deleteOrder,
  products = [],
  customers = []
}: OrderManagementProps) {
  // Filters & State
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPayment, setFilterPayment] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState<string | null>(null);

  // New Order Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customCustomerName, setCustomCustomerName] = useState("");
  const [customCustomerPhone, setCustomCustomerPhone] = useState("");
  const [customCustomerAddress, setCustomCustomerAddress] = useState("");

  // Order Items
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [inputCartons, setInputCartons] = useState<number>(1);
  const [inputPieces, setInputPieces] = useState<number>(0);
  const [inputRate, setInputRate] = useState<number>(0);
  const [inputDiscount, setInputDiscount] = useState<number>(0);

  // Financials
  const [extraDiscount, setExtraDiscount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [orderNotes, setOrderNotes] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split("T")[0]);

  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeProducts = Array.isArray(products) ? products : [];
  const safeCustomers = Array.isArray(customers) ? customers : [];

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return safeOrders.filter((o) => {
      if (!o) return false;

      const matchesStatus = filterStatus === "all" || o.status === filterStatus;

      let paymentStatus = "unpaid";
      const total = Number(o.total || o.totalAmount) || 0;
      const paid = Number(o.paidAmount) || 0;
      if (paid >= total && total > 0) paymentStatus = "paid";
      else if (paid > 0) paymentStatus = "partial";

      const matchesPayment = filterPayment === "all" || paymentStatus === filterPayment;

      const searchLower = searchQuery.toLowerCase().trim();
      const customerName = String(o.customerName || "").toLowerCase();
      const customerPhone = String(o.customerPhone || "").toLowerCase();
      const orderId = String(o.id || "").toLowerCase();

      const matchesSearch =
        !searchLower ||
        customerName.includes(searchLower) ||
        customerPhone.includes(searchLower) ||
        orderId.includes(searchLower);

      return matchesStatus && matchesPayment && matchesSearch;
    });
  }, [safeOrders, filterStatus, filterPayment, searchQuery]);

  // Aggregate KPI Calculations
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let pendingCount = 0;
    let processingCount = 0;
    let deliveredCount = 0;
    let cancelledCount = 0;
    let totalDue = 0;

    safeOrders.forEach((o) => {
      const total = Number(o.total || o.totalAmount) || 0;
      const paid = Number(o.paidAmount) || 0;
      const due = Math.max(0, total - paid);

      if (o.status !== "cancelled") {
        totalRevenue += total;
        totalDue += due;
      }

      if (o.status === "pending") pendingCount++;
      else if (o.status === "processing" || o.status === "shipped") processingCount++;
      else if (o.status === "delivered") deliveredCount++;
      else if (o.status === "cancelled") cancelledCount++;
    });

    return {
      totalOrders: safeOrders.length,
      totalRevenue,
      pendingCount,
      processingCount,
      deliveredCount,
      cancelledCount,
      totalDue
    };
  }, [safeOrders]);

  // Handle Product Selection change in Form
  const handleProductSelect = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = safeProducts.find((p) => p.id === prodId);
    if (prod) {
      setInputRate(Number(prod.salesPrice || prod.price || prod.rate) || 0);
    }
  };

  // Add Item to New Order Cart
  const handleAddOrderItem = () => {
    if (!selectedProductId) {
      toast.error("অনুগ্রহ করে একটি পণ্য নির্বাচন করুন");
      return;
    }
    const prod = safeProducts.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const cartoonSize = Math.max(1, Number(prod.cartoonSize || prod.packSize || 1));
    const itemTotal = calculateLineTotal(inputCartons, inputPieces, cartoonSize, inputRate, inputDiscount);

    const newItem: OrderItem = {
      productId: prod.id,
      name: prod.name,
      cartons: Number(inputCartons) || 0,
      pieces: Number(inputPieces) || 0,
      cartoonSize,
      rate: Number(inputRate) || 0,
      discount: Number(inputDiscount) || 0,
      total: itemTotal
    };

    setOrderItems((prev) => [...prev, newItem]);

    // Reset Item Form
    setSelectedProductId("");
    setInputCartons(1);
    setInputPieces(0);
    setInputRate(0);
    setInputDiscount(0);
    toast.success(`${prod.name} অর্ডারে যোগ করা হয়েছে`);
  };

  // Remove Item from Cart
  const handleRemoveOrderItem = (index: number) => {
    setOrderItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculate Order Totals
  const orderSubTotal = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + item.total, 0);
  }, [orderItems]);

  const orderNetTotal = Math.max(0, orderSubTotal - (Number(extraDiscount) || 0));
  const orderDueAmount = Math.max(0, orderNetTotal - (Number(paidAmount) || 0));

  // Submit New Order
  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orderItems.length === 0) {
      toast.error("অর্ডারে কমপক্ষে একটি পণ্য যোগ করুন");
      return;
    }

    let custName = customCustomerName;
    let custPhone = customCustomerPhone;
    let custAddress = customCustomerAddress;

    if (selectedCustomerId) {
      const existingCust = safeCustomers.find((c) => c.id === selectedCustomerId);
      if (existingCust) {
        custName = existingCust.name;
        custPhone = existingCust.phone || existingCust.contactDetails?.phone || "";
        custAddress = existingCust.address || "";
      }
    }

    if (!custName.trim()) {
      toast.error("গ্রাহকের নাম বা গ্রাহক নির্বাচন করুন");
      return;
    }

    const newOrderPayload = {
      customerId: selectedCustomerId || "guest",
      customerName: custName,
      customerPhone: custPhone,
      customerAddress: custAddress,
      items: orderItems,
      subTotal: orderSubTotal,
      extraDiscount: Number(extraDiscount) || 0,
      total: orderNetTotal,
      paidAmount: Number(paidAmount) || 0,
      dueAmount: orderDueAmount,
      paymentMethod,
      status: "pending", // Default new order status
      deliveryDate,
      notes: orderNotes,
      date: new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString()
    };

    try {
      if (addOrder) {
        await addOrder(newOrderPayload);
      }
      toast.success("নতুন অর্ডার সফলভাবে তৈরি করা হয়েছে!");

      // Reset Modal Form
      setIsCreateModalOpen(false);
      setOrderItems([]);
      setSelectedCustomerId("");
      setCustomCustomerName("");
      setCustomCustomerPhone("");
      setCustomCustomerAddress("");
      setExtraDiscount(0);
      setPaidAmount(0);
      setOrderNotes("");
    } catch (err: any) {
      toast.error("অর্ডার তৈরি করতে ব্যর্থ হয়েছে: " + (err?.message || "অজানা ত্রুটি"));
    }
  };

  // Quick Status Update
  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    if (!updateOrder) return;
    try {
      await updateOrder(orderId, { status: newStatus });
      toast.success("অর্ডারের স্ট্যাটাস সফলভাবে আপডেট হয়েছে");
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev: any) => ({ ...prev, status: newStatus }));
      }
    } catch (err: any) {
      toast.error("স্ট্যাটাস আপডেট করতে সমস্যা: " + (err?.message || "অজানা ত্রুটি"));
    }
  };

  // Cancel Order
  const handleCancelOrder = async (orderId: string) => {
    if (!updateOrder) return;
    try {
      await updateOrder(orderId, { status: "cancelled", notes: "ব্যবহারকারী কর্তৃক অর্ডার বাতিল করা হয়েছে" });
      toast.success("অর্ডারটি সফলভাবে বাতিল করা হয়েছে");
      setIsCancelConfirmOpen(null);
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev: any) => ({ ...prev, status: "cancelled" }));
      }
    } catch (err: any) {
      toast.error("অর্ডার বাতিল করতে সমস্যা: " + (err?.message || "অজানা ত্রুটি"));
    }
  };

  // Print Order Receipt
  const handlePrintReceipt = (order: any) => {
    const headers = ["পণ্য", "কার্টন / পিস", "দর (৳)", "ছাড় (৳)", "মোট (৳)"];
    const rows = (order.items || []).map((item: any) => [
      item.name,
      `${item.cartons || 0} কার্টন, ${item.pieces || 0} পিস`,
      `৳${item.rate}`,
      `৳${item.discount || 0}`,
      `৳${item.total}`
    ]);

    exportToPDF(`অর্ডার ইনভয়েস - #${order.id.slice(0, 8)}`, headers, rows);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-950 flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-indigo-600" />
            অর্ডার ম্যানেজমেন্ট সিস্টেম (Order Management)
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-0.5">
            গ্রাহকের অর্ডার তৈরি, ট্র্যাকিং, পেমেন্ট ও ডেলিভারি স্ট্যাটাস ব্যবস্থাপনা
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs transition shadow-md hover:shadow-indigo-200"
        >
          <Plus className="w-4 h-4" /> নতুন অর্ডার তৈরি করুন
        </button>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">মোট অর্ডার</span>
            <ShoppingBag className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-gray-900">{stats.totalOrders}টি</div>
          <div className="text-[10px] text-gray-500 font-medium mt-0.5">৳{stats.totalRevenue.toLocaleString()} মোট বিক্রয়</div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">মুলতুবি (Pending)</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-600">{stats.pendingCount}টি</div>
          <div className="text-[10px] text-gray-500 font-medium mt-0.5">প্রসেসিং এর অপেক্ষায়</div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">প্রক্রিয়াকরণ / পাঠ্য</span>
            <Truck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-black text-blue-600">{stats.processingCount}টি</div>
          <div className="text-[10px] text-gray-500 font-medium mt-0.5">ডেলিভারি প্রক্রিয়াধীন</div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">বিতরণ সম্পন্ন</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-600">{stats.deliveredCount}টি</div>
          <div className="text-[10px] text-gray-500 font-medium mt-0.5">সফলভাবে ডেলিভার্ড</div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">বাতিলকৃত (Cancelled)</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-black text-rose-600">{stats.cancelledCount}টি</div>
          <div className="text-[10px] text-gray-500 font-medium mt-0.5">বাতিল করা অর্ডার</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="গ্রাহকের নাম, ফোন বা আইডি দিয়ে খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Order Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none text-gray-700 bg-gray-50"
          >
            <option value="all">সব ডেলিভারি স্ট্যাটাস</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          {/* Payment Status Filter */}
          <select
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none text-gray-700 bg-gray-50"
          >
            <option value="all">সব পেমেন্ট স্ট্যাটাস</option>
            {PAYMENT_STATUSES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Orders Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center mx-auto">
              <PackageCheck className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-gray-800">কোন অর্ডার পাওয়া যায়নি</h3>
            <p className="text-xs text-gray-400">আপনার সার্চ বা ফিল্টারের সাথে মিলিয়ে কোনো তথ্য পাওয়া যায়নি।</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="p-4 font-bold text-gray-700">আইডি ও তারিখ</th>
                  <th className="p-4 font-bold text-gray-700">গ্রাহক তথ্য</th>
                  <th className="p-4 font-bold text-gray-700">আইটেমসমূহ</th>
                  <th className="p-4 font-bold text-gray-700 text-right">মোট (৳)</th>
                  <th className="p-4 font-bold text-gray-700 text-center">পেমেন্ট</th>
                  <th className="p-4 font-bold text-gray-700 text-center">ডেলিভারি স্ট্যাটাস</th>
                  <th className="p-4 font-bold text-gray-700 text-right">কার্যক্রম</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((o) => {
                  const statusObj = ORDER_STATUSES.find((s) => s.id === o.status) || ORDER_STATUSES[0];
                  const total = Number(o.total || o.totalAmount) || 0;
                  const paid = Number(o.paidAmount) || 0;
                  const due = Math.max(0, total - paid);

                  let payStatusObj = PAYMENT_STATUSES[2]; // unpaid
                  if (paid >= total && total > 0) payStatusObj = PAYMENT_STATUSES[0]; // paid
                  else if (paid > 0) payStatusObj = PAYMENT_STATUSES[1]; // partial

                  return (
                    <tr key={o.id} className="hover:bg-gray-50/50 transition">
                      <td className="p-4">
                        <span className="font-bold text-indigo-600 block">#{o.id.slice(0, 8)}</span>
                        <span className="text-[10px] text-gray-400 font-medium">{o.date || o.createdAt?.split("T")[0] || "N/A"}</span>
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-gray-900">{o.customerName || "অজানা গ্রাহক"}</div>
                        <div className="text-[10px] text-gray-500">{o.customerPhone || "ফোন অনুপস্থিত"}</div>
                      </td>

                      <td className="p-4">
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                        >
                          {Array.isArray(o.items) ? o.items.length : 0}টি আইটেম
                        </button>
                      </td>

                      <td className="p-4 text-right">
                        <div className="font-black text-gray-900">৳{total.toLocaleString()}</div>
                        {due > 0 && <div className="text-[10px] font-bold text-rose-500">বাকি: ৳{due.toLocaleString()}</div>}
                      </td>

                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${payStatusObj.color}`}>
                          {payStatusObj.label}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <select
                          value={o.status || "pending"}
                          onChange={(e) => handleStatusUpdate(o.id, e.target.value)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border cursor-pointer focus:outline-none ${statusObj.color}`}
                        >
                          {ORDER_STATUSES.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedOrder(o)}
                            title="বিস্তারিত দেখুন"
                            className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handlePrintReceipt(o)}
                            title="প্রিন্ট করুন"
                            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {o.status !== "cancelled" && (
                            <button
                              onClick={() => setIsCancelConfirmOpen(o.id)}
                              title="অর্ডার বাতিল করুন"
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE NEW ORDER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-3xl border border-gray-100 shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                নতুন অর্ডার তৈরি করুন (Create New Order)
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateOrderSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Section 1: Customer Info */}
              <div className="space-y-3 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                  <User className="w-4 h-4" /> গ্রাহকের তথ্য
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">নিবন্ধিত কাস্টমার নির্বাচন করুন</label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- নতুন কাস্টমার / ক্যাজুয়াল --</option>
                      {safeCustomers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.phone || c.contactDetails?.phone || "ফোন নেই"})
                        </option>
                      ))}
                    </select>
                  </div>

                  {!selectedCustomerId && (
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">কাস্টমার নাম *</label>
                      <input
                        type="text"
                        placeholder="কাস্টমারের নাম লিখুন"
                        value={customCustomerName}
                        onChange={(e) => setCustomCustomerName(e.target.value)}
                        className="w-full p-2.5 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required={!selectedCustomerId}
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">ফোন নম্বর</label>
                    <input
                      type="text"
                      placeholder="যেমন: 01700000000"
                      value={customCustomerPhone}
                      onChange={(e) => setCustomCustomerPhone(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">ডেলিভারি ঠিকানা</label>
                    <input
                      type="text"
                      placeholder="বাজার / রোড নম্বর / দোকান ঠিকানা"
                      value={customCustomerAddress}
                      onChange={(e) => setCustomCustomerAddress(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Product Item Picker */}
              <div className="space-y-3 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4" /> পণ্য যোগ করুন
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 items-end">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-gray-600 mb-1">পণ্য নাম</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => handleProductSelect(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- পণ্য নির্বাচন করুন --</option>
                      {safeProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (৳{p.salesPrice || p.price || 0})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-1">কার্টন</label>
                    <input
                      type="number"
                      min="0"
                      value={inputCartons}
                      onChange={(e) => setInputCartons(Number(e.target.value))}
                      className="w-full p-2 border border-gray-200 rounded-xl text-xs font-medium text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-1">পিস</label>
                    <input
                      type="number"
                      min="0"
                      value={inputPieces}
                      onChange={(e) => setInputPieces(Number(e.target.value))}
                      className="w-full p-2 border border-gray-200 rounded-xl text-xs font-medium text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-1">দর (৳)</label>
                    <input
                      type="number"
                      min="0"
                      value={inputRate}
                      onChange={(e) => setInputRate(Number(e.target.value))}
                      className="w-full p-2 border border-gray-200 rounded-xl text-xs font-medium text-center"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2">
                  <div className="w-36">
                    <label className="block text-[10px] font-bold text-gray-600 mb-1">আইটেম ছাড় (৳)</label>
                    <input
                      type="number"
                      min="0"
                      value={inputDiscount}
                      onChange={(e) => setInputDiscount(Number(e.target.value))}
                      className="w-full p-2 border border-gray-200 rounded-xl text-xs font-medium text-center"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddOrderItem}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition"
                  >
                    + আইটেম যোগ করুন
                  </button>
                </div>

                {/* Cart Items Table */}
                {orderItems.length > 0 && (
                  <div className="mt-3 bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-2.5 font-bold text-gray-700">পণ্য</th>
                          <th className="p-2.5 font-bold text-gray-700 text-center">পরিমাণ</th>
                          <th className="p-2.5 font-bold text-gray-700 text-right">দর (৳)</th>
                          <th className="p-2.5 font-bold text-gray-700 text-right">ছাড় (৳)</th>
                          <th className="p-2.5 font-bold text-gray-700 text-right">মোট (৳)</th>
                          <th className="p-2.5 text-center">মুছুন</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {orderItems.map((item, idx) => (
                          <tr key={idx}>
                            <td className="p-2.5 font-bold text-gray-900">{item.name}</td>
                            <td className="p-2.5 text-center font-medium">
                              {item.cartons} কার্টন {item.pieces > 0 ? `, ${item.pieces} পিস` : ""}
                            </td>
                            <td className="p-2.5 text-right font-semibold">৳{item.rate}</td>
                            <td className="p-2.5 text-right font-semibold text-rose-600">৳{item.discount}</td>
                            <td className="p-2.5 text-right font-black text-indigo-600">৳{item.total}</td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveOrderItem(idx)}
                                className="text-rose-500 hover:text-rose-700"
                              >
                                <Trash2 className="w-4 h-4 mx-auto" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Section 3: Financials & Payment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4" /> পেমেন্টের তথ্য
                  </h3>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">পরিশোধের মাধ্যম</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-xl text-xs font-medium"
                    >
                      <option value="cash">নগদ (Cash)</option>
                      <option value="bkash">বিকাশ / নগদ (Mobile Wallet)</option>
                      <option value="bank">ব্যাংক ট্রান্সফার</option>
                      <option value="due">সম্পূর্ণ বাকি (Due Sale)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">জমা টাকার পরিমাণ (৳)</label>
                    <input
                      type="number"
                      min="0"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(Number(e.target.value))}
                      className="w-full p-2 border border-gray-200 rounded-xl text-xs font-black text-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">অর্ডার নোটস / বিশেষ নির্দেশ</label>
                    <input
                      type="text"
                      placeholder="ডেলিভারি নোট বা মন্তব্য"
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-xl text-xs font-medium"
                    />
                  </div>
                </div>

                {/* Amount Summary Box */}
                <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-2 flex flex-col justify-between">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between font-semibold text-gray-600">
                      <span>সাব-টোটাল:</span>
                      <span>৳{orderSubTotal.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-600">অতিরিক্ত ছাড় (৳):</span>
                      <input
                        type="number"
                        min="0"
                        value={extraDiscount}
                        onChange={(e) => setExtraDiscount(Number(e.target.value))}
                        className="w-24 p-1 border border-gray-200 rounded text-right text-xs font-bold text-rose-600"
                      />
                    </div>

                    <div className="border-t border-gray-100 pt-2 flex justify-between font-black text-sm text-gray-900">
                      <span>সর্বমোট প্রদেয়:</span>
                      <span className="text-indigo-600">৳{orderNetTotal.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between font-bold text-xs text-emerald-600">
                      <span>পরিশোধিত:</span>
                      <span>৳{paidAmount.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between font-bold text-xs text-rose-600">
                      <span>অবশিষ্ট বকেয়া:</span>
                      <span>৳{orderDueAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-md mt-4"
                  >
                    নিশ্চিত করুন ও অর্ডার সাবমিট করুন
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW ORDER DETAILS MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl border border-gray-100 shadow-2xl overflow-hidden my-8 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-lg font-black text-gray-900">
                  অর্ডার ইনভয়েস: #{selectedOrder.id.slice(0, 8)}
                </h2>
                <p className="text-xs text-gray-500">তারিখ: {selectedOrder.date || "N/A"}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrintReceipt(selectedOrder)}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold rounded-xl text-xs transition flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" /> প্রিন্ট
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Customer Details */}
            <div className="bg-gray-50 p-4 rounded-2xl space-y-1 text-xs">
              <div className="font-bold text-gray-900 text-sm">{selectedOrder.customerName || "অজানা কাস্টমার"}</div>
              <div className="text-gray-600">ফোন: {selectedOrder.customerPhone || "N/A"}</div>
              <div className="text-gray-600">ঠিকানা: {selectedOrder.customerAddress || "N/A"}</div>
            </div>

            {/* Item Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2.5 font-bold text-gray-700">পণ্য</th>
                    <th className="p-2.5 font-bold text-gray-700 text-center">পরিমাণ</th>
                    <th className="p-2.5 font-bold text-gray-700 text-right">দর (৳)</th>
                    <th className="p-2.5 font-bold text-gray-700 text-right">মোট (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Array.isArray(selectedOrder.items) &&
                    selectedOrder.items.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-bold text-gray-900">{item.name}</td>
                        <td className="p-2.5 text-center">
                          {item.cartons || 0} কার্টন, {item.pieces || 0} পিস
                        </td>
                        <td className="p-2.5 text-right font-medium">৳{item.rate}</td>
                        <td className="p-2.5 text-right font-black text-indigo-600">৳{item.total}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between text-xs font-bold">
              <div>
                <span className="text-gray-500 block">পরিশোধের মাধ্যম</span>
                <span className="text-gray-900 uppercase">{selectedOrder.paymentMethod || "নগদ"}</span>
              </div>
              <div className="text-right space-y-1">
                <div>মোট: ৳{(Number(selectedOrder.total) || 0).toLocaleString()}</div>
                <div className="text-emerald-600">জমা: ৳{(Number(selectedOrder.paidAmount) || 0).toLocaleString()}</div>
                <div className="text-rose-600">বাকি: ৳{(Number(selectedOrder.dueAmount) || 0).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL CONFIRMATION MODAL */}
      {isCancelConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full p-6 rounded-3xl border border-gray-100 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900">অর্ডার বাতিল নিশ্চিতকরণ</h3>
              <p className="text-xs text-gray-500 mt-1">আপনি কি নিশ্চিত যে আপনি এই অর্ডারটি বাতিল করতে চান?</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsCancelConfirmOpen(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition"
              >
                না, ফিরে যান
              </button>
              <button
                onClick={() => handleCancelOrder(isCancelConfirmOpen)}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
              >
                হ্যাঁ, বাতিল করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
