import { useState, useCallback } from "react";

export const useSearch = (initialQuery: string = "") => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) {
      console.log("Searching for:", searchQuery);
      // TODO: Navigate to chat page with the query
      // You can add navigation logic here later
      return searchQuery.trim();
    }
    return null;
  }, [searchQuery]);

  const handleQueryChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSearch();
      }
    },
    [handleSearch]
  );

  const clearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  return {
    searchQuery,
    handleSearch,
    handleQueryChange,
    handleKeyPress,
    clearSearch,
  };
};
