import React, { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useNavigate, Navigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success("هەژمار دروستکرا");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success("بە سەرکەوتوویی چوویتە ژوورەوە");
      }
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "کێشەیەک ڕوویدا");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f0f0] p-4" dir="rtl">
      <div className="w-full max-w-md bg-white p-8 border border-neutral-200">
        <div className="text-center mb-8">
          <div className="text-[20px] font-black tracking-[2px] mb-2 uppercase border-2 border-black inline-block px-[10px] py-[5px]">PAMPAS</div>
          <p className="text-neutral-500 text-[14px]">سیستەمی بەڕێوەبردنی کافێ</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">ئیمەیڵ</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-neutral-300 rounded-[4px] focus:outline-none focus:border-black"
              required
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">وشەی تێپەڕ</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-neutral-300 rounded-[4px] focus:outline-none focus:border-black"
              required
              dir="ltr"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white font-bold py-3 px-4 rounded-[4px] hover:bg-neutral-800 transition-colors disabled:opacity-50 mt-4"
          >
            {loading ? "چاوەڕێ بە..." : isRegister ? "دروستکردنی هەژمار" : "چوونە ژوورەوە"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            type="button" 
            onClick={() => setIsRegister(!isRegister)}
            className="text-sm font-medium text-neutral-500 hover:text-black transition-colors"
          >
            {isRegister ? "پێشتر هەژمارت هەیە؟ چوونە ژوورەوە" : "هەژماری نوێ دروست بکە؟ (تەنها بۆ ئەدمین)"}
          </button>
        </div>
      </div>
    </div>
  );
}
