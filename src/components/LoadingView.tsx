import React, { useState, useMemo } from "react";
import { recordStockMovement } from "../lib/inventoryEngine";
import { MovementType } from "../lib/stockMovement";
import { Search, Plus, Trash2, FileText, UserCheck, X, Truck, Printer, Package, ChevronRight } from "lucide-react";
import { formatCurrency, cartoonToPieces, piecesToCartoon } from "../lib/utils";
import toast from "react-hot-toast";

interface LoadingViewProps {
  products: any[];
  routes: any[];
  staff: any[];
  summaries: any[];
  orders: any[];
  customers: any[];
  addSummary: (item: any) => Promise<any>;
  updateSummary: (id: string, item: any) => Promise<void>;
  updateOrder: (id: string, item: any) => Promise<void>;
  updateProduct: (id: string, item: any) => Promise<void>;
}

export default function LoadingView({ 
  products, 
  routes, 
  staff, 
  summaries, 
  orders, 
  customers,
  addSummary, 
  updateSummary, 
  updateOrder,
  updateProduct
}: LoadingViewProps) {
  const [selectedRoute, setSelectedRoute] = useState("");
  const [selectedDSR, setSelectedDSR] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [cart, setCart] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'readySale'>('orders');
  const [search, setSearch] = useState("");
  // Selected order IDs for consolidation
  const [selectedOrderIds, setSelectedOrderIds] = useState<{ [key: string]: boolean }>({});
  const [confirmPrintSummary, setConfirmPrintSummary] = useState<any | null>(null);

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const totalValue = cart.reduce((acc, item) => acc + (item.totalPieces * item.price), 0);
  const activeSummaries = summaries.filter(s => s.status === 'open');

  // Filter pending orders on the selected route
  const pendingRouteOrders = useMemo(() => {
    if (!selectedRoute) return [];
    return orders.filter(o => o.routeId === selectedRoute && o.status === 'pending');
  }, [orders, selectedRoute]);

  const addItem = (product: any, ctns: number, pcs: number) => {
    const totalPieces = cartoonToPieces(ctns, pcs, product.cartoonSize || 1);
    if (totalPieces <= 0) {
      toast.error("সঠিক পরিমাণ লিখুন");
      return;
    }
    const existing = cart.find(i => i.productId === product.id);
    
    if (existing) {
      setCart(cart.map(i => i.productId === product.id ? { 
        ...i, 
        totalPieces: i.totalPieces + totalPieces 
      } : i));
    } else {
      setCart([...cart, { 
        productId: product.id, 
        name: product.name, 
        price: product.price, 
        cartoonSize: product.cartoonSize || 1,
        totalPieces 
      }]);
    }
    toast.success(`${product.name} লোড তালিকায় যুক্ত হয়েছে`);
  };

  const handleRouteChange = (routeId: string) => {
    setSelectedRoute(routeId);
    // Fetch pending orders of this route
    const pendingOrders = orders.filter(o => o.routeId === routeId && o.status === 'pending');
    
    // Automatically check all of them
    const initialSelected: { [key: string]: boolean } = {};
    pendingOrders.forEach(o => {
      initialSelected[o.id] = true;
    });
    setSelectedOrderIds(initialSelected);

    // Automatically load
    if (pendingOrders.length > 0) {
      consolidateOrders(pendingOrders, initialSelected);
    } else {
      setCart([]);
    }
  };

  const consolidateOrders = (orderList: any[], selectedMap: { [key: string]: boolean }) => {
    const activeSelectedOrders = orderList.filter(o => selectedMap[o.id]);
    const consolidatedItems: { [key: string]: any } = {};

    activeSelectedOrders.forEach(order => {
      order.items.forEach((item: any) => {
        const prod = products.find(p => p.id === item.productId);
        const name = prod?.name || item.name;
        const price = prod?.price || item.price || 0;
        const cartoonSize = prod?.cartoonSize || item.cartoonSize || 1;

        if (!consolidatedItems[item.productId]) {
          consolidatedItems[item.productId] = {
            productId: item.productId,
            name: name,
            price: price,
            cartoonSize: cartoonSize,
            totalPieces: item.quantity
          };
        } else {
          consolidatedItems[item.productId].totalPieces += item.quantity;
        }
      });
    });

    setCart(Object.values(consolidatedItems));
  };

  const handleToggleOrder = (orderId: string, isChecked: boolean) => {
    const updatedSelected = { ...selectedOrderIds, [orderId]: isChecked };
    setSelectedOrderIds(updatedSelected);
    consolidateOrders(pendingRouteOrders, updatedSelected);
  };

  const handleSelectAllRouteOrders = (shouldSelectAll: boolean) => {
    const updatedSelected: { [key: string]: boolean } = {};
    pendingRouteOrders.forEach(o => {
      updatedSelected[o.id] = shouldSelectAll;
    });
    setSelectedOrderIds(updatedSelected);
    consolidateOrders(pendingRouteOrders, updatedSelected);
  };

  const handleCreate = async () => {
    if (!selectedRoute || !selectedDSR || cart.length === 0) {
      toast.error("রোড, ডিএসআর এবং আইটেম নির্বাচন করুন");
      return;
    }
    
    const summaryData = {
      date,
      routeId: selectedRoute,
      dsrId: selectedDSR,
      status: "open",
      items: cart,
      expenses: [],
      cashReceived: 0,
      credits: [],
      dueFromDSR: 0,
      totalSummaryValue: totalValue
    };

    try {
      await addSummary(summaryData);

      // Deduct inventory
      for (const item of cart) {
        const prodObj = products.find(p => p.id === item.productId);
        if (prodObj && updateProduct) {
          await updateProduct(item.productId, {
            stock: (prodObj.stock || 0) - Number(item.totalPieces)
          });
        }
        await recordStockMovement(item.productId, 'SALES', -item.totalPieces, "LOADING_SHEET_" + Date.now());
      }

      // Update imported selected orders status to processed
      const activeSelectedOrders = pendingRouteOrders.filter(o => selectedOrderIds[o.id]);
      for (const order of activeSelectedOrders) {
        await updateOrder(order.id, { status: 'processed' });
      }

      setCart([]);
      setSelectedRoute("");
      setSelectedDSR("");
      setSelectedOrderIds({});
      setShowAdd(false);
      toast.success("সকালের লোডশিট কনফার্ম ও পেন্ডিং অর্ডারগুলো প্রোসেসড করা হয়েছে");
    } catch (err) {
      console.error(err);
      toast.error("লোডশিট সংরক্ষণ করতে সমস্যা হয়েছে");
    }
  };

  const printSummary = (summary: any) => {
    const route = routes.find(r => r.id === summary.routeId)?.name || "Unknown Route";
    const dsr = staff.find(s => s.id === summary.dsrId)?.name || "Unknown DSR";
    
    const printContent = `
      <html>
        <head>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { 
              width: 72mm; 
              font-family: 'Courier New', monospace; 
              font-size: 11px; 
              padding: 4mm;
              margin: 0;
              line-height: 1.2;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .line { border-bottom: 1px dashed #000; margin: 2mm 0; }
            table { width: 100%; border-collapse: collapse; }
            th { text-align: left; border-bottom: 1px solid #000; }
          </style>
        </head>
        <body>
          <div class="center bold">SAMIRA TRADERS</div>
          <div class="center">Morning Loadsheet</div>
          <div class="line"></div>
          <div>Date: ${summary.date}</div>
          <div>Route: ${route}</div>
          <div>DSR: ${dsr}</div>
          <div class="line"></div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Ctn</th>
                <th>Pcs</th>
                <th>Rate</th>
                <th>Val</th>
              </tr>
            </thead>
            <tbody>
              ${summary.items.map((item: any) => `
                <tr>
                  <td>${item.name}</td>
                  <td>${Math.floor(item.totalPieces / (item.cartoonSize || 1))}</td>
                  <td>${item.totalPieces % (item.cartoonSize || 1)}</td>
                  <td>${item.price}</td>
                  <td>${item.totalPieces * item.price}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="line"></div>
          <div class="center bold">Total Value: ${formatCurrency(summary.totalSummaryValue)}</div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `;
    
    const win = window.open("", "_blank", "width=400,height=600");
    win?.document.write(printContent);
    win?.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-[#E9ECEF]">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" /> সকালের সামারি (Morning Load Sheet)
          </h2>
          <p className="text-[#6C757D]">রোড ভিত্তিক মাল লোড ও পেন্ডিং এসআর অর্ডার এর হিসাব</p>
        </div>
        <button onClick={() => {
          setSelectedRoute("");
          setSelectedDSR("");
          setCart([]);
          setSelectedOrderIds({});
          setShowAdd(true);
        }} className="btn-primary flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all animate-in fade-in duration-200">
          <Plus className="w-5 h-5" /> নতুন লোড শিট
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeSummaries.map(s => (
          <div key={s.id} className="data-card border-l-4 border-blue-500 hover:shadow-lg transition-all p-6 bg-white rounded-3xl border border-[#E9ECEF] shadow-sm">
             <div className="flex justify-between items-start mb-4">
                <div>
                   <h3 className="font-bold text-lg text-gray-800">{routes.find(r => r.id === s.routeId)?.name || s.routeId}</h3>
                   <p className="text-xs text-[#ADB5BD]">{s.date}</p>
                </div>
                <div className="flex gap-1">
                   <button onClick={() => setConfirmPrintSummary(s)} className="p-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 border border-gray-100 transition-all">
                     <Printer className="w-4 h-4" />
                   </button>
                   <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded uppercase">In Delivery</span>
                </div>
             </div>
             <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                   <span className="text-[#6C757D]">ডি এস আর:</span>
                   <span className="font-medium text-gray-700">{staff.find(st => st.id === s.dsrId)?.name || s.dsrId}</span>
                </div>
                <div className="flex justify-between text-sm">
                   <span className="text-[#6C757D]">মোট আইটেম:</span>
                   <span className="font-medium text-gray-700">{s.items.reduce((sum: number, i: any) => sum + (i.totalPieces > 0 ? 1 : 0), 0)} টি</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2 text-gray-900">
                   <span>ভ্যালু:</span>
                   <span>{formatCurrency(s.totalSummaryValue)}</span>
                </div>
             </div>
             <button onClick={() => setConfirmPrintSummary(s)} className="w-full py-2.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-semibold hover:bg-blue-100 transition-all flex items-center justify-center gap-2">
                বিস্তারিত প্রিন্ট করুন <Printer className="w-4 h-4" />
             </button>
          </div>
        ))}
        {activeSummaries.length === 0 && (
          <div className="col-span-full py-20 bg-white border border-dashed rounded-3xl text-center text-gray-400">
             বর্তমানে কোনো একটিভ সকালের লোডশিট নেই
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-6xl w-full h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-250">
             <div className="p-6 border-b flex justify-between items-center bg-[#F8F9FA]">
                <h3 className="text-xl font-bold flex items-center gap-2 text-blue-600">
                  <Truck className="w-6 h-6" /> সকালের মাল লোড শিট (Multiple Order Summary)
                </h3>
                <button onClick={() => setShowAdd(false)} className="p-2 hover:bg-gray-200 rounded-full transition-all">
                  <X className="w-6 h-6 text-gray-500" />
                </button>
             </div>
             
             {/* Tabs - Fixed as part of the header area */}
             <div className="flex bg-[#f8f9fa] border-b border-gray-200 px-6 shrink-0">
                 <button onClick={() => setActiveTab('orders')} className={`px-3 md:px-4 py-3 font-bold text-xs md:text-sm ${activeTab === 'orders' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>সামারি এন্ট্রি</button>
                 <button onClick={() => setActiveTab('readySale')} className={`px-3 md:px-4 py-3 font-bold text-xs md:text-sm ${activeTab === 'readySale' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>রেডি সেল</button>
              </div>
              
              <div className="flex-1 flex overflow-hidden lg:flex-row flex-col min-h-0">
                 <div className={`${activeTab === 'readySale' ? 'w-full' : 'lg:w-2/3'} p-4 md:p-6 overflow-y-auto border-r space-y-4 md:space-y-6 flex flex-col`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2 shrink-0">
                       <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
                         <label className="text-xs font-black text-gray-950 uppercase block mb-2 flex items-center gap-1.5">
                            <Truck className="w-4 h-4 text-blue-600" /> রোড / রুট নির্বাচন
                         </label>
                         <select 
                            value={selectedRoute} 
                            onChange={e => handleRouteChange(e.target.value)} 
                            className="w-full p-3.5 border-2 border-gray-200 rounded-xl bg-gray-50 shadow-inner font-bold focus:border-blue-500 focus:ring-0 outline-none text-sm text-gray-900 transition-all"
                         >
                            <option value="">রুট সিলেক্ট করুন</option>
                            {routes.map(r => <option key={r.id} value={r.id}>{r.name} ({r.area || 'No Area'})</option>)}
                         </select>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
                         <label className="text-xs font-black text-gray-950 uppercase block mb-2 flex items-center gap-1.5">
                            <UserCheck className="w-4 h-4 text-green-600" /> ডি এস আর (DSR) নির্বাচন
                         </label>
                         <select 
                            value={selectedDSR} 
                            onChange={e => setSelectedDSR(e.target.value)} 
                            className="w-full p-3.5 border-2 border-gray-200 rounded-xl bg-gray-50 shadow-inner font-bold focus:border-green-500 focus:ring-0 outline-none text-sm text-gray-900 transition-all"
                         >
                            <option value="">ডিএসআর সিলেক্ট করুন</option>
                            {staff.filter(s => s.role === 'DSR').map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                         </select>
                      </div>
                   </div>


                   <div className="mt-4">
                     {activeTab === 'orders' ? (
                       <div className="space-y-4">
                         {/* Pending SR orders for the selected Route */}
                         {!selectedRoute ? (
                           <div className="text-center py-10 text-gray-400 text-sm italic">প্রথমে রোড নির্বাচন করুন</div>
                         ) : (
                           <div className="bg-orange-50/50 border border-orange-100 p-5 rounded-2xl space-y-3">
                             <div className="flex justify-between items-center">
                                <h4 className="font-bold text-sm text-orange-700 flex items-center gap-1.5">
                                   <Package className="w-5 h-5 text-orange-600" /> এসআর কাস্টমার অর্ডার সমূহ ({pendingRouteOrders.length} টি পেন্ডিং)
                                </h4>
                                {pendingRouteOrders.length > 0 && (
                                  <div className="flex gap-3 text-xs">
                                     <button type="button" onClick={() => handleSelectAllRouteOrders(true)} className="font-bold text-blue-600 hover:underline">সব সিলেক্ট</button>
                                     <span className="text-[#DEE2E6]">|</span>
                                     <button type="button" onClick={() => handleSelectAllRouteOrders(false)} className="font-bold text-gray-500 hover:underline">সব আনসিলেক্ট</button>
                                  </div>
                                )}
                             </div>
                             {pendingRouteOrders.length > 0 ? (
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                                  {pendingRouteOrders.map(order => {
                                     const srName = staff.find(s => s.id === order.srId)?.name || 'Unknown SR';
                                     const custName = customers.find(c => c.id === order.customerId)?.name || 'সাধারণ কাস্টমার';
                                     const itemCount = order.items.reduce((sum: number, it: any) => sum + (it.quantity || 0), 0);
                                     const isChecked = !!selectedOrderIds[order.id];
                                     return (
                                        <label key={order.id} className={`flex items-start gap-3 bg-white p-3 rounded-xl border transition-all cursor-pointer shadow-sm text-xs ${isChecked ? 'border-orange-300 ring-2 ring-orange-100' : 'border-gray-100 hover:border-gray-200'}`}>
                                           <input type="checkbox" checked={isChecked} onChange={e => handleToggleOrder(order.id, e.target.checked)} className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500 mt-0.5" />
                                           <div className="flex-1">
                                              <div className="flex justify-between font-bold text-gray-800">
                                                 <span>{custName}</span>
                                                 <span className="text-[10px] text-gray-400">{order.date}</span>
                                              </div>
                                              <div className="text-[10px] text-orange-700 flex justify-between mt-1 font-medium">
                                                 <span>এসআর: {srName}</span>
                                                 <span className="font-bold bg-orange-100 text-orange-850 px-1.5 py-0.5 rounded">মোট: {itemCount} পিস</span>
                                              </div>
                                           </div>
                                        </label>
                                     );
                                  })}
                               </div>
                             ) : (
                               <div className="text-center py-6 bg-white border border-dashed rounded-2xl text-gray-400 text-xs font-medium">
                                  এই রোডে বর্তমানে কোনো পেন্ডিং এসআর অর্ডার নেই
                               </div>
                             )}
                           </div>
                         )}
                       </div>
                     ) : (
                       <div className="space-y-4">
                         <div className="relative">
                            <Search className="absolute left-3 top-3.5 w-4 h-4 text-[#ADB5BD]" />
                            <input 
                              placeholder="পণ্য খুঁজুন এবং ম্যানুয়ালি যোগ করুন..." 
                              value={search}
                              onChange={e => setSearch(e.target.value)}
                              className="w-full pl-10 pr-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm shadow-sm bg-white" 
                            />
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-1">
                            {filteredProducts.map(p => (
                               <div key={p.id} className="p-4 border rounded-2xl hover:border-blue-300 transition-all flex flex-col justify-between bg-white shadow-sm group">
                                  <div className="mb-2">
                                     <h4 className="font-bold text-sm text-gray-800">{p.name}</h4>
                                     <p className="text-[10px] text-[#ADB5BD] font-medium">১ কার্টুন = {p.cartoonSize || 1} পিস | দর: {formatCurrency(p.price)}</p>
                                  </div>
                                  <ProductEntryForm onAdd={(ctn, pcs) => addItem(p, ctn, pcs)} />
                               </div>
                            ))}
                         </div>
                       </div>
                     )}
                   </div>
                </div>

                <div className={`${activeTab === 'readySale' ? 'hidden' : 'lg:w-1/3'} bg-[#F8F9FA] p-6 flex flex-col shadow-inner`}>
                   <h4 className="font-bold border-b pb-4 mb-4 mt-20 flex items-center gap-2 text-gray-800">
                     <FileText className="w-5 h-5 text-blue-600" /> সকালের মোট মালের লোড সামারি
                   </h4>
                   <div className="flex-1 overflow-y-auto space-y-3 max-h-[45vh]">
                      {cart.map((item, idx) => (
                         <div key={idx} className="bg-white p-3.5 rounded-xl shadow-sm border border-[#E9ECEF] flex justify-between items-center group">
                            <div className="flex-1">
                               <div className="font-bold text-sm text-gray-800 truncate">{item.name}</div>
                               <div className="text-[11px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded inline-block mt-1">
                                  {piecesToCartoon(item.totalPieces, item.cartoonSize)} (মোট {item.totalPieces} পিস)
                               </div>
                            </div>
                            <div className="text-right flex flex-col items-end justify-between self-stretch">
                               <button 
                                  onClick={() => setCart(cart.filter((_, i) => i !== idx))}
                                  className="text-gray-300 hover:text-red-500 rounded p-1 transition-all"
                               >
                                  <Trash2 className="w-4 h-4" />
                               </button>
                               <div className="font-bold text-xs text-gray-800 mt-2">{formatCurrency(item.totalPieces * item.price)}</div>
                            </div>
                         </div>
                      ))}
                      {cart.length === 0 && (
                        <div className="text-center py-20 text-[#ADB5BD] italic text-xs">
                          কোনো রোড সিলেক্ট করে এসআর অর্ডার লোড করুন অথবা ম্যানুয়াল পণ্য যোগ করুন
                        </div>
                      )}
                   </div>

                   <div className="pt-6 mt-6 border-t border-gray-200 space-y-4">
                      <div className="flex justify-between items-center text-xl font-bold">
                         <span className="text-gray-700">মোট মূল্য:</span>
                         <span className="text-blue-600">{formatCurrency(totalValue)}</span>
                      </div>
                      <button 
                         onClick={handleCreate} 
                         disabled={!selectedRoute || !selectedDSR || cart.length === 0}
                         className="w-full bg-blue-600 disabled:bg-gray-300 disabled:text-gray-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl hover:shadow-2xl flex items-center justify-center gap-2"
                      >
                         <UserCheck className="w-5 h-5" /> লোড শিট কনফার্ম করুন
                      </button>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Print Confirmation Modal */}
      {confirmPrintSummary && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl overflow-hidden shadow-2xl p-6 border border-gray-150 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-amber-500 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                <Printer className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-[#212529] text-lg">লোডশিট প্রিন্ট নিশ্চিত করুন</h3>
                <p className="text-xs text-[#6C757D]">দুর্ঘটনাজনিত প্রিন্টার ট্রিগার এড়াতে নিশ্চিত হোন</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 mb-6 space-y-2.5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-[#495057] font-medium">তারিখ:</span>
                <span className="font-bold text-gray-900">{confirmPrintSummary.date}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#495057] font-medium">রুট:</span>
                <span className="font-bold text-gray-900">
                  {routes.find((r) => r.id === confirmPrintSummary.routeId)?.name || confirmPrintSummary.routeId}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#495057] font-medium">ডিএসআর:</span>
                <span className="font-bold text-gray-900">
                  {staff.find((st) => st.id === confirmPrintSummary.dsrId)?.name || confirmPrintSummary.dsrId}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#495057] font-medium">মোট আইটেম:</span>
                <span className="font-bold text-gray-900">
                  {confirmPrintSummary.items.reduce((sum: number, i: any) => sum + (i.totalPieces > 0 ? 1 : 0), 0)} টি
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-150 pt-2.5 text-base font-extrabold mt-1">
                <span className="text-gray-900">মোট মূল্য:</span>
                <span className="text-blue-600">{formatCurrency(confirmPrintSummary.totalSummaryValue)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmPrintSummary(null)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl text-xs transition-all cursor-pointer"
              >
                বাতিল করুন
              </button>
              <button
                onClick={() => {
                  printSummary(confirmPrintSummary);
                  setConfirmPrintSummary(null);
                }}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> হ্যাঁ, প্রিন্ট করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductEntryForm({ onAdd }: { onAdd: (ctn: number, pcs: number) => void }) {
  const [ctn, setCtn] = useState("");
  const [pcs, setPcs] = useState("");
  return (
    <div className="flex gap-2 mt-2">
       <input 
          type="number" 
          placeholder="CTN" 
          className="w-full p-2 border rounded-xl text-xs font-bold text-center bg-gray-50 outline-none focus:bg-white" 
          value={ctn} 
          onChange={e => setCtn(e.target.value)} 
       />
       <input 
          type="number" 
          placeholder="PCS" 
          className="w-full p-2 border rounded-xl text-xs font-bold text-center bg-gray-50 outline-none focus:bg-white" 
          value={pcs} 
          onChange={e => setPcs(e.target.value)} 
       />
       <button 
          onClick={() => { 
             onAdd(Number(ctn || 0), Number(pcs || 0)); 
             setCtn(""); 
             setPcs(""); 
          }} 
          className="bg-blue-600 text-white px-3 py-2 rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center"
       >
          <Plus className="w-4 h-4 font-bold" />
       </button>
    </div>
  );
}
