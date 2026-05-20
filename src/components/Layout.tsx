import React from 'react';
import { Book, Heart, BookOpen, Clock, XCircle, Users, Sparkles, LogOut, Library, Plus, Sun, Moon } from 'lucide-react';
import { auth, signOut } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

interface LayoutProps {
  children: React.ReactNode;
  activeView: string;
  setActiveView: (view: string) => void;
  onAddBook: () => void;
  onAddAuthor: () => void;
  onImport: () => void;
  onIsbnImport?: () => void;
  onClearLibrary: () => void;
  sortBy: string;
  setSortBy: (sort: 'title' | 'authorName' | 'createdAt' | 'genre' | 'series') => void;
  theme?: 'light' | 'dark';
  setTheme?: (theme: 'light' | 'dark') => void;
}

export default function Layout({ 
  children, 
  activeView, 
  setActiveView, 
  onAddBook, 
  onAddAuthor, 
  onImport, 
  onIsbnImport, 
  onClearLibrary, 
  sortBy, 
  setSortBy,
  theme = 'dark',
  setTheme
}: LayoutProps) {
  const [user] = useAuthState(auth as any);

  return (
    <div className={`min-h-screen selection:bg-white/10 flex flex-col transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0A0A0A] text-[#E0E0E0]' : 'bg-[#F5F5F7] text-[#1D1D1F]'}`}>
      {/* Centered Header */}
      <header className="py-16 px-6 text-center max-w-7xl mx-auto flex flex-col items-center shrink-0 w-full relative">
        {/* Theme Toggle */}
        <div className="absolute top-8 right-6">
          <button
            onClick={() => setTheme?.(theme === 'dark' ? 'light' : 'dark')}
            className={`p-3 rounded-full transition-all duration-300 ${theme === 'dark' ? 'bg-white/5 text-yellow-500 hover:bg-white/10' : 'bg-black/5 text-indigo-600 hover:bg-black/10'}`}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-8 shadow-2xl transition-colors duration-500 ${theme === 'dark' ? 'bg-white shadow-white/5' : 'bg-black shadow-black/5'}`}>
          <Book className={`w-8 h-8 ${theme === 'dark' ? 'text-black' : 'text-white'}`} />
        </div>
        <h1 className={`serif-italic text-6xl font-medium mb-3 tracking-tighter transition-colors duration-500 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Lumina</h1>
        <p className={`text-[10px] uppercase font-bold tracking-[0.5em] mb-4 transition-colors duration-500 ${theme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'}`}>The Shared Sanctuary</p>
        
        {user && (
          <div className="flex items-center gap-2 mb-12 animate-in fade-in slide-in-from-top-2 duration-1000 delay-500">
            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${theme === 'dark' ? 'bg-yellow-500' : 'bg-indigo-500'}`} />
            <p className={`text-[9px] uppercase tracking-[0.3em] font-bold transition-colors duration-500 ${theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'}`}>Welcome back to your collection</p>
          </div>
        )}
        
        <div className="flex flex-col items-center gap-8 w-full">
          <div className="flex flex-wrap justify-center gap-6 items-center">
            <button 
              onClick={onAddBook}
              className={`px-6 py-2 rounded-full font-semibold transition-all active:scale-95 disabled:opacity-50 ${theme === 'dark' ? 'bg-white text-black hover:bg-neutral-200' : 'bg-black text-white hover:bg-neutral-800'}`}
            >
              + Add Entry
            </button>
            <button 
              onClick={onAddAuthor}
              className={`bg-transparent border px-6 py-2 rounded-full font-semibold transition-all active:scale-95 disabled:opacity-50 ${theme === 'dark' ? 'text-white border-neutral-700 hover:bg-neutral-800' : 'text-black border-neutral-300 hover:bg-white'}`}
            >
              Authors
            </button>
            <button 
              onClick={onImport}
              className={`px-6 py-2 border rounded-full transition-all uppercase tracking-widest text-[10px] font-bold ${theme === 'dark' ? 'border-neutral-800 text-neutral-500 hover:text-white' : 'border-neutral-200 text-neutral-400 hover:text-black'}`}
            >
              Import CSV
            </button>
            <button 
              onClick={onIsbnImport}
              className={`px-6 py-2 border rounded-full transition-all uppercase tracking-widest text-[10px] font-bold ${theme === 'dark' ? 'border-neutral-800 text-neutral-500 hover:text-white' : 'border-neutral-200 text-neutral-400 hover:text-black'}`}
            >
              Import ISBN
            </button>
            <button 
              onClick={onClearLibrary}
              className="px-6 py-2 border border-red-900/30 rounded-full text-red-900/50 hover:text-red-500 hover:border-red-500/50 transition-all uppercase tracking-widest text-[10px] font-bold"
            >
              Clear Library
            </button>
            {user && (
              <button 
                onClick={() => signOut()}
                className={`px-6 py-2 text-[10px] uppercase tracking-widest font-bold transition-all rounded-full ${theme === 'dark' ? 'text-neutral-600 hover:text-white hover:bg-white/5' : 'text-neutral-400 hover:text-black hover:bg-black/5'}`}
              >
                Exit Sanctuary
              </button>
            )}
          </div>

          <div className={`flex flex-col md:flex-row items-center gap-8 py-2 px-8 border rounded-[2rem] backdrop-blur-sm max-w-full transition-all duration-500 ${theme === 'dark' ? 'border-neutral-900 bg-neutral-900/20' : 'border-neutral-200 bg-white shadow-sm'}`}>
            <div className="flex items-center gap-4">
              <span className={`text-[9px] uppercase tracking-widest font-bold shrink-0 ${theme === 'dark' ? 'text-neutral-600' : 'text-neutral-400'}`}>View</span>
              <div className="flex overflow-x-auto pb-1 md:pb-0 gap-2 no-scrollbar scroll-smooth">
                {[
                  { id: 'all', label: 'Library' },
                  { id: 'authors', label: 'Authors' },
                  { id: 'insights', label: 'Insights' },
                  { id: 'recommendations', label: 'Resonance' },
                  { id: 'tutorial', label: 'Guide' }
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setActiveView(option.id)}
                    className={`px-4 py-2 text-[10px] uppercase tracking-widest font-bold rounded-full transition-all shrink-0 ${
                      activeView === option.id 
                        ? (theme === 'dark' ? 'bg-white text-black shadow-lg shadow-white/10' : 'bg-black text-white shadow-lg shadow-black/10')
                        : (theme === 'dark' ? 'text-neutral-500 hover:text-white border border-transparent hover:border-neutral-800' : 'text-neutral-400 hover:text-black border border-transparent hover:border-neutral-200')
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={`hidden md:block h-4 w-px ${theme === 'dark' ? 'bg-neutral-800' : 'bg-neutral-200'}`} />

            <div className="flex items-center gap-4">
              <span className={`text-[9px] uppercase tracking-widest font-bold shrink-0 ${theme === 'dark' ? 'text-neutral-600' : 'text-neutral-400'}`}>Sort</span>
              <div className="flex overflow-x-auto pb-1 md:pb-0 gap-2 no-scrollbar scroll-smooth">
                {[
                  { id: 'createdAt', label: 'Date' },
                  { id: 'title', label: 'Title' },
                  { id: 'authorName', label: 'Author' },
                  { id: 'genre', label: 'Genre' },
                  { id: 'series', label: 'Series' }
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setSortBy(option.id as any)}
                    className={`px-4 py-2 text-[10px] uppercase tracking-widest font-bold rounded-full transition-all shrink-0 ${
                      sortBy === option.id 
                        ? (theme === 'dark' ? 'bg-neutral-700 text-white' : 'bg-neutral-200 text-black')
                        : (theme === 'dark' ? 'text-neutral-500 hover:text-white border border-transparent hover:border-neutral-800' : 'text-neutral-400 hover:text-black border border-transparent hover:border-neutral-100')
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 pb-24 w-full">
        {children}
      </main>
    </div>
  );
}
