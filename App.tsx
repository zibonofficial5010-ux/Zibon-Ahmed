
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
        setError("No numbers detected. Try a closer shot.");
      }
    } catch (err: any) {
      setError(err.message || "Analysis failed. Try another image.");
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

  const handleBoxClick = async () => {
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
        setError("Your clipboard is empty. Please copy an image first!");
      }
    } catch (err: any) {
      setError("Please use Ctrl + V to paste your image directly.");
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
  }, []);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1000);
  };

  const hasResults = results && status === 'success';

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-start py-4 md:py-8 px-4 font-sans selection:bg-indigo-100 transition-all duration-300">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />
      
      <div className={`w-full max-w-lg bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden transition-all duration-500 ${hasResults ? 'p-5 md:p-6' : 'p-8 md:p-12 mt-12'}`}>
        {/* Subtle Background Accents */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-50/50 rounded-full blur-3xl -ml-16 -mb-16"></div>

        <header className={`text-center relative z-10 transition-all duration-500 ${hasResults ? 'mb-4' : 'mb-8'}`}>
          <h1 className={`${hasResults ? 'text-3xl' : 'text-5xl md:text-6xl'} font-black text-slate-800 tracking-tightest select-none transition-all duration-500`}>
            Snap<span className="text-indigo-600">Extract</span>
          </h1>
        </header>

        <main className={`relative z-10 transition-all duration-500 ${hasResults ? 'space-y-4' : 'space-y-8'}`}>
          <div 
            className={`relative group cursor-pointer transition-all duration-500 overflow-hidden rounded-[1.5rem] border-2 border-dashed ${
              status === 'loading' ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50 active:scale-[0.98]'
            }`}
            style={{ height: hasResults ? '100px' : '260px' }}
            onClick={handleBoxClick}
          >
            {/* Background Image Preview */}
            {previewUrl && (
              <div className="absolute inset-0 z-0 animate-in fade-in duration-700">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover opacity-10 grayscale-[50%] blur-[0.5px]" />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent"></div>
              </div>
            )}

            <div className={`relative z-10 w-full h-full flex flex-col items-center justify-center text-center transition-all duration-500`}>
              {status === 'loading' ? (
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-10 h-10 border-[3px] border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                  <p className="text-indigo-600 font-bold text-[9px] uppercase tracking-widest animate-pulse">Extracting...</p>
                </div>
              ) : (
                <>
                  <div className={`${hasResults ? 'w-10 h-10 mb-1.5' : 'w-20 h-20 mb-4'} bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 group-hover:scale-105 transition-all duration-500 transform group-hover:rotate-1`}>
                    <svg className={`${hasResults ? 'w-5 h-5' : 'w-10 h-10'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                  <h2 className={`${hasResults ? 'text-sm' : 'text-2xl'} font-bold tracking-tight text-slate-700`}>Paste Image</h2>
                </>
              )}
            </div>
          </div>

          {hasResults && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center justify-between px-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{results.numbers.length} Numbers Found</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow shadow-indigo-50 transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <span>SELECT FILE</span>
                  </button>
                  <button 
                    onClick={() => { setResults(null); setPreviewUrl(null); setStatus('idle'); }}
                    className="bg-rose-500 text-white px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-rose-600 shadow shadow-rose-50 transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <span>RESET</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
                {results.numbers.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="bg-slate-50/40 hover:bg-white p-3 rounded-[1rem] border border-slate-100 flex items-center justify-between transition-all hover:shadow-sm group border-l-[6px] border-l-indigo-600"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-slate-900 text-lg font-black tracking-tighter leading-none mb-1 truncate select-all">{item.number}</p>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-indigo-500/60 rounded-full"></div>
                        <p className="text-[8px] font-bold text-indigo-500 uppercase tracking-wider">{item.country || "Detected"}</p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); copyToClipboard(item.number, idx); }}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm active:scale-90 flex-shrink-0 ${
                        copiedIndex === idx 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      {copiedIndex === idx ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-500 px-6 py-3 rounded-2xl text-[9px] font-bold uppercase tracking-widest text-center border border-red-100 animate-in fade-in duration-300">
              {error}
            </div>
          )}
        </main>
      </div>
      <p className="mt-8 text-[8px] font-bold text-slate-300 uppercase tracking-[0.4em] select-none">
        © 2025 SNAPEXTRACT AI
      </p>
    </div>
  );
}
