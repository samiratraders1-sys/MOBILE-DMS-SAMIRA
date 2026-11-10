/**
 * Samira Traders DMS - Atomic Sales Service (Firebase writeBatch)
 * Handles 5 atomic writes in a single Firestore transaction batch:
 * 1. sales (Invoice Record)
 * 2. transactions (Customer Ledger)
 * 3. damageInventory / damage_stock (If damage items are included)
 * 4. free_discount_ledger / transactions (Free items & Discounts)
 * 5. expenses (Associated delivery / transaction expenses)
 */

import { writeBatch, doc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { calculateSaleTotals } from "../utils/calculations";

export interface CompleteSalePayload {
  customerId: string;
  customerName: string;
  routeId?: string;
  dsrId?: string;
  items: Array<{
    productId: string;
    name: string;
    cartons: number;
    pieces: number;
    cartoonSize?: number;
    freeQty?: number;
    discount?: number;
    rate: number;
    total?: number;
    qty?: number;
  }>;
  total: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod?: string;
  notes?: string;
  damagedItems?: Array<{
    productId: string;
    name: string;
    quantity: number;
    rate: number;
    reason?: string;
  }>;
  expenseAmount?: number;
  expenseCategory?: string;
  createdBy?: string;
  date?: string;
}

export async function handleCompleteSale(salePayload: CompleteSalePayload, companyId?: string): Promise<{ saleId: string; success: boolean }> {
  const batch = writeBatch(db);
  const now = new Date();
  const dateStr = salePayload.date || now.toISOString().split("T")[0];

  // 1. Reference & Document for Sales Collection
  const salesRef = doc(collection(db, "sales"));
  const saleId = salesRef.id;

  const saleTotals = calculateSaleTotals(salePayload.items as any);

  const saleData = {
    id: saleId,
    companyId: companyId || localStorage.getItem("companyId") || "default",
    date: dateStr,
    createdAt: serverTimestamp(),
    customerId: salePayload.customerId || "cash",
    customerName: salePayload.customerName || "নগদ কাস্টমার",
    routeId: salePayload.routeId || "N/A",
    dsrId: salePayload.dsrId || "N/A",
    items: salePayload.items,
    total: salePayload.total || saleTotals.netTotal,
    paidAmount: salePayload.paidAmount || 0,
    dueAmount: salePayload.dueAmount || 0,
    status: salePayload.dueAmount > 0 ? "partial" : "paid",
    approved: true,
    createdBy: salePayload.createdBy || "Staff",
    notes: salePayload.notes || ""
  };
  batch.set(salesRef, saleData);

  // 2. Write to Customer Ledger (transactions)
  if (salePayload.customerId && salePayload.customerId !== "cash") {
    const custTxRef = doc(collection(db, "transactions"));
    batch.set(custTxRef, {
      id: custTxRef.id,
      companyId: saleData.companyId,
      date: dateStr,
      entityId: salePayload.customerId,
      entityName: salePayload.customerName,
      entityType: "customer",
      refId: saleId,
      type: "sale",
      description: `বিক্রয় চালান #${saleId.slice(0, 6)} - কাস্টমার: ${salePayload.customerName}`,
      amount: salePayload.total,
      paidAmount: salePayload.paidAmount,
      dueAmount: salePayload.dueAmount,
      createdBy: salePayload.createdBy || "Staff",
      createdAt: serverTimestamp()
    });
  }

  // 3. Write to Damage Stock (if damaged items returned/recorded in sale)
  if (salePayload.damagedItems && salePayload.damagedItems.length > 0) {
    salePayload.damagedItems.forEach(dmg => {
      const dmgRef = doc(collection(db, "damageInventory"));
      batch.set(dmgRef, {
        id: dmgRef.id,
        companyId: saleData.companyId,
        date: dateStr,
        refSaleId: saleId,
        productId: dmg.productId,
        productName: dmg.name,
        quantity: dmg.quantity,
        rate: dmg.rate,
        totalLoss: dmg.quantity * dmg.rate,
        reason: dmg.reason || "বিক্রয়কালীন ড্যামেজ ফেরত",
        createdBy: salePayload.createdBy || "Staff",
        createdAt: serverTimestamp()
      });
    });
  }

  // 4. Write to Free & Discount Ledger (transactions / free_discount_ledger)
  if (saleTotals.totalFreePieces > 0 || saleTotals.totalItemDiscounts > 0) {
    const freeDiscRef = doc(collection(db, "transactions"));
    batch.set(freeDiscRef, {
      id: freeDiscRef.id,
      companyId: saleData.companyId,
      date: dateStr,
      refId: saleId,
      type: "free_discount_ledger",
      description: `ফ্রি ও ডিসকাউন্ট লেজার (চালান #${saleId.slice(0, 6)}): ${saleTotals.totalFreePieces} পিস ফ্রি, ৳${saleTotals.totalItemDiscounts} ছাড়`,
      freePieces: saleTotals.totalFreePieces,
      discountAmount: saleTotals.totalItemDiscounts,
      entityId: salePayload.customerId || "cash",
      createdBy: salePayload.createdBy || "Staff",
      createdAt: serverTimestamp()
    });
  }

  // 5. Write to Expenses (if delivery fee or sale expenses incurred)
  if (salePayload.expenseAmount && salePayload.expenseAmount > 0) {
    const expRef = doc(collection(db, "expenses"));
    batch.set(expRef, {
      id: expRef.id,
      companyId: saleData.companyId,
      date: dateStr,
      refSaleId: saleId,
      category: salePayload.expenseCategory || "বিক্রয় পরিবহন ও আনুষঙ্গিক খরচ",
      amount: salePayload.expenseAmount,
      description: `বিক্রয় চালান #${saleId.slice(0, 6)} এর পরিবহন/আনুষঙ্গিক খরচ`,
      createdBy: salePayload.createdBy || "Staff",
      createdAt: serverTimestamp()
    });
  }

  // Commit all 5 writes atomically
  await batch.commit();

  return { saleId, success: true };
}

export interface SaleOrderItem {
  productId: string;
  name?: string;
  productName?: string;
  qty?: number;
  quantity?: number;
  cartons?: number;
  pieces?: number;
  cartoonSize?: number;
  price?: number;
  rate?: number;
  total?: number;
}

export interface CompleteSaleOrderData {
  orderId: string;
  status: string; // Must be "Complete" or "delivered"
  sales_items: SaleOrderItem[];
  companyId?: string;
  customerId?: string;
  customerName?: string;
  createdBy?: string;
}

/**
 * ERP Sales Completion Transaction
 * 
 * শর্ত ১: Order status "Complete" হলে sales_items এর প্রতিটা product এর qty দিয়ে inventory থেকে বিয়োগ হবে
 * শর্ত ২: Database Transaction ব্যবহার করো। inventory update না হলে পুরো sale rollback হবে
 * শর্ত ৩: Negative stock allow করবে না। stock না থাকলে error return করবে
 * শর্ত ৪: Update করার পর sales_report টেবিলে entry যাবে
 */
export async function completeSale(orderData: CompleteSaleOrderData): Promise<{
  success: boolean;
  orderId: string;
  reportId: string;
  message: string;
}> {
  const { orderId, status, sales_items, companyId = "samira-traders", createdBy = "system" } = orderData;

  // শর্ত ১: Order status "Complete" (বা "delivered") যাচাই
  const normalizedStatus = status?.trim();
  if (normalizedStatus !== "Complete" && normalizedStatus !== "delivered") {
    throw new Error(`Order ${orderId} status must be 'Complete' (provided: '${status}')`);
  }

  if (!sales_items || !Array.isArray(sales_items) || sales_items.length === 0) {
    throw new Error("অর্ডারে কোনো পণ্য (sales_items) পাওয়া যায়নি");
  }

  const isDemoMode = typeof window !== "undefined" && localStorage.getItem("demo_user_session") !== null;

  if (isDemoMode) {
    // Demo Mode handling using localStorage
    const storedOrders = localStorage.getItem("demo_coll_orders");
    const ordersList = storedOrders ? JSON.parse(storedOrders) : [];
    const ordIdx = ordersList.findIndex((o: any) => o.id === orderId);
    if (ordIdx >= 0 && ordersList[ordIdx].status === "Complete") {
      throw new Error(`অর্ডার #${orderId.slice(0, 8)} ইতিমধ্যে সম্পন্ন (Complete) হয়ে গেছে। পুনরায় ইনভেন্টরি কর্তন সম্ভব নয়।`);
    }

    const storedProducts = localStorage.getItem("demo_coll_products");
    const productsList = storedProducts ? JSON.parse(storedProducts) : [];

    // Consolidate required quantity per unique productId
    const consolidatedMap = new Map<string, {
      productId: string;
      name: string;
      totalDeductQty: number;
      unitPrice: number;
      subTotal: number;
    }>();

    for (const item of sales_items) {
      const pId = item.productId;
      if (!pId) throw new Error("আইটেমে productId নেই");
      
      const prod = productsList.find((p: any) => p.id === pId);
      if (!prod) {
        throw new Error(`পণ্য পাওয়া যায়নি: ${item.name || item.productName || pId}`);
      }

      let lineQty = Number(item.qty || item.quantity || 0);
      if (lineQty <= 0 && (item.cartons || item.pieces)) {
        const cSize = Number(item.cartoonSize || prod.cartoonSize || prod.piecesInCarton || 1);
        lineQty = (Number(item.cartons || 0) * cSize) + Number(item.pieces || 0);
      }
      if (lineQty <= 0) {
        throw new Error(`পণ্যের পরিমাণ সঠিক নয় (${prod.name}): ${lineQty}`);
      }

      const price = Number(item.price || item.rate || prod.salesPrice || prod.price || 0);
      const existing = consolidatedMap.get(pId);
      if (existing) {
        existing.totalDeductQty += lineQty;
        existing.subTotal += lineQty * price;
      } else {
        consolidatedMap.set(pId, {
          productId: pId,
          name: prod.name || item.name || "Product",
          totalDeductQty: lineQty,
          unitPrice: price,
          subTotal: lineQty * price
        });
      }
    }

    // Verify stock levels before applying any updates (Anti-Negative Stock)
    const updates: any[] = [];
    let calculatedTotal = 0;

    for (const [pId, agg] of consolidatedMap.entries()) {
      const prod = productsList.find((p: any) => p.id === pId);
      const currentStock = Number(prod.stock ?? prod.quantity ?? 0);

      if (currentStock < agg.totalDeductQty) {
        throw new Error(`পণ্য '${agg.name}'-এর পর্যাপ্ত স্টক নেই! বর্তমান স্টক: ${currentStock}, প্রয়োজন: ${agg.totalDeductQty}। বিক্রয় বাতিল করা হয়েছে।`);
      }

      calculatedTotal += agg.subTotal;
      updates.push({
        prod,
        currentStock,
        deductQty: agg.totalDeductQty,
        newStock: currentStock - agg.totalDeductQty,
        price: agg.unitPrice,
        subTotal: agg.subTotal
      });
    }

    // Apply updates atomically in demo mode
    updates.forEach(u => {
      u.prod.stock = u.newStock;
      u.prod.quantity = u.newStock;
    });
    localStorage.setItem("demo_coll_products", JSON.stringify(productsList));

    // Update order status in demo storage
    if (ordIdx >= 0) {
      ordersList[ordIdx].status = "Complete";
      ordersList[ordIdx].completedAt = new Date().toISOString();
      localStorage.setItem("demo_coll_orders", JSON.stringify(ordersList));
    }

    // Write sales_report entry
    const storedReports = localStorage.getItem("demo_coll_sales_report");
    const reportsList = storedReports ? JSON.parse(storedReports) : [];
    const reportId = `report_${Date.now()}`;
    reportsList.unshift({
      id: reportId,
      orderId,
      companyId,
      status: "Complete",
      totalAmount: calculatedTotal,
      totalItemsCount: updates.length,
      items: updates.map(u => ({
        productId: u.prod.id,
        productName: u.prod.name,
        quantity: u.deductQty,
        price: u.price,
        subtotal: u.subTotal
      })),
      createdBy,
      createdAt: { seconds: Math.floor(Date.now() / 1000) }
    });
    localStorage.setItem("demo_coll_sales_report", JSON.stringify(reportsList));

    window.dispatchEvent(new CustomEvent("local-db-change", { detail: { collectionName: "products" } }));
    window.dispatchEvent(new CustomEvent("local-db-change", { detail: { collectionName: "orders" } }));
    window.dispatchEvent(new CustomEvent("local-db-change", { detail: { collectionName: "sales_report" } }));

    return {
      success: true,
      orderId,
      reportId,
      message: "অর্ডার সম্পন্ন হয়েছে, স্টক বিয়োগ হয়েছে এবং সেলস রিপোর্টে জমা হয়েছে।"
    };
  }

  if (!db) {
    throw new Error("Database is not initialized");
  }

  // শর্ত ২: Database Transaction (runTransaction)
  const { runTransaction } = await import("firebase/firestore");

  return await runTransaction(db, async (transaction) => {
    // Phase A: প্রথমে Order ডকুমেন্ট এবং সব স্বতন্ত্র প্রোডাক্টের স্টক রিড (Read phase)
    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await transaction.get(orderRef);
    if (orderSnap.exists()) {
      const currentOrderStatus = orderSnap.data().status;
      if (currentOrderStatus === "Complete") {
        throw new Error(`অর্ডার #${orderId.slice(0, 8)} ইতিমধ্যে সম্পন্ন (Complete) হয়ে গেছে। পুনরায় ইনভেন্টরি কর্তন সম্ভব নয়।`);
      }
    }

    // Unique product IDs to fetch
    const uniqueProductIds = Array.from(new Set(sales_items.map(i => i.productId).filter(Boolean)));
    if (uniqueProductIds.length === 0) {
      throw new Error("অর্ডারে কোনো বৈধ productId পাওয়া যায়নি");
    }

    const fetchedProductSnaps = await Promise.all(
      uniqueProductIds.map(pId => {
        const pRef = doc(db, "products", pId);
        return transaction.get(pRef).then(snap => ({ pId, ref: pRef, snap }));
      })
    );

    const productMap = new Map<string, { ref: any; snap: any; data: any }>();
    for (const fp of fetchedProductSnaps) {
      if (!fp.snap.exists()) {
        throw new Error(`ইনভেন্টরিতে পণ্য পাওয়া যায়নি (ID: ${fp.pId})`);
      }
      productMap.set(fp.pId, { ref: fp.ref, snap: fp.snap, data: fp.snap.data() });
    }

    // Phase B: প্রোডাক্ট অনুযায়ী পরিমাণ একত্রীকরণ ও স্টক যাচাই (Consolidation & Anti-Negative Check)
    const consolidatedDeductions = new Map<string, {
      ref: any;
      name: string;
      currentStock: number;
      totalDeductQty: number;
      unitPrice: number;
      subTotal: number;
    }>();

    for (const item of sales_items) {
      const pId = item.productId;
      const prodInfo = productMap.get(pId);
      if (!prodInfo) {
        throw new Error(`ইনভেন্টরিতে পণ্য পাওয়া যায়নি: ${item.name || pId}`);
      }

      const prodData = prodInfo.data;
      let lineQty = Number(item.qty || item.quantity || 0);
      if (lineQty <= 0 && (item.cartons || item.pieces)) {
        const cSize = Number(item.cartoonSize || prodData.cartoonSize || prodData.piecesInCarton || 1);
        lineQty = (Number(item.cartons || 0) * cSize) + Number(item.pieces || 0);
      }
      if (lineQty <= 0) {
        throw new Error(`পণ্যের পরিমাণ সঠিক নয় (${prodData.name || item.name || pId}): ${lineQty}`);
      }

      const unitPrice = Number(item.price || item.rate || prodData.salesPrice || prodData.price || 0);
      const subTotal = lineQty * unitPrice;

      const existing = consolidatedDeductions.get(pId);
      if (existing) {
        existing.totalDeductQty += lineQty;
        existing.subTotal += subTotal;
      } else {
        const curStock = Number(prodData.stock ?? prodData.quantity ?? 0);
        consolidatedDeductions.set(pId, {
          ref: prodInfo.ref,
          name: prodData.name || item.name || "Product",
          currentStock: curStock,
          totalDeductQty: lineQty,
          unitPrice,
          subTotal
        });
      }
    }

    // শর্ত ৩: Negative stock চেক (Validate each product total required against current stock)
    let calculatedTotal = 0;
    const finalUpdates: any[] = [];

    for (const [pId, deduction] of consolidatedDeductions.entries()) {
      if (deduction.currentStock < deduction.totalDeductQty) {
        throw new Error(
          `পণ্য '${deduction.name}'-এর পর্যাপ্ত স্টক নেই! বর্তমান স্টক: ${deduction.currentStock}, প্রয়োজন: ${deduction.totalDeductQty}। বিক্রয় বাতিল করা হয়েছে।`
        );
      }

      calculatedTotal += deduction.subTotal;
      finalUpdates.push({
        pId,
        ref: deduction.ref,
        name: deduction.name,
        currentStock: deduction.currentStock,
        deductQty: deduction.totalDeductQty,
        newStock: deduction.currentStock - deduction.totalDeductQty,
        unitPrice: deduction.unitPrice,
        subTotal: deduction.subTotal
      });
    }

    // Phase C: ইনভেন্টরি আপডেট (Writes)
    for (const update of finalUpdates) {
      transaction.update(update.ref, {
        stock: update.newStock,
        quantity: update.newStock,
        updatedAt: serverTimestamp()
      });
    }

    // অর্ডারের স্ট্যাটাস 'Complete' হিসেবে আপডেট
    transaction.set(orderRef, {
      id: orderId,
      status: "Complete",
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    // শর্ত ৪: sales_report টেবিলে এন্ট্রি
    const salesReportRef = doc(collection(db, "sales_report"));
    const reportData = {
      id: salesReportRef.id,
      orderId,
      companyId: companyId || "samira-traders",
      status: "Complete",
      totalAmount: calculatedTotal,
      totalItemsCount: finalUpdates.length,
      items: finalUpdates.map(u => ({
        productId: u.pId,
        productName: u.name,
        quantity: u.deductQty,
        price: u.unitPrice,
        subtotal: u.subTotal
      })),
      createdBy: createdBy || "Staff",
      createdAt: serverTimestamp()
    };

    transaction.set(salesReportRef, reportData);

    return {
      success: true,
      orderId,
      reportId: salesReportRef.id,
      message: "অর্ডার সফলভাবে সম্পন্ন হয়েছে, ইনভেন্টরি আপডেট হয়েছে এবং সেলস রিপোর্টে এন্ট্রি হয়েছে।"
    };
  });
}
