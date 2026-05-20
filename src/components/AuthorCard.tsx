import React from 'react';
import { Heart, Trash2, Edit2, User } from 'lucide-react';
import { Author } from '../types';

interface AuthorCardProps {
  key?: string | number;
  author: Author;
  onEdit: (author: Author) => void;
  onDelete: (id: string) => void | Promise<void>;
  onToggleLike?: (id: string, currentlyLiked: boolean) => void;
}

export default function AuthorCard({ author, onEdit, onDelete, onToggleLike }: AuthorCardProps) {
  return (
    <div className="bg-[#1a1a1a] border border-neutral-800 p-4 rounded-xl flex items-center gap-4 group transition-all hover:border-neutral-700">
      <div className="w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center text-neutral-500 group-hover:text-white transition-colors relative">
        <User className="w-5 h-5" />
        {author.liked && (
          <div className="absolute -top-1 -right-1 bg-red-500 w-3 h-3 rounded-full border-2 border-[#1a1a1a]"></div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold truncate text-white">{author.name}</p>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onToggleLike?.(author.id, author.liked || false);
            }}
            className="p-1 hover:scale-110 transition-transform"
          >
            <Heart className={`w-3.5 h-3.5 transition-all ${author.liked ? 'fill-red-500 text-red-500' : 'text-neutral-600 hover:text-neutral-400'}`} />
          </button>
        </div>
        <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">
          {author.liked ? 'Favorite Author' : 'Author Profile'}
        </p>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={() => onEdit(author)}
          className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-500 hover:text-white transition-all"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={() => onDelete(author.id)}
          className="p-1.5 hover:bg-red-900/20 rounded-lg text-neutral-500 hover:text-red-500 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
