import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Company } from '../types';

interface CompanyContextType {
  companyId: string | null;
  setCompanyId: (id: string | null) => void;
  company: Company | null;
  license: any | null;
  subscription: any | null;
  isReadOnly: boolean;
  loadingCompany: boolean;
}

const CompanyContext = createContext<CompanyContextType>({
  companyId: null,
  setCompanyId: () => {},
  company: null,
  license: null,
  subscription: null,
  isReadOnly: false,
  loadingCompany: true,
});

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [companyId, setCompanyId] = useState<string | null>(localStorage.getItem('companyId'));
  const [company, setCompany] = useState<Company | null>(null);
  const [license, setLicense] = useState<any | null>(null);
  const [subscription, setSubscription] = useState<any | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [authStateCounter, setAuthStateCounter] = useState(0);

  useEffect(() => {
    const handleAuthChange = () => {
      setAuthStateCounter(prev => prev + 1);
    };
    window.addEventListener("auth-state-change", handleAuthChange);
    return () => window.removeEventListener("auth-state-change", handleAuthChange);
  }, []);

  useEffect(() => {
    if (companyId) {
      localStorage.setItem('companyId', companyId);
    } else {
      localStorage.removeItem('companyId');
    }
  }, [companyId]);

  useEffect(() => {
    const isDemoMode = localStorage.getItem("demo_user_session") !== null;

    if (isDemoMode) {
      setCompany({
        id: "samira-traders",
        name: "Samira Traders",
        logo: "",
        address: "Dhaka, Bangladesh",
        phone: "+8801700000000",
        email: "samiratraders1@gmail.com",
        status: "active",
        createdAt: new Date().toISOString()
      });
      setLicense({
        id: "lic-samira",
        companyId: "samira-traders",
        plan: "Enterprise",
        status: "active",
        type: "Lifetime",
        expiryDate: "2036-12-31"
      });
      setSubscription({
        id: "sub-samira",
        companyId: "samira-traders",
        status: "active"
      });
      setCompanyId("samira-traders");
      setLoadingCompany(false);
      return;
    }

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        setCompany(null);
        setLicense(null);
        setSubscription(null);
        setLoadingCompany(false);
        return;
      }

      if (!companyId) {
        setCompany(null);
        setLicense(null);
        setSubscription(null);
        setLoadingCompany(false);
        return;
      }

      setLoadingCompany(true);

      // 1. Listen to active Company details
      const companyRef = doc(db, 'companies', companyId);
      const unsubscribeCompany = onSnapshot(companyRef, (docSnap) => {
        if (docSnap.exists()) {
          setCompany({ id: docSnap.id, ...docSnap.data() } as Company);
        } else {
          setCompany(null);
        }
      }, (err) => {
        console.error("Error subscribing to company:", err);
      });

      // 2. Listen to active Company License details
      const licensesRef = collection(db, 'licenses');
      const licenseQuery = query(licensesRef, where('companyId', '==', companyId));
      const unsubscribeLicense = onSnapshot(licenseQuery, (snap) => {
        if (!snap.empty) {
          const lDoc = snap.docs[0];
          setLicense({ id: lDoc.id, ...lDoc.data() });
        } else {
          setLicense(null);
        }
      }, (err) => {
        console.error("Error subscribing to license:", err);
      });

      // 3. Listen to active Company Subscription details
      const subscriptionsRef = collection(db, 'subscriptions');
      const subQuery = query(subscriptionsRef, where('companyId', '==', companyId));
      const unsubscribeSub = onSnapshot(subQuery, (snap) => {
        if (!snap.empty) {
          const sDoc = snap.docs[0];
          setSubscription({ id: sDoc.id, ...sDoc.data() });
        } else {
          setSubscription(null);
        }
        setLoadingCompany(false);
      }, (err) => {
        console.error("Error subscribing to subscription:", err);
        setLoadingCompany(false);
      });

      return () => {
        unsubscribeCompany();
        unsubscribeLicense();
        unsubscribeSub();
      };
    });

    return () => unsubscribeAuth();
  }, [companyId, authStateCounter]);

  // Determine read-only mode:
  // - Company is suspended
  // - License is suspended
  // - License is expired (expiryDate + graceDays < today)
  let isReadOnly = false;
  if (company && company.status === 'suspended') {
    isReadOnly = true;
  }

  if (license) {
    if (license.status === 'suspended') {
      isReadOnly = true;
    } else if (license.status === 'expired') {
      isReadOnly = true;
    } else if (license.expiryDate) {
      const expiry = new Date(license.expiryDate);
      const graceDays = license.graceDays || 0;
      expiry.setDate(expiry.getDate() + graceDays);
      const today = new Date();
      if (today > expiry && license.type !== 'Lifetime') {
        isReadOnly = true;
      }
    }
  }

  return (
    <CompanyContext.Provider value={{ 
      companyId, 
      setCompanyId, 
      company, 
      license, 
      subscription, 
      isReadOnly, 
      loadingCompany 
    }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => useContext(CompanyContext);
