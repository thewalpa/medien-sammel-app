import { useState, useRef, useCallback } from 'react';
import { searchBooks } from '../services/openLibrary';
import { searchMusic } from '../services/musicBrainz';
import { searchArt } from '../services/metMuseum';
import { searchMovies, hasTmdbKey } from '../services/tmdb';
import type { MediaItem } from '../types';

type SearchFn = (query: string) => Promise<any[]>;

const searchFns: Record<string, SearchFn> = {
  movie: searchMovies,
  music: searchMusic,
  art: searchArt,
  book: searchBooks,
};

export function useMediaSearch() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [mediaType, setMediaType] = useState('book');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const search = useCallback(
    (q: string, type?: string) => {
      setQuery(q);
      if (type) setMediaType(type);
      const actualType = type || mediaType;
      setError(null);

      if (!q || q.trim().length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }

      if (actualType === 'movie' && !hasTmdbKey()) {
        setResults([]);
        setError('Add your TMDB API key in Settings to search movies & series.');
        setLoading(false);
        return;
      }

      setLoading(true);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        try {
          const fn = searchFns[actualType];
          if (!fn) {
            setResults([]);
            setLoading(false);
            return;
          }
          const res = await fn(q);
          setResults(res);
        } catch (err: any) {
          console.error('Search error:', err);
          setError(err.message);
          setResults([]);
        } finally {
          setLoading(false);
        }
      }, 400);
    },
    [mediaType]
  );

  const changeType = useCallback(
    (type: string) => {
      setMediaType(type);
      setResults([]);
      setError(null);
      if (query.trim().length >= 2) search(query, type);
    },
    [query, search]
  );

  const clearSearch = useCallback(() => {
    setResults([]);
    setQuery('');
    setError(null);
    setLoading(false);
  }, []);

  return { results, loading, error, query, mediaType, search, changeType, clearSearch };
}
