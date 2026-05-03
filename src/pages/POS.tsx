import React, { useState, useEffect } from "react";
import { usePOSData, MenuItem, Table } from "../hooks/usePOSData";
import { safeAwait } from "../lib/errorHandler";
import { collection, addDoc, serverTimestamp, doc, updateDoc, onSnapshot, query, orderBy, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import toast from "react-hot-toast";
import { OperationType } from "../lib/errorHandler";
import { useSearchParams } from "react-router-dom";
import { Trash, Receipt, Printer, X, Tag, WalletCards, UserPlus, Coins, User } from "lucide-react";
import { format } from "date-fns";
import { useAppMode } from "../hooks/useAppMode";

interface CartItem extends MenuItem {
  qty: number;
}

export default function POS() {
  const { categories, menuItems, tables, loading } = usePOSData();
  const { appMode } = useAppMode();
  
  const filteredCategories = appMode === 'atari' 
    ? categories 
    : categories.filter(c => (c.department || 'cafe') === 'cafe');
  
  const filteredTables = tables.filter(t => (t.department || 'cafe') === appMode);

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [localCart, setLocalCart] = useState<CartItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [discount, setDiscount] = useState<number>(0);
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [searchParams] = useSearchParams();

  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutType, setCheckoutType] = useState<"cash" | "debt">("cash");
  const [amountPaid, setAmountPaid] = useState<number | "">("");
  const [debtCustomerId, setDebtCustomerId] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);

  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);
  
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
    const unsub = onSnapshot(query(collection(db, "customers"), orderBy("createdAt", "desc")), (snap) => {
      setCustomers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsub;
  }, []);

  useEffect(() => {
    const tableId = searchParams.get("table");
    if (tableId) {
       setSelectedTable(tableId);
    }
  }, [searchParams]);

  const filteredItems = menuItems.filter(item => 
    (selectedCategory === "all" || item.categoryId === selectedCategory) && item.available
  );

  const cart = selectedTable ? (filteredTables.find(t => t.id === selectedTable)?.cartItems || []) : localCart;
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const actualDiscount = Math.min(discount, subtotal);
  const total = Math.max(0, subtotal - actualDiscount);

  const updateCart = async (newCart: CartItem[]) => {
    if (selectedTable) {
       await updateDoc(doc(db, "tables", selectedTable), {
         cartItems: newCart,
         status: newCart.length > 0 ? "busy" : "free"
       });
    } else {
       setLocalCart(newCart);
    }
  };

  const [atariModalItem, setAtariModalItem] = useState<MenuItem | null>(null);
  const [atariSetupType, setAtariSetupType] = useState<'match' | 'time'>('match');
  const [matchType, setMatchType] = useState<'single' | 'double'>('single');
  const [timeMins, setTimeMins] = useState<number>(30);
  const [atariCustomPrice, setAtariCustomPrice] = useState<number>(1000);

  const addToCartCore = (item: MenuItem & { id: string }) => {
    const existing = cart.find(i => i.id === item.id);
    if (existing) {
      updateCart(cart.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      updateCart([...cart, { ...item, qty: 1 }]);
    }
  };

  const addToCart = (item: MenuItem) => {
    const cat = categories.find(c => c.id === item.categoryId);
    const isAtari = cat?.department === 'atari';

    if (appMode === 'atari' && isAtari) {
      setAtariModalItem(item);
      setAtariSetupType('match');
      setMatchType('single');
      setAtariCustomPrice(item.price || 1000);
      setTimeMins(30);
      return;
    }

    addToCartCore(item);
  };

  const handleConfirmAtariItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!atariModalItem) return;

    let finalName = '';
    let finalIdPrefix = 'atari-';

    if (atariSetupType === 'match') {
      finalName = `${atariModalItem.name} - ${matchType === 'single' ? '١ یاری سنگڵ' : '١ یاری زەوجی'}`;
      finalIdPrefix += `match-${matchType}`;
    } else {
      finalName = `${atariModalItem.name} - ${timeMins} دەقە`;
      finalIdPrefix += `time-${timeMins}`;
    }

    const newItemId = `${atariModalItem.id}-${finalIdPrefix}-${atariCustomPrice}`;

    addToCartCore({
      ...atariModalItem,
      id: newItemId,
      name: finalName,
      price: atariCustomPrice
    });

    setAtariModalItem(null);
  };

  const removeFromCart = (id: string) => {
    updateCart(cart.filter(i => i.id !== id));
  };

  const adjustQty = (id: string, delta: number) => {
    const newCart = cart.map(i => {
      if (i.id === id) {
        const newQty = i.qty + delta;
        return { ...i, qty: newQty };
      }
      return i;
    }).filter(i => i.qty > 0);
    updateCart(newCart);
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm("دڵنیای لە سڕینەوەی هەموو داواکارییەکان؟")) {
      updateCart([]);
      setDiscount(0);
      setShowDiscountInput(false);
    }
  };

  const handlePrint = () => {
    if (cart.length === 0) return toast.error("پسوولە بەتاڵە");
    // Print functionality
    const printWindow = window.open('', '', 'width=300,height=600');
    if (printWindow) {
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
               <span>مێز:</span>
               <span class="bold">${selectedTable ? filteredTables.find(t => t.id === selectedTable)?.name : "تەیکەوێ"}</span>
            </div>
            <div class="flex">
               <span>بەروار:</span>
               <span>${new Date().toLocaleString('en-GB')}</span>
            </div>
            <hr />
            ${cart.map(item => `
              <div class="flex item-row">
                <span>${item.name} <span style="font-size: 11px;">x${item.qty}</span></span>
                <span>${(item.price * item.qty).toLocaleString()}</span>
              </div>
            `).join('')}
            <hr />
            <div class="flex">
              <span>کۆی گشتی:</span>
              <span>${subtotal.toLocaleString()}</span>
            </div>
            ${actualDiscount > 0 ? `
            <div class="flex">
              <span>داشکاندن:</span>
              <span>${actualDiscount.toLocaleString()}</span>
            </div>
            ` : ''}
            <div class="flex bold" style="font-size: 16px; margin-top: 5px;">
              <span>کۆی کۆتایی:</span>
              <span>${total.toLocaleString()} IQD</span>
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

  const openCheckoutModal = () => {
    if (cart.length === 0) return toast.error("پسوولە بەتاڵە");
    setIsCheckoutModalOpen(true);
    setCheckoutType("cash");
    setAmountPaid("");
    setIsAddingCustomer(false);
  };

  const processCheckout = async () => {
    if (checkoutType === "debt") {
      if (isAddingCustomer) {
        if (!newCustomerName.trim()) return toast.error("ناوی کڕیار پێویستە");
        // Create customer first
        try {
          const docRef = await addDoc(collection(db, "customers"), {
            name: newCustomerName,
            phone: newCustomerPhone,
            totalDebt: total,
            createdAt: serverTimestamp()
          });
          
          await addDoc(collection(db, `customers/${docRef.id}/debts`), {
            amount: total,
            type: 'debt',
            date: serverTimestamp(),
            note: 'پسوولەی فرۆشتن'
          });

        } catch (e) {
          return toast.error("هەڵە لە دروستکردنی کڕیار");
        }
      } else {
        if (!debtCustomerId) return toast.error("کڕیار هەڵبژێرە");
        const customer = customers.find(c => c.id === debtCustomerId);
        if (!customer) return toast.error("کڕیار نەدۆزرایەوە");

        try {
          await addDoc(collection(db, `customers/${debtCustomerId}/debts`), {
            amount: total,
            type: 'debt',
            date: serverTimestamp(),
            note: 'پسوولەی فرۆشتن'
          });

          await updateDoc(doc(db, "customers", debtCustomerId), {
            totalDebt: (customer.totalDebt || 0) + total
          });
        } catch (e) {
          return toast.error("هەڵە لە تۆمارکردنی قەرز");
        }
      }
    }

    handlePrint();

    const totalCost = cart.reduce((acc, item) => acc + ((item.costPrice || 0) * item.qty), 0);
    const orderData = {
      tableId: selectedTable || "takeaway",
      department: appMode,
      items: cart.map(c => ({ 
        id: c.id, 
        name: c.name, 
        price: c.price, 
        costPrice: c.costPrice || 0,
        qty: c.qty 
      })),
      subtotal,
      discount: actualDiscount,
      total,
      totalCost,
      profit: total - totalCost,
      status: checkoutType === "debt" ? "debt" : "paid",
      createdAt: serverTimestamp(),
      paymentMethod: checkoutType,
      customerName: checkoutType === "debt" ? (isAddingCustomer ? newCustomerName : customers.find(c => c.id === debtCustomerId)?.name) : null
    };

    const [, err] = await safeAwait(
      addDoc(collection(db, "orders"), orderData),
      checkoutType === "debt" ? "بە قەرز تۆمارکرا" : "پارەدان سەرکەوتووبوو",
      "هەڵە لە پارەدان",
      OperationType.CREATE,
      "orders"
    );

    if (!err) {
      setLastOrder({ ...orderData, id: 'RECEIPT-' + Math.random().toString(36).substr(2, 9).toUpperCase() });
      setShowReceiptPreview(true);
      setTimeout(() => setShowReceiptPreview(false), 2000);

      updateCart([]); 
      if (!selectedTable) {
        setLocalCart([]);
      }
      setDiscount(0);
      setShowDiscountInput(false);
      setIsCheckoutModalOpen(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
      setDebtCustomerId("");
    }
  };

  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  if (loading) return <div className="p-8 text-center text-sm text-neutral-500 mt-20">چاوەڕێبە... خەریکی هێناني داتاکانە</div>;

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-4rem)] lg:h-full relative bg-[#fcfcfc]" dir="rtl">
      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden p-4 lg:p-6 gap-4 lg:gap-6 bg-[#f4f4f5]">
        
        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 shrink-0 scrollbar-hide items-center justify-start">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${selectedCategory === "all" ? "bg-black text-white border-black shadow-md shadow-black/10" : "bg-white text-neutral-600 hover:bg-neutral-50 border-transparent shadow-sm"}`}
          >
            هەمووی
          </button>
          {filteredCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${selectedCategory === cat.id ? "bg-black text-white border-black shadow-md shadow-black/10" : "bg-white text-neutral-600 hover:bg-neutral-50 border-transparent shadow-sm"}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Items Container */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 lg:gap-4 overflow-y-auto pb-[100px] lg:pb-0 pr-1 content-start">
          {filteredItems.map(item => (
            <button 
              key={item.id} 
              onClick={() => addToCart(item)}
              className="bg-white border border-neutral-100 p-4 rounded-[16px] cursor-pointer hover:border-black hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col justify-between min-h-[120px] text-right group relative overflow-hidden shadow-sm"
            >
              <div className="absolute inset-x-0 bottom-0 h-1 bg-black opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="font-bold text-[14px] lg:text-[15px] text-neutral-800 leading-tight mb-2">{item.name}</div>
              <div className="font-black text-[14px] text-neutral-900 mt-auto bg-neutral-50/80 self-end px-3 py-1.5 rounded-[8px] border border-neutral-100 group-hover:bg-white transition-colors">{item.price.toLocaleString()} د.ع</div>
            </button>
          ))}
          {filteredItems.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-neutral-400 gap-4 bg-white/50 rounded-[20px] border border-neutral-100 border-dashed">
                  <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center">
                     <Receipt size={24} className="text-neutral-300" />
                  </div>
                  <span className="font-bold text-sm">هیچ بەرهەمێک نییە لەم بەشەدا</span>
              </div>
          )}
        </div>
      </div>

      {/* Mobile Cart Floating Button */}
      {!isMobileCartOpen && (
        <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)]">
          <button 
            onClick={() => setIsMobileCartOpen(true)}
            className="w-full bg-black text-white p-4 rounded-[16px] shadow-2xl flex items-center justify-between active:scale-95 transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                {cart.length}
              </div>
              <span className="font-bold">بینینی پسوولە</span>
            </div>
            <div className="font-black">
               {total.toLocaleString()} د.ع
            </div>
          </button>
        </div>
      )}

      {/* Cart/Receipt Sidebar Overlay for Mobile */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setIsMobileCartOpen(false)}></div>
      )}

      {/* Cart/Receipt Sidebar */}
      <div className={`
        fixed lg:relative inset-x-0 bottom-0 z-50 lg:z-10
        w-full lg:w-[400px] bg-white border-none lg:border-r border-neutral-100 flex flex-col 
        shadow-[0_-20px_40px_rgba(0,0,0,0.08)] lg:shadow-none
        transition-transform duration-300 ease-in-out
        h-[85vh] lg:h-full rounded-t-[24px] lg:rounded-none
        ${isMobileCartOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
      `}>
        
        {/* Mobile Drag Handle */}
        <div className="lg:hidden w-full flex justify-center py-3 shrink-0" onClick={() => setIsMobileCartOpen(false)}>
           <div className="w-12 h-1.5 bg-neutral-200 rounded-full"></div>
        </div>

        {/* Sidebar Header */}
        <div className="px-6 pb-4 pt-2 lg:pt-6 border-b border-neutral-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-neutral-100 rounded-[12px] border border-neutral-200/50 flex items-center justify-center text-black">
                <Receipt size={18} />
             </div>
             <div>
               <h2 className="text-[16px] font-black leading-none mb-1 text-black">پسوولە</h2>
               <p className="text-xs text-neutral-500 font-bold">دروستکردنی داواکاری</p>
             </div>
          </div>
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button 
                onClick={handleClearCart}
                className="p-2.5 text-red-500 hover:bg-red-50 rounded-[10px] transition-colors flex items-center gap-1 border border-transparent hover:border-red-100"
                title="سڕینەوەی هەمووی"
              >
                <Trash size={16} />
              </button>
            )}
            <div className="relative">
              <select 
                value={selectedTable} 
                onChange={(e) => setSelectedTable(e.target.value)}
                className="appearance-none border border-neutral-200 rounded-[10px] pl-4 pr-10 py-2.5 text-sm font-bold bg-[#f4f4f5] focus:outline-none focus:border-black cursor-pointer w-28 text-center shadow-inner"
              >
                 <option value="">تەیکەوێ</option>
                 {filteredTables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                 <div className="w-2 h-2 rounded-full bg-green-500"></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-[#fcfcfc]">
          {cart.map(item => (
            <div key={item.id} className="flex flex-col bg-white border border-neutral-100 p-4 rounded-[16px] shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start mb-4">
                <span className="font-bold text-sm text-neutral-900 pr-1">{item.name}</span>
                <button onClick={() => removeFromCart(item.id)} className="text-neutral-300 hover:text-white hover:bg-red-500 p-1 rounded-md transition-colors"><X size={16} /></button>
              </div>
              <div className="flex justify-between items-center text-sm mt-auto">
                <div className="font-black text-neutral-900 text-[15px]">
                   {(item.price * item.qty).toLocaleString()} <span className="text-[10px] text-neutral-400">د.ع</span>
                </div>
                <div className="flex gap-1 items-center bg-[#f4f4f5] rounded-full p-1 border border-neutral-200/60 shadow-inner">
                  <button className="w-8 h-8 flex items-center justify-center font-bold bg-white rounded-full shadow-sm text-neutral-700 hover:text-black hover:border-black border border-transparent transition-all active:scale-95" onClick={() => adjustQty(item.id, 1)}>+</button>
                  <span className="w-8 text-center font-bold text-[14px]">{item.qty}</span>
                  <button className="w-8 h-8 flex items-center justify-center font-bold bg-white rounded-full shadow-sm text-neutral-700 hover:text-black hover:border-black border border-transparent transition-all active:scale-95" onClick={() => adjustQty(item.id, -1)}>-</button>
                </div>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-neutral-400 gap-4 opacity-50">
               <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center">
                 <Receipt size={32} className="text-neutral-400" />
               </div>
               <p className="text-sm font-bold">هەڵبژاردنی بەرهەمەکان دەستپێبکە</p>
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-6 border-t border-neutral-100 bg-white shrink-0 rounded-t-[24px] shadow-[0_-10px_20px_rgba(0,0,0,0.02)] relative z-10">
           <div className="space-y-3 mb-6">
               <div className="flex justify-between font-bold text-[13px] text-neutral-500">
                  <span>کۆی گشتی:</span>
                  <span>{subtotal.toLocaleString()} د.ع</span>
               </div>
               
               {/* Discount Section */}
               <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[13px] text-neutral-500 flex items-center gap-1.5">
                      <Tag size={14} /> داشکاندن:
                    </span>
                    <button 
                      onClick={() => setShowDiscountInput(!showDiscountInput)}
                      className="text-[13px] font-black text-[#ea580c] hover:text-[#c2410c] transition-colors bg-[#fff7ed] px-2 py-1 rounded"
                    >
                      {actualDiscount > 0 ? `-${actualDiscount.toLocaleString()}` : 'زیادکردنی داشکاندن +'}
                    </button>
                  </div>
                  {showDiscountInput && (
                    <div className="flex gap-2 mt-1 animate-in fade-in slide-in-from-top-2">
                      <input 
                        type="number"
                        value={discount === 0 ? '' : discount}
                        onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                        placeholder="0"
                        className="flex-1 border border-neutral-200 rounded-[10px] px-4 py-2.5 text-sm focus:outline-none focus:border-black text-left font-mono transition-colors shadow-inner bg-[#f4f4f5]"
                        dir="ltr"
                      />
                      <button 
                        onClick={() => { setDiscount(0); setShowDiscountInput(false); }}
                        className="bg-white border border-neutral-200 text-neutral-600 px-4 py-2.5 rounded-[10px] text-sm font-bold hover:bg-neutral-50 transition-colors shadow-sm"
                      >
                        لابردن
                      </button>
                    </div>
                  )}
               </div>

               <div className="flex justify-between items-end border-t border-dashed border-neutral-200 pt-4 mt-2">
                  <span className="font-bold text-[15px] text-black">کۆی کۆتایی:</span>
                  <div className="text-left leading-none">
                     <span className="font-black text-[28px] text-black tracking-tighter block">{total.toLocaleString()}</span>
                     <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest block mt-1">IQD (دینار)</span>
                  </div>
               </div>
           </div>
           
           <div className="flex gap-3">
             <button 
               onClick={handlePrint}
               disabled={cart.length === 0}
               className="bg-white border border-neutral-200 text-neutral-700 font-bold w-14 h-14 rounded-[16px] flex items-center justify-center hover:bg-neutral-50 hover:border-black transition-all disabled:opacity-50 shadow-sm shrink-0"
               title="پرینتکردنی وەسل"
             >
                <Printer size={20} />
             </button>
             <button 
               onClick={() => { openCheckoutModal(); setIsMobileCartOpen(false); }}
               disabled={cart.length === 0}
               className="flex-1 bg-black text-white font-bold h-14 rounded-[16px] cursor-pointer hover:bg-neutral-800 disabled:opacity-50 transition-all active:scale-[0.98] shadow-xl shadow-black/20 flex items-center justify-center gap-2 text-[15px]"
             >
                پەسەندکردن و پارەدان
             </button>
           </div>
        </div>
      </div>

      {atariModalItem && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <form onSubmit={handleConfirmAtariItem} className="bg-white rounded-[24px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-5 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
                 <h2 className="text-xl font-black text-neutral-800">زیادکردنی کاتی یاریکردن</h2>
                 <button type="button" onClick={() => setAtariModalItem(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-200 text-neutral-500">
                   <X size={20} />
                 </button>
              </div>
              <div className="p-6 space-y-6">
                 <div>
                    <h3 className="font-bold text-neutral-900 mb-3 text-sm">بەرهەم: <span className="text-blue-600">{atariModalItem.name}</span></h3>
                    <div className="flex bg-neutral-100 p-1 rounded-[12px] mb-4">
                       <button type="button" onClick={() => setAtariSetupType('match')} className={`flex-1 py-2 text-sm font-bold rounded-[8px] transition-all ${atariSetupType === 'match' ? 'bg-white shadow-sm text-black' : 'text-neutral-500'}`}>بڕی یاری</button>
                       <button type="button" onClick={() => setAtariSetupType('time')} className={`flex-1 py-2 text-sm font-bold rounded-[8px] transition-all ${atariSetupType === 'time' ? 'bg-white shadow-sm text-black' : 'text-neutral-500'}`}>بە دەقە</button>
                    </div>

                    {atariSetupType === 'match' ? (
                       <div className="grid grid-cols-2 gap-3 mt-4">
                         <button type="button" onClick={() => { setMatchType('single'); setAtariCustomPrice(atariModalItem.price || 1000); }} className={`p-3 rounded-[12px] border-2 font-bold text-sm transition-all ${matchType === 'single' ? 'border-black bg-black text-white' : 'border-neutral-200 bg-white text-neutral-600'}`}>یەک یاری (سنگڵ)</button>
                         <button type="button" onClick={() => { setMatchType('double'); setAtariCustomPrice((atariModalItem.price || 1000) * 2); }} className={`p-3 rounded-[12px] border-2 font-bold text-sm transition-all ${matchType === 'double' ? 'border-black bg-black text-white' : 'border-neutral-200 bg-white text-neutral-600'}`}>یەک یاری (زەوجی)</button>
                       </div>
                    ) : (
                       <div className="grid grid-cols-2 gap-3 mt-4">
                         <button type="button" onClick={() => { setTimeMins(30); setAtariCustomPrice(atariModalItem.price || 1000); }} className={`p-3 rounded-[12px] border-2 font-bold text-sm transition-all ${timeMins === 30 ? 'border-black bg-black text-white' : 'border-neutral-200 bg-white text-neutral-600'}`}>٣٠ دەقە</button>
                         <button type="button" onClick={() => { setTimeMins(60); setAtariCustomPrice((atariModalItem.price || 1000) * 2); }} className={`p-3 rounded-[12px] border-2 font-bold text-sm transition-all ${timeMins === 60 ? 'border-black bg-black text-white' : 'border-neutral-200 bg-white text-neutral-600'}`}>١ کاتژمێر (٦٠ دەقە)</button>
                       </div>
                    )}
                 </div>

                 {atariSetupType === 'time' && (
                   <div>
                      <label className="block text-xs font-bold text-neutral-500 mb-1.5">کات بە دەقە بنووسە (گەر جیاواز بوو)</label>
                      <input type="number" min="1" value={timeMins} onChange={e => setTimeMins(Number(e.target.value))} className="w-full border border-neutral-200 rounded-[10px] px-4 py-3 font-bold focus:border-black outline-none dir-ltr" />
                   </div>
                 )}

                 <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-1.5">نرخی ئەم داواکارییە (دینار)</label>
                    <input type="number" min="0" value={atariCustomPrice} onChange={e => setAtariCustomPrice(Number(e.target.value))} className="w-full border border-neutral-200 rounded-[10px] px-4 py-3 font-bold focus:border-black outline-none dir-ltr text-lg bg-neutral-50" />
                 </div>
              </div>
              <div className="p-5 border-t border-neutral-100 bg-neutral-50 flex justify-end gap-2 text-sm">
                 <button type="button" onClick={() => setAtariModalItem(null)} className="px-6 py-2.5 rounded-[8px] font-bold text-neutral-600 hover:bg-neutral-200">پاشگەزبوونەوە</button>
                 <button type="submit" className="px-8 py-2.5 rounded-[8px] font-bold bg-black text-white hover:bg-neutral-800">زیادکردن</button>
              </div>
           </form>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
              <h2 className="text-xl font-black flex items-center gap-2">
                <Receipt size={24} className="text-neutral-500" />
                تەواوکردنی فرۆشتن
              </h2>
              <button 
                onClick={() => setIsCheckoutModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-200 text-neutral-500 transition-colors"
               >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              
              <div className="p-4 bg-neutral-50 rounded-[12px] border border-neutral-200 flex justify-between items-center">
                 <span className="font-bold text-neutral-600">کۆی گشتی بڕی پارە:</span>
                 <span className="text-2xl font-black">{total.toLocaleString()} <span className="text-sm text-neutral-400">IQD</span></span>
              </div>

              <div>
                 <label className="block text-sm font-bold text-neutral-700 mb-3">جۆری پارەدان</label>
                 <div className="grid grid-cols-2 gap-3">
                   <button 
                     onClick={() => setCheckoutType("cash")}
                     className={`p-4 rounded-[12px] border-2 flex flex-col items-center justify-center gap-2 transition-all font-bold ${
                       checkoutType === "cash" 
                        ? 'border-black bg-black text-white shadow-md' 
                        : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                     }`}
                   >
                      <Coins size={24} /> کاش
                   </button>
                   <button 
                     onClick={() => setCheckoutType("debt")}
                     className={`p-4 rounded-[12px] border-2 flex flex-col items-center justify-center gap-2 transition-all font-bold ${
                       checkoutType === "debt" 
                        ? 'border-red-600 bg-red-600 text-white shadow-md' 
                        : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                     }`}
                   >
                      <WalletCards size={24} /> قەرز
                   </button>
                 </div>
              </div>

              {checkoutType === "cash" && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 border-t border-neutral-100 pt-4">
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-3">بڕی پارەی وەرگیراو</label>
                    <input 
                      type="number"
                      dir="ltr"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="بڕی پارە بە دینار"
                      className="w-full border border-neutral-200 rounded-[10px] px-4 py-3 text-lg font-black focus:outline-none focus:border-black bg-white text-left font-mono"
                    />
                  </div>
                  {amountPaid !== "" && Number(amountPaid) >= total && (
                    <div className="p-4 bg-green-50 text-green-800 rounded-[12px] border border-green-200 flex justify-between items-center">
                      <span className="font-bold">باقی بۆ کڕیار:</span>
                      <span className="text-xl font-black">{(Number(amountPaid) - total).toLocaleString()} <span className="text-xs">IQD</span></span>
                    </div>
                  )}
                  {amountPaid !== "" && Number(amountPaid) < total && (
                    <div className="p-4 bg-red-50 text-red-800 rounded-[12px] border border-red-200 text-sm font-bold text-center">
                      بڕی وەرگیراو کەمترە لە کۆی گشتی
                    </div>
                  )}
                  <div className="grid grid-cols-4 gap-2 pt-2">
                     {[1000, 5000, 10000, 25000].map(val => (
                       <button
                         key={val}
                         onClick={() => setAmountPaid(val)}
                         className="py-2 bg-neutral-100 hover:bg-neutral-200 rounded-[8px] font-bold text-sm text-neutral-700 transition-colors font-mono"
                       >
                         {val.toLocaleString()}
                       </button>
                     ))}
                     <button
                         onClick={() => setAmountPaid(total)}
                         className="py-2 bg-neutral-800 hover:bg-black rounded-[8px] font-bold text-sm text-white transition-colors font-mono col-span-4 mt-1"
                       >
                         تەواوی بڕەکە دراوە
                       </button>
                  </div>
                </div>
              )}

              {checkoutType === "debt" && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="border-t border-neutral-100 pt-4">
                     <label className="block text-sm font-bold text-neutral-700 mb-3">کڕیار هەڵبژێرە یان دروست بکە</label>
                     {!isAddingCustomer ? (
                       <div className="flex gap-2">
                          <select 
                            value={debtCustomerId}
                            onChange={e => setDebtCustomerId(e.target.value)}
                            className="flex-1 border border-neutral-200 rounded-[10px] px-4 py-3 text-sm font-bold focus:outline-none focus:border-black bg-white"
                          >
                             <option value="">-- هەڵبژاردنی کڕیار --</option>
                             {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
                          </select>
                          <button 
                            onClick={() => setIsAddingCustomer(true)}
                            className="bg-neutral-100 w-12 flex flex-col items-center justify-center rounded-[10px] hover:bg-neutral-200 transition-colors text-neutral-700 font-bold active:scale-95 border border-dashed border-neutral-300 shrink-0"
                            title="کڕیاری نوێ"
                          >
                            <UserPlus size={20} />
                          </button>
                       </div>
                     ) : (
                       <div className="space-y-3 bg-neutral-50 p-4 rounded-[12px] border border-neutral-200">
                          <div className="flex justify-between items-center mb-1">
                             <span className="text-xs font-bold text-neutral-500">کڕیاری نوێ</span>
                             <button onClick={() => setIsAddingCustomer(false)} className="text-xs font-bold text-red-600 hover:underline">گەڕانەوە</button>
                          </div>
                          <input 
                            autoFocus
                            placeholder="ناوی کڕیار"
                            value={newCustomerName}
                            onChange={e => setNewCustomerName(e.target.value)}
                            className="w-full border border-neutral-200 rounded-[10px] px-4 py-3 text-sm font-bold focus:outline-none focus:border-black bg-white"
                          />
                          <input 
                            placeholder="ژمارە مۆبایل (ئارەزوومەندە)"
                            dir="ltr"
                            value={newCustomerPhone}
                            onChange={e => setNewCustomerPhone(e.target.value)}
                            className="w-full border border-neutral-200 rounded-[10px] px-4 py-3 text-sm font-bold focus:outline-none focus:border-black bg-white text-left font-mono"
                          />
                       </div>
                     )}
                  </div>
                </div>
              )}

            </div>
            <div className="p-6 border-t border-neutral-100 bg-neutral-50 shrink-0">
               <button 
                 onClick={processCheckout}
                 disabled={(checkoutType === "debt" && !isAddingCustomer && !debtCustomerId) || (checkoutType === "debt" && isAddingCustomer && !newCustomerName.trim())}
                 className="w-full bg-green-600 text-white font-bold p-4 rounded-[12px] shadow-lg shadow-green-600/20 hover:bg-green-700 transition-all active:scale-95 disabled:opacity-50 text-lg"
               >
                 پەسەندکردن و تەواوکردن
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Preview Overlay */}
      {showReceiptPreview && lastOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="bg-white text-black w-full max-w-[350px] p-8 shadow-2xl rounded-[4px] animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 font-mono text-sm">
              <div className="text-center border-b-2 border-black border-dashed pb-4 mb-4">
                 <h2 className="text-2xl font-black mb-1">{settings?.receiptHeader || 'Pampas Cafe'}</h2>
                 <p className="text-[10px] font-bold text-neutral-500 tracking-widest leading-relaxed">
                   {settings?.receiptFooter || 'سوپاس بۆ سەردانتان!'}
                 </p>
                 <div className="text-[10px] font-bold text-neutral-400 mt-2 tracking-wider">Powered by mas menu</div>
              </div>
              
              <div className="space-y-1 mb-4 text-[11px] font-bold">
                 <div className="flex justify-between">
                   <span>ژمارەی وەسڵ:</span>
                   <span>{lastOrder.id}</span>
                 </div>
                 <div className="flex justify-between">
                   <span>بەروار:</span>
                   <span>{format(new Date(), 'yyyy/MM/dd HH:mm')}</span>
                 </div>
                 <div className="flex justify-between">
                   <span>مێز:</span>
                   <span>{lastOrder.tableId === 'takeaway' ? 'سەفەری' : lastOrder.tableId}</span>
                 </div>
              </div>

              <div className="border-b border-black border-dashed mb-4"></div>

              <div className="space-y-2 mb-6">
                 {lastOrder.items.map((item: any, idx: number) => (
                   <div key={idx} className="flex justify-between items-start">
                      <div className="flex-1">
                         <p className="font-black text-[13px]">{item.name}</p>
                         <p className="text-[10px] text-neutral-500">{item.qty} x {item.price.toLocaleString()}</p>
                      </div>
                      <span className="font-black">{(item.qty * item.price).toLocaleString()}</span>
                   </div>
                 ))}
              </div>

              <div className="border-t-2 border-black pt-4 space-y-2">
                 <div className="flex justify-between font-bold text-xs uppercase">
                   <span>سەرجەم:</span>
                   <span>{lastOrder.subtotal.toLocaleString()} د.ع</span>
                 </div>
                 {lastOrder.discount > 0 && (
                   <div className="flex justify-between font-bold text-xs text-red-600">
                     <span>داشکاندن:</span>
                     <span>-{lastOrder.discount.toLocaleString()} د.ع</span>
                   </div>
                 )}
                 <div className="flex justify-between font-black text-xl border-t border-black border-dashed pt-2 mt-2">
                   <span>کۆ:</span>
                   <span>{lastOrder.total.toLocaleString()}</span>
                 </div>
              </div>

              <div className="mt-8 text-center bg-black text-white py-2 rounded-[2px] font-black text-[10px] tracking-widest animate-pulse">
                 پەناگیررا • PRINTED SUCCESSFULLY
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
