import { useState, useRef, useCallback } from 'react';

export function useLoading(minLoadingTime: number = 500) {
  const [isLoading, setIsLoading] = useState(false);
  const startTimeRef = useRef<number>(0);

  const setLoading = useCallback((loading: boolean) => {
    if (loading) {
      setIsLoading(true);
      startTimeRef.current = Date.now();
    } else {
      const elapsed = Date.now() - startTimeRef.current;
      const delay = Math.max(0, minLoadingTime - elapsed);

      setTimeout(() => {
        setIsLoading(false);
      }, delay);
    }
  }, [minLoadingTime]);

  return {
    isLoading,
    setLoading,
  };
}