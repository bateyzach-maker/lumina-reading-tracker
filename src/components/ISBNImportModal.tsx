import React, { useState } from 'react';
import { X, Hash, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Book } from '../types';
import { fetchBookByIsbn } from '../services/isbnService';

interface ISBNImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (book: Partial<Book>) => void;
}

export default function ISBNImportModal({ isOpen, onClose, onImport }: ISBNImportModalProps) {
  const [isbn, setIsbn] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isbn) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchBookByIsbn(isbn);
      if (data) {
        onImport(data);
        onClose();
        setIsbn('');
      } else {
        throw new Error('Book not found. Please verify the ISBN.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#121212] border border-neutral-800 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden">
        <div className="px-8 py-6 border-b border-neutral-800 flex justify-between items-center bg-[#1a1a1a]">
          <div>
            <h2 className="serif-italic text-3xl text-white">Import via ISBN</h2>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mt-1">Locate a work by its unique identifier</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full transition-all text-neutral-500 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleImport} className="p-8 space-y-8">
          <div className="space-y-4">
            <div className="relative">
              <Hash className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600" />
              <input
                required
                type="text"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl py-5 pl-14 pr-6 text-white text-sm outline-none focus:ring-2 ring-white/10 transition-all placeholder:text-neutral-700"
                placeholder="e.g., 9780141180144"
              />
            </div>
            <p className="text-[10px] text-neutral-600 text-center uppercase tracking-wider">
              Powered by the Open Library Archive. ISBN-10 or ISBN-13 accepted.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-900/10 border border-red-900/20 rounded-2xl text-red-500 animate-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-xs font-medium">{error}</p>
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-8 py-4 rounded-full text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-white hover:bg-neutral-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !isbn}
              className="flex-[2] mac-button-primary shadow-2xl shadow-white/5 flex items-center justify-center gap-3 py-4"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Consulting Registry...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Fetch Metadata</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
