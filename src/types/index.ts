import { Timestamp } from 'firebase/firestore';

export type ReadingStatus = 'want-to-read' | 'reading' | 'read' | 'dnf';

export interface Book {
  id: string;
  userId: string;
  title: string;
  authorName: string;
  isbn?: string;
  status: ReadingStatus;
  genre?: string;
  pages?: number;
  series?: string;
  seriesPosition?: string;
  rating?: number;
  liked?: boolean;
  boredomReason?: string;
  notes?: string;
  coverUrl?: string;
  backCoverUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Author {
  id: string;
  userId: string;
  name: string;
  liked?: boolean;
  notes?: string;
  createdAt: Timestamp;
}

export interface Recommendation {
  title: string;
  author: string;
  reason: string;
  coverUrl?: string;
}
