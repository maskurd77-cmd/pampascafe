import React, { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, getDoc, doc, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { handleFirestoreError, OperationType } from "../lib/errorHandler";
import { useAppMode } from "../hooks/useAppMode";
import { Receipt, Calendar, User, Printer, BarChart3 } from "lucide-react";
import { subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths } from "date-fns";

type DateRange = "today" | "yesterday" | "7" | "30" | "this_month" | "last_month" | "this_year" | "all";


export default function Invoices() {
  const { appMode } = useAppMode();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<DateRange>("today");
  const [settings, setSettings] = useState({
    receiptHeader: 'Pampas Cafe',
    receiptFooter: 'سوپاس بۆ سەردانتان!'
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "general");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(prev => ({ ...prev, ...docSnap.data() }));
        }
      } catch (error) {
         console.error(error);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    setLoading(true);
    let q;

    if (range === "all") {
       q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    } else {
       let startDate: Date;
       let endDate: Date;
       const now = new Date();

       switch (range) {
         case "today":
           startDate = startOfDay(now);
           endDate = endOfDay(now);
           break;
         case "yesterday":
           startDate = startOfDay(subDays(now, 1));
           endDate = endOfDay(subDays(now, 1));
           break;
         case "7":
           startDate = startOfDay(subDays(now, 6));
           endDate = endOfDay(now);
           break;
         case "30":
           startDate = startOfDay(subDays(now, 29));
           endDate = endOfDay(now);
           break;
         case "this_month":
           startDate = startOfMonth(now);
           endDate = endOfMonth(now);
           break;
         case "last_month":
           const lastMonth = subMonths(now, 1);
           startDate = startOfMonth(lastMonth);
           endDate = endOfMonth(lastMonth);
           break;
         case "this_year":
         default:
           startDate = startOfDay(subDays(now, 365));
           endDate = endOfDay(now);
           break;
       }
       
       q = query(
         collection(db, "orders"), 
         where("createdAt", ">=", startDate), 
         where("createdAt", "<=", endDate),
         orderBy("createdAt", "desc")
       );
    }

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setInvoices(docs.filter(d => (d.department || 'cafe') === appMode));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "orders");
      setLoading(false);
    });

    return () => unsub();
  }, [appMode, range]);

  const handlePrint = (inv: any) => {
    const printWindow = window.open('', '', 'width=300,height=600');
    if (printWindow) {
      const itemsHtml = (inv.items || []).map((item: any) => `
        <div class="flex item-row">
          <span>${item.name} <span style="font-size: 11px;">x${item.qty}</span></span>
          <span>${(item.price * item.qty).toLocaleString()}</span>
        </div>
      `).join('');
      
      const dateStr = inv.createdAt?.toDate ? inv.createdAt.toDate().toLocaleString('en-GB') : '';

      printWindow.document.write(`
        <html dir="rtl">
          <head>
            <style>
              body { font-family: Tahoma, Arial, sans-serif; padding: 20px; font-size: 14px; margin: 0; }
              hr { border-top: 1px dashed #000; margin: 15px 0; border-bottom: none; }
              .flex { display: flex; justify-content: space-between; margin-bottom: 5px; }
              .bold { font-weight: bold; }
              h2, p { text-align: center; margin: 0; }
              h2 { margin-bottom: 5px; font-size: 18px; }
              p { font-size: 12px; margin-bottom: 15px; }
              .item-row { margin-bottom: 8px; }
            </style>
          </head>
          <body>
            <h2>${settings?.receiptHeader || 'Pampas Cafe'}</h2>
            <p>پسوولەی فرۆشتن</p>
            <div class="flex">
               <span>وەسل:</span>
               <span class="bold">#${inv.id.slice(-6).toUpperCase()}</span>
            </div>
            <div class="flex">
               <span>مێز:</span>
               <span class="bold">${inv.tableId === 'takeaway' ? 'تەیکەوێ' : (inv.tableName || inv.tableId || 'نەزانراو')}</span>
            </div>
            <div class="flex">
               <span>بەروار:</span>
               <span>${dateStr}</span>
            </div>
            <hr />
            ${itemsHtml}
            <hr />
            <div class="flex">
              <span>کۆی گشتی:</span>
              <span>${(inv.subtotal || 0).toLocaleString()}</span>
            </div>
            ${(inv.discount || 0) > 0 ? `
            <div class="flex">
              <span>داشکاندن:</span>
              <span>${inv.discount.toLocaleString()}</span>
            </div>
            ` : ''}
            <div class="flex bold" style="font-size: 16px; margin-top: 5px;">
              <span>کۆی کۆتایی:</span>
              <span>${(inv.total || 0).toLocaleString()} IQD</span>
            </div>
            <hr />
            <p style="margin-top: 20px;">${settings?.receiptFooter || 'سوپاس بۆ سەردانتان!'}</p>
            <div style="text-align:center; font-size:10px; color:#666; margin-top:10px; font-weight:bold;">Powered by mas menu</div>
            <script>
              window.onload = function() { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-[12px] flex items-center justify-center shadow-sm border border-neutral-100 shrink-0">
            <Receipt size={24} className="text-neutral-700" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight">وەسلەکان ({appMode === 'atari' ? 'ئاتاری' : 'کافێ'})</h1>
            <p className="text-neutral-500 font-bold text-sm mt-1">بینینی هەموو وەسلەکانی پێشوو و قازانجەکان</p>
          </div>
        </div>
        
        <div className="relative shrink-0 w-full md:w-auto">
          <select 
            value={range} 
            onChange={e => setRange(e.target.value as DateRange)} 
            className="w-full md:w-auto appearance-none border border-neutral-200 rounded-[12px] pl-10 pr-6 py-3 text-sm font-bold cursor-pointer outline-none focus:border-black focus:ring-1 focus:ring-black bg-white transition-all text-neutral-800 shadow-sm"
          >
            <option value="today">ئەمڕۆ</option>
            <option value="yesterday">دوێنێ</option>
            <option value="7">کۆتا ٧ ڕۆژ</option>
            <option value="30">کۆتا ٣٠ ڕۆژ</option>
            <option value="this_month">ئەم مانگە</option>
            <option value="last_month">مانگی پێشوو</option>
            <option value="this_year">ئەم ساڵ</option>
            <option value="all">هەموو کاتێک</option>
          </select>
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <BarChart3 size={16} className="text-neutral-400" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[16px] border border-neutral-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-100 text-neutral-500">
              <tr>
                <th className="px-6 py-4 font-bold">ژمارەی وەسل</th>
                <th className="px-6 py-4 font-bold">کات</th>
                <th className="px-6 py-4 font-bold">کاشێر</th>
                <th className="px-6 py-4 font-bold">مێز/کڕیار</th>
                <th className="px-6 py-4 font-bold">کۆی گشتی</th>
                <th className="px-6 py-4 font-bold text-green-600">قازانج (خێر)</th>
                <th className="px-6 py-4 font-bold text-center">کردارەکان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                   <td colSpan={7} className="px-6 py-8 text-center text-neutral-400 font-bold">چاوەڕێ بکە...</td>
                </tr>
              ) : invoices.length === 0 ? (
                 <tr>
                   <td colSpan={7} className="px-6 py-8 text-center text-neutral-400 font-bold flex items-center justify-center flex-col gap-2">
                     <Receipt size={24} className="opacity-50" />
                     هیچ وەسلێک نەدۆزرایەوە
                   </td>
                </tr>
              ) : (
                invoices.map((inv, idx) => {
                  const dateInfo = inv.createdAt?.toDate ? inv.createdAt.toDate().toLocaleString('en-US', { hour12: true, year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute:'2-digit' }) : '';
                  const total = inv.total || 0;
                  const cost = inv.items?.reduce((sum: number, item: any) => sum + ((item.costPrice || 0) * (item.qty || 1)), 0) || 0;
                  const profit = total - cost;

                  return (
                    <tr key={inv.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-bold text-neutral-500 bg-neutral-100 px-2 py-1 rounded-[6px]">
                          #{inv.id.slice(-6).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-neutral-600 flex items-center gap-2">
                        <Calendar size={14} className="text-neutral-400" />
                        <span dir="ltr">{dateInfo}</span>
                      </td>
                      <td className="px-6 py-4 font-bold text-neutral-700">
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-neutral-400" />
                          {inv.createdBy || 'نەزانراو'}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-neutral-800">{inv.tableId === 'takeaway' ? 'تەیکەوێ' : (inv.tableName || inv.tableId || 'نەزانراو')}</td>
                      <td className="px-6 py-4 font-black text-neutral-900 border-r border-neutral-100/50 bg-neutral-50/30">
                        IQD {total.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-black text-green-600 border-r border-neutral-100/50 bg-green-50/30">
                        IQD {profit.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handlePrint(inv)}
                          className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 p-2 rounded-[8px] transition-colors shadow-sm border border-neutral-200"
                          title="Print Receipt"
                        >
                          <Printer size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
