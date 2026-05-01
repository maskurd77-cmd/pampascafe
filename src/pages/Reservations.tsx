import React, { useEffect, useState } from "react";
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { safeAwait, OperationType, handleFirestoreError } from "../lib/errorHandler";
import { Trash2, Plus, CalendarCheck, Clock, Phone, User, CalendarDays, X, CheckCircle, Clock3, XCircle } from "lucide-react";

interface Reservation {
  id: string;
  name: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  status: "pending" | "confirmed" | "cancelled";
}

export default function Reservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", date: "", time: "", guests: 2 });

  useEffect(() => {
    const q = query(collection(db, "reservations"), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setReservations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reservation)));
    }, error => handleFirestoreError(error, OperationType.LIST, "reservations"));
    return () => unsub();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const [, err] = await safeAwait(
      addDoc(collection(db, "reservations"), { ...formData, status: "pending" }),
      "حجز تۆمارکرا",
      "هەڵە لە تۆمارکردن",
      OperationType.CREATE, "reservations"
    );
    if (!err) {
      setIsAdding(false);
      setFormData({ name: "", phone: "", date: "", time: "", guests: 2 });
    }
  };

  const setStatus = async (id: string, status: string) => {
    await safeAwait(updateDoc(doc(db, "reservations", id), { status }), "دۆخ گۆڕدرا", "هەڵە", OperationType.UPDATE, "reservations");
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("سڕینەوەی ئەم حجزە؟ ئەمە ناگەڕێتەوە!")) {
      await safeAwait(deleteDoc(doc(db, "reservations", id)), "سڕدرایەوە", "هەڵە", OperationType.DELETE, "reservations");
    }
  };

  return (
    <div className="p-6 lg:p-10 bg-[#f9f9f9] min-h-screen">
      <div className="flex flex-col gap-8 max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 md:p-8 rounded-[16px] shadow-sm border border-neutral-100">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1 text-neutral-900">حجزکردن</h1>
            <p className="text-neutral-500 font-medium">بەڕێوەبردنی خشتەی حجزەکان و کۆنترۆڵی کاتەکان</p>
          </div>
          <button 
             onClick={() => setIsAdding(!isAdding)} 
             className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-[8px] font-bold hover:bg-neutral-800 transition-all active:scale-95 shadow-md text-sm"
          >
            {isAdding ? <X size={18} /> : <Plus size={18} />}
            {isAdding ? "پاشگەزبوونەوە" : "حجزی نوێ"}
          </button>
        </div>

        {isAdding && (
          <form onSubmit={handleAdd} className="bg-white rounded-[16px] border border-neutral-100 shadow-lg p-6 lg:p-8 relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
             <div className="absolute top-0 right-0 w-1.5 h-full bg-black"></div>
             
             <div className="mb-6">
                <h2 className="text-lg font-bold text-neutral-900">تۆمارکردنی حجزێکی نوێ</h2>
                <p className="text-sm text-neutral-500">زانیارییەکانی کڕیار بۆ حجزی مێزەکە پڕبکەرەوە.</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-2">ناوی تەواوی کڕیار</label>
                  <div className="relative">
                     <input 
                        required value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} 
                        placeholder="نموونە: هێمن غەریب" className="w-full border border-neutral-200 rounded-[8px] pl-4 pr-10 py-3 text-sm focus:outline-none focus:border-black transition-colors bg-neutral-50" 
                     />
                     <User size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-2">ژمارە موبایل</label>
                  <div className="relative">
                     <input 
                        required value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} 
                        placeholder="07XX XXX XXXX" className="w-full border border-neutral-200 rounded-[8px] pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-black transition-colors bg-neutral-50 text-left" dir="ltr"
                     />
                     <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-2">بەرواری حجز</label>
                  <div className="relative">
                     <input 
                        required type="date" value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} 
                        className="w-full border border-neutral-200 rounded-[8px] px-4 py-3 text-sm focus:outline-none focus:border-black transition-colors bg-neutral-50"
                     />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-2">کاتی ئامادەبوون</label>
                  <div className="relative">
                     <input 
                        required type="time" value={formData.time} onChange={e=>setFormData({...formData, time: e.target.value})} 
                        className="w-full border border-neutral-200 rounded-[8px] px-4 py-3 text-sm focus:outline-none focus:border-black transition-colors bg-neutral-50"
                     />
                  </div>
                </div>
             </div>

             <div className="flex justify-end mt-8 border-t border-neutral-100 pt-6">
                <button type="submit" className="bg-black text-white px-8 py-3 rounded-[8px] font-bold min-w-[150px] shadow-md hover:bg-neutral-800 transition-all active:scale-95">
                  تۆمارکردن
                </button>
             </div>
          </form>
        )}

        <div className="bg-white rounded-[16px] border border-neutral-100 shadow-sm overflow-hidden relative">
           <div className="overflow-x-auto">
              <table className="w-full text-sm text-right min-w-[700px]">
                 <thead className="bg-[#fcfcfc] border-b border-neutral-100 content-start">
                    <tr>
                       <th className="p-5 font-bold text-xs text-neutral-500 w-[25%]">موستەری / پەیوەندی</th>
                       <th className="p-5 font-bold text-xs text-neutral-500 w-[30%]">کاتی حجز</th>
                       <th className="p-5 font-bold text-xs text-neutral-500 w-[25%]">دۆخی حجز</th>
                       <th className="p-5 font-bold text-xs text-neutral-500 text-center w-[15%]">کردارەکان</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-neutral-100/80">
                    {reservations.map(res => (
                       <tr key={res.id} className="hover:bg-neutral-50 transition-colors group">
                          <td className="p-5">
                             <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-neutral-50 border border-neutral-100 flex items-center justify-center font-bold text-neutral-600 shrink-0">
                                   {res.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col gap-1">
                                   <span className="font-bold text-neutral-900 text-[14px]">{res.name}</span>
                                   <span className="text-xs text-neutral-500 flex items-center gap-1 font-medium" dir="ltr">
                                     <Phone size={10} /> {res.phone}
                                   </span>
                                </div>
                             </div>
                          </td>
                          <td className="p-5">
                             <div className="flex items-center gap-4 text-neutral-700">
                                <div className="flex items-center gap-1.5 bg-[#f9f9f9] border border-neutral-100 px-2 py-1 rounded">
                                   <CalendarDays size={14} className="text-neutral-400" />
                                   <span className="font-bold">{res.date}</span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-[#f9f9f9] border border-neutral-100 px-2 py-1 rounded">
                                   <Clock size={14} className="text-neutral-400" />
                                   <span className="font-bold">{res.time}</span>
                                </div>
                             </div>
                          </td>
                          <td className="p-5 text-center sm:text-right">
                             <div className="relative inline-block w-36">
                                <select 
                                   value={res.status} 
                                   onChange={(e) => setStatus(res.id, e.target.value)}
                                   className={`appearance-none w-full border text-xs font-bold focus:outline-none pl-4 pr-10 py-2 rounded-full cursor-pointer hover:shadow-sm transition-all focus:ring-2 focus:ring-neutral-200 outline-none
                                    ${res.status === 'confirmed' ? 'bg-green-50 text-green-700 border-green-200 focus:border-green-400' : 
                                      res.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200 focus:border-red-400' : 
                                      'bg-orange-50 text-orange-700 border-orange-200 focus:border-orange-400'}
                                   `}
                                >
                                   <option value="pending">لە چاوەڕوانیدایە</option>
                                   <option value="confirmed">پەسەندکرا</option>
                                   <option value="cancelled">هەڵوەشایەوە</option>
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                   {res.status === 'confirmed' && <CheckCircle size={14} className="text-green-500" />}
                                   {res.status === 'cancelled' && <XCircle size={14} className="text-red-500" />}
                                   {res.status === 'pending' && <Clock3 size={14} className="text-orange-500" />}
                                </div>
                             </div>
                          </td>
                          <td className="p-5 text-center">
                             <button 
                                onClick={() => handleDelete(res.id)} 
                                title="سڕینەوە"
                                className="text-neutral-300 hover:text-white hover:bg-red-500 bg-white border border-transparent hover:border-red-200 w-8 h-8 rounded-full transition-all inline-flex items-center justify-center -mr-2"
                             >
                                <Trash2 size={14}/>
                             </button>
                          </td>
                       </tr>
                    ))}
                    {reservations.length === 0 && (
                       <tr>
                          <td colSpan={4} className="py-16 text-center">
                             <div className="flex flex-col items-center gap-3 text-neutral-400">
                                <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center border border-neutral-100">
                                   <CalendarCheck size={24} className="text-neutral-300" />
                                </div>
                                <p className="font-medium text-sm">هیچ خشتەیەکی حجزکردن نییە لەم کاتەدا</p>
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
