import React, { useState, useEffect, useMemo } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, writeBatch } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { Book, Author, ReadingStatus, Recommendation } from './types';
import { getBookRecommendations, checkNewReleases } from './services/gemini';
import { fetchBookCover } from './services/bookService';
import Layout from './components/Layout';
import BookCard from './components/BookCard';
import AuthorCard from './components/AuthorCard';
import AddBookModal from './components/AddBookModal';
import AddAuthorModal from './components/AddAuthorModal';
import DeleteConfirmationModal from './components/DeleteConfirmationModal';
import CSVImportModal from './components/CSVImportModal';
import ISBNImportModal from './components/ISBNImportModal';
import BookViewer from './components/BookViewer';
import ReadingInsights from './components/ReadingInsights';
import Tutorial from './components/Tutorial';
import Login from './components/Login';
import { Sparkles, BookOpen, Search, Loader2, Trash2, X, RefreshCw, XCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export default function App() {
  const [user, loadingAuth] = useAuthState(auth as any);
  const [activeView, setActiveView] = useState('all');
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isAuthorModalOpen, setIsAuthorModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [editingAuthor, setEditingAuthor] = useState<Author | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [fetchingCovers, setFetchingCovers] = useState(false);
  const [fetchProgress, setFetchProgress] = useState<{ current: number; total: number; currentTitle: string | null }>({
    current: 0,
    total: 0,
    currentTitle: null
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'authorName' | 'createdAt' | 'genre' | 'series'>('createdAt');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('lumina-theme');
    return (saved as 'light' | 'dark') || 'dark';
  });
  const [failedBooks, setFailedBooks] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<ReadingStatus | 'all'>('all');
  const [genreFilter, setGenreFilter] = useState<string>('all');
  const [viewingBook, setViewingBook] = useState<Book | null>(null);
  const [showCelebration, setShowCelebration] = useState<{ title: string; author: string } | null>(null);
  const [notifications, setNotifications] = useState<{ id: string; type: 'release' | 'milestone'; message: string; date: string }[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isIsbnImportModalOpen, setIsIsbnImportModalOpen] = useState(false);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showTutorialModal, setShowTutorialModal] = useState(false);

  // Firestore Queries
  const booksQuery = useMemo(() => {
    if (!user) return null;
    return query(collection(db, 'books'), where('userId', '==', user.uid), orderBy('updatedAt', 'desc'));
  }, [user]);

  const authorsQuery = useMemo(() => {
    if (!user) return null;
    return query(collection(db, 'authors'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
  }, [user]);

  const [booksSnapshot, loadingBooks] = useCollection(booksQuery as any);
  const [authorsSnapshot, loadingAuthors] = useCollection(authorsQuery as any);

  const books = useMemo(() => {
    if (!booksSnapshot) return [];
    const seen = new Set();
    return booksSnapshot.docs
      .map(doc => {
        const data = doc.data();
        // Ensure doc.id is the source of truth, not a field in data
        const { id: dataId, ...cleanData } = data; 
        return { 
          id: doc.id, 
          title: '', 
          authorName: 'Unknown', 
          status: 'want-to-read', 
          ...cleanData 
        } as Book;
      })
      .filter(book => {
        if (!book.id || seen.has(book.id)) return false;
        seen.add(book.id);
        return true;
      });
  }, [booksSnapshot]);

  const authors = useMemo(() => {
    if (!authorsSnapshot) return [];
    const seen = new Set();
    return authorsSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Author))
      .filter(author => {
        if (seen.has(author.id)) return false;
        seen.add(author.id);
        return true;
      });
  }, [authorsSnapshot]);

  useEffect(() => {
    if (user) {
      const seen = localStorage.getItem(`archive_tutorial_seen_${user.uid}`);
      if (!seen) {
        setShowTutorialModal(true);
      }
    }
  }, [user]);

  // Sync viewing book with updated data from firestore
  useEffect(() => {
    if (viewingBook) {
      const updatedBook = books.find(b => b.id === viewingBook.id);
      if (updatedBook && JSON.stringify(updatedBook) !== JSON.stringify(viewingBook)) {
        setViewingBook(updatedBook);
      }
    }
  }, [books, viewingBook?.id]);

  // Check for releases periodically
  useEffect(() => {
    if (user && books.length > 0 && authors.length > 0) {
      const checkDiscovery = async () => {
        const likedAuthors = authors.filter(a => a.liked);
        const series = Array.from(new Set(books.filter(b => b.series).map(b => b.series!)));
        
        if (likedAuthors.length > 0 || series.length > 0) {
          const newNotifs = await checkNewReleases(likedAuthors, series);
          if (newNotifs && newNotifs.length > 0) {
            setNotifications(prev => {
              const existingIds = new Set(prev.map(p => p.id));
              const filtered = newNotifs.filter(n => !existingIds.has(n.id));
              return [...prev, ...filtered].slice(0, 3);
            });
          }
        }
      };
      
      const timer = setTimeout(checkDiscovery, 10000);
      return () => clearTimeout(timer);
    }
  }, [user, authors.length, books.length]);

  const handleCloseTutorial = () => {
    setShowTutorialModal(false);
    if (user) {
      localStorage.setItem(`archive_tutorial_seen_${user.uid}`, 'true');
    }
  };

  const attemptedPolishIds = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    if (user && books.length > 0) {
      const junkString = "(Information no longer available";
      const batch = writeBatch(db);
      let updateCount = 0;

      books.forEach(book => {
        if (attemptedPolishIds.current.has(book.id)) return;

        const titleNeedsCleaning = book.title && book.title.includes(junkString);
        const authorNeedsCleaning = book.authorName && book.authorName.includes(junkString);
        const notesNeedsCleaning = book.notes && book.notes.includes(junkString);

        if (titleNeedsCleaning || authorNeedsCleaning || notesNeedsCleaning) {
          const cleaned = sanitizeData(book);
          batch.update(doc(db, 'books', book.id), {
            ...cleaned,
            updatedAt: serverTimestamp()
          });
          updateCount++;
          attemptedPolishIds.current.add(book.id);
        }
      });

      if (updateCount > 0) {
        batch.commit()
          .then(() => showToast(`${updateCount} entries polished`))
          .catch(err => {
            console.error('Polishing failed:', err);
            // Don't toast error to avoid spamming the user
          });
      }
    }
  }, [user, books.length]); // Only run when book count changes or user logs in

  useEffect(() => {
    localStorage.setItem('lumina-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  const sanitizeData = (data: any) => {
    const { id, userId, createdAt, updatedAt, ...rest } = data;
    const JUNK_STRINGS = [
      "(Information no longer available — click the Amazon link to verify)",
      "(Information no longer available – click the Amazon link to verify)",
      "(Information no longer available - click the Amazon link to verify)",
      "(Information no longer available â€” click the Amazon link to verify)",
      "â€”",
    ];

    const cleanString = (str: any) => {
      if (typeof str !== 'string') return str;
      let cleaned = str;
      JUNK_STRINGS.forEach(junk => {
        cleaned = cleaned.split(junk).join("");
      });
      cleaned = cleaned.trim().replace(/\s+/g, ' ');
      return cleaned;
    };

    return Object.entries(rest).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null) {
        let finalValue = typeof value === 'string' ? cleanString(value) : value;
        
        // Special case: if title becomes empty after cleaning, set a placeholder or use ISBN
        if (key === 'title' && (!finalValue || String(finalValue).trim().length < 1)) {
          finalValue = (rest.isbn || rest.id) ? `Book (${rest.isbn || rest.id})` : 'Untitled Entry';
        }

        // Ensure authorName is at least a string if it's the expected key
        if (key === 'authorName' && !finalValue) {
          finalValue = 'Unknown Author';
        }
        
        acc[key] = finalValue;
      }
      return acc;
    }, {} as any);
  };

  // CRUD Handlers
  const handleFetchMissingCovers = async () => {
    if (!user || fetchingCovers) return;
    
    const booksWithoutCovers = books.filter(b => !b.coverUrl);
    
    if (booksWithoutCovers.length === 0) {
      return;
    }

    setFetchingCovers(true);
    setFailedBooks([]);
    setFetchProgress({
      current: 0,
      total: booksWithoutCovers.length,
      currentTitle: booksWithoutCovers[0].title
    });

    const path = 'books';
    for (let i = 0; i < booksWithoutCovers.length; i++) {
      const book = booksWithoutCovers[i];
      setFetchProgress(prev => ({ ...prev, current: i + 1, currentTitle: book.title }));
      
      try {
        const coverUrl = await fetchBookCover(book.title, book.authorName);
        if (coverUrl) {
          const sanitized = sanitizeData({ coverUrl });
          await updateDoc(doc(db, path, book.id), {
            ...sanitized,
            updatedAt: serverTimestamp(),
          });
        }
        // Small delay between requests to be nice to APIs
        await new Promise(resolve => setTimeout(resolve, 800));
      } catch (err) {
        console.error(`Failed to fetch cover for ${book.title}:`, err);
        setFailedBooks(prev => [...prev, book.id]);
      }
    }
    setFetchingCovers(false);
    // Keep progress visible for a moment if there were failures
    if (failedBooks.length === 0) {
      setFetchProgress({ current: 0, total: 0, currentTitle: null });
    }
  };

  const handleRetryFailedCovers = async () => {
    if (!user || fetchingCovers || failedBooks.length === 0) return;
    
    const booksToRetry = books.filter(b => failedBooks.includes(b.id));
    if (booksToRetry.length === 0) {
      setFailedBooks([]);
      return;
    }

    setFetchingCovers(true);
    const retryTotal = booksToRetry.length;
    setFetchProgress({
      current: 0,
      total: retryTotal,
      currentTitle: booksToRetry[0].title
    });

    const path = 'books';
    const stillFailed: string[] = [];

    for (let i = 0; i < booksToRetry.length; i++) {
      const book = booksToRetry[i];
      setFetchProgress(prev => ({ ...prev, current: i + 1, currentTitle: `Retrying: ${book.title}` }));
      
      try {
        const coverUrl = await fetchBookCover(book.title, book.authorName);
        if (coverUrl) {
          const sanitized = sanitizeData({ coverUrl });
          await updateDoc(doc(db, path, book.id), {
            ...sanitized,
            updatedAt: serverTimestamp(),
          });
        } else {
          stillFailed.push(book.id);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        stillFailed.push(book.id);
      }
    }
    setFailedBooks(stillFailed);
    setFetchingCovers(false);
    if (stillFailed.length === 0) {
      setFetchProgress({ current: 0, total: 0, currentTitle: null });
    }
  };

  const handleSearchCover = async (book: Book) => {
    try {
      setFetchingCovers(true);
      setFetchProgress({ current: 1, total: 1, currentTitle: book.title });
      const coverUrl = await fetchBookCover(book.title, book.authorName);
      if (coverUrl) {
        const sanitized = sanitizeData({ coverUrl });
        await updateDoc(doc(db, 'books', book.id), {
          ...sanitized,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error(`Failed to fetch cover for ${book.title}:`, err);
    } finally {
      setFetchingCovers(false);
      setFetchProgress({ current: 0, total: 0, currentTitle: null });
    }
  };

  // Deletion Modal State
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | string[]; type: 'Book' | 'Author' | 'BulkBooks' | 'Library' }>({
    isOpen: false,
    id: '',
    type: 'Book'
  });

  // Filtering and Sorting
  const filteredBooks = useMemo(() => {
    let result = [...books];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b => 
        (b.title || '').toLowerCase().includes(q) || 
        (b.authorName || '').toLowerCase().includes(q)
      );
    }

    // Filter by Status
    if (statusFilter !== 'all') {
      result = result.filter(b => b.status === statusFilter);
    }

      // Filter by Genre
      if (genreFilter !== 'all') {
        result = result.filter(b => b.genre === genreFilter);
      }
  
      // Sort
      result.sort((a, b) => {
        if (sortBy === 'series') {
          const seriesA = a.series || '';
          const seriesB = b.series || '';
          if (seriesA !== seriesB) {
            return seriesA.localeCompare(seriesB);
          }
          // If same series, sort by position
          return (a.seriesPosition || '').localeCompare(b.seriesPosition || '', undefined, { numeric: true });
        }
        if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
        if (sortBy === 'authorName') return (a.authorName || '').localeCompare(b.authorName || '');
        if (sortBy === 'genre') return (a.genre || '').localeCompare(b.genre || '');
        // Date added (createdAt)
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
  
      return result;
    }, [books, searchQuery, sortBy, statusFilter, genreFilter]);

  const filteredAuthors = useMemo(() => {
    let result = [...authors];
    if (searchQuery) {
      result = result.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return result;
  }, [authors, searchQuery]);

  const uniqueGenres = useMemo(() => {
    const genres = new Set<string>();
    books.forEach(b => {
      if (b.genre) genres.add(b.genre);
    });
    return Array.from(genres).sort();
  }, [books]);

  const handleNextBook = () => {
    if (!viewingBook) return;
    const currentIndex = filteredBooks.findIndex(b => b.id === viewingBook.id);
    if (currentIndex !== -1 && currentIndex < filteredBooks.length - 1) {
      setViewingBook(filteredBooks[currentIndex + 1]);
    } else if (currentIndex === filteredBooks.length - 1) {
      setViewingBook(filteredBooks[0]); // Wrap to start
    }
  };

  const handlePreviousBook = () => {
    if (!viewingBook) return;
    const currentIndex = filteredBooks.findIndex(b => b.id === viewingBook.id);
    if (currentIndex > 0) {
      setViewingBook(filteredBooks[currentIndex - 1]);
    } else if (currentIndex === 0) {
      setViewingBook(filteredBooks[filteredBooks.length - 1]); // Wrap to end
    }
  };

  // Recommendations
  const fetchRecommendations = async () => {
    if (!user) return;
    setLoadingRecs(true);
    const likedBooks = books.filter(b => b.liked);
    const dislikedBooks = books.filter(b => b.status === 'dnf'); // Using DNF as disliked
    const likedAuthors = authors.filter(a => a.liked);
    const dislikedAuthors: Author[] = []; // Potential expansion later

    const recs = await getBookRecommendations(likedBooks, dislikedBooks, likedAuthors, dislikedAuthors);
    
    // Fetch covers for recommendations
    const recsWithCovers = await Promise.all(recs.map(async (rec) => {
      const coverUrl = await fetchBookCover(rec.title, rec.author);
      return { ...rec, coverUrl: coverUrl || undefined };
    }));

    setRecommendations(recsWithCovers);
    setLoadingRecs(false);
  };

  useEffect(() => {
    if (activeView === 'recommendations' && recommendations.length === 0 && !loadingRecs && books.length > 0) {
      fetchRecommendations();
    }
  }, [activeView]);

  // CRUD Handlers
  const toggleBookSelection = (id: string) => {
    setSelectedBookIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedBookIds.length === filteredBooks.length) {
      setSelectedBookIds([]);
    } else {
      setSelectedBookIds(filteredBooks.map(b => b.id));
    }
  };

  const handleBulkStatusChange = async (newStatus: ReadingStatus) => {
    if (selectedBookIds.length === 0) return;
    const path = 'books';
    try {
      const batch = writeBatch(db);
      selectedBookIds.forEach(id => {
        const sanitized = sanitizeData({
          status: newStatus,
        });
        batch.update(doc(db, path, id), {
          ...sanitized,
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
      setSelectedBookIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleBulkDeleteRequest = () => {
    if (selectedBookIds.length === 0) return;
    setDeleteModal({ isOpen: true, id: selectedBookIds, type: 'BulkBooks' });
  };

  const handleClearLibraryRequest = () => {
    setDeleteModal({ isOpen: true, id: 'all', type: 'Library' });
  };

  const handleSaveBook = async (bookData: Partial<Book>) => {
    if (!user) return;
    const path = 'books';
    try {
      let finalData = { ...bookData };
      
      // Fetch cover art if title/author changed or it's a new book
      if (!finalData.coverUrl && finalData.title && finalData.authorName) {
        setFetchingCovers(true);
        setFetchProgress({ current: 1, total: 1, currentTitle: finalData.title });
        const coverUrl = await fetchBookCover(finalData.title, finalData.authorName);
        if (coverUrl) {
          finalData.coverUrl = coverUrl;
        }
        setFetchingCovers(false);
        setFetchProgress({ current: 0, total: 0, currentTitle: null });
      }

      // Sanitize data: remove undefined values which Firestore doesn't support
      const sanitizedData = sanitizeData(finalData);

      const targetId = editingBook?.id || (bookData as any).id;

      if (targetId) {
        await updateDoc(doc(db, path, targetId), {
          ...sanitizedData,
          updatedAt: serverTimestamp(),
        });
      } else {
        const now = serverTimestamp();
        await addDoc(collection(db, path), {
          ...sanitizedData,
          userId: user.uid,
          createdAt: now,
          updatedAt: now,
        });
      }
      setIsBookModalOpen(false);
      setEditingBook(null);
      showToast(targetId ? 'Archive Updated' : 'Entry Added');
    } catch (error) {
      handleFirestoreError(error, editingBook ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const handleSaveAuthor = async (authorData: Partial<Author>) => {
    if (!user) return;
    const path = 'authors';
    try {
      // Sanitize data: remove undefined values which Firestore doesn't support
      const sanitizedData = sanitizeData(authorData);

      const targetId = editingAuthor?.id || (authorData as any).id;

      if (targetId) {
        await updateDoc(doc(db, path, targetId), {
          ...sanitizedData,
        });
      } else {
        await addDoc(collection(db, path), {
          ...sanitizedData,
          userId: user.uid,
          createdAt: serverTimestamp(),
        });
      }
      setIsAuthorModalOpen(false);
      setEditingAuthor(null);
      showToast(targetId ? 'Voice Refined' : 'Voice Added');
    } catch (error) {
      handleFirestoreError(error, editingAuthor ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const handleToggleAuthorLike = async (id: string, currentlyLiked: boolean) => {
    const path = 'authors';
    try {
      const sanitizedData = sanitizeData({
        liked: !currentlyLiked,
      });
      await updateDoc(doc(db, path, id), sanitizedData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleDeleteBook = async (id: string) => {
    setDeleteModal({ isOpen: true, id, type: 'Book' });
  };

  const handleDeleteAuthor = async (id: string) => {
    setDeleteModal({ isOpen: true, id, type: 'Author' });
  };

  const handleImportBooks = async (importedBooks: any[]) => {
    if (!user) return;
    const path = 'books';
    
    setFetchingCovers(true);
    setFailedBooks([]);
    setFetchProgress({
      current: 0,
      total: importedBooks.length,
      currentTitle: importedBooks[0]?.title || 'Unknown'
    });

    for (let i = 0; i < importedBooks.length; i++) {
      const bookData = importedBooks[i];
      setFetchProgress(prev => ({ ...prev, current: i + 1, currentTitle: bookData.title }));

      try {
        let finalData = { ...bookData };
        
        // Attempt cover fetch for each - with a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500)); 
        const coverUrl = await fetchBookCover(finalData.title, finalData.authorName);
        if (coverUrl) {
          finalData.coverUrl = coverUrl;
        }

        const sanitizedData = sanitizeData(finalData);

        await addDoc(collection(db, path), {
          ...sanitizedData,
          userId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        console.error(`Failed to import ${bookData.title}:`, error);
        setFailedBooks(prev => [...prev, `import-${i}`]); // Dummy ID for total count
        try {
          handleFirestoreError(error, OperationType.CREATE, path);
        } catch (e) {
          // Error is already logged by handleFirestoreError
        }
      }
    }
    setFetchingCovers(false);
    if (failedBooks.length === 0) {
      setFetchProgress({ current: 0, total: 0, currentTitle: null });
    }
  };

  const handleUpdateBookStatus = async (book: Book, status: ReadingStatus) => {
    const path = 'books';
    try {
      const sanitizedData = sanitizeData({
        status,
        updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, path, book.id), sanitizedData);
      
      // Special Celebration for finishing a book
      if (status === 'read' && book.status !== 'read') {
        setShowCelebration({ title: book.title, author: book.authorName });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const confirmDelete = async () => {
    const { id, type } = deleteModal;
    try {
      if (type === 'Book') {
        await deleteDoc(doc(db, 'books', id as string));
        showToast('Archive link severed');
      } else if (type === 'Author') {
        await deleteDoc(doc(db, 'authors', id as string));
        showToast('Voice removed from network');
      } else if (type === 'BulkBooks') {
        const batch = writeBatch(db);
        (id as string[]).forEach(bookId => {
          batch.delete(doc(db, 'books', bookId));
        });
        await batch.commit();
        setSelectedBookIds([]);
        showToast(`${(id as string[]).length} selective resonances severed`);
      } else if (type === 'Library') {
        setFetchingCovers(false); // Stop background tasks
        // Use SNAPSHOT docs to ensure we delete EVERYTHING even if processing failed
        const bookIds = booksSnapshot?.docs.map(d => d.id) || [];
        const BATCH_SIZE = 450; 
        
        for (let i = 0; i < bookIds.length; i += BATCH_SIZE) {
          const batch = writeBatch(db);
          const chunk = bookIds.slice(i, i + BATCH_SIZE);
          chunk.forEach(bookId => {
            batch.delete(doc(db, 'books', bookId));
          });
          await batch.commit();
        }
        showToast('Library archive fully cleared');
        attemptedPolishIds.current.clear();
      }
      setDeleteModal({ ...deleteModal, isOpen: false });
    } catch (error: any) {
      console.error('Delete failed:', error);
      const errorMessage = error.message?.includes('permissions') 
        ? 'Insufficient resonance permissions' 
        : 'Failed to sever connection';
      showToast(errorMessage, 'error');
      // Still close the modal so the user isn't stuck
      setDeleteModal({ ...deleteModal, isOpen: false });
      
      try {
        handleFirestoreError(error, OperationType.DELETE, type === 'Author' ? 'authors' : 'books');
      } catch (e) {
        // Just logged, don't re-throw here to keep UI stable
      }
    }
  };

  if (loadingAuth) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#F5F5F7]">
        <Loader2 className="w-8 h-8 text-[#0071E3] animate-spin mb-4" />
        <p className="text-sm font-medium text-[#8E8E93]">Finding your library...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Layout 
      activeView={activeView} 
      setActiveView={setActiveView}
      onAddBook={() => { setEditingBook(null); setIsBookModalOpen(true); }}
      onAddAuthor={() => { setEditingAuthor(null); setIsAuthorModalOpen(true); }}
      onImport={() => setIsImportModalOpen(true)}
      onIsbnImport={() => setIsIsbnImportModalOpen(true)}
      onClearLibrary={handleClearLibraryRequest}
      sortBy={sortBy}
      setSortBy={setSortBy}
      theme={theme}
      setTheme={setTheme}
    >
      <div className="space-y-24 py-12">
        {fetchingCovers || (fetchProgress.total > 0 && failedBooks.length > 0) ? (
          <div className="max-w-xl mx-auto px-6 py-8 bg-neutral-900/40 border border-neutral-800 rounded-2xl backdrop-blur-md animate-in fade-in zoom-in duration-500">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={`w-10 h-10 rounded-full border-2 border-dashed border-neutral-700 ${fetchingCovers ? 'animate-spin' : ''}`} />
                  <BookOpen className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                    {fetchingCovers ? 'Archive Restoration' : 'Restoration Halted'}
                  </h3>
                  <p className="text-[10px] text-neutral-500 font-medium truncate max-w-[200px]">
                    {fetchProgress.currentTitle || 'Preparing resonance...'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xl font-mono text-white leading-none">
                  {Math.round((fetchProgress.current / fetchProgress.total) * 100)}%
                </span>
                <p className="text-[9px] text-neutral-600 font-bold uppercase tracking-tight">
                  {fetchProgress.current} / {fetchProgress.total} RESTORED
                </p>
              </div>
            </div>

            <div className="relative h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden mb-6">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-500 ease-out shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                style={{ width: `${(fetchProgress.current / fetchProgress.total) * 100}%` }}
              />
            </div>

            {failedBooks.length > 0 && !fetchingCovers && (
              <div className="flex items-center justify-between gap-4 p-4 bg-red-950/20 border border-red-900/30 rounded-xl animate-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-[10px] font-bold text-red-200 uppercase tracking-widest">
                    {failedBooks.length} Connections unstable
                  </span>
                </div>
                <button 
                  onClick={handleRetryFailedCovers}
                  className="px-4 py-2 bg-white text-black text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-neutral-200 transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-3 h-3" />
                  Attempt Reconnection
                </button>
              </div>
            )}
            
            {!fetchingCovers && failedBooks.length === 0 && fetchProgress.total > 0 && (
               <div className="text-center animate-in fade-in duration-500">
                 <button 
                   onClick={() => setFetchProgress({ current: 0, total: 0, currentTitle: null })}
                   className="text-[9px] text-neutral-500 hover:text-white uppercase tracking-widest font-bold transition-all"
                 >
                   Dismiss Progress
                 </button>
               </div>
            )}
          </div>
        ) : null}

        {activeView === 'insights' ? (
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="serif-italic text-5xl text-white mb-16 text-center">Library Analytics</h2>
            <ReadingInsights books={books} />
          </div>
        ) : activeView === 'tutorial' ? (
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="serif-italic text-5xl text-white mb-16 text-center">Archive Guide</h2>
            <Tutorial onClose={() => setActiveView('all')} isModal={false} />
          </div>
        ) : (
          <>
            {/* Search Bar */}
        <div className="max-w-2xl mx-auto px-4 flex flex-col gap-6">
          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 group-focus-within:text-white transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title or author name..."
              className="w-full bg-[#121212]/50 border border-neutral-800 rounded-full py-4 pl-14 pr-6 text-sm text-white outline-none focus:ring-4 ring-white/5 transition-all placeholder:text-neutral-700"
            />
          </div>
          
          {uniqueGenres.length > 0 && (
            <div className="flex flex-col items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-500">
              <span className="text-[9px] uppercase tracking-widest text-neutral-600 font-bold">Resonance Type:</span>
              <div className="flex overflow-x-auto max-w-full pb-2 gap-2 no-scrollbar scroll-smooth px-4">
                <button
                  onClick={() => setGenreFilter('all')}
                  className={`px-4 py-2 text-[9px] uppercase tracking-widest font-bold rounded-full transition-all shrink-0 ${
                    genreFilter === 'all' ? 'bg-white/10 text-white' : 'text-neutral-600 hover:text-neutral-400 border border-transparent hover:border-neutral-800'
                  }`}
                >
                  All
                </button>
                {uniqueGenres.map(genre => (
                  <button
                    key={genre}
                    onClick={() => setGenreFilter(genre)}
                    className={`px-4 py-2 text-[9px] uppercase tracking-widest font-bold rounded-full transition-all shrink-0 ${
                      genreFilter === genre ? 'bg-white/10 text-white' : 'text-neutral-600 hover:text-neutral-400 border border-transparent hover:border-neutral-800'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Status Filter Buttons */}
        <div className="flex overflow-x-auto max-w-full pb-4 gap-4 no-scrollbar scroll-smooth px-6 justify-start md:justify-center">
          {[
            { id: 'all', label: 'All Books' },
            { id: 'reading', label: 'In Progress' },
            { id: 'want-to-read', label: 'Wishlist' },
            { id: 'read', label: 'Finished' },
            { id: 'dnf', label: 'Shelved' },
          ].map((status) => (
            <button
              key={status.id}
              onClick={() => setStatusFilter(status.id as any)}
              className={`px-6 py-2 text-[10px] uppercase font-bold tracking-widest rounded-full border transition-all shrink-0 ${
                statusFilter === status.id
                  ? 'bg-white text-black border-white shadow-lg shadow-white/10'
                  : 'text-neutral-500 border-neutral-800 hover:border-neutral-600 hover:text-white'
              }`}
            >
              {status.label}
            </button>
          ))}
        </div>

        {/* Bulk Actions Toolbar */}
        {selectedBookIds.length > 0 && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-6 bg-white dark:bg-zinc-900 text-black dark:text-zinc-100 px-8 py-4 rounded-full shadow-2xl animate-in slide-in-from-bottom-10 duration-300 border border-neutral-200 dark:border-neutral-800">
            <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">
              {selectedBookIds.length} Selective Resonance
            </span>
            <div className="h-4 w-px bg-black/10 dark:bg-white/10" />
            <div className="flex gap-2">
              <select 
                className="bg-transparent text-[10px] font-bold uppercase tracking-widest focus:outline-none"
                onChange={(e) => handleBulkStatusChange(e.target.value as ReadingStatus)}
                value=""
              >
                <option value="" disabled className="dark:bg-zinc-900">Change Status</option>
                <option value="reading" className="dark:bg-zinc-900">In Progress</option>
                <option value="want-to-read" className="dark:bg-zinc-900">Wishlist</option>
                <option value="read" className="dark:bg-zinc-900">Finished</option>
                <option value="dnf" className="dark:bg-zinc-900">Shelved</option>
              </select>
              <button 
                onClick={handleBulkDeleteRequest}
                className="p-1 hover:text-red-600 transition-colors"
                title="Delete Selected"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setSelectedBookIds([])}
                className="p-1 hover:opacity-50 transition-opacity"
                title="Clear Selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Shelf 1: Reading Wishlist */}
        {(statusFilter === 'all' || statusFilter === 'want-to-read') && (
          <section className="bookshelf-row">
            <div className="flex items-center justify-between mb-8 px-2">
              <h2 className="bookshelf-title m-0">Interested: Reading Wishlist</h2>
              <button 
                onClick={handleFetchMissingCovers}
                disabled={fetchingCovers}
                className="text-[10px] font-bold text-neutral-600 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2 group"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${fetchingCovers ? 'animate-spin' : 'group-hover:text-yellow-500'}`} /> 
                {fetchingCovers ? 'Populating Gallery...' : 'Populate Missing Covers'}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-16">
              {filteredBooks.filter(b => b.status === 'want-to-read').map(book => (
                <BookCard 
                  key={book.id} 
                  book={book} 
                  theme={theme}
                  onEdit={(b) => { setEditingBook(b); setIsBookModalOpen(true); }}
                  onDelete={handleDeleteBook}
                  onView={(b) => setViewingBook(b)}
                  onUpdateStatus={handleUpdateBookStatus}
                  onSearchCover={handleSearchCover}
                  isSelected={selectedBookIds.includes(book.id)}
                  onSelect={toggleBookSelection}
                  isSelectionMode={selectedBookIds.length > 0}
                />
              ))}
              {filteredBooks.filter(b => b.status === 'want-to-read').length === 0 && (
                <p className="col-span-full border border-dashed border-neutral-800 rounded-xl p-12 text-center text-xs text-neutral-600 uppercase tracking-[0.3em] font-medium">
                  The wishlist is currently empty.
                </p>
              )}
            </div>
            <div className="shelf-base"></div>
          </section>
        )}

        {/* Shelf 1.5: Reading In Progress */}
        {(statusFilter === 'all' || statusFilter === 'reading') && (
          <section className="bookshelf-row">
            <h2 className="bookshelf-title text-blue-500/40">Active: Current Journeys</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-16">
              {filteredBooks.filter(b => b.status === 'reading').map(book => (
                <BookCard 
                  key={book.id} 
                  book={book} 
                  theme={theme}
                  onEdit={(b) => { setEditingBook(b); setIsBookModalOpen(true); }}
                  onDelete={handleDeleteBook}
                  onView={(b) => setViewingBook(b)}
                  onUpdateStatus={handleUpdateBookStatus}
                  onSearchCover={handleSearchCover}
                  isSelected={selectedBookIds.includes(book.id)}
                  onSelect={toggleBookSelection}
                  isSelectionMode={selectedBookIds.length > 0}
                />
              ))}
              {filteredBooks.filter(b => b.status === 'reading').length === 0 && (
                <p className="col-span-full border border-dashed border-neutral-800 rounded-xl p-12 text-center text-xs text-neutral-600 uppercase tracking-[0.3em] font-medium">
                  No journeys currently in progress.
                </p>
              )}
            </div>
            <div className="shelf-base"></div>
          </section>
        )}

        {/* Shelf 2: Finished */}
        {(statusFilter === 'all' || statusFilter === 'read') && (
          <section className="bookshelf-row">
            <h2 className="bookshelf-title">Completed: The Archive</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-16">
              {filteredBooks.filter(b => b.status === 'read').map(book => (
                <BookCard 
                  key={book.id} 
                  book={book} 
                  theme={theme}
                  onEdit={(b) => { setEditingBook(b); setIsBookModalOpen(true); }}
                  onDelete={handleDeleteBook}
                  onView={(b) => setViewingBook(b)}
                  onUpdateStatus={handleUpdateBookStatus}
                  onSearchCover={handleSearchCover}
                  isSelected={selectedBookIds.includes(book.id)}
                  onSelect={toggleBookSelection}
                  isSelectionMode={selectedBookIds.length > 0}
                />
              ))}
              {filteredBooks.filter(b => b.status === 'read').length === 0 && (
                <p className="col-span-full border border-dashed border-neutral-800 rounded-xl p-12 text-center text-xs text-neutral-600 uppercase tracking-[0.3em] font-medium">
                  No archived works found.
                </p>
              )}
            </div>
            <div className="shelf-base"></div>
          </section>
        )}

        {/* Shelf 3: DNF / Bored */}
        {(statusFilter === 'all' || statusFilter === 'dnf') && (
          <section className="bookshelf-row">
            <h2 className="bookshelf-title text-red-900/40">Shelved: Departed Early</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-16">
              {filteredBooks.filter(b => b.status === 'dnf').map(book => (
                <BookCard 
                  key={book.id} 
                  book={book} 
                  theme={theme}
                  onEdit={(b) => { setEditingBook(b); setIsBookModalOpen(true); }}
                  onDelete={handleDeleteBook}
                  onView={(b) => setViewingBook(b)}
                  onUpdateStatus={handleUpdateBookStatus}
                  onSearchCover={handleSearchCover}
                  isSelected={selectedBookIds.includes(book.id)}
                  onSelect={toggleBookSelection}
                  isSelectionMode={selectedBookIds.length > 0}
                />
              ))}
              {filteredBooks.filter(b => b.status === 'dnf').length === 0 && (
                <p className="col-span-full border border-dashed border-neutral-800 rounded-xl p-12 text-center text-xs text-neutral-600 uppercase tracking-[0.3em] font-medium">
                  All books were finished to the end.
                </p>
              )}
            </div>
            <div className="shelf-base"></div>
          </section>
        )}

        {/* Shelf 4: AI Recommendations */}
        <section className="bookshelf-row">
          <div className="flex items-center justify-between mb-8 px-2">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.4em] text-yellow-600">Curated: Personal Resonance</h2>
            <button 
              onClick={fetchRecommendations}
              disabled={loadingRecs}
              className="text-[10px] font-bold text-neutral-600 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2 group"
            >
              <Sparkles className={`w-3.5 h-3.5 ${loadingRecs ? 'animate-spin' : 'group-hover:text-yellow-500'}`} /> 
              {loadingRecs ? 'Analysing taste...' : 'Consult Gemini'}
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {recommendations.length > 0 ? (
              recommendations.map((rec, i) => (
                <div key={i} className="mac-card p-0 border border-neutral-200 dark:border-neutral-800 flex flex-col md:flex-row h-full bg-white dark:bg-[#121212] relative overflow-hidden group min-h-[300px]">
                  {/* Cover Side */}
                  <div className="w-full md:w-1/3 relative bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center overflow-hidden">
                    {rec.coverUrl ? (
                      <img 
                        src={rec.coverUrl} 
                        alt={rec.title} 
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-neutral-300 dark:text-neutral-700">
                        <BookOpen className="w-8 h-8" />
                        <span className="text-[10px] uppercase tracking-widest font-bold">No Cover</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-neutral-50/20 dark:to-[#121212]/20 shadow-inner"></div>
                  </div>

                  {/* Content Side */}
                  <div className="flex-1 p-8 md:p-10 relative flex flex-col justify-center">
                    <div className="absolute -right-8 -top-8 w-24 h-24 bg-black/5 dark:bg-white/5 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                    <div className="relative">
                      <p className="text-[10px] uppercase tracking-widest text-yellow-600 mb-6 font-bold flex items-center gap-2">
                        <Sparkles className="w-3 h-3" />
                        New Resonance
                      </p>
                      <h3 className="serif-italic text-2xl mb-2 text-black dark:text-white leading-tight">{rec.title}</h3>
                      <p className="text-xs uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500 font-bold mb-6">by {rec.author}</p>
                      <div className="bg-neutral-50 dark:bg-neutral-900/50 p-6 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-inner">
                        <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 italic">"{rec.reason}"</p>
                      </div>
                      
                      <button 
                        onClick={() => {
                          setEditingBook({
                            title: rec.title,
                            authorName: rec.author,
                            status: 'want-to-read',
                            coverUrl: rec.coverUrl,
                            notes: `Recommended by Gemini: ${rec.reason}`
                          } as any);
                          setIsBookModalOpen(true);
                        }}
                        className="mt-6 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 hover:text-black dark:hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2"
                      >
                        Add to Wishlist +
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-16 flex flex-col items-center gap-6">
                <p className="text-xs text-neutral-400 dark:text-neutral-600 uppercase tracking-[0.3em] font-medium text-center max-w-sm leading-relaxed">
                  Connect more deeply with your collection to receive AI-powered suggestions.
                </p>
                <button 
                  onClick={fetchRecommendations}
                  disabled={loadingRecs || books.length === 0}
                  className="text-[10px] border border-neutral-300 dark:border-neutral-700 px-8 py-3 rounded-full text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:border-black dark:hover:border-white transition-all uppercase tracking-[0.2em] font-bold"
                >
                  {loadingRecs ? 'Consulting Gemini...' : 'Activate Resonance Hub'}
                </button>
              </div>
            )}
          </div>
          <div className="shelf-base bg-yellow-900/5"></div>
        </section>

        {/* Shelf 5: Literary Network (Authors) */}
        <section className="bookshelf-row pb-24">
          <h2 className="bookshelf-title">Literary Network: Curated Voices</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {filteredAuthors.map(author => (
              <AuthorCard 
                key={author.id} 
                author={author} 
                onEdit={(a) => { setEditingAuthor(a); setIsAuthorModalOpen(true); }}
                onDelete={handleDeleteAuthor}
                onToggleLike={handleToggleAuthorLike}
              />
            ))}
            {filteredAuthors.length === 0 && (
              <p className="col-span-full border border-dashed border-neutral-800 rounded-xl p-12 text-center text-xs text-neutral-600 uppercase tracking-[0.3em] font-medium">
                No voices documented yet.
              </p>
            )}
          </div>
          <div className="shelf-base"></div>
        </section>
      </>
    )}
  </div>

      <AddBookModal 
        isOpen={isBookModalOpen}
        onClose={() => { setIsBookModalOpen(false); setEditingBook(null); }}
        onSave={handleSaveBook}
        initialData={editingBook}
      />

      <AddAuthorModal
        isOpen={isAuthorModalOpen}
        onClose={() => { setIsAuthorModalOpen(false); setEditingAuthor(null); }}
        onSave={handleSaveAuthor}
        initialData={editingAuthor}
      />
      <CSVImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportBooks}
      />
      <ISBNImportModal 
        isOpen={isIsbnImportModalOpen}
        onClose={() => setIsIsbnImportModalOpen(false)}
        onImport={(data) => {
          setEditingBook(data as any);
          setIsBookModalOpen(true);
        }}
      />
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={confirmDelete}
        title={deleteModal.type}
      />

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-8 right-8 z-[200] px-6 py-3 rounded-xl shadow-2xl backdrop-blur-xl border transition-all animate-in slide-in-from-right-10 duration-300 ${
          toast.type === 'success' 
            ? 'bg-white dark:bg-neutral-900 border-green-200 dark:border-green-500/30 text-green-600 dark:text-green-400' 
            : 'bg-white dark:bg-neutral-900 border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400'
        }`}>
          <div className="flex items-center gap-3">
            {toast.type === 'success' ? <BookOpen className="w-4 h-4" /> : <X className="w-4 h-4" />}
            <span className="text-[10px] font-bold uppercase tracking-widest">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Floating Progress Notification */}
      {fetchingCovers && fetchProgress.total > 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[150] w-full max-w-sm px-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white dark:bg-[#121212] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-black dark:text-white">
                  Synchronizing Gallery
                </span>
              </div>
              <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
                {fetchProgress.current} / {fetchProgress.total}
              </span>
            </div>
            
            <div className="mb-4 bg-neutral-100 dark:bg-neutral-900 rounded-full h-1 overflow-hidden">
              <div 
                className="bg-yellow-500 h-full transition-all duration-500 ease-out"
                style={{ width: `${(fetchProgress.current / fetchProgress.total) * 100}%` }}
              />
            </div>
            
            <div className="flex items-center gap-3">
              <BookOpen className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate tracking-tight">
                Fetching: <span className="text-black dark:text-neutral-200">{fetchProgress.currentTitle}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      <BookViewer 
        book={viewingBook}
        theme={theme}
        onClose={() => setViewingBook(null)}
        onNext={handleNextBook}
        onPrevious={handlePreviousBook}
        onEdit={(b) => { setEditingBook(b); setIsBookModalOpen(true); setViewingBook(null); }}
        onDelete={(id) => { handleDeleteBook(id); setViewingBook(null); }}
        onUpdate={(book, data) => handleSaveBook({ ...book, ...data } as any)}
      />

      <AnimatePresence>
        {showTutorialModal && (
          <Tutorial onClose={handleCloseTutorial} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCelebration && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/95 dark:bg-black/95 backdrop-blur-2xl"
              onClick={() => setShowCelebration(null)}
            />
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              className="relative z-10 max-w-lg w-full text-center space-y-8"
            >
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-yellow-500 blur-3xl opacity-20 animate-pulse"></div>
                  <Sparkles className="w-20 h-20 text-yellow-500 relative z-10" />
                </div>
              </div>
              <div className="space-y-4">
                <h2 className="serif-italic text-5xl md:text-6xl text-black dark:text-white">Milestone Achieved</h2>
                <p className="text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.4em] font-bold text-xs">Sanctuary Sync: Completed</p>
              </div>
              <div className="bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 p-10 rounded-3xl backdrop-blur-sm">
                <p className="text-xl text-neutral-800 dark:text-neutral-300 italic mb-2 leading-relaxed">
                  "{showCelebration.title}"
                </p>
                <p className="text-xs text-neutral-400 dark:text-neutral-600 uppercase tracking-widest font-bold">
                  Documented in your Eternal Gallery
                </p>
              </div>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm max-w-sm mx-auto leading-relaxed">
                Another layer of your literary world has been archived. Your journey through the written word continues to inspire the architecture of this sanctuary.
              </p>
              <button 
                onClick={() => setShowCelebration(null)}
                className={`px-12 py-4 text-[10px] uppercase tracking-[0.3em] font-black rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,165,0,0.1)] ${theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white'}`}
              >
                Continue Exploring
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notifications.length > 0 && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] w-full max-w-xl px-4 pointer-events-none">
            {notifications.map(notif => (
              <motion.div
                key={notif.id}
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -50, opacity: 0 }}
                className="bg-white/90 dark:bg-black/80 border border-yellow-500/20 dark:border-yellow-500/30 backdrop-blur-xl p-6 rounded-2xl shadow-2xl flex items-start gap-4 pointer-events-auto"
              >
                <div className="bg-yellow-500/5 dark:bg-yellow-500/10 p-3 rounded-full">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest">Resonance Alert</p>
                    <p className="text-[9px] text-neutral-400 dark:text-neutral-600 font-bold">{notif.date}</p>
                  </div>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed font-medium">
                    {notif.message}
                  </p>
                </div>
                <button 
                  onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
                  className="p-1 hover:text-black dark:hover:text-white text-neutral-400 dark:text-neutral-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
