import { Book } from "../types";

export async function fetchBookByIsbn(isbn: string): Promise<Partial<Book> | null> {
  const cleanIsbn = isbn.replace(/[-\s]/g, "");
  try {
    // Open Library API
    const response = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&format=json&jscmd=data`);
    const data = await response.json();
    
    const bookData = data[`ISBN:${cleanIsbn}`];
    if (!bookData) return null;

    return {
      title: bookData.title || "Unknown Title",
      authorName: bookData.authors?.[0]?.name || "Unknown Author",
      coverUrl: bookData.cover?.large || bookData.cover?.medium || bookData.cover?.small || "",
      notes: bookData.notes || "",
      status: "want-to-read" as const,
      rating: 0
    };
  } catch (error) {
    console.error("Error fetching book by ISBN:", error);
    return null;
  }
}
