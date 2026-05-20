export async function fetchBookCover(title: string, author: string, retries = 2, delay = 1000): Promise<string | null> {
  const attemptFetch = async (currentAttempt: number): Promise<string | null> => {
    try {
      const query = encodeURIComponent(`title:${title} author:${author}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      const response = await fetch(`https://openlibrary.org/search.json?q=${query}&limit=1`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('RATE_LIMIT');
        }
        return null;
      }

      const data = await response.json();

      if (data.docs && data.docs.length > 0) {
        const book = data.docs[0];
        if (book.cover_i) {
          return `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`;
        } else if (book.isbn && book.isbn.length > 0) {
          return `https://covers.openlibrary.org/b/isbn/${book.isbn[0]}-L.jpg`;
        }
      }
      return null;
    } catch (error: any) {
      if (currentAttempt < retries) {
        const nextDelay = delay * Math.pow(2, currentAttempt); // Exponential backoff
        console.warn(`Fetch attempt ${currentAttempt + 1} failed for "${title}". Retrying in ${nextDelay}ms...`, error.message || error);
        await new Promise(resolve => setTimeout(resolve, nextDelay));
        return attemptFetch(currentAttempt + 1);
      }

      if (error.name === 'AbortError') {
        console.warn('Book cover fetch timed out');
      } else if (error.message === 'RATE_LIMIT') {
        console.warn('OpenLibrary rate limit hit after retries');
      } else {
        console.error('Error fetching book cover:', error.message || error);
      }
      return null;
    }
  };

  return attemptFetch(0);
}
