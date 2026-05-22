import React, { useState } from 'react';
import { Save, Clock, PanelTop } from 'lucide-react';
import { updateStoreHours } from '../services/sheetsService';

export default function SettingsView({ token }: { token: string | null }) {
  const [openingHour, setOpeningHour] = useState("08:00");
  const [closingHour, setClosingHour] = useState("22:00");
  const [status, setStatus] = useState<string | null>(null);

  const handleSave = async () => {
    if (!token) {
      setStatus("Token tidak ditemukan, harap login ulan.");
      return;
    }

    const isConfirmed = window.confirm(
      `Apakah Anda yakin ingin memperbarui jam buka toko menjadi ${openingHour} - ${closingHour}? Data di Spreadsheet akan ditimpa.`
    );
    if (!isConfirmed) return;
    
    setStatus("Menyimpan...");
    try {
      // Menyimpan data jam buka/tutup ke Google Sheets via API
      await updateStoreHours(token, "Settings!B2", `${openingHour} - ${closingHour}`);
      setStatus("Berhasil disimpan!");
      setTimeout(() => setStatus(null), 3000);
    } catch (e) {
      console.error(e);
      setStatus("Gagal menyimpan ke Sheet.");
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto w-full space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Workspace Settings</h1>
        <p className="text-slate-500 text-sm">Konfigurasi operasional dan sinkronisasi basis data toko.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm p-6">
        <div className="flex items-center space-x-3 text-slate-800 font-semibold mb-6">
          <Clock className="w-5 h-5 text-blue-600" />
          <h2>Jam Operasional Toko</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Jam Buka Pagi</label>
            <input 
              type="time" 
              value={openingHour}
              onChange={(e) => setOpeningHour(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Jam Tutup Malam</label>
            <input 
              type="time" 
              value={closingHour}
              onChange={(e) => setClosingHour(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <span className="text-sm font-medium bg-blue-50 text-blue-700 px-3 py-1 rounded-md">
            Update otomatis ke Sheet Settings
          </span>
          <button 
            onClick={handleSave}
            className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Perubahan</span>
          </button>
        </div>
        
        {status && (
          <p className="mt-4 text-sm font-medium text-center text-blue-600">{status}</p>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm p-6">
         <div className="flex items-center space-x-3 text-slate-800 font-semibold mb-6">
          <PanelTop className="w-5 h-5 text-indigo-600" />
          <h2>URL Template Layanan</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">Gunakan Spreadsheet untuk menambahkan link URL Template default secara langsung.</p>
        <button disabled className="w-full bg-slate-100 text-slate-400 py-3 rounded-lg text-sm font-medium cursor-not-allowed">
          Fitur Khusus (Akses via Integrasi Drive)
        </button>
      </div>
    </div>
  );
}
