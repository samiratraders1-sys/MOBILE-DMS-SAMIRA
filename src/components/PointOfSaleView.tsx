import React, { useState, useMemo } from "react";
import { Plus, ShoppingBasket, Search, Trash2, Printer, CheckCircle, RotateCcw, AlertTriangle, UserCheck, Loader2 } from "lucide-react";
import { recordStockMovement } from "../lib/inventoryEngine";
import { MovementType } from "../lib/stockMovement";
import { formatCurrency } from "../lib/utils";
import { useFormAutoSave } from "../hooks/useFormAutoSave";
import { useConfirm } from "../context/ConfirmContext";
import toast from "react-hot-toast";
import ThermalPrintTemplate from "./ThermalPrintTemplate";
import VoiceInputButton from "./VoiceInputButton";

interface POSProps {
  products: any[];
  customers: any[];
  routes: any[];
  staff: any[];
  user: any;
  add: (item: any) => Promise<any>;
  role?: string;
  updateProduct?: (id: string, data: any) => Promise<void>;
  updateCustomer?: (id: string, data: any) => Promise<void>;
  addPayment?: (item: any) => Promise<void>;
  accounts?: any[];
}

interface CartItem {
  productId: string;
  name: string;
  cartoonSize: number;
  cartons: number;
  pieces: number;
  freeQty: number;
  discount: number;
  rate: number;
  stock: number;
}

