import React, { Component, ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import Layout from "./components/Layout";
import Login from "./pages/Login";

import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Tables from "./pages/Tables";
import Menu from "./pages/Menu";
import Reservations from "./pages/Reservations";
import Expenses from "./pages/Expenses";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import Settings from "./pages/Settings";

class ErrorBoundary extends Component<any, any> {
  state: { hasError: boolean; error: Error | null };
  props: any;
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.state.error?.message?.includes("Missing or insufficient permissions")) {
         return (
           <div className="min-h-screen flex items-center justify-center bg-[#f0f0f0] p-4 font-sans text-right" dir="rtl">
              <div className="w-full max-w-lg bg-white p-8 rounded-[4px] border border-red-200">
                <h1 className="text-xl font-bold text-red-600 mb-4">کێشە لە دەسەڵاتەکانی فایەربەیس هەیە!</h1>
                <p className="text-sm text-neutral-600 mb-4 leading-relaxed">
                   فایەربەیسەکەی تۆ ڕێگە نادات داتاکان بخوێنرێنەوە (Missing or insufficient permissions). 
                   تکایە بڕۆ بۆ بەشی <strong>Firestore Database</strong> لەناو <strong>Firebase Console</strong>، 
                   پاشان بڕۆ بۆ تابی <strong>Rules</strong> وە ئەم کۆدە دابنێ بۆ ئەوەی ڕێگە بە کارکردنی ئەپەکە بدات:
                </p>
                <pre className="bg-neutral-100 p-4 rounded text-left text-xs mb-4 overflow-x-auto font-mono text-neutral-800 border border-neutral-200" dir="ltr">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`}
                </pre>
                <button 
                  onClick={() => window.location.reload()} 
                  className="bg-black text-white px-6 py-2 rounded-[4px] font-bold mt-4"
                >
                  نوێکردنەوەی پەڕە
                </button>
              </div>
           </div>
         );
      }
      return <div className="p-8 text-center text-red-500 font-bold" dir="rtl">هەڵەیەک ڕوویدا: {this.state.error?.message}</div>;
    }
    return this.props.children;
  }
}

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const { user, profile, loading } = useAuth();
  
  if (loading) return <div className="h-screen flex items-center justify-center bg-neutral-50"><div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && profile?.role !== "admin") return <Navigate to="/tables" replace />;
  
  return <>{children}</>;
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Toaster position="top-center" toastOptions={{ style: { background: '#171717', color: '#fff', padding: '16px', borderRadius: '8px', fontSize: '14px', fontFamily: 'system-ui, sans-serif' } }} />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<ProtectedRoute adminOnly><Dashboard /></ProtectedRoute>} />
              <Route path="pos" element={<POS />} />
              <Route path="tables" element={<Tables />} />
              <Route path="menu" element={<ProtectedRoute adminOnly><Menu /></ProtectedRoute>} />
              <Route path="reservations" element={<ProtectedRoute adminOnly><Reservations /></ProtectedRoute>} />
              <Route path="expenses" element={<ProtectedRoute adminOnly><Expenses /></ProtectedRoute>} />
              <Route path="reports" element={<ProtectedRoute adminOnly><Reports /></ProtectedRoute>} />
              <Route path="users" element={<ProtectedRoute adminOnly><Users /></ProtectedRoute>} />
              <Route path="settings" element={<ProtectedRoute adminOnly><Settings /></ProtectedRoute>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
