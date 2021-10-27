import {
  ButtonBar,
  ColumnDefinition,
  DinaForm,
  filterBy,
  FormikButton,
  MetaWithTotal,
  QueryTable,
  SubmitButton,
  useAccount,
  useApiClient,
  useGroupedCheckBoxes,
  useQuery,
  withResponse
} from "common-ui";
import { Field, FormikContextType } from "formik";
import { InputResource, KitsuResourceLink, KitsuResponse } from "kitsu";
import { pick, toPairs } from "lodash";
import Link from "next/link";
import { useState } from "react";
import { FiChevronsLeft, FiChevronsRight } from "react-icons/fi";
import { SeqdbMessage } from "../../../intl/seqdb-intl";
import { PcrBatch, PcrBatchItem } from "../../../types/seqdb-api";

export interface SangerSampleSelectionStepProps {
  pcrBatchId: string;
}

export function SangerSampleSelectionStep({
  pcrBatchId
}: SangerSampleSelectionStepProps) {
  const pcrBatchItemQuery = usePcrBatchItemQuery(
    pcrBatchId,
    // Default to edit mode when there are no items selected:
    async ({ meta: { totalResourceCount } }) => setEditMode(!totalResourceCount)
  );

  const [editMode, setEditMode] = useState(false);

  const [searchValue, setSearchValue] = useState("");

  const {
    CheckBoxHeader: SampleSelectCheckBoxHeader,
    CheckBoxField: SampleSelectCheckBox,
    setAvailableItems: setAvailableSamples
  } = useGroupedCheckBoxes({
    fieldName: "sampleIdsToSelect"
  });

  const {
    CheckBoxHeader: SampleDeselectCheckBoxHeader,
    CheckBoxField: SampleDeselectCheckBox,
    setAvailableItems: setRemoveablePcrBatchItems
  } = useGroupedCheckBoxes({
    fieldName: "pcrBatchItemIdsToDelete"
  });

  const SELECTABLE_SAMPLE_COLUMNS: ColumnDefinition<any>[] = [
    {
      Cell: ({ original: { id, name } }) => (
        <Link href={`/seqdb/molecular-sample/view?id=${id}`}>{name}</Link>
      ),
      accessor: "name",
      sortable: false
    },
    {
      Cell: ({ original: molecularSample }) => (
        <div key={molecularSample.id}>
          <SampleSelectCheckBox resource={molecularSample} />
        </div>
      ),
      Header: SampleSelectCheckBoxHeader,
      sortable: false
    }
  ];

  const PCRBATCH_ITEM_COLUMNS: ColumnDefinition<any>[] = [
    {
      Cell: ({ original: pcrBatchItem }) => (
        <Link
          href={`/seqdb/molecular-sample/view?id=${pcrBatchItem?.sample?.id}`}
        >
          {pcrBatchItem?.sample?.name}
        </Link>
      ),
      accessor: "sample.name",
      sortable: false
    },
    ...(editMode
      ? [
          {
            Cell: ({ original: pcrBatchItem }) => (
              <div key={pcrBatchItem.id}>
                <SampleDeselectCheckBox resource={pcrBatchItem} />
              </div>
            ),
            Header: SampleDeselectCheckBoxHeader,
            sortable: false
          }
        ]
      : [])
  ];

  const { deleteAllCheckedPcrBatchItems, lastSave, selectAllCheckedSamples } =
    useSangerSampleSelection(pcrBatchId);

  const selectedItemsTable = (
    <div>
      <ButtonBar>
        <button
          className="btn btn-primary edit-button"
          type="button"
          onClick={() => setEditMode(true)}
          style={{ width: "10rem" }}
        >
          <SeqdbMessage id="editButtonText" />
        </button>
      </ButtonBar>
      <strong>
        <SeqdbMessage id="selectedSamplesTitle" />
      </strong>
      <QueryTable
        columns={PCRBATCH_ITEM_COLUMNS}
        defaultPageSize={100}
        filter={filterBy([], {
          extraFilters: [
            {
              selector: "pcrBatch.uuid",
              comparison: "==",
              arguments: pcrBatchId
            }
          ]
        })("")}
        defaultSort={[{ id: "sample.name", desc: false }]}
        reactTableProps={{ sortable: false }}
        onSuccess={response => setRemoveablePcrBatchItems(response.data)}
        path="seqdb-api/pcr-batch-item"
        include="sample"
        deps={[lastSave]}
      />
    </div>
  );

  const buttonBar = (
    <ButtonBar>
      <button
        className="btn btn-primary"
        type="button"
        onClick={() => setEditMode(false)}
        style={{ width: "10rem" }}
      >
        <SeqdbMessage id="done" />
      </button>
    </ButtonBar>
  );

  return withResponse(pcrBatchItemQuery, () =>
    editMode ? (
      <div>
        {buttonBar}
        <div className="alert alert-warning d-inline-block">
          <SeqdbMessage id="sampleSelectionInstructions" />
        </div>
        <div className="mb-3">
          <DinaForm
            initialValues={{ inputValue: "" }}
            onSubmit={({ submittedValues: { inputValue } }) =>
              setSearchValue(inputValue)
            }
          >
            <div className="input-group" style={{ width: "30rem" }}>
              <Field
                autoComplete="off"
                name="inputValue"
                className="form-control"
              />
              <SubmitButton className="btn btn-primary">
                <SeqdbMessage id="search" />
              </SubmitButton>
              <FormikButton
                className="btn btn-dark"
                onClick={(_, form) => {
                  form.resetForm();
                  form.submitForm();
                }}
              >
                <SeqdbMessage id="resetButtonText" />
              </FormikButton>
            </div>
          </DinaForm>
        </div>
        <div className="mb-3">
          <DinaForm
            initialValues={{
              sampleIdsToSelect: {},
              pcrBatchItemIdsToDelete: {}
            }}
          >
            <div className="row">
              <div className="col-5 available-samples">
                <strong>
                  <SeqdbMessage id="availableSamplesTitle" />
                </strong>
                <QueryTable
                  columns={SELECTABLE_SAMPLE_COLUMNS}
                  defaultPageSize={100}
                  filter={
                    searchValue ? filterBy(["name"])(searchValue) : undefined
                  }
                  defaultSort={[{ id: "name", desc: false }]}
                  reactTableProps={{ sortable: false }}
                  onSuccess={response => setAvailableSamples(response.data)}
                  path="seqdb-api/molecular-sample"
                />
              </div>
              <div className="col-2" style={{ marginTop: "100px" }}>
                <div>
                  <FormikButton
                    className="btn btn-primary w-100 mb-5 select-all-checked-button"
                    onClick={selectAllCheckedSamples}
                  >
                    <FiChevronsRight />
                  </FormikButton>
                </div>
                <div>
                  <FormikButton
                    className="btn btn-dark w-100 mb-5 deselect-all-checked-button"
                    onClick={deleteAllCheckedPcrBatchItems}
                  >
                    <FiChevronsLeft />
                  </FormikButton>
                </div>
              </div>
              <div className="col-5 selected-samples">{selectedItemsTable}</div>
            </div>
          </DinaForm>
        </div>
        {buttonBar}
      </div>
    ) : (
      selectedItemsTable
    )
  );
}

