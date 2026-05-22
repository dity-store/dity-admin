import React from 'react';

export default function Header() {
  return (
    <header className="h-14 md:h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0 z-10 sticky top-0">
      <h1 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2 truncate">
        Dity Store
      </h1>
      <div className="flex items-center space-x-3 md:space-x-4 shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-bold text-slate-900 leading-none mb-1.5 mt-0.5">Fahmi Nurizky</p>
          <p className="text-[11px] font-medium text-slate-500 leading-none">dity.store31</p>
        </div>
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-tr from-slate-100 to-slate-200 border border-slate-300 flex items-center justify-center text-xs md:text-sm font-bold text-slate-600 shadow-sm shrink-0">
          FN
        </div>
      </div>
    </header>
  );
}
