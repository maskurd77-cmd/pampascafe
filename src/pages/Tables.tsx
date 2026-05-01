import React, { useState } from "react";
import { usePOSData } from "../hooks/usePOSData";
import { safeAwait, OperationType } from "../lib/errorHandler";
import { collection, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, LayoutGrid, X, Pencil, Check } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export default function Tables() {
  const { tables, loading } = usePOSData();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [isAdding, setIsAdding] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const navigate = useNavigate();

  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [editTableName, setEditTableName] = useState("");

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim()) return;

    const [, err] = await safeAwait(
      addDoc(collection(db, "tables"), { name: newTableName, status: "free" }),
      "مێز زیادکرا",
      "هەڵە لە زیادکردن",
      OperationType.CREATE,
      "tables"
    );

    if (!err) {
      setNewTableName("");
      setIsAdding(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("دڵنیای لە سڕینەوەی ئەم مێزە؟")) {
      await safeAwait(
        deleteDoc(doc(db, "tables", id)),
        "مێز سڕدرایەوە",
        "هەڵە لە سڕینەوە",
        OperationType.DELETE,
        "tables"
      );
    }
  };



  const handleEditSubmit = async (e: React.FormEvent | React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (editTableName.trim() !== '') {
      await safeAwait(
        updateDoc(doc(db, "tables", id), { name: editTableName }),
        "ناوی مێز نوێکرایەوە",
        "هەڵە لە نوێکردنەوە",
        OperationType.UPDATE,
        "tables"
      );
    }
    setEditingTableId(null);
  };

  const startEditing = (e: React.MouseEvent, id: string, currentName: string) => {
    e.stopPropagation();
    setEditingTableId(id);
    setEditTableName(currentName);
  };

  const handleDeleteAll = async () => {
    if (tables.length === 0) return;
    if (window.confirm("ئاگاداری!! دڵنیای لە سڕینەوەی هەموو مێزەکان بەیەکەوە؟ ئەمە ناگەڕێتەوە.")) {
      if (window.prompt("بۆ دڵنیابوونەوە بنووسە 'confirm'") === "confirm") {
        for (const table of tables) {
          await safeAwait(deleteDoc(doc(db, "tables", table.id)), undefined, undefined, OperationType.DELETE, "tables");
        }
        window.alert("هەموو مێزەکان سڕدرانەوە");
      }
    }
  };

  if (loading) return <div className="p-8 text-center text-neutral-500 text-sm mt-20">چاوەڕێبە... خەریکی هێناني داتاکانە</div>;

  return (
    <div className="p-6 lg:p-10 bg-[#f9f9f9] min-h-screen">
      <div className="flex flex-col gap-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 md:p-8 rounded-[16px] shadow-sm border border-neutral-100">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1 text-neutral-900">مێزەکان</h1>
            <p className="text-neutral-500 font-medium">بەڕێوەبردن و کۆنترۆڵکردنی دۆخی مێزەکان</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {isAdmin && (
              <>
                <button 
                  onClick={handleDeleteAll}
                  disabled={tables.length === 0}
                  className="flex items-center gap-2 bg-white text-red-600 px-5 py-2.5 border border-red-200 rounded-[8px] font-bold hover:bg-red-50 transition-colors disabled:opacity-50 text-sm shadow-sm"
                >
                  <Trash2 size={18} />
                  <span className="hidden sm:inline">سڕینەوەی هەمووی</span>
                </button>
                <button 
                  onClick={() => setIsAdding(true)}
                  className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-[8px] font-bold hover:bg-neutral-800 transition-all active:scale-95 shadow-md text-sm"
                >
                  <Plus size={18} /> زیادکردنی مێز
                </button>
              </>
            )}
          </div>
        </div>

        {isAdding && (
           <form onSubmit={handleAddTable} className="p-6 bg-white border border-neutral-100 rounded-[12px] shadow-lg flex flex-col sm:flex-row gap-4 max-w-xl animate-in fade-in slide-in-from-top-4 duration-200">
              <div className="flex-1 text-right">
                <label className="block text-xs font-bold text-neutral-500 mb-2">ناوی مێز</label>
                <input 
                   autoFocus
                   value={newTableName}
                   onChange={(e) => setNewTableName(e.target.value)}
                   placeholder="نموونە: مێزی ژمارە 1"
                   className="w-full border border-neutral-200 rounded-[8px] px-4 py-3 bg-neutral-50 focus:outline-none focus:border-black transition-colors"
                />
              </div>
              <div className="flex items-end gap-2 pb-0.5">
                <button type="submit" disabled={!newTableName} className="bg-black text-white px-8 py-3 rounded-[8px] font-bold hover:bg-neutral-800 transition-all active:scale-95 disabled:opacity-50 h-[46px]">زەخیرە</button>
                <button type="button" onClick={() => setIsAdding(false)} className="bg-white border text-black hover:bg-neutral-50 px-4 py-3 rounded-[8px] font-bold transition-colors h-[46px]">پاشگەزبوونەوە</button>
              </div>
           </form>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {tables.map(table => (
             <div 
                key={table.id} 
                onClick={() => navigate(`/pos?table=${table.id}`)}
                className="bg-white rounded-[16px] border border-neutral-100 p-6 relative group hover:border-black hover:shadow-lg transition-all cursor-pointer overflow-hidden"
             >
                <div className={`absolute top-0 right-0 w-1.5 h-full transition-colors ${table.status === 'free' ? 'bg-green-500' : table.status === 'busy' ? 'bg-red-500' : 'bg-orange-500'}`}></div>
                
                {isAdmin && (
                  <div className="absolute top-3 left-3 flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all z-10">
                    <button 
                       onClick={(e) => startEditing(e, table.id, table.name)}
                       className="text-neutral-400 hover:text-black hover:bg-neutral-100 bg-white border border-neutral-100 w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
                       title="گۆڕینی ناو"
                    >
                       <Pencil size={14} />
                    </button>
                    <button 
                       onClick={(e) => handleDelete(e, table.id)}
                       className="text-neutral-400 hover:text-white hover:bg-red-600 bg-white border border-neutral-100 w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
                       title="سڕینەوە"
                    >
                       <Trash2 size={14} />
                    </button>
                  </div>
                )}
                
                <div className="text-center mt-2 md:mt-4 flex flex-col items-center relative z-10">
                   {editingTableId === table.id ? (
                     <div className="flex flex-col gap-2 mb-4 w-full px-2" onClick={e => e.stopPropagation()}>
                       <input 
                         autoFocus
                         value={editTableName}
                         onChange={(e) => setEditTableName(e.target.value)}
                         onKeyDown={(e) => e.key === 'Enter' && handleEditSubmit(e, table.id)}
                         className="w-full text-center border-b-2 border-black focus:outline-none text-lg font-bold pb-1 bg-transparent"
                       />
                       <div className="flex items-center justify-center gap-2">
                         <button onClick={(e) => handleEditSubmit(e, table.id)} className="w-8 h-8 rounded bg-black text-white flex items-center justify-center"><Check size={16} /></button>
                         <button onClick={() => setEditingTableId(null)} className="w-8 h-8 rounded bg-neutral-200 text-neutral-600 flex items-center justify-center"><X size={16} /></button>
                       </div>
                     </div>
                   ) : (
                     <div className="w-20 h-20 md:w-24 md:h-24 border-[3px] border-neutral-100 rounded-full flex items-center justify-center text-xl md:text-2xl font-black mb-5 bg-gradient-to-b from-white to-neutral-50 shadow-sm group-hover:shadow-md group-hover:border-black/10 transition-all">
                        <span className="text-neutral-800">{table.name}</span>
                     </div>
                   )}
                   
                   <span 
                    className={`inline-block px-4 py-1.5 rounded-full border text-[11px] font-black uppercase tracking-wider z-10 w-24 shadow-sm ${
                      table.status === 'free' ? 'bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0]' :
                      table.status === 'busy' ? 'bg-[#fef2f2] text-[#dc2626] border-[#fecaca]' :
                      'bg-[#fff7ed] text-[#ea580c] border-[#fed7aa]'
                   }`}>
                      {table.status === 'free' ? 'بەتاڵ' : table.status === 'busy' ? 'سەرقاڵ' : 'حجزکراو'}
                   </span>

                   <div className="mt-5 flex flex-col items-center gap-2 w-full">
                     {table.cartItems && table.cartItems.length > 0 ? (
                       <div className="flex flex-col items-center w-full gap-2">
                         <span className="text-xs font-bold text-neutral-800 bg-[#f4f4f5] px-4 py-1.5 rounded-full border border-neutral-200/50 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] w-full block truncate">
                            {table.cartItems.length} داواکاری سەر مێز
                         </span>
                       </div>
                     ) : (
                       <span className="text-neutral-400 text-xs font-medium bg-neutral-50 px-4 py-1.5 rounded-full border border-neutral-100">هیچ داواکارییەک</span>
                     )}
                   </div>
                </div>
             </div>
          ))}
          {tables.length === 0 && (
             <div className="col-span-full py-20 flex flex-col items-center justify-center text-neutral-400 bg-white rounded-[16px] border border-neutral-100 border-dashed gap-4">
                <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center">
                   <LayoutGrid size={24} className="text-neutral-300" />
                </div>
                <p className="font-medium">هیچ مێزێک نییە. مێزێک زیاد بکە بۆ دەستپێکردن.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
