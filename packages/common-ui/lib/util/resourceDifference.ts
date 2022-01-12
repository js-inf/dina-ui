import { InputResource, KitsuResource } from "kitsu";
import { isEqual, transform } from "lodash";

export interface ResourceDifferenceParams<T extends KitsuResource> {
  updated: T;
  original: T;
}

/**
 * Gets the changes from one resource to another for a save
 * operation without including the unchanged fields.
 */
export function resourceDifference<T extends KitsuResource>({
  updated,
  original
}: ResourceDifferenceParams<T>): InputResource<T> {
  return transform<any, InputResource<T>>(updated, (result, value, key) => {
    if (updated[key]?.id === null && !original[key]?.id) {
      return;
    } else if (["type", "id"].includes(key) || !isEqual(value, original[key])) {
      result[key] = value;
    }
  });
}
