import React, { useState, useEffect } from 'react';
import { X, Heart, User } from 'lucide-react';
import { Author } from '../types';

interface AddAuthorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (authorData: Partial<Author>) => void;
  initialData?: Author | null;
}

export default function AddAuthorModal({ isOpen, onClose, onSave, initialData }: AddAuthorModalProps) {
  const [name, setName] = useState('');
  const [liked, setLiked] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setLiked(initialData.liked || false);
      setNotes(initialData.notes || '');
    } else {
      setName('');
      setLiked(false);
      setNotes('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#121212] border border-neutral-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-5 border-b border-neutral-800 flex justify-between items-center bg-[#1a1a1a]">
          <h2 className="serif-italic text-2xl font-medium text-white">
            {initialData ? 'Refine Profile' : 'New Literary Voice'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-neutral-800 rounded-full transition-all">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <form 
          className="p-8 space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            onSave({ name, liked, notes });
          }}
        >
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 px-1">Author Name</label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full mac-input"
                placeholder="Jorge Luis Borges"
              />
            </div>

            <div className="flex items-center gap-4 p-4 bg-neutral-900 rounded-xl border border-neutral-800">
              <button
                type="button"
                onClick={() => setLiked(!liked)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                  liked 
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' 
                    : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-white' : ''}`} />
                {liked ? 'Favorite' : 'Mark Favorite'}
              </button>
              <p className="text-[10px] text-neutral-500 leading-tight flex-1">
                Pinning an author as a favorite informs the resonance engine.
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 px-1">Literary Impressions</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full mac-input min-h-[120px] resize-none"
                placeholder="What defines their prose for you?"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-white hover:bg-neutral-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-[2] mac-button-primary shadow-xl shadow-white/5"
            >
              {initialData ? 'Update Profile' : 'Add Author'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
