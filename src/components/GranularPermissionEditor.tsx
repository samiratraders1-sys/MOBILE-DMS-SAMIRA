import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const GRANULAR_PERMISSIONS = [
  { id: 'edit_sales', label: 'সেলস এডিট করা' },
  { id: 'view_reports', label: 'রিপোর্ট দেখা' },
  { id: 'delete_orders', label: 'অর্ডার ডিলিট করা' },
  { id: 'edit_inventory', label: 'ইনভেন্টরি পরিবর্তন' },
  { id: 'approve_purchase', label: 'ক্রয় অনুমোদন' },
];

interface Props {
  selectedPermissions: string[];
  onChange: (permissions: string[]) => void;
}

export default function GranularPermissionEditor({ selectedPermissions, onChange }: Props) {
  const togglePermission = (id: string) => {
    if (selectedPermissions.includes(id)) {
      onChange(selectedPermissions.filter(p => p !== id));
    } else {
      onChange([...selectedPermissions, id]);
    }
  };

  return (
    <div className="p-4 border rounded-xl bg-gray-50">
      <h4 className="text-sm font-bold flex items-center gap-2 mb-3">
        <ShieldCheck className="w-4 h-4 text-indigo-600" />
         granular পারমিশন সেট
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {GRANULAR_PERMISSIONS.map(p => (
          <label key={p.id} className="flex items-center gap-2 text-xs font-semibold cursor-pointer p-1.5 hover:bg-gray-100 rounded">
            <input 
              type="checkbox" 
              checked={selectedPermissions.includes(p.id)}
              onChange={() => togglePermission(p.id)}
              className="accent-indigo-600"
            />
            {p.label}
          </label>
        ))}
      </div>
    </div>
  );
}
