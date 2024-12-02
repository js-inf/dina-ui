import { withRouter } from "next/router";
import PageLayout from "../../components/page/PageLayout";
import {
  GeneratorSelectorMemo,
  DinaForm,
  FieldWrapper,
  SubmitButton,
  TextField,
  useApiClient,
  GeneratorColumn
} from "common-ui";
import { DinaMessage, useDinaIntl } from "../../intl/dina-ui-intl";
import { Alert, Card, Spinner } from "react-bootstrap";
import Select from "react-select";
import { useMemo, useState } from "react";
import { DynamicFieldsMappingConfig } from "common-ui/lib/list-page/types";
import { dynamicFieldMappingForMaterialSample } from "../collection/material-sample/list";
import Link from "next/link";
import { isEqual } from "lodash";
import FieldMappingConfig from "../../components/workbook/utils/FieldMappingConfig";
import {
  FieldOptionType,
  generateWorkbookFieldOptions,
  getFlattenedConfig
} from "../../components/workbook/utils/workbookMappingUtils";

export interface EntityConfiguration {
  name: string;
  indexName: string;
  uniqueName: string;
  dynamicConfig: DynamicFieldsMappingConfig;
}

// Entities that we support to generate templates
const ENTITY_TYPES: EntityConfiguration[] = [
  {
    name: "material-sample",
    indexName: "dina_material_sample_index",
    uniqueName: "material-sample-template-generator",
    dynamicConfig: dynamicFieldMappingForMaterialSample
  }
];

