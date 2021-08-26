import { KitsuResource } from "kitsu";
import { MultilingualDescription } from "./PreparationType";

export interface CollectionMethodAttributes {
  type: "collection-method";
  name: string;
  createdBy?: string;
  createdOn?: string;
  group?: string;
  multilingualDescription?: MultilingualDescription;
}

export type CollectionMethod = KitsuResource & CollectionMethodAttributes;
