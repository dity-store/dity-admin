import React, { useState, useEffect } from 'react';
import { getTableData } from '../services/sheetsService';
import { ensureDityStoreFolder, getDriveStorageStats, getFolderSizeStats } from '../services/driveService';
import { Bell, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

export default function DashboardView({ token, setActiveTab, setAdminViewState }: { token?: string | null, setActiveTab: (tab: string) => void, setAdminViewState?: (state: any) => void }) {
  const [stats, setStats] = useState({ revenue: 0, orders: 0, users: 0, categories: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [storeStatus, setStoreStatus] = useState({ isOpen: false, text: 'TUTUP', hours: '08:00 - 22:00' });
  const [driveStats, setDriveStats] = useState({ usageGB: '0.0', limitGB: '15.0', freeGB: '0.0', usagePercent: 0 });
  const [folderStats, setFolderStats] = useState({ pngJpeg: 50, video: 20, pdfDoc: 30, totalWait: true });
  const [storeHoursData, setStoreHoursData] = useState<any[]>([]);

  useEffect(() => {
    if (token) {
      if (!hasLoaded) setIsLoading(true);
      
      // Load Drive Stats non-blocking
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
      Promise.all([
        getTableData(token, 'Orders').catch(() => []),
        getTableData(token, 'Users').catch(() => []),
        getTableData(token, 'Categories').catch(() => []),
        getTableData(token, 'Products').catch(() => []),
        getTableData(token, 'Order_Items').catch(() => []),
        getTableData(token, 'Clients').catch(() => []),
        getTableData(token, 'Store_Hours').catch(() => [])
      ]).then(([orders, users, categories, products, orderItems, clients, storeHours]) => {
        let revenue = 0;
        let formattedOrders = [];
        
        const getColIdx = (headers: string[], ...names: string[]) => {
          for(let i=0; i<headers.length; i++) {
            const h = (headers[i] || '').toString().trim().toUpperCase();
            if (names.some(n => n.toUpperCase() === h)) return i;
          }
          return -1;
        };

        let productMap: Record<string, string> = {};
        if (products.length > 1) {
          const pHeaders = products[0];
          const pIdIdx = getColIdx(pHeaders, 'PRODUCT_ID', 'ID', 'ID_PRODUK', 'ID_LAYANAN', 'KODE_PRODUK', 'KODE_LAYANAN', 'KODE');
          const pNameIdx = getColIdx(pHeaders, 'NAME', 'PRODUCT_NAME', 'NAMA_PRODUK', 'NAMA_PRODUK_LAYANAN', 'NAMA', 'PRODUK', 'TITLE', 'LAYANAN');
          if (pIdIdx !== -1 && pNameIdx !== -1) {
            for (let i = 1; i < products.length; i++) {
              const pId = (products[i][pIdIdx] || '').toString().trim().toUpperCase();
              if (pId) productMap[pId] = products[i][pNameIdx];
            }
          }
        }

        let orderToProductMap: Record<string, string> = {};
        if (orderItems.length > 1) {
          const oiHeaders = orderItems[0];
          const oiOrderIdIdx = getColIdx(oiHeaders, 'ORDER_ID');
          const oiProdIdIdx = getColIdx(oiHeaders, 'PRODUCT_ID', 'ID_PRODUK', 'ID_LAYANAN', 'KODE_PRODUK', 'KODE_LAYANAN', 'KODE');
          if (oiOrderIdIdx !== -1 && oiProdIdIdx !== -1) {
            for (let i = 1; i < orderItems.length; i++) {
              const oId = (orderItems[i][oiOrderIdIdx] || '').toString().trim();
              const pId = (orderItems[i][oiProdIdIdx] || '').toString().trim().toUpperCase();
              if (oId && pId) {
                const match = Object.keys(productMap).find(k => k.toUpperCase() === pId);
                orderToProductMap[oId] = match ? productMap[match] : pId;
              }
            }
          }
        }

        let clientMap: Record<string, string> = {};
        if (clients.length > 1) {
          const cHeaders = clients[0];
          const cIdIdx = getColIdx(cHeaders, 'CLIENT_ID', 'USER_ID', 'ID');
          const cNameIdx = getColIdx(cHeaders, 'NAME', 'CLIENT_NAME', 'NAMA_CLIENT', 'NAMA', 'USERNAME', 'USER_NAME');
          if (cIdIdx !== -1 && cNameIdx !== -1) {
            for (let i = 1; i < clients.length; i++) {
              const cId = (clients[i][cIdIdx] || '').toString().trim().toUpperCase();
              if (cId) clientMap[cId] = clients[i][cNameIdx];
            }
          }
        }

        // Add users into clientMap as fallback
        if (users.length > 1) {
           const uHeaders = users[0];
           const uIdIdx = getColIdx(uHeaders, 'USER_ID', 'CLIENT_ID', 'ID');
           const uNameIdx = getColIdx(uHeaders, 'USERNAME', 'NAME', 'USER_NAME', 'NAMA_USER', 'NAMA');
           if (uIdIdx !== -1 && uNameIdx !== -1) {
              for (let i = 1; i < users.length; i++) {
                 const uId = (users[i][uIdIdx] || '').toString().trim().toUpperCase();
                 if (uId && !clientMap[uId]) {
                     clientMap[uId] = users[i][uNameIdx];
                 }
              }
           }
        }

        // Parse Store_Hours logic using WITA (UTC+8)
        let scheduleHours = '08:00 - 22:00';
        let openTime = 8;
        let closeTime = 22;
        if (storeHours.length > 1) {
            // check if there's OPEN_TIME and CLOSE_TIME
            const shHeaders = storeHours[0];
            const openIdx = shHeaders.indexOf('OPEN_TIME');
            const closeIdx = shHeaders.indexOf('CLOSE_TIME');
            if (openIdx !== -1 && closeIdx !== -1 && storeHours[1]) {
                scheduleHours = `${storeHours[1][openIdx]} - ${storeHours[1][closeIdx]}`;
                const parsedOpen = parseInt(storeHours[1][openIdx].split(':')[0]);
                const parsedClose = parseInt(storeHours[1][closeIdx].split(':')[0]);
                if (!isNaN(parsedOpen)) openTime = parsedOpen;
                if (!isNaN(parsedClose)) closeTime = parsedClose;
            }
        }
        
        const nowWITA = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Makassar" }));
        const currentHour = nowWITA.getHours();
        const isOpen = currentHour >= openTime && currentHour < closeTime;
        setStoreStatus({ isOpen, text: isOpen ? 'BUKA' : 'TUTUP', hours: scheduleHours });

        if (orders.length > 1) {
          const headers = orders[0];
          const revIndex = getColIdx(headers, 'TOTAL_PRICE', 'TOTAL_BAYAR', 'HARGA');
          const idIndex = getColIdx(headers, 'ORDER_ID', 'ID');
          const clientIndex = getColIdx(headers, 'CLIENT_ID', 'USER_ID', 'CLIENT');
          const statusIndex = getColIdx(headers, 'STATUS');
          const dateIndex = getColIdx(headers, 'CREATED_AT', 'DATE', 'TANGGAL');
          const productIndex = getColIdx(headers, 'PRODUCT_ID', 'PRODUCT', 'LAYANAN', 'PAKET', 'ID_PRODUK', 'ID_LAYANAN', 'KODE_PRODUK', 'KODE_LAYANAN');
          const itemIndex = getColIdx(headers, 'ITEM_ID', 'ITEM');

          if (revIndex !== -1) {
             for (let i = 1; i < orders.length; i++) {
                revenue += Number((orders[i][revIndex] || '').toString().replace(/[^0-9.-]+/g,"")) || 0;
             }
          }
          
          for (let i = orders.length - 1; i >= Math.max(1, orders.length - 6); i--) {
            const row = orders[i];
            
            let prodName = undefined;
            if (idIndex !== -1 && row[idIndex]) {
               const oId = row[idIndex].toString().trim();
               if (orderToProductMap[oId]) prodName = orderToProductMap[oId];
            }
            if (!prodName && productIndex !== -1 && row[productIndex]) {
               const pId = row[productIndex].toString().trim().toUpperCase();
               const match = Object.keys(productMap).find(k => k.toUpperCase() === pId);
               prodName = match ? productMap[match] : row[productIndex];
            }
            if (!prodName) prodName = 'Layanan Digital';
            
            let clientName = 'Unknown';
            if (clientIndex !== -1 && row[clientIndex]) {
               const cId = row[clientIndex].toString().trim().toUpperCase();
               // Case-insensitive lookup fallback
               const foundClientKey = Object.keys(clientMap).find(k => k.toUpperCase() === cId);
               clientName = foundClientKey ? clientMap[foundClientKey] : (clientMap[cId] || (row[clientIndex] || 'Unknown').toString());
            }

            formattedOrders.push({
              id: idIndex !== -1 ? row[idIndex] : `ORD-${i}`,
              client: clientName,
              status: statusIndex !== -1 ? row[statusIndex] : 'UNPAID',
              date: dateIndex !== -1 ? row[dateIndex] : new Date().toLocaleDateString(),
              product: prodName
            });
          }
        }
        
        let totalInvoices = 0;
        if (orderItems && orderItems.length > 1) {
           const headers = orderItems[0];
           const getIdx = (match: string) => headers.findIndex((h: string) => h.toUpperCase().includes(match));
           const statusIdx = getIdx('STATUS');
           if (statusIdx !== -1) {
// 'di atas AWAITING_REVIEW' -> mostly means anything indicating it has an invoice.
               totalInvoices = orderItems.slice(1).filter((r: any[]) => {
                   const s = (r[statusIdx] || '').toUpperCase();
                   return s && s !== 'AWAITING_REVIEW' && s !== 'PENDING' && s !== 'DRAFT';
               }).length;
           }
        }
        
        setRecentOrders(formattedOrders);
        setStoreHoursData(storeHours);
        setStats({
          revenue,
          orders: Math.max(0, orders.length - 1),
          users: Math.max(0, users.length - 1),
          categories: Math.max(0, categories.length - 1),
          clients: Math.max(0, clients ? clients.length - 1 : 0),
          invoices: totalInvoices
        });
        setHasLoaded(true);
        setIsLoading(false);
      });
    }
  }, [token, hasLoaded]);

  return (
    <div className="flex flex-col h-full">
      {/* Appbar */}
      <header className="h-14 md:h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0 sticky top-0 z-10 transition-all">
        <h1 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2 truncate">
          Dity Store
        </h1>
        <div className="flex items-center space-x-3 shrink-0">
          <button className="relative w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 border-2 border-slate-100 rounded-full"></span>
          </button>
        </div>
      </header>

      <div className="p-4 md:p-6 lg:p-8 flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-6 pb-20 md:pb-8">
        
        {isLoading ? (
          <div className="lg:col-span-12 w-full animate-pulse space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 h-[104px]">
                  <div className="h-3 bg-slate-200 rounded w-1/2 mb-3"></div>
                  <div className="h-8 bg-slate-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
               <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl h-64 p-6">
                  <div className="h-4 bg-slate-200 rounded w-1/4 mb-6"></div>
                  <div className="space-y-4">
                     {[...Array(4)].map((_, i) => <div key={i} className="h-6 bg-slate-100 rounded w-full"></div>)}
                  </div>
               </div>
               <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl h-64 p-6">
                  <div className="h-4 bg-slate-200 rounded w-1/3 mb-6"></div>
                  <div className="h-32 bg-slate-100 rounded-xl w-full"></div>
               </div>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Row */}
            <div className="lg:col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
              <div className="bg-white p-4 lg:p-5 rounded-xl border border-slate-200 shadow-sm transition-shadow hover:shadow-md">
                <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase mb-1 tracking-wider truncate">Total pesanan</p>
                <p className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">{stats.orders}</p>
                <p className="text-[10px] md:text-xs text-green-600 font-bold mt-1 truncate">Masuk hari ini</p>
              </div>
              <div className="bg-white p-4 lg:p-5 rounded-xl border border-slate-200 shadow-sm transition-shadow hover:shadow-md">
                <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase mb-1 tracking-wider truncate">Total pendapatan</p>
                <p className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight text-ellipsis overflow-hidden">
                  Rp{stats.revenue >= 1000000 ? (stats.revenue / 1000000).toFixed(1) + 'M' : stats.revenue.toLocaleString('id-ID')}
                </p>
                <p className="text-[10px] md:text-xs text-slate-400 mt-1 font-medium truncate">Masuk hari ini</p>
              </div>
              <div className="bg-white p-4 lg:p-5 rounded-xl border border-slate-200 shadow-sm transition-shadow hover:shadow-md flex flex-col justify-center items-start lg:items-stretch group">
                <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase mb-1 tracking-wider truncate">Status Toko</p>
                <div className="flex flex-col lg:flex-row lg:items-center mt-1 w-full gap-2 transition-all">
                  <span className={`text-base md:text-lg font-black uppercase tracking-widest ${storeStatus.isOpen ? 'text-green-600' : 'text-red-500'}`}>
                    {storeStatus.text}
                  </span>
                  <span className="lg:ml-auto text-slate-800 text-[10px] md:text-xs font-bold bg-slate-100 px-2 py-1 rounded truncate">{storeStatus.hours} WITA</span>
                </div>
              </div>
              <div className="bg-white p-4 lg:p-5 rounded-xl border border-slate-200 shadow-sm transition-shadow hover:shadow-md">
                <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase mb-1 tracking-wider truncate">Total Invoice</p>
                <p className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">{stats.invoices}</p>
                <p className="text-[10px] md:text-xs text-blue-600 font-bold mt-1 truncate">Invoice dibuat</p>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="lg:col-span-8 flex flex-col gap-4 lg:gap-6 min-w-0">
              {/* Form Responses Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="px-4 py-3 md:px-6 md:py-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-2 bg-slate-50/50">
                  <h2 className="font-bold text-slate-800 tracking-tight text-sm md:text-base">Pesanan Masuk Terbaru</h2>
                  <span className="text-[10px] md:text-xs bg-yellow-50 text-yellow-700 px-2.5 py-1 rounded-md border border-yellow-200 font-bold tracking-wide flex items-center gap-1.5 w-max">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
                    Live Sync
                  </span>
                </div>
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left min-w-[500px]">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3 md:px-6 md:py-4">Waktu</th>
                        <th className="px-4 py-3 md:px-6 md:py-4">Klien</th>
                        <th className="px-4 py-3 md:px-6 md:py-4">Layanan</th>
                        <th className="px-4 py-3 md:px-6 md:py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentOrders.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                            Belum ada pesanan terbaru
                          </td>
                        </tr>
                      ) : null}
                      {recentOrders.map((order, i) => (
                        <tr key={i} className="text-xs md:text-sm hover:bg-slate-50/50 transition-colors group">
                          <td className="px-4 py-3 md:px-6 md:py-4 text-slate-500 font-medium whitespace-nowrap">{order.date.split(' ')[0] || order.date}</td>
                          <td className="px-4 py-3 md:px-6 md:py-4 font-bold text-slate-800">{order.client}</td>
                          <td className="px-4 py-3 md:px-6 md:py-4 text-slate-600 truncate max-w-[150px]">{order.product}</td>
                          <td className="px-4 py-3 md:px-6 md:py-4">
                            {order.status === 'PAID' ? (
                              <span className="px-2 md:px-3 py-1 bg-green-100/50 text-green-700 rounded-full text-[10px] md:text-xs font-bold border border-green-200/50 whitespace-nowrap">Success</span>
                            ) : order.status === 'CANCELED' ? (
                              <span className="px-2 md:px-3 py-1 bg-red-100/50 text-red-700 rounded-full text-[10px] md:text-xs font-bold border border-red-200/50 whitespace-nowrap">Canceled</span>
                            ) : (
                              <span className="px-2 md:px-3 py-1 bg-blue-100/50 text-blue-700 rounded-full text-[10px] md:text-xs font-bold border border-blue-200/50 whitespace-nowrap">Pending</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-3 bg-slate-50 border-t border-slate-100 text-center mt-auto">
                  <button onClick={() => setActiveTab('order')} className="text-[10px] md:text-[11px] font-bold text-slate-500 hover:text-slate-900 tracking-widest transition-colors uppercase">LIHAT SEMUA PESANAN &rarr;</button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                 <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl p-5 md:p-6 text-white shadow-md shadow-indigo-600/20 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                     <svg className="w-20 h-20 md:w-24 md:h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                   </div>
                   <h3 className="text-base md:text-lg font-bold mb-2 tracking-tight">Invoice Generator</h3>
                   <p className="text-indigo-100/80 text-xs md:text-sm mb-4 md:mb-5 leading-relaxed pr-6 md:pr-8 max-w-[95%]">
                     Buat dan kelola invoice pesanan secara mudah dan cepat langsung dari sistem.
                   </p>
                   <button onClick={() => setActiveTab('order')} className="bg-white text-indigo-600 px-4 md:px-5 py-2 md:py-2.5 rounded-lg font-bold text-[10px] md:text-xs shadow-sm hover:shadow-md transition-shadow uppercase tracking-wide">BUKA GENERATOR</button>
                 </div>
                 
                 <div className="bg-white border border-slate-200 rounded-xl p-5 md:p-6 shadow-sm">
                   <h3 className="text-base md:text-lg font-bold text-slate-800 mb-3 md:mb-4 tracking-tight">Operasional Toko</h3>
                   <div className="space-y-3 md:space-y-4">
                      <div className="flex justify-between items-center text-xs md:text-sm">
                        <span className="text-slate-500 font-medium py-1">Jam Operasional</span>
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded">{storeStatus.hours} WITA</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-xs md:text-sm">
                        <span className="text-slate-500 font-medium">Hari</span>
                        <span className="text-slate-800 font-bold bg-slate-100 px-2 py-1 rounded">{new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: 'Asia/Makassar' }).format(new Date())}</span>
                      </div>
                      <button onClick={() => {
                        let targetRowIndex = 0;
                        if (storeHoursData && storeHoursData.length > 1) {
                           const headers = storeHoursData[0];
                           const hariIdx = headers.findIndex((h: string) => h.toUpperCase().includes('HARI'));
                           const todayStr = new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: 'Asia/Makassar' }).format(new Date());
                           if (hariIdx !== -1) {
                               const foundIdx = storeHoursData.slice(1).findIndex((row: any[]) => row[hariIdx] && row[hariIdx].toString().trim().toLowerCase() === todayStr.toLowerCase());
                               if (foundIdx !== -1) {
                                   targetRowIndex = foundIdx;
                               }
                           } else {
                               // Fallback to old behavior if they populated 7 rows without HARI column
                               const dateWITA = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Makassar"}));
                               const dayIndex = dateWITA.getDay() - 1;
                               const adjustedIndex = dayIndex < 0 ? 6 : dayIndex;
                               if (adjustedIndex < storeHoursData.length - 1) {
                                   targetRowIndex = adjustedIndex;
                               }
                           }
                        }
                        if (setAdminViewState) setAdminViewState({ type: 'form', menuId: 'operasional', rowIndex: targetRowIndex });
                        setActiveTab('admin_panel');
                      }} className="w-full mt-3 md:mt-4 py-2 md:py-2.5 border border-slate-200 rounded-lg text-[10px] md:text-xs font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all uppercase tracking-wide">EDIT OPERASIONAL</button>
                   </div>
                 </div>
              </div>
            </div>

            {/* Right Column: Drive Explorer */}
            <div className="lg:col-span-4 h-auto md:h-full lg:min-h-[400px]">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[400px] md:h-[500px] lg:h-full">
                <div className="px-4 py-3 md:px-6 md:py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h2 className="font-bold text-slate-800 tracking-tight text-sm md:text-base">Sisa Penyimpanan</h2>
                  <span className="text-[9px] md:text-[10px] uppercase font-bold text-slate-400 tracking-wider truncate max-w-[120px] md:max-w-none">/Dity Store</span>
                </div>
                <div className="flex-1 p-4 md:p-6 w-full flex items-center justify-center">
                  <div className="w-full h-[200px] md:h-[250px] relative">
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
                </div>
                
                <div className="p-4 md:p-5 bg-slate-50 border-t border-slate-100 rounded-b-xl shrink-0">
                   <div className="flex justify-between items-center mb-2 md:mb-3">
                     <span className="text-[9px] md:text-[11px] font-black text-slate-500 uppercase tracking-widest">Kapasitas Google Drive</span>
                     <span className="text-[9px] md:text-[11px] font-black text-slate-700 uppercase tracking-wider">{driveStats.usageGB} GB / {driveStats.limitGB} GB</span>
                   </div>
                   <div className="w-full bg-slate-200 h-1.5 md:h-2 rounded-full overflow-hidden flex">
                     <div className={`h-full rounded-full opacity-90 transition-all duration-1000 ${driveStats.usagePercent > 80 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${driveStats.usagePercent}%` }}></div>
                   </div>
                   <div className="flex justify-between items-center mt-2">
                     <span className="text-[10px] text-slate-400 font-medium">{driveStats.usagePercent}% Terpakai</span>
                     <span className="text-[10px] text-slate-400 font-medium">Sisa {driveStats.freeGB} GB</span>
                   </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
