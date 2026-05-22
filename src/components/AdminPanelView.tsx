import React, { useState, useEffect } from 'react';
import { ShoppingCart, Users, Package, Grid, Tag, Megaphone, Lightbulb, Clock, Settings, RefreshCw, AlertTriangle, FileText, Database, ArrowLeft, ChevronRight, ChevronLeft, Plus, Save, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { getTableData, ensureTemplatesTable, appendTableRow, updateTableRow } from '../services/sheetsService';
import { getDriveStorageStats, getFolderSizeStats, ensureDityStoreFolder } from '../services/driveService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

export default function AdminPanelView({ token, setHideNav, viewState: propViewState, setViewState: propSetViewState, isActive = true }: { token: string | null, setHideNav?: (val: boolean) => void, viewState?: any, setViewState?: (val: any) => void, isActive?: boolean }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{status: 'idle'|'syncing'|'success'|'error', message: string}>({ status: 'idle', message: '' });
  
  const [dataCache, setDataCache] = useState<Record<string, { headers: string[], rows: any[] }>>({});
  const [dataStats, setDataStats] = useState<Record<string, number>>({});
  const [templatesData, setTemplatesData] = useState<any[]>([]);

  // Navigation State
  // viewState can be: { type: 'menu' } | { type: 'list', menuId: string } | { type: 'form', menuId: string, rowIndex?: number, rowData?: any[] }
  const [localViewState, setLocalViewState] = useState<any>({ type: 'menu' });
  const viewState = propViewState || localViewState;
  const setViewState = propSetViewState || setLocalViewState;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');

  // Update setHideNav when view state changes
  useEffect(() => {
    if (setHideNav && isActive) {
      setHideNav(viewState.type !== 'menu');
    }
  }, [viewState.type, setHideNav, isActive]);

  const handleSyncData = async (forceRefresh = false) => {
    if (!token) {
      setSyncStatus({ status: 'error', message: 'Token akses tidak valid. Harap login kembali.' });
      return;
    }
    
    setIsSyncing(true);
    setSyncStatus({ status: 'syncing', message: 'Mengunduh data dari Spreadsheet...' });
    
    try {
      if (forceRefresh) {
         await ensureTemplatesTable(token);
      }
      
      const tablesToFetch = ['Products', 'Categories', 'Orders', 'Users', 'Promos', 'Announcements', 'Insights', 'Store_Hours', 'Templates', 'Clients'];
      const stats: Record<string, number> = {};
      const newCache: Record<string, { headers: string[], rows: any[] }> = {};
      
      const promises = tablesToFetch.map(async (table) => {
        try {
          const rowsRes = await getTableData(token, table, forceRefresh);
          if (rowsRes.length > 0) {
            stats[table] = rowsRes.length - 1;
            newCache[table] = { headers: rowsRes[0], rows: rowsRes.slice(1) };
            if (table === 'Templates') {
              setTemplatesData(rowsRes.slice(1).map((r: any) => ({
                id: r[0], name: r[1], link: r[2]
              })));
            }
          } else {
            stats[table] = 0;
            newCache[table] = { headers: [], rows: [] };
          }
        } catch (e) {
          console.warn(`Gagal mengambil data ${table}. Pastikan tab sheet dibuat.`);
          stats[table] = 0;
          newCache[table] = { headers: [], rows: [] };
        }
      });
      
      await Promise.all(promises);
      
      setDataCache(newCache);
      setDataStats(stats);
      setSyncStatus({ status: 'success', message: 'Data berhasil disinkronisasi.' });
    } catch (e: any) {
      console.error(e);
      setSyncStatus({ status: 'error', message: e.message || 'Terjadi kesalahan saat memuat data.' });
    } finally {
      setIsSyncing(false);
      setTimeout(() => {
        setSyncStatus(prev => prev.status === 'success' ? { status: 'idle', message: '' } : prev);
      }, 5000);
    }
  };

  useEffect(() => {
    if (token) {
      handleSyncData();
    }
  }, [token]);

  // Changed order: category first, then product, then clients, orders, then others.
  const menus = [
    { id: 'storage', label: 'STORAGE', icon: Database, color: 'text-indigo-600', bg: 'bg-indigo-100', countId: '' },
    { id: 'kategori', label: 'KATEGORI', icon: Grid, color: 'text-cyan-600', bg: 'bg-cyan-100', countId: 'Categories', table: 'Categories' },
    { id: 'produk', label: 'PRODUK', icon: Package, color: 'text-rose-600', bg: 'bg-rose-100', countId: 'Products', table: 'Products' },
    { id: 'klien', label: 'KLIEN', icon: Users, color: 'text-teal-600', bg: 'bg-teal-100', countId: 'Clients', table: 'Clients' },
    { id: 'template', label: 'TEMPLATE', icon: FileText, color: 'text-sky-600', bg: 'bg-sky-100', countId: 'Templates', table: 'Templates' },
    { id: 'promo', label: 'PROMO', icon: Tag, color: 'text-pink-600', bg: 'bg-pink-100', countId: 'Promos', table: 'Promos' },
    { id: 'kabar', label: 'KABAR', icon: Megaphone, color: 'text-purple-600', bg: 'bg-purple-100', countId: 'Announcements', table: 'Announcements' },
    { id: 'operasional', label: 'OPERASIONAL', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100', countId: 'Store_Hours', table: 'Store_Hours' },
  ];

  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  
  const [driveStats, setDriveStats] = useState({ usageGB: '0.0', limitGB: '15.0', freeGB: '0.0', usagePercent: 0 });
  const [folderStats, setFolderStats] = useState({ pngJpeg: 0, video: 0, pdfDoc: 0, totalWait: true });

  const handleMenuClick = (menuId: string) => {
    if (menuId === 'storage') {
       setIsStorageModalOpen(true);
       if (token) {
         ensureDityStoreFolder(token).then(folderId => {
           if (folderId) {
              getFolderSizeStats(token, folderId).then(fStats => {
                 if (fStats && fStats.total > 0) {
                   const total = fStats.total;
                   setFolderStats({
                      pngJpeg: Math.round((fStats.pngJpeg / total) * 100),
                      video: Math.round((fStats.video / total) * 100),
                      pdfDoc: Math.round((fStats.pdfDoc / total) * 100),
                      totalWait: false
                   });
                 } else {
                   setFolderStats({ pngJpeg: 0, video: 0, pdfDoc: 0, totalWait: false });
                 }
              });
           }
         });
         getDriveStorageStats(token).then((quota: any) => {
           if (quota) {
              const usage = parseInt(quota.usage || '0');
              const limit = parseInt(quota.limit || '15000000000');
              const usagePercent = limit > 0 ? Math.min(100, Math.round((usage / limit) * 100)) : 0;
              setDriveStats({
                  usagePercent,
                  usageGB: (usage / 1024 / 1024 / 1024).toFixed(1),
                  limitGB: (limit / 1024 / 1024 / 1024).toFixed(1),
                  freeGB: ((limit - usage) / 1024 / 1024 / 1024).toFixed(1)
              });
           }
         });
       }
    } else {
       setViewState({ type: 'list', menuId });
    }
  };

  const currentMenu = menus.find(m => m.id === viewState.menuId);
  const currentTableData = currentMenu?.table ? dataCache[currentMenu.table] : { headers: [], rows: [] };

  useEffect(() => {
    if (viewState.type === 'list') {
      setSearchQuery('');
      setCategoryFilter('Semua');
    }
  }, [viewState.menuId, viewState.type]);

  const [formData, setFormData] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-fill form data when navigating to form view
  useEffect(() => {
    if (viewState.type === 'form') {
      const rowData = viewState.rowData || (viewState.rowIndex !== undefined && currentTableData ? currentTableData.rows[viewState.rowIndex] : null);
      if (rowData) {
        setFormData(currentTableData.headers.map((_, i) => rowData[i] || ''));
      } else {
        setFormData(currentTableData.headers.map(() => ''));
      }
      setTimeout(() => {
        document.getElementById('form-scroll-container')?.scrollTo(0, 0);
      }, 50);
    }
  }, [viewState, currentTableData]);

  const handleSaveForm = async () => {
    if (!token || !currentMenu?.table) return;
    setIsSaving(true);
    try {
      const dataToSave = [...formData];
      if (viewState.rowIndex === undefined) {
        // Create new
        currentTableData.headers.forEach((h, i) => {
           const isId = h.toUpperCase() === 'ID' || h.toUpperCase().startsWith('ID_') || h.toUpperCase().endsWith('_ID') || h.toUpperCase() === 'ID_PRODUK';
           if (isId && !dataToSave[i]) {
              dataToSave[i] = 'ID-' + Math.random().toString(36).substr(2, 6).toUpperCase();
           }
        });
        await appendTableRow(token, currentMenu.table, dataToSave);
      } else {
        // Update existing (rowIndex is index in rows array, so +2 for real sheet row, since row[0] is headers)
        await updateTableRow(token, currentMenu.table, viewState.rowIndex + 2, dataToSave);
      }
      await handleSyncData(true); // Refresh data
      setViewState({ type: 'list', menuId: currentMenu.id });
    } catch (err) {
      alert("Terjadi kesalahan saat menyimpan data.");
    } finally {
      setIsSaving(false);
    }
  };

  if (viewState.type === 'form') {
    return (
      <div className="flex flex-col h-[100dvh] bg-slate-50 relative z-20">
        <header className="h-14 md:h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0 sticky top-0 z-10 w-full shadow-sm">
          <div className="flex items-center gap-3 w-full">
            <button 
              onClick={() => setViewState({ type: 'list', menuId: viewState.menuId })}
              className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight flex-1 truncate">
              {viewState.rowIndex === undefined ? 'Tambah' : 'Detail'} {currentMenu?.label ? currentMenu.label.charAt(0).toUpperCase() + currentMenu.label.slice(1).toLowerCase() : ''}
            </h1>
            {viewState.menuId !== 'klien' && (
              <button 
                onClick={handleSaveForm}
                disabled={isSaving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span className="hidden sm:inline">Simpan</span>
              </button>
            )}
          </div>
        </header>

        <div id="form-scroll-container" className="p-4 md:p-8 flex-1 overflow-y-auto scroll-smooth">
          <div className="max-w-2xl mx-auto space-y-4 pb-20">
          {viewState.menuId === 'klien' ? (
             <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8 mt-4 text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-4 shadow-sm border-2 border-white">
                   <Users className="w-10 h-10" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">{formData[currentTableData.headers.findIndex(h => h.toUpperCase().includes('NAMA') || h.toUpperCase().includes('NAME') || h.toUpperCase() === 'USERNAME')] || 'Klien'}</h2>
                <p className="text-sm text-slate-500 font-medium mt-1">{formData[currentTableData.headers.findIndex(h => h.toUpperCase().includes('EMAIL') || h.toUpperCase().includes('PHONE') || h.toUpperCase().includes('KONTAK'))] || 'Tidak ada detail kontak'}</p>
                <p className="text-xs text-slate-400 mt-4 bg-slate-50 px-4 py-1.5 rounded-full font-bold border border-slate-100">{formData[currentTableData.headers.findIndex(h => h.toUpperCase() === 'ID' || h.toUpperCase() === 'CLIENT_ID' || h.toUpperCase() === 'USER_ID')] || ''}</p>
             </div>
          ) : (
            currentTableData.headers.map((header, idx) => {
              const isIdField = header.toUpperCase() === 'ID' || header.toUpperCase().startsWith('ID_') || header.toUpperCase().endsWith('_ID') || header.toUpperCase() === 'ID_PRODUK';
              if (isIdField) return null;
              
              const isBooleanField = header.toUpperCase().startsWith('IS_');
              const isPipeListField = header.toUpperCase().includes('PRODUK_TERKAIT') || header.toUpperCase().includes('KETENTUAN_KHUSUS') || header.toUpperCase().includes('TERKAIT');
              
              return (
                <div key={idx} className={`bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex ${isBooleanField ? 'flex-row items-center justify-between' : 'flex-col gap-2'} focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-50 transition-all`}>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">{header.replace(/_/g, ' ')}</label>
                  {isBooleanField ? (
                     <button
                        type="button"
                        onClick={() => {
                           const newFormData = [...formData];
                           const currentVal = (formData[idx] || '').toString().toUpperCase();
                           newFormData[idx] = currentVal === 'TRUE' || currentVal === '1' ? 'FALSE' : 'TRUE';
                           setFormData(newFormData);
                        }}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${(formData[idx] || '').toString().toUpperCase() === 'TRUE' || (formData[idx] || '').toString() === '1' ? 'bg-blue-600' : 'bg-slate-300'}`}
                     >
                        <span className={`inline-block w-5 h-5 transform rounded-full bg-white transition-transform shadow-sm ${(formData[idx] || '').toString().toUpperCase() === 'TRUE' || (formData[idx] || '').toString() === '1' ? 'translate-x-6' : 'translate-x-1'}`} />
                     </button>
                  ) : isPipeListField ? (
                     <div className="space-y-3 mt-1">
                        {((formData[idx] || '').toString().split('|').map(s => s.trim()).filter(Boolean).length === 0 ? [''] : (formData[idx] || '').toString().split('|').map(s => s.trim())).map((item, itemIdx, arr) => (
                           <div key={itemIdx} className="flex gap-2 items-center bg-slate-50 border border-slate-200 p-2 rounded-xl group hover:border-blue-300 transition-colors">
                              <span className="text-xs font-bold w-6 h-6 flex items-center justify-center bg-white border border-slate-200 text-slate-400 rounded-lg shrink-0">{itemIdx + 1}</span>
                              <input 
                                value={item} 
                                onChange={e => {
                                  const newList = [...arr];
                                  newList[itemIdx] = e.target.value;
                                  const newFormData = [...formData];
                                  newFormData[idx] = newList.join(' | ');
                                  setFormData(newFormData);
                                }}
                                className="bg-transparent flex-1 focus:outline-none text-sm font-medium text-slate-800"
                                placeholder={`Isi ${header.replace(/_/g, ' ')}...`}
                              />
                              <div className="flex bg-white border border-slate-200 text-slate-400 rounded-lg overflow-hidden shrink-0">
                                 <button type="button" onClick={() => { 
                                     if (itemIdx > 0) {
                                        const newList = [...arr];
                                        [newList[itemIdx-1], newList[itemIdx]] = [newList[itemIdx], newList[itemIdx-1]];
                                        const newFormData = [...formData];
                                        newFormData[idx] = newList.join(' | ');
                                        setFormData(newFormData);
                                     }
                                  }} className="px-2 py-1 hover:bg-slate-100 hover:text-blue-600 transition-colors border-r border-slate-200 disabled:opacity-20" disabled={itemIdx === 0}>
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
                                 </button>
                                 <button type="button" onClick={() => {
                                     if (itemIdx < arr.length - 1) {
                                        const newList = [...arr];
                                        [newList[itemIdx+1], newList[itemIdx]] = [newList[itemIdx], newList[itemIdx+1]];
                                        const newFormData = [...formData];
                                        newFormData[idx] = newList.join(' | ');
                                        setFormData(newFormData);
                                     }
                                  }} className="px-2 py-1 hover:bg-slate-100 hover:text-blue-600 transition-colors disabled:opacity-20" disabled={itemIdx === arr.length - 1}>
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                                 </button>
                              </div>
                              <button type="button" onClick={() => {
                                 const newList = arr.filter((_, i) => i !== itemIdx);
                                 const newFormData = [...formData];
                                 newFormData[idx] = newList.join(' | ');
                                 setFormData(newFormData);
                              }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0 transition-colors">
                                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                           </div>
                        ))}
                        <button type="button" onClick={() => {
                           const currentList = (formData[idx] || '').toString().split('|').map(s => s.trim()).filter(Boolean);
                           const newList = [...currentList, ""];
                           const newFormData = [...formData];
                           newFormData[idx] = newList.join(' | ');
                           setFormData(newFormData);
                        }} className="text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 py-2 px-3 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1">
                           <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                           Tambah Baris
                        </button>
                     </div>
                  ) : header.toLowerCase().includes('deskripsi') || header.toLowerCase().includes('konten') || header.toLowerCase().includes('alamat') || header.toLowerCase().includes('keterangan') ? (
                    <textarea 
                      value={formData[idx] || ''} 
                      onChange={(e) => {
                        const newFormData = [...formData];
                        newFormData[idx] = e.target.value;
                        setFormData(newFormData);
                      }}
                      rows={6}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none font-medium text-slate-800"
                      placeholder={`Masukkan ${header.replace(/_/g, ' ')}...`}
                    />
                  ) : header.toUpperCase() === 'TIPE' && currentMenu.table === 'Promos' ? (
                     <select
                        value={formData[idx] || ''}
                        onChange={(e) => {
                           const newFormData = [...formData];
                           newFormData[idx] = e.target.value;
                           setFormData(newFormData);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-slate-800 appearance-none"
                     >
                        <option value="">Pilih Tipe...</option>
                        <option value="PERSEN">PERSEN</option>
                        <option value="NOMINAL">NOMINAL</option>
                     </select>
                  ) : header.toUpperCase() === 'STATUS' ? (
                     <select
                        value={formData[idx] || ''}
                        onChange={(e) => {
                           const newFormData = [...formData];
                           newFormData[idx] = e.target.value;
                           setFormData(newFormData);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-slate-800 appearance-none"
                     >
                        <option value="DRAFT">DRAFT</option>
                        <option value="UNPAID">UNPAID</option>
                        <option value="AWAITING_REVIEW">AWAITING_REVIEW</option>
                        <option value="PAID">PAID</option>
                        <option value="SUCCESS">SUCCESS</option>
                        <option value="REJECTED">REJECTED</option>
                        <option value="CANCELED">CANCELED</option>
                     </select>
                  ) : (
                    <div className="relative w-full">
                      {(header.toUpperCase().includes('HARGA') || header.toUpperCase().includes('NOMINAL') || header.toUpperCase().includes('TOTAL')) && (
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <span className="text-slate-400 font-bold sm:text-sm text-xs">Rp</span>
                        </div>
                      )}
                      <input 
                        type={header.toUpperCase().includes('TANGGAL') ? 'date' : header.toLowerCase().includes('batas_waktu') ? 'datetime-local' : 'text'}
                        value={formData[idx] || ''} 
                        onChange={(e) => {
                          const newFormData = [...formData];
                          if (header.toUpperCase().includes('HARGA') || header.toUpperCase().includes('NOMINAL') || header.toUpperCase().includes('TOTAL')) {
                             newFormData[idx] = e.target.value.replace(/\D/g, '');
                          } else {
                             newFormData[idx] = e.target.value;
                          }
                          setFormData(newFormData);
                        }}
                        className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-3 text-sm focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-slate-800 ${header.toUpperCase().includes('HARGA') || header.toUpperCase().includes('NOMINAL') || header.toUpperCase().includes('TOTAL') ? 'pl-10 pr-4' : 'px-4'}`}
                        placeholder={`Masukkan ${header.replace(/_/g, ' ')}...`}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
            
          {/* Inject Client Order History here */}
          {viewState.menuId === 'klien' && viewState.rowIndex !== undefined && (
            <div className="mt-12">
               <h3 className="font-bold text-slate-800 text-lg md:text-xl mb-4 tracking-tight border-b-2 border-slate-100 pb-3">Riwayat Pesanan Klien</h3>
               {(() => {
                  const clientsData = dataCache['Clients'];
                  const orderData = dataCache['Orders'];
                  
                  if (!clientsData?.rows || !orderData?.rows) return <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm"><Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" /><p className="text-sm text-slate-500 mt-2 text-center font-medium">Memuat data pesanan...</p></div>;
                  
                  const clientIdIdx = clientsData.headers.findIndex(h => h.toUpperCase().includes('ID'));
                  const clientId = clientIdIdx !== -1 ? currentTableData.rows[viewState.rowIndex][clientIdIdx] : null;
                  
                  if (!clientId) return <div className="p-6 bg-yellow-50 text-yellow-800 rounded-xl border border-yellow-200">ID Klien tidak valid atau belum tersimpan.</div>;

                  const orderClientIdx = orderData.headers.findIndex(h => h.toUpperCase().includes('CLIENT_ID') || h.toUpperCase().includes('KLIEN_ID') || h.toUpperCase().includes('USER_ID'));
                  
                  if (orderClientIdx === -1) return null;

                  const clientOrders = orderData.rows.filter(r => (r[orderClientIdx] || '').toString().trim() === (clientId || '').toString().trim());

                  if (clientOrders.length === 0) {
                     return (
                       <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl border-dashed text-center">
                          <p className="text-slate-500 text-sm font-medium">Belum ada pesanan dari klien ini.</p>
                       </div>
                     );
                  }

                  const oDateIdx = orderData.headers.findIndex(h => h.toUpperCase().includes('TANGGAL') || h.toUpperCase().includes('DATE') || h.toUpperCase() === 'CREATED_AT');
                  const oStatusIdx = orderData.headers.findIndex(h => h.toUpperCase().includes('STATUS'));
                  const oTotalIdx = orderData.headers.findIndex(h => h.toUpperCase().includes('TOTAL') || h.toUpperCase().includes('HARGA'));
                  const oIdIdx = orderData.headers.findIndex(h => h.toUpperCase().includes('ID'));

                  return (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {clientOrders.map((o, i) => {
                           const status = oStatusIdx !== -1 ? o[oStatusIdx] : 'UNKNOWN';
                           const date = oDateIdx !== -1 ? o[oDateIdx] : 'Unknown Date';
                           const total = oTotalIdx !== -1 ? o[oTotalIdx] : '0';
                           const id = oIdIdx !== -1 ? o[oIdIdx] : `ORD-${i}`;
                           
                           return (
                               <button 
                                   key={i} 
                                   onClick={() => window.dispatchEvent(new CustomEvent('open-order', { detail: { id, source: 'admin_panel' } }))}
                                   className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow flex flex-col relative group cursor-pointer text-left w-full h-[200px]"
                               >
                                  <div className="p-5 flex flex-col flex-1 h-full">
                                      <div className="flex justify-between items-start mb-3">
                                        <div className="bg-slate-100/80 text-slate-600 px-2 py-1 rounded text-[10px] font-bold tracking-widest uppercase font-mono">
                                           {id}
                                        </div>
                                        {status.toUpperCase() === 'PAID' || status.toUpperCase() === 'LUNAS' ? (
                                             <span className="text-emerald-600 flex items-center text-xs font-bold"><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> PAID</span>
                                         ) : status.toUpperCase() === 'CANCELED' ? (
                                             <span className="text-red-600 flex items-center text-xs font-bold"><XCircle className="w-3.5 h-3.5 mr-1" /> CANCELED</span>
                                         ) : (
                                             <span className="text-blue-600 flex items-center text-xs font-bold"><Clock className="w-3.5 h-3.5 mr-1" /> {status || 'UNPAID'}</span>
                                         )}
                                      </div>
                                      
                                      <h3 className="font-bold text-slate-900 text-lg leading-tight mb-1 truncate">Pesanan {id}</h3>
                                      <p className="text-slate-500 text-sm mb-4 truncate">Dibuat: {date || 'Tanggal tidak diketahui'}</p>
                                      
                                      <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                                         <div>
                                             <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">TOTAL TAGIHAN</p>
                                             <p className="font-extrabold text-slate-800 tracking-tight text-lg">
                                                {total ? `Rp${Number(total).toLocaleString('id-ID')}` : 'Rp0'}
                                             </p>
                                         </div>
                                         <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                           <ChevronLeft className="w-4 h-4 rotate-180" />
                                         </div>
                                      </div>
                                  </div>
                               </button>
                           );
                        })}
                     </div>
                  );
               })()}
            </div>
          )}

          </div>
        </div>
      </div>
    );
  }

  if (viewState.type === 'list') {
    return (
      <div className="flex flex-col h-[100dvh] bg-slate-50 relative z-20">
        <header className="h-14 md:h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0 sticky top-0 z-10 w-full shadow-sm">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setViewState({ type: 'menu' })}
              className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight truncate">
              {currentMenu?.label ? currentMenu.label.charAt(0).toUpperCase() + currentMenu.label.slice(1).toLowerCase() : ''}
            </h1>
          </div>
          {viewState.menuId !== 'klien' && (
            <button 
              onClick={() => setViewState({ type: 'form', menuId: viewState.menuId })}
              className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 flex items-center justify-center transition-colors shrink-0"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
        </header>
        
        <div className="p-4 md:p-8 flex-1 overflow-y-auto w-full max-w-5xl mx-auto pb-20">
           {viewState.menuId === 'produk' && (
              <div className="sticky -top-4 md:-top-8 z-10 bg-slate-50 pt-4 md:pt-8 pb-3 mb-4 space-y-3">
                 <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Cari produk..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 pl-10"
                    />
                    <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                 </div>
                 <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {['Semua', ...Array.from(new Set(currentTableData.rows.map(r => {
                       const catIdx = currentTableData.headers.findIndex(h => h.toUpperCase().includes('KATEGORI'));
                       return catIdx !== -1 ? r[catIdx] : null;
                    }).filter(Boolean)))].map((catId: any, i) => {
                       let catName = catId;
                       if (catId !== 'Semua' && dataCache['Categories']?.rows) {
                           const catData = dataCache['Categories'];
                           const idIdx = catData.headers.findIndex(h => h.toUpperCase().includes('ID'));
                           const nameIdx = catData.headers.findIndex(h => h.toUpperCase().includes('NAMA'));
                           if (idIdx !== -1 && nameIdx !== -1) {
                               const found = catData.rows.find(r => r[idIdx] === catId);
                               if (found) catName = found[nameIdx];
                           }
                       }
                       return (
                       <button 
                         key={i}
                         onClick={() => setCategoryFilter(catId)}
                         className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${categoryFilter === catId ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                       >
                         {catName}
                       </button>
                    )})}
                 </div>
              </div>
           )}

           {(() => {
              const filteredRows = currentTableData.rows.map((row, index) => ({ row, index })).filter(({ row }) => {
                 if (viewState.menuId === 'produk') {
                    const getVal = (search: string[]) => {
                      const idx = currentTableData.headers.findIndex(h => search.some(s => h.toUpperCase().includes(s)));
                      return idx !== -1 ? row[idx] : null;
                    };
                    const title = (getVal(['NAMA_', 'JUDUL']) || getVal(['NAMA']) || row[1] || '').toString();
                    const cat = getVal(['KATEGORI']) || '';
                    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase());
                    const matchesCat = categoryFilter === 'Semua' || cat === categoryFilter;
                    return matchesSearch && matchesCat;
                 }
                 return true;
              });

              if (filteredRows.length === 0) {
                 return (
                    <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
                       <p className="text-slate-500 text-sm">Tidak ada data ditemukan.</p>
                       <button 
                         onClick={() => setViewState({ type: 'form', menuId: viewState.menuId })}
                         className="mt-4 text-blue-600 font-bold hover:underline text-sm"
                       >
                         Tambah Data
                       </button>
                    </div>
                 );
              }

              return (
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                   {filteredRows.map(({ row, index: originalIndex }) => {
                     const getValIndexPair = (search: string[]) => {
                       const idx = currentTableData.headers.findIndex(h => search.some(s => h.toUpperCase().includes(s)));
                       return idx !== -1 ? { val: row[idx], headerName: currentTableData.headers[idx].toUpperCase() } : null;
                     };
                     const getVal = (search: string[]) => getValIndexPair(search)?.val || null;

                     const title = getVal(['NAMA_', 'JUDUL', 'KODE_PROMO']) || getVal(['NAMA']) || row[1] || 'Tanpa Judul';
                     
                     let subtitleObj = getValIndexPair(['HARGA', 'NOMINAL']) || getValIndexPair(['TANGGAL']) || getValIndexPair(['DESKRIPSI', 'KONTEN', 'LINK']);
                     let subtitle = subtitleObj?.val || row[2] || '';
                     if (subtitleObj && subtitle && !isNaN(Number(subtitle)) && (subtitleObj.headerName.includes('HARGA') || subtitleObj.headerName.includes('NOMINAL') || subtitleObj.headerName.includes('TOTAL'))) {
                         subtitle = `Rp${Number(subtitle).toLocaleString('id-ID')}`;
                     }
                     const status = getVal(['STATUS']);

                     return (
                     <div 
                       key={originalIndex} 
                       onClick={() => setViewState({ type: 'form', menuId: viewState.menuId, rowIndex: originalIndex, rowData: row })}
                       className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group hover:-translate-y-1 relative overflow-hidden flex gap-4 w-full"
                     >
                       <div className="absolute top-4 right-4 text-slate-200 group-hover:text-blue-500 transition-colors">
                          <ChevronRight className="w-5 h-5" />
                        </div>
                        
                        <div className={`w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-xl ${currentMenu?.bg} ${currentMenu?.color} flex items-center justify-center`}>
                           {currentMenu?.icon && React.createElement(currentMenu.icon, { className: 'w-6 h-6 sm:w-7 sm:h-7' })}
                        </div>
                        
                        <div className="flex-1 min-w-0 pr-6 flex flex-col justify-center">
                           <h3 className="font-bold text-slate-800 text-sm truncate">{title}</h3>
                           {subtitle && <p className="text-[11px] sm:text-xs font-medium text-slate-500 mt-1 line-clamp-2 leading-relaxed">{subtitle}</p>}
                           {status && (
                              <span className={`inline-block mt-2 self-start px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-black tracking-widest uppercase ${status.toUpperCase() === 'AKTIF' || status.toUpperCase() === 'ACTIVE' || status.toUpperCase() === 'TERSEDIA' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                {status}
                              </span>
                           )}
                        </div>
                     </div>
                   )})}
                 </div>
              );
           })()}
        </div>
      </div>
    );
  }

  // viewState === 'menu' (Default)
  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <header className="h-14 md:h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0 sticky top-0 z-10 w-full">
        <h1 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2 truncate">
          Panel Admin
        </h1>
        <div className="flex items-center shrink-0">
          <button 
            onClick={() => handleSyncData(true)}
            disabled={isSyncing}
            className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </header>

      <div className="p-6 md:p-8 max-w-5xl mx-auto w-full space-y-6 text-slate-800 pb-32">
        {syncStatus.status !== 'idle' && (
          <div className={`p-4 rounded-lg flex items-center space-x-3 shadow-sm ${syncStatus.status === 'error' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-blue-50 border border-blue-200 text-blue-700'}`}>
             {syncStatus.status === 'error' ? <AlertTriangle className="w-5 h-5 flex-shrink-0" /> : <RefreshCw className={`w-5 h-5 flex-shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />}
             <span className="text-sm font-medium">{syncStatus.message}</span>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {isSyncing ? (
             Array.from({ length: 7 }).map((_, i) => (
               <div key={i} className="flex flex-col bg-white border border-slate-200 rounded-2xl p-5 md:p-6 transition-all aspect-square animate-pulse">
                 <div className="w-12 h-12 rounded-2xl bg-slate-200 mb-6"></div>
                 <div className="mt-auto">
                   <div className="w-16 h-3 bg-slate-200 rounded mb-2"></div>
                   <div className="w-10 h-8 bg-slate-200 rounded"></div>
                 </div>
               </div>
             ))
          ) : (
             menus.map((menu) => (
               <button 
                 key={menu.id}
                 onClick={() => handleMenuClick(menu.id)}
                 className="flex flex-col bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md rounded-2xl p-5 md:p-6 transition-all aspect-square active:scale-95 group relative overflow-hidden text-left"
               >
                 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${menu.bg} ${menu.color}`}>
                   <menu.icon className="w-6 h-6" />
                 </div>
                 
                 <div className="mt-auto">
                   <span className="text-[10px] md:text-xs font-bold tracking-widest text-slate-500 uppercase">{menu.label}</span>
                   {menu.id === 'storage' ? (
                      <span className="text-2xl md:text-3xl font-extrabold text-slate-800 mt-1 block tracking-tight">{driveStats.usagePercent}%</span>
                   ) : menu.countId && dataStats[menu.countId] !== undefined ? (
                      <span className="text-2xl md:text-3xl font-extrabold text-slate-800 mt-1 block tracking-tight">{dataStats[menu.countId]}</span>
                   ) : (
                      <span className="text-2xl md:text-3xl font-extrabold text-slate-300 mt-1 block">—</span>
                   )}
                 </div>
               </button>
             ))
          )}
        </div>
      </div>

      {/* Storage Modal remains unchanged */}
      {isStorageModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-500" />
                Storage Details
              </h2>
              <button 
                onClick={() => setIsStorageModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] md:text-[11px] font-black text-slate-500 uppercase tracking-widest">Kapasitas Google Drive</span>
                  <span className="text-[10px] md:text-[11px] font-black text-slate-700 uppercase tracking-wider">{driveStats.usageGB} GB / {driveStats.limitGB} GB</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                  <div className={`h-full rounded-full opacity-90 transition-all duration-1000 ${driveStats.usagePercent > 80 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${driveStats.usagePercent}%` }}></div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 font-medium">{driveStats.usagePercent}% Terpakai</span>
                  <span className="text-[10px] text-slate-400 font-medium">Sisa {driveStats.freeGB} GB</span>
                </div>
              </div>

              <div className="h-40 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'PNG / JPEG', value: folderStats.pngJpeg, color: '#3B82F6' },
                        { name: 'MP4 / Video', value: folderStats.video, color: '#6366F1' },
                        { name: 'PDF / Dokumen', value: folderStats.pdfDoc, color: '#F97316' },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {[
                        { name: 'PNG / JPEG', value: folderStats.pngJpeg, color: '#3B82F6' },
                        { name: 'MP4 / Video', value: folderStats.video, color: '#6366F1' },
                        { name: 'PDF / Dokumen', value: folderStats.pdfDoc, color: '#F97316' },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                       contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#ffffff' }}
                       itemStyle={{ color: '#0f172a' }}
                       cursor={false} 
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl md:text-2xl font-black text-slate-800">{folderStats.totalWait ? '...' : (folderStats.pngJpeg + folderStats.video + folderStats.pdfDoc > 0 ? '100%' : '0%')}</span>
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Total</span>
                </div>
              </div>

              <a href="https://drive.google.com/drive/folders/1NCfbHjZWaR-J_8IiDowA2gq4JevG-KMe" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors group mt-4">
                 <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                   <Package className="w-5 h-5" />
                 </div>
                 <div>
                   <p className="text-sm font-bold text-slate-800 tracking-tight">Buka Folder Dity Store</p>
                   <p className="text-xs text-slate-500 truncate">Root folder penyimpanan seluruh data</p>
                 </div>
              </a>
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end">
               <button onClick={() => setIsStorageModalOpen(false)} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors">TUTUP</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
