import { useState, useCallback } from "react";

interface LoadingState {
  isLoading: boolean;
  error: Error | null;
}

export const useAsyncLoading = (initialLoading: boolean = true) => {
  const [state, setState] = useState<LoadingState>({
    isLoading: initialLoading,
    error: null,
  });

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({
      ...prev,
      isLoading: loading,
      error: loading ? null : prev.error,
    }));
  }, []);

  const setLoadingError = useCallback((error: Error | null) => {
    setState({
      isLoading: false,
      error,
    });
  }, []);

  const resetState = useCallback(() => {
    setState({
      isLoading: initialLoading,
      error: null,
    });
  }, [initialLoading]);

  return {
    isLoading: state.isLoading,
    error: state.error,
    setLoading,
    setLoadingError,
    resetState,
  };
};
