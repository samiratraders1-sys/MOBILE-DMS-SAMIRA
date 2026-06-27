import React, { useState } from 'react';
import { useCollection } from '../hooks/useCollection';
import { Company } from '../types';
import { useCompany } from '../context/CompanyContext';
import { toast } from 'react-hot-toast';
import { 
  Building2, Plus, Trash2, Key, Shield, HardDrive, RefreshCw, 
  Layers, AlertTriangle, CheckCircle, Database, Power, Play, FileText, Settings, Users
} from 'lucide-react';
import { migrateToSamiraTraders } from '../lib/migration';
import { addDoc, collection, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function SuperAdminView() {
  const companies = useCollection<Company>('companies');
  const licenses = useCollection<any>('licenses');
  const subscriptions = useCollection<any>('subscriptions');
  const { companyId, setCompanyId } = useCompany();

  const [activeTab, setActiveTab] = useState<'companies' | 'licenses' | 'subscriptions' | 'system'>('companies');
  
  // States for Company Creation
  const [newCompName, setNewCompName] = useState('');
  const [newCompEmail, setNewCompEmail] = useState('');
  const [newCompPhone, setNewCompPhone] = useState('');
  const [newCompAddress, setNewCompAddress] = useState('');
  const [newCompLicense, setNewCompLicense] = useState('');
  const [newCompBin, setNewCompBin] = useState('');
  const [newCompTin, setNewCompTin] = useState('');
  const [newCompPlan, setNewCompPlan] = useState<'Basic' | 'Professional' | 'Enterprise'>('Basic');

  // States for License Edit / Renewal
  const [editingLicenseId, setEditingLicenseId] = useState<string | null>(null);
  const [editLicKey, setEditLicKey] = useState('');
  const [editLicPlan, setEditLicPlan] = useState<'Basic' | 'Professional' | 'Enterprise'>('Basic');
  const [editLicType, setEditLicType] = useState<'Trial' | 'Monthly' | 'Yearly' | 'Lifetime'>('Trial');
  const [editLicStart, setEditLicStart] = useState('');
  const [editLicExpiry, setEditLicExpiry] = useState('');
  const [editLicGrace, setEditLicGrace] = useState(7);
  const [editLicStatus, setEditLicStatus] = useState<'active' | 'expired' | 'suspended'>('active');

  // States for Subscription Edit
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editSubUsers, setEditSubUsers] = useState(5);
  const [editSubStorage, setEditSubStorage] = useState(500);
  const [editSubModules, setEditSubModules] = useState<string[]>([]);

  // States for Database operations
  const [dbLoading, setDbLoading] = useState(false);
  const [showConfirmWipe, setShowConfirmWipe] = useState(false);

  // Auto module options per plan
  const planModules = {
    Basic: ['Dashboard', 'Inventory', 'Sales'],
    Professional: ['Dashboard', 'Inventory', 'Sales', 'Purchase', 'Reports', 'Customer Ledger', 'Supplier Ledger'],
    Enterprise: ['Dashboard', 'Inventory', 'Sales', 'Purchase', 'Reports', 'Customer Ledger', 'Supplier Ledger', 'Advanced Ops', 'DSR Portal', 'DMS Suite']
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompName.trim()) {
      toast.error('কোম্পানির নাম আবশ্যক');
      return;
    }

    const genCompanyId = newCompName.toLowerCase().replace(/[^a-z0-9]/g, '-').trim() || `company-${Date.now()}`;
    
    // Check if company already exists
    if (companies.data.some(c => c.id === genCompanyId)) {
      toast.error('এই নামের কোম্পানি বা আইডি ইতিমধ্যে বিদ্যমান!');
      return;
    }

    setDbLoading(true);
    try {
      // 1. Create Company Doc
      const compRef = doc(db, 'companies', genCompanyId);
      const companyPayload: Company = {
        id: genCompanyId,
        name: newCompName.trim(),
        logo: '',
        address: newCompAddress.trim(),
        phone: newCompPhone.trim(),
        email: newCompEmail.trim(),
        tradeLicense: newCompLicense.trim(),
        bin: newCompBin.trim(),
        tin: newCompTin.trim(),
        currency: 'BDT',
        timezone: 'Asia/Dhaka',
        invoiceFooter: 'Thank you for your business!',
        reportHeader: `${newCompName.trim()} ERP Report`,
        status: 'active',
        createdAt: new Date().toISOString()
      };
      await setDoc(compRef, companyPayload);

      // 2. Setup automated Subscription based on selected plan
      const selectedPlanLimits = {
        Basic: { users: 5, storage: 500 },
        Professional: { users: 20, storage: 2048 },
        Enterprise: { users: 100, storage: 10240 }
      }[newCompPlan];

      const subRef = doc(collection(db, 'subscriptions'));
      await setDoc(subRef, {
        id: subRef.id,
        companyId: genCompanyId,
        plan: newCompPlan,
        maxUsers: selectedPlanLimits.users,
        maxCompanies: newCompPlan === 'Basic' ? 1 : (newCompPlan === 'Professional' ? 3 : 10),
        maxStorage: selectedPlanLimits.storage,
        allowedModules: planModules[newCompPlan],
        status: 'active',
        createdAt: new Date().toISOString()
      });

      // 3. Setup automated License (30-day Trial for trial/basic/etc.)
      const todayStr = new Date().toISOString().split('T')[0];
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 30);
      const expiryStr = expiry.toISOString().split('T')[0];

      const licenseRef = doc(collection(db, 'licenses'));
      await setDoc(licenseRef, {
        id: licenseRef.id,
        companyId: genCompanyId,
        licenseKey: `${genCompanyId.toUpperCase()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
        plan: newCompPlan,
        type: 'Trial',
        startDate: todayStr,
        expiryDate: expiryStr,
        graceDays: 7,
        status: 'active',
        createdAt: new Date().toISOString()
      });

      toast.success('কোম্পানি, সাবস্ক্রিপশন এবং লাইসেন্স সফলভাবে তৈরি হয়েছে!');
      
      // Clear Inputs
      setNewCompName('');
      setNewCompEmail('');
      setNewCompPhone('');
      setNewCompAddress('');
      setNewCompLicense('');
      setNewCompBin('');
      setNewCompTin('');
    } catch (err: any) {
      toast.error('কোম্পানি তৈরিতে ত্রুটি: ' + err.message);
    } finally {
      setDbLoading(false);
    }
  };

  const toggleCompanyStatus = async (comp: Company) => {
    const nextStatus = comp.status === 'active' ? 'suspended' : 'active';
    try {
      await updateDoc(doc(db, 'companies', comp.id), { status: nextStatus });
      toast.success(`কোম্পানি ${nextStatus === 'active' ? 'সক্রিয়' : 'স্থগিত'} করা হয়েছে!`);
    } catch (err: any) {
      toast.error('স্ট্যাটাস পরিবর্তনে সমস্যা: ' + err.message);
    }
  };

  const handleDeleteCompany = async (compId: string) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই কোম্পানিটি ডিলিট করতে চান? সব ডাটা মুছে যাবে!')) return;
    try {
      await deleteDoc(doc(db, 'companies', compId));
      toast.success('কোম্পানি সফলভাবে মুছে ফেলা হয়েছে!');
    } catch (err: any) {
      toast.error('কোম্পানি ডিলিট করতে সমস্যা: ' + err.message);
    }
  };

  const handleWipeAndInit = async () => {
    setDbLoading(true);
    try {
      await migrateToSamiraTraders();
      toast.success('ডাটাবেজ মাইগ্রেশন সফলভাবে সম্পন্ন হয়েছে!');
      setShowConfirmWipe(false);
      // Default workspace context
      setCompanyId('samira-traders');
    } catch (err: any) {
      toast.error('মাইগ্রেশনে ব্যর্থতা: ' + err.message);
    } finally {
      setDbLoading(false);
    }
  };

  const startEditLicense = (lic: any) => {
    setEditingLicenseId(lic.id);
    setEditLicKey(lic.licenseKey || '');
    setEditLicPlan(lic.plan || 'Basic');
    setEditLicType(lic.type || 'Trial');
    setEditLicStart(lic.startDate || '');
    setEditLicExpiry(lic.expiryDate || '');
    setEditLicGrace(lic.graceDays || 7);
    setEditLicStatus(lic.status || 'active');
  };

  const saveEditedLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLicenseId) return;
    try {
      await updateDoc(doc(db, 'licenses', editingLicenseId), {
        licenseKey: editLicKey.trim(),
        plan: editLicPlan,
        type: editLicType,
        startDate: editLicStart,
        expiryDate: editLicExpiry,
        graceDays: editLicGrace,
        status: editLicStatus
      });
      toast.success('লাইসেন্স সফলভাবে আপডেট হয়েছে!');
      setEditingLicenseId(null);
    } catch (err: any) {
      toast.error('লাইসেন্স আপডেটে ব্যর্থতা: ' + err.message);
    }
  };

  const startEditSubscription = (sub: any) => {
    setEditingSubId(sub.id);
    setEditSubUsers(sub.maxUsers || 5);
    setEditSubStorage(sub.maxStorage || 500);
    setEditSubModules(sub.allowedModules || []);
  };

  const saveEditedSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubId) return;
    try {
      await updateDoc(doc(db, 'subscriptions', editingSubId), {
        maxUsers: editSubUsers,
        maxStorage: editSubStorage,
        allowedModules: editSubModules
      });
      toast.success('সাবস্ক্রিপশন লিমিট সফলভাবে আপডেট হয়েছে!');
      setEditingSubId(null);
    } catch (err: any) {
      toast.error('সাবস্ক্রিপশন আপডেটে ব্যর্থতা: ' + err.message);
    }
  };

  const toggleModuleInList = (moduleName: string) => {
    if (editSubModules.includes(moduleName)) {
      setEditSubModules(editSubModules.filter(m => m !== moduleName));
    } else {
      setEditSubModules([...editSubModules, moduleName]);
    }
  };

  const allAvailableModules = [
    'Dashboard', 'Inventory', 'Sales', 'Purchase', 'Reports', 
    'Customer Ledger', 'Supplier Ledger', 'Advanced Ops', 'DSR Portal', 'DMS Suite'
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Shield className="text-red-600 w-8 h-8" /> Super Admin Control Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Commercial Multi-Tenant ERP Platform Administration
          </p>
        </div>
        <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 p-3 rounded-xl">
          <div className="text-right">
            <span className="block text-xs text-indigo-500 font-bold uppercase">Active Workspace Context</span>
            <span className="font-semibold text-slate-800 text-sm">
              {companies.data.find(c => c.id === companyId)?.name || 'Default (No Workspace Selected)'}
            </span>
          </div>
          <Building2 className="text-indigo-600 w-5 h-5" />
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('companies')}
          className={`py-3 px-6 font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'companies'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Building2 size={18} /> Company Manager
        </button>
        <button
          onClick={() => setActiveTab('licenses')}
          className={`py-3 px-6 font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'licenses'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Key size={18} /> License Keys
        </button>
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`py-3 px-6 font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'subscriptions'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <HardDrive size={18} /> Subscription Plans
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`py-3 px-6 font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'system'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Settings size={18} /> Database Initialize
        </button>
      </div>

      {/* Content Sections */}
      {activeTab === 'companies' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Company Form */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
              <Plus className="text-indigo-600" size={18} /> Create Tenant Company
            </h3>
            <form onSubmit={handleCreateCompany} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={newCompName}
                  onChange={e => setNewCompName(e.target.value)}
                  placeholder="e.g. Samira Traders"
                  className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    value={newCompEmail}
                    onChange={e => setNewCompEmail(e.target.value)}
                    placeholder="mail@samira.com"
                    className="w-full border rounded-lg p-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone</label>
                  <input
                    type="text"
                    value={newCompPhone}
                    onChange={e => setNewCompPhone(e.target.value)}
                    placeholder="+88017..."
                    className="w-full border rounded-lg p-2 text-sm focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Address</label>
                <input
                  type="text"
                  value={newCompAddress}
                  onChange={e => setNewCompAddress(e.target.value)}
                  placeholder="Dhaka, Bangladesh"
                  className="w-full border rounded-lg p-2 text-sm focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">BIN</label>
                  <input
                    type="text"
                    value={newCompBin}
                    onChange={e => setNewCompBin(e.target.value)}
                    placeholder="BIN-1234"
                    className="w-full border rounded-lg p-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">TIN</label>
                  <input
                    type="text"
                    value={newCompTin}
                    onChange={e => setNewCompTin(e.target.value)}
                    placeholder="TIN-5678"
                    className="w-full border rounded-lg p-2 text-sm focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Trade License</label>
                <input
                  type="text"
                  value={newCompLicense}
                  onChange={e => setNewCompLicense(e.target.value)}
                  placeholder="TL-9999"
                  className="w-full border rounded-lg p-2 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Initial Subscription Plan</label>
                <select
                  value={newCompPlan}
                  onChange={e => setNewCompPlan(e.target.value as any)}
                  className="w-full border rounded-lg p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Basic">Basic (Max 5 Users, Core ERP)</option>
                  <option value="Professional">Professional (Max 20 Users, Advanced Reports)</option>
                  <option value="Enterprise">Enterprise (Max 100 Users, Full Suites)</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={dbLoading}
                className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {dbLoading ? 'সব সেটআপ হচ্ছে...' : 'তৈরি করুন'}
              </button>
            </form>
          </div>

          {/* Companies List */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="text-indigo-600" size={18} /> Companies List ({companies.data.length})
            </h3>
            <div className="space-y-3">
              {companies.data.map(comp => {
                const isActiveWorkspace = companyId === comp.id;
                return (
                  <div key={comp.id} className={`p-5 rounded-2xl bg-white border shadow-sm transition-all flex flex-col md:flex-row justify-between gap-4 ${isActiveWorkspace ? 'ring-2 ring-indigo-500 border-transparent bg-indigo-50/10' : 'border-slate-200'}`}>
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2.5">
                        <Building2 className="text-slate-400" size={20} />
                        <span className="font-bold text-slate-800 text-lg">{comp.name}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase ${
                          comp.status === 'active' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : 'bg-red-50 text-red-700 border border-red-100'
                        }`}>
                          {comp.status === 'active' ? 'সক্রিয়' : 'স্থগিত'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500 font-mono">
                        <div><strong>ID:</strong> {comp.id}</div>
                        <div><strong>Email:</strong> {comp.email || 'N/A'}</div>
                        <div><strong>Phone:</strong> {comp.phone || 'N/A'}</div>
                        <div><strong>Address:</strong> {comp.address || 'N/A'}</div>
                        <div><strong>Trade Lic:</strong> {comp.tradeLicense || 'N/A'}</div>
                        <div><strong>BIN/TIN:</strong> {comp.bin || 'N/A'} / {comp.tin || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="flex md:flex-col justify-end items-end gap-2.5 border-t md:border-t-0 pt-3 md:pt-0 shrink-0">
                      <button
                        onClick={() => setCompanyId(comp.id)}
                        disabled={isActiveWorkspace}
                        className={`w-full md:w-auto px-4 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                          isActiveWorkspace
                            ? 'bg-indigo-100 text-indigo-700 font-black'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <Play size={14} /> {isActiveWorkspace ? 'বর্তমান ওয়ার্কস্পেস' : 'ওয়ার্কস্পেসে প্রবেশ'}
                      </button>
                      <div className="flex gap-2 w-full md:w-auto">
                        <button
                          onClick={() => toggleCompanyStatus(comp)}
                          className={`flex-1 md:flex-none p-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border transition-colors ${
                            comp.status === 'active'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          <Power size={14} /> {comp.status === 'active' ? 'স্থগিত করুন' : 'সক্রিয় করুন'}
                        </button>
                        <button
                          onClick={() => handleDeleteCompany(comp.id)}
                          className="p-1.5 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {companies.data.length === 0 && (
                <div className="text-center py-12 text-slate-400 bg-slate-50 border rounded-2xl border-dashed">
                  কোন কোম্পানি পাওয়া যায়নি। ডাটাবেজ ইনিশিয়ালাইজ করতে পারেন।
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'licenses' && (
        <div className="space-y-6">
          {editingLicenseId && (
            <form onSubmit={saveEditedLicense} className="bg-indigo-50 border border-indigo-200 p-6 rounded-2xl space-y-4 max-w-2xl">
              <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                <Key size={18} /> Edit / Renew License
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">License Key</label>
                  <input
                    type="text"
                    required
                    value={editLicKey}
                    onChange={e => setEditLicKey(e.target.value)}
                    className="w-full border rounded-lg p-2 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Plan</label>
                  <select
                    value={editLicPlan}
                    onChange={e => setEditLicPlan(e.target.value as any)}
                    className="w-full border rounded-lg p-2 text-sm bg-white"
                  >
                    <option value="Basic">Basic</option>
                    <option value="Professional">Professional</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">License Type</label>
                  <select
                    value={editLicType}
                    onChange={e => setEditLicType(e.target.value as any)}
                    className="w-full border rounded-lg p-2 text-sm bg-white"
                  >
                    <option value="Trial">Trial</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Yearly">Yearly</option>
                    <option value="Lifetime">Lifetime</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                  <select
                    value={editLicStatus}
                    onChange={e => setEditLicStatus(e.target.value as any)}
                    className="w-full border rounded-lg p-2 text-sm bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={editLicStart}
                    onChange={e => setEditLicStart(e.target.value)}
                    className="w-full border rounded-lg p-2 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={editLicExpiry}
                    onChange={e => setEditLicExpiry(e.target.value)}
                    className="w-full border rounded-lg p-2 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Grace Days</label>
                  <input
                    type="number"
                    required
                    value={editLicGrace}
                    onChange={e => setEditLicGrace(parseInt(e.target.value) || 0)}
                    className="w-full border rounded-lg p-2 text-sm bg-white"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-bold">সংরক্ষণ করুন</button>
                <button type="button" onClick={() => setEditingLicenseId(null)} className="bg-slate-200 text-slate-700 px-5 py-2 rounded-lg font-bold">বাতিল</button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Key className="text-indigo-600" size={18} /> Active Company Licenses
            </h3>
            <div className="grid gap-4">
              {licenses.data.map(lic => {
                const comp = companies.data.find(c => c.id === lic.companyId);
                return (
                  <div key={lic.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-base">{comp?.name || lic.companyId}</span>
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono uppercase">{lic.plan} • {lic.type}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          lic.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {lic.status === 'active' ? 'Active' : 'Suspended/Expired'}
                        </span>
                      </div>
                      <div className="text-sm font-mono text-indigo-600 font-bold select-all flex items-center gap-1.5">
                        <Key size={14} /> {lic.licenseKey}
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-xs text-slate-500 font-mono">
                        <div><strong>Start:</strong> {lic.startDate}</div>
                        <div><strong>Expiry:</strong> {lic.expiryDate}</div>
                        <div><strong>Grace Days:</strong> {lic.graceDays || 0}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-end shrink-0">
                      <button
                        onClick={() => startEditLicense(lic)}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs p-2.5 px-4 rounded-lg flex items-center gap-1"
                      >
                        <RefreshCw size={14} /> Renew / Edit License
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'subscriptions' && (
        <div className="space-y-6">
          {editingSubId && (
            <form onSubmit={saveEditedSubscription} className="bg-indigo-50 border border-indigo-200 p-6 rounded-2xl space-y-4 max-w-2xl">
              <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                <HardDrive size={18} /> Configure Subscription Limits
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Max Users Allowed</label>
                  <input
                    type="number"
                    required
                    value={editSubUsers}
                    onChange={e => setEditSubUsers(parseInt(e.target.value) || 1)}
                    className="w-full border rounded-lg p-2 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Max Storage (MB)</label>
                  <input
                    type="number"
                    required
                    value={editSubStorage}
                    onChange={e => setEditSubStorage(parseInt(e.target.value) || 100)}
                    className="w-full border rounded-lg p-2 text-sm bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Allowed Modules</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 bg-white p-3 rounded-xl border">
                  {allAvailableModules.map(mod => {
                    const checked = editSubModules.includes(mod);
                    return (
                      <label key={mod} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleModuleInList(mod)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        {mod}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-bold">সংরক্ষণ করুন</button>
                <button type="button" onClick={() => setEditingSubId(null)} className="bg-slate-200 text-slate-700 px-5 py-2 rounded-lg font-bold">বাতিল</button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <HardDrive className="text-indigo-600" size={18} /> Active Tenant Subscriptions
            </h3>
            <div className="grid gap-4">
              {subscriptions.data.map(sub => {
                const comp = companies.data.find(c => c.id === sub.companyId);
                return (
                  <div key={sub.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-base">{comp?.name || sub.companyId}</span>
                        <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-0.5 rounded-full font-extrabold uppercase">{sub.plan} Plan</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs text-slate-500 font-mono pt-1">
                        <div><strong>Max Users:</strong> {sub.maxUsers} Users</div>
                        <div><strong>Max Storage:</strong> {sub.maxStorage >= 1024 ? `${(sub.maxStorage / 1024).toFixed(1)} GB` : `${sub.maxStorage} MB`}</div>
                        <div><strong>Allowed Companies:</strong> {sub.maxCompanies || 1}</div>
                      </div>
                      <div className="pt-2">
                        <span className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Allowed Modules:</span>
                        <div className="flex flex-wrap gap-1">
                          {sub.allowedModules?.map((m: string) => (
                            <span key={m} className="bg-slate-50 border text-slate-600 text-[10px] px-2 py-0.5 rounded font-semibold">{m}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-end shrink-0">
                      <button
                        onClick={() => startEditSubscription(sub)}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs p-2.5 px-4 rounded-lg flex items-center gap-1"
                      >
                        <Settings size={14} /> Edit Limits & Modules
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 max-w-2xl">
          <h3 className="text-lg font-bold text-rose-800 flex items-center gap-2">
            <AlertTriangle className="text-rose-600" size={20} /> System Database Initializer
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            এই ফিচারটি সম্পূর্ণ ডাটাবেজ ওয়াইপ (Wipe) করে প্রথম কোম্পানি হিসেবে <strong className="text-indigo-600">"Samira Traders"</strong> তৈরি করবে এবং এর জন্য লাইফটাইম এন্টারপ্রাইজ লাইসেন্স ও সাবস্ক্রিপশন অটোমেটিকালি প্রস্তুত করবে।
          </p>
          
          <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl text-rose-700 text-xs flex gap-2">
            <AlertTriangle className="shrink-0" size={16} />
            <div>
              <strong>সাবধান:</strong> এটি করার ফলে ডাটাবেজে থাকা পূর্বের সকল তথ্য স্থায়ীভাবে মুছে যাবে। এই অপারেশনটি রিভার্স করা সম্ভব নয়।
            </div>
          </div>

          {!showConfirmWipe ? (
            <button
              onClick={() => setShowConfirmWipe(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 px-5 rounded-lg flex items-center gap-2 text-sm"
            >
              <Database size={16} /> Wipe and Reinitialize Database
            </button>
          ) : (
            <div className="space-y-3 p-4 border border-rose-200 bg-rose-50/20 rounded-xl">
              <span className="block text-sm font-bold text-rose-800">আপনি কি নিশ্চিত?</span>
              <div className="flex gap-2">
                <button
                  onClick={handleWipeAndInit}
                  disabled={dbLoading}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 px-4 rounded-lg disabled:opacity-50"
                >
                  {dbLoading ? 'সম্পূর্ণ হচ্ছে...' : 'হ্যাঁ, সম্পূর্ণ ওয়াইপ করুন'}
                </button>
                <button
                  onClick={() => setShowConfirmWipe(false)}
                  disabled={dbLoading}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold py-2 px-4 rounded-lg"
                >
                  বাতিল
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
