import { useQuery, withResponse } from "common-ui";
import { PersistedResource } from "kitsu";
import { useRouter } from "next/router";
import {
  Head,
  Nav,
  storageUnitDisplayName,
  StorageUnitForm
} from "../../../components";
import { DinaMessage, useDinaIntl } from "../../../intl/dina-ui-intl";
import { StorageUnit } from "../../../types/collection-api";

export function useStorageUnit(id?: string) {
  return useQuery<StorageUnit>(
    {
      path: `collection-api/storage-unit/${id}`,
      include: "storageUnitType,parentStorageUnit"
    },
    {
      disabled: !id,
      // parentStorageUnit must be fetched separately to include its hierarchy:
      joinSpecs: [
        {
          apiBaseUrl: "/collection-api",
          idField: "parentStorageUnit.id",
          joinField: "parentStorageUnit",
          path: storageUnit =>
            `storage-unit/${storageUnit.parentStorageUnit?.id}?include=hierarchy`
        }
      ]
    }
  );
}

export default function StorageUnitEditPage() {
  const router = useRouter();
  const { formatMessage } = useDinaIntl();
  const id = router.query.id?.toString();
  const parentId = router.query.parentId?.toString();

  const storageUnitQuery = useStorageUnit(id);

  const initialParentStorageUnitQuery = useStorageUnit(parentId);

  const title = id ? "editStorageUnitTitle" : "addStorageUnitTitle";

  async function goToViewPage(resource: PersistedResource<StorageUnit>) {
    await router.push(`/collection/storage-unit/view?id=${resource.id}`);
  }

  return (
    <div>
      <Head title={formatMessage(title)}
						lang={formatMessage("languageOfPage")}
						creator={formatMessage("agricultureCanada")}
						subject={formatMessage("subjectTermsForPage")} />
			<Nav />
      <div className="container">
        <h1 id="wb-cont">
          <DinaMessage id={title} />
        </h1>
        {id ? (
          withResponse(storageUnitQuery, ({ data }) => (
            <>
              <Head title={storageUnitDisplayName(data)} />
              <StorageUnitForm storageUnit={data} onSaved={goToViewPage} />
            </>
          ))
        ) : parentId ? (
          withResponse(
            initialParentStorageUnitQuery,
            ({ data: initialParent }) => (
              <StorageUnitForm
                initialParent={initialParent}
                onSaved={goToViewPage}
              />
            )
          )
        ) : (
          <StorageUnitForm onSaved={goToViewPage} />
        )}
      </div>
    </div>
  );
}