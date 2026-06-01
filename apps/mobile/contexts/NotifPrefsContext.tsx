import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as storage from '@/lib/storage';

const STORAGE_KEY = 'notif_popup_enabled';

interface NotifPrefsContextValue {
  popupsEnabled: boolean;
  togglePopups: () => Promise<void>;
  loaded: boolean;
}

const NotifPrefsContext = createContext<NotifPrefsContextValue | null>(null);

export function NotifPrefsProvider({ children }: { children: ReactNode }) {
  const [popupsEnabled, setPopupsEnabled] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    storage.getItem(STORAGE_KEY).then((val) => {
      if (val !== null) setPopupsEnabled(val === 'true');
      setLoaded(true);
    });
  }, []);

  const togglePopups = useCallback(async () => {
    const next = !popupsEnabled;
    setPopupsEnabled(next);
    await storage.setItem(STORAGE_KEY, String(next));
  }, [popupsEnabled]);

  return (
    <NotifPrefsContext.Provider value={{ popupsEnabled, togglePopups, loaded }}>
      {children}
    </NotifPrefsContext.Provider>
  );
}

export function useNotifPrefs() {
  const ctx = useContext(NotifPrefsContext);
  if (!ctx) throw new Error('useNotifPrefs must be used within NotifPrefsProvider');
  return ctx;
}
