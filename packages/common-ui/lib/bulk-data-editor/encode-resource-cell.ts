import { KitsuResource } from "kitsu";

/** Matches the {type}/{id} e.g. "person/1111" from "Mat (person/1111)". */
export const ENCODED_RESOURCE_TYPE_ID_MATCHER = /(\()[^()]*(?=\)$)/;

/** Matches the name e.g. "Mat" from "Mat (person/1111)". */
export const ENCODED_RESOURCE_NAME_MATCHER = /^(.*)\s\(.*\)$/;

export interface EncodeResourceCellParams {
  label?: string;
  type?: string;
}

/**
 * Encode a resource as a string identifier to be put into a cell.
 */
export function encodeResourceCell<T extends KitsuResource>(
  resource: T | null | undefined,
  { label = "", type }: EncodeResourceCellParams
): string {
  if (!resource) {
    return "";
  }
  return `${label} (${type || resource.type}/${resource.id})`;
}

/**
 * Decode the resource reference from a cell value.
 *
 * Example input: Mat (agent/f5f77025-592a-4c43-a4a7-863978bf203a)
 * Example input: Mat (agent/1234)
 */
export function decodeResourceCell(
  cellValue: string
): Required<KitsuResource> | { id: null } {
  // Get the {type}/{id} identifier from the end of the string if it exists.
  const identifier =
    ENCODED_RESOURCE_TYPE_ID_MATCHER.exec(cellValue)?.[0].substr(1);

  if (identifier) {
    const [type, id] = identifier.split("/");
    return { id, type };
  }

  return { id: null };
}
