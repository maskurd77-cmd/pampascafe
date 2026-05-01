import React, { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, getDocs, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { WalletCards, Plus, Search, User, Phone, Trash2, ArrowLeft, Receipt, Check, History } from "lucide-react";
import toast from "react-hot-toast";
import { safeAwait, OperationType } from "../lib/errorHandler";

interface Customer {
  id: string;
  name: string;
  phone: string;
  totalDebt: number;
  createdAt: any;
}

interface DebtRecord {
  id: string;
  amount: number;
  type: 'debt' | 'payment';
  date: any;
  note: string;
}

export default function Debts() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [records, setRecords] = useState<DebtRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

  useEffect(() => {
    const q = query(collection(db, "customers"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setCustomers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!selectedCustomer) return;
    setLoadingRecords(true);
    const q = query(collection(db, `customers/${selectedCustomer.id}/debts`), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setRecords(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DebtRecord)));
      setLoadingRecords(false);
    });
    return unsub;
  }, [selectedCustomer]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return;
    
    await safeAwait(
      addDoc(collection(db, "customers"), {
        name: newCustomerName,
        phone: newCustomerPhone,
        totalDebt: 0,
        createdAt: serverTimestamp()
      }),
      "کڕیاری نوێ زیادکرا",
      "هەڵە لە زیادکردن",
      OperationType.CREATE,
      "customers"
    );
    
    setIsAddingCustomer(false);
    setNewCustomerName("");
    setNewCustomerPhone("");
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !paymentAmount || isNaN(Number(paymentAmount))) return;
    const amount = Number(paymentAmount);
    if (amount <= 0) return;

    try {
      await addDoc(collection(db, `customers/${selectedCustomer.id}/debts`), {
        amount,
        type: 'payment',
        note: paymentNote || 'پێدانی قەرز',
        date: serverTimestamp()
      });

      await updateDoc(doc(db, "customers", selectedCustomer.id), {
        totalDebt: Math.max(0, (selectedCustomer.totalDebt || 0) - amount)
      });
      
      toast.success("پارەدان با سەرکەوتوویی تۆمارکرا");
      setPaymentAmount("");
      setPaymentNote("");
    } catch (e) {
      toast.error("هەڵەیەک ڕوویدا");
    }
  };

  const handleDeleteCustomer = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("دڵنیای لە سڕینەوەی ئەم کڕیارە بە تەواوی قەرزەکانییەوە؟")) {
      await safeAwait(deleteDoc(doc(db, "customers", id)), "سڕایەوە", "هەڵە هەیە", OperationType.DELETE, "customers");
      if (selectedCustomer?.id === id) setSelectedCustomer(null);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.includes(search) || c.phone.includes(search)
  );

  return (
    <div className="h-full flex flex-col p-4 md:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 sm:p-8 rounded-[16px] border border-neutral-100 shadow-sm shrink-0">
          <div>
            <h1 className="text-3xl font-black mb-2 text-neutral-900 flex items-center gap-3">
              <WalletCards className="text-neutral-400" />
              بەڕێوەبردنی قەرزەکان
            </h1>
            <p className="text-neutral-500 font-medium">پڕۆفایلی قەرزارەکان و پارەدانەکان لێرە بەڕێوەببە</p>
          </div>
          <button 
            onClick={() => setIsAddingCustomer(true)}
            className="flex items-center gap-2 bg-black text-white px-5 py-3 rounded-[10px] font-bold shadow-md hover:bg-neutral-800 transition-all active:scale-95"
          >
            <Plus size={20} />
            زیادکردنی کڕیار
          </button>
        </div>

        {/* Content */}
        {!selectedCustomer ? (
          <div className="flex-1 bg-white rounded-[16px] border border-neutral-100 shadow-sm flex flex-col overflow-hidden">
             <div className="p-4 border-b border-neutral-100 flex gap-4 shrink-0 bg-neutral-50/50">
               <div className="relative flex-1">
                 <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                 <input 
                   type="text"
                   value={search}
                   onChange={e => setSearch(e.target.value)}
                   placeholder="گەڕان بۆ ناو یان ژمارە مۆبایل..."
                   className="w-full pl-4 pr-12 py-3 rounded-[10px] border border-neutral-200 focus:outline-none focus:border-black bg-white transition-colors"
                 />
               </div>
             </div>
             
             <div className="flex-1 overflow-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 content-start">
                {loading ? <p className="col-span-full py-10 text-center text-neutral-400">چاوەڕێبە...</p> : 
                  filteredCustomers.length === 0 ? (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-neutral-400">
                      <WalletCards size={48} className="mb-4 opacity-50" />
                      <p className="font-bold text-lg">هیچ کڕیارێک نەدۆزرایەوە</p>
                    </div>
                  ) : filteredCustomers.map(customer => (
                  <div 
                    key={customer.id} 
                    onClick={() => setSelectedCustomer(customer)}
                    className="group bg-white border border-neutral-200 rounded-[16px] p-5 cursor-pointer hover:border-black hover:shadow-lg transition-all flex flex-col gap-4 relative overflow-hidden active:scale-[0.98]"
                  >
                    <div className="flex justify-between items-start z-10">
                      <div className="w-12 h-12 bg-neutral-50 border border-neutral-100 rounded-full flex items-center justify-center text-neutral-600 group-hover:bg-black group-hover:text-white transition-colors">
                        <User size={24} />
                      </div>
                      <button 
                        onClick={(e) => handleDeleteCustomer(e, customer.id)}
                        className="text-neutral-300 hover:text-red-500 transition-colors p-2"
                      >
                         <Trash2 size={18} />
                      </button>
                    </div>
                    <div className="z-10">
                      <h3 className="font-black text-lg text-neutral-900 group-hover:text-black transition-colors">{customer.name}</h3>
                      {customer.phone && <p className="text-sm font-medium text-neutral-400 mt-1" dir="ltr">{customer.phone}</p>}
                    </div>
                    <div className="mt-2 pt-4 border-t border-dashed border-neutral-200 z-10">
                      <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider mb-1">کۆی قەرز</p>
                      <p className={`font-black text-xl ${customer.totalDebt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {customer.totalDebt.toLocaleString()} د.ع
                      </p>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        ) : (
          <div className="flex-1 bg-white rounded-[16px] border border-neutral-100 shadow-sm flex flex-col lg:flex-row overflow-hidden">
             
             {/* Customer Details Left Panel */}
             <div className="w-full lg:w-[350px] border-b lg:border-b-0 lg:border-l border-neutral-100 bg-[#fefefe] flex flex-col shrink-0">
               <div className="p-6 border-b border-neutral-100 flex items-center gap-4">
                 <button 
                   onClick={() => setSelectedCustomer(null)}
                   className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center hover:bg-neutral-200 transition-colors active:scale-95"
                 >
                   <ArrowLeft size={20} className="text-neutral-600" />
                 </button>
                 <div>
                   <h2 className="font-black text-xl text-neutral-900">{selectedCustomer.name}</h2>
                   <p className="text-sm text-neutral-500 font-medium">پڕۆفایلی کڕیار</p>
                 </div>
               </div>
               
               <div className="p-6 border-b border-neutral-100 flex flex-col items-center justify-center text-center gap-2 bg-gradient-to-b from-transparent to-neutral-50/50">
                   <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest">پاشماوەی قەرز</p>
                   <p className={`text-4xl font-black ${selectedCustomer.totalDebt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                     {selectedCustomer.totalDebt.toLocaleString()}
                   </p>
                   <span className="text-xs font-bold text-neutral-400 bg-white px-3 py-1 rounded-full shadow-sm border border-neutral-200">IQD</span>
               </div>

               <div className="p-6 flex-1 bg-white">
                 <h3 className="font-black text-[15px] mb-4 text-neutral-800">تۆمارکردنی پارەدان (گەڕانەوە)</h3>
                 <form onSubmit={handleAddPayment} className="flex flex-col gap-4">
                   <div>
                     <label className="block text-xs font-bold text-neutral-600 mb-2">بڕی پارە (دینار)</label>
                     <input 
                       type="number"
                       value={paymentAmount}
                       onChange={e => setPaymentAmount(e.target.value)}
                       placeholder="بڕی پارە..."
                       className="w-full border border-neutral-200 rounded-[10px] px-4 py-3 focus:border-black focus:outline-none bg-[#f4f4f5] font-mono text-left"
                       dir="ltr"
                     />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-neutral-600 mb-2">تێبینی</label>
                     <input 
                       type="text"
                       value={paymentNote}
                       onChange={e => setPaymentNote(e.target.value)}
                       placeholder="بۆ نموونە: پارەی قەرزی مانگی..."
                       className="w-full border border-neutral-200 rounded-[10px] px-4 py-3 focus:border-black focus:outline-none bg-white font-medium"
                     />
                   </div>
                   <button 
                     type="submit"
                     disabled={!paymentAmount || Number(paymentAmount) <= 0 || selectedCustomer.totalDebt <= 0}
                     className="w-full bg-green-600 hover:bg-green-700 text-white p-3.5 rounded-[10px] font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                   >
                     <Check size={20} /> تۆمارکردنی پارەدان
                   </button>
                 </form>
               </div>
             </div>

             {/* Right Panel History */}
             <div className="flex-1 flex flex-col bg-[#fcfcfc]">
                <div className="p-6 border-b border-neutral-100 flex items-center gap-3 bg-white">
                   <div className="w-10 h-10 bg-neutral-100 rounded-[10px] flex items-center justify-center">
                     <History size={18} className="text-neutral-600" />
                   </div>
                   <h3 className="font-black text-lg text-neutral-900">مێژووی مامەڵەکان</h3>
                </div>
                <div className="flex-1 overflow-auto p-6 space-y-4">
                   {loadingRecords ? <p className="text-neutral-400">چاوەڕێبە...</p> : 
                    records.length === 0 ? <p className="text-neutral-400 py-10 text-center font-bold">هیچ مامەڵەیەک نییە</p> :
                    records.map(r => (
                      <div key={r.id} className="bg-white border text-sm font-bold border-neutral-100 rounded-[12px] p-4 flex justify-between items-center shadow-sm">
                         <div className="flex items-center gap-3">
                           <div className={`w-12 h-12 rounded-[10px] flex items-center justify-center ${r.type === 'debt' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                             {r.type === 'debt' ? <WalletCards size={20} /> : <Check size={20} />}
                           </div>
                           <div>
                             <p className={`font-black ${r.type === 'debt' ? 'text-red-700' : 'text-green-700'}`}>
                               {r.type === 'debt' ? 'کڕینی بە قەرز' : 'پێدانی قەرز'}
                             </p>
                             <div className="flex gap-2 text-xs font-medium text-neutral-400 mt-1">
                               <span>{new Date(r.date?.toDate()).toLocaleString('ku')}</span>
                               {r.note && <span className="bg-neutral-100 px-2 py-0.5 rounded text-neutral-600">{r.note}</span>}
                             </div>
                           </div>
                         </div>
                         <div className={`font-black text-lg ${r.type === 'debt' ? 'text-red-600' : 'text-green-600'}`} dir="ltr">
                           {r.type === 'debt' ? '+' : '-'}{r.amount.toLocaleString()} <span className="text-xs text-neutral-400 font-bold ml-1">IQD</span>
                         </div>
                      </div>
                    ))
                   }
                </div>
             </div>
          </div>
        )}
      </div>

      {isAddingCustomer && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateCustomer} className="bg-white rounded-[24px] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center"><User size={24} /></div>
                  <h2 className="text-2xl font-black">کڕیاری نوێ</h2>
                </div>
                <button type="button" onClick={() => setIsAddingCustomer(false)} className="text-neutral-400 hover:text-black hover:bg-neutral-100 w-8 h-8 flex items-center justify-center rounded-full transition-colors"><Trash2 size={20} className="hidden" /><ArrowLeft size={20}/></button>
             </div>
             
             <div className="space-y-5">
               <div>
                 <label className="block text-sm font-bold text-neutral-700 mb-2">ناوی کڕیار</label>
                 <input 
                   autoFocus
                   type="text"
                   value={newCustomerName}
                   onChange={e => setNewCustomerName(e.target.value)}
                   className="w-full border-2 border-neutral-200 rounded-[12px] px-4 py-3.5 focus:border-black focus:outline-none bg-neutral-50 transition-colors font-bold"
                   placeholder="بۆ نموونە: ئەحمەد"
                 />
               </div>
               <div>
                 <label className="block text-sm font-bold text-neutral-700 mb-2">ژمارە مۆبایل (ئارەزوومەندانە)</label>
                 <input 
                   type="text"
                   dir="ltr"
                   value={newCustomerPhone}
                   onChange={e => setNewCustomerPhone(e.target.value)}
                   className="w-full border-2 border-neutral-200 rounded-[12px] px-4 py-3.5 focus:border-black focus:outline-none bg-neutral-50 transition-colors text-left font-mono"
                   placeholder="0750..."
                 />
               </div>
               
               <button 
                 type="submit"
                 disabled={!newCustomerName.trim()}
                 className="w-full bg-black text-white p-4 flex items-center justify-center gap-2 rounded-[12px] font-bold shadow-xl shadow-black/10 hover:bg-neutral-800 transition-all active:scale-95 disabled:opacity-50 mt-4"
               >
                 <Plus size={20} /> پاشەکەوتکردن
               </button>
             </div>
          </form>
        </div>
      )}

    </div>
  );
}
