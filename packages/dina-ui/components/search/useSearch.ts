import { AxiosInstance } from "axios";
import { useApiClient, useDebouncedFetch } from "common-ui";
import { DocWithData } from "jsonapi-typescript";
import { KitsuResource, PersistedResource } from "kitsu";
import { deserialise } from "kitsu-core";
import { compact } from "lodash";

// The parts of the API response used by this component:
export interface AutocompleteSearchResponse {
  hits?: {
    hits?: {
      id?: string;
      index?: string;
      sourceAsMap?: DocWithData;
    }[];
  };
}

export type AutocompleteSearchParams = Omit<DoSearchParams, "searchValue">;

export function useAutocompleteSearch<T extends KitsuResource>({
  indexName,
  searchField
}: AutocompleteSearchParams) {
  const { apiClient } = useApiClient();

  return useDebouncedFetch({
    fetcher: searchValue =>
      doSearch<T>(apiClient.axios, { indexName, searchField, searchValue }),
    timeoutMs: 250
  });
}

export interface DoSearchParams {
  searchField: string;
  indexName: string;
  searchValue?: string;
}

/** Does the search against the search API. */
export async function doSearch<T extends KitsuResource>(
  axios: Pick<AxiosInstance, "get">,
  { indexName, searchField, searchValue }: DoSearchParams
) {
  if (!searchValue) {
    return null;
  }

  const response = await axios.get<AutocompleteSearchResponse>(
    "search-api/search/auto-complete",
    {
      params: {
        prefix: searchValue,
        autoCompleteField: `data.attributes.${searchField}`,
        additionalField: "",
        indexName
      }
    }
  );

  const jsonApiDocs = compact(
    response.data.hits?.hits?.map(hit => hit.sourceAsMap)
  );

  // Deserialize the responses to Kitsu format.
  const resources = await Promise.all(
    jsonApiDocs.map<Promise<PersistedResource<T>>>(
      async doc => (await deserialise(doc)).data
    )
  );

  return resources;
}