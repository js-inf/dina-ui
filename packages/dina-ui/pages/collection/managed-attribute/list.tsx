import { ButtonBar, ColumnDefinition, ListPageLayout } from "common-ui";
import { CommonMessage } from "common-ui/lib/intl/common-ui-intl";
import Link from "next/link";
import { Footer, Head, Nav } from "../../../components";
import { DINAUI_MESSAGES_ENGLISH } from "../../../intl/dina-ui-en";
import { DinaMessage } from "../../../intl/dina-ui-intl";
import {
  ManagedAttribute,
  MANAGED_ATTRIBUTE_TYPE_OPTIONS
} from "../../../types/collection-api/resources/ManagedAttribute";

const ATTRIBUTES_LIST_COLUMNS: ColumnDefinition<ManagedAttribute>[] = [
  {
    Cell: ({ original: { id, name } }) => (
      <Link href={`/collection/managed-attribute/edit?id=${id}`}>
        <a>{name}</a>
      </Link>
    ),
    Header: "Name",
    accessor: "name"
  },
  "createdBy",
  {
    Cell: ({ original: { acceptedValues, managedAttributeType } }) => {
      const labelKey:
        | keyof typeof DINAUI_MESSAGES_ENGLISH
        | undefined = acceptedValues?.length
        ? "field_managedAttributeType_picklist_label"
        : MANAGED_ATTRIBUTE_TYPE_OPTIONS.find(
            option => option.value === managedAttributeType
          )?.labelKey;

      return <div>{labelKey && <DinaMessage id={labelKey} />}</div>;
    },
    accessor: "managedAttributeType",
    // The API sorts alphabetically by key, not displayed intl-ized value,
    // so the displayed order wouldn't make sense.
    sortable: false
  },
  {
    Cell: ({ original: { acceptedValues } }) => (
      <div>{acceptedValues?.map(val => `"${val}"`)?.join(", ")}</div>
    ),
    accessor: "acceptedValues"
  }
];

const ATTRIBUTES_FILTER_ATTRIBUTES = ["name"];

export default function ManagedAttributesListPage() {
  return (
    <div>
      <Head title="Managed Attributes" />
      <Nav />
      <main className="container-fluid">
        <h1>
          <DinaMessage id="collectionManagedAttributeListTitle" />
        </h1>
        <ButtonBar>
          <Link href="/collection/managed-attribute/edit">
            <a className="btn btn-primary">
              <CommonMessage id="createNew" />
            </a>
          </Link>
        </ButtonBar>
        <ListPageLayout
          filterAttributes={ATTRIBUTES_FILTER_ATTRIBUTES}
          id="collection-module-managed-attribute-list"
          queryTableProps={{
            columns: ATTRIBUTES_LIST_COLUMNS,
            path: "collection-api/managed-attribute"
          }}
        />
      </main>
      <Footer />
    </div>
  );
}