import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { startOfDay, endOfDay } from "date-fns";
import { BarChart3, Coffee, Receipt, Users, TrendingUp } from "lucide-react";
import { OperationType, handleFirestoreError } from "../lib/errorHandler";

export default function Dashboard() {
  const [todaySales, setTodaySales] = useState(0);
  const [todayOrders, setTodayOrders] = useState(0);
  const [activeTables, setActiveTables] = useState(0);

  useEffect(() => {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const qOrders = query(
      collection(db, "orders"),
      where("createdAt", ">=", todayStart),
      where("createdAt", "<=", todayEnd)
    );

    const unsubOrders = onSnapshot(qOrders, (snap) => {
      let sales = 0;
      snap.forEach(doc => {
        sales += doc.data().total || 0;
      });
      setTodaySales(sales);
      setTodayOrders(snap.size);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "orders"));

    const qTables = query(collection(db, "tables"), where("status", "==", "busy"));
    const unsubTables = onSnapshot(qTables, (snap) => {
      setActiveTables(snap.size);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "tables"));

    return () => {
      unsubOrders();
      unsubTables();
    };
  }, []);

  return (
    <div className="p-6 lg:p-10 bg-[#f9f9f9] min-h-screen">
      <div className="flex flex-col gap-10 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-6 sm:p-8 rounded-[16px] shadow-sm border border-neutral-100 gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2 text-neutral-900">داشبۆرد</h1>
            <p className="text-sm sm:text-base text-neutral-500 font-medium">پوختەی کارەکانی ئەمڕۆی کافێکەت بەرنامەکە بە شێوازێکی پرۆفیشناڵ کار دەکات</p>
          </div>
          <div className="flex items-center gap-2 bg-neutral-50 px-4 py-2 rounded-full border border-neutral-100">
             <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
             <span className="text-xs sm:text-sm font-bold text-neutral-600">سیستەم کاردەکات</span>
          </div>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {/* Stat card 1 */}
           <div className="bg-white border border-neutral-100 rounded-[16px] p-8 flex flex-col gap-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute -left-6 -top-6 w-24 h-24 bg-neutral-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="flex justify-between items-start relative z-10">
                 <div className="w-12 h-12 bg-black flex items-center justify-center rounded-[12px] shadow-lg shadow-black/20">
                    <Receipt size={24} className="text-white" />
                 </div>
                 <div className="bg-green-50 text-green-700 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                    <TrendingUp size={12} /> ئەمڕۆ
                 </div>
              </div>
              <div className="relative z-10 mt-2">
                 <p className="text-sm font-bold text-neutral-500 mb-1">کۆی فرۆشی ئەمڕۆ</p>
                 <p className="text-3xl font-black text-neutral-900">{todaySales.toLocaleString()} <span className="text-lg font-bold text-neutral-400 font-sans">د.ع</span></p>
              </div>
           </div>

           {/* Stat card 2 */}
           <div className="bg-white border border-neutral-100 rounded-[16px] p-8 flex flex-col gap-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute -left-6 -top-6 w-24 h-24 bg-neutral-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="flex justify-between items-start relative z-10">
                 <div className="w-12 h-12 bg-white border-2 border-neutral-100 flex items-center justify-center rounded-[12px]">
                    <BarChart3 size={24} className="text-neutral-700" />
                 </div>
              </div>
              <div className="relative z-10 mt-2">
                 <p className="text-sm font-bold text-neutral-500 mb-1">ژمارەی پسوولەکان</p>
                 <p className="text-3xl font-black text-neutral-900">{todayOrders} <span className="text-lg font-bold text-neutral-400 font-sans">پسوولە</span></p>
              </div>
           </div>

           {/* Stat card 3 */}
           <div className="bg-white border border-neutral-100 rounded-[16px] p-8 flex flex-col gap-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute -left-6 -top-6 w-24 h-24 bg-neutral-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="flex justify-between items-start relative z-10">
                 <div className="w-12 h-12 bg-white border-2 border-neutral-100 flex items-center justify-center rounded-[12px]">
                    <Coffee size={24} className="text-neutral-700" />
                 </div>
                 {activeTables > 0 && (
                   <span className="flex h-3 w-3 relative">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                   </span>
                 )}
              </div>
              <div className="relative z-10 mt-2">
                 <p className="text-sm font-bold text-neutral-500 mb-1">مێزە سەرقاڵەکان لە ئێستادا</p>
                 <p className="text-3xl font-black text-neutral-900">{activeTables} <span className="text-lg font-bold text-neutral-400 font-sans">مێز</span></p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
