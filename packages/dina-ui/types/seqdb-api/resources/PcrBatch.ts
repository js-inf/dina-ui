import { ResourceIdentifierObject } from "jsonapi-typescript";
import { KitsuResource } from "kitsu";
import { Person } from "../../objectstore-api";
import { PcrPrimer } from "./PcrPrimer";
import { Region } from "./Region";

export interface PcrBatchAttributes {
  type: "pcr-batch";
  name: string;
  group?: string;

  createdBy?: string;
  createdOn?: string;

  /** UUID array (from the back-end JSON) or Person array (in the form state). */
  experimenters?: Person[];
}

export interface PcrBatchRelationships {
  primerForward?: PcrPrimer;
  primerReverse?: PcrPrimer;
  region?: Region;
  attachment?: ResourceIdentifierObject[];
}

export type PcrBatch = KitsuResource &
  PcrBatchAttributes &
  PcrBatchRelationships;