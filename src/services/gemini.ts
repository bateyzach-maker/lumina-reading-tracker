import axios from "axios";
import { Book, Author, Recommendation } from "../types";

export async function getBookRecommendations(likedBooks: Book[], dislikedBooks: Book[], likedAuthors: Author[], dislikedAuthors: Author[]): Promise<Recommendation[]> {
  try {
    const response = await axios.post("/api/recommendations", {
      likedBooks,
      dislikedBooks,
      likedAuthors,
      dislikedAuthors
    });
    return response.data;
  } catch (error) {
    console.error("Gemini Service Error:", error);
    return [];
  }
}

export async function checkNewReleases(authors: Author[], series: string[]): Promise<any[]> {
  try {
    const response = await axios.post("/api/check-releases", {
      authors,
      series
    });
    return response.data;
  } catch (error) {
    console.error("New Release Check Error:", error);
    return [];
  }
}
