import React, { useState } from "react";
import { usePOSData } from "../hooks/usePOSData";
import { safeAwait, OperationType } from "../lib/errorHandler";
import { collection, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Plus, Trash, Grid as GridIcon } from "lucide-react";

export default function Menu() {
  const { categories, menuItems, loading } = usePOSData();
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  
  const [catName, setCatName] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName) return;
    await safeAwait(
      addDoc(collection(db, "categories"), { name: catName, order: categories.length }),
      "بەش زیادکرا",
      "هەڵە",
      OperationType.CREATE, "categories"
    );
    setCatName("");
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || !itemPrice || !selectedCat) return;
    await safeAwait(
      addDoc(collection(db, "menuItems"), { name: itemName, price: Number(itemPrice), categoryId: selectedCat, available: true }),
      "بەرهەم زیادکرا",
      "هەڵە",
      OperationType.CREATE, "menuItems"
    );
    setItemName("");
    setItemPrice("");
  };

  const deleteCategory = async (id: string) => {
    if(!window.confirm("سڕینەوەی ئەم بەشە؟ تێبینی: بەرهەمەکانی ناو ئەم بەشە نامێنن ئەگەر بیسڕیتەوە.")) return;
    await safeAwait(deleteDoc(doc(db, "categories", id)), "سڕدرایەوە", "هەڵە", OperationType.DELETE, "categories");
    if (selectedCat === id) setSelectedCat(null);
  };

  const deleteItem = async (id: string) => {
    if(!window.confirm("سڕینەوەی ئەم بەرهەمە؟")) return;
    await safeAwait(deleteDoc(doc(db, "menuItems", id)), "سڕدرایەوە", "هەڵە", OperationType.DELETE, "menuItems");
  };

  const handleDeleteAllMenu = async () => {
    if (categories.length === 0 && menuItems.length === 0) return;
    if (window.confirm("ئاگاداری!! دڵنیای لە سڕینەوەی هەموو بەشەکانی مێنۆ و خواردنەکانی ناوی بەیەکەوە؟ ئەمە ناگەڕێتەوە.")) {
      if (window.prompt("بۆ دڵنیابوونەوە بنووسە 'confirm'") === "confirm") {
        for (const item of menuItems) {
          await safeAwait(deleteDoc(doc(db, "menuItems", item.id)), undefined, undefined, OperationType.DELETE, "menuItems");
        }
        for (const cat of categories) {
          await safeAwait(deleteDoc(doc(db, "categories", cat.id)), undefined, undefined, OperationType.DELETE, "categories");
        }
        setSelectedCat(null);
        window.alert("هەموو مێنۆکە سڕدرایەوە");
      }
    }
  };

  const currentItems = menuItems.filter(i => i.categoryId === selectedCat);

  if (loading) return <div className="p-8 text-center text-sm text-neutral-500 mt-20">چاوەڕێبە... خەریکی هێناني داتاکانە</div>;

  return (
    <div className="p-6 lg:p-10 h-[calc(100vh-4rem)] lg:h-screen flex flex-col bg-[#f9f9f9]">
      <div className="mb-8 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-1">مێنۆ</h1>
          <p className="text-neutral-500 text-sm">بەڕێوەبردنی بەشەکان و خواردنەکان بۆ کافێکەت</p>
        </div>
        <button 
           onClick={handleDeleteAllMenu}
           disabled={categories.length === 0 && menuItems.length === 0}
           className="bg-white text-red-600 px-4 py-2 border border-red-200 rounded-[4px] font-bold hover:bg-red-50 transition-colors disabled:opacity-50 text-sm"
        >
           سڕینەوەی هەمووی
        </button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-8 min-h-0">
         {/* Categories */}
         <div className="w-full md:w-[320px] bg-white border border-neutral-200 shadow-sm flex flex-col rounded-[8px] overflow-hidden shrink-0 h-full">
            <div className="p-5 border-b border-neutral-100 font-black text-lg bg-white shrink-0 flex items-center gap-2">
               بەشەکانی مێنۆ
            </div>
            
            <form onSubmit={handleAddCategory} className="p-4 border-b border-neutral-100 bg-neutral-50 flex gap-2 shrink-0">
               <input 
                  value={catName} onChange={e=>setCatName(e.target.value)} 
                  placeholder="ناوی بەشی نوێ..." className="w-full border border-neutral-200 rounded-[4px] px-3 py-2 text-sm focus:outline-none focus:border-black bg-white transition-colors"
               />
               <button type="submit" disabled={!catName} className="bg-black text-white px-4 py-2 rounded-[4px] hover:bg-neutral-800 transition-colors disabled:opacity-50 font-bold"><Plus size={18}/></button>
            </form>

            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
               {categories.map(cat => (
                 <div 
                   key={cat.id} 
                   onClick={() => setSelectedCat(cat.id)}
                   className={`flex justify-between items-center px-4 py-3 cursor-pointer rounded-[6px] border border-transparent transition-all ${
                     selectedCat === cat.id 
                       ? 'bg-black text-white font-bold shadow-md' 
                       : 'bg-white text-neutral-700 hover:border-black hover:bg-neutral-50'
                   }`}
                 >
                    <span className="text-[15px]">{cat.name}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteCategory(cat.id); }} 
                      className={`p-1.5 rounded-[4px] transition-colors ${selectedCat === cat.id ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-neutral-400 hover:text-red-600 hover:bg-red-50'}`}
                    >
                      <Trash size={16}/>
                    </button>
                 </div>
               ))}
               {categories.length === 0 && <p className="text-sm p-4 text-center text-neutral-400">هیچ بەشێک نییە</p>}
            </div>
         </div>

         {/* Items */}
         <div className="flex-1 bg-white rounded-[8px] border border-neutral-200 shadow-sm flex flex-col overflow-hidden h-full">
            <div className="p-5 border-b border-neutral-100 bg-white shrink-0 flex items-center justify-between">
               <h2 className="font-black text-lg">
                 {selectedCat ? categories.find(c=>c.id===selectedCat)?.name : "بەرهەمەکان"}
               </h2>
               {selectedCat && (
                 <span className="text-xs font-bold text-neutral-400 px-3 py-1 bg-neutral-100 rounded-full">{currentItems.length} بەرهەم</span>
               )}
            </div>

            {selectedCat ? (
               <>
                 <form onSubmit={handleAddItem} className="p-5 border-b border-neutral-100 bg-neutral-50 flex flex-col sm:flex-row gap-4 shrink-0 items-end">
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-bold text-neutral-500 mb-1.5">ناوی خواردن / بەرهەم</label>
                      <input 
                         value={itemName} onChange={e=>setItemName(e.target.value)} 
                         placeholder="نموونە: کاپوچینۆ" className="w-full border border-neutral-200 rounded-[4px] px-4 py-2 text-sm focus:outline-none focus:border-black transition-colors"
                      />
                    </div>
                    <div className="w-full sm:w-48">
                      <label className="block text-xs font-bold text-neutral-500 mb-1.5">نرخ بە دینار</label>
                      <input 
                         type="number" value={itemPrice} onChange={e=>setItemPrice(e.target.value)} 
                         placeholder="3000" className="w-full border border-neutral-200 rounded-[4px] px-4 py-2 text-sm focus:outline-none focus:border-black transition-colors text-right" dir="ltr"
                      />
                    </div>
                    <button type="submit" disabled={!itemName || !itemPrice} className="w-full sm:w-auto bg-black text-white px-8 py-2 rounded-[4px] hover:bg-neutral-800 transition-colors disabled:opacity-50 font-bold flex items-center justify-center gap-2 h-[38px]">
                      <Plus size={16} /> زیادکردن
                    </button>
                 </form>

                 <div className="flex-1 overflow-y-auto p-5 bg-[#fcfcfc]">
                    {currentItems.length === 0 ? (
                       <div className="h-full flex flex-col items-center justify-center text-neutral-400 gap-3">
                          <GridIcon size={40} className="text-neutral-200" />
                          <p className="text-sm">هیچ بەرهەمێک لەم بەشەدا نییە. دانەیەک زیاد بکە لە سەرەوە.</p>
                       </div>
                    ) : (
                       <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                          {currentItems.map(item => (
                             <div key={item.id} className="bg-white border border-neutral-200 p-5 rounded-[6px] flex flex-col justify-between gap-4 relative group hover:border-black hover:shadow-md transition-all">
                                <button 
                                  onClick={() => deleteItem(item.id)} 
                                  className="absolute top-3 left-3 text-red-500 hover:bg-red-50 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash size={16}/>
                                </button>
                                <div>
                                  <h3 className="font-bold text-[16px] text-neutral-900 pr-2">{item.name}</h3>
                                </div>
                                <div className="text-neutral-500 font-bold text-sm bg-neutral-50 self-start px-2 py-1 rounded-[4px] border border-neutral-100">
                                  {item.price.toLocaleString()} IQD
                                </div>
                             </div>
                          ))}
                       </div>
                    )}
                 </div>
               </>
            ) : (
               <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 bg-[#fcfcfc] gap-4">
                  <div className="w-16 h-16 border-2 border-dashed border-neutral-300 rounded-full flex items-center justify-center">
                    <Plus size={24} className="text-neutral-300" />
                  </div>
                  <p className="text-sm">تکایە بەشێک هەڵبژێرە لە لیستەکە بۆ بینین و زیادکردنی بەرهەمەکان</p>
               </div>
            )}
         </div>
      </div>
    </div>
  );
}
