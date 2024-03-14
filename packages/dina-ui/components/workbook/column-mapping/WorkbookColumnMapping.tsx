import {
  AreYouSureModal,
  FieldWrapper,
  RsqlFilterObject,
  SubmitButton,
  filterBy,
  useAccount,
  useApiClient,
  useModal,
  useQuery
} from "common-ui/lib";
import { DinaForm } from "common-ui/lib/formik-connected/DinaForm";
import { FieldArray, FormikProps } from "formik";
import { chain, startCase } from "lodash";
import {
  ManagedAttribute,
  MaterialSample
} from "packages/dina-ui/types/collection-api";
import { Ref, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "react-bootstrap";
import Select from "react-select";
import * as yup from "yup";
import { ValidationError } from "yup";
import {
  WorkbookColumnMap,
  WorkbookDataTypeEnum,
  useWorkbookContext
} from "..";
import { DinaMessage, useDinaIntl } from "../../../intl/dina-ui-intl";
import { WorkbookDisplay } from "../WorkbookDisplay";
import { RelationshipFieldMapping } from "../relationship-mapping/RelationshipFieldMapping";
import FieldMappingConfig from "../utils/FieldMappingConfig";
import { useWorkbookConverter } from "../utils/useWorkbookConverter";
import {
  findMatchField,
  getColumnHeaders,
  getDataFromWorkbook,
  isBoolean,
  isBooleanArray,
  isNumber,
  isNumberArray
} from "../utils/workbookMappingUtils";
import { ColumnMappingRow } from "./ColumnMappingRow";

export type FieldMapType = {
  targetField: string | undefined;
  targetKey?: ManagedAttribute; // When targetField is managedAttribute, targetKey stores the key of the managed attribute
  skipped: boolean;
};

export interface WorkbookColumnMappingFields {
  sheet: number;
  type: string;
  fieldMap: FieldMapType[];
  mapRelationships: boolean[];
  group: string;
}

export interface WorkbookColumnMappingProps {
  performSave: boolean;
  setPerformSave: (newValue: boolean) => void;
}

const ENTITY_TYPES = ["material-sample"] as const;

export function WorkbookColumnMapping({
  performSave,
  setPerformSave
}: WorkbookColumnMappingProps) {
  const { apiClient } = useApiClient();
  const { openModal } = useModal();
  const {
    startSavingWorkbook,
    spreadsheetData,
    setColumnMap,
    workbookColumnMap,
    columnUniqueValues,
    managedAttributes
  } = useWorkbookContext();
  const formRef: Ref<FormikProps<Partial<WorkbookColumnMappingFields>>> =
    useRef(null);
  const { formatMessage } = useDinaIntl();
  const { groupNames } = useAccount();
  const entityTypes = ENTITY_TYPES.map((entityType) => ({
    label: formatMessage(entityType),
    value: entityType
  }));
  const [sheet, setSheet] = useState<number>(0);
  const [selectedType, setSelectedType] = useState<{
    label: string;
    value: string;
  } | null>(entityTypes[0]);
  const [fieldMap, setFieldMap] = useState<FieldMapType[]>([]);

  const {
    convertWorkbook,
    flattenedConfig,
    getPathOfField,
    getFieldRelationshipConfig,
    FIELD_TO_VOCAB_ELEMS_MAP
  } = useWorkbookConverter(
    FieldMappingConfig,
    selectedType?.value || "material-sample"
  );

  const buttonBar = (
    <>
      <SubmitButton
        className="hidden"
        performSave={performSave}
        setPerformSave={setPerformSave}
      />
    </>
  );

  // Retrieve a string array of the headers from the uploaded spreadsheet.
  const headers = useMemo(() => {
    return getColumnHeaders(spreadsheetData, sheet);
  }, [sheet]);

  // Generate sheet dropdown options
  const sheetOptions = useMemo(() => {
    if (spreadsheetData) {
      return Object.entries(spreadsheetData).map(([sheetNumberString, _]) => {
        const sheetNumber = +sheetNumberString;
        // This label is hardcoded for now, it will eventually be replaced with the sheet name in a
        // future ticket.
        return { label: "Sheet " + (sheetNumber + 1), value: sheetNumber };
      });
    } else {
      return [];
    }
  }, [spreadsheetData]);

  // Generate field options
  const fieldOptions = useMemo(() => {
    if (!!selectedType) {
      const nonNestedRowOptions: { label: string; value: string }[] = [];
      const nestedRowOptions: {
        label: string;
        value: string;
        parentPath: string;
      }[] = [];
      // const newFieldOptions: { label: string; value: string }[] = [];
      Object.keys(flattenedConfig).forEach((fieldPath) => {
        if (fieldPath === "relationshipConfig") {
          return;
        }
        const config = flattenedConfig[fieldPath];
        if (
          config.dataType !== WorkbookDataTypeEnum.OBJECT &&
          config.dataType !== WorkbookDataTypeEnum.OBJECT_ARRAY
        ) {
          // Handle creating options for nested path for dropdown component
          if (fieldPath.includes(".")) {
            const lastIndex = fieldPath.lastIndexOf(".");
            const parentPath = fieldPath.substring(0, lastIndex);
            const labelPath = fieldPath.substring(lastIndex + 1);
            const label =
              formatMessage(fieldPath as any)?.trim() ||
              formatMessage(`field_${labelPath}` as any)?.trim() ||
              formatMessage(labelPath as any)?.trim() ||
              startCase(labelPath);
            const option = {
              label,
              value: fieldPath,
              parentPath
            };
            nestedRowOptions.push(option);
          } else {
            // Handle creating options for non nested path for dropdown component
            const label =
              formatMessage(`field_${fieldPath}` as any)?.trim() ||
              formatMessage(fieldPath as any)?.trim() ||
              startCase(fieldPath);
            const option = {
              label,
              value: fieldPath
            };
            nonNestedRowOptions.push(option);
          }
        }
      });
      nonNestedRowOptions.sort((a, b) => a.label.localeCompare(b.label));

      // Using the parent name, group the relationships into sections.
      const groupedNestRowOptions = chain(nestedRowOptions)
        .groupBy((prop) => prop.parentPath)
        .map((group, key) => {
          const keyArr = key.split(".");
          let label: string | undefined;
          for (let i = 0; i < keyArr.length; i++) {
            const k = keyArr[i];
            label =
              label === undefined
                ? formatMessage(k as any).trim() || k.toUpperCase()
                : label + (formatMessage(k as any).trim() || k.toUpperCase());
            if (i < keyArr.length - 1) {
              label = label + ".";
            }
          }

          return {
            label: label!,
            options: group
          };
        })
        .sort((a, b) => a.label.localeCompare(b.label))
        .value();

      const newOptions = nonNestedRowOptions
        ? [...nonNestedRowOptions, ...groupedNestRowOptions]
        : [];
      const map: FieldMapType[] = [];
      for (const columnHeader of headers || []) {
        const fieldPath = findMatchField(columnHeader, newOptions);
        if (fieldPath === undefined) {
          const targetManagedAttr = managedAttributes.find(
            (item) =>
              item.name.toLowerCase().trim() ===
              columnHeader.toLowerCase().trim()
          );
          if (targetManagedAttr) {
            map.push({
              targetField: "managedAttributes",
              skipped: false,
              targetKey: targetManagedAttr
            });
          } else {
            map.push({ targetField: fieldPath, skipped: fieldPath === undefined });
          }
        } else {
          map.push({
            targetField: fieldPath,
            skipped: fieldPath === undefined
          });
        }
      }
      setFieldMap(map);
      return newOptions;
    } else {
      return [];
    }
  }, [selectedType]);

  /**
   * Resolve parentMaterialSample value mapping.
   * @param columnHeader the column header of parent material sample in the spreadsheet
   * @param fieldPath the mapped field path
   * @returns
   */
  async function resolveParentMapping(
    columnHeader: string,
    fieldPath: string
  ): Promise<{
    [value: string]: {
      id: string;
      type: string;
    };
  }> {
    const { type, baseApiPath } = getFieldRelationshipConfig();
    const lastDotPos = fieldPath.lastIndexOf(".");
    const fieldName = fieldPath.substring(lastDotPos + 1);
    const valueMapping: {
      [value: string]: {
        id: string;
        type: string;
      };
    } = {};
    if (spreadsheetData) {
      const spreadsheetHeaders = spreadsheetData[sheet][0].content;
      const colIndex = spreadsheetHeaders.indexOf(columnHeader) ?? -1;
      if (colIndex > -1) {
        for (let i = 1; i < spreadsheetData[sheet].length; i++) {
          const parentValue = spreadsheetData[sheet][i].content[colIndex];
          if (parentValue) {
            const response = await apiClient.get<MaterialSample[]>(
              `${baseApiPath}/${type}?filter[${fieldName}]=${parentValue}`,
              {
                page: { limit: 1 }
              }
            );
            if (response && response.data.length > 0) {
              valueMapping[parentValue] = { id: response.data[0].id, type };
            }
          }
        }
      }
    }
    return valueMapping;
  }

  useEffect(() => {
    async function initColumnMap() {
      // Calculate the workbook column mapping based on the name of the spreadsheet column header name
      const newWorkbookColumnMap: WorkbookColumnMap = {};
      for (const columnHeader of headers || []) {
        const fieldPath = findMatchField(columnHeader, fieldOptions);
        if (fieldPath === undefined || fieldPath === "managedAttributes") {
          const targetManagedAttr = managedAttributes.find(
            (item) =>
              item.name.toLowerCase().trim() ===
              columnHeader.toLowerCase().trim()
          );
          if (targetManagedAttr) {
            newWorkbookColumnMap[columnHeader] = {
              fieldPath: "managedAttributes",
              showOnUI: true,
              mapRelationship: false,
              numOfUniqueValues: Object.keys(
                columnUniqueValues?.[sheet]?.[columnHeader] ?? {}
              ).length,
              valueMapping: {
                columnHeader: {
                  id: targetManagedAttr.id,
                  type: targetManagedAttr.type
                }
              }
            };
          } else {
            newWorkbookColumnMap[columnHeader] = {
              fieldPath,
              showOnUI: true,
              mapRelationship: false,
              numOfUniqueValues: Object.keys(
                columnUniqueValues?.[sheet]?.[columnHeader] ?? {}
              ).length,
              valueMapping: {}
            };
          }
        } else if (fieldPath?.startsWith("parentMaterialSample.")) {
          const valueMapping = await resolveParentMapping(
            columnHeader,
            fieldPath
          );
          newWorkbookColumnMap[columnHeader] = {
            fieldPath,
            showOnUI: false,
            mapRelationship: true,
            numOfUniqueValues: 1,
            valueMapping
          };
        } else {
          newWorkbookColumnMap[columnHeader] = {
            fieldPath,
            showOnUI: true,
            mapRelationship: false,
            numOfUniqueValues: Object.keys(
              columnUniqueValues?.[sheet]?.[columnHeader] ?? {}
            ).length,
            valueMapping: {}
          };
        }
      }
      setColumnMap(newWorkbookColumnMap);
      // End of workbook column mapping calculation
    }
    initColumnMap();
  }, [selectedType]);

  // Generate the currently selected value
  const sheetValue = sheetOptions[sheet];

  async function onSubmit({ submittedValues }) {
    if (submittedValues.fieldMap.filter((item) => item.skipped).length > 0) {
      // Ask the user if they sure they want to delete the saved search.
      openModal(
        <AreYouSureModal
          actionMessage={<DinaMessage id="proceedWithSkippedColumn" />}
          messageBody={
            <DinaMessage id="areYouSureImportWorkbookWithSkippedColumns" />
          }
          onYesButtonClicked={() => {
            importWorkbook(submittedValues);
          }}
        />
      );
    } else {
      importWorkbook(submittedValues);
    }
  }

  async function importWorkbook(submittedValues: any) {
    const workbookData = getDataFromWorkbook(
      spreadsheetData,
      sheet,
      submittedValues.fieldMap
    );
    const { type, baseApiPath } = getFieldRelationshipConfig();
    const resources = convertWorkbook(workbookData, submittedValues.group);
    if (resources?.length > 0) {
      await startSavingWorkbook(
        resources,
        workbookColumnMap,
        submittedValues.group,
        type,
        baseApiPath
      );
    }
  }

  const workbookColumnMappingFormSchema = yup.object({
    fieldMap: yup.array().test({
      name: "validateFieldMapping",
      exclusive: false,
      test: (fieldMaps: FieldMapType[]) => {
        const errors: ValidationError[] = [];
        for (let i = 0; i < fieldMaps.length; i++) {
          const fieldMapType = fieldMaps[i];
          if (!!fieldMapType && fieldMapType.skipped === false) {
            // validate if there are duplicate mapping
            if (
              fieldMapType.targetField !== undefined &&
              fieldMaps.filter(
                (item) =>
                  item.skipped === false &&
                  item.targetField + (item.targetKey?.name ?? "") ===
                    fieldMapType.targetField +
                      (fieldMapType.targetKey?.name ?? "")
              ).length > 1
            ) {
              errors.push(
                new ValidationError(
                  formatMessage("workBookDuplicateFieldMap"),
                  fieldMapType.targetField,
                  `fieldMap[${i}].targetField`
                )
              );
            }
            // validate if any managed attributes targetKey not set
            if (
              fieldMapType.skipped === false &&
              fieldMapType.targetField !== undefined &&
              flattenedConfig[fieldMapType.targetField].dataType ===
                WorkbookDataTypeEnum.MANAGED_ATTRIBUTES &&
              !fieldMapType.targetKey
            ) {
              errors.push(
                new ValidationError(
                  formatMessage(
                    "workBookManagedAttributeKeysTargetKeyIsRequired"
                  ),
                  fieldMapType.targetField,
                  `fieldMap[${i}].targetKey`
                )
              );
            }
            // validate if any mappings are not set and not skipped
            if (
              fieldMapType.targetField === undefined &&
              fieldMapType.skipped === false
            ) {
              errors.push(
                new ValidationError(
                  formatMessage("workBookSkippedField"),
                  fieldMapType.targetField,
                  `fieldMap[${i}].targetField`
                )
              );
            }
          }
        }
        if (errors.length > 0) {
          return new ValidationError(errors);
        }
        const data = getDataFromWorkbook(
          spreadsheetData,
          sheet,
          fieldMaps,
          true
        );
        validateData(data, errors);
        if (errors.length > 0) {
          return new ValidationError(errors);
        }
        return true;
      }
    })
  });

  function validateData(
    workbookData: { [field: string]: any }[],
    errors: ValidationError[]
  ) {
    if (!!selectedType?.value) {
      for (let i = 0; i < workbookData.length; i++) {
        const row = workbookData[i];
        for (const fieldPath of Object.keys(row)) {
          if (fieldPath === "rowNumber") {
            continue;
          }
          const param: {
            sheet: number;
            index: number;
            field: string;
            dataType?: WorkbookDataTypeEnum;
          } = {
            sheet: sheet + 1,
            index: row.rowNumber + 1,
            field: fieldPath
          };
          if (!!row[fieldPath]) {
            switch (flattenedConfig[fieldPath]?.dataType) {
              case WorkbookDataTypeEnum.BOOLEAN:
                if (!isBoolean(row[fieldPath])) {
                  param.dataType = WorkbookDataTypeEnum.BOOLEAN;
                  errors.push(
                    new ValidationError(
                      formatMessage("workBookInvalidDataFormat", param),
                      fieldPath,
                      "sheet"
                    )
                  );
                }
                break;
              case WorkbookDataTypeEnum.NUMBER:
                if (!isNumber(row[fieldPath])) {
                  param.dataType = WorkbookDataTypeEnum.NUMBER;
                  errors.push(
                    new ValidationError(
                      formatMessage("workBookInvalidDataFormat", param),
                      fieldPath,
                      "sheet"
                    )
                  );
                }
                break;
              case WorkbookDataTypeEnum.NUMBER_ARRAY:
                if (!isNumberArray(row[fieldPath])) {
                  param.dataType = WorkbookDataTypeEnum.NUMBER_ARRAY;
                  errors.push(
                    new ValidationError(
                      formatMessage("workBookInvalidDataFormat", param),
                      fieldPath,
                      "sheet"
                    )
                  );
                }
                break;
              case WorkbookDataTypeEnum.BOOLEAN_ARRAY:
                if (!isBooleanArray(row[fieldPath])) {
                  param.dataType = WorkbookDataTypeEnum.BOOLEAN_ARRAY;
                  errors.push(
                    new ValidationError(
                      formatMessage("workBookInvalidDataFormat", param),
                      fieldPath,
                      "sheet"
                    )
                  );
                }
                break;
              case WorkbookDataTypeEnum.NUMBER:
                if (!isNumber(row[fieldPath])) {
                  param.dataType = WorkbookDataTypeEnum.NUMBER;
                  errors.push(
                    new ValidationError(
                      formatMessage("workBookInvalidDataFormat", param),
                      fieldPath,
                      "sheet"
                    )
                  );
                }
                break;
              case WorkbookDataTypeEnum.VOCABULARY:
                const vocabElements = FIELD_TO_VOCAB_ELEMS_MAP.get(fieldPath);
                if (vocabElements && !vocabElements.includes(row[fieldPath])) {
                  param.dataType = WorkbookDataTypeEnum.VOCABULARY;
                  errors.push(
                    new ValidationError(
                      formatMessage("workBookInvalidDataFormat", param),
                      fieldPath,
                      "sheet"
                    )
                  );
                }
                break;
            }
          }
        }
      }
    }
    return errors;
  }

  function onToggleColumnMapping(
    columnName: string,
    fieldPath: string,
    checked: boolean
  ) {
    const newColumnMap: WorkbookColumnMap = {};
    newColumnMap[columnName] = {
      fieldPath,
      showOnUI: true,
      numOfUniqueValues: Object.keys(
        columnUniqueValues?.[sheet]?.[columnName] ?? {}
      ).length,
      mapRelationship: checked,
      valueMapping: {}
    };
    setColumnMap(newColumnMap);
  }

  async function onFieldMappingChange(
    columnName: string,
    newFieldPath: string
  ) {
    let valueMapping: { [key: string]: { id: string; type: string } } = {};
    if (newFieldPath?.startsWith("parentMaterialSample.")) {
      valueMapping = await resolveParentMapping(columnName, newFieldPath);
    }
    const newColumnMap: WorkbookColumnMap = {};
    newColumnMap[columnName] = {
      fieldPath: newFieldPath,
      showOnUI: true,
      numOfUniqueValues: Object.keys(
        columnUniqueValues?.[sheet]?.[columnName] ?? {}
      ).length,
      mapRelationship: false,
      valueMapping
    };
    setColumnMap(newColumnMap);
  }

  return (
    <DinaForm<Partial<WorkbookColumnMappingFields>>
      initialValues={{
        sheet: 1,
        type: selectedType?.value || "material-sample",
        fieldMap,
        group: groupNames && groupNames.length > 0 ? groupNames[0] : undefined
      }}
      innerRef={formRef}
      onSubmit={onSubmit}
      validationSchema={workbookColumnMappingFormSchema}
    >
      {buttonBar}
      <FieldArray name="fieldMap">
        {() => {
          return (
            <>
              <Card
                className="mb-3"
                style={{ width: "100%", overflowX: "auto", height: "70hp" }}
              >
                <Card.Body className="mb-3 px-4 py-2">
                  <div className="list-inline d-flex flex-row gap-4 pt-2">
                    <FieldWrapper name="sheet" className="flex-grow-1">
                      <Select
                        value={sheetValue}
                        options={sheetOptions}
                        onChange={(newOption) =>
                          setSheet(newOption?.value ?? 0)
                        }
                      />
                    </FieldWrapper>
                    <FieldWrapper name="type" className="flex-grow-1">
                      <Select
                        isDisabled={entityTypes.length === 1}
                        value={selectedType}
                        onChange={(entityType) => setSelectedType(entityType)}
                        options={entityTypes}
                      />
                    </FieldWrapper>
                  </div>
                </Card.Body>
              </Card>

              <WorkbookDisplay
                sheetIndex={sheet}
                workbookJsonData={spreadsheetData}
              />
              <Card
                className="mb-3"
                style={{ width: "100%", overflowX: "auto", height: "70hp" }}
              >
                <Card.Header style={{ fontSize: "1.4em" }}>
                  <DinaMessage id="mapColumns" />
                </Card.Header>
                <Card.Body className="mb-3 px-4 py-2">
                  {/* Column Header Mapping Table */}
                  <div
                    className="row mb-2"
                    style={{ borderBottom: "solid 1px", paddingBottom: "8px" }}
                  >
                    <div className="col-md-3">
                      <DinaMessage id="spreadsheetHeader" />
                    </div>
                    <div className="col-md-6">
                      <DinaMessage id="materialSampleFieldsMapping" />
                    </div>
                    <div className="col-md-1">
                      <DinaMessage id="skipColumn" />
                    </div>
                    <div className="col-md-2">
                      <DinaMessage id="mapRelationship" />
                    </div>
                  </div>
                  {headers
                    ? headers.map((columnName, index) => (
                        <ColumnMappingRow
                          columnName={columnName}
                          sheet={sheet}
                          selectedType={
                            selectedType?.value ?? "material-sample"
                          }
                          columnIndex={index}
                          fieldOptions={fieldOptions}
                          onToggleColumnMapping={onToggleColumnMapping}
                          onFieldMappingChange={onFieldMappingChange}
                          key={index}
                        />
                      ))
                    : undefined}
                </Card.Body>
              </Card>

              <RelationshipFieldMapping sheetIndex={sheet} />
            </>
          );
        }}
      </FieldArray>
    </DinaForm>
  );
}