export function useSangerSampleSelection(pcrBatchId: string) {
  const { apiClient, save } = useApiClient();
  const { username } = useAccount();

  // Keep track of the last save operation, so the data is re-fetched immediately after saving.
  const [lastSave, setLastSave] = useState<number>();

  async function selectSamples(sampleLinks: KitsuResourceLink[]) {
    const { data: pcrBatch } = await apiClient.get<PcrBatch>(
      `seqdb-api/pcr-batch/${pcrBatchId}`,
      {}
    );

    const newPcrBatchItems = sampleLinks.map<InputResource<PcrBatchItem>>(
      sampleLink => ({
        sample: sampleLink,
        pcrBatch: pick(pcrBatch, "id", "type"),
        group: pcrBatch.group,
        createdBy: username,
        type: "pcr-batch-item"
      })
    );

    await save(
      newPcrBatchItems.map(item => ({
        resource: item,
        type: "pcr-batch-item"
      })),
      { apiBaseUrl: "/seqdb-api" }
    );

    setLastSave(Date.now());
  }

  async function selectAllCheckedSamples(
    formValues,
    formik: FormikContextType<any>
  ) {
    const { sampleIdsToSelect } = formValues;
    const ids = toPairs(sampleIdsToSelect)
      .filter(pair => pair[1])
      .map(pair => pair[0]);

    const samples = ids.map(id => ({
      id,
      type: "molecular-sample"
    }));

    await selectSamples(samples);

    formik.setFieldValue("sampleIdsToSelect", {});
  }

  async function deletePcrBatchItems(pcrBatchItems: KitsuResourceLink[]) {
    await save(
      pcrBatchItems.map(item => ({ delete: item })),
      { apiBaseUrl: "/seqdb-api" }
    );

    setLastSave(Date.now());
  }

  async function deleteAllCheckedPcrBatchItems(
    formValues,
    formik: FormikContextType<any>
  ) {
    const { pcrBatchItemIdsToDelete } = formValues;

    const ids = toPairs(pcrBatchItemIdsToDelete)
      .filter(pair => pair[1])
      .map(pair => pair[0]);

    const pcrBatchItems = ids.map<KitsuResourceLink>(id => ({
      id,
      type: "pcr-batch-item"
    }));

    await deletePcrBatchItems(pcrBatchItems);

    formik.setFieldValue("pcrBatchItemIdsToDelete", {});
  }

  return {
    selectAllCheckedSamples,
    deleteAllCheckedPcrBatchItems,
    lastSave
  };
}

export function usePcrBatchItemQuery(
  pcrBatchId: string,
  onSuccess:
    | ((response: KitsuResponse<PcrBatchItem, MetaWithTotal>) => void)
    | undefined
) {
  return useQuery<PcrBatchItem, MetaWithTotal>(
    {
      path: "seqdb-api/pcr-batch-item",
      filter: filterBy([], {
        extraFilters: [
          {
            selector: "pcrBatch.uuid",
            comparison: "==",
            arguments: pcrBatchId
          }
        ]
      })("")
    },
    { onSuccess }
  );
}