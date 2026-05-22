import React, { useState } from 'react';
import { User, LogOut, Mail, CheckCircle2, Calendar, Settings, AlertTriangle } from 'lucide-react';
import { logout } from '../hooks/useGoogleAuth';

export default function ProfilView({ user }: { user: any }) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    await logout();
    window.location.reload();
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <header className="h-14 md:h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0 sticky top-0 z-10">
        <h1 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2 truncate">
          Profil & Keamanan
        </h1>
        <div className="flex items-center shrink-0">
          <button className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="p-6 md:p-8 max-w-3xl mx-auto w-full space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-8 flex flex-col md:flex-row items-center gap-8 border-b border-slate-100">
            <div className="w-24 h-24 rounded-full bg-slate-100 border-4 border-white shadow-lg overflow-hidden flex-shrink-0">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-slate-400 m-auto mt-6" />
              )}
            </div>
            
            <div className="text-center md:text-left flex-1">
              <h2 className="text-2xl font-bold text-slate-900">{user?.displayName || 'Administrator'}</h2>
              <div className="flex items-center justify-center md:justify-start space-x-2 text-slate-500 mt-2">
                <Mail className="w-4 h-4" />
                <span>{user?.email || 'admin@ditystore.com'}</span>
              </div>
              
              <div className="mt-4 flex gap-3 justify-center md:justify-start">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Super User
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                  Google Authenticated
                </span>
              </div>
            </div>
          </div>

          <div className="p-8 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Sesi & Akses</h3>
            
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">Akses Database Aktif</p>
                    <p className="text-xs text-slate-500">Terhubung dengan Spreadsheet & Drive</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded">Aktif</span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 flex justify-center">
              <button 
                onClick={() => setShowLogoutConfirm(true)}
                className="px-6 py-3 flex items-center justify-center space-x-2 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 font-bold rounded-xl transition-colors text-sm w-full md:w-auto min-w-[200px]"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar dari Akun</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showLogoutConfirm && (
         <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
               <div className="p-6 text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                     <AlertTriangle className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 tracking-tight mb-2">Keluar Aplikasi</h3>
                  <p className="text-sm text-slate-500 font-medium mb-6">Apakah Anda yakin ingin keluar dari akun ini? Anda harus login kembali menggunakan Google untuk masuk.</p>
                  
                  <div className="flex gap-3 w-full">
                     <button
                        onClick={() => setShowLogoutConfirm(false)}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors text-sm"
                     >
                        Batal
                     </button>
                     <button
                        onClick={handleLogout}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors text-sm"
                     >
                        Keluar
                     </button>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
