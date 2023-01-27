import { DataRow, VocabularySelectField } from "../../../../dina-ui/components";
import { FieldArray } from "formik";
import {
  FieldWrapperProps,
  SelectField,
  TextField,
} from "../../../../common-ui/lib";
import Button from "react-bootstrap/Button";
import { DinaMessage } from "../../../../dina-ui/intl/dina-ui-intl";
import { get } from "lodash";
import { useEffect } from "react";

export interface DataBlockProps extends FieldWrapperProps {
  blockOptions?: any[];
  onBlockSelectChange?: (value, formik) => void;
  vocabularyOptionsPath?: string;
  /** The model type to select resources from. */
  model?: string;
  unitsOptions?: any[];
  blockIndex: number;
  removeBlock?: (index) => void;
  typeOptions?: any[];
  readOnly?: boolean;
  initialValues?: any;
}

export function DataBlock({
  blockOptions,
  onBlockSelectChange,
  vocabularyOptionsPath,
  model,
  unitsOptions,
  blockIndex,
  removeBlock,
  typeOptions,
  readOnly,
  initialValues,
  ...props
}: DataBlockProps) {
  useEffect(() => {
    if (onBlockSelectChange && initialValues?.select) {
      onBlockSelectChange(initialValues.select, undefined);
    }
  }, []);

  return (
    <div>
      <FieldArray name={`${props.name}.rows`}>
        {(fieldArrayProps) => {
          const rows: [] = get(
            fieldArrayProps,
            `form.values.${fieldArrayProps.name}`
          );
          function addRow() {
            fieldArrayProps.push({});
          }

          function removeRow(rowIndex) {
            fieldArrayProps.remove(rowIndex);
          }

          return (
            <div>
              {rows?.length > 0 ? (
                <div
                  className="border"
                  style={{ padding: 15, marginBottom: "2rem" }}
                >
                  <div className="d-inline-flex align-items-center">
                    {blockOptions && (
                      <div style={{ width: "15rem" }}>
                        <SelectField
                          options={blockOptions}
                          name={`${props.name}.select`}
                          removeBottomMargin={true}
                          removeLabel={true}
                          onChange={onBlockSelectChange}
                        />
                      </div>
                    )}
                    {vocabularyOptionsPath && (
                      <VocabularySelectField
                        path={vocabularyOptionsPath}
                        name={`${props.name}.select`}
                        removeLabel={true}
                      />
                    )}
                    {!blockOptions && !vocabularyOptionsPath && (
                      <TextField
                        name={`${props.name}.select`}
                        removeLabel={true}
                      />
                    )}
                  </div>
                  {rows.map((_, rowIndex) => {
                    return (
                      <DataRow
                        showPlusIcon={true}
                        name={`${fieldArrayProps.name}`}
                        key={rowIndex}
                        rowIndex={rowIndex}
                        addRow={addRow}
                        removeRow={removeRow}
                        model={model}
                        unitsOptions={unitsOptions}
                        typeOptions={typeOptions}
                        readOnly={readOnly}
                      />
                    );
                  })}
                  {!readOnly && (
                    <div className="d-flex align-items-center justify-content-between">
                      <Button onClick={() => removeBlock?.(blockIndex)}>
                        <DinaMessage id="deleteButtonText" />
                      </Button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          );
        }}
      </FieldArray>
    </div>
  );
}