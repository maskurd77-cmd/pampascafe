import React, { useState } from "react";
import { usePOSData } from "../hooks/usePOSData";
import { safeAwait, OperationType } from "../lib/errorHandler";
import { collection, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Plus, Trash, Grid as GridIcon, Pencil, X } from "lucide-react";
import { useAppMode } from "../hooks/useAppMode";

export default function Menu() {
  const { categories, menuItems, loading } = usePOSData();
  const { appMode } = useAppMode();
  
  const filteredCategories = appMode === 'atari' 
    ? categories 
    : categories.filter(c => (c.department || 'cafe') === 'cafe');

  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  
  const [catName, setCatName] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCostPrice, setItemCostPrice] = useState("");

  const [editingItem, setEditingItem] = useState<{ id: string, name: string, price: string, costPrice: string } | null>(null);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName) return;
    await safeAwait(
      addDoc(collection(db, "categories"), { name: catName, order: categories.length, department: appMode }),
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
      addDoc(collection(db, "menuItems"), { 
        name: itemName, 
        price: Number(itemPrice), 
        costPrice: Number(itemCostPrice) || 0,
        categoryId: selectedCat, 
        available: true 
      }),
      "بەرهەم زیادکرا",
      "هەڵە",
      OperationType.CREATE, "menuItems"
    );
    setItemName("");
    setItemPrice("");
    setItemCostPrice("");
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    await safeAwait(
      updateDoc(doc(db, "menuItems", editingItem.id), {
        name: editingItem.name,
        price: Number(editingItem.price),
        costPrice: Number(editingItem.costPrice) || 0,
      }),
      "بەرهەم نوێکرایەوە",
      "هەڵە",
      OperationType.UPDATE, "menuItems"
    );
    setEditingItem(null);
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
    if (filteredCategories.length === 0 && menuItems.length === 0) return;
    if (window.confirm("ئاگاداری!! دڵنیای لە سڕینەوەی هەموو بەشەکانی مێنۆ و خواردنەکانی ناوی بەیەکەوە؟ ئەمە ناگەڕێتەوە.")) {
      if (window.prompt("بۆ دڵنیابوونەوە بنووسە 'confirm'") === "confirm") {
        for (const item of menuItems) {
          await safeAwait(deleteDoc(doc(db, "menuItems", item.id)), undefined, undefined, OperationType.DELETE, "menuItems");
        }
        for (const cat of filteredCategories) {
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
           disabled={filteredCategories.length === 0 && menuItems.length === 0}
           className="bg-white text-red-600 px-4 py-2 border border-red-200 rounded-[4px] font-bold hover:bg-red-50 transition-colors disabled:opacity-50 text-sm"
        >
           سڕینەوەی هەمووی
        </button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-8 min-h-0">
         {/* Categories */}
         <div className="w-full md:w-[320px] bg-white border border-neutral-200 shadow-sm flex flex-col rounded-[8px] shrink-0 md:h-full">
            <div className="p-5 border-b border-neutral-100 font-black text-lg bg-white shrink-0 flex items-center gap-2">
               بەشەکانی مێنۆ
            </div>
            
            <form onSubmit={handleAddCategory} className="p-4 border-b border-neutral-100 bg-neutral-50 flex gap-2 shrink-0">
               <input 
                  value={catName} onChange={e=>setCatName(e.target.value)} 
                  placeholder="ناوی بەشی نوێ..." className="w-full border border-neutral-200 rounded-[4px] px-3 py-2 text-sm focus:outline-none focus:border-black bg-white transition-colors"
               />
               <button type="submit" disabled={!catName} className="bg-black text-white px-4 py-2 rounded-[4px] hover:bg-neutral-800 transition-colors disabled:opacity-50 font-bold shrink-0"><Plus size={18}/></button>
            </form>

            <div className="md:flex-1 overflow-x-auto md:overflow-x-hidden md:overflow-y-auto w-full px-3 py-3 flex flex-row md:flex-col gap-2 md:gap-1 disable-scrollbars">
               {filteredCategories.map(cat => (
                 <div 
                   key={cat.id} 
                   onClick={() => setSelectedCat(cat.id)}
                   className={`flex justify-between items-center px-4 py-3 cursor-pointer rounded-[6px] border border-transparent transition-all shrink-0 group ${
                     selectedCat === cat.id 
                       ? 'bg-black text-white font-bold shadow-md' 
                       : 'bg-white text-neutral-700 hover:border-black hover:bg-neutral-50 border-neutral-200 shadow-sm md:border-transparent md:shadow-none'
                   }`}
                 >
                    <span className="text-[15px] whitespace-nowrap ml-2 opacity-90">{cat.name}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteCategory(cat.id); }} 
                      className={`p-2 w-8 h-8 flex items-center justify-center rounded-md transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100 shrink-0 ${selectedCat === cat.id ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-neutral-400 hover:text-red-600 hover:bg-red-50'}`}
                    >
                      <Trash size={16}/>
                    </button>
                 </div>
               ))}
               {filteredCategories.length === 0 && <p className="text-sm p-4 text-center text-neutral-400 w-full shrink-0">هیچ بەشێک نییە</p>}
            </div>
         </div>

         {/* Items */}
         <div className="flex-1 bg-white rounded-[8px] border border-neutral-200 shadow-sm flex flex-col overflow-hidden h-full">
            <div className="p-5 border-b border-neutral-100 bg-white shrink-0 flex items-center justify-between">
               <h2 className="font-black text-lg">
                 {selectedCat ? filteredCategories.find(c=>c.id===selectedCat)?.name : "بەرهەمەکان"}
               </h2>
               {selectedCat && (
                 <span className="text-xs font-bold text-neutral-400 px-3 py-1 bg-neutral-100 rounded-full">{currentItems.length} بەرهەم</span>
               )}
            </div>

            {selectedCat ? (
               <>
                 <form onSubmit={handleAddItem} className="p-5 border-b border-neutral-100 bg-neutral-50 flex flex-col sm:grid sm:grid-cols-4 gap-4 shrink-0 items-end">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-neutral-500 mb-1.5">ناوی خواردن / بەرهەم</label>
                      <input 
                         value={itemName} onChange={e=>setItemName(e.target.value)} 
                         placeholder="نموونە: کاپوچینۆ" className="w-full border border-neutral-200 rounded-[4px] px-4 py-2 text-sm focus:outline-none focus:border-black transition-colors bg-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 mb-1.5">تێچوو (Cost)</label>
                      <input 
                         type="number" value={itemCostPrice} onChange={e=>setItemCostPrice(e.target.value)} 
                         placeholder="2000" className="w-full border border-neutral-200 rounded-[4px] px-4 py-2 text-sm focus:outline-none focus:border-black transition-colors text-right bg-white font-bold" dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 mb-1.5">نرخی فرۆشتن</label>
                      <input 
                         type="number" value={itemPrice} onChange={e=>setItemPrice(e.target.value)} 
                         placeholder="3000" className="w-full border border-neutral-200 rounded-[4px] px-4 py-2 text-sm focus:outline-none focus:border-black transition-colors text-right bg-white font-bold" dir="ltr"
                      />
                    </div>
                    <div className="col-span-full mt-2">
                       <button type="submit" disabled={!itemName || !itemPrice} className="w-full bg-black text-white px-8 py-3 rounded-[4px] hover:bg-neutral-800 transition-colors disabled:opacity-50 font-bold flex items-center justify-center gap-2 shadow-sm">
                         <Plus size={18} /> زەیادکردنی ئەم بەرهەمە بۆ لیستی {filteredCategories.find(c=>c.id===selectedCat)?.name}
                       </button>
                    </div>
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
                                <div className="absolute top-2 left-2 flex gap-1 bg-white/90 backdrop-blur-sm rounded-lg p-1 shadow-sm opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity border border-neutral-100">
                                  <button 
                                    onClick={() => setEditingItem({ id: item.id, name: item.name, price: item.price.toString(), costPrice: (item.costPrice || 0).toString() })} 
                                    className="text-neutral-500 hover:text-blue-600 hover:bg-blue-50 w-8 h-8 flex items-center justify-center rounded-md transition-colors"
                                  >
                                    <Pencil size={18}/>
                                  </button>
                                  <button 
                                    onClick={() => deleteItem(item.id)} 
                                    className="text-neutral-500 hover:text-red-600 hover:bg-red-50 w-8 h-8 flex items-center justify-center rounded-md transition-colors"
                                  >
                                    <Trash size={18}/>
                                  </button>
                                </div>
                                <div>
                                  <h3 className="font-bold text-[16px] text-neutral-900 pr-2">{item.name}</h3>
                                </div>
                                <div className="flex flex-col gap-2 pt-2 border-t border-neutral-50 mt-auto">
                                   <div className="flex justify-between items-center text-xs font-bold">
                                      <span className="text-neutral-400">تێچوو:</span>
                                      <span className="text-neutral-500">{item.costPrice?.toLocaleString() || 0} د.ع</span>
                                   </div>
                                   <div className="flex justify-between items-center">
                                      <span className="text-xs font-bold text-neutral-400">نرخی فرۆشتن:</span>
                                      <span className="text-black font-black text-[16px]">{item.price.toLocaleString()} د.ع</span>
                                   </div>
                                   <div className="flex justify-between items-center pt-2 border-t border-dashed border-neutral-100">
                                      <span className="text-[10px] font-black text-green-600 uppercase">قازانج:</span>
                                      <span className="text-green-600 font-bold text-xs">{(item.price - (item.costPrice || 0)).toLocaleString()} د.ع</span>
                                   </div>
                                </div>
                             </div>
                          ))}
                       </div>
                    )}
                 </div>
               </>
            ) : (
                 <div className="flex-1 overflow-y-auto p-5 bg-[#fcfcfc]">
                    {menuItems.filter(i => filteredCategories.some(c => c.id === i.categoryId)).length === 0 ? (
                       <div className="h-full flex flex-col items-center justify-center text-neutral-400 gap-3">
                          <GridIcon size={40} className="text-neutral-200" />
                          <p className="text-sm">هیچ بەرهەمێک لە مێنۆکەدا نییە. تکایە بەشێک هەڵبژێرە و بەرهەم زیاد بکە.</p>
                       </div>
                    ) : (
                       <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                          {menuItems.filter(i => filteredCategories.some(c => c.id === i.categoryId)).map(item => (
                             <div key={item.id} className="bg-white border border-neutral-200 p-5 rounded-[6px] flex flex-col justify-between gap-4 relative group hover:border-black hover:shadow-md transition-all">
                                <div className="absolute top-2 left-2 flex gap-1 bg-white/90 backdrop-blur-sm rounded-lg p-1 shadow-sm opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity border border-neutral-100">
                                  <button 
                                    onClick={() => setEditingItem({ id: item.id, name: item.name, price: item.price.toString(), costPrice: (item.costPrice || 0).toString() })} 
                                    className="text-neutral-500 hover:text-blue-600 hover:bg-blue-50 w-8 h-8 flex items-center justify-center rounded-md transition-colors"
                                  >
                                    <Pencil size={18}/>
                                  </button>
                                  <button 
                                    onClick={() => deleteItem(item.id)} 
                                    className="text-neutral-500 hover:text-red-600 hover:bg-red-50 w-8 h-8 flex items-center justify-center rounded-md transition-colors"
                                  >
                                    <Trash size={18}/>
                                  </button>
                                </div>
                                <div>
                                  <h3 className="font-bold text-[16px] text-neutral-900 pr-2">{item.name}</h3>
                                  <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full mt-1 inline-block font-bold">
                                    {filteredCategories.find(c => c.id === item.categoryId)?.name}
                                  </span>
                                </div>
                                <div className="flex flex-col gap-2 pt-2 border-t border-neutral-50 mt-auto">
                                   <div className="flex justify-between items-center text-xs font-bold">
                                      <span className="text-neutral-400">تێچوو:</span>
                                      <span className="text-neutral-500">{item.costPrice?.toLocaleString() || 0} د.ع</span>
                                   </div>
                                   <div className="flex justify-between items-center">
                                      <span className="text-xs font-bold text-neutral-400">نرخی فرۆشتن:</span>
                                      <span className="text-black font-black text-[16px]">{item.price.toLocaleString()} د.ع</span>
                                   </div>
                                   <div className="flex justify-between items-center pt-2 border-t border-dashed border-neutral-100">
                                      <span className="text-[10px] font-black text-green-600 uppercase">قازانج:</span>
                                      <span className="text-green-600 font-bold text-xs">{(item.price - (item.costPrice || 0)).toLocaleString()} د.ع</span>
                                   </div>
                                </div>
                             </div>
                          ))}
                       </div>
                    )}
                 </div>
            )}
         </div>
      </div>

      {editingItem && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           <form onSubmit={handleUpdateItem} className="bg-white rounded-[24px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
                 <h3 className="text-xl font-black flex items-center gap-2">
                   <Pencil size={24} className="text-neutral-500" />
                   دەستکاریکردنی بەرهەم
                 </h3>
                 <button type="button" onClick={() => setEditingItem(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-200 text-neutral-500">
                   <X size={20} />
                 </button>
              </div>
              <div className="p-6 space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-1.5">ناوی خواردن / بەرهەم</label>
                    <input 
                       value={editingItem.name} onChange={e=>setEditingItem({...editingItem, name: e.target.value})} 
                       className="w-full border border-neutral-200 rounded-[12px] px-4 py-3 text-sm focus:outline-none focus:border-black transition-colors bg-white font-bold"
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-1.5">تێچوو (Cost)</label>
                    <input 
                       type="number" value={editingItem.costPrice} onChange={e=>setEditingItem({...editingItem, costPrice: e.target.value})} 
                       className="w-full border border-neutral-200 rounded-[12px] px-4 py-3 text-sm focus:outline-none focus:border-black transition-colors text-right bg-white font-bold" dir="ltr"
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-1.5">نرخی فرۆشتن</label>
                    <input 
                       type="number" value={editingItem.price} onChange={e=>setEditingItem({...editingItem, price: e.target.value})} 
                       className="w-full border border-neutral-200 rounded-[12px] px-4 py-3 text-sm focus:outline-none focus:border-black transition-colors text-right bg-white font-bold" dir="ltr"
                    />
                 </div>
              </div>
              <div className="p-6 border-t border-neutral-100 bg-neutral-50 flex justify-end gap-2 text-sm">
                 <button type="button" onClick={() => setEditingItem(null)} className="px-6 py-2.5 rounded-[8px] font-bold text-neutral-600 hover:bg-neutral-200 transition-colors">پاشگەزبوونەوە</button>
                 <button type="submit" disabled={!editingItem.name || !editingItem.price} className="px-6 py-2.5 rounded-[8px] font-bold bg-black text-white hover:bg-neutral-800 transition-colors disabled:opacity-50 flex items-center gap-2">
                   تۆمارکردن
                 </button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
}
