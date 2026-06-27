import { LogIn, Eye, EyeOff } from "lucide-react";
import { signInWithGoogle, loginWithEmail } from "../lib/firebase";
import { motion } from "motion/react";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";

export default function AuthScreen() {
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
      } else {
        toast.error("লগইন করতে সমস্যা হয়েছে: " + error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email || !password) {
      toast.error("অনুগ্রহ করে মোবাইল নম্বর এবং পাসওয়ার্ড দিন");
      return;
    }
    if (isLoading) return;
    setIsLoading(true);
    try {
      // Format phone number to an email structure
      const formattedEmail = `${email}@samirabms.com`;
      await loginWithEmail(formattedEmail, password);
    } catch (error: any) {
      toast.error("লগইন করতে সমস্যা হয়েছে: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-4 text-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-[#E9ECEF]"
      >
        {customLogo ? (
          <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6 p-2 border border-slate-150 overflow-hidden shadow-inner">
            <img src={customLogo} alt="App Custom Logo" className="w-full h-full object-contain rounded-xl" />
          </div>
        ) : (
          <div className="w-16 h-16 bg-[#000] rounded-2xl flex items-center justify-center mx-auto mb-6">
            <LogIn className="text-white w-8 h-8" />
          </div>
        )}
        <h1 className="text-3xl font-bold mb-2">Samira Traders</h1>
        <p className="text-[#6C757D] mb-8">
          ডিস্ট্রিবিউশন ম্যানেজমেন্ট সিস্টেমে স্বাগতম।
        </p>

        <div className="space-y-4 mb-6">
            <input
                type="text"
                placeholder="মোবাইল নম্বর"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border rounded-xl"
            />
            <div className="relative">
                <input
                    type={showPassword ? "text" : "password"}
                    placeholder="পাসওয়ার্ড"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-3 border rounded-xl"
                />
                <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400"
                >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
            </div>
            <button
                onClick={handleEmailLogin}
                disabled={isLoading}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? "লগইন হচ্ছে..." : "লগইন করুন"}
            </button>
        </div>
        
        <button 
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-[#DEE2E6] py-3 rounded-xl font-semibold hover:bg-[#F8F9FA] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "লগইন হচ্ছে..." : (
            <>
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
              Google দিয়ে লগইন করুন
            </>
          )}
        </button>
        
        <div className="mt-6 p-4 bg-blue-50 text-blue-700 text-sm rounded-xl text-left border border-blue-100 italic">
          <strong>টিপস:</strong> আপনি যদি মোবাইল বা আইফ্রেম থেকে ব্যবহার করেন, তবে পপআপ ব্লক হতে পারে। সেক্ষেত্রে ব্রাউজারের "New Tab" এ ওপেন করুন।
        </div>
        
        <p className="mt-8 text-xs text-[#ADB5BD] uppercase tracking-widest font-semibold font-mono">
          Secure Cloud Database • Real-time Sync
        </p>
      </motion.div>
    </div>
  );
}
