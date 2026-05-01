import React, { useEffect, useState } from "react";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import { db, firebaseConfig } from "../lib/firebase";
import { handleFirestoreError, OperationType, safeAwait } from "../lib/errorHandler";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import toast from "react-hot-toast";
import { Users as UsersIcon, UserPlus, Trash2, Mail, Lock, Shield, User, X } from "lucide-react";

interface UserProfile {
  uid: string;
  name: string;
  email: string | null;
  role: "admin" | "staff";
}

export default function Users() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("staff");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    }, e => handleFirestoreError(e, OperationType.LIST, "users"));
    return () => unsub();
  }, []);

  const changeRole = async (uid: string, newRole: string) => {
    await safeAwait(updateDoc(doc(db, "users", uid), { role: newRole }), "ڕۆڵ گۆڕدرا", "هەڵە", OperationType.UPDATE, "users");
  };

  const handleDelete = async (uid: string) => {
    if (window.confirm("دڵنیای لە سڕینەوەی ئەم بەکارهێنەرە لە داتابەیس؟ (پێویستە کارمەندەکە لە بەشی Authentication لە فایەربەیسیش بسڕیتەوە)")) {
      await safeAwait(deleteDoc(doc(db, "users", uid)), "سڕدرایەوە", "هەڵە", OperationType.DELETE, "users");
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Create user using a secondary app to avoid signing out the current admin
      const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newEmail, newPassword);
      const newUid = userCredential.user.uid;
      
      // Sign out the secondary auth so it doesn't leave lingering sessions
      await secondaryAuth.signOut();

      // Save user profile to database
      await setDoc(doc(db, "users", newUid), {
        uid: newUid,
        email: newEmail,
        name: newName,
        role: newRole
      });

      toast.success("بەکارهێنەری نوێ دروستکرا");
      setIsAdding(false);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("staff");
    } catch (error: any) {
      toast.error(error.message || "هەڵەیەک ڕوویدا لە دروستکردنی هەژمارەکەش");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 bg-[#f9f9f9] min-h-screen">
      <div className="flex flex-col gap-8 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 md:p-8 rounded-[16px] shadow-sm border border-neutral-100">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1 text-neutral-900">بەکارهێنەران</h1>
            <p className="text-neutral-500 font-medium">بەڕێوەبردنی ستاف و ئەدمینەکانی کافێ</p>
          </div>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-[8px] font-bold hover:bg-neutral-800 transition-all active:scale-95 shadow-md text-sm"
          >
            {isAdding ? <X size={18} /> : <UserPlus size={18} />}
            {isAdding ? "پاشگەزبوونەوە" : "بەکارهێنەری نوێ"}
          </button>
        </div>

        {isAdding && (
           <form onSubmit={handleAddUser} className="bg-white rounded-[16px] border border-neutral-100 shadow-lg p-6 lg:p-8 relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
              <div className="absolute top-0 right-0 w-1.5 h-full bg-black"></div>
              
              <div className="mb-6">
                 <h2 className="text-lg font-bold text-neutral-900">هەژماری نوێ دروستبکە</h2>
                 <p className="text-sm text-neutral-500">لێرە دەتوانیت هەژمار بۆ کارمەند یان بەڕێوەبەر زیاد بکەیت.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                 <div>
                   <label className="block text-xs font-bold text-neutral-500 mb-2">ناوی تەواو</label>
                   <div className="relative">
                      <input 
                         required value={newName} onChange={e=>setNewName(e.target.value)} 
                         placeholder="نموونە: ئارام ئەحمەد" className="w-full border border-neutral-200 rounded-[8px] pl-4 pr-10 py-3 text-sm focus:outline-none focus:border-black transition-colors bg-neutral-50" 
                      />
                      <User size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                   </div>
                 </div>
                 
                 <div>
                   <label className="block text-xs font-bold text-neutral-500 mb-2">ئیمەیڵ</label>
                   <div className="relative">
                      <input 
                         required type="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} 
                         placeholder="admin@cafe.com" className="w-full border border-neutral-200 rounded-[8px] pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-black transition-colors bg-neutral-50 text-left" dir="ltr"
                      />
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                   </div>
                 </div>

                 <div>
                   <label className="block text-xs font-bold text-neutral-500 mb-2">وشەی تێپەڕ</label>
                   <div className="relative">
                      <input 
                         required type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} 
                         placeholder="لایەنی کەم ٦ پیت/ژمارە" className="w-full border border-neutral-200 rounded-[8px] pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-black transition-colors bg-neutral-50 text-left" dir="ltr"
                      />
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                   </div>
                 </div>

                 <div>
                   <label className="block text-xs font-bold text-neutral-500 mb-2">ڕۆڵی بەکارهێنەر</label>
                   <div className="relative">
                      <select 
                         value={newRole} onChange={e=>setNewRole(e.target.value)} 
                         className="w-full appearance-none border border-neutral-200 rounded-[8px] pl-10 pr-4 py-3 text-sm bg-neutral-50 focus:outline-none focus:border-black font-bold transition-colors"
                      >
                         <option value="staff">کاشێر/کارمەند (Staff)</option>
                         <option value="admin">بەڕێوەبەر (Admin)</option>
                      </select>
                      <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                   </div>
                 </div>
              </div>

              <div className="flex justify-end mt-8 border-t border-neutral-100 pt-6">
                 <button disabled={loading} type="submit" className="bg-black text-white px-8 py-3 rounded-[8px] font-bold disabled:opacity-50 min-w-[150px] shadow-md hover:bg-neutral-800 transition-all active:scale-95">
                   {loading ? "چاوەڕێبە..." : "زەخیرەکردن"}
                 </button>
              </div>
           </form>
        )}
        
        {/* Users Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
           {users.map(u => (
              <div key={u.uid} className="bg-white rounded-[16px] border border-neutral-100 p-6 flex flex-col relative group hover:border-black hover:shadow-lg transition-all">
                 <div className="absolute top-4 left-4">
                    <button 
                       onClick={() => handleDelete(u.uid)} 
                       className="text-neutral-300 hover:text-white hover:bg-red-500 bg-white border border-neutral-100 w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shadow-sm"
                       title="سڕینەوەی ئەم هەژمارە"
                    >
                       <Trash2 size={14}/>
                    </button>
                 </div>
                 
                 <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-full bg-neutral-50 border-2 border-neutral-100 flex items-center justify-center font-black text-xl text-neutral-700 shadow-inner">
                       {u.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                       <h3 className="font-bold text-neutral-900 text-lg leading-tight">{u.name}</h3>
                       <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider">{u.role}</p>
                    </div>
                 </div>
                 
                 <div className="space-y-4 flex-1">
                    <div className="bg-neutral-50 rounded-[8px] p-3 border border-neutral-100">
                       <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">ئیمەیڵ</p>
                       <p className="text-sm font-medium text-neutral-700 truncate" dir="ltr">{u.email}</p>
                    </div>
                    
                    <div>
                       <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5 px-1">گۆڕینی ڕۆڵ</p>
                       <div className="relative">
                          <select 
                             value={u.role} 
                             onChange={e => changeRole(u.uid, e.target.value)}
                             className="w-full appearance-none border border-neutral-200 rounded-[8px] px-3 py-2 text-sm bg-white focus:outline-none focus:border-black font-bold transition-colors cursor-pointer hover:bg-neutral-50"
                          >
                             <option value="admin">بەڕێوەبەر (Admin)</option>
                             <option value="staff">کارمەند (Staff)</option>
                          </select>
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                             <Shield size={14} className={u.role === 'admin' ? "text-red-500" : "text-green-500"} />
                          </div>
                     </div>
                    </div>
                 </div>
              </div>
           ))}

           {users.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-neutral-400 bg-white rounded-[16px] border border-neutral-100 border-dashed gap-4">
                 <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center">
                    <UsersIcon size={24} className="text-neutral-300" />
                 </div>
                 <p className="font-medium">هیچ بەکارهێنەرێک نییە.</p>
              </div>
           )}
        </div>

      </div>
    </div>
  );
}
