import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { 
  LayoutDashboard, 
  Coffee, 
  ShoppingCart, 
  MenuSquare, 
  CalendarCheck, 
  Users, 
  Receipt, 
  BarChart3, 
  Settings,
  LogOut,
  Menu as MenuIcon,
  X,
  WalletCards
} from "lucide-react";
import { useState } from "react";
import { cn } from "../lib/utils";

const navItems = [
  { path: "/", label: "داشبۆرد", icon: LayoutDashboard, adminOnly: true },
  { path: "/pos", label: "فرۆشتن (POS)", icon: ShoppingCart },
  { path: "/tables", label: "مێزەکان", icon: Coffee },
  { path: "/debts", label: "قەرزەکان", icon: WalletCards, adminOnly: true },
  { path: "/menu", label: "مێنۆ", icon: MenuSquare, adminOnly: true },
  { path: "/reservations", label: "حجزکردن", icon: CalendarCheck, adminOnly: true },
  { path: "/expenses", label: "خەرجییەکان", icon: Receipt, adminOnly: true },
  { path: "/reports", label: "ڕاپۆرتەکان", icon: BarChart3, adminOnly: true },
  { path: "/users", label: "بەکارهێنەران", icon: Users, adminOnly: true },
  { path: "/settings", label: "ڕێکخستنەکان", icon: Settings, adminOnly: true },
];

export default function Layout() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navLinks = navItems.filter(item => !item.adminOnly || profile?.role === "admin");

  return (
    <div className="flex h-screen bg-[#f9f9f9] text-black font-sans" dir="rtl">
      
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-neutral-100 z-50 flex items-center justify-between px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black text-white flex items-center justify-center rounded-[8px] font-black text-xs tracking-wider">PM</div>
          <h1 className="text-lg font-black tracking-tight">Pampas Cafe</h1>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-neutral-600 bg-neutral-50 rounded-[8px] active:scale-95 transition-transform">
          {mobileOpen ? <X size={20} /> : <MenuIcon size={20} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 right-0 z-40 w-[240px] bg-white border-l border-neutral-100 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.02)]",
        mobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      )}>
        <div className="h-[80px] px-6 flex items-center border-b border-neutral-100 shrink-0 hidden lg:flex">
          <div className="flex items-center gap-3 w-full">
            <div className="w-10 h-10 bg-black text-white flex items-center justify-center rounded-[10px] font-black text-sm tracking-wider shadow-md">PM</div>
            <div>
              <div className="text-[15px] font-black tracking-tight leading-none text-neutral-900">PAMPAS</div>
              <div className="text-[10px] font-bold text-neutral-400 mt-1 uppercase tracking-widest">Cafe System</div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1 mt-16 lg:mt-0">
          <p className="px-3 text-xs font-bold text-neutral-400 mb-4 uppercase tracking-wider">مێنۆی سەرەکی</p>
          {navLinks.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-[14px] font-medium transition-all rounded-[12px] group",
                  isActive 
                    ? "bg-black text-white shadow-md shadow-black/10" 
                    : "text-neutral-500 hover:bg-neutral-50 hover:text-black"
                )}
              >
                <item.icon size={20} className={cn(
                   "transition-colors",
                   isActive ? "text-white" : "text-neutral-400 group-hover:text-black"
                )} />
                {item.label}
              </NavLink>
            );
          })}
        </div>

        <div className="p-4 border-t border-neutral-100 shrink-0 bg-neutral-50/50">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-[13px] font-bold text-neutral-600 bg-white border border-neutral-200 rounded-[10px] hover:bg-neutral-50 hover:text-red-600 hover:border-red-200 transition-all shadow-sm active:scale-[0.98]"
          >
            <LogOut size={16} />
            دەرچوون لە هەژمار
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-[#f9f9f9] overflow-hidden">
        
        {/* Desktop Header */}
        <div className="hidden lg:flex h-[80px] border-b border-neutral-100 items-center justify-between px-10 bg-white shrink-0 shadow-[0_4px_40px_rgba(0,0,0,0.01)] z-10 relative">
          <div className="flex items-center gap-4">
             {navLinks.map(item => location.pathname === item.path && (
               <div key="title" className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-neutral-50 rounded-[10px] flex items-center justify-center text-neutral-600 border border-neutral-100">
                     <item.icon size={20} />
                  </div>
                  <div>
                    <h2 className="text-[16px] font-black text-neutral-900">{item.label}</h2>
                    <p className="text-[11px] text-neutral-400 font-bold mt-0.5">بەشی {item.label} بەڕێوەببە</p>
                  </div>
               </div>
             ))}
          </div>
          <div className="flex gap-4 items-center">
            
            <div className="h-8 w-px bg-neutral-100 mx-2"></div>
            
            <div className="flex items-center gap-3 bg-neutral-50 pr-4 pl-1.5 py-1.5 rounded-[12px] border border-neutral-100">
              <div className="text-left leading-tight">
                <span className="block text-[13px] font-bold text-neutral-800">
                  {profile?.name}
                </span>
                <span className="block text-[10px] font-bold text-neutral-400">
                  {profile?.role === 'admin' ? 'بەڕێوەبەر (Admin)' : 'ستاف (Staff)'}
                </span>
              </div>
              <div className="w-[36px] h-[36px] bg-black text-white rounded-[8px] flex items-center justify-center font-black uppercase text-[14px] shadow-sm">
                {profile?.name?.charAt(0) || 'U'}
              </div>
            </div>

          </div>
        </div>

        <div className="flex-1 overflow-auto bg-[#f9f9f9] pt-16 lg:pt-0 relative">
          <Outlet />
        </div>
      </main>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-30 lg:hidden transition-all"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </div>
  );
}
