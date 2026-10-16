import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, collection, query, where, getDocs, setDoc, getDoc } from 'firebase/firestore';
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

    let unsubscribeCompany: (() => void) | null = null;
    let unsubscribeLicense: (() => void) | null = null;
    let unsubscribeSub: (() => void) | null = null;

    const cleanUpSubscriptions = () => {
      if (unsubscribeCompany) { unsubscribeCompany(); unsubscribeCompany = null; }
      if (unsubscribeLicense) { unsubscribeLicense(); unsubscribeLicense = null; }
      if (unsubscribeSub) { unsubscribeSub(); unsubscribeSub = null; }
    };

    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      cleanUpSubscriptions();

      if (!user) {
        setCompany(null);
        setLicense(null);
        setSubscription(null);
        setLoadingCompany(false);
        return;
      }

      let currentCompanyId = companyId;
      let userDocData: any = null;

      try {
        if (db) {
          // 1. Try to get the user document by UID (fastest, most secure, compliant with rules)
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            userDocData = userDocSnap.data();
            currentCompanyId = userDocData.companyId;
          } else {
            // 2. If it doesn't exist, query by email
            const q = query(collection(db, 'users'), where('email', '==', user.email?.trim().toLowerCase()));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              const existingDoc = querySnapshot.docs[0];
              const existingData = existingDoc.data();
              currentCompanyId = existingData.companyId;

              // Clone to their uid for seamless future reads & security rule compliance
              userDocData = {
                uid: user.uid,
                name: existingData.name || user.displayName || 'User',
                email: user.email?.trim().toLowerCase(),
                role: existingData.role || 'view-only',
                roleId: existingData.roleId || existingData.role || 'view-only',
                companyId: existingData.companyId,
                staffId: existingData.staffId || '',
                createdAt: existingData.createdAt || new Date().toISOString()
              };
              await setDoc(doc(db, 'users', user.uid), userDocData);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching or self-healing user record:", err);
      }

      // Automatically bootstrap Samira Traders for the admin email
      if (db && (user.email === 'samiratraders1@gmail.com' || user.email === 'samiratraders.barguna@gmail.com')) {
        try {
          // Ensure Company exists
          await setDoc(doc(db, 'companies', 'samira-traders'), {
            id: 'samira-traders',
            name: 'Samira Traders',
            logo: '',
            address: 'Dhaka, Bangladesh',
            phone: '+8801700000000',
            email: 'samiratraders1@gmail.com',
            status: 'active',
            createdAt: new Date().toISOString()
          }, { merge: true });

          // Ensure License exists
          await setDoc(doc(db, 'licenses', 'lic-samira'), {
            id: "lic-samira",
            companyId: "samira-traders",
            plan: "Enterprise",
            status: "active",
            type: "Lifetime",
            expiryDate: "2036-12-31"
          }, { merge: true });

          // Ensure Subscription exists
          await setDoc(doc(db, 'subscriptions', 'sub-samira'), {
            id: "sub-samira",
            companyId: "samira-traders",
            status: "active"
          }, { merge: true });

          // Ensure User document exists under UID and has correct admin attributes
          if (!userDocData || userDocData.companyId !== 'samira-traders' || userDocData.role !== 'admin') {
            userDocData = {
              ...userDocData,
              uid: user.uid,
              name: userDocData?.name || user.displayName || 'Samira Admin',
              email: user.email?.trim().toLowerCase(),
              role: 'admin',
              roleId: 'admin',
              companyId: 'samira-traders',
              createdAt: userDocData?.createdAt || new Date().toISOString()
            };
            await setDoc(doc(db, 'users', user.uid), userDocData);
          }

          // Ensure Admin document exists
          await setDoc(doc(db, 'admins', user.uid), {
            uid: user.uid,
            email: user.email?.trim().toLowerCase(),
            createdAt: new Date().toISOString()
          }, { merge: true });

          currentCompanyId = 'samira-traders';
        } catch (err) {
          console.error("Error bootstrapping admin records:", err);
        }
      }

      if (currentCompanyId) {
        setCompanyId(currentCompanyId);
      } else {
        setCompany(null);
        setLicense(null);
        setSubscription(null);
        setLoadingCompany(false);
        return;
      }

      setLoadingCompany(true);

      if (!db) {
        setLoadingCompany(false);
        return;
      }

      // 1. Listen to active Company details
      const companyRef = doc(db, 'companies', currentCompanyId);
      unsubscribeCompany = onSnapshot(companyRef, (docSnap) => {
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
      const licenseQuery = query(licensesRef, where('companyId', '==', currentCompanyId));
      unsubscribeLicense = onSnapshot(licenseQuery, (snap) => {
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
      const subQuery = query(subscriptionsRef, where('companyId', '==', currentCompanyId));
      unsubscribeSub = onSnapshot(subQuery, (snap) => {
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
    });

    return () => {
      cleanUpSubscriptions();
      unsubscribeAuth();
    };
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
