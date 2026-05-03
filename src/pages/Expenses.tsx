import React, { useEffect, useState } from "react";
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { safeAwait, OperationType, handleFirestoreError } from "../lib/errorHandler";
import { Trash, Plus, Receipt, CalendarClock, User, DollarSign, Wallet } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useAppMode } from "../hooks/useAppMode";

interface Expense {
  id: string;
  description: string;
  amount: number;
  createdAt: any;
  user: string;
  department?: 'cafe' | 'atari';
}

export default function Expenses() {
  const { profile } = useAuth();
  const { appMode } = useAppMode();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ description: "", amount: "" });

  useEffect(() => {
    const q = query(collection(db, "expenses"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const allExpenses = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
      setExpenses(allExpenses.filter(e => (e.department || 'cafe') === appMode));
    }, error => handleFirestoreError(error, OperationType.LIST, "expenses"));
    return () => unsub();
  }, [appMode]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount) return;
    
    const [, err] = await safeAwait(
      addDoc(collection(db, "expenses"), { 
         description: formData.description, 
         amount: Number(formData.amount),
         createdAt: serverTimestamp(),
         user: profile?.name || "ستاف",
         department: appMode
      }),
      "تۆمارکرا",
      "هەڵە لە ناو تۆمارکردن",
      OperationType.CREATE, "expenses"
    );
    if (!err) {
      setIsAdding(false);
      setFormData({ description: "", amount: "" });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("سڕینەوەی ئەم خەرجییە؟")) {
      await safeAwait(deleteDoc(doc(db, "expenses", id)), "سڕدرایەوە", "هەڵە", OperationType.DELETE, "expenses");
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

  return (
    <div className="p-6 lg:p-10 bg-[#f9f9f9] min-h-screen">
      <div className="flex flex-col gap-8 max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 md:p-8 rounded-[16px] shadow-sm border border-neutral-100">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1 text-neutral-900">خەرجییەکان</h1>
            <p className="text-neutral-500 font-medium">بەڕێوەبردن و تۆمارکردنی خەرجییەکانی کافێ</p>
          </div>
          <button 
             onClick={() => setIsAdding(!isAdding)} 
             className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-[8px] font-bold hover:bg-neutral-800 transition-all active:scale-95 shadow-md text-sm"
          >
            {isAdding ? <Receipt size={18} /> : <Plus size={18} />}
            {isAdding ? "پاشگەزبوونەوە" : "زیادکردنی خەرجی"}
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           <div className="bg-white p-5 rounded-[12px] border border-neutral-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-600">
                 <Wallet size={20} />
              </div>
              <div>
                 <p className="text-xs font-bold text-neutral-400 mb-1">کۆی گشتی خەرجی</p>
                 <p className="text-xl font-black text-red-600">{totalExpenses.toLocaleString()} <span className="text-[10px]">IQD</span></p>
              </div>
           </div>
           <div className="bg-white p-5 rounded-[12px] border border-neutral-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center text-neutral-600">
                 <Receipt size={20} />
              </div>
              <div>
                 <p className="text-xs font-bold text-neutral-400 mb-1">ژمارەی تۆمارەکان</p>
                 <p className="text-xl font-black text-neutral-900">{expenses.length}</p>
              </div>
           </div>
        </div>

        {isAdding && (
          <form onSubmit={handleAdd} className="bg-white rounded-[12px] border border-neutral-100 shadow-lg p-6 flex flex-col md:flex-row gap-4 animate-in fade-in slide-in-from-top-4 duration-200 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-1.5 h-full bg-black"></div>
             <div className="flex-1">
               <label className="block text-xs font-bold text-neutral-500 mb-2">بابەتی خەرجی</label>
               <input required value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} placeholder="بۆ نموونە: کڕینی قاوە، پاککەرەوە..." className="w-full border border-neutral-200 rounded-[8px] px-4 py-3 text-sm focus:outline-none focus:border-black bg-neutral-50" />
             </div>
             <div className="w-full md:w-64">
               <label className="block text-xs font-bold text-neutral-500 mb-2">بڕی پارە (دینار)</label>
               <input required type="number" value={formData.amount} onChange={e=>setFormData({...formData, amount: e.target.value})} placeholder="0" className="w-full border border-neutral-200 rounded-[8px] px-4 py-3 text-sm focus:outline-none focus:border-black bg-neutral-50" dir="ltr" />
             </div>
             <div className="flex items-end pb-0.5">
               <button type="submit" className="bg-black text-white px-8 py-3 rounded-[8px] font-bold shrink-0 hover:bg-neutral-800 transition-all active:scale-95 h-[46px] w-full md:w-auto shadow-md">
                 تۆمارکردن
               </button>
             </div>
          </form>
        )}

        <div className="bg-white rounded-[16px] border border-neutral-100 shadow-sm overflow-hidden relative">
           <div className="overflow-x-auto">
             <table className="w-full text-right">
                <thead className="bg-[#fcfcfc] border-b border-neutral-100 content-start">
                   <tr>
                      <th className="p-5 font-bold text-xs text-neutral-500">بابەت</th>
                      <th className="p-5 font-bold text-xs text-neutral-500">بڕ (IQD)</th>
                      <th className="p-5 font-bold text-xs text-neutral-500">کات و بەروار</th>
                      <th className="p-5 font-bold text-xs text-neutral-500">تۆمارکەر</th>
                      <th className="p-5 font-bold text-xs text-neutral-500 w-16 text-center">کردار</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100/80">
                   {expenses.map(exp => (
                      <tr key={exp.id} className="hover:bg-neutral-50 transition-colors group">
                         <td className="p-5">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 shrink-0">
                                <Receipt size={14} />
                              </div>
                              <span className="font-bold text-neutral-800 text-[14px]">{exp.description}</span>
                           </div>
                         </td>
                         <td className="p-5 font-black text-red-600 text-[15px]">
                            <div className="flex items-center gap-1">
                               <span>{(exp.amount || 0).toLocaleString()}</span>
                            </div>
                         </td>
                         <td className="p-5">
                            <div className="flex items-center gap-2 text-neutral-500 text-sm">
                               <CalendarClock size={14} className="text-neutral-400" />
                               {exp.createdAt?.toDate ? exp.createdAt.toDate().toLocaleString('en-GB') : 'ئێستا'}
                            </div>
                         </td>
                         <td className="p-5">
                            <div className="flex items-center gap-2">
                               <div className="w-6 h-6 bg-neutral-200 rounded-full flex items-center justify-center shrink-0">
                                  <User size={12} className="text-neutral-600" />
                               </div>
                               <span className="text-sm font-bold text-neutral-600">{exp.user || 'ستاف'}</span>
                            </div>
                         </td>
                         <td className="p-5 text-center">
                            <button 
                               onClick={() => handleDelete(exp.id)} 
                               title="سڕینەوە"
                               className="text-neutral-300 hover:text-white hover:bg-red-500 p-2 rounded-[8px] transition-all"
                            >
                               <Trash size={16}/>
                            </button>
                         </td>
                      </tr>
                   ))}
                   {expenses.length === 0 && (
                      <tr>
                         <td colSpan={5} className="py-16 text-center">
                            <div className="flex flex-col items-center gap-3 text-neutral-400">
                               <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center">
                                  <Receipt size={24} className="text-neutral-300" />
                               </div>
                               <p className="font-medium text-sm">هیچ خەرجییەک تۆمار نەکراوە تا ئێستا</p>
                            </div>
                         </td>
                      </tr>
                   )}
                </tbody>
             </table>
           </div>
        </div>
      </div>
    </div>
  );
}
