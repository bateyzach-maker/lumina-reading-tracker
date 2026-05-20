import React from 'react';
import { Book, LogIn } from 'lucide-react';
import { signIn } from '../lib/firebase';

export default function Login() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-6 text-[#E0E0E0]">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
          <Book className="text-black w-8 h-8" />
        </div>
        <h1 className="serif-italic text-5xl font-medium text-white mb-3 tracking-tighter">Lumina</h1>
        <p className="text-neutral-500 mb-12 text-sm uppercase tracking-[0.3em] font-bold">
          Reader's Sanctuary
        </p>
        
        <button 
          onClick={signIn}
          className="w-full flex items-center justify-center gap-3 bg-white text-black p-4 rounded-full font-bold hover:bg-neutral-200 transition-all active:scale-[0.98] shadow-2xl shadow-white/5"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          Enter with Google
        </button>
        
        <div className="mt-20">
          <div className="flex justify-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-neutral-800"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-neutral-700"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-neutral-600"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
