import {
  ButtonBar,
  ColumnDefinition,
  dateCell,
  FilterAttribute,
  ListPageLayout
} from "common-ui";
import Link from "next/link";
import { Footer, GroupSelectField, Head, Nav } from "../../../components";
import { SeqdbMessage, useSeqdbIntl } from "../../../intl/seqdb-intl";
import { PcrBatch } from "../../../types/seqdb-api";

const TABLE_COLUMNS: ColumnDefinition<PcrBatch>[] = [
  {
    cell: ({
      row: {
        original: { id, name }
      }
    }) => (
      <Link href={`/seqdb/pcr-workflow/run?pcrBatchId=${id}`}>
        {name || id}
      </Link>
    ),
    accessorKey: "name",
    header: () => <SeqdbMessage id="pcrBatchName" />
  },
  "group",
  "primerForward.name",
  "primerReverse.name",
  "createdBy",
  dateCell("createdOn")
];

const FILTER_ATTRIBUTES: FilterAttribute[] = [
  "name",
  "primerForward.name",
  "primerReverse.name",
  {
    name: "createdOn",
    type: "DATE"
  },
  "createdBy"
];

export default function PCRWorkflowListPage() {
  const { formatMessage } = useSeqdbIntl();

  return (
    <div>
      <Head title={formatMessage("pcrWorkflowListTitle")} />
      <Nav />
      <main className="container-fluid">
        <h1 id="wb-cont">{formatMessage("pcrWorkflowListTitle")}</h1>
        <ButtonBar>
          <Link href={`/seqdb/pcr-workflow/run`}>
            <a className="btn btn-primary">
              <SeqdbMessage id="startNewWorkflow" />
            </a>
          </Link>
        </ButtonBar>
        <ListPageLayout
          additionalFilters={(filterForm) => ({
            isCompleted: false,
            // Apply group filter:
            ...(filterForm.group && { rsql: `group==${filterForm.group}` })
          })}
          filterAttributes={FILTER_ATTRIBUTES}
          id="pcr-workflow-list"
          queryTableProps={{
            columns: TABLE_COLUMNS,
            path: "seqdb-api/pcr-batch",
            include: "primerForward,primerReverse"
          }}
          filterFormchildren={({ submitForm }) => (
            <div className="mb-3">
              <div style={{ width: "300px" }}>
                <GroupSelectField
                  onChange={() => setImmediate(submitForm)}
                  name="group"
                  showAnyOption={true}
                />
              </div>
            </div>
          )}
        />
      </main>
      <Footer />
    </div>
  );
}
