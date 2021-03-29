import { ResourceIdentifierObject } from "jsonapi-typescript";
import { KitsuResource } from "kitsu";
import { GeographicPlaceNameSourceDetail } from "../GeographicPlaceNameSourceDetail";
import { CollectorGroup } from "./CollectorGroup";
import { GeoReferenceAssertion } from "./GeoReferenceAssertion";

export interface CollectingEventAttributes {
  uuid: string;
  attachment?: ResourceIdentifierObject[];
  startEventDateTime: string;
  endEventDateTime?: string;
  dwcRecordedBy?: string;
  verbatimEventDateTime?: string;

  dwcVerbatimLocality?: string;
  dwcVerbatimLatitude?: string;
  dwcVerbatimLongitude?: string;
  dwcVerbatimCoordinates?: string;
  dwcVerbatimCoordinateSystem?: string;
  dwcVerbatimSRS?: string;
  dwcVerbatimElevation?: string;
  dwcVerbatimDepth?: string;
  dwcOtherRecordNumbers?: string[];
  dwcRecordNumber?: string;

  dwcCountry?: string;
  dwcCountryCode?: string;
  dwcStateProvince?: string;
  dwcMunicipality?: string;

  createdBy?: string;
  createdOn?: string;
  collectorGroupUuid?: string;
  collectorGroups?: CollectorGroup[];
  group: string;
  geographicPlaceName?: string;
  dwcGeoreferenceVerificationStatus?: string;
  geographicPlaceNameSourceDetail? : GeographicPlaceNameSourceDetail;
  geographicPlaceNameSource?: GeographicPlaceNameSource;
}

export type GeoreferenceVerificationStatus =
  "GEOREFERENCING_NOT_POSSIBLE"


export enum GeographicPlaceNameSource {
    OSM = "OSM"
}

export interface CollectingEventRelationships {
  collectors?: KitsuResource[];
  geoReferenceAssertions?: GeoReferenceAssertion[];
}

export type CollectingEvent = KitsuResource &
  CollectingEventAttributes &
  CollectingEventRelationships;
