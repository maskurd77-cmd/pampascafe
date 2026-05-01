import React from "react";
import { collection, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import toast from "react-hot-toast";
import { DownloadCloud, Trash2, Settings as SettingsIcon, ShieldAlert, Receipt } from "lucide-react";

export default function Settings() {

  const handleBackup = async () => {
    try {
      const collections = ["categories", "menuItems", "tables", "orders", "reservations", "expenses", "users"];
      const backupData: any = {};
      
      toast.loading("پاشەکەوتکردن بەردەوامە...", { id: "backup" });

      for (const col of collections) {
         const snap = await getDocs(collection(db, col));
         backupData[col] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pampas-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success("بە سەرکەوتوویی پاشەکەوتکرا", { id: "backup" });
    } catch (error: any) {
      toast.error("هەڵە: " + error.message, { id: "backup" });
    }
  };

  const deleteDocumentsInCollection = async (collectionName: string) => {
    const snap = await getDocs(collection(db, collectionName));
    for (const document of snap.docs) {
       await deleteDoc(document.ref);
    }
  };

  const handleWipeTransactions = async () => {
    if (!window.confirm("ئاگاداری! دڵنیای لە سڕینەوەی هەموو داتاکانی فرۆش و خەرجی؟")) return;
    if (window.prompt("تکایە بنووسە 'confirm' بۆ دڵنیابوونەوە") !== "confirm") {
      toast.error("سڕینەوە هەڵوەشایەوە");
      return;
    }

    try {
      toast.loading("سڕینەوە بەردەوامە...", { id: "wipe-trans" });
      await deleteDocumentsInCollection("orders");
      await deleteDocumentsInCollection("expenses");
      await deleteDocumentsInCollection("reservations");
      toast.success("سیستەمەکە پاککرایەوە لە مامەڵەکان", { id: "wipe-trans" });
    } catch (e: any) {
       toast.error("هەڵە لە سڕینەوە", { id: "wipe-trans" });
    }
  };

  const handleWipeTables = async () => {
    if (!window.confirm("دڵنیای لە سڕینەوەی هەموو مێزەکان؟ ئەم کردارە ناگەڕێتەوە!")) return;
    if (window.prompt("تکایە بنووسە 'confirm'") !== "confirm") {
      toast.error("سڕینەوە هەڵوەشایەوە");
      return;
    }

    try {
      toast.loading("مێزەکان دەسڕدرێنەوە...", { id: "wipe-tables" });
      await deleteDocumentsInCollection("tables");
      toast.success("هەموو مێزەکان سڕدرانەوە", { id: "wipe-tables" });
    } catch (e: any) {
      toast.error("هەڵە لە سڕینەوە", { id: "wipe-tables" });
    }
  };

  const handleWipeMenu = async () => {
    if (!window.confirm("دڵنیای لە سڕینەوەی هەموو بەشەکانی مێنۆ و خواردنەکان؟ پێشنیار دەکرێت بەکئاپ بگریت پێشتر.")) return;
    if (window.prompt("تکایە بنووسە 'confirm'") !== "confirm") {
      toast.error("سڕینەوە هەڵوەشایەوە");
      return;
    }

    try {
      toast.loading("مێنۆ دەسڕدرێتەوە...", { id: "wipe-menu" });
      await deleteDocumentsInCollection("categories");
      await deleteDocumentsInCollection("menuItems");
      toast.success("هەموو مێنۆکە سڕدرایەوە", { id: "wipe-menu" });
    } catch (e: any) {
      toast.error("هەڵە لە سڕینەوە", { id: "wipe-menu" });
    }
  };

  const handleWipeEverything = async () => {
    if (!window.confirm("هۆشداری زۆر زۆر گرنگ!!! دڵنیای لە سڕینەوەی هەموو شتێک؟ (مێزەکان، مێنۆ، فرۆشەکان)")) return;
    if (window.prompt("تکایە بنووسە 'delete everything'") !== "delete everything") {
      toast.error("سڕینەوە هەڵوەشایەوە");
      return;
    }

    try {
      toast.loading("هەموو شتێک دەسڕدرێتەوە...", { id: "wipe-all" });
      await deleteDocumentsInCollection("categories");
      await deleteDocumentsInCollection("menuItems");
      await deleteDocumentsInCollection("tables");
      await deleteDocumentsInCollection("orders");
      await deleteDocumentsInCollection("expenses");
      await deleteDocumentsInCollection("reservations");
      toast.success("هەموو شتەکانی سیستەمەکە سڕدرانەوە", { id: "wipe-all" });
    } catch (e: any) {
      toast.error("هەڵە لە سڕینەوە", { id: "wipe-all" });
    }
  };

  return (
    <div className="p-6 lg:p-10 bg-[#f9f9f9] min-h-screen">
      <div className="flex flex-col gap-10 max-w-5xl mx-auto">
        
        <div className="flex items-end justify-between bg-white p-8 rounded-[16px] shadow-sm border border-neutral-100">
          <div>
            <h1 className="text-4xl font-black tracking-tight mb-2 text-neutral-900">ڕێکخستنەکان</h1>
            <p className="text-neutral-500 font-medium">ڕێکخستنی سیستەم و بەڕێوەبردنی داتابەیس بە شێوەیەکی پرۆفیشناڵ</p>
          </div>
          <div className="hidden sm:flex items-center justify-center w-12 h-12 bg-neutral-50 rounded-[12px] border border-neutral-100">
             <SettingsIcon size={24} className="text-neutral-600 animate-[spin_4s_linear_infinite]" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {/* General Settings */}
           <div className="bg-white rounded-[16px] border border-neutral-100 shadow-sm p-8 space-y-8 h-fit">
             <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-neutral-50 rounded-[8px] flex items-center justify-center text-neutral-700">
                   <Receipt size={20} />
                </div>
                <h2 className="text-xl font-bold">ڕێکخستنی پسوولە</h2>
             </div>
             <p className="text-sm text-neutral-500 leading-relaxed -mt-4 mb-6">دەستکاری سەردێڕ و ژمێرەری وەسلەکانی کافێکەت بکە بۆ پرینتکردن.</p>
             <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-2">سەرەوەی پسوولە</label>
                  <input type="text" placeholder="دەقی سەرەوە (Pampas Cafe)" className="w-full border border-neutral-200 rounded-[8px] p-3 text-sm focus:outline-none focus:border-black transition-colors bg-[#fcfcfc]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-2">خوارەوەی پسوولە</label>
                  <input type="text" placeholder="دەقی خوارەوە (سوپاس بۆ سەردانتان)" className="w-full border border-neutral-200 rounded-[8px] p-3 text-sm focus:outline-none focus:border-black transition-colors bg-[#fcfcfc]" />
                </div>
                <button className="bg-black text-white px-8 py-3 rounded-[8px] font-bold mt-4 hover:shadow-lg hover:shadow-black/20 transition-all active:scale-[0.98]">پاشەکەوتکردن</button>
             </div>
           </div>

           {/* Data Management */}
           <div className="bg-white rounded-[16px] border border-neutral-100 shadow-sm p-8 flex flex-col">
             <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-red-50 rounded-[8px] flex items-center justify-center text-red-600">
                   <ShieldAlert size={20} />
                </div>
                <h2 className="text-xl font-bold text-red-600">بەڕێوەبردنی داتابەیس</h2>
             </div>
             <p className="text-sm text-neutral-500 leading-relaxed -mt-4 mb-8">ئاگاداربە کۆنترۆڵی ڕاستەوخۆی داتابەیس دەکەیت. سڕینەوە ناگەڕێتەوە.</p>
             
             <div className="flex flex-col gap-4">
                <div className="p-5 border border-dashed border-neutral-200 rounded-[12px] bg-neutral-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                   <div>
                     <p className="font-bold text-sm text-neutral-800">بەکئاپ کردنی داتاکان</p>
                     <p className="text-xs text-neutral-500 mt-1">لە دەستچوونی داتاکان دەپارێزێت (JSON)</p>
                   </div>
                   <button onClick={handleBackup} className="shrink-0 flex items-center gap-2 bg-white hover:bg-neutral-50 transition-colors text-black border border-neutral-200 px-4 py-2.5 rounded-[8px] font-bold text-sm shadow-sm">
                      <DownloadCloud size={16} /> وەرگرتنی فایل
                   </button>
                </div>

                <div className="p-5 border border-red-100 rounded-[12px] bg-red-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                   <div>
                     <p className="font-bold text-sm text-red-800">سڕینەوەی مێنۆ</p>
                     <p className="text-xs text-red-600 mt-1">هەموو بەش و خواردنەکان دەسڕێتەوە</p>
                   </div>
                   <button onClick={handleWipeMenu} className="shrink-0 flex items-center gap-2 bg-white text-red-600 border border-red-200 px-4 py-2.5 rounded-[8px] font-bold text-sm hover:bg-red-50 transition-colors shadow-sm">
                      <Trash2 size={16} /> سڕینەوەی مێنۆ
                   </button>
                </div>

                <div className="p-5 border border-red-100 rounded-[12px] bg-red-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                   <div>
                     <p className="font-bold text-sm text-red-800">سڕینەوەی مێزەکان</p>
                     <p className="text-xs text-red-600 mt-1">هەموو مێزەکانی کافێیەکە دەسڕدرێنەوە</p>
                   </div>
                   <button onClick={handleWipeTables} className="shrink-0 flex items-center gap-2 bg-white text-red-600 border border-red-200 px-4 py-2.5 rounded-[8px] font-bold text-sm hover:bg-red-50 transition-colors shadow-sm">
                      <Trash2 size={16} /> سڕینەوەی مێز
                   </button>
                </div>

                <div className="p-5 border border-red-100 rounded-[12px] bg-red-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                   <div>
                     <p className="font-bold text-sm text-red-800">سڕینەوەی مامەڵەکان</p>
                     <p className="text-xs text-red-600 mt-1">فرۆش و خەرجییەکان پاک دەکاتەوە</p>
                   </div>
                   <button onClick={handleWipeTransactions} className="shrink-0 flex items-center gap-2 bg-white text-red-600 border border-red-200 px-4 py-2.5 rounded-[8px] font-bold text-sm hover:bg-red-50 transition-colors shadow-sm">
                      <Trash2 size={16} /> سڕینەوەی مامەڵە
                   </button>
                </div>

                <div className="p-5 border-2 border-red-200 rounded-[12px] bg-white flex flex-col items-center text-center gap-4 mt-6">
                   <div>
                     <p className="font-black text-[16px] text-red-700">فۆرماتکردنی گشتی سیستەم</p>
                     <p className="text-sm text-red-500 mt-1">ئاگاداربە! هەموو شتێک لە بەرنامەکەدا سفر دەبێتەوە</p>
                   </div>
                   <button onClick={handleWipeEverything} className="flex items-center justify-center gap-2 bg-red-600 text-white px-8 py-3 rounded-[8px] font-bold text-sm hover:bg-red-700 transition-all shadow-md active:scale-[0.98] w-full max-w-[250px]">
                      <Trash2 size={18} /> سڕینەوەی هەموو شتێک
                   </button>
                </div>
             </div>
           </div>

        </div>
      </div>
    </div>
  );
}