export function WorkbookTemplateGenerator() {
  const { formatMessage } = useDinaIntl();
  const { apiClient } = useApiClient();

  // Loading state
  const [loading, setLoading] = useState<boolean>(false);

  // Generator errors
  const [errorMessage, setErrorMessage] = useState<string>();

  // Entity to be generated (e.g. material-sample)
  const [type, setType] = useState<EntityConfiguration>(ENTITY_TYPES[0]);

  // Columns selected for the generator
  const [columnsToGenerate, setColumnsToGenerate] = useState<GeneratorColumn[]>(
    []
  );

  const entityTypes = ENTITY_TYPES.map((entityType) => ({
    label: formatMessage(entityType.name as any),
    value: entityType.name,
    instance: entityType
  }));
  const selectedType = entityTypes.find((item) => item.value === type.name);

  const flattenedConfig = getFlattenedConfig(FieldMappingConfig, type.name);
  const newFieldOptions = useMemo(() => {
    return generateWorkbookFieldOptions(flattenedConfig, formatMessage);
  }, [flattenedConfig]);

  async function generateTemplate(formik) {
    setLoading(true);
    setErrorMessage(undefined);

    // Retrieve the filename.
    const fileName = formik?.values?.name ?? "template";

    // Ensure the filename provided is supported by Windows.
    const validFilenameRegex = /^[a-zA-Z0-9\s\-_]+$/;
    if (!validFilenameRegex.test(fileName)) {
      setErrorMessage(
        "Please enter a valid filename. Only letters, numbers, spaces, hyphens, and underscores are allowed."
      );
      setLoading(false);
      return;
    }

    const generateTemplateArg: any = {
      data: {
        type: "workbook-generation",
        attributes: {
          columns: columnsToGenerate.map((col) => {
            // Use managed attribute key instead
            if ((col as any)?.managedAttribute?.name) {
              return (col as any)?.managedAttribute?.name;
            }
            return col.columnValue;
          }),
          aliases: columnsToGenerate.map<string>((col) =>
            col?.columnAlias ? col.columnAlias : col.columnLabel
          )
        }
      }
    };

    // If columns and aliases are the same, do not send the aliases over.
    if (
      isEqual(
        generateTemplateArg.data.attributes.columns,
        generateTemplateArg.data.attributes?.aliases ?? []
      )
    ) {
      delete generateTemplateArg.data.attributes.aliases;
    }

    try {
      const workbookGenerationPostResponse = await apiClient.axios.post(
        "objectstore-api/workbook/generation",
        generateTemplateArg,
        {
          headers: {
            "Content-Type": "application/vnd.api+json"
          },
          responseType: "blob"
        }
      );

      // Download the data
      const url = window?.URL?.createObjectURL?.(
        workbookGenerationPostResponse?.data as any
      );
      const link = document?.createElement("a");
      link.href = url ?? "";
      link?.setAttribute("download", fileName + ".xlsx");
      document?.body?.appendChild(link);
      link?.click();
      if (typeof window !== "undefined" && window?.URL?.revokeObjectURL) {
        window?.URL?.revokeObjectURL(url ?? "");
      }
    } catch (error) {
      // Log the error for debugging
      console.error("Error generating workbook template:", error);

      // Extract a user-friendly error message:
      let userFriendlyErrorMessage =
        "An error occurred while generating the workbook template. Please try again later.";
      if (error.response) {
        // If a response object is available, extract the status code and message
        userFriendlyErrorMessage = `Error ${error.response.status}: ${
          error.response.data.message || "Unknown error"
        }`;
      }

      // Set the user-friendly error message for display
      setErrorMessage(userFriendlyErrorMessage);
    }

    setLoading(false);
  }

  const LoadingSpinner = (
    <>
      <Spinner
        as="span"
        animation="border"
        size="sm"
        role="status"
        aria-hidden="true"
      />
      <span className="visually-hidden">
        <DinaMessage id="loadingSpinner" />
      </span>
    </>
  );

  return (
    <DinaForm initialValues={{}}>
      <PageLayout
        titleId="workbookGenerateTemplateTitle"
        buttonBarContent={
          <>
            <div className="col-md-6 col-sm-12 mt-2">
              <Link href={"/workbook/upload"}>
                <a className={`back-button my-auto`}>
                  <DinaMessage id={"backToUploadWorkbook"} />
                </a>
              </Link>
            </div>
            <div className="col-md-6 col-sm-12 d-flex">
              <SubmitButton
                className="ms-auto"
                buttonProps={(formik) => ({
                  style: { width: "12rem" },
                  disabled: loading || columnsToGenerate.length === 0,
                  onClick: () => generateTemplate(formik)
                })}
              >
                {loading ? (
                  LoadingSpinner
                ) : (
                  <DinaMessage id="generateButtonText" />
                )}
              </SubmitButton>
            </div>
          </>
        }
      >
        {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}
        <h4 className="mt-4">
          <DinaMessage id="settingLabel" />
        </h4>
        <Card>
          <Card.Body>
            <div className="list-inline d-flex flex-row gap-4 pt-2">
              <TextField
                name={"name"}
                customName="templateName"
                disabled={loading}
                className="flex-grow-1"
              />
              <FieldWrapper name="type" className="flex-grow-1">
                <Select
                  isDisabled={entityTypes.length === 1}
                  value={selectedType}
                  onChange={(entityType) =>
                    setType(
                      ENTITY_TYPES.find(
                        (searchType) => searchType.name === entityType?.value
                      ) ?? ENTITY_TYPES[0]
                    )
                  }
                  options={entityTypes}
                  menuPortalTarget={document.body}
                  styles={{
                    menuPortal: (base) => ({ ...base, zIndex: 9999 })
                  }}
                />
              </FieldWrapper>
            </div>
          </Card.Body>
        </Card>
        <h4 className="mt-4">
          <DinaMessage id="templateGenerator_columnsToGenerate" />
        </h4>
        <Card>
          <Card.Body>
            <GeneratorSelectorMemo
              generatorFields={newFieldOptions as FieldOptionType[]}
              displayedColumns={columnsToGenerate as any}
              setDisplayedColumns={setColumnsToGenerate as any}
              dynamicFieldsMappingConfig={type.dynamicConfig}
              disabled={loading}
            />
          </Card.Body>
        </Card>
      </PageLayout>
    </DinaForm>
  );
}

export default withRouter(WorkbookTemplateGenerator);