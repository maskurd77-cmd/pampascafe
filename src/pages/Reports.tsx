import React, { useEffect, useState } from "react";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { format, subDays, startOfDay, endOfDay, isSameDay, startOfMonth, endOfMonth, subMonths, eachDayOfInterval, eachMonthOfInterval, isSameMonth } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { handleFirestoreError, OperationType } from "../lib/errorHandler";
import { BarChart3, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

type DateRange = "today" | "yesterday" | "7" | "30" | "this_month" | "last_month" | "this_year";

export default function Reports() {
  const [data, setData] = useState<any[]>([]);
  const [totalSales, setTotalSales] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [range, setRange] = useState<DateRange>("7");

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
      const orders = orderSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      
      onSnapshot(qExpenses, (expSnap) => {
        let expSum = 0;
        const expenses = expSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

        const chartData = [];
        
        if (groupBy === "day") {
           const daysInInterval = eachDayOfInterval({ start: startDate, end: endDate > now ? now : endDate });
           
           for (const targetDate of daysInInterval) {
             const dayStr = format(targetDate, 'MM/dd');
             const dayOrders = orders.filter(o => o.createdAt && isSameDay(o.createdAt.toDate(), targetDate));
             const daySales = dayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
             salesSum += daySales;

             const dayExpenses = expenses.filter(e => e.createdAt && isSameDay(e.createdAt.toDate(), targetDate));
             const dayExp = dayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
             expSum += dayExp;

             chartData.push({
               name: dayStr,
               فرۆش: daySales,
               خەرجی: dayExp,
               قازانج: daySales - dayExp
             });
           }
        } else {
           const monthsInInterval = eachMonthOfInterval({ start: startDate, end: endDate > now ? now : endDate });
           for (const targetMonth of monthsInInterval) {
             const monthStr = format(targetMonth, 'yyyy/MM');
             const monthOrders = orders.filter(o => o.createdAt && isSameMonth(o.createdAt.toDate(), targetMonth));
             const monthSales = monthOrders.reduce((sum, o) => sum + (o.total || 0), 0);
             salesSum += monthSales;

             const monthExpenses = expenses.filter(e => e.createdAt && isSameMonth(e.createdAt.toDate(), targetMonth));
             const monthExp = monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
             expSum += monthExp;

             chartData.push({
               name: monthStr,
               فرۆش: monthSales,
               خەرجی: monthExp,
               قازانج: monthSales - monthExp
             });
           }
        }

        setTotalSales(salesSum);
        setTotalExpenses(expSum);
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
            <h1 className="text-4xl font-black tracking-tight mb-2 text-neutral-900">ڕاپۆرتەکان</h1>
            <p className="text-neutral-500 font-medium">بينینی داتاکانی فرۆش و خەرجییەکان بە شێوازێکی پرۆفیشناڵ</p>
          </div>
          <div className="relative">
            <select 
              value={range} 
              onChange={e => setRange(e.target.value as DateRange)} 
              className="appearance-none border border-neutral-200 rounded-[12px] pl-10 pr-6 py-3 text-sm font-bold cursor-pointer outline-none focus:border-black focus:ring-1 focus:ring-black bg-neutral-50 transition-all text-neutral-800 min-w-[200px]"
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-white rounded-[16px] border border-neutral-100 shadow-sm p-8 relative overflow-hidden group">
              <div className="flex items-center gap-4 mb-4">
                 <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center text-neutral-800 border border-neutral-100 group-hover:scale-110 transition-transform">
                    <TrendingUp size={20} />
                 </div>
                 <p className="text-neutral-500 font-bold text-sm">کۆی فرۆش</p>
              </div>
              <p className="text-4xl font-black text-neutral-900">{totalSales.toLocaleString()} <span className="text-lg text-neutral-400 font-bold">IQD</span></p>
              <div className="absolute right-0 bottom-0 w-2 h-full bg-neutral-800"></div>
           </div>

           <div className="bg-white rounded-[16px] border border-neutral-100 shadow-sm p-8 relative overflow-hidden group">
              <div className="flex items-center gap-4 mb-4">
                 <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-600 border border-red-100 group-hover:scale-110 transition-transform">
                    <TrendingDown size={20} />
                 </div>
                 <p className="text-neutral-500 font-bold text-sm">کۆی خەرجی</p>
              </div>
              <p className="text-4xl font-black text-red-600">{totalExpenses.toLocaleString()} <span className="text-lg text-red-400 font-bold">IQD</span></p>
              <div className="absolute right-0 bottom-0 w-2 h-full bg-red-500"></div>
           </div>

           <div className="bg-gradient-to-br from-neutral-900 to-black text-white rounded-[16px] shadow-lg p-8 relative overflow-hidden group">
              <div className="absolute -left-6 -bottom-6 w-32 h-32 bg-white/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
              <div className="flex items-center gap-4 mb-4 relative z-10">
                 <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white border border-white/20 group-hover:scale-110 transition-transform">
                    <DollarSign size={20} />
                 </div>
                 <p className="text-neutral-300 font-bold text-sm">پوختەی قازانج</p>
              </div>
              <p className="text-4xl font-black text-white relative z-10">{(totalSales - totalExpenses).toLocaleString()} <span className="text-lg text-neutral-400 font-bold">IQD</span></p>
              <div className="absolute right-0 bottom-0 w-2 h-full bg-green-500"></div>
           </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-[16px] border border-neutral-100 shadow-sm p-8">
           <div className="mb-6">
              <h2 className="text-xl font-bold text-neutral-800">هێڵکاری داهات و خەرجی</h2>
              <p className="text-sm text-neutral-500">بەراوردی نێوان فرۆش و خەرجییەکان لە کاتی دیاریکراودا</p>
           </div>
           <div className="h-[450px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={data} margin={{ top: 20, right: 0, left: 40, bottom: 20 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                 <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#888', fontSize: 12, fontWeight: 'bold' }}
                    dy={10}
                 />
                 <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(val) => val === 0 ? '0' : `${(val / 1000).toLocaleString()}k`} 
                    tick={{ fill: '#888', fontSize: 12, fontWeight: 'bold' }}
                    dx={-10}
                 />
                 <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9f9f9' }} />
                 <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="circle"
                 />
                 <Bar dataKey="فرۆش" fill="#171717" radius={[6, 6, 0, 0]} maxBarSize={50} />
                 <Bar dataKey="خەرجی" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={50} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>
    </div>
  );
}
