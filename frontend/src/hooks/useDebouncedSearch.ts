import { useState, useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";

export function useDebouncedSearch<T>(defaultState: T, delay = 350): [T, Dispatch<SetStateAction<T>>] {
  const [search, setSearch] = useState<T>(defaultState);
  const [searchQuery, setSearchQuery] = useState<T>(defaultState);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setSearch(searchQuery);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [searchQuery, delay]);

  const setSearchQueryWithPreviousValue = (value: SetStateAction<T>) => {
    setSearchQuery((prevValue: T) => {
      if (typeof value === "function") {
        const updater = value as (prev: T) => T;
        return updater(prevValue);
      }
      return value as T;
    });
  };

  return [search, setSearchQueryWithPreviousValue];
}