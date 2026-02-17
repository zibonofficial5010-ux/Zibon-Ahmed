
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { extractNumbersFromImage } from './services/geminiService';
import { AppStatus, ExtractionResponse } from './types';

export default function App() {
  const [status, setStatus] = useState<AppStatus>('idle');
  const [results, setResults] = useState<ExtractionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImage = async (base64: string) => {
    setPreviewUrl(base64);
    setStatus('loading');
    setError(null);
    setResults(null);

    try {
      const data = await extractNumbersFromImage(base64);
      setResults(data);
      setStatus('success');
      
      if (data.numbers.length === 0) {
        setError("No numbers detected. Please try a clearer shot.");
      }
    } catch (err: any) {
      setError(err.message);
      setStatus('error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => processImage(reader.result as string);
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const openFileSelector = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (status === 'loading') return;
    fileInputRef.current?.click();
  };

  const handleClipboardAction = async () => {
    if (status === 'loading') return;
    setError(null);
    try {
      const items = await navigator.clipboard.read();
      let foundImage = false;
      for (const item of items) {
        const imageType = item.types.find(type => type.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const reader = new FileReader();
          reader.onloadend = () => processImage(reader.result as string);
          reader.readAsDataURL(blob);
          foundImage = true;
          break;
        }
      }
      if (!foundImage) {
        setError("Clipboard doesn't have an image. Copy an image first!");
      }
    } catch (err: any) {
      setError("Clipboard access denied. Please use Ctrl+V or click 'Choose File'.");
    }
  };

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onloadend = () => processImage(reader.result as string);
          reader.readAsDataURL(blob);
          break;
        }
      }
    }
  }, [status]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1000);
  };

  const resetApp = () => {
    setResults(null);
    setPreviewUrl(null);
    setError(null);
    setStatus('idle');
  };

  const isSetupError = error?.includes("SETUP_REQUIRED") || error?.includes("INVALID_KEY");
  const hasResults = results && status === 'success';

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-start py-10 md:py-16 px-4 font-sans selection:bg-cyan-500/30 overflow-x-hidden text-slate-200">
      {/* Dynamic Aura Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-cyan-900/20 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-900/20 blur-[120px] rounded-full"></div>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
      
      <div className="w-full max-w-lg relative">
        <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden">
          
          <header className="text-center pt-12 pb-8">
            <h1 className="text-5xl font-black tracking-tighter text-white drop-shadow-[0_0_20px_rgba(34,211,238,0.3)]">
              Snap<span className="text-cyan-400">Extract</span>
            </h1>
          </header>

          <main className="px-8 pb-12 space-y-8">
            {/* Action Box */}
            <div 
              className={`relative group cursor-pointer transition-all duration-700 rounded-[2.5rem] border border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent hover:from-white/[0.08] flex flex-col items-center justify-center ring-1 ring-white/10 hover:ring-cyan-500/30 ${
                status === 'loading' ? 'ring-2 ring-cyan-500 bg-cyan-500/5' : ''
              }`}
              style={{ height: hasResults ? '140px' : '320px' }}
              onClick={handleClipboardAction}
            >
              {previewUrl && (
                <div className="absolute inset-0 z-0">
                  <img src={previewUrl} className="w-full h-full object-cover opacity-20 brightness-110 saturate-50" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                </div>
              )}

              <div className="relative z-10 flex flex-col items-center justify-center text-center px-8">
                {status === 'loading' ? (
                  <div className="flex flex-col items-center space-y-5">
                    <div className="relative">
                      <div className="w-16 h-16 border-2 border-cyan-400/10 border-t-cyan-400 rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 bg-cyan-500/20 rounded-full animate-ping"></div>
                      </div>
                    </div>
                    <p className="text-cyan-300 font-bold text-[11px] uppercase tracking-[0.4em] animate-pulse">Scanning Intelligence</p>
                  </div>
                ) : (
                  <>
                    <div className={`flex items-center justify-center transition-all duration-700 transform ${hasResults ? 'scale-75 -translate-y-2' : 'mb-6'}`}>
                       <div className="w-24 h-24 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-cyan-500/30 group-hover:shadow-cyan-500/50 transition-all group-hover:rotate-2 group-hover:scale-105">
                          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                          </svg>
                       </div>
                    </div>
                    {!hasResults && (
                      <h2 className="text-2xl font-black text-white tracking-tight">Tap to Auto-Paste</h2>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Standard Upload Option */}
            {!hasResults && status !== 'loading' && (
              <button 
                onClick={openFileSelector}
                className="w-full py-5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 rounded-2xl font-bold text-xs uppercase tracking-[0.3em] transition-all flex items-center justify-center space-x-3"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                <span>Choose Image File</span>
              </button>
            )}

            {hasResults && (
              <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-5">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex flex-col">
                    <span className="text-white text-xl font-black tracking-tighter">{results.numbers.length} Results</span>
                  </div>
                  <button 
                    onClick={resetApp} 
                    className="p-3 bg-white/5 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-all border border-white/5 group/btn"
                    title="Delete Results"
                  >
                    <svg className="w-5 h-5 transition-transform group-hover/btn:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                  </button>
                </div>

                <div className="grid gap-2 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                  {results.numbers.map((item, idx) => (
                    <div key={idx} className="bg-white/[0.02] border border-white/[0.05] py-2.5 px-5 rounded-2xl flex items-center justify-between group hover:border-cyan-500/40 hover:bg-white/[0.04] transition-all">
                      <div className="flex flex-col overflow-hidden">
                        <p className="text-white text-lg font-bold tracking-tight truncate">{item.number}</p>
                        <p className="text-[9px] font-bold text-cyan-500/80 uppercase tracking-[0.1em]">{item.country}</p>
                      </div>
                      <button 
                        onClick={() => copyToClipboard(item.number, idx)}
                        className={`p-2.5 rounded-xl transition-all shadow-md border ${
                          copiedIndex === idx 
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                          : 'bg-white/5 border-white/5 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/30'
                        }`}
                        title={copiedIndex === idx ? 'Copied' : 'Copy Number'}
                      >
                        {copiedIndex === idx ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                        )}
                      </button>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={resetApp}
                  className="w-full py-5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-cyan-500/10 active:scale-[0.98] transition-all"
                >
                  Analyze New Image
                </button>
              </div>
            )}

            {error && (
              <div className="p-8 rounded-[2.5rem] bg-rose-500/5 border border-rose-500/20 animate-in slide-in-from-top-4">
                <div className="flex items-center space-x-4 text-rose-400 mb-3">
                   <div className="p-2 bg-rose-500/20 rounded-xl">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                   </div>
                   <p className="text-xs font-black uppercase tracking-[0.3em]">Alert</p>
                </div>
                <p className="text-sm text-slate-400 font-medium leading-relaxed">{error.replace('SETUP_REQUIRED: ', '').replace('INVALID_KEY: ', '')}</p>
                
                {isSetupError && (
                  <div className="mt-6 p-6 rounded-2xl bg-black/40 border border-white/5 space-y-4">
                    <div className="flex items-center space-x-3 text-[9px] font-black text-cyan-400 uppercase tracking-widest">
                      <span>Configuration Guide</span>
                      <div className="flex-1 h-[1px] bg-white/5"></div>
                    </div>
                    <ul className="space-y-3">
                      <li className="flex items-center space-x-3 text-xs text-slate-400">
                        <span className="w-5 h-5 bg-cyan-500/10 rounded flex items-center justify-center text-[10px] font-bold text-cyan-400">1</span>
                        <span>AI Studio-র <b>API keys</b> ট্যাবে যান।</span>
                      </li>
                      <li className="flex items-center space-x-3 text-xs text-slate-400">
                        <span className="w-5 h-5 bg-cyan-500/10 rounded flex items-center justify-center text-[10px] font-bold text-cyan-400">2</span>
                        <span><b>Import projects</b> বাটনে ক্লিক করুন।</span>
                      </li>
                      <li className="flex items-center space-x-3 text-xs text-slate-400">
                        <span className="w-5 h-5 bg-cyan-500/10 rounded flex items-center justify-center text-[10px] font-bold text-cyan-400">3</span>
                        <span><b>Create API key</b> জেনারেট করুন।</span>
                      </li>
                    </ul>
                  </div>
                )}

                {!isSetupError && (
                  <button 
                    onClick={resetApp}
                    className="mt-6 w-full py-4 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-2xl font-black text-xs uppercase tracking-widest border border-rose-500/20 transition-all"
                  >
                    Reset & Retry
                  </button>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.01);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}
