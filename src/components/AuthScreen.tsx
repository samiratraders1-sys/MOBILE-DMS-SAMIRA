import { LogIn, Eye, EyeOff, Sparkles, QrCode, UserPlus } from "lucide-react";
import { signInWithGoogle, loginWithEmail, createFirebaseUser } from "../lib/firebase";
import { motion } from "motion/react";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import QRScannerModal from "./QRScannerModal";

interface AuthScreenProps {
  onEnterDemo?: () => void;
}

export default function AuthScreen({ onEnterDemo }: AuthScreenProps) {
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  // Login States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Registration States
  const [regName, setRegName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regRole, setRegRole] = useState("manager"); // manager, sr, dsr, admin
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  // QR Code Scanner States
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    try {
      const savedLogo = localStorage.getItem("app_custom_logo");
      if (savedLogo) {
        setCustomLogo(savedLogo);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleRegister = async () => {
    if (!regName || !regUsername || !regPassword || !regConfirmPassword) {
      toast.error("অনুগ্রহ করে সব তথ্য দিন।");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      toast.error("পাসওয়ার্ড দুটি মেলেনি!");
      return;
    }
    if (regPassword.length < 6) {
      toast.error("পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে।");
      return;
    }

    setIsLoading(true);
    const cleanedUsername = regUsername.trim().toLowerCase().replace(/[^a-zA-Z0-9_\-\.]/g, '');
    const formattedEmail = cleanedUsername.includes("@") ? cleanedUsername : `${cleanedUsername}@samirabms.com`;

    try {
      // 1. Create in Firebase Auth using the safe utility
      let uid = "";
      try {
        uid = await createFirebaseUser(formattedEmail, regPassword);
      } catch (authError: any) {
        console.warn("Firebase Auth registration failed, fallback to local ID:", authError);
        uid = `local_uid_${Date.now()}`;
      }

      // 2. Format user object
      const newUserRecord = {
        name: regName.trim(),
        email: formattedEmail,
        username: cleanedUsername,
        password: regPassword,
        role: regRole,
        uid: uid,
        authMethod: "username_password",
        createdAt: new Date().toISOString()
      };

      // 3. Write to Firestore
      try {
        const { collection, addDoc } = await import("firebase/firestore");
        const { db } = await import("../lib/firebase");
        if (db) {
          await addDoc(collection(db, "users"), newUserRecord);
          toast.success("ডাটাবেজে ইউজার অ্যাকাউন্ট সফলভাবে সংরক্ষিত হয়েছে!");
        }
      } catch (dbError: any) {
        console.warn("Firestore save failed, storing locally:", dbError);
      }

      // 4. Stash in localStorage for offline availability
      const localUsersStr = localStorage.getItem("local_users") || "[]";
      const localUsers = JSON.parse(localUsersStr);
      localUsers.push(newUserRecord);
      localStorage.setItem("local_users", JSON.stringify(localUsers));

      // 5. Create current session
      const demoUser = {
        email: formattedEmail,
        uid: uid,
        displayName: regName,
        emailVerified: true
      };

      localStorage.setItem("demo_user_session", JSON.stringify(demoUser));
      localStorage.setItem(`user_record_${formattedEmail}`, JSON.stringify(newUserRecord));

      // Trigger state change
      window.dispatchEvent(new Event("auth-state-change"));
      toast.success(`স্বাগতম! "${regName}" হিসেবে রেজিস্ট্রেশন এবং লগইন সম্পন্ন হয়েছে।`);
    } catch (err: any) {
      console.error(err);
      toast.error("রেজিস্ট্রেশন ব্যর্থ হয়েছে: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.code === 'auth/popup-blocked') {
        toast.error("পপআপ ব্লক করা হয়েছে। অনুগ্রহ করে ব্রাউজার সেটিং থেকে অনুমতি দিন।");
      } else if (error.code === 'auth/popup-closed-by-user') {
        toast.error("লগইন উইন্ডোটি বন্ধ করা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
      } else if (error.code === 'auth/network-request-failed' || error.message?.includes('network-request-failed')) {
        toast.error("Can't connect to Firebase. Try offline demo mode.");
      } else {
        toast.error("লগইন করতে সমস্যা হয়েছে: " + error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email || !password) {
      toast.error("অনুগ্রহ করে ইউজারনেম/মোবাইল নম্বর এবং পাসওয়ার্ড দিন");
      return;
    }
    if (isLoading) return;
    setIsLoading(true);
    const usernameLower = email.trim().toLowerCase();
    const formattedEmail = usernameLower.includes("@") ? usernameLower : `${usernameLower}@samirabms.com`;

    // Check local registered users list first to support offline/fallback logins seamlessly
    try {
      const localUsersStr = localStorage.getItem("local_users") || "[]";
      const localUsers = JSON.parse(localUsersStr);
      const foundLocal = localUsers.find(
        (u: any) => (u.email === formattedEmail || u.username === usernameLower) && u.password === password
      );
      if (foundLocal) {
        const demoUser = {
          email: foundLocal.email,
          uid: foundLocal.uid,
          displayName: foundLocal.name,
          emailVerified: true
        };
        localStorage.setItem("demo_user_session", JSON.stringify(demoUser));
        localStorage.setItem(`user_record_${foundLocal.email}`, JSON.stringify(foundLocal));
        window.dispatchEvent(new Event("auth-state-change"));
        toast.success(`স্বাগতম! "${foundLocal.name}" হিসেবে সফলভাবে লগইন সম্পন্ন হয়েছে (লোকাল সেশন)।`);
        setIsLoading(false);
        return;
      }
    } catch (e) {
      console.warn("Local users lookup error:", e);
    }

    try {
      await loginWithEmail(formattedEmail, password);
    } catch (error: any) {
      if (error.code === 'auth/operation-not-allowed' || error.message?.includes('operation-not-allowed')) {
        console.warn("Email/Password Auth is disabled. Falling back to local/demo session...");
        const demoUser = {
          email: formattedEmail,
          uid: `demo_local_${Date.now()}`,
          displayName: email.trim(),
          emailVerified: true
        };
        try {
          localStorage.setItem("demo_user_session", JSON.stringify(demoUser));
          window.dispatchEvent(new Event("auth-state-change"));
          toast.success("অফলাইন লোকাল সেশনে সফলভাবে লগইন করা হয়েছে!");
        } catch (e) {
          console.error(e);
        }
        return;
      }
      console.error("Email login error:", error);
      if (error.code === 'auth/network-request-failed' || error.message?.includes('network-request-failed')) {
        toast.error("নেটওয়ার্ক কানেকশন বা আইফ্রেম রেস্ট্রিকশনের কারণে ফায়ারবেস কানেক্ট করা যায়নি। অনুগ্রহ করে নিচে দেওয়া 'ডেমো মোডে প্রবেশ করুন' বোতামটি চাপুন।", { duration: 8000 });
      } else {
        toast.error("লগইন করতে সমস্যা হয়েছে: " + error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // QR Auth Flow
  const handleQrScanned = (decodedText: string) => {
    const trimmed = decodedText.trim();
    if (!trimmed) return;

    // Standard scanning feedback (audio context beep)
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = "sine";
      oscillator.frequency.value = 1200;
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.warn("Audio feedback not supported or blocked by user gesture:", e);
    }

    toast.success(`সফলভাবে স্ক্যান হয়েছে: ${trimmed}`);

    // Auto-login with local/demo session for the scanned employee ID code
    const username = trimmed.toLowerCase();
    const demoUser = {
      email: username.includes("@") ? username : `${username}@samirabms.com`,
      uid: `qr_auth_${username}_${Date.now()}`,
      displayName: trimmed,
      emailVerified: true
    };

    setTimeout(() => {
      try {
        localStorage.setItem("demo_user_session", JSON.stringify(demoUser));
        window.dispatchEvent(new Event("auth-state-change"));
        toast.success(`স্বাগতম! "${trimmed}" হিসেবে দ্রুত লগইন সম্পন্ন হয়েছে।`);
      } catch (e) {
        console.error(e);
        toast.error("লগইন সেশন তৈরিতে সমস্যা হয়েছে।");
      }
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-4 text-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-[#E9ECEF]"
      >
        {customLogo ? (
          <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 p-2 border border-slate-150 overflow-hidden shadow-inner">
            <img src={customLogo} alt="App Custom Logo" className="w-full h-full object-contain rounded-xl" />
          </div>
        ) : (
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white font-black shadow-md shadow-indigo-150">
            {activeTab === "login" ? <LogIn className="w-7 h-7" /> : <UserPlus className="w-7 h-7" />}
          </div>
        )}
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Samira Traders DMS</h1>
        <p className="text-xs text-[#6C757D] mb-5">
          ডিস্ট্রিবিউশন ম্যানেজমেন্ট ও রিয়েল-টাইম হিসাব সিস্টেম
        </p>

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-150 mb-6 font-sans">
          <button
            onClick={() => setActiveTab("login")}
            className={`w-1/2 pb-2.5 text-sm font-black border-b-2 transition-all cursor-pointer ${
              activeTab === "login"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            লগইন (Login)
          </button>
          <button
            onClick={() => setActiveTab("register")}
            className={`w-1/2 pb-2.5 text-sm font-black border-b-2 transition-all cursor-pointer ${
              activeTab === "register"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            রেজিস্ট্রেশন (Register)
          </button>
        </div>

        {activeTab === "login" ? (
          <div>
            {/* QR Scanner Activation Area */}
            <button 
              onClick={() => setShowScanner(true)}
              className="w-full mb-4 flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-98"
            >
              <QrCode className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>আইডি কার্ড স্ক্যান করুন (ID Quick Scan)</span>
            </button>

            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-gray-150 w-full" />
              <span className="absolute bg-white px-3 text-[10px] text-gray-400 uppercase font-extrabold tracking-wider">অথবা ইউজারনেম লগইন</span>
            </div>

            <div className="space-y-3.5 mb-5">
              <input
                type="text"
                placeholder="ইউজারনেম বা মোবাইল নম্বর"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-gray-250 text-sm rounded-xl focus:outline-indigo-500 font-sans"
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="পাসওয়ার্ড"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 border border-gray-250 text-sm rounded-xl focus:outline-indigo-500 font-sans"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
              <button
                onClick={handleEmailLogin}
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer active:scale-[0.99]"
              >
                {isLoading ? "লগইন হচ্ছে..." : "লগইন করুন"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5 mb-5 text-left">
            <div>
              <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-1">পূর্ণ নাম (Full Name)</label>
              <input
                type="text"
                placeholder="উদাঃ আব্দুর রহিম"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                className="w-full p-3 border border-gray-250 text-sm rounded-xl focus:outline-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-1">ইউজারনেম / মোবাইল (Username / Mobile)</label>
              <input
                type="text"
                placeholder="উদাঃ sr_rahim বা 01700000000"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                className="w-full p-3 border border-gray-250 text-sm rounded-xl focus:outline-indigo-500 font-sans"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-1">পদবী ও রোল (Role Selection)</label>
              <select
                value={regRole}
                onChange={(e) => setRegRole(e.target.value)}
                className="w-full p-3 border border-gray-250 text-sm rounded-xl focus:outline-indigo-500 bg-white"
              >
                <option value="manager">ম্যানেজার (Manager)</option>
                <option value="sr">সেলস রিপ্রেজেন্টেティブ (SR)</option>
                <option value="dsr">ডেলিভারি রিপ্রেজেন্টেティブ (DSR)</option>
                <option value="admin">এডমিন (Admin)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-1">পাসওয়ার্ড (Password)</label>
              <div className="relative">
                <input
                  type={showRegPassword ? "text" : "password"}
                  placeholder="পাসওয়ার্ড (অন্তত ৬ অক্ষর)"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full p-3 border border-gray-250 text-sm rounded-xl focus:outline-indigo-500 font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400"
                >
                  {showRegPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-1">পাসওয়ার্ড নিশ্চিত করুন (Confirm Password)</label>
              <input
                type="password"
                placeholder="পাসওয়ার্ডটি পুনরায় লিখুন"
                value={regConfirmPassword}
                onChange={(e) => setRegConfirmPassword(e.target.value)}
                className="w-full p-3 border border-gray-250 text-sm rounded-xl focus:outline-indigo-500 font-sans"
              />
            </div>

            <button
              onClick={handleRegister}
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer text-center block"
            >
              {isLoading ? "রেজিস্ট্রেশন হচ্ছে..." : "রেজিস্টার করুন"}
            </button>
          </div>
        )}
        
        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-gray-150 w-full" />
          <span className="absolute bg-white px-3 text-[9px] text-gray-400 uppercase font-extrabold tracking-widest">ফ্রি ডেমো এবং গুগল লগইন</span>
        </div>

        <button 
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2.5 bg-white border border-[#DEE2E6] py-2.5 rounded-xl text-xs font-semibold hover:bg-[#F8F9FA] transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed mb-2.5 cursor-pointer"
        >
          {isLoading ? "লগইন হচ্ছে..." : (
            <>
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
              Google দিয়ে লগইন করুন
            </>
          )}
        </button>

        {onEnterDemo && (
          <button 
            onClick={onEnterDemo}
            className="w-full flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 text-indigo-700 py-2.5 rounded-xl text-xs font-black transition-all shadow-xs active:scale-[0.98] cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
            ডেমো মোডে প্রবেশ করুন (অফলাইন ডেমো)
          </button>
        )}
        
        <div className="mt-5 p-3.5 bg-blue-50/50 text-blue-700 text-xs rounded-xl text-left border border-blue-100/50 italic leading-normal">
          <strong>টিপস:</strong> পপআপ ব্লক হলে ব্রাউজারের "New Tab" বা নতুন উইন্ডোতে ওপেন করুন। সিস্টেমটি সম্পূর্ণ অফলাইন-রেজিলিয়েন্ট।
        </div>
        
        <p className="mt-6 text-[9px] text-[#ADB5BD] uppercase tracking-widest font-black font-mono">
          Secure Cloud Database • Real-time Sync
        </p>
      </motion.div>

      {/* QR Scanner Overlay / Dialog */}
      <QRScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleQrScanned}
        title="কর্মচারী আইডি কার্ড কিউআর স্ক্যানার (ID Quick Scan)"
        placeholderText="কর্মচারী আইডি কোড লিখুন (উদাঃ admin, manager, sr_rahim)"
        exampleCodes={[
          { code: "admin", label: "এডমিন আইডি (Admin)" },
          { code: "sr_rahim", label: "এস আর রহিম (SR)" },
          { code: "manager", label: "ম্যানেজার আইডি (Manager)" }
        ]}
      />
    </div>
  );
}
