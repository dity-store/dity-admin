import React from 'react';
import { 
  LayoutDashboard, 
  User, 
  Sheet as SheetIcon, 
  FormInput, 
  Receipt,
  CheckCircle2,
  ListTodo
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-500' },
    { id: 'admin_panel', label: 'Panel Admin', icon: ListTodo, color: 'text-red-500' },
    { id: 'order', label: 'Order', icon: Receipt, color: 'text-green-500' },
    { id: 'profil', label: 'Profil', icon: User, color: 'text-yellow-500' },
  ];

  return (
    <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-row md:flex-col border-t md:border-t-0 md:border-r border-slate-800 shrink-0 h-[72px] md:h-full z-20 pb-[env(safe-area-inset-bottom)]">
      <div className="hidden md:flex p-6 items-center space-x-3 border-b border-slate-800 shrink-0">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-white shadow-sm shadow-blue-500/20">D</div>
        <span className="text-lg font-semibold text-white tracking-tight truncate">Dity Store</span>
      </div>
      
      <nav className="flex-1 w-full md:w-auto p-1.5 md:p-4 flex flex-row md:flex-col items-center justify-around md:justify-start md:space-y-1 overflow-x-auto md:overflow-y-auto no-scrollbar gap-1 md:gap-0">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col md:flex-row items-center justify-center md:justify-start md:space-x-3 p-1 md:p-3 rounded-lg transition-colors w-16 md:w-full min-w-[64px] shrink-0 ${
              activeTab === item.id 
                ? 'bg-slate-800 text-white font-medium shadow-sm' 
                : 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-200'
            }`}
          >
            <item.icon className={`w-5 h-5 md:w-5 md:h-5 ${activeTab === item.id ? item.color : 'text-slate-500'} mb-1 md:mb-0`} strokeWidth={2} />
            <span className="text-[10px] md:text-sm font-medium tracking-tight truncate w-full text-center md:text-left leading-none">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="hidden md:block p-4 mt-auto border-t border-slate-800 shrink-0">
        <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/50">
          <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 tracking-widest">OAuth Status</p>
          <div className="flex items-center space-x-2">
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </div>
            <span className="text-sm font-medium text-slate-200">Google Connected</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
