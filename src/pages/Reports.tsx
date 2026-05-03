import React, { useEffect, useState } from "react";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { format, subDays, startOfDay, endOfDay, isSameDay, startOfMonth, endOfMonth, subMonths, eachDayOfInterval, eachMonthOfInterval, isSameMonth } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { handleFirestoreError, OperationType } from "../lib/errorHandler";
import { BarChart3, TrendingUp, TrendingDown, DollarSign, WalletCards, Receipt, ArrowLeftRight, ChevronLeft, ChevronRight, Send } from "lucide-react";
import { useAppMode } from "../hooks/useAppMode";

type DateRange = "today" | "yesterday" | "7" | "30" | "this_month" | "last_month" | "this_year";

export default function Reports() {
  const { appMode } = useAppMode();
  const [data, setData] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [totalSales, setTotalSales] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [totalDebt, setTotalDebt] = useState(0);
  const [range, setRange] = useState<DateRange>("7");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "customers"), (snap) => {
      const debt = snap.docs.reduce((sum, d) => sum + (d.data().totalDebt || 0), 0);
      setTotalDebt(debt);
    });
    return unsub;
  }, []);

  useEffect(() => {
    let startDate: Date;
    let endDate: Date;
    let groupBy: "day" | "month" = "day";

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
        groupBy = "month";
        break;
    }

    const qOrders = query(collection(db, "orders"), where("createdAt", ">=", startDate), where("createdAt", "<=", endDate));
    const qExpenses = query(collection(db, "expenses"), where("createdAt", ">=", startDate), where("createdAt", "<=", endDate));

    const unsubOrders = onSnapshot(qOrders, (orderSnap) => {
      let salesSum = 0;
      let profitSum = 0;
      const orderDocs = orderSnap.docs
         .map(d => ({ id: d.id, ...d.data() } as any))
         .filter(d => (d.department || 'cafe') === appMode);
         
      setOrders(orderDocs.sort((a,b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0)));
      
      onSnapshot(qExpenses, (expSnap) => {
        let expSum = 0;
        const expenses = expSnap.docs
           .map(d => ({ id: d.id, ...d.data() } as any))
           .filter(d => (d.department || 'cafe') === appMode);

        const chartData = [];
        
        if (groupBy === "day") {
           const daysInInterval = eachDayOfInterval({ start: startDate, end: endDate > now ? now : endDate });
           
           for (const targetDate of daysInInterval) {
             const dayStr = format(targetDate, 'MM/dd');
             const dayOrders = orderDocs.filter(o => o.createdAt && isSameDay(o.createdAt.toDate(), targetDate));
             const daySales = dayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
             const dayProfit = dayOrders.reduce((sum, o) => sum + (o.profit || 0), 0);
             salesSum += daySales;
             profitSum += dayProfit;

             const dayExpenses = expenses.filter(e => e.createdAt && isSameDay(e.createdAt.toDate(), targetDate));
             const dayExp = dayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
             expSum += dayExp;

             chartData.push({
               name: dayStr,
               فرۆش: daySales,
               خەرجی: dayExp,
               قازانج: dayProfit - dayExp
             });
           }
        } else {
           const monthsInInterval = eachMonthOfInterval({ start: startDate, end: endDate > now ? now : endDate });
           for (const targetMonth of monthsInInterval) {
             const monthStr = format(targetMonth, 'yyyy/MM');
             const monthOrders = orderDocs.filter(o => o.createdAt && isSameMonth(o.createdAt.toDate(), targetMonth));
             const monthSales = monthOrders.reduce((sum, o) => sum + (o.total || 0), 0);
             const monthProfit = monthOrders.reduce((sum, o) => sum + (o.profit || 0), 0);
             salesSum += monthSales;
             profitSum += monthProfit;

             const monthExpenses = expenses.filter(e => e.createdAt && isSameMonth(e.createdAt.toDate(), targetMonth));
             const monthExp = monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
             expSum += monthExp;

             chartData.push({
               name: monthStr,
               فرۆش: monthSales,
               خەرجی: monthExp,
               قازانج: monthProfit - monthExp
             });
           }
        }

        setTotalSales(salesSum);
        setTotalExpenses(expSum);
        setTotalProfit(profitSum);
        setData(chartData);

      }, e => handleFirestoreError(e, OperationType.LIST, "expenses"));
    }, e => handleFirestoreError(e, OperationType.LIST, "orders"));

    return () => unsubOrders();
  }, [range]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-[12px] shadow-xl border border-neutral-100 min-w-[200px]" dir="rtl">
          <p className="text-sm font-bold text-neutral-500 mb-3 border-b border-neutral-100 pb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold" style={{ color: entry.color }}>
                {entry.name}:
              </span>
              <span className="text-sm font-black text-neutral-800">
                {entry.value.toLocaleString()} <span className="text-[10px] text-neutral-400">د.ع</span>
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 lg:p-10 bg-[#f9f9f9] min-h-screen">
      <div className="flex flex-col gap-10 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-end justify-between gap-6 bg-white p-8 rounded-[16px] shadow-sm border border-neutral-100">
          <div>
            <h1 className="text-4xl font-black tracking-tight mb-2 text-neutral-900">ڕاپۆرتەکان ({appMode === 'atari' ? 'ئاتاری' : 'کافێ'})</h1>
            <p className="text-neutral-500 font-medium z-10 relative">بینینی داتاکانی فرۆش و خەرجییەکان بە شێوازێکی پرۆفیشناڵ</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
               onClick={async () => {
                  try {
                     const { getDoc, doc } = await import("firebase/firestore");
                     const { db } = await import("../lib/firebase");
                     const docSnap = await getDoc(doc(db, "settings", "general"));
                     const tgSettings = docSnap.exists() ? docSnap.data() : null;
                     
                     if (!tgSettings?.telegramBotToken || !tgSettings?.telegramChatId) {
                        import("react-hot-toast").then(mod => mod.default.error("ڕێکخستنی تێلیگرام نەکراوە لە بەشی ڕێکخستنەکان"));
                        return;
                     }

                     const text = `📊 ڕاپۆرتی کۆتایی ڕۆژ (${appMode === 'atari' ? 'ئاتاری' : 'کافێ'})
📅 بەروار: ${new Date().toLocaleDateString('en-GB')}

💰 کۆی فرۆش: ${totalSales.toLocaleString()} دینار
📉 کۆی خەرجی: ${totalExpenses.toLocaleString()} دینار
💵 پوختەی قازانج: ${(totalProfit - totalExpenses).toLocaleString()} دینار

🧾 ژمارەی وەسلەکان: ${orders.length}
`;
                     const res = await fetch(`https://api.telegram.org/bot${tgSettings.telegramBotToken}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ chat_id: tgSettings.telegramChatId, text })
                     });
                     
                     if (res.ok) {
                        import("react-hot-toast").then(mod => mod.default.success("ڕاپۆرت نێردرا بۆ تێلیگرام"));
                     } else {
                        import("react-hot-toast").then(mod => mod.default.error("هەڵە لە ناردن"));
                     }
                  } catch (e) {
                     import("react-hot-toast").then(mod => mod.default.error("هەڵە لە ناردنی ڕاپۆرت"));
                  }
               }}
               className="bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 px-5 py-3 rounded-[12px] font-bold text-sm transition-colors flex items-center gap-2 shadow-sm"
            >
               <Send size={16} />
               ناردنی ڕاپۆرت
            </button>
            <div className="relative flex-1 md:flex-none">
              <select 
                value={range} 
                onChange={e => setRange(e.target.value as DateRange)} 
                className="w-full appearance-none border border-neutral-200 rounded-[12px] pl-10 pr-6 py-3 text-sm font-bold cursor-pointer outline-none focus:border-black focus:ring-1 focus:ring-black bg-neutral-50 transition-all text-neutral-800 min-w-[150px]"
              >
                <option value="today">ئەمڕۆ</option>
                <option value="yesterday">دوێنێ</option>
                <option value="7">کۆتا ٧ ڕۆژ</option>
                <option value="30">کۆتا ٣٠ ڕۆژ</option>
                <option value="this_month">ئەم مانگە</option>
                <option value="last_month">مانگی پێشوو</option>
                <option value="this_year">ئەم ساڵ</option>
              </select>
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <BarChart3 size={16} className="text-neutral-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           <div className="bg-white rounded-[16px] border border-neutral-100 shadow-sm p-6 relative overflow-hidden group">
              <div className="flex items-center gap-4 mb-4">
                 <div className="w-10 h-10 bg-neutral-50 rounded-full flex items-center justify-center text-neutral-800 border border-neutral-100 group-hover:scale-110 transition-transform">
                    <TrendingUp size={18} />
                 </div>
                 <p className="text-neutral-500 font-bold text-xs">کۆی فرۆش</p>
              </div>
              <p className="text-2xl font-black text-neutral-900">{totalSales.toLocaleString()} <span className="text-xs text-neutral-400 font-bold">IQD</span></p>
           </div>

           <div className="bg-white rounded-[16px] border border-neutral-100 shadow-sm p-6 relative overflow-hidden group">
              <div className="flex items-center gap-4 mb-4">
                 <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-red-600 border border-red-100 group-hover:scale-110 transition-transform">
                    <TrendingDown size={18} />
                 </div>
                 <p className="text-neutral-500 font-bold text-xs">کۆی خەرجی</p>
              </div>
              <p className="text-2xl font-black text-red-600">{totalExpenses.toLocaleString()} <span className="text-xs text-red-400 font-bold">IQD</span></p>
           </div>

           <div className="bg-white rounded-[16px] border border-neutral-100 shadow-sm p-6 relative overflow-hidden group">
              <div className="flex items-center gap-4 mb-4">
                 <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center text-orange-600 border border-orange-100 group-hover:scale-110 transition-transform">
                    <WalletCards size={18} />
                 </div>
                 <p className="text-neutral-500 font-bold text-xs">کۆی قەرزەکان</p>
              </div>
              <p className="text-2xl font-black text-orange-600">{totalDebt.toLocaleString()} <span className="text-xs text-orange-400 font-bold">IQD</span></p>
           </div>

           <div className="bg-black text-white rounded-[16px] shadow-lg p-6 relative overflow-hidden group">
              <div className="flex items-center gap-4 mb-4 relative z-10">
                 <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white border border-white/20 group-hover:scale-110 transition-transform">
                    <DollarSign size={18} />
                 </div>
                 <p className="text-neutral-300 font-bold text-xs">پوختەی قازانج (Net)</p>
              </div>
              <p className="text-2xl font-black text-white relative z-10">{(totalProfit - totalExpenses).toLocaleString()} <span className="text-xs text-neutral-400 font-bold">IQD</span></p>
              <div className={`absolute right-0 bottom-0 w-1.5 h-full ${(totalProfit - totalExpenses) >= 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
           {/* Chart */}
           <div className="lg:col-span-2 bg-white rounded-[16px] border border-neutral-100 shadow-sm p-8">
              <div className="mb-6">
                 <h2 className="text-xl font-bold text-neutral-800">هێڵکاری دارایی</h2>
                 <p className="text-sm text-neutral-500">بەراوردی نێوان فرۆش و قازانج و خەرجییەکان</p>
              </div>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 20, right: 0, left: 40, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                       dataKey="name" 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{ fill: '#888', fontSize: 11, fontWeight: 'bold' }}
                       dy={10}
                    />
                    <YAxis 
                       axisLine={false} 
                       tickLine={false} 
                       tickFormatter={(val) => val === 0 ? '0' : `${(val / 1000).toLocaleString()}k`} 
                       tick={{ fill: '#888', fontSize: 11, fontWeight: 'bold' }}
                       dx={-10}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9f9f9', radius: 4 }} />
                    <Legend 
                       wrapperStyle={{ paddingTop: '20px' }}
                       iconType="circle"
                       fontSize={12}
                    />
                    <Bar dataKey="فرۆش" fill="#e5e5e5" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="قازانج" fill="#171717" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="خەرجی" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
           </div>

           {/* Invoices/Orders List */}
           <div className="bg-white rounded-[16px] border border-neutral-100 shadow-sm flex flex-col overflow-hidden">
              <div className="p-6 border-b border-neutral-100 bg-neutral-50/50 flex items-center gap-3">
                 <Receipt size={20} className="text-neutral-400" />
                 <h2 className="text-lg font-black text-neutral-800">کۆتا وەسڵەکان</h2>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[500px]">
                 {orders.length === 0 ? (
                   <p className="text-center py-10 text-neutral-400 font-bold">هیچ وەسڵێک نییە</p>
                 ) : orders.map(order => (
                   <div key={order.id} className="p-4 border border-neutral-100 rounded-[12px] bg-white hover:border-black transition-all group">
                      <div className="flex justify-between items-start mb-2">
                         <div>
                            <p className="text-xs font-bold text-neutral-400">#{order.id.slice(-6).toUpperCase()}</p>
                            <p className="font-bold text-neutral-800 text-sm">{order.customerName || `مێزی ${order.tableId}`}</p>
                         </div>
                         <div className="text-left">
                            <p className="text-sm font-black text-neutral-900">{order.total.toLocaleString()} د.ع</p>
                            <p className="text-[10px] font-bold text-neutral-400">{format(order.createdAt?.toDate() || new Date(), 'HH:mm')}</p>
                         </div>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-dashed border-neutral-100 mt-2">
                         <span className="text-[10px] font-black text-neutral-400 uppercase">قازانجی وەسڵ:</span>
                         <span className="text-green-600 font-bold text-xs">+{order.profit?.toLocaleString() || 0} د.ع</span>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
