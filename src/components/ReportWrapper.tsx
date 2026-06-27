import React from 'react';
import { Download, Share2 } from "lucide-react";

interface ReportWrapperProps {
  title: string;
  children: React.ReactNode;
  onDownload: () => void;
  onShare: () => void;
}

export default function ReportWrapper({ title, children, onDownload, onShare }: ReportWrapperProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="flex gap-2">
            <button onClick={onDownload} className="flex items-center gap-2 text-sm px-4 py-2 border rounded-xl hover:bg-gray-100"><Download className="w-4 h-4"/> CSV</button>
            <button onClick={onShare} className="flex items-center gap-2 text-sm px-4 py-2 border rounded-xl hover:bg-gray-100"><Share2 className="w-4 h-4"/> WhatsApp</button>
        </div>
      </div>
      {children}
    </div>
  );
}
