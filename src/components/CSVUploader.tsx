import * as React from 'react';
import Papa from 'papaparse';
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

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        onImport(results.data);
      },
      error: (error) => {
        toast.error(`CSV Parsing Error: ${error.message}`);
      }
    });

    // Reset input
    e.target.value = '';
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl font-bold text-xs border border-green-100 hover:bg-green-100 transition-all cursor-pointer">
        <Upload className="w-4 h-4" />
        {title} ফাইল আপলোড করুন
        <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
      </label>
    </div>
  );
}
