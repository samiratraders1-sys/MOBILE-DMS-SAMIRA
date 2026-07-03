import React, { useState } from "react";
import { Trash2, Edit2, Plus, Tag } from "lucide-react";
import toast from "react-hot-toast";
import { GROUP_COLOR_PRESETS } from "../lib/utils";
import { useConfirm } from "../context/ConfirmContext";

interface CustomerGroupsViewProps {
  customerGroups: any;
}

export default function CustomerGroupsView({ customerGroups }: CustomerGroupsViewProps) {
  const [groupName, setGroupName] = useState("");
  const [selectedPresetColor, setSelectedPresetColor] = useState(0);
  const [editingGroup, setEditingGroup] = useState<any | null>(null);
  const { confirmDelete } = useConfirm();

  const handleSaveCustomerGroup = async () => {
    if (!groupName.trim()) {
      toast.error("গ্রুপের নাম দিন");
      return;
    }
    const color = GROUP_COLOR_PRESETS[selectedPresetColor];
    const groupData = {
      name: groupName,
      ...color,
    };
    
    if (editingGroup) {
      await customerGroups.update(editingGroup.id, groupData);
      toast.success("গ্রুপ আপডেট হয়েছে");
      setEditingGroup(null);
    } else {
      await customerGroups.add(groupData);
      toast.success("গ্রুপ যোগ করা হয়েছে");
    }
    setGroupName("");
  };

  const handleEditGroupClick = (group: any) => {
    setEditingGroup(group);
    setGroupName(group.name);
    const colorIdx = GROUP_COLOR_PRESETS.findIndex(p => p.bg === group.bg);
    setSelectedPresetColor(colorIdx > -1 ? colorIdx : 0);
  };

  const handleDeleteGroup = async (id: string, name: string) => {
    confirmDelete({
      recordName: name,
      onConfirm: async () => {
        try {
          await customerGroups.remove(id);
          toast.success("গ্রুপ ডিলিট হয়েছে");
        } catch (error: any) {
          toast.error("ডিলিট করতে সমস্যা: " + error.message);
          throw error;
        }
      }
    });
  };

  return (
    <div className="bg-white p-5 border border-gray-150 rounded-2xl flex flex-col h-full">
      <h4 className="font-bold text-sm text-[#1e1b4b] mb-4 flex items-center gap-2">
        <Tag className="w-5 h-5 text-violet-650" /> কাস্টমার গ্রুপ ম্যানেজমেন্ট
      </h4>
      
      <div className="space-y-4 mb-6">
        <input 
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="গ্রুপের নাম (যেমন: VIP, Retailer)"
          className="w-full border border-gray-200 rounded-xl p-3 text-sm"
        />
        <div className="grid grid-cols-4 gap-2">
          {GROUP_COLOR_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedPresetColor(idx)}
              className={`p-2 border rounded-xl flex items-center justify-center ${
                selectedPresetColor === idx ? "border-indigo-600 ring-2 ring-indigo-500" : "border-gray-200"
              }`}
            >
              <span className={`w-4 h-4 rounded-full ${preset.bg}`} />
            </button>
          ))}
        </div>
        <button
          onClick={handleSaveCustomerGroup}
          className="w-full bg-black text-white p-3 rounded-xl font-bold text-sm"
        >
          {editingGroup ? "আপডেট করুন" : "গ্রুপ যোগ করুন"}
        </button>
      </div>

      <div className="space-y-2 overflow-y-auto">
        {(customerGroups.data || []).map((g: any) => (
          <div key={g.id} className="flex items-center justify-between p-3 bg-gray-50 border rounded-xl">
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${g.bg} ${g.text || "text-white"}`}>
              {g.name}
            </span>
            <div className="flex gap-2">
              <button onClick={() => handleEditGroupClick(g)} className="p-1 hover:bg-gray-200 rounded">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => handleDeleteGroup(g.id, g.name)} className="p-1 hover:bg-red-100 text-red-600 rounded">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
