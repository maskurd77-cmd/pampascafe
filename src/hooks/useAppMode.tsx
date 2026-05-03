import React, { createContext, useContext, useState, useEffect } from 'react';

type AppMode = 'cafe' | 'atari';

interface AppContextType {
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [appMode, setAppMode] = useState<AppMode>(() => {
    return (localStorage.getItem('appMode') as AppMode) || 'cafe';
  });

  useEffect(() => {
    localStorage.setItem('appMode', appMode);
  }, [appMode]);

  return <AppContext.Provider value={{ appMode, setAppMode }}>{children}</AppContext.Provider>;
};

export const useAppMode = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppMode must be used within AppProvider");
  return ctx;
};
