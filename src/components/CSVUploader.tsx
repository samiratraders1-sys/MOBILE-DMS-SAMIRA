import * as React from 'react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { Upload } from 'lucide-react';

interface CSVUploaderProps {
  onImport: (data: any[]) => void;
  title: string;
}

export default function CSVUploader({ onImport, title }: CSVUploaderProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
        onImport(data);
      } catch (error: any) {
        toast.error(`ফাইলটি পড়তে সমস্যা হয়েছে: ${error.message}`);
      }
    };
    reader.readAsBinaryString(file);

    // Reset input
    e.target.value = '';
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl font-bold text-xs border border-green-100 hover:bg-green-100 transition-all cursor-pointer">
        <Upload className="w-4 h-4" />
        {title} ফাইল আপলোড করুন (.csv, .xlsx)
        <input type="file" accept=".csv, .xlsx, .xls" className="hidden" onChange={handleFileChange} />
      </label>
    </div>
  );
}
