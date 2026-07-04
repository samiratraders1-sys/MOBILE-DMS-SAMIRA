import React from 'react';

interface ThermalPrintTemplateProps {
  order: {
    id?: string;
    invoiceId?: string;
    date?: string;
    customerName?: string;
    customerId?: string;
    createdBy?: string;
    routeId?: string;
    dsrId?: string;
    srId?: string;
    status?: string;
    items: Array<{
      productId?: string;
      name: string;
      quantity?: number;
      price?: number;
      cartoonSize?: number;
      cartons?: number;
      pieces?: number;
      freeQty?: number;
      discount?: number;
      rate?: number;
      total?: number;
      lineTotal?: number;
    }>;
    total?: number;
    paidAmount?: number;
    dueAmount?: number;
    customDiscount?: number;
    totalAmount?: number;
  };
  products?: any[];
  customers?: any[];
  staff?: any[];
  routes?: any[];
}

export default function ThermalPrintTemplate({
  order,
  products = [],
  customers = [],
  staff = [],
  routes = []
}: ThermalPrintTemplateProps) {
  if (!order) return null;

  // 1. Resolve Identifier (Memo or Order ID)
  const isMerged = order.id?.startsWith("MERGED-");
  const receiptId = order.invoiceId || order.id || "N/A";
  const displayId = isMerged ? "MERGED (একত্রিত)" : receiptId;

  // 2. Resolve Date
  let dateStr = "";
  try {
    if (order.date) {
      dateStr = new Date(order.date).toLocaleDateString('bn-BD', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } else {
      dateStr = new Date().toLocaleDateString('bn-BD', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  } catch (e) {
    dateStr = order.date || "";
  }

  // 3. Resolve Customer Name
  let customerName = order.customerName || "";
  if (!customerName && order.customerId) {
    const cust = customers.find((c: any) => c.id === order.customerId);
    if (cust) customerName = cust.name;
  }
  if (!customerName) {
    customerName = "সাধারণ কাস্টমার";
  }

  // 4. Resolve SR / Staff
  let staffName = order.createdBy || "";
  const srIdToUse = order.srId || order.dsrId;
  if (srIdToUse) {
    const foundStaff = staff.find((s: any) => s.id === srIdToUse);
    if (foundStaff) staffName = foundStaff.name;
  }

  // 5. Resolve Route / Road
  let routeName = "";
  if (order.routeId) {
    const foundRoute = routes.find((r: any) => r.id === order.routeId);
    if (foundRoute) routeName = foundRoute.name;
  }

  // 6. Process Items
  const items = order.items || [];
  
  // Calculate aggregate totals
  let rawSubtotal = 0;
  let itemsDiscountTotal = 0;

  const processedItems = items.map((it: any) => {
    const name = it.name || "অজানা পণ্য";
    const price = Number(it.price || it.rate || 0);
    
    let qtyStr = "";
    let lineTotal = 0;
    let freeText = "";

    // SROrder uses total piece count in 'quantity'
    if (it.quantity !== undefined) {
      const totalPcs = Number(it.quantity || 0);
      const ctnSize = Number(it.cartoonSize || 1);
      const ctn = Math.floor(totalPcs / ctnSize);
      const pcs = totalPcs % ctnSize;
      
      const parts = [];
      if (ctn > 0) parts.push(`${ctn}C`);
      if (pcs > 0) parts.push(`${pcs}P`);
      qtyStr = parts.join('/') || "0P";
      
      lineTotal = price * totalPcs;
      rawSubtotal += lineTotal;
    } else {
      // POS uses cartons and pieces directly
      const cartons = Number(it.cartons || 0);
      const pieces = Number(it.pieces || 0);
      const parts = [];
      if (cartons > 0) parts.push(`${cartons}C`);
      if (pieces > 0) parts.push(`${pieces}P`);
      qtyStr = parts.join('/') || "0P";

      lineTotal = Number(it.total || it.lineTotal || 0);
      rawSubtotal += lineTotal;
    }

    if (it.freeQty > 0) {
      freeText = `(+${it.freeQty} Free)`;
    }

    const itemDisc = Number(it.discount || 0);
    itemsDiscountTotal += itemDisc;

    return {
      name,
      price,
      qtyStr,
      freeText,
      itemDisc,
      lineTotal
    };
  });

  // Calculate final numbers
  const customDisc = Number(order.customDiscount || 0);
  const totalDiscount = itemsDiscountTotal + customDisc;
  const netTotal = order.total !== undefined ? Number(order.total) : (rawSubtotal - customDisc);
  const paid = Number(order.paidAmount || 0);
  const due = order.dueAmount !== undefined ? Number(order.dueAmount) : Math.max(0, netTotal - paid);

  return (
    <div className="thermal-receipt-preview bg-white text-black text-left p-3 border border-slate-200 shadow-md rounded-2xl max-w-[280px] mx-auto font-mono text-[11px] leading-tight select-none">
      <style dangerouslySetInnerHTML={{ __html: `
        .thermal-receipt-preview {
          width: 58mm;
          max-width: 100%;
          box-sizing: border-box;
          font-family: 'Courier New', Courier, monospace, 'Noto Sans Bengali', sans-serif;
          color: #000;
          background: #fff;
        }
        .receipt-header {
          text-align: center;
          margin-bottom: 8px;
        }
        .receipt-header h1 {
          font-size: 14px;
          font-weight: 900;
          margin: 0 0 2px 0;
          letter-spacing: -0.3px;
        }
        .receipt-header p {
          font-size: 9px;
          margin: 0;
          color: #333;
        }
        .receipt-divider {
          border-top: 1px dashed #000;
          margin: 6px 0;
        }
        .receipt-double-divider {
          border-top: 1px double #000;
          margin: 6px 0;
        }
        .receipt-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin: 2px 0;
        }
        .receipt-metadata {
          font-size: 9px;
          line-height: 1.3;
        }
        .receipt-items-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9px;
          margin-top: 4px;
        }
        .receipt-items-table th {
          border-bottom: 1px dashed #000;
          padding: 3px 0;
          font-weight: bold;
        }
        .receipt-items-table td {
          padding: 3px 0;
          vertical-align: top;
        }
        .receipt-totals {
          margin-top: 6px;
          font-size: 10px;
        }
        .receipt-totals .receipt-row {
          padding: 1px 0;
        }
        .receipt-totals .grand-row {
          font-weight: bold;
          font-size: 11px;
          border-top: 1px dashed #000;
          border-bottom: 1px dashed #000;
          padding: 4px 0;
          margin: 4px 0;
        }
        .receipt-footer {
          text-align: center;
          font-size: 8px;
          margin-top: 10px;
          color: #444;
        }

        @media print {
          @page {
            size: 58mm auto !important;
            margin: 0 !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
          .thermal-receipt-preview {
            width: 58mm !important;
            max-width: 58mm !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 3px !important;
            margin: 0 !important;
          }
        }
      `}} />

      {/* Header */}
      <div className="receipt-header">
        <h1>সমীরা ট্রেডার্স</h1>
        <p>চকবাজার, ঢাকা | ডিস্ট্রিবিউশন সিস্টেম</p>
        <p className="font-bold text-[10px] mt-0.5">
          {isMerged ? "একত্রিত রিসিট" : "ক্যাশ মেমো / রশিদ"}
        </p>
      </div>

      <div className="receipt-divider" />

      {/* Metadata */}
      <div className="receipt-metadata">
        <div className="receipt-row">
          <span>মেমো আইডি:</span>
          <span className="font-bold">{displayId}</span>
        </div>
        <div className="receipt-row">
          <span>তারিখ:</span>
          <span>{dateStr}</span>
        </div>
        <div className="receipt-row">
          <span>কাস্টমার:</span>
          <span className="font-bold">{customerName}</span>
        </div>
        {routeName && (
          <div className="receipt-row">
            <span>রুট/রোড:</span>
            <span>{routeName}</span>
          </div>
        )}
        {staffName && (
          <div className="receipt-row">
            <span>প্রতিনিধি:</span>
            <span>{staffName}</span>
          </div>
        )}
      </div>

      <div className="receipt-divider" />

      {/* Items Section formatted strictly for 58mm */}
      <table className="receipt-items-table">
        <thead>
          <tr className="text-left">
            <th style={{ width: '55%' }}>পণ্য / দর</th>
            <th style={{ width: '20%', textAlign: 'center' }}>পরিমাণ</th>
            <th style={{ width: '25%', textAlign: 'right' }}>মূল্য</th>
          </tr>
        </thead>
        <tbody>
          {processedItems.map((it, idx) => (
            <tr key={idx} style={{ borderBottom: '1px dotted #ccc' }}>
              <td style={{ padding: '4px 0' }}>
                <div className="font-bold text-[10px] text-black leading-tight">{it.name}</div>
                <div className="text-[8px] text-gray-500">
                  @ {it.price.toFixed(2)} ৳ {it.freeText}
                  {it.itemDisc > 0 && <span className="ml-1 text-rose-600">(-{it.itemDisc} ৳)</span>}
                </div>
              </td>
              <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '10px', paddingTop: '4px' }}>
                {it.qtyStr}
              </td>
              <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '10px', paddingTop: '4px' }}>
                {it.lineTotal.toFixed(2)} ৳
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals Section */}
      <div className="receipt-totals">
        <div className="receipt-row">
          <span>মোট মূল্য:</span>
          <span>{rawSubtotal.toFixed(2)} ৳</span>
        </div>
        {totalDiscount > 0 && (
          <div className="receipt-row text-rose-700">
            <span>মোট ছাড়:</span>
            <span>-{totalDiscount.toFixed(2)} ৳</span>
          </div>
        )}
        
        <div className="receipt-row grand-row">
          <span>চূড়ান্ত বিল:</span>
          <span>{netTotal.toFixed(2)} ৳</span>
        </div>

        {paid > 0 && (
          <div className="receipt-row font-bold text-emerald-800">
            <span>সংগৃহীত পেমেন্ট:</span>
            <span>{paid.toFixed(2)} ৳</span>
          </div>
        )}
        {due > 0 && (
          <div className="receipt-row font-bold text-rose-700">
            <span>বকেয়া বাকী (Due):</span>
            <span>{due.toFixed(2)} ৳</span>
          </div>
        )}
      </div>

      <div className="receipt-double-divider" />

      {/* Footer */}
      <div className="receipt-footer">
        <p className="font-bold">ক্রয় করার জন্য ধন্যবাদ!</p>
        <p className="mt-0.5">সমীরা ট্রেডার্স ডিস্ট্রিবিউশন সফটওয়্যার</p>
      </div>
    </div>
  );
}
