import React from 'react';

interface DataPreviewModalProps {
  data: any[];
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DataPreviewModal({ data, onConfirm, onCancel }: DataPreviewModalProps) {
  if (data.length === 0) return null;

  const headers = Object.keys(data[0]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-4xl w-full rounded-2xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
        <h3 className="text-xl font-bold mb-4">ডেটা প্রিভিউ ({data.length}টি সারি)</h3>
        <p className="text-sm text-gray-500 mb-4">নিচে ইম্পোর্ট করা ডেটার একটি প্রিভিউ দেওয়া হলো। সবকিছু ঠিক থাকলে কনফার্ম করুন।</p>
        
        <div className="overflow-auto border border-gray-200 rounded-lg flex-1">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                {headers.map(h => <th key={h} className="p-2 font-bold uppercase">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.slice(0, 50).map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {headers.map(h => <td key={h} className="p-2 truncate">{String(row[h])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.length > 50 && <p className="text-xs text-gray-400 mt-2">... আরও অনেক ডেটা আছে (শুধুমাত্র প্রথম ৫০টি সারি দেখানো হচ্ছে)</p>}

        <div className="flex gap-4 mt-6">
          <button onClick={onCancel} className="flex-1 border py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-50">বাতিল</button>
          <button onClick={onConfirm} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700">কনফার্ম ও ইম্পোর্ট</button>
        </div>
      </div>
    </div>
  );
}
