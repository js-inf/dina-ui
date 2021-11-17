import { JsonApiQuerySpec, useQuery } from "common-ui";
import { KitsuResource } from "kitsu";
import { useEffect } from "react";
import { useAutocompleteSearch } from "./useSearch";

export interface UseAutocompleteSearchButFallbackToRsqlApiSearchProps {
  searchQuery: string;
  querySpec: JsonApiQuerySpec;
  indexName: string;
  searchField: string;
}

/**
 * Try to use the Search API but fall back to the regular RSQL API if that fails or returns no results.
 */
export function useAutocompleteSearchButFallbackToRsqlApiSearch<
  T extends KitsuResource
>({
  indexName,
  searchQuery,
  querySpec,
  searchField
}: UseAutocompleteSearchButFallbackToRsqlApiSearchProps) {
  const {
    setInputValue,
    isLoading: searchLoading,
    searchResult,
    error: searchApiError
  } = useAutocompleteSearch<T>({
    indexName,
    searchField
  });

  const searchApiFailed = searchResult?.length === 0 || searchApiError;
  const searchApiIsDown = !!sessionStorage.getItem("searchApiDown");

  const fallbackToRsqlApi = searchApiFailed || !searchQuery || searchApiIsDown;

  // Use the API query with RSQL as a fallback if Search API returns empty:
  const { loading: apiLoading, response: apiResponse } = useQuery<T[]>(
    querySpec,
    { disabled: !fallbackToRsqlApi }
  );

  // Put the ResourceSelect's input into the Search hook's state:
  useEffect(() => setInputValue(searchQuery), [searchQuery]);

  // If the SearchApi is for one request then stop waiting for its
  // responses within the current browser tab (Session storage).
  // TODO Remove this later if the search-api has better uptime in local dev:
  useEffect(() => {
    if (searchApiError?.message?.startsWith?.("Service unavailable")) {
      sessionStorage.setItem("searchApiDown", "true");
    } else if (searchResult?.length) {
      sessionStorage.removeItem("searchApiDown");
    }
  }, [searchApiError, searchResult]);

  return {
    loading: (!searchApiIsDown && searchLoading) || apiLoading,
    response: {
      data: [...(searchResult ?? []), ...(apiResponse?.data ?? [])]
    }
  };
}