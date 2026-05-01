import React, { useState, useEffect } from "react";
import { usePOSData, MenuItem, Table } from "../hooks/usePOSData";
import { safeAwait } from "../lib/errorHandler";
import { collection, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import toast from "react-hot-toast";
import { OperationType } from "../lib/errorHandler";
import { useSearchParams } from "react-router-dom";
import { Trash, Receipt, Printer, X, Tag } from "lucide-react";

interface CartItem extends MenuItem {
  qty: number;
}

export default function POS() {
  const { categories, menuItems, tables, loading } = usePOSData();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [localCart, setLocalCart] = useState<CartItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [discount, setDiscount] = useState<number>(0);
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const tableId = searchParams.get("table");
    if (tableId) {
       setSelectedTable(tableId);
    }
  }, [searchParams]);

  const filteredItems = menuItems.filter(item => 
    (selectedCategory === "all" || item.categoryId === selectedCategory) && item.available
  );

  const cart = selectedTable ? (tables.find(t => t.id === selectedTable)?.cartItems || []) : localCart;
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

  const addToCart = (item: MenuItem) => {
    const existing = cart.find(i => i.id === item.id);
    if (existing) {
      updateCart(cart.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      updateCart([...cart, { ...item, qty: 1 }]);
    }
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
            <h2>پامپاس کافێ</h2>
            <p>پسوولەی فرۆشتن</p>
            <div class="flex">
               <span>مێز:</span>
               <span class="bold">${selectedTable ? tables.find(t => t.id === selectedTable)?.name : "تەیکەوێ"}</span>
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
            <p style="margin-top: 20px;">سوپاس بۆ سەردانتان!</p>
            <script>
              window.onload = function() { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return toast.error("پسوولە بەتاڵە");

    handlePrint();

    const orderData = {
      tableId: selectedTable || "takeaway",
      items: cart.map(c => ({ id: c.id, name: c.name, price: c.price, qty: c.qty })),
      subtotal,
      discount: actualDiscount,
      total,
      status: "paid",
      createdAt: serverTimestamp(),
      paymentMethod: "cash"
    };

    const [, err] = await safeAwait(
      addDoc(collection(db, "orders"), orderData),
      "پارەدان سەرکەوتووبوو",
      "هەڵە لە پارەدان",
      OperationType.CREATE,
      "orders"
    );

    if (!err) {
      updateCart([]); 
      if (!selectedTable) {
        setLocalCart([]);
      }
      setDiscount(0);
      setShowDiscountInput(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-sm text-neutral-500 mt-20">چاوەڕێبە... خەریکی هێناني داتاکانە</div>;

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-4rem)] lg:h-screen relative bg-[#fcfcfc]" dir="rtl">
      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden p-6 gap-6">
        
        {/* Categories */}
        <div className="flex gap-3 overflow-x-auto pb-2 shrink-0 scrollbar-hide items-center justify-start">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-6 py-2.5 rounded-[8px] text-sm font-bold whitespace-nowrap transition-all border ${selectedCategory === "all" ? "bg-black text-white border-black shadow" : "bg-white text-neutral-600 hover:bg-neutral-50 border-neutral-200"}`}
          >
            هەمووی
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-6 py-2.5 rounded-[8px] text-sm font-bold whitespace-nowrap transition-all border ${selectedCategory === cat.id ? "bg-black text-white border-black shadow" : "bg-white text-neutral-600 hover:bg-neutral-50 border-neutral-200"}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Items Container */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 overflow-y-auto pb-[250px] lg:pb-0 pr-1">
          {filteredItems.map(item => (
            <button 
              key={item.id} 
              onClick={() => addToCart(item)}
              className="bg-white border border-neutral-200 p-5 rounded-[12px] cursor-pointer hover:border-black hover:shadow-lg transition-all active:scale-[0.98] flex flex-col justify-between min-h-[120px] text-right group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-1.5 h-full bg-black opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="font-bold text-[15px] text-neutral-800 leading-tight pr-2">{item.name}</div>
              <div className="font-black text-[15px] text-neutral-900 mt-4 bg-neutral-50 self-end px-3 py-1 rounded-[6px] border border-neutral-100">{item.price.toLocaleString()} دینار</div>
            </button>
          ))}
          {filteredItems.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-neutral-400 gap-4">
                  <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center">
                     <Receipt size={24} className="text-neutral-300" />
                  </div>
                  <span>هیچ بەرهەمێک نییە لەم بەشەدا</span>
              </div>
          )}
        </div>
      </div>

      {/* Cart/Receipt Sidebar */}
      <div className="w-full lg:w-[380px] bg-white border-r lg:border-r-0 lg:border-l border-neutral-200 flex flex-col shadow-[-10px_0_40px_rgba(0,0,0,0.03)] h-[70vh] lg:h-auto fixed bottom-0 lg:relative z-20 rounded-t-[20px] lg:rounded-none">
        {/* Sidebar Header */}
        <div className="p-5 border-b border-neutral-100 flex justify-between items-center shrink-0 bg-white lg:rounded-none rounded-t-[20px]">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center text-black">
                <Receipt size={18} />
             </div>
             <div>
               <h2 className="text-[16px] font-black leading-none mb-1">پسوولە</h2>
               <p className="text-xs text-neutral-500 font-medium">لیستی داواکارییەکان</p>
             </div>
          </div>
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button 
                onClick={handleClearCart}
                className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors flex items-center gap-1"
                title="سڕینەوەی هەمووی"
              >
                <Trash size={16} />
              </button>
            )}
            <select 
              value={selectedTable} 
              onChange={(e) => setSelectedTable(e.target.value)}
              className="border-neutral-200 rounded-[8px] px-3 py-2 border text-sm font-bold bg-neutral-50 focus:outline-none focus:border-black cursor-pointer appearance-none outline-none"
            >
               <option value="">تەیکەوێ</option>
               {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
        
        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-[#fcfcfc]">
          {cart.map(item => (
            <div key={item.id} className="flex flex-col bg-white border border-neutral-100 p-3 rounded-[10px] shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <span className="font-bold text-sm text-neutral-800 pr-1">{item.name}</span>
                <button onClick={() => removeFromCart(item.id)} className="text-neutral-400 hover:text-red-500 transition-colors"><X size={16} /></button>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="font-black text-neutral-900 bg-neutral-50 px-2 py-1 rounded-[4px] border border-neutral-100">
                   {(item.price * item.qty).toLocaleString()}
                </div>
                <div className="flex gap-1 items-center bg-neutral-100 rounded-[6px] p-1 border border-neutral-200">
                  <button className="w-7 h-7 flex items-center justify-center font-bold font-mono bg-white rounded shadow-sm text-neutral-600 hover:text-black hover:border-black border border-transparent transition-all" onClick={() => adjustQty(item.id, 1)}>+</button>
                  <span className="w-8 text-center font-bold text-[14px]">{item.qty}</span>
                  <button className="w-7 h-7 flex items-center justify-center font-bold font-mono bg-white rounded shadow-sm text-neutral-600 hover:text-black hover:border-black border border-transparent transition-all" onClick={() => adjustQty(item.id, -1)}>-</button>
                </div>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-neutral-400 gap-4 opacity-50">
               <Receipt size={48} className="text-neutral-300" />
               <p className="text-sm font-bold">هیچ بەرهەمێک هەڵنەبژێردراوە</p>
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-6 border-t border-neutral-100 bg-white shrink-0">
           <div className="space-y-3 mb-5">
               <div className="flex justify-between font-bold text-[14px] text-neutral-500">
                  <span>کۆی گشتی:</span>
                  <span>{subtotal.toLocaleString()} د.ع</span>
               </div>
               
               {/* Discount Section */}
               <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[14px] text-neutral-500 flex items-center gap-1.5">
                      <Tag size={14} /> داشکاندن:
                    </span>
                    <button 
                      onClick={() => setShowDiscountInput(!showDiscountInput)}
                      className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      {actualDiscount > 0 ? `-${actualDiscount.toLocaleString()}` : 'زیادکردن +'}
                    </button>
                  </div>
                  {showDiscountInput && (
                    <div className="flex gap-2">
                      <input 
                        type="number"
                        value={discount === 0 ? '' : discount}
                        onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                        placeholder="بڕی داشکاندن..."
                        className="flex-1 border border-neutral-200 rounded-[6px] px-3 py-1.5 text-sm focus:outline-none focus:border-black text-right transition-colors"
                        dir="ltr"
                      />
                      <button 
                        onClick={() => setShowDiscountInput(false)}
                        className="bg-neutral-100 text-neutral-600 px-3 py-1.5 rounded-[6px] text-sm font-bold hover:bg-neutral-200 transition-colors"
                      >
                        لابردن
                      </button>
                    </div>
                  )}
               </div>

               <div className="flex justify-between font-black text-[24px] border-t border-dashed border-neutral-200 pt-3 text-black">
                  <span>کۆی کۆتایی:</span>
                  <span>{total.toLocaleString()} د.ع</span>
               </div>
           </div>
           
           <div className="flex gap-2">
             <button 
               onClick={handlePrint}
               disabled={cart.length === 0}
               className="bg-neutral-100 text-neutral-700 font-bold p-4 rounded-[10px] flex items-center justify-center hover:bg-neutral-200 transition-all disabled:opacity-50"
               title="پرینتکردنی وەسل"
             >
                <Printer size={20} />
             </button>
             <button 
               onClick={handleCheckout}
               disabled={cart.length === 0}
               className="flex-1 bg-black text-white font-bold p-4 rounded-[10px] cursor-pointer hover:bg-neutral-800 disabled:opacity-50 transition-all active:scale-[0.98] shadow-lg shadow-black/10 flex items-center justify-center gap-2"
             >
                پەسەندکردن و پارەدان
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}
