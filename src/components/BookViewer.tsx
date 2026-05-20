import React from 'react';
import { X, Book as BookIcon, Star, Calendar, Trash2, Edit2, ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { Book, ReadingStatus } from '../types';
import { format } from 'date-fns';

interface BookViewerProps {
  book: Book | null;
  onClose: () => void;
  onEdit?: (book: Book) => void;
  onDelete?: (id: string) => void;
  onUpdate?: (book: Book, data: Partial<Book>) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  theme?: 'light' | 'dark';
}

const CLEANUP_STRINGS = [
  "(Information no longer available — click the Amazon link to verify)",
  "(Information no longer available – click the Amazon link to verify)",
  "(Information no longer available - click the Amazon link to verify)",
  "(Information no longer available â€” click the Amazon link to verify)",
  "â€”",
];

const sanitizeDisplayString = (str: string) => {
  if (!str) return "";
  let cleaned = str;
  CLEANUP_STRINGS.forEach(s => {
    cleaned = cleaned.replace(s, "");
  });
  cleaned = cleaned.trim().replace(/\s+/g, ' ');
  return cleaned === "" ? "Untitled Entry" : cleaned;
};

export default function BookViewer({ book, onClose, onEdit, onDelete, onUpdate, onNext, onPrevious, theme }: BookViewerProps) {
  const [isEditingNotes, setIsEditingNotes] = React.useState(false);
  const [editedNotes, setEditedNotes] = React.useState('');
  const [localRating, setLocalRating] = React.useState(0);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditingNotes) return;
      if (e.key === 'ArrowRight') onNext?.();
      if (e.key === 'ArrowLeft') onPrevious?.();
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrevious, onClose, isEditingNotes]);

  React.useEffect(() => {
    if (book) {
      setEditedNotes(book.notes || '');
      setLocalRating(book.rating || 0);
    }
  }, [book]);

  if (!book) return null;

  const displayTitle = sanitizeDisplayString(book.title);
  const displayAuthor = sanitizeDisplayString(book.authorName);

  const handleRatingClick = (newRating: number) => {
    setLocalRating(newRating);
    onUpdate?.(book, { rating: newRating });
  };

  const handleStatusChange = (newStatus: ReadingStatus) => {
    onUpdate?.(book, { status: newStatus });
  };

  const handleToggleLike = () => {
    onUpdate?.(book, { liked: !book.liked });
  };

  const handleNotesSubmit = () => {
    onUpdate?.(book, { notes: editedNotes });
    setIsEditingNotes(false);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-white/95 dark:bg-black/90 backdrop-blur-xl animate-in fade-in duration-500 p-4 md:p-8">
      <button 
        onClick={onClose}
        className="absolute top-8 right-8 p-3 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 rounded-full text-black dark:text-white transition-all z-20 group"
      >
        <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
      </button>

      <div className="max-w-6xl w-full flex flex-col md:flex-row gap-12 items-center md:items-start overflow-y-auto max-h-[90vh] custom-scrollbar p-4 relative">
        {/* Navigation Arrows */}
        {onPrevious && (
          <button 
            onClick={onPrevious}
            className="fixed left-4 top-1/2 -translate-y-1/2 p-4 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full text-black/20 dark:text-white/30 hover:text-black dark:hover:text-white transition-all hidden lg:block"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
        )}
        {onNext && (
          <button 
            onClick={onNext}
            className="fixed right-4 top-1/2 -translate-y-1/2 p-4 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full text-black/20 dark:text-white/30 hover:text-black dark:hover:text-white transition-all hidden lg:block"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        )}

        {/* Cover Section */}
        <div className="w-full md:w-1/2 flex justify-center">
          <div className="relative group max-w-sm w-full">
            <div className="absolute inset-0 bg-indigo-500 blur-3xl rounded-full opacity-10 group-hover:opacity-20 transition-opacity"></div>
            {book.coverUrl ? (
              <img 
                src={book.coverUrl} 
                alt={book.title} 
                className="relative z-10 w-full rounded-2xl shadow-2xl border border-black/5 dark:border-white/10"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="relative z-10 aspect-[3/4] w-full bg-neutral-100 dark:bg-neutral-900 rounded-2xl border border-black/5 dark:border-white/10 flex flex-col items-center justify-center gap-4 text-neutral-300 dark:text-neutral-700">
                <BookIcon className="w-24 h-24" />
                <span className="text-xs uppercase tracking-[0.3em] font-bold">No Cover Documented</span>
              </div>
            )}
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 space-y-8 text-center md:text-left">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="serif-italic text-5xl md:text-7xl text-black dark:text-white leading-tight">{displayTitle}</h2>
              <button 
                onClick={handleToggleLike}
                className={`p-4 rounded-full transition-all group/heart ${book.liked ? 'bg-red-500/20 text-red-500' : 'bg-black/5 dark:bg-white/5 text-neutral-400 dark:text-neutral-600 hover:text-red-500 font-bold'}`}
                title={book.liked ? "In Favorites" : "Add to Favorites"}
              >
                <Heart className={`w-8 h-8 ${book.liked ? 'fill-current' : 'group-hover/heart:scale-110 transition-transform'}`} />
              </button>
            </div>
            <p className="text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.4em] font-bold text-sm md:text-base">By {displayAuthor}</p>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 py-8 border-y border-black/5 dark:border-white/5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <p className="text-[10px] text-neutral-400 dark:text-neutral-600 uppercase tracking-widest font-bold">Resonance Level</p>
                {localRating > 0 && (
                  <span className="text-[10px] text-yellow-500 font-bold px-1.5 py-0.5 bg-yellow-500/10 rounded">
                    {localRating}/5
                  </span>
                )}
              </div>
              <div className="flex gap-1 justify-center md:justify-start">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleRatingClick(i + 1)}
                    className="hover:scale-125 transition-transform group/star"
                    title={`Rate ${i + 1} Stars`}
                  >
                    <Star className={`w-5 h-5 transition-colors ${i < localRating ? 'fill-yellow-500 text-yellow-500' : 'text-neutral-300 dark:text-neutral-800 group-hover/star:text-neutral-500'}`} />
                  </button>
                ))}
              </div>
            </div>
            <div className="h-8 w-px bg-black/5 dark:bg-white/5 hidden md:block" />
            <div className="space-y-1">
              <p className="text-[10px] text-neutral-400 dark:text-neutral-600 uppercase tracking-widest font-bold">Archive Status</p>
              <select 
                value={book.status}
                onChange={(e) => handleStatusChange(e.target.value as ReadingStatus)}
                className="bg-transparent text-black dark:text-white text-xs uppercase tracking-widest font-bold focus:outline-none cursor-pointer border-b border-transparent hover:border-black/20 dark:hover:border-white/20"
              >
                <option value="reading" className="bg-white dark:bg-[#121212]">In Progress</option>
                <option value="want-to-read" className="bg-white dark:bg-[#121212]">Wishlist</option>
                <option value="read" className="bg-white dark:bg-[#121212]">Finished</option>
                <option value="dnf" className="bg-white dark:bg-[#121212]">Shelved (DNF)</option>
              </select>
            </div>
            <div className="h-8 w-px bg-black/5 dark:bg-white/5 hidden md:block" />
            <div className="space-y-1">
              <p className="text-[10px] text-neutral-400 dark:text-neutral-600 uppercase tracking-widest font-bold">Documented On</p>
              <p className="text-black dark:text-white text-xs uppercase tracking-widest font-bold">
                {book.createdAt?.toDate ? format(book.createdAt.toDate(), 'MMMM d, yyyy') : 'Recently'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 py-8 items-start">
            {book.series && (
              <div className="space-y-2 p-6 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl">
                <p className="text-[10px] text-yellow-600 uppercase tracking-widest font-black">Resonance Path (Series)</p>
                <p className="text-lg text-black dark:text-white font-medium serif-italic">
                  {book.series}
                </p>
                {book.seriesPosition && (
                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-widest font-bold">Entry No. {book.seriesPosition}</p>
                )}
              </div>
            )}
            
            {(book.genre || book.pages) && (
              <div className="space-y-4">
                {book.genre && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-600 uppercase tracking-widest font-bold">Resonance Type (Genre)</p>
                    <p className="text-neutral-800 dark:text-neutral-200 text-sm font-medium">{book.genre}</p>
                  </div>
                )}
                {book.pages && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-600 uppercase tracking-widest font-bold">Volume Depth</p>
                    <p className="text-neutral-800 dark:text-neutral-200 text-sm font-medium">{book.pages} Pages</p>
                  </div>
                )}
              </div>
            )}

            {book.isbn && (
              <div className="space-y-2">
                <p className="text-[10px] text-neutral-400 dark:text-neutral-600 uppercase tracking-widest font-bold">Record Index (ISBN/ASIN)</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded text-neutral-600 dark:text-neutral-400 font-mono tracking-wider border border-black/5 dark:border-white/5">
                    {book.isbn}
                  </code>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <p className="text-[10px] text-neutral-400 dark:text-neutral-600 uppercase tracking-widest font-bold">Archivist's Notes (Click to Edit)</p>
            <div 
              className={`bg-black/[0.01] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 p-8 rounded-3xl relative overflow-hidden group/note cursor-text ${isEditingNotes ? 'ring-1 ring-yellow-500/50' : ''}`}
              onClick={() => !isEditingNotes && setIsEditingNotes(true)}
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500/20 group-hover/note:bg-yellow-500/50 transition-colors"></div>
              {isEditingNotes ? (
                <div className="space-y-4">
                  <textarea 
                    autoFocus
                    value={editedNotes}
                    onChange={(e) => setEditedNotes(e.target.value)}
                    onBlur={() => handleNotesSubmit()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleNotesSubmit();
                      if (e.key === 'Escape') {
                        setEditedNotes(book.notes || '');
                        setIsEditingNotes(false);
                      }
                    }}
                    className="w-full bg-transparent text-lg md:text-xl text-neutral-800 dark:text-neutral-300 italic leading-relaxed font-light outline-none min-h-[100px] resize-none"
                    placeholder="Reflect on this work..."
                  />
                  <div className="flex justify-end gap-2">
                    <p className="text-[8px] text-neutral-400 dark:text-neutral-600 uppercase tracking-widest font-medium">Cmd+Enter to Save</p>
                  </div>
                </div>
              ) : (
                <p className="text-lg md:text-xl text-neutral-500 dark:text-neutral-400 italic leading-relaxed font-light">
                  {book.notes ? `"${book.notes}"` : "No observations recorded for this work yet."}
                </p>
              )}
            </div>
          </div>

          {book.status === 'dnf' && book.boredomReason && (
            <div className="space-y-3">
              <p className="text-[10px] text-red-900/60 dark:text-red-900 uppercase tracking-widest font-bold">Shelving Reason</p>
              <p className="text-red-600 dark:text-red-500/80 text-sm font-medium">{book.boredomReason}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-8">
            <button 
              onClick={() => onEdit?.(book)}
              className={`flex items-center gap-2 px-8 py-3 rounded-full font-bold text-[10px] uppercase tracking-widest hover:scale-105 transition-all ${theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white'}`}
            >
              <Edit2 className="w-3.5 h-3.5" /> Modify Document
            </button>
            <button 
              onClick={() => onDelete?.(book.id)}
              className="flex items-center gap-2 px-8 py-3 border border-red-900/40 text-red-900 rounded-full font-bold text-[10px] uppercase tracking-widest hover:bg-red-900 hover:text-white transition-all underline-offset-4 font-bold"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete from Gallery
            </button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-12 hidden md:flex items-center gap-8 text-neutral-400 dark:text-neutral-600 text-[10px] uppercase tracking-[0.2em] font-bold">
        <span>Literary Resonance Explorer</span>
        <div className="w-8 h-px bg-neutral-200 dark:bg-neutral-800" />
        <span>V2.0 Sanctuary Edition</span>
      </div>
    </div>
  );
}
