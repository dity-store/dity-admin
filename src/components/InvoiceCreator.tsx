import React, { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { uploadFileToDrive } from '../services/driveService';
import { Download, UploadCloud, FileText } from 'lucide-react';

export default function InvoiceCreator({ token, defaultInvoice }: { token: string | null, defaultInvoice?: any }) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const [invoiceData, setInvoiceData] = useState({
    id: "INV-20260502-2133",
    client: "John Doe",
    service: "Desain PPT & CV",
    amount: "500000"
  });

  useEffect(() => {
    if (defaultInvoice) {
      setInvoiceData({
        id: defaultInvoice.id || invoiceData.id,
        client: defaultInvoice.client || invoiceData.client,
        service: defaultInvoice.service || invoiceData.service,
        amount: defaultInvoice.amount ? defaultInvoice.amount.toString().replace(/\D/g, '') : invoiceData.amount
      });
    }
  }, [defaultInvoice]);

  const generatePDFBlob = async () => {
    if (!invoiceRef.current) return null;
    
    // Konversi React Component menjadi Canvas
    const canvas = await html2canvas(invoiceRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    
    // Inisialisasi jsPDF (A4)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    return pdf.output('blob'); // Generate format Blob
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    const blob = await generatePDFBlob();
    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoiceData.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setIsGenerating(false);
  };

  const handleUploadToDrive = async () => {
    if (!token) {
      setStatus("Akses tidak valid. Harap Login dengan Google.");
      return;
    }

    setIsGenerating(true);
    setStatus("Sedang membuat PDF...");
    try {
      const blob = await generatePDFBlob();
      if (!blob) throw new Error("Gagal generate PDF Blob");

      setStatus("Mengunggah secara Multipart ke Drive...");
      // Panggil service native yang telah kita buat
      const data = await uploadFileToDrive(token, blob, `${invoiceData.id}.pdf`);
      
      setStatus(`Berhasil disimpan di Drive ✅ (ID: ${data.id})`);
    } catch (e) {
      console.error(e);
      setStatus("Gagal mengunggah ke Google Drive.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto w-full space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Invoice Generator</h1>
        <p className="text-slate-500 text-sm">Alat otomatisasi untuk mem-parsing input form menjadi dokumen tagihan dalam bentuk fisik (.pdf).</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Kolom Editor & Actions */}
        <div className="md:col-span-1 space-y-4">
           {/* Actions */}
           <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
             <button 
                onClick={handleDownload}
                disabled={isGenerating}
                className="w-full flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-lg disabled:opacity-50 transition-colors font-medium text-sm"
              >
                <Download className="w-4 h-4" />
                <span>Download Lokal</span>
              </button>

              <button 
                onClick={handleUploadToDrive}
                disabled={isGenerating || !token}
                className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg disabled:opacity-50 transition-colors font-medium text-sm"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Save to Drive</span>
              </button>
              
              {status && (
                <div className="mt-3 text-xs bg-slate-100 p-2 rounded text-slate-700 break-words font-mono">
                  {status}
                </div>
              )}
           </div>

           <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <h3 className="font-semibold text-sm text-slate-800 border-b pb-2 mb-3">Live Data Bindings</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Client Name</label>
                  <input type="text" value={invoiceData.client} onChange={(e) => setInvoiceData({...invoiceData, client: e.target.value})} className="w-full mt-1 border-b border-slate-300 py-1 text-sm outline-none focus:border-blue-500 bg-transparent" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Service Detail</label>
                  <input type="text" value={invoiceData.service} onChange={(e) => setInvoiceData({...invoiceData, service: e.target.value})} className="w-full mt-1 border-b border-slate-300 py-1 text-sm outline-none focus:border-blue-500 bg-transparent" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Gross Amount</label>
                  <div className="relative mt-1">
                     <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                        <span className="text-slate-500 text-sm font-medium">Rp</span>
                     </div>
                     <input type="text" value={invoiceData.amount} onChange={(e) => setInvoiceData({...invoiceData, amount: e.target.value.replace(/\D/g, '')})} className="w-full border-b border-slate-300 py-1 text-sm outline-none focus:border-blue-500 bg-transparent pl-6" />
                  </div>
                </div>
              </div>
           </div>
        </div>

        {/* Kolom Preview Surat */}
        <div className="md:col-span-2">
            {/* The Invoice Design */}
            <div className="bg-white border text-black shadow-lg rounded-sm overflow-hidden p-8 mx-auto origin-top" 
                 ref={invoiceRef}
                 style={{ width: '100%', maxWidth: '210mm', minHeight: '297mm' }}>
                
                {/* Header Invoice */}
                <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-8">
                  <div>
                    <h1 className="text-3xl font-extrabold tracking-tighter text-slate-900">INVOICE</h1>
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mt-1">Dity Store Group</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-500">ID: {invoiceData.id}</p>
                    <p className="text-sm text-slate-500">Tgl: {new Date().toLocaleDateString('id-ID')}</p>
                  </div>
                </div>

                <div className="mb-10 w-1/2">
                   <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-2">Ditagihkan Kepada:</p>
                   <p className="text-lg font-bold">{invoiceData.client}</p>
                   <p className="text-sm text-slate-500">Melalui Pemesanan Online / Form</p>
                </div>

                <table className="w-full mb-10 text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left font-bold py-3">Deskripsi Layanan</th>
                      <th className="text-right font-bold py-3">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="py-4 text-slate-700">{invoiceData.service}</td>
                      <td className="py-4 text-right font-medium">{invoiceData.amount ? `Rp${Number(invoiceData.amount).toLocaleString('id-ID')}` : 'Rp0'}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="flex justify-end pt-4">
                   <div className="w-1/2 bg-slate-50 p-6 rounded-lg text-right">
                      <p className="text-sm text-slate-500 uppercase font-bold tracking-widest mb-1">Total Tagihan</p>
                      <p className="text-3xl font-bold text-blue-600">{invoiceData.amount ? `Rp${Number(invoiceData.amount).toLocaleString('id-ID')}` : 'Rp0'}</p>
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <span className="inline-block px-3 py-1 bg-green-100 text-green-700 font-bold text-xs rounded-full uppercase tracking-widest">
                          UNPAID
                        </span>
                      </div>
                   </div>
                </div>

                <div className="mt-16 pt-8 border-t border-slate-200 text-center text-xs text-slate-500">
                  <p>Invoice ini sah dan digenerate secara otomatis oleh sistem.</p>
                  <p>Dity Store © 2026</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
