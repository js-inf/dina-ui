import {
  useGroupedCheckboxWithLabel,
  TextField,
  DATA_EXPORT_SEARCH_RESULTS_KEY,
  useApiClient,
  LoadingSpinner
} from "..";
import { CustomMenuProps } from "../../../dina-ui/components/collection/material-sample/GenerateLabelDropdownButton";
import { DinaMessage } from "../../../dina-ui/intl/dina-ui-intl";
import React, { useState } from "react";
import Dropdown from "react-bootstrap/Dropdown";
import { useIntl } from "react-intl";
import { startCase } from "lodash";
import { Button } from "react-bootstrap";
import useLocalStorage from "@rehooks/local-storage";

export function ColumnChooser(
  CustomMenu: React.ForwardRefExoticComponent<
    CustomMenuProps & React.RefAttributes<HTMLDivElement>
  >
) {
  return (
    <Dropdown>
      <Dropdown.Toggle>
        <DinaMessage id="selectColumn" />
      </Dropdown.Toggle>
      <Dropdown.Menu as={CustomMenu} />
    </Dropdown>
  );
}

export interface UseColumnChooserProps {
  columns: any[];
  indexName?: string;
  hideExportButton?: boolean;
}

export function useColumnChooser({
  columns,
  indexName,
  hideExportButton = false
}: UseColumnChooserProps) {
  const { formatMessage, messages } = useIntl();
  const columnSearchMapping: any[] = columns.map((column) => {
    const messageKey = `field_${column.id}`;
    const label = messages[messageKey]
      ? formatMessage({ id: messageKey as any })
      : startCase(column.id);
    return { label: label.toLowerCase(), id: column.id };
  });
  const { CustomMenu, checkedColumnIds } = useCustomMenu({
    columns,
    columnSearchMapping,
    indexName,
    hideExportButton
  });
  const columnChooser = ColumnChooser(CustomMenu);
  return { columnChooser, checkedColumnIds };
}

interface UseCustomMenuProps extends UseColumnChooserProps {
  columnSearchMapping: any[];
  hideExportButton: boolean;
}

function useCustomMenu({
  columns,
  columnSearchMapping,
  indexName,
  hideExportButton
}: UseCustomMenuProps) {
  const [searchedColumns, setSearchedColumns] = useState<any[]>(columns);
  const [loading, setLoading] = useState(false);

  const { formatMessage } = useIntl();

  const { groupedCheckBoxes, checkedColumnIds } = useGroupedCheckboxWithLabel({
    resources: searchedColumns,
    isField: true,
    indexName
  });

  const { apiClient } = useApiClient();

  const [queryObject] = useLocalStorage<object>(DATA_EXPORT_SEARCH_RESULTS_KEY);

  if (queryObject) {
    delete (queryObject as any)._source;
  }

  const queryString = JSON.stringify(queryObject)?.replace(/"/g, '"');

  async function exportData() {
    setLoading(true);
    const exportRequestResponse = await apiClient.axios.post(
      "dina-export-api/export-request",
      {
        data: {
          type: "export-request",
          attributes: {
            source: "dina_material_sample_index",
            query: queryString,
            columns: checkedColumnIds
          }
        }
      },
      {
        headers: {
          "Content-Type": "application/vnd.api+json"
        }
      }
    );

    const getFileResponse = await apiClient.axios.get(
      `dina-export-api/file/${exportRequestResponse.data.data.id}?type=DATA_EXPORT`,
      { responseType: "blob" }
    );

    const url = window?.URL.createObjectURL(getFileResponse?.data);
    const link = document?.createElement("a");
    link.href = url ?? "";
    link?.setAttribute("download", `${exportRequestResponse.data.data.id}`);
    document?.body?.appendChild(link);
    link?.click();
    window?.URL?.revokeObjectURL(url ?? "");
    setLoading(false);
  }

  const CustomMenu = React.forwardRef(
    (props: CustomMenuProps, ref: React.Ref<HTMLDivElement>) => {
      if (props.style) {
        props.style.transform = "translate(0px, 40px)";
      }

      return (
        <div
          ref={ref}
          style={{
            ...props.style,
            width: "400px",
            padding: "20px",
            zIndex: 1
          }}
          className={props.className}
          aria-labelledby={props.labelledBy}
        >
          <TextField
            inputProps={{ autoFocus: true }}
            name="filterColumns"
            placeholder="Search"
            onChangeExternal={(_form, _name, value) => {
              if (value === "" || !value) {
                setSearchedColumns(columns);
              } else {
                const searchedColumnsIds = columnSearchMapping
                  .filter((columnMapping) =>
                    columnMapping.label.includes(value?.toLowerCase())
                  )
                  .map((filteredMapping) => filteredMapping.id);
                const filteredColumns = columns.filter((column) =>
                  searchedColumnsIds.includes(column.id)
                );
                setSearchedColumns(filteredColumns);
              }
            }}
          />
          <Dropdown.Divider />
          {groupedCheckBoxes}
          {!hideExportButton && (
            <Button
              disabled={loading}
              className="btn btn-primary mt-2 bulk-edit-button"
              onClick={exportData}
            >
              {loading ? (
                <LoadingSpinner loading={loading} />
              ) : (
                formatMessage({ id: "exportButtonText" })
              )}
            </Button>
          )}
        </div>
      );
    }
  );
  return { CustomMenu, checkedColumnIds };
}