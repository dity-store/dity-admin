import React from 'react';

interface GuideData {
  title: string;
  description: string;
  sections: {
    subtitle: string;
    content?: string;
    code?: string;
  }[];
}

export default function GuideView({ data }: { data: GuideData }) {
  return (
    <div className="max-w-4xl mx-auto py-6 md:py-8 px-4 md:px-8 pb-20 md:pb-8">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-5 md:px-8 md:py-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">{data.title}</h2>
          <p className="text-slate-500 mt-1 md:mt-2 text-xs md:text-sm">{data.description}</p>
        </div>
        
        <div className="p-5 md:p-8 space-y-8 md:space-y-10">
          {data.sections.map((section, idx) => (
            <div key={idx} className="space-y-3 md:space-y-4">
              <h3 className="text-base md:text-lg font-bold text-slate-700 flex items-center">
                <span className="w-6 h-6 rounded bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] md:text-xs mr-2 md:mr-3 shrink-0">{idx + 1}</span>
                <span className="leading-tight">{section.subtitle}</span>
              </h3>
              
              {section.content && (
                <div 
                  className="prose prose-slate prose-sm max-w-none text-slate-600 leading-relaxed text-xs md:text-sm"
                  dangerouslySetInnerHTML={{
                    __html: section.content.replace(/\n/g, '<br/>').replace(/([^>])(- )(.*)/g, '$1<li>$3</li>') // naive list parser
                  }}
                />
              )}

              {section.code && (
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shadow-sm relative">
                  <div className="px-3 md:px-4 py-2 bg-slate-800 border-b border-slate-700 flex items-center text-[10px] md:text-xs text-slate-400 font-mono">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400 mr-1.5 border border-red-500/20"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 mr-1.5 border border-yellow-500/20"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400 mr-4 border border-green-500/20"></span>
                    source.kt
                  </div>
                  <pre className="p-3 md:p-4 text-[10px] md:text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
                    <code>{section.code}</code>
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
