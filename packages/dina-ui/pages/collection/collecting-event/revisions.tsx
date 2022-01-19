import { COLLECTION_REVISION_ROW_CONFIG } from "../../../components/revisions/revision-modules";
import { RevisionsPage } from "../../../components/revisions/RevisionsPageLayout";

export default () => (
  <RevisionsPage
    auditSnapshotPath="collection-api/audit-snapshot"
    detailsPageLink="/collection/collecting-event/view?id="
    queryPath="collection-api/collecting-event"
    resourceType="collecting-event"
    revisionRowConfigsByType={COLLECTION_REVISION_ROW_CONFIG}
    nameField="dwcRecordedBy"
  />
);