// Helper for highlighting text
const HighlightText = ({ text, term }: { text: string | undefined | null, term: string }) => {
  if (!term || !text) return <span>{text || ""}</span>;
  const parts = text.split(new RegExp(`(${term})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === term.toLowerCase() ? 
        <mark key={i} className="bg-yellow-200 text-black px-0.5 rounded">{part}</mark> : 
        part
      )}
    </>
  );
};

export default function PointOfSaleView({
  products,
  customers,
  routes,
  staff,
  user,
  add,
  role,
  updateProduct,
  updateCustomer,
  addPayment,
  accounts = []
}: POSProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const { confirmDelete } = useConfirm();
  const [productSearch, setProductSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [customCashName, setCustomCashName] = useState("");
  const [selectedRoute, setSelectedRoute] = useState("");
  const [receivedAmount, setReceivedAmount] = useState("");

  // Auto-save form values to IndexedDB
  const formStateToSave = React.useMemo(() => ({
    cart,
    selectedCustomer,
    customCashName,
    selectedRoute,
    receivedAmount
  }), [cart, selectedCustomer, customCashName, selectedRoute, receivedAmount]);

  const { saveStatus, clearState } = useFormAutoSave(
    "pos-form",
    formStateToSave,
    (saved) => {
      if (saved.cart !== undefined) setCart(saved.cart);
      if (saved.selectedCustomer !== undefined) setSelectedCustomer(saved.selectedCustomer);
      if (saved.customCashName !== undefined) setCustomCashName(saved.customCashName);
      if (saved.selectedRoute !== undefined) setSelectedRoute(saved.selectedRoute);
      if (saved.receivedAmount !== undefined) setReceivedAmount(saved.receivedAmount);
    }
  );

  const handleCustomerVoiceSelect = (spokenText: string) => {
    const query = spokenText.toLowerCase().trim();
    const matched = customers.find(c => 
      c.name?.toLowerCase().includes(query) || 
      c.shopName?.toLowerCase().includes(query) ||
      c.phone?.includes(query)
    );
    if (matched) {
      setSelectedCustomer(matched.id);
      toast.success(`কাস্টমার নির্বাচন করা হয়েছে: ${matched.name}`, { id: "customer-voice-select" });
    } else {
      setCustomCashName(spokenText);
      setSelectedCustomer(""); // select cash customer
      toast.success(`নগদ কাস্টমার নাম সেট করা হয়েছে: "${spokenText}"`, { id: "customer-voice-select" });
    }
  };
  
  // Checkout & receipt states
  const [activeReceipt, setActiveReceipt] = useState<any | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptFormat, setReceiptFormat] = useState<"standard" | "thermal_58mm">("thermal_58mm");
  const submittingRef = React.useRef(false);

  // Cart templates
  const [isReadySalesOpen, setIsReadySalesOpen] = useState(false);
  const readySaleTemplates = [
    { name: "মিনি প্যাকেজ", items: [{ productId: "p1", cartons: 1, pieces: 0 }] }, // Need real product IDs
    { name: "বড় প্যাকেজ", items: [{ productId: "p1", cartons: 5, pieces: 0 }] }
  ];

  const loadTemplate = (template: any) => {
    // Logic to load template items into cart
    // For now simplistic load
    setCart(template.items);
    setIsReadySalesOpen(false);
  };


  // Automatically find appropriate Account ID matching logged-in user
  const defaultAccountId = useMemo(() => {
    if (!accounts || accounts.length === 0) return "";
    const isAdminForAcc = user?.email === 'samiratraders1@gmail.com' || user?.email === 'samiratraders.barguna@gmail.com' || role === 'admin';
    if (isAdminForAcc) {
      const adminAcc = accounts.find(a => a.name.includes("অ্যাডমিন") || a.name.toLowerCase().includes("admin"));
      if (adminAcc) return adminAcc.id;
    } else {
      const mgrAcc = accounts.find(a => a.name.includes("ম্যানেজার") || a.name.toLowerCase().includes("manager"));
      if (mgrAcc) return mgrAcc.id;
    }
    // Fallback search for cash accounts
    const cashAcc = accounts.find(a => a.type === "Cash") || accounts[0];
    return cashAcc ? cashAcc.id : "";
  }, [accounts, user, role]);

  // Filter products based on search term (name, category, brand)
  const filteredProducts = useMemo(() => {
    const term = productSearch.toLowerCase();
    if (!term) return products;
    return products.filter(p => 
      p.name.toLowerCase().includes(term) || 
      (p.category && p.category.toLowerCase().includes(term)) ||
      (p.brand && p.brand.toLowerCase().includes(term))
    );
  }, [products, productSearch]);

  // Product entry dialog states
  const [entryProduct, setEntryProduct] = useState<any | null>(null);
  const [entryCartons, setEntryCartons] = useState<string>("");
  const [entryPieces, setEntryPieces] = useState<string>("");
  const [entryFreeQty, setEntryFreeQty] = useState<string>("");
  const [entryDiscount, setEntryDiscount] = useState<string>("");
  const [entryRate, setEntryRate] = useState<string>("");

  const openProductEntryModal = (product: any) => {
    const existing = cart.find(i => i.productId === product.id);
    setEntryProduct(product);
    if (existing) {
      setEntryCartons(existing.cartons ? String(existing.cartons) : "");
      setEntryPieces(existing.pieces ? String(existing.pieces) : "");
      setEntryFreeQty(existing.freeQty ? String(existing.freeQty) : "");
      setEntryDiscount(existing.discount ? String(existing.discount) : "");
      setEntryRate(String(existing.rate || product.price));
    } else {
      setEntryCartons("");
      setEntryPieces("");
      setEntryFreeQty("");
      setEntryDiscount("");
      setEntryRate(String(product.price));
    }
  };

  const handleSaveEntryModal = () => {
    if (!entryProduct) return;
    const cartonsNum = Math.max(0, Number(entryCartons || 0));
    const piecesNum = Math.max(0, Number(entryPieces || 0));
    const freeQtyNum = Math.max(0, Number(entryFreeQty || 0));
    const discountNum = Math.max(0, Number(entryDiscount || 0));
    const rateNum = Math.max(0, Number(entryRate || entryProduct.price));

    const existing = cart.find(i => i.productId === entryProduct.id);
    if (existing) {
      setCart(cart.map(item => 
        item.productId === entryProduct.id ? {
          ...item,
          cartons: cartonsNum,
          pieces: piecesNum,
          freeQty: freeQtyNum,
          discount: discountNum,
          rate: rateNum
        } : item
      ));
    } else {
      setCart([
        ...cart,
        {
          productId: entryProduct.id,
          name: entryProduct.name,
          cartoonSize: Number(entryProduct.cartoonSize || 12),
          cartons: cartonsNum,
          pieces: piecesNum,
          freeQty: freeQtyNum,
          discount: discountNum,
          rate: rateNum,
          stock: Number(entryProduct.stock || 0)
        }
      ]);
    }
    setEntryProduct(null);
  };

  const updateCartItem = (productId: string, field: keyof CartItem, value: number) => {
    setCart(
      cart.map(item => {
        if (item.productId === productId) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer("");
    setCustomCashName("");
    setSelectedRoute("");
    setReceivedAmount("");
    clearState();
  };

  // Compute calculated values per line and in total
  const totals = useMemo(() => {
    let grossTotal = 0;
    let totalDiscount = 0;
    let totalProfit = 0;
    
    const itemsWithTotals = cart.map(item => {
      const linePieces = (item.cartons * item.cartoonSize) + item.pieces;
      const lineTotal = (linePieces * item.rate) - item.discount;
      
      const product = products.find(p => p.id === item.productId);
      const costPrice = product?.costPrice || product?.cost || 0;
      const itemCost = linePieces * costPrice;
      const itemProfit = lineTotal - itemCost;
      
      grossTotal += (linePieces * item.rate);
      totalDiscount += item.discount;
      totalProfit += itemProfit;
      
      return {
        ...item,
        linePieces,
        lineTotal,
        itemProfit
      };
    });

    const netTotal = grossTotal - totalDiscount;

    return {
      items: itemsWithTotals,
      grossTotal,
      totalDiscount,
      netTotal,
      totalProfit
    };
  }, [cart, products]);

  const isCashCustomer = selectedCustomer === "";
  const paymentToCollect = isCashCustomer ? totals.netTotal : Number(receivedAmount || 0);
  const dueAmount = isCashCustomer ? 0 : Math.max(0, totals.netTotal - paymentToCollect);

  const selectedCustomerObj = useMemo(() => {
    return customers.find(c => c.id === selectedCustomer);
  }, [customers, selectedCustomer]);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (isSubmitting || submittingRef.current) return;

    const executeCheckout = async () => {
      const customerName = selectedCustomerObj ? selectedCustomerObj.name : (customCashName || "নগদ কাস্টমার");
      const checkoutDate = new Date().toISOString();

      const saleRecord = {
        date: checkoutDate,
        customerId: selectedCustomer || "cash",
        customerName,
        routeId: selectedRoute || "N/A",
        dsrId: "N/A",
        items: totals.items.map(item => ({
          productId: item.productId,
          name: item.name,
          cartons: item.cartons,
          pieces: item.pieces,
          freeQty: item.freeQty,
          discount: item.discount,
          rate: item.rate,
          total: item.lineTotal,
          qty: item.linePieces // compatible with regular items list
        })),
        total: totals.netTotal,
        paidAmount: paymentToCollect,
        dueAmount: dueAmount,
        status: "paid",
        approved: true,
        createdBy: user?.email || "Staff"
      };

      submittingRef.current = true;
      setIsSubmitting(true);
      try {
        // 1. Submit sale invoice
        await add(saleRecord);

        // 2. Deduct product inventory stock (demanded + free quantities)
        if (updateProduct) {
          for (const item of totals.items) {
            const demandedAndFree = (Number(item.linePieces) || 0) + (Number(item.freeQty) || 0);
            const pObj = products.find(p => p.id === item.productId);
            if (pObj) {
              await updateProduct(item.productId, {
                stock: (pObj.stock || 0) - demandedAndFree
              });
            }
            await recordStockMovement(item.productId, 'SALES', -demandedAndFree, "POS_SALE_" + Date.now());
          }
        }

        // 3. Log received payments
        if (addPayment && paymentToCollect > 0) {
          await addPayment({
            date: checkoutDate.split("T")[0],
            type: "in",
            amount: paymentToCollect,
            category: "POS Sales",
            description: `POS বিক্রয় সংগৃহীত পেমেন্ট (কাস্টমার: ${customerName})`,
            entityId: selectedCustomer || "cash",
            method: "Cash",
            status: "approved",
            approved: true,
            accountId: defaultAccountId,
            createdBy: user?.email || "Staff"
          });
        }

        // 4. Update customer ledger outstanding balance (Dues) if credit customer
        if (selectedCustomer && updateCustomer && selectedCustomerObj) {
          await updateCustomer(selectedCustomer, {
            balance: (selectedCustomerObj.balance || 0) + dueAmount
          });
        }

        // 5. Open invoice printer modal
        setActiveReceipt({
          ...saleRecord,
          invoiceId: `POS-${Math.floor(100000 + Math.random() * 900000)}`,
          items: totals.items
        });
        setIsCheckoutModalOpen(true);
        
        // Clear current cart session
        setCart([]);
        setCustomCashName("");
        setReceivedAmount("");
        await clearState();
      } catch (err: any) {
        toast.error("বিক্রয় সম্পন্ন করার সময় সমস্যা ঘটেছে: " + err.message);
      } finally {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    };

    // Check stock warning
    const stockIssues = totals.items.filter(item => {
      const demanded = item.linePieces + item.freeQty;
      return demanded > item.stock;
    });

    if (stockIssues.length > 0) {
      confirmDelete({
        title: "স্টক সতর্কতা নিশ্চিত করুন",
        recordName: "কম স্টক থাকা পণ্যের বিক্রয়",
        warning: `সতর্কতা: কিছু পণ্যের স্টক চাহিদার তুলনায় কম আছে। আপনি কি তাও বিক্রয় সম্পন্ন করতে চান?\n\n` +
          stockIssues.map(i => `- ${i.name} (স্টক: ${i.stock} পিস, চাহিদা: ${i.linePieces + i.freeQty} পিস)`).join("\n"),
        onConfirm: executeCheckout
      });
    } else {
      await executeCheckout();
    }
  };

  const handlePrintReceiptFormatAware = () => {
    if (!activeReceipt) return;

    let receiptContent = "";

    if (receiptFormat === "thermal_58mm") {
      receiptContent = `
        <html>
          <head>
            <title>রশিদ #${activeReceipt.invoiceId}</title>
            <style>
              @media print {
                @page { size: 58mm auto; margin: 0; }
                body { width: 48mm; margin: 0; padding: 2px; }
              }
              body {
                font-family: 'Courier New', Courier, monospace, 'Helvetica Neue', Helvetica;
                color: #000;
                margin: 0;
                padding: 5px;
                font-size: 10px;
                line-height: 1.3;
                width: 48mm;
              }
              .center { text-align: center; }
              .bold { font-weight: bold; }
              .right { text-align: right; }
              .divider { border-top: 1px dashed #000; margin: 5px 0; }
              .double-divider { border-top: 1px double #000; margin: 5px 0; }
              table { width: 100%; border-collapse: collapse; font-size: 9px; }
              td { padding: 2px 0; vertical-align: top; }
              .row { display: flex; justify-content: space-between; }
            </style>
          </head>
          <body>
            <div class="center">
              <h3 style="margin: 0; font-size: 13px; font-weight: 900;">সমীরা ট্রেডার্স</h3>
              <p style="margin: 2px 0 0 0; font-size: 8px;">চকবাজার, ঢাকা | ডিস্ট্রিবিউশন সিস্টেম</p>
              <p style="margin: 2px 0 0 0; font-size: 9px; font-weight: bold;">ক্যাশ মেমো / রশিদ</p>
            </div>
            
            <div class="divider"></div>
            
            <div style="font-size: 8px; line-height: 1.3;">
              <div class="row"><span>মেমো আইডি:</span><span class="bold">${activeReceipt.invoiceId}</span></div>
              <div class="row"><span>তারিখ:</span><span>${new Date(activeReceipt.date).toLocaleString('bn-BD', { hour12: true })}</span></div>
              <div class="row"><span>কাস্টমার:</span><span class="bold">${activeReceipt.customerName}</span></div>
              <div class="row"><span>রুট/রোড:</span><span>${activeReceipt.routeId !== "N/A" ? (routes.find(r => r.id === activeReceipt.routeId)?.name || 'N/A') : 'N/A'}</span></div>
              <div class="row"><span>বিক্রেতা:</span><span>${activeReceipt.createdBy}</span></div>
            </div>
            
            <div class="divider"></div>
            
            <table>
              <thead>
                <tr style="border-bottom: 1px dashed #000; font-weight: bold;">
                  <th style="text-align: left; width: 55%; padding-bottom: 3px;">পণ্য/দর</th>
                  <th style="text-align: center; width: 20%; padding-bottom: 3px;">পরিমাণ</th>
                  <th style="text-align: right; width: 25%; padding-bottom: 3px;">মূল্য</th>
                </tr>
              </thead>
              <tbody>
                ${activeReceipt.items.map((it: any) => {
                  const parts = [];
                  if (it.cartons) parts.push(it.cartons + "C");
                  if (it.pieces) parts.push(it.pieces + "P");
                  const qtyStr = parts.join('/') || '0P';
                  const rateVal = Number(it.rate || 0);
                  const totalVal = Number(it.total || it.lineTotal || 0);
                  const freeText = it.freeQty ? `(+${it.freeQty} Free)` : '';
                  const discText = it.discount ? `(-${it.discount} ৳)` : '';
                  return `
                    <tr style="border-bottom: 1px dotted #ccc;">
                      <td style="padding: 3px 0;">
                        <span class="bold">${it.name}</span><br/>
                        <span style="font-size: 7.5px; color: #444;">@ ${rateVal.toFixed(2)} ৳ ${freeText} ${discText}</span>
                      </td>
                      <td style="text-align: center; font-weight: bold; padding: 3px 0;">${qtyStr}</td>
                      <td style="text-align: right; font-weight: bold; padding: 3px 0;">${totalVal.toFixed(2)} ৳</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
            
            <div class="divider"></div>
            
            <div style="font-size: 9px; margin-top: 5px;">
              <div class="row">
                <span>মোট মূল্য:</span>
                <span>${(Number(activeReceipt.total || 0) + activeReceipt.items.reduce((a: number, c: any) => a + (Number(c.discount) || 0), 0)).toFixed(2)} ৳</span>
              </div>
              ${activeReceipt.items.reduce((a: number, c: any) => a + (Number(c.discount) || 0), 0) > 0 ? `
                <div class="row" style="color: #c2410c;">
                  <span>মোট ডিস্কাউন্ট:</span>
                  <span>-${activeReceipt.items.reduce((a: number, c: any) => a + (Number(c.discount) || 0), 0).toFixed(2)} ৳</span>
                </div>
              ` : ''}
              <div class="row" style="font-weight: bold; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 3px 0; margin: 3px 0; font-size: 10px;">
                <span>চূড়ান্ত বিল:</span>
                <span>${Number(activeReceipt.total || 0).toFixed(2)} ৳</span>
              </div>
              <div class="row" style="font-weight: bold;">
                <span>সংগৃহীত পেমেন্ট:</span>
                <span>${Number(activeReceipt.paidAmount || 0).toFixed(2)} ৳</span>
              </div>
              ${Number(activeReceipt.dueAmount || 0) > 0 ? `
                <div class="row" style="font-weight: bold; color: #b91c1c;">
                  <span>বকেয়া বাকী (Due):</span>
                  <span>${Number(activeReceipt.dueAmount || 0).toFixed(2)} ৳</span>
                </div>
              ` : ''}
            </div>
            
            <div class="double-divider"></div>
            
            <div class="center" style="font-size: 8px; color: #444; margin-top: 6px;">
              <p style="font-weight: bold; margin: 0;">ক্রয় করার জন্য ধন্যবাদ!</p>
              <p style="margin: 2px 0 0 0;">সমীরা ট্রেডার্স ডিস্ট্রিবিউশন সফটওয়্যার</p>
            </div>
            
            <script>
              window.onload = function() { window.print(); }
            </script>
          </body>
        </html>
      `;
    } else {
      receiptContent = `
        <html>
          <head>
            <title>রশিদ #${activeReceipt.invoiceId}</title>
            <style>
              @media print {
                @page { size: 80mm auto; margin: 0; }
                body { width: 72mm; margin: 0; padding: 5px; }
              }
              body { 
                font-family: 'Courier New', Courier, monospace, 'Helvetica Neue', Helvetica; 
                color: #000; 
                margin: 0; 
                padding: 10px; 
                font-size: 11px; 
                line-height: 1.4; 
                width: 72mm;
              }
              .header { text-align: center; margin-bottom: 12px; border-bottom: 1px dashed #000; padding-bottom: 8px; }
              .header h1 { margin: 0 0 4px 0; font-size: 16px; font-weight: bold; text-transform: uppercase; }
              .header p { margin: 0; font-size: 10px; }
              .metadata { margin-bottom: 8px; font-size: 10px; line-height: 1.4; border-bottom: 1px dashed #000; padding-bottom: 6px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 10px; }
              th { border-bottom: 1px dashed #000; padding: 4px 2px; text-align: left; font-weight: bold; }
              td { padding: 5px 2px; border-bottom: 1px dotted #ccc; }
              .text-right { text-align: right; }
              .totals { font-size: 10px; border-top: 1px dashed #000; padding-top: 6px; margin-top: 4px; }
              .totals-row { display: flex; justify-content: space-between; padding: 3px 0; }
              .totals-row.grand { border-top: 1px dashed #000; border-bottom: 1px dashed #000; font-weight: bold; font-size: 12px; padding: 5px 0; margin-top: 2px; }
              .footer { text-align: center; font-size: 9px; margin-top: 15px; border-top: 1px dashed #000; padding-top: 8px; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>সমীরা ট্রেডার্স</h1>
              <p>ডিউ ও পেমেন্ট ক্যাশ মেমো (Thermal POS)</p>
              <p>প্রোপাইটর: সমীরা ট্রেডার্স</p>
            </div>
            
            <div class="metadata">
              <div><strong>মেমো আইডি:</strong> ${activeReceipt.invoiceId}</div>
              <div><strong>তারিখ:</strong> ${new Date(activeReceipt.date).toLocaleString('bn-BD', { hour12: true })}</div>
              <div><strong>কাস্টমার:</strong> ${activeReceipt.customerName}</div>
              <div><strong>রুট/রোড:</strong> ${activeReceipt.routeId !== "N/A" ? (routes.find(r => r.id === activeReceipt.routeId)?.name || 'N/A') : 'N/A'}</div>
              <div><strong>বিক্রেতা/ Staff:</strong> ${activeReceipt.createdBy}</div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>পণ্যের নাম</th>
                  <th class="text-right">পরিমাণ (C/P)</th>
                  <th class="text-right">ফ্রি</th>
                  <th class="text-right">ডিস্কাউন্ট</th>
                  <th class="text-right">মোট</th>
                </tr>
              </thead>
              <tbody>
                ${activeReceipt.items.map((it: any) => {
                  const parts = [];
                  if (it.cartons) parts.push(it.cartons + 'C');
                  if (it.pieces) parts.push(it.pieces + 'P');
                  const qtyStr = parts.join(' / ') || 'None';
                  const rateVal = Number(it.rate || 0);
                  const totalVal = Number(it.total || it.lineTotal || 0);
                  return `
                    <tr>
                      <td>
                        <strong>${it.name}</strong>
                        <div style="font-size: 9px; color: #555;">@ ${rateVal.toFixed(2)} ৳</div>
                      </td>
                      <td class="text-right">${qtyStr}</td>
                      <td class="text-right">${it.freeQty || 0}</td>
                      <td class="text-right">${it.discount ? it.discount + ' ৳' : '০'}</td>
                      <td class="text-right"><strong>${totalVal.toFixed(2)} ৳</strong></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>

            <div class="totals">
              <div class="totals-row">
                <span>মোট মূল্য:</span>
                <span>${(Number(activeReceipt.total || 0) + activeReceipt.items.reduce((a: number, c: any) => a + (Number(c.discount) || 0), 0)).toFixed(2)} ৳</span>
              </div>
              <div class="totals-row">
                <span>মোট ডিস্কাউন্ট:</span>
                <span>-${activeReceipt.items.reduce((a: number, c: any) => a + (Number(c.discount) || 0), 0).toFixed(2)} ৳</span>
              </div>
              <div class="totals-row grand">
                <span>চূড়ান্ত বিল:</span>
                <span>${Number(activeReceipt.total || 0).toFixed(2)} ৳</span>
              </div>
              <div class="totals-row" style="font-weight: bold;">
                <span>সংগৃহীত পেমেন্ট:</span>
                <span>${Number(activeReceipt.paidAmount || 0).toFixed(2)} ৳</span>
              </div>
              <div class="totals-row" style="font-weight: bold; color: ${Number(activeReceipt.dueAmount || 0) > 0 ? '#b91c1c' : '#000'}">
                <span>অবশিষ্ট বাকী (Due):</span>
                <span>${Number(activeReceipt.dueAmount || 0).toFixed(2)} ৳</span>
              </div>
            </div>

            <div class="footer">
              <p>ক্রয় করার জন্য আপনাকে ধন্যবাদ!</p>
              <p>সমীরা ট্রেডার্স ডিস্ট্রিবিউশন সিস্টেম</p>
            </div>
            
            <script>
              window.onload = function() { window.print(); }
            </script>
          </body>
        </html>
      `;
    }

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(receiptContent);
      printWindow.document.close();
    }
  };

  const handlePrintReceipt = () => {
    if (!activeReceipt) return;
    handlePrintReceiptFormatAware();
  };

  return (
    <div id="pos-root-container" className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2 flex-wrap">
            নতুন বিক্রয় (POS)
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
          </h2>
          <p className="text-sm text-gray-500 font-semibold mb-0">একসাথে ফ্রি প্রোডাক্ট ও ডিস্কাউন্ট এন্ট্রি এবং অটোমেটিক লেজার সমন্বয়</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsReadySalesOpen(true)}
            className="flex items-center gap-2 p-3 bg-indigo-600 text-white rounded-xl text-xs font-black border border-indigo-700 hover:bg-indigo-700 transition-all cursor-pointer shadow-sm"
          >
            <ShoppingBasket className="w-4 h-4" /> রেডি সেল (Templates)
          </button>
          
          {cart.length > 0 && (
            <button onClick={clearCart} className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 rounded-xl text-xs font-bold hover:bg-red-50 transition-all cursor-pointer">
              <RotateCcw className="w-4 h-4" /> কার্ট রিসেট
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: Products selector (cols: 4) */}
        <div id="pos-products-list" className="lg:col-span-4 flex flex-col gap-4 bg-white p-4 rounded-2xl border max-h-[85vh] overflow-hidden">
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
            <input
              placeholder="পণ্য খুঁজুন বা সিলেক্ট করুন..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full pl-10 pr-24 border rounded-xl p-2.5 text-sm font-medium focus:ring-2 focus:ring-black outline-none bg-gray-50 focus:bg-white transition-all"
            />
            <div className="absolute right-2 top-1.5 flex items-center z-10 bg-inherit rounded-r-xl">
              <VoiceInputButton 
                onTranscript={(text) => setProductSearch(text)} 
                placeholderName="পণ্য"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1.5 min-h-[300px]">
            {filteredProducts.map(p => (
              <div
                key={p.id}
                onClick={() => openProductEntryModal(p)}
                className="p-3 border rounded-xl flex justify-between items-center cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-all border-gray-100 shadow-sm"
              >
                <div>
                  <div className="font-bold text-gray-900 text-sm">
                    <HighlightText text={p.name} term={productSearch} />
                    {(p.category && p.category.toLowerCase().includes(productSearch.toLowerCase()) && !p.name.toLowerCase().includes(productSearch.toLowerCase())) && (
                      <span className="ml-2 text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold">Category: {p.category}</span>
                    )}
                    {(p.brand && p.brand.toLowerCase().includes(productSearch.toLowerCase()) && !p.name.toLowerCase().includes(productSearch.toLowerCase())) && (
                      <span className="ml-2 text-[10px] bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded font-bold">Brand: {p.brand}</span>
                    )}
                  </div>
                  <div className="text-[11px] font-bold text-gray-500 mt-1 flex gap-2">
                    <span>স্টক: <span className={p.stock <= 5 ? "text-rose-600 font-black" : "text-gray-900 font-black"}>{p.stock} পিস</span></span>
                    <span>|</span>
                    <span>দর: <span className="text-emerald-700 font-black">{formatCurrency(p.price)}</span></span>
                  </div>
                </div>
                <div className="p-1 px-2.5 bg-black text-white text-xs font-black rounded-lg hover:bg-gray-800 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> যোগ করুন
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-6">কোন পণ্য পাওয়া যায়নি</p>
            )}
          </div>
        </div>

        {/* Right column: Cart details and checkouts (cols: 8) */}
        <div id="pos-checkout-card" className="lg:col-span-8 flex flex-col bg-white rounded-2xl p-6 border gap-6 shadow-sm">
          {/* Customer Metadata selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b pb-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400">কাস্টমার নাম / নগদ</label>
                <VoiceInputButton 
                  onTranscript={handleCustomerVoiceSelect} 
                  placeholderName="কাস্টমার"
                  className="scale-90"
                />
              </div>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full p-2.5 border rounded-xl bg-gray-50 text-xs font-bold font-sans cursor-pointer focus:bg-white outline-none focus:ring-2 focus:ring-black"
              >
                <option value="">নগদ কাস্টমার (Cash Customer)</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ""}</option>
                  ))}
              </select>
              {isCashCustomer && (
                <div className="relative mt-2">
                  <input
                    type="text"
                    placeholder="নগদ কাস্টমারের নাম লিখুন (ঐচ্ছিক)"
                    value={customCashName}
                    onChange={(e) => setCustomCashName(e.target.value)}
                    className="w-full p-2 pr-24 border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-black outline-none"
                  />
                  <div className="absolute right-2 top-1 flex items-center z-10 bg-inherit rounded-r-xl scale-90">
                    <VoiceInputButton 
                      onTranscript={(text) => setCustomCashName(text)} 
                      placeholderName="নাম"
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">রোড / রুট</label>
              <select
                value={selectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
                className="w-full p-2.5 border rounded-xl bg-gray-50 text-xs font-semibold cursor-pointer focus:bg-white outline-none focus:ring-2 focus:ring-black"
              >
                <option value="">রোড নির্বাচন করুন</option>
                {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>

          {/* Cart items list with Carton, Piece, Free, Discount, Rate inputs */}
          <div className="space-y-4">
            <h4 className="font-black text-sm flex items-center gap-2 border-b pb-2 text-gray-800">
              <ShoppingBasket className="w-5 h-5 text-gray-700" /> আইটেম তালিকা ({cart.length})
            </h4>

            {cart.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">
                <ShoppingBasket className="w-12 h-12 stroke-[1.25] mx-auto text-gray-300 mb-3" />
                কার্টে কোন পণ্য যোগ করা হয়নি। বামদিকের পণ্য তালিকা থেকে সিলেক্ট করুন।
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 font-bold uppercase">
                    <tr>
                      <th className="p-3 text-left">প্রোডাক্ট</th>
                      <th className="p-3 text-center w-16">কার্টুন</th>
                      <th className="p-3 text-center w-16">পিচ</th>
                      <th className="p-3 text-center w-16">ফ্রি (Pcs)</th>
                      <th className="p-3 text-center w-20">ডিস্কাউন্ট (৳)</th>
                      <th className="p-3 text-center w-24">দর (Pcs)</th>
                      <th className="p-3 text-right w-28">মোট দাম</th>
                      <th className="p-3 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150">
                    {totals.items.map((item, index) => (
                      <tr key={item.productId} className="hover:bg-gray-50/50">
                        <td className="p-3 font-bold text-gray-900">
                          {item.name}
                          <div className="text-[10px] text-gray-400 font-normal mt-0.5">
                            ১ কার্টুন = {item.cartoonSize} পিস | স্টক: {item.stock} পিস
                          </div>
                          {(item.linePieces + item.freeQty) > item.stock && (
                            <span className="text-[9px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded font-black flex items-center gap-0.5 mt-1.5 w-fit">
                              <AlertTriangle className="w-3 h-3" /> স্টক অতিক্রম করেছে!
                            </span>
                          )}
                        </td>
                        
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={item.cartons || ""}
                            onChange={(e) => updateCartItem(item.productId, "cartons", Math.max(0, Number(e.target.value)))}
                            className="w-14 p-1.5 border rounded-lg text-center font-bold font-sans bg-gray-50 hover:bg-white focus:bg-white"
                          />
                        </td>

                        <td className="p-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={item.pieces || ""}
                            onChange={(e) => updateCartItem(item.productId, "pieces", Math.max(0, Number(e.target.value)))}
                            className="w-14 p-1.5 border rounded-lg text-center font-bold font-sans bg-gray-50 hover:bg-white focus:bg-white"
                          />
                        </td>

                        <td className="p-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={item.freeQty || ""}
                            onChange={(e) => updateCartItem(item.productId, "freeQty", Math.max(0, Number(e.target.value)))}
                            className="w-14 p-1.5 border rounded-lg text-center font-bold text-emerald-600 font-sans bg-emerald-50 focus:bg-white"
                          />
                        </td>

                        <td className="p-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={item.discount || ""}
                            onChange={(e) => updateCartItem(item.productId, "discount", Math.max(0, Number(e.target.value)))}
                            className="w-16 p-1.5 border rounded-lg text-center font-bold text-rose-600 font-sans bg-rose-50 focus:bg-white"
                          />
                        </td>

                        <td className="p-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={item.rate || ""}
                            onChange={(e) => updateCartItem(item.productId, "rate", Math.max(0, Number(e.target.value)))}
                            className="w-20 p-1.5 border rounded-lg text-center font-bold font-sans bg-gray-50 hover:bg-white focus:bg-white"
                          />
                        </td>

                        <td className="p-3 text-right font-black text-gray-900 text-sm whitespace-nowrap">
                          {formatCurrency(item.lineTotal)}
                        </td>

                        <td className="p-2 text-center">
                          <button
                            onClick={() => removeFromCart(item.productId)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payment collection controls */}
          <div className="border-t pt-6 bg-gray-50 -mx-6 -mb-6 p-6 rounded-b-2xl grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h5 className="font-bold text-xs uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4" /> পেমেন্ট সেটআপ
              </h5>
              
              {!selectedCustomer ? (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>নগদ কাস্টমার সিলেক্ট আছে। সফল চেকআউটে চূড়ান্ত বিলের সম্পূর্ণ পেমেন্ট অটোমেটিক সম্পন্ন হবে।</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-gray-200/50 p-2.5 rounded-xl text-xs font-bold text-gray-700">
                    <span>পূর্বতন বকেয়া (Current Balance):</span>
                    <span className={Number(selectedCustomerObj?.balance || 0) < 0 ? "text-rose-600 font-extrabold" : "text-emerald-700 font-extrabold"}>
                      {Number(selectedCustomerObj?.balance || 0).toFixed(2)} ৳
                    </span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">সংগৃহীত পেমেন্ট (Received Amount) ৳</label>
                    <input
                      type="number"
                      placeholder="কত টাকা পেমেন্ট করেছেন..."
                      value={receivedAmount}
                      onChange={(e) => setReceivedAmount(e.target.value)}
                      className="w-full p-2.5 border rounded-xl font-bold font-sans text-sm focus:ring-2 focus:ring-black outline-none bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Total summaries calculations and checkout btn */}
            <div className="flex flex-col justify-between py-1 bg-white p-4 rounded-xl border border-gray-150">
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-500 font-semibold">
                  <span>গ্রস আইটেম মূল্য:</span>
                  <span className="font-bold">{formatCurrency(totals.grossTotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-rose-500 font-semibold">
                  <span>মোট ডিস্কাউন্ট (-):</span>
                  <span className="font-bold">-{formatCurrency(totals.totalDiscount)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-gray-900 border-t pt-2 mt-1">
                  <span>মোট চূড়ান্ত বিল:</span>
                  <span>{formatCurrency(totals.netTotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-blue-600 font-bold border-t border-blue-100 pt-2 mt-1">
                  <span>Estimated Profit:</span>
                  <span className="font-black">{formatCurrency(totals.totalProfit)}</span>
                </div>
                <div className="flex justify-between text-xs text-emerald-700 font-semibold">
                  <span>পেমেন্ট সংগ্রহ:</span>
                  <span className="font-bold">{formatCurrency(paymentToCollect)}</span>
                </div>
                {!isCashCustomer && (
                  <div className="flex justify-between text-xs text-rose-600 font-black border-t border-dashed pt-1 mt-1">
                    <span>বকেয়া বাকী (Due for Ledger):</span>
                    <span>{formatCurrency(dueAmount)}</span>
                  </div>
                )}
              </div>
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || isSubmitting}
                className={`w-full text-white py-3.5 rounded-xl font-black text-sm tracking-wide mt-4 uppercase flex items-center justify-center gap-2 transition-all shadow-sm ${
                  cart.length === 0 || isSubmitting ? "bg-gray-300 cursor-not-allowed" : "bg-black hover:bg-gray-900 cursor-pointer"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> সম্পন্ন হচ্ছে (Saving)...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" /> বিক্রয় নিশ্চিত করুন (Checkout)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Ready Sale Side Panel */}
      {isReadySalesOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-end animate-in fade-in">
          <div className="bg-white w-full md:w-96 h-full shadow-2xl flex flex-col p-6 animate-in slide-in-from-right duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-gray-950">রেডি সেল টেমপ্লেট</h3>
              <button 
                onClick={() => setIsReadySalesOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 overflow-y-auto flex-1">
              {readySaleTemplates.map((template, idx) => (
                <button
                  key={idx}
                  onClick={() => loadTemplate(template)}
                  className="w-full p-4 border rounded-2xl text-left hover:border-indigo-300 hover:bg-indigo-50 transition-all cursor-pointer"
                >
                  <p className="font-bold text-gray-900">{template.name}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Invoice Receipt printable Modal */}
      {isCheckoutModalOpen && activeReceipt && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden border shadow-2xl animate-in scale-in duration-150">
            {/* Header */}
            <div className="p-5 border-b flex justify-between items-center bg-[#F8F9FA]">
              <h3 className="font-black text-base text-gray-900 flex items-center gap-1.5">
                <Printer className="w-5 h-5 text-gray-700" /> ক্যাশ মেমো রশিদ / প্রিন্ট কপি
              </h3>
              <button
                onClick={() => setIsCheckoutModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 bg-white p-1 rounded-full border cursor-pointer hover:bg-gray-50"
              >
                닫기 ✕
              </button>
            </div>

            {/* Receipt body preview */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="text-center space-y-1">
                <h1 className="text-xl font-black text-gray-950 uppercase letter-wider">সমীরা ট্রেডার্স</h1>
                <p className="text-[11px] text-gray-500 font-bold">পেমেন্ট ও লেজার রিসিট মেমো</p>
                <p className="text-[10px] text-gray-400">প্রোপাইটর: সমীরা ট্রেডার্স</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs border-y py-3.5 bg-gray-50 px-3 rounded-xl border-dashed">
                <div className="space-y-1">
                  <div><strong>মেমো আইডি:</strong> {activeReceipt.invoiceId}</div>
                  <div><strong>তারিখ:</strong> {new Date(activeReceipt.date).toLocaleDateString('bn-BD')}</div>
                </div>
                <div className="space-y-1">
                  <div><strong>কাস্টমার:</strong> {activeReceipt.customerName}</div>
                  <div><strong>রুট:</strong> {activeReceipt.routeId !== "N/A" ? (routes.find(r => r.id === activeReceipt.routeId)?.name || 'N/A') : 'N/A'}</div>
                  <div><strong>এসআর/ডিএসআর:</strong> {activeReceipt.dsrId !== "N/A" ? (staff.find(s => s.id === activeReceipt.dsrId)?.name || 'N/A') : 'N/A'}</div>
                </div>
              </div>

              {/* Items List inside Receipt */}
              <div className="space-y-2">
                <h5 className="font-bold text-xs uppercase tracking-wider text-gray-400">বিক্রয়কৃত পণ্যসমূহ</h5>
                <div className="divide-y text-xs">
                  {activeReceipt.items.map((it: any, index: number) => (
                    <div key={it.productId || index} className="py-2 flex justify-between items-start gap-4">
                      <div>
                        <div className="font-bold text-gray-900">{it.name}</div>
                        <div className="text-[10px] text-gray-500 font-semibold mt-0.5">
                          {it.cartons ? `${it.cartons} ctn ` : ''}
                          {it.pieces ? `${it.pieces} pcs ` : ''}
                          {it.freeQty ? `(${it.freeQty} free)` : ''}
                        </div>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <div className="font-bold text-gray-900">{formatCurrency(it.lineTotal || it.total || 0)}</div>
                        <div className="text-[9px] text-gray-400">দর (Pcs): {(Number(it.rate) || 0).toFixed(2)} ৳</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Receipt totals */}
              <div className="border-t pt-4 space-y-2 text-xs">
                <div className="flex justify-between text-gray-500 font-semibold">
                  <span>মোট বিল:</span>
                  <span>{formatCurrency(Number(activeReceipt.total || 0) + activeReceipt.items.reduce((a: number, c: any) => a + (Number(c.discount) || 0), 0))}</span>
                </div>
                <div className="flex justify-between text-rose-500 font-semibold">
                  <span>মোট ডিস্কাউন্ট:</span>
                  <span>-{formatCurrency(activeReceipt.items.reduce((a: number, c: any) => a + (c.discount || 0), 0))}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-gray-950 border-t pt-1.5">
                  <span>নিট চূড়ান্ত বিল:</span>
                  <span>{formatCurrency(activeReceipt.total)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-black">
                  <span>সংগৃহীত পেমেন্ট (Paid):</span>
                  <span>{formatCurrency(activeReceipt.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-rose-600 font-black border-t border-dashed pt-1">
                  <span>বকেয়া বাকী (Due):</span>
                  <span>{formatCurrency(activeReceipt.dueAmount)}</span>
                </div>
              </div>

              {/* Receipt Format Selection */}
              <div className="border-t pt-4 space-y-2">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">রশিদ ফরম্যাট / Receipt Size</label>
                <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setReceiptFormat("thermal_58mm")}
                    className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      receiptFormat === "thermal_58mm"
                        ? "bg-white text-black shadow-xs border-gray-200 border"
                        : "text-gray-500 hover:text-gray-850"
                    }`}
                  >
                    ৫৮ মিমি (58mm Thermal)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceiptFormat("standard")}
                    className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      receiptFormat === "standard"
                        ? "bg-white text-black shadow-xs border-gray-200 border"
                        : "text-gray-500 hover:text-gray-850"
                    }`}
                  >
                    ৮০ মিমি (80mm Standard)
                  </button>
                </div>
              </div>
            </div>

            {/* Print action footer */}
            <div className="p-5 border-t bg-gray-50 flex gap-3">
              <button
                onClick={handlePrintReceipt}
                className="flex-1 bg-black text-white py-3 rounded-2xl font-black text-sm cursor-pointer hover:bg-gray-900 transition-all flex items-center justify-center gap-2"
              >
                <Printer className="w-5 h-5" /> রশিদ প্রিন্ট করুন
              </button>
              <button
                onClick={() => {
                  setIsCheckoutModalOpen(false);
                  setActiveReceipt(null);
                }}
                className="px-6 border py-3 rounded-2xl font-bold text-sm bg-white hover:bg-gray-50 text-gray-700 cursor-pointer transition-all"
              >
                নতুন বিক্রয় (New Sale)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Entry Modal Box */}
      {entryProduct && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border shadow-2xl flex flex-col overflow-hidden animate-in scale-in duration-150">
            {/* Header */}
            <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="font-black text-base text-gray-955">{entryProduct.name}</h3>
                <p className="text-xs text-gray-400 font-bold mt-0.5">১ কার্টুন = {entryProduct.cartoonSize || 12} পিস | স্টক: {entryProduct.stock || 0} পিস</p>
              </div>
              <button
                onClick={() => setEntryProduct(null)}
                className="text-gray-400 hover:text-gray-600 bg-white p-1 rounded-full border cursor-pointer hover:bg-gray-50"
              >
                ✕
              </button>
            </div>

            {/* Fields */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1">কার্টুন (Ctn)</label>
                  <input
                    type="number"
                    placeholder="যেমনঃ ৫"
                    value={entryCartons}
                    onChange={(e) => setEntryCartons(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-bold focus:ring-2 focus:ring-black outline-none bg-gray-50 focus:bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1">পিস (Pcs)</label>
                  <input
                    type="number"
                    placeholder="যেমনঃ ১০"
                    value={entryPieces}
                    onChange={(e) => setEntryPieces(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-bold focus:ring-2 focus:ring-black outline-none bg-gray-50 focus:bg-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1">ডিস্কাউন্ট (৳ - টাকা)</label>
                  <input
                    type="number"
                    placeholder="যেমনঃ ৫০"
                    value={entryDiscount}
                    onChange={(e) => setEntryDiscount(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none bg-emerald-50/30 focus:bg-white text-sm text-emerald-850 font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1">ফ্রি প্রোডাক্ট (Pcs)</label>
                  <input
                    type="number"
                    placeholder="যেমনঃ ২"
                    value={entryFreeQty}
                    onChange={(e) => setEntryFreeQty(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-bold focus:ring-2 focus:ring-sky-500 outline-none bg-sky-50/30 focus:bg-white text-sm text-sky-850 font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1">দাম / রেট (প্রতি পিস)</label>
                <input
                  type="number"
                  placeholder="যেমনঃ ১২০"
                  value={entryRate}
                  onChange={(e) => setEntryRate(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-bold focus:ring-2 focus:ring-black outline-none bg-gray-50 focus:bg-white text-sm"
                />
              </div>

              {/* Subtotal preview details inside modal */}
              {(() => {
                const ctnSz = Number(entryProduct.cartoonSize || 12);
                const computedPcs = (Number(entryCartons || 0) * ctnSz) + Number(entryPieces || 0);
                const grossVal = computedPcs * Number(entryRate || entryProduct.price);
                const finalVal = Math.max(0, grossVal - Number(entryDiscount || 0));
                const totalWithFree = computedPcs + Number(entryFreeQty || 0);
                return (
                  <div className="bg-gray-50 p-4 rounded-xl space-y-2 border text-xs">
                    <div className="flex justify-between text-gray-600 font-semibold">
                      <span>মোট পরিমান:</span>
                      <span>{computedPcs} পিস</span>
                    </div>
                    {Number(entryFreeQty || 0) > 0 && (
                      <div className="flex justify-between text-sky-700 font-bold">
                        <span>মোট ফ্রি সহ পরিমান:</span>
                        <span>{totalWithFree} পিস</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-600 font-semibold">
                      <span>মোট গ্রস মূল্য:</span>
                      <span>{formatCurrency(grossVal)}</span>
                    </div>
                    {Number(entryDiscount || 0) > 0 && (
                      <div className="flex justify-between text-red-650 font-bold">
                        <span>ডিস্কাউন্ট সমপরিমাণ:</span>
                        <span>-{formatCurrency(Number(entryDiscount || 0))}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-black text-gray-900 border-t pt-2 mt-1">
                      <span>চূড়ান্ত মূল্য (লাইনের মাথায়):</span>
                      <span className="text-emerald-700 font-extrabold">{formatCurrency(finalVal)}</span>
                    </div>
                    {totalWithFree > Number(entryProduct.stock || 0) && (
                      <p className="text-[10px] text-rose-600 font-bold pt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> সতর্কতাঃ স্টক অতিক্রম করছে!
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Action buttons */}
            <div className="p-5 border-t bg-gray-50 flex gap-3">
              <button
                onClick={() => setEntryProduct(null)}
                className="flex-1 px-4 py-2.5 border rounded-xl font-bold text-sm text-gray-500 bg-white hover:bg-gray-100 transition-all cursor-pointer"
              >
                বাতিল করুন
              </button>
              <button
                onClick={handleSaveEntryModal}
                className="flex-[2] px-4 py-2.5 bg-black text-white hover:bg-gray-950 font-black text-sm rounded-xl tracking-wider uppercase transition-all cursor-pointer"
              >
                কার্টে যুক্ত করুন (Confirm)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
