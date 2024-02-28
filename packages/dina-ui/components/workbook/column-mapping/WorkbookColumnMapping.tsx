import {
  AreYouSureModal,
  FieldWrapper,
  SubmitButton,
  useAccount,
  useApiClient,
  useModal,
  useQuery
} from "common-ui/lib";
import { DinaForm } from "common-ui/lib/formik-connected/DinaForm";
import { FieldArray, FormikProps } from "formik";
import { chain, startCase } from "lodash";
import { MaterialSample } from "packages/dina-ui/types/collection-api";
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
  convertMap,
  findMatchField,
  getColumnHeaders,
  getDataFromWorkbook,
  isBoolean,
  isBooleanArray,
  isMap,
  isNumber,
  isNumberArray,
  isValidManagedAttribute
} from "../utils/workbookMappingUtils";
import { ColumnMappingRow } from "./ColumnMappingRow";

export type FieldMapType = {
  targetField: string | undefined;
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
    columnUniqueValues
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
    isFieldInALinkableRelationshipField
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

  // Have to load end-points up front, save all responses in a map
  const FIELD_TO_VOCAB_ELEMS_MAP = new Map();

  Object.keys(FieldMappingConfig).forEach((recordType) => {
    const recordFieldsMap = FieldMappingConfig[recordType];
    Object.keys(recordFieldsMap).forEach((recordField) => {
      const { dataType, endpoint } = recordFieldsMap[recordField];
      switch (dataType) {
        case WorkbookDataTypeEnum.VOCABULARY:
          if (endpoint) {
            const query: any = useQuery({
              path: endpoint
            });
            const vocabElements =
              query?.response?.data?.vocabularyElements?.map(
                (vocabElement) => vocabElement.name
              );
            FIELD_TO_VOCAB_ELEMS_MAP.set(recordField, vocabElements);
          }
          break;
        case WorkbookDataTypeEnum.MANAGED_ATTRIBUTES:
          if (endpoint) {
            // load available Managed Attributes
            const query: any = useQuery({
              path: endpoint
            });
            FIELD_TO_VOCAB_ELEMS_MAP.set(recordField, query?.response?.data);
          }
          break;
        default:
          break;
      }
    });
  });

  // Generate field options
  const fieldOptions = useMemo(() => {
    if (!!selectedType) {
      const nonNestedRowOptions: { label: string; value: string }[] = [];
      const nestedRowOptions: {
        label: string;
        value: string;
        parentPath: string;
      }[] = [];
      //const newFieldOptions: { label: string; value: string }[] = [];
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
          return {
            label: key.toUpperCase(),
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
        map.push({ targetField: fieldPath, skipped: fieldPath === undefined });
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
      const headers = spreadsheetData[sheet][0].content;
      const colIndex = headers.indexOf(columnHeader) ?? -1;
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
        if (fieldPath?.startsWith("parentMaterialSample.")) {
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
    if (
      submittedValues.fieldMap.filter((item) => item.skipped).length > 0
    ) {
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
          const fieldMap = fieldMaps[i];
          if (!!fieldMap) {
            if (
              fieldMap.targetField !== undefined &&
              fieldMaps.filter(
                (item) => item.targetField === fieldMap.targetField
              ).length > 1
            ) {
              errors.push(
                new ValidationError(
                  formatMessage("workBookDuplicateFieldMap"),
                  fieldMap.targetField,
                  `fieldMap[${i}].targetField`
                )
              );
            }
            if (
              fieldMap.targetField === undefined &&
              fieldMap.skipped === false
            ) {
              errors.push(
                new ValidationError(
                  formatMessage("workBookSkippedField"),
                  fieldMap.targetField,
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
              case WorkbookDataTypeEnum.MANAGED_ATTRIBUTES:
                if (!isMap(row[fieldPath])) {
                  param.dataType = WorkbookDataTypeEnum.MANAGED_ATTRIBUTES;
                  errors.push(
                    new ValidationError(
                      formatMessage("workBookInvalidDataFormat", param),
                      fieldPath,
                      "sheet"
                    )
                  );
                }
                const workbookManagedAttributes = convertMap(row[fieldPath]);
                try {
                  isValidManagedAttribute(
                    workbookManagedAttributes,
                    FIELD_TO_VOCAB_ELEMS_MAP.get(fieldPath),
                    formatMessage
                  );
                } catch (error) {
                  errors.push(error);
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

  function onFieldMappingChange(columnName: string, newFieldPath: string) {
    const newColumnMap: WorkbookColumnMap = {};
    newColumnMap[columnName] = {
      fieldPath: newFieldPath,
      showOnUI: true,
      numOfUniqueValues: Object.keys(
        columnUniqueValues?.[sheet]?.[columnName] ?? {}
      ).length,
      mapRelationship: false,
      valueMapping: {}
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
                    <div className="col-md-3">
                      <DinaMessage id="materialSampleFieldsMapping" />
                    </div>
                    <div className="col-md-3">
                      <DinaMessage id="skipColumn" />
                    </div>
                    <div className="col-md-3">
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
