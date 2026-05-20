import React, { useState, useRef } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import { ReadingStatus } from '../types';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (books: any[]) => Promise<void>;
}

export default function CSVImportModal({ isOpen, onClose, onImport }: CSVImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseCSV(selectedFile);
    }
  };

  const parseCSV = (file: File) => {
    setParsing(true);
    setError(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setParsing(false);
        if (results.errors.length > 0) {
          setError('Failed to parse CSV. Please check the file format.');
          return;
        }
        
        // Trim headers to be safe
        const data = results.data as any[];
        const processedData = data.map(row => {
          const newRow: any = {};
          Object.keys(row).forEach(key => {
            newRow[key.trim()] = row[key];
          });
          return newRow;
        });

        // Basic validation: must have Title and Author
        const validData = processedData.filter(row => {
          const title = row.Title || row.title || row.Name || row.name || row['Book Title'] || row['TITLE'];
          return title && title !== '(Information no longer available — click the Amazon link to verify)';
        });
        
        if (validData.length === 0) {
          setError('No valid books found. CSV must have a "Title" or "Name" column.');
          return;
        }

        // Normalize for preview
        const normalizeAuthorP = (name: string) => {
          if (!name || typeof name !== 'string') return 'Unknown Author';
          const trimmed = name.trim();
          if (trimmed.includes(',')) {
            const parts = trimmed.split(',').map(p => p.trim());
            if (parts.length === 2) return `${parts[1]} ${parts[0]}`;
          }
          return trimmed;
        };

        const previewData = validData.slice(0, 5).map(row => ({
          ...row,
          displayTitle: row.Title || row.title || row.Name || row.name || row['Book Title'] || row['TITLE'],
          displayAuthor: normalizeAuthorP(row['First Author'] || row['All Authors'] || row.Author || row.author || row['Author Name'] || row['Primary Author'] || 'Unknown Author')
        }));

        setPreview(previewData); // Show first 5 as preview
      },
      error: (err) => {
        setParsing(false);
        setError('Error reading file: ' + err.message);
      }
    });
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rawData = results.data as any[];
        
        const booksToImport = rawData.map(row => {
          // Trim keys for each row
          const cleanedRow: any = {};
          Object.keys(row).forEach(key => {
            cleanedRow[key.trim()] = row[key];
          });

          // Normalize fields
          const title = cleanedRow.Title || cleanedRow.title || cleanedRow.Name || cleanedRow.name || cleanedRow['Book Title'] || cleanedRow['TITLE'] || cleanedRow['Name'] || '';
          
          // Improved author detection for your specific export format
          let authorRaw = cleanedRow['First Author'] || cleanedRow['All Authors'] || cleanedRow.Author || cleanedRow.author || cleanedRow['Author Name'] || cleanedRow['Primary Author'] || cleanedRow['creator'] || cleanedRow['AUTHORS'] || cleanedRow['AUTHOR'] || cleanedRow['Writer'] || cleanedRow['contributor'] || 'Unknown Author';
          
          // Function to normalize "Last, First" -> "First Last"
          const normalizeAuthor = (name: string) => {
            if (!name || typeof name !== 'string') return 'Unknown Author';
            const trimmed = name.trim();
            if (trimmed.includes(',')) {
              const parts = trimmed.split(',').map(p => p.trim());
              if (parts.length === 2) {
                return `${parts[1]} ${parts[0]}`;
              }
            }
            return trimmed;
          };

          const authorName = normalizeAuthor(authorRaw);
          const isbn = cleanedRow['ISBN / ASIN (Amazon ID)'] || cleanedRow.ISBN || cleanedRow.isbn || '';
          const statusRaw = (cleanedRow.Status || cleanedRow.status || 'read').toLowerCase();
          
          let status: ReadingStatus = 'read';
          if (statusRaw.includes('want') || statusRaw.includes('wish')) status = 'want-to-read';
          else if (statusRaw.includes('progress') || statusRaw.includes('reading')) status = 'reading';
          else if (statusRaw.includes('dnf') || statusRaw.includes('shelved') || statusRaw.includes('bored')) status = 'dnf';

          const notes = cleanedRow.Notes || cleanedRow.notes || cleanedRow.Reflections || cleanedRow.Comment || '';
          const series = cleanedRow.Series || cleanedRow.series || '';
          const seriesPosition = cleanedRow['Series Position'] || cleanedRow.seriesPosition || '';
          const genre = cleanedRow.Genres || cleanedRow.genres || cleanedRow.Genre || cleanedRow.genre || '';
          
          const pagesRaw = cleanedRow.Pages || cleanedRow.pages || '';
          const pages = parseInt(pagesRaw.toString(), 10);
          const ratingRaw = cleanedRow.Rating || cleanedRow.rating || cleanedRow['Star Rating'] || '0';
          const rating = parseInt(ratingRaw.toString(), 10);

          return {
            title: title.toString().trim(),
            authorName,
            isbn: isbn.toString().trim(),
            rating: !isNaN(rating) && rating > 0 && rating <= 5 ? rating : 0,
            status,
            notes: notes.toString().trim(),
            series: series.toString().trim(),
            seriesPosition: seriesPosition.toString().trim(),
            genre: genre.toString().trim(),
            pages: !isNaN(pages) && pages >= 0 ? pages : undefined,
            liked: false
          };
        }).filter(b => {
          const junkString = "(Information no longer available";
          return b.title && !b.title.includes(junkString);
        });

        try {
          await onImport(booksToImport);
          onClose();
          setFile(null);
          setPreview([]);
        } catch (err) {
          setError('Import failed. Please try again.');
        } finally {
          setImporting(false);
        }
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="bg-[#121212] border border-neutral-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-5 border-b border-neutral-800 flex justify-between items-center bg-[#1a1a1a]">
          <h2 className="serif-italic text-2xl font-medium text-white">Import Library</h2>
          <button onClick={onClose} className="p-1 hover:bg-neutral-800 rounded-full transition-all">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          {!file ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-800 rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer hover:border-neutral-600 hover:bg-white/5 transition-all group"
            >
              <div className="w-12 h-12 bg-neutral-900 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6 text-neutral-500" />
              </div>
              <p className="text-sm text-white font-medium mb-1">Click to upload CSV</p>
              <p className="text-xs text-neutral-500 text-center max-w-xs">
                Expected columns: Title, Author, Rating, Status, Notes
              </p>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".csv" 
                className="hidden" 
              />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-neutral-900 p-4 rounded-xl border border-neutral-800">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-neutral-400" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{file.name}</p>
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setFile(null); setPreview([]); setError(null); }}
                  className="text-[10px] text-neutral-600 hover:text-red-500 uppercase tracking-widest font-bold"
                >
                  Change
                </button>
              </div>

              {parsing ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              ) : error ? (
                <div className="bg-red-900/10 border border-red-900/20 p-4 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              ) : preview.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold px-1">Importing {preview.length}+ books...</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {preview.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-neutral-900/50 border border-neutral-800 rounded-lg">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-neutral-200 truncate">{item.displayTitle}</p>
                          <p className="text-[10px] text-neutral-500 truncate">{item.displayAuthor}</p>
                        </div>
                        <CheckCircle2 className="w-4 h-4 text-green-500/50" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              onClick={onClose}
              disabled={importing}
              className="flex-1 px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-white hover:bg-neutral-800 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!file || parsing || !!error || importing}
              className="flex-[2] mac-button-primary shadow-xl shadow-white/5 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Start Import'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
