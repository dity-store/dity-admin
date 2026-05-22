import React, { useState, useEffect, useMemo } from 'react';
import { getTableData } from '../services/sheetsService';
import { PackageSearch, Clock, CheckCircle2, XCircle, FileText, Filter, Receipt, ChevronLeft, Loader2 } from 'lucide-react';
import InvoiceCreator from './InvoiceCreator';

export default function OrdersView({ token, setHideNav, isActive = true }: { token: string | null, setHideNav?: (hide: boolean) => void, isActive?: boolean }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState('');
  
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [returnTab, setReturnTab] = useState<string | null>(null);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [detailTab, setDetailTab] = useState<'pesanan' | 'data' | 'kontak'>('pesanan');

  useEffect(() => {
     const handleOpenOrder = (e: Event) => {
        const customEvent = e as CustomEvent;
        const payload = typeof customEvent.detail === 'string' ? { id: customEvent.detail } : customEvent.detail;
        if (payload?.source) {
            setReturnTab(payload.source);
        }
        if (orders.length > 0) {
           const match = orders.find((o: any) => o.ORDER_ID === payload.id);
           if (match) {
               setSelectedOrder(match);
               setDetailTab('pesanan');
           }
        }
     };
     window.addEventListener('open-order', handleOpenOrder);
     return () => window.removeEventListener('open-order', handleOpenOrder);
  }, [orders]);

  useEffect(() => {
     if (setHideNav && isActive) {
         setHideNav(!!selectedOrder || isGeneratingInvoice);
     }
     if (selectedOrder || isGeneratingInvoice) {
         const scrollContainer = document.getElementById('main-scroll-container');
         if (scrollContainer) scrollContainer.scrollTop = 0;
     }
  }, [selectedOrder, isGeneratingInvoice, setHideNav, isActive]);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      if (!hasLoaded) setIsLoading(true);
      try {
        const [ordersData, productsData, orderItemsData, clientsData, usersData] = await Promise.all([
           getTableData(token, 'Orders'),
           getTableData(token, 'Products').catch(() => []),
           getTableData(token, 'Order_Items').catch(() => []),
           getTableData(token, 'Clients').catch(() => []),
           getTableData(token, 'Users').catch(() => [])
        ]);
        
        const getColIdx = (headers: string[], ...names: string[]) => {
          for(let i=0; i<headers.length; i++) {
            const h = (headers[i] || '').toString().trim().toUpperCase();
            if (names.some(n => n.toUpperCase() === h)) return i;
          }
          return -1;
        };

        let productMap: Record<string, string> = {};
        if (productsData.length > 1) {
            const pHeaders = productsData[0];
            const pIdIdx = getColIdx(pHeaders, 'PRODUCT_ID', 'ID', 'ID_PRODUK', 'ID_LAYANAN', 'KODE_PRODUK', 'KODE_LAYANAN', 'KODE');
            const pNameIdx = getColIdx(pHeaders, 'NAME', 'PRODUCT_NAME', 'NAMA_PRODUK', 'NAMA_PRODUK_LAYANAN', 'NAMA', 'PRODUK', 'TITLE', 'LAYANAN');
            if (pIdIdx !== -1 && pNameIdx !== -1) {
                for(let i=1; i<productsData.length; i++){
                    const pId = (productsData[i][pIdIdx] || '').toString().trim().toUpperCase();
                    if (pId) productMap[pId] = productsData[i][pNameIdx];
                }
            }
        }

        let fetchedOrderItems: any[] = [];
        let orderToProductMap: Record<string, string> = {};
        if (orderItemsData.length > 1) {
            const h = orderItemsData[0];
            const oiOrderIdIdx = getColIdx(h, 'ORDER_ID');
            const oiProdIdIdx = getColIdx(h, 'PRODUCT_ID', 'ID_PRODUK', 'ID_LAYANAN', 'KODE_PRODUK', 'KODE_LAYANAN', 'KODE');
            fetchedOrderItems = orderItemsData.slice(1).map((row: any[]) => {
                const rowData: Record<string, any> = {};
                h.forEach((header: string, index: number) => { 
                    const cleanH = (header || '').toString().trim().toUpperCase();
                    if (cleanH) rowData[cleanH] = row[index] || ''; 
                });
                
                if (oiProdIdIdx !== -1) {
                    const pId = (row[oiProdIdIdx] || '').toString().trim().toUpperCase();
                    const match = Object.keys(productMap).find(k => k.toUpperCase() === pId);
                    rowData['_PRODUCT_NAME'] = match ? productMap[match] : pId;
                }
                
                if (oiOrderIdIdx !== -1 && oiProdIdIdx !== -1) {
                    const oId = (row[oiOrderIdIdx] || '').toString().trim();
                    const pId = (row[oiProdIdIdx] || '').toString().trim().toUpperCase();
                    if (oId && pId) {
                        const match = Object.keys(productMap).find(k => k.toUpperCase() === pId);
                        orderToProductMap[oId] = match ? productMap[match] : pId;
                    }
                }
                return rowData;
            });
        }
        setOrderItems(fetchedOrderItems);

        let clientMap: Record<string, string> = {};
        let clientDetailsMap: Record<string, any> = {};
        if (clientsData.length > 1) {
          const cHeaders = clientsData[0];
          const cIdIdx = getColIdx(cHeaders, 'CLIENT_ID', 'USER_ID', 'ID');
          const cNameIdx = getColIdx(cHeaders, 'NAME', 'CLIENT_NAME', 'USERNAME', 'USER_NAME', 'NAMA_CLIENT', 'NAMA');
          if (cIdIdx !== -1 && cNameIdx !== -1) {
            for (let i = 1; i < clientsData.length; i++) {
              const cId = (clientsData[i][cIdIdx] || '').toString().trim().toUpperCase();
              if (cId) {
                clientMap[cId] = clientsData[i][cNameIdx];
                const detailObj: Record<string, any> = {};
                cHeaders.forEach((k: string, z: number) => { detailObj[(k||'').toString().trim()] = clientsData[i][z] || ''; });
                clientDetailsMap[cId] = detailObj;
              }
            }
          }
        }
        if (usersData.length > 1) {
           const uHeaders = usersData[0];
           const uIdIdx = getColIdx(uHeaders, 'USER_ID', 'CLIENT_ID', 'ID');
           const uNameIdx = getColIdx(uHeaders, 'USERNAME', 'NAME', 'USER_NAME', 'NAMA_USER', 'NAMA');
           if (uIdIdx !== -1 && uNameIdx !== -1) {
              for (let i = 1; i < usersData.length; i++) {
                 const uId = (usersData[i][uIdIdx] || '').toString().trim().toUpperCase();
                 if (uId && !clientMap[uId]) {
                     clientMap[uId] = usersData[i][uNameIdx];
                     const detailObj: Record<string, any> = {};
                     uHeaders.forEach((k: string, z: number) => { detailObj[(k||'').toString().trim()] = usersData[i][z] || ''; });
                     clientDetailsMap[uId] = detailObj;
                 }
              }
           }
        }

        if (ordersData.length > 1) {
          const headers = ordersData[0];
          
          const rows = ordersData.slice(1).map((row: any[]) => {
            const rowData: Record<string, any> = {};
            headers.forEach((header: string, index: number) => {
              const cleanHeader = (header || '').toString().trim().toUpperCase();
              if (cleanHeader) {
                rowData[cleanHeader] = row[index] || '';
              }
            });
            
            if (rowData['ORDER_ID'] && orderToProductMap[rowData['ORDER_ID']]) {
                rowData['_PRODUCT_NAME'] = orderToProductMap[rowData['ORDER_ID']];
            } else {
                let prodName = undefined;
                const pIdRaw = rowData['PRODUCT_ID'] || rowData['PRODUCT'] || rowData['LAYANAN'] || rowData['PAKET'] || rowData['ID_PRODUK'] || rowData['ID_LAYANAN'] || rowData['KODE_PRODUK'] || rowData['KODE_LAYANAN'];
                if (pIdRaw) {
                    const pId = pIdRaw.toString().trim().toUpperCase();
                    const match = Object.keys(productMap).find(k => k.toUpperCase() === pId);
                    prodName = match ? productMap[match] : pIdRaw;
                }
                rowData['_PRODUCT_NAME'] = prodName || 'Layanan Digital';
            }

            if (rowData['CLIENT_ID'] || rowData['USER_ID']) {
                const cIdRaw = rowData['CLIENT_ID'] || rowData['USER_ID'];
                const cId = cIdRaw.toString().trim().toUpperCase();
                const foundClientKey = Object.keys(clientMap).find(k => k.toUpperCase() === cId);
                rowData['_CLIENT_NAME'] = foundClientKey ? clientMap[foundClientKey] : (clientMap[cId] || cIdRaw);
                rowData['_CLIENT_DETAILS'] = clientDetailsMap[foundClientKey || cId] || {};
            } else {
                rowData['_CLIENT_NAME'] = 'Unknown';
                rowData['_CLIENT_DETAILS'] = {};
            }

            return rowData;
          });
          setOrders(rows.reverse()); 
        }
        setHasLoaded(true);
      } catch (err: any) {
        console.error('Failed to fetch orders:', err);
        setError(`Gagal memuat pesanan. Error: ${err.message || 'Network Error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token, hasLoaded]);

  const filteredOrders = useMemo(() => {
     if (statusFilter === 'ALL') return orders;
     return orders.filter(o => (o.STATUS || 'UNPAID').toUpperCase() === statusFilter);
  }, [orders, statusFilter]);

  const handleFilterToggle = () => {
      const states = ['ALL', 'PAID', 'UNPAID', 'CANCELED'];
      const currentIndex = states.indexOf(statusFilter);
      setStatusFilter(states[(currentIndex + 1) % states.length]);
  };

  if (isGeneratingInvoice && selectedOrder) {
    return (
      <div className="flex flex-col h-full bg-slate-50">
        <header className="h-14 md:h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsGeneratingInvoice(false)} className="p-1 text-slate-400 hover:text-slate-800 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight">Generator Tagihan</h1>
          </div>
        </header>

        <div className="p-6 md:p-8 max-w-5xl mx-auto w-full flex-1">
          <InvoiceCreator 
            token={token} 
            defaultInvoice={{
              id: selectedOrder.ORDER_ID || 'INV-0000',
              client: selectedOrder._CLIENT_NAME || selectedOrder.CLIENT_ID || 'Client Name',
              service: selectedOrder._PRODUCT_NAME || 'Service',
              amount: selectedOrder.TOTAL_PRICE ? `Rp${Number(selectedOrder.TOTAL_PRICE).toLocaleString('id-ID')}` : 'Rp0'
            }} 
          />
        </div>
      </div>
    );
  }

  if (selectedOrder) {
    const itemsForOrder = orderItems.filter(item => item.ORDER_ID === selectedOrder.ORDER_ID);

    return (
      <div className="flex flex-col h-full bg-slate-50">
        <header className="h-14 md:h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => {
                setSelectedOrder(null);
                if (returnTab) {
                    window.dispatchEvent(new CustomEvent('switch-tab', { detail: returnTab }));
                    setReturnTab(null);
                }
            }} className="p-1 text-slate-400 hover:text-slate-800 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight">Detail Pesanan</h1>
          </div>
        </header>

        <div className="bg-white border-b border-slate-200">
           <div className="flex bg-white overflow-x-auto w-full max-w-3xl mx-auto px-4 md:px-0">
              <button 
                onClick={() => setDetailTab('pesanan')}
                className={`py-3 px-6 font-bold text-sm border-b-2 whitespace-nowrap outline-none transition-colors ${detailTab === 'pesanan' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Pesanan
              </button>
              <button 
                onClick={() => setDetailTab('data')}
                className={`py-3 px-6 font-bold text-sm border-b-2 whitespace-nowrap outline-none transition-colors ${detailTab === 'data' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Data
              </button>
              <button 
                onClick={() => setDetailTab('kontak')}
                className={`py-3 px-6 font-bold text-sm border-b-2 whitespace-nowrap outline-none transition-colors ${detailTab === 'kontak' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Kontak
              </button>
           </div>
        </div>

        <div className="p-6 md:p-8 max-w-3xl mx-auto w-full flex-1">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
             {detailTab === 'pesanan' && (
               <>
                 <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 border-b border-slate-100 pb-6">
                    <div>
                      <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Order ID</h2>
                      <p className="text-2xl font-mono font-bold text-slate-900">{selectedOrder.ORDER_ID}</p>
                    </div>
                    <div className="text-left md:text-right">
                      <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Status</h2>
                      {selectedOrder.STATUS?.toUpperCase() === 'PAID' ? (
                           <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider"><CheckCircle2 className="w-4 h-4 mr-1.5" /> LUNAS</span>
                       ) : selectedOrder.STATUS?.toUpperCase() === 'CANCELED' ? (
                           <span className="inline-flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold uppercase tracking-wider"><XCircle className="w-4 h-4 mr-1.5" /> Dibatalkan</span>
                       ) : (
                           <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider"><Clock className="w-4 h-4 mr-1.5" /> Menunggu</span>
                       )}
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                   <div>
                     <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Informasi Klien</h3>
                     <p className="font-semibold text-slate-800">{selectedOrder._CLIENT_NAME}</p>
                     <p className="text-sm text-slate-500 mt-1">ID: {selectedOrder.CLIENT_ID || '-'}</p>
                   </div>
                   <div>
                     <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Harga</h3>
                     <p className="text-3xl font-extrabold text-slate-900">{selectedOrder.TOTAL_PRICE ? `Rp${Number(selectedOrder.TOTAL_PRICE).toLocaleString('id-ID')}` : '-'}</p>
                     <p className="text-sm text-slate-500 mt-1">Dibuat: {selectedOrder.CREATED_AT || '-'}</p>
                   </div>
                 </div>

                 <div className="mb-8 border-t border-slate-100 pt-6">
                    <h3 className="text-sm font-bold text-slate-800 mb-4">Item Pesanan</h3>
                    <div className="space-y-3">
                       {itemsForOrder.length > 0 ? itemsForOrder.map((item, idx) => (
                         <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-4 rounded-xl gap-2">
                           <div>
                             <p className="font-semibold text-slate-800">{item._PRODUCT_NAME || item.PRODUCT_ID || 'Item'}</p>
                             <p className="text-xs text-slate-500 mt-0.5">ID Produk: {item.PRODUCT_ID}</p>
                           </div>
                           {item.PRICE || selectedOrder.TOTAL_PRICE ? (
                              <p className="font-bold text-slate-900">Rp{Number(item.PRICE || selectedOrder.TOTAL_PRICE).toLocaleString('id-ID')}</p>
                           ) : (
                              <p className="font-bold text-slate-400 text-sm">—</p>
                           )}
                         </div>
                       )) : (
                         <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-4 rounded-xl gap-2">
                           <div>
                             <p className="font-semibold text-slate-800">{selectedOrder._PRODUCT_NAME || 'Layanan Digital'}</p>
                             <p className="text-xs text-slate-500 mt-0.5">Item tidak ada di Order Items</p>
                           </div>
                           <p className="font-bold text-slate-400 text-sm">—</p>
                         </div>
                       )}
                    </div>
                 </div>

                 <div className="border-t border-slate-200 pt-6 flex flex-col md:flex-row gap-4 justify-end">
                    <button 
                      onClick={() => setIsGeneratingInvoice(true)}
                      className="flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-sm"
                    >
                      <Receipt className="w-5 h-5 mr-2" />
                      Generate Tagihan (PDF)
                    </button>
                 </div>
               </>
             )}

             {detailTab === 'data' && (
               <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Data Tambahan Pesanan</h3>
                  <div className="space-y-4">
                     {Object.keys(selectedOrder)
                        .filter(key => 
                           !key.startsWith('_') && 
                           !['ORDER_ID', 'CLIENT_ID', 'USER_ID', 'PRODUCT_ID', 'STATUS', 'TOTAL_PRICE', 'CREATED_AT', 'UPDATED_AT'].includes(key)
                        )
                        .map((key) => (
                           <div key={key} className="flex flex-col border-b border-slate-100 pb-3 last:border-0">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{key}</span>
                              <span className="text-slate-800 font-medium break-words">{selectedOrder[key] || '-'}</span>
                           </div>
                        ))}
                     {Object.keys(selectedOrder)
                        .filter(key => 
                           !key.startsWith('_') && 
                           !['ORDER_ID', 'CLIENT_ID', 'USER_ID', 'PRODUCT_ID', 'STATUS', 'TOTAL_PRICE', 'CREATED_AT', 'UPDATED_AT'].includes(key)
                        ).length === 0 && (
                          <p className="text-sm text-slate-500 italic">Tidak ada data tambahan untuk pesanan ini.</p>
                     )}
                  </div>
               </div>
             )}

             {detailTab === 'kontak' && (
               <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Informasi Kontak</h3>
                  <div className="space-y-4">
                     {selectedOrder._CLIENT_DETAILS && Object.keys(selectedOrder._CLIENT_DETAILS).length > 0 ? (
                        Object.keys(selectedOrder._CLIENT_DETAILS)
                           .filter(key => !['CLIENT_ID', 'USER_ID', 'PASSWORD'].includes(key))
                           .map((key) => (
                              <div key={key} className="flex flex-col border-b border-slate-100 pb-3 last:border-0">
                                 <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{key}</span>
                                 <span className="text-slate-800 font-medium break-words">{selectedOrder._CLIENT_DETAILS[key] || '-'}</span>
                              </div>
                           ))
                     ) : (
                        <p className="text-sm text-slate-500 italic">Tidak ada informasi kontak klien yang tersedia.</p>
                     )}
                  </div>
               </div>
             )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <header className="h-14 md:h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0 sticky top-0 z-10">
        <h1 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2 truncate">
          Pesanan Masuk
        </h1>
        <div className="flex items-center shrink-0">
          <button 
            onClick={handleFilterToggle}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 md:px-4 py-2 rounded-full font-bold text-xs md:text-sm transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span>Filter: {statusFilter}</span>
          </button>
        </div>
      </header>

      <div className="p-6 md:p-8 max-w-5xl mx-auto w-full space-y-6 text-slate-800">
        {isLoading && !hasLoaded ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
             {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-2xl h-[220px] p-5 flex flex-col">
                   <div className="flex justify-between items-start mb-3">
                      <div className="h-5 bg-slate-200 rounded w-16"></div>
                      <div className="h-4 bg-slate-200 rounded w-20"></div>
                   </div>
                   <div className="h-6 bg-slate-200 rounded w-3/4 mb-2 mt-2"></div>
                   <div className="h-4 bg-slate-100 rounded w-1/2 mb-4"></div>
                   
                   <div className="mt-auto border-t border-slate-100 pt-4 flex justify-between items-center">
                     <div className="h-8 bg-slate-200 rounded w-32"></div>
                     <div className="w-8 h-8 rounded-full bg-slate-100"></div>
                   </div>
                </div>
             ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg font-medium text-sm flex items-center">
            {error}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center bg-white border border-slate-200 rounded-xl p-12">
            <PackageSearch className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Belum ada pesanan</h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">Pesanan dengan filter {statusFilter} tidak ditemukan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {filteredOrders.map((order, i) => (
               <div 
                 key={i} 
                 onClick={() => setSelectedOrder(order)}
                 className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow flex flex-col relative group cursor-pointer"
               >
                 <div className="p-5 flex flex-col flex-1">
                   <div className="flex justify-between items-start mb-3">
                     <div className="bg-slate-100/80 text-slate-600 px-2 py-1 rounded text-[10px] font-bold tracking-widest uppercase font-mono">
                       {order.ORDER_ID || 'ORD-000'}
                     </div>
                     {order.STATUS?.toUpperCase() === 'PAID' ? (
                         <span className="text-green-600 flex items-center text-xs font-bold"><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> PAID</span>
                     ) : order.STATUS?.toUpperCase() === 'CANCELED' ? (
                         <span className="text-red-600 flex items-center text-xs font-bold"><XCircle className="w-3.5 h-3.5 mr-1" /> CANCELED</span>
                     ) : (
                         <span className="text-blue-600 flex items-center text-xs font-bold"><Clock className="w-3.5 h-3.5 mr-1" /> {order.STATUS || 'UNPAID'}</span>
                     )}
                   </div>
                   
                   <h3 className="font-bold text-slate-900 text-lg leading-tight mb-1">{order._PRODUCT_NAME}</h3>
                   <p className="text-slate-500 text-sm mb-4">Klien: {order._CLIENT_NAME}</p>
                   
                   <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">TOTAL TAGIHAN</p>
                          <p className="font-extrabold text-slate-800 tracking-tight">
                             {order.TOTAL_PRICE ? `Rp${Number(order.TOTAL_PRICE).toLocaleString('id-ID')}` : '-'}
                          </p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                        <ChevronLeft className="w-4 h-4 rotate-180" />
                      </div>
                   </div>
                 </div>
               </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
}
