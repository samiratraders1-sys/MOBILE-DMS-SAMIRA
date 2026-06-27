import { formatCurrency } from '../lib/utils';
import { Printer } from 'lucide-react';

interface QuickReceiptProps {
  payment: any;
  onClose: () => void;
}

export default function QuickReceipt({ payment, onClose }: QuickReceiptProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl p-6 space-y-4 shadow-2xl">
        <div id="print-receipt-area" className="thermal-print" style={{ color: 'black', fontFamily: 'monospace' }}>
          <div style={{ textAlign: 'center', marginBottom: '15px' }}>
            <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0' }}>Samira Traders</h1>
            <p style={{ margin: '0', fontSize: '12px' }}>মানি রিসিট / পেমেন্ট ভাউচার</p>
          </div>
          
          <div style={{ marginBottom: '15px', borderBottom: '1px dashed black', paddingBottom: '10px', fontSize: '12px' }}>
            <p style={{ margin: '0' }}>তারিখ: {payment.date}</p>
            <p style={{ margin: '0' }}>ধরন: {payment.type === 'in' ? 'টাকা গ্রহণ' : 'টাকা প্রদান'}</p>
            <p style={{ margin: '0' }}>খাত: {payment.category}</p>
          </div>
          
          <div style={{ fontSize: '14px', fontWeight: 'bold', textAlign: 'center', margin: '15px 0', border: '1px solid black', padding: '10px' }}>
            পরিমাণ: {formatCurrency(payment.amount)}
          </div>
          
          <div style={{ fontSize: '12px', marginBottom: '15px' }}>
            <p style={{ margin: '0' }}>বিবরণ: {payment.description}</p>
          </div>

          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '10px' }}>
            <p>ধন্যবাদ!</p>
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <button onClick={handlePrint} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2">
            <Printer size={16} /> প্রিন্ট
          </button>
          <button onClick={onClose} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg font-bold">বন্ধ</button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          #print-receipt-area, #print-receipt-area * { visibility: visible; }
          #print-receipt-area { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}} />
    </div>
  );
}
