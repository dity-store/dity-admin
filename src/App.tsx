/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import GuideView from './components/GuideView';
import Login from './components/Login';
import AdminPanelView from './components/AdminPanelView';
import OrdersView from './components/OrdersView';
import ProfilView from './components/ProfilView';
import InvoiceCreator from './components/InvoiceCreator';
import { guideData } from './data/guideContent';
import { initAuth } from './hooks/useGoogleAuth';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [adminViewState, setAdminViewState] = useState<any>({ type: 'menu' });
  const [isInitializing, setIsInitializing] = useState(true);
  const [hideNav, setHideNav] = useState(false);

  useEffect(() => {
    const scrollContainer = document.getElementById('main-scroll-container');
    if (scrollContainer) scrollContainer.scrollTop = 0;
    
    if (activeTab === 'dashboard' || activeTab === 'profil') {
       setHideNav(false);
    }
  }, [activeTab]);

  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null);
      setToken(null);
      localStorage.removeItem('google_access_token');
      setActiveTab('dashboard');
    };
    const handleOpenOrder = () => setActiveTab('order');
    const handleSwitchTab = (e: Event) => {
        const customEvent = e as CustomEvent;
        setActiveTab(customEvent.detail);
    };
    window.addEventListener('auth-expired', handleAuthExpired);
    window.addEventListener('open-order', handleOpenOrder);
    window.addEventListener('switch-tab', handleSwitchTab);
    return () => {
       window.removeEventListener('auth-expired', handleAuthExpired);
       window.removeEventListener('open-order', handleOpenOrder);
       window.removeEventListener('switch-tab', handleSwitchTab);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = initAuth(
      async (u, t) => {
        setUser(u);
        setToken(t);
        setIsInitializing(false); // Make UI responsive immediately
        setActiveTab('dashboard'); // Reset to dashboard upon successful login
        try {
           const module = await import('./services/sheetsService');
           await module.ensureTemplatesTable(t);
           await module.prefetchAllTableData(t, ['Products', 'Categories', 'Orders', 'Users', 'Promos', 'Announcements', 'Store_Hours', 'Templates', 'Clients', 'Order_Items']);
        } catch (err) {
           console.error("Prefetch failed:", err);
        }
      },
      () => {
        setUser(null);
        setToken(null);
        setActiveTab('dashboard'); // Reset on logout
        setIsInitializing(false);
      }
    );
    return () => unsubscribe();
  }, []);



  if (isInitializing) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center text-slate-500">
           <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-blue-600 border-r-blue-600 animate-spin mb-4"></div>
           <p className="font-medium text-sm">Memuat Workspace...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <Login setToken={(t: string) => { setToken(t); setActiveTab('dashboard'); }} />
    );
  }

  return (
    <div className="flex flex-col-reverse md:flex-row h-[100dvh] w-full bg-slate-100 overflow-hidden font-sans text-slate-800">
      {!hideNav && <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />}
      
      <main className="flex-1 flex flex-col min-w-0 min-h-0 relative">
        <div id="main-scroll-container" className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth w-full relative">
          <div className={activeTab === 'dashboard' ? 'block h-full' : 'hidden'}><DashboardView token={token} setActiveTab={setActiveTab} setAdminViewState={setAdminViewState} /></div>
          <div className={activeTab === 'admin_panel' ? 'block h-full' : 'hidden'}><AdminPanelView token={token} setHideNav={setHideNav} viewState={adminViewState} setViewState={setAdminViewState} isActive={activeTab === 'admin_panel'} /></div>
          <div className={activeTab === 'order' ? 'block h-full' : 'hidden'}><OrdersView token={token} setHideNav={setHideNav} isActive={activeTab === 'order'} /></div>
          <div className={activeTab === 'profil' ? 'block h-full' : 'hidden'}><ProfilView user={user} /></div>
        </div>
      </main>
    </div>
  );
}

