import React from 'react';
import { Star, Heart, Edit2, Trash2, Book as BookIcon, RefreshCw } from 'lucide-react';
import { Book, ReadingStatus } from '../types';
import { format } from 'date-fns';

interface BookCardProps {
  key?: string | number;
  book: Book;
  onEdit: (book: Book) => void;
  onDelete: (id: string) => void | Promise<void>;
  onView: (book: Book) => void;
  onUpdateStatus?: (book: Book, status: ReadingStatus) => void;
  onSearchCover?: (book: Book) => void;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  isSelectionMode?: boolean;
  theme?: 'light' | 'dark';
}

export default function BookCard({ book, onEdit, onDelete, onView, onUpdateStatus, onSearchCover, isSelected, onSelect, isSelectionMode, theme }: BookCardProps) {
  const [aspectRatio, setAspectRatio] = React.useState<'3/4' | '4/3'>('3/4');

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onSearchCover) {
      onSearchCover(book);
    }
  };

  const handleStatusCycle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdateStatus || !book) return;
    
    const statuses: ReadingStatus[] = ['want-to-read', 'reading', 'read', 'dnf'];
    const currentStatus = book.status;
    let currentIndex = -1;
    
    // Manual search to be extremely safe against any weirdness with indexof or currentStatus
    for (let i = 0; i < statuses.length; i++) {
      if (statuses[i] === currentStatus) {
        currentIndex = i;
        break;
      }
    }
    
    const nextIndex = (currentIndex + 1) % statuses.length;
    onUpdateStatus(book, statuses[nextIndex]);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className={`text-[10px] ${i < rating ? 'text-yellow-500' : 'text-neutral-700'}`}>
            ★
          </span>
        ))}
      </div>
    );
  };

  const isDnf = book.status === 'dnf';

  return (
    <div 
      className={`space-y-3 group relative ${isSelected ? 'scale-[0.98]' : ''}`}
      onContextMenu={handleContextMenu}
      title="Right-click to search for new cover art"
    >
      {/* Selection Overlay/Checkbox */}
      {(isSelectionMode || isSelected) && (
        <div 
          onClick={(e) => { e.stopPropagation(); onSelect?.(book.id); }}
          className={`absolute top-4 left-4 z-20 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
            isSelected 
              ? (theme === 'dark' ? 'bg-white border-white' : 'bg-black border-black') 
              : (theme === 'dark' ? 'bg-black/40 border-white/20 hover:border-white/60' : 'bg-white/40 border-black/20 hover:border-black/60')
          }`}
        >
          {isSelected && <div className={`w-2.5 h-2.5 rounded-full ${theme === 'dark' ? 'bg-black' : 'bg-white'}`} />}
        </div>
      )}

      <div 
        onClick={() => isSelectionMode ? onSelect?.(book.id) : onView(book)}
        className={`relative flex items-center justify-center p-6 text-center cursor-pointer overflow-hidden transition-all hover:scale-[1.02] active:scale-100 ${isDnf ? 'grayscale opacity-60' : ''} ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-4 dark:ring-white dark:ring-offset-black' : ''} ${book.liked ? 'shadow-[0_0_40px_rgba(255,165,0,0.1)]' : ''} mac-card`}
        style={{ aspectRatio: aspectRatio === '3/4' ? '3/4' : '4/3' }}
      >
        {book.liked && (
          <div className="absolute inset-0 bg-yellow-500/5 animate-pulse pointer-events-none z-0" />
        )}
        {book.coverUrl && (
          <img 
            src={book.coverUrl} 
            alt={book.title} 
            className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            referrerPolicy="no-referrer"
            onLoad={(e) => {
              const { naturalWidth, naturalHeight } = e.currentTarget;
              if (naturalWidth > naturalHeight) {
                setAspectRatio('4/3');
              } else {
                setAspectRatio('3/4');
              }
            }}
          />
        )}

        {/* Actions Overlay */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={(e) => e.stopPropagation()}>
          <button 
            onClick={handleStatusCycle}
            title={`Status: ${(book.status || '').replace('-', ' ')} (Click to cycle)`}
            className="p-1.5 bg-black/60 dark:bg-black/60 rounded-full hover:bg-yellow-600 transition-colors"
          >
            <RefreshCw className="w-3 h-3 text-white" />
          </button>
          <button 
            onClick={() => onEdit(book)}
            className="p-1.5 bg-black/60 dark:bg-black/60 rounded-full hover:bg-neutral-800 dark:hover:bg-black transition-colors"
          >
            <Edit2 className="w-3 h-3 text-white" />
          </button>
          <button 
            onClick={() => onDelete(book.id)}
            className="p-1.5 bg-black/60 dark:bg-black/60 rounded-full hover:bg-red-900 transition-colors"
          >
            <Trash2 className="w-3 h-3 text-white" />
          </button>
        </div>

        {book.liked && (
          <div className="absolute top-2 left-2 bg-[#FF3B30] dark:bg-[#FF3B30] text-[8px] font-bold px-2 py-0.5 rounded-sm tracking-widest text-white">
            FAVORITE
          </div>
        )}

        {!book.coverUrl && (
          <div className="space-y-1">
            <p className="serif-italic text-lg text-neutral-800 dark:text-neutral-200 leading-tight line-clamp-3">
              {book.title}
            </p>
            <p className="text-[9px] uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500 font-bold">
              {book.authorName}
            </p>
          </div>
        )}

        {isDnf && (
          <div className="absolute inset-0 bg-black/40 dark:bg-black/40 flex items-center justify-center pointer-events-none">
            <div className="bg-white/80 dark:bg-black/80 border border-neutral-200 dark:border-neutral-700 px-3 py-1 rounded-full text-[9px] text-yellow-600 dark:text-yellow-500 font-bold uppercase tracking-widest">
              Shelved
            </div>
          </div>
        )}
      </div>


      <div className="px-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {book.rating ? renderStars(book.rating) : <div className="h-2.5" />}
          {book.genre && (
            <span className="text-[8px] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 px-1.5 py-0.5 rounded uppercase tracking-widest text-neutral-500 dark:text-neutral-500 font-bold">
              {book.genre}
            </span>
          )}
          {book.series && (
            <span className="text-[8px] bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded uppercase tracking-widest text-yellow-600 dark:text-yellow-500 font-bold">
              {book.series} {book.seriesPosition ? `#${book.seriesPosition}` : ''}
            </span>
          )}
          {book.pages && (
            <span className="text-[8px] text-neutral-400 dark:text-neutral-500/60 font-bold uppercase tracking-widest flex items-center gap-1">
              <BookIcon className="w-2 h-2" />
              {book.pages} pages
            </span>
          )}
          {book.isbn && (
            <span className="text-[8px] text-neutral-400 dark:text-neutral-600 font-mono tracking-tighter opacity-60">
              ISBN: {book.isbn}
            </span>
          )}
        </div>
        
        {book.notes ? (
          <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-2 italic line-clamp-2 leading-relaxed">
            "{book.notes}"
          </p>
        ) : (
          <p className="text-xs text-neutral-400 dark:text-neutral-600 mt-2 italic">No notes yet.</p>
        )}
        
        {isDnf && book.boredomReason && (
          <p className="text-[10px] text-red-900/80 mt-2 font-medium uppercase tracking-tighter">
            Dropped: {book.boredomReason}
          </p>
        )}
      </div>
    </div>
  );
}
