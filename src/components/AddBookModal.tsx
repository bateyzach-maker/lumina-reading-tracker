import React, { useState, useEffect } from 'react';
import { X, Star, Heart } from 'lucide-react';
import { Book, ReadingStatus } from '../types';

interface AddBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bookData: Partial<Book>) => void;
  initialData?: Book | null;
}

export default function AddBookModal({ isOpen, onClose, onSave, initialData }: AddBookModalProps) {
  const [title, setTitle] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [status, setStatus] = useState<ReadingStatus>('want-to-read');
  const [rating, setRating] = useState<number>(0);
  const [liked, setLiked] = useState(false);
  const [boredomReason, setBoredomReason] = useState('');
  const [notes, setNotes] = useState('');
  const [genre, setGenre] = useState('');
  const [series, setSeries] = useState('');
  const [seriesPosition, setSeriesPosition] = useState('');
  const [isbn, setIsbn] = useState('');
  const [pages, setPages] = useState<number | string>('');
  const [coverUrl, setCoverUrl] = useState('');
  const [backCoverUrl, setBackCoverUrl] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isBack = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (isBack) {
          setBackCoverUrl(base64String);
        } else {
          setCoverUrl(base64String);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchSuggestions = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const response = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(query)}&limit=5`);
      const data = await response.json();
      setSuggestions(data.docs || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.relative')) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setAuthorName(initialData.authorName);
      setStatus(initialData.status);
      setRating(initialData.rating || 0);
      setLiked(initialData.liked || false);
      setBoredomReason(initialData.boredomReason || '');
      setNotes(initialData.notes || '');
      setGenre(initialData.genre || '');
      setSeries(initialData.series || '');
      setSeriesPosition(initialData.seriesPosition || '');
      setIsbn(initialData.isbn || '');
      setPages(initialData.pages || '');
      setCoverUrl(initialData.coverUrl || '');
      setBackCoverUrl(initialData.backCoverUrl || '');
    } else {
      setTitle('');
      setAuthorName('');
      setStatus('want-to-read');
      setRating(0);
      setLiked(false);
      setBoredomReason('');
      setNotes('');
      setGenre('');
      setSeries('');
      setSeriesPosition('');
      setIsbn('');
      setPages('');
      setCoverUrl('');
      setBackCoverUrl('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md">
      <div className="bg-white dark:bg-[#121212] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-5 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-[#1a1a1a]">
          <h2 className="serif-italic text-2xl font-medium text-black dark:text-white">
            {initialData ? 'Refine Entry' : 'New Discovery'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full transition-all">
            <X className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
          </button>
        </div>

        <form 
          className="p-8 space-y-6 max-h-[80vh] overflow-y-auto"
          onSubmit={(e) => {
            e.preventDefault();
            onSave({
              title,
              authorName,
              status,
              genre,
              series,
              seriesPosition,
              isbn,
              pages: pages ? Number(pages) : undefined,
              rating: rating > 0 ? rating : 0,
              liked,
              boredomReason: status === 'dnf' ? boredomReason : '',
              notes,
              coverUrl,
              backCoverUrl
            });
          }}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="relative">
                <label className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 px-1">Book Title</label>
                <input
                  required
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    fetchSuggestions(e.target.value);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="w-full mac-input"
                  placeholder="The Master and Margarita"
                />
                
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-2 bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden">
                    {suggestions.map((s, index) => (
                      <button
                        key={index}
                        type="button"
                        className="w-full px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors border-b border-neutral-100 dark:border-neutral-800/50 last:border-0 flex items-center gap-3"
                        onClick={() => {
                          setTitle(s.title);
                          setAuthorName(s.author_name?.[0] || '');
                          if (s.cover_i) {
                            setCoverUrl(`https://covers.openlibrary.org/b/id/${s.cover_i}-L.jpg`);
                          }
                          setSuggestions([]);
                          setShowSuggestions(false);
                        }}
                      >
                        {s.cover_i && (
                          <img 
                            src={`https://covers.openlibrary.org/b/id/${s.cover_i}-S.jpg`} 
                            alt="" 
                            className="w-8 h-10 object-cover rounded shadow"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-black dark:text-white truncate">{s.title}</p>
                          <p className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate">{s.author_name?.[0] || 'Unknown Author'}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 px-1">ISBN (Lookup)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 mac-input"
                    placeholder="978..."
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const target = e.target as HTMLInputElement;
                        const isbn = target.value;
                        if (!isbn) return;
                        
                        try {
                          const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
                          const data = await res.json();
                          const bookData = data[`ISBN:${isbn}`];
                          if (bookData) {
                            setTitle(bookData.title || title);
                            setAuthorName(bookData.authors?.[0]?.name || authorName);
                            if (bookData.cover?.large || bookData.cover?.medium) {
                              setCoverUrl(bookData.cover.large || bookData.cover.medium);
                            }
                          }
                        } catch (err) {
                          console.error('ISBN fetch failed', err);
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 px-1">Author</label>
              <input
                required
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full mac-input"
                placeholder="Mikhail Bulgakov"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 px-1">Series</label>
                <input
                  type="text"
                  value={series}
                  onChange={(e) => setSeries(e.target.value)}
                  className="w-full mac-input"
                  placeholder="The Broken Kingdoms"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 px-1">Book #</label>
                <input
                  type="text"
                  value={seriesPosition}
                  onChange={(e) => setSeriesPosition(e.target.value)}
                  className="w-full mac-input"
                  placeholder="1 or 7-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 px-1">Genre</label>
                <input
                  type="text"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full mac-input"
                  placeholder="Magical Realism"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 px-1">ISBN / ASIN</label>
                <input
                  type="text"
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                  className="w-full mac-input"
                  placeholder="B01CWUV1GM"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 px-1">Page Count</label>
                <input
                  type="number"
                  value={pages}
                  onChange={(e) => setPages(e.target.value)}
                  className="w-full mac-input"
                  placeholder="400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 px-1">Reading Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ReadingStatus)}
                  className="w-full mac-input appearance-none"
                >
                  <option value="want-to-read">Wishlist</option>
                  <option value="reading">In Progress</option>
                  <option value="read">Archived</option>
                  <option value="dnf">Shelved (DNF)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 px-1">Resonance</label>
                <div className="flex items-center h-[42px] gap-1 px-4 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      className="p-0.5 hover:scale-125 transition-transform"
                    >
                      <Star className={`w-4 h-4 ${s <= rating ? 'fill-yellow-500 text-yellow-500' : 'text-neutral-200 dark:text-neutral-800'}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setLiked(!liked)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                  liked 
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' 
                    : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-white' : ''}`} />
                {liked ? 'Admired' : 'Admire'}
              </button>
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500 leading-tight flex-1">
                Admired books strongly influence your AI recommendations.
              </p>
            </div>

            {status === 'dnf' && (
              <div className="animate-in slide-in-from-top-2 duration-300">
                <label className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 px-1">Departure Reason</label>
                <textarea
                  value={boredomReason}
                  onChange={(e) => setBoredomReason(e.target.value)}
                  className="w-full mac-input min-h-[80px] resize-none"
                  placeholder="Why did you part ways with this text?"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 px-1">Personal Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full mac-input min-h-[100px] resize-none"
                placeholder="Capture your thoughts..."
              />
            </div>

            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-neutral-100 dark:border-neutral-800/50">
              <div className="space-y-4">
                <label className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 px-1">Front Cover</label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={coverUrl}
                      onChange={(e) => setCoverUrl(e.target.value)}
                      className="flex-1 mac-input text-xs"
                      placeholder="URL (https://...)"
                    />
                  </div>
                  <div className="relative group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-full py-2 px-4 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg text-center group-hover:border-neutral-300 dark:group-hover:border-neutral-600 transition-colors">
                      <p className="text-[9px] uppercase tracking-widest text-neutral-400 dark:text-neutral-600 group-hover:text-neutral-500 dark:group-hover:text-neutral-400 font-bold italic">
                        {coverUrl && coverUrl.startsWith('data:') ? 'Image uploaded' : 'Select local image'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <label className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 px-1">Back Cover</label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={backCoverUrl}
                      onChange={(e) => setBackCoverUrl(e.target.value)}
                      className="flex-1 mac-input text-xs"
                      placeholder="URL (https://...)"
                    />
                  </div>
                  <div className="relative group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, true)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-full py-2 px-4 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg text-center group-hover:border-neutral-300 dark:group-hover:border-neutral-600 transition-colors">
                      <p className="text-[9px] uppercase tracking-widest text-neutral-400 dark:text-neutral-600 group-hover:text-neutral-500 dark:group-hover:text-neutral-400 font-bold italic">
                        {backCoverUrl && backCoverUrl.startsWith('data:') ? 'Image uploaded' : 'Select local image'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-[2] mac-button-primary shadow-xl shadow-black/5 dark:shadow-white/5"
            >
              {initialData ? 'Update Archive' : 'Add to Collection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
