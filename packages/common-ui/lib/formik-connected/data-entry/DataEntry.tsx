import { useFormikContext } from "formik";
import { KitsuResource } from "kitsu";
import useVocabularyOptions from "../../../../dina-ui/components/collection/useVocabularyOptions";
import { ProtocolElement } from "../../../../dina-ui/types/collection-api";
import { FieldExtension } from "../../../../dina-ui/types/collection-api/resources/FieldExtension";
import { useEffect, useState } from "react";
import { Button } from "react-bootstrap";
import {
  BulkEditTabContextI,
  FieldSet,
  SelectOption,
  useApiClient,
  useBulkEditTabContext,
  useQuery
} from "../..";
import {
  DinaMessage,
  useDinaIntl
} from "../../../../dina-ui/intl/dina-ui-intl";
import { DataBlock } from "./DataBlock";
import { DataEntryFieldProps } from "./DataEntryField";

/* tslint:disable-next-line */
export interface DataEntryProps extends DataEntryFieldProps {}

export function DataEntry({
  legend,
  name,
  readOnly,
  id,
  blockAddable = false,
  unitsAddable = false,
  typesAddable = false,
  isVocabularyBasedEnabledForBlock = false,
  isVocabularyBasedEnabledForType = false,
  blockOptionsEndpoint,
  blockOptionsFilter,
  unitOptionsEndpoint,
  typeOptionsEndpoint
}: DataEntryProps) {
  const { apiClient } = useApiClient();
  const { locale } = useDinaIntl();
  const formik = useFormikContext<any>();
  const bulkContext = useBulkEditTabContext();
  let extensionValues =
    formik?.values?.[name] ?? getBulkContextExtensionValues(bulkContext, name);

  const blockOptionsQuery: any = isVocabularyBasedEnabledForBlock
    ? useVocabularyOptions({
        path: blockOptionsEndpoint
      })
    : useQuery<FieldExtension[]>({
        path: blockOptionsEndpoint,
        filter: blockOptionsFilter
      });
  const blockOptions = isVocabularyBasedEnabledForBlock
    ? blockOptionsQuery?.vocabOptions
    : blockOptionsQuery?.response?.data.map((data) => {
        return {
          label: data.extension.name,
          value: data.extension.key
        };
      });

  const [queriedTypeOptions, setQueriedTypeOptions] = useState<
    SelectOption<string>[]
  >([]);

  useEffect(() => {
    async function fetchAllProtocolElements() {
      if (typeOptionsEndpoint) {
        const { data } = await apiClient.get<ProtocolElement[]>(
          typeOptionsEndpoint,
          {}
        );
        const options = data.map((rec) => {
          return {
            label:
              rec.multilingualTitle?.titles?.find(
                (item) => item.lang === locale
              )?.title || "",
            value: rec.id
          };
        });
        setQueriedTypeOptions(options);
      }
    }

    fetchAllProtocolElements();
  }, []);

  const vocabQuery = unitOptionsEndpoint
    ? useVocabularyOptions({
        path: unitOptionsEndpoint
      })
    : undefined;

  // If user changes field extensions in Bulk Edit, write Bulk Edit values to Formik form once
  const [bulkExtensionValuesOverride, setBulkExtensionValuesOverride] =
    useState<boolean>(false);
  if (formik?.values?.[name] && bulkContext && !bulkExtensionValuesOverride) {
    setBulkExtensionValuesOverride(true);
    formik.values[name] = getBulkContextExtensionValues(bulkContext, name);
    extensionValues = formik.values[name];
  }

  function removeBlock(blockPath: string) {
    const blockName = blockPath.split(".").at(-1);
    if (blockName) {
      const { [blockName]: _, ...newExtensionValues } = formik?.values?.[name];
      formik.setFieldValue(name, newExtensionValues);
    }
  }

  function addBlock() {
    let newExtensionValues = {};

    const selectedBlockOptions = formik?.values?.[name]
      ? Object.keys(formik?.values?.[name]).map(
          (blockKey) => formik?.values?.[name][blockKey].select
        )
      : [];

    const newBlockOption = blockOptions?.find(
      (blockOption) => !selectedBlockOptions?.includes(blockOption.value)
    );
    if (newBlockOption) {
      newExtensionValues = {
        ...formik?.values?.[name],
        [newBlockOption.value]: !blockAddable
          ? {
              select: newBlockOption.value,
              rows: { "extensionField-0": "" }
            }
          : {
              select: newBlockOption.value,
              rows: { "extensionField-0": "" },
              vocabularyBased: true
            }
      };
    } else {
      newExtensionValues = {
        ...formik?.values?.[name],
        [`extension-${Object.keys(extensionValues)}`]: !blockAddable
          ? {
              select: "",
              rows: { "extensionField-0": "" }
            }
          : {
              select: "",
              rows: { "extensionField-0": "" },
              vocabularyBased: true
            }
      };
    }

    formik.setFieldValue(name, newExtensionValues);
  }

  function legendWrapper():
    | ((legendElement: JSX.Element) => JSX.Element)
    | undefined {
    return (legendElement) => {
      return (
        <div className="d-flex align-items-center justify-content-between">
          {legendElement}
          {!readOnly && (
            <Button onClick={() => addBlock()} className="add-datablock">
              <DinaMessage id="addCustomPlaceName" />
            </Button>
          )}
        </div>
      );
    };
  }
  return (
    <FieldSet legend={legend} wrapLegend={legendWrapper()} id={id}>
      {
        <div style={{ padding: 15 }}>
          {extensionValues
            ? Object.keys(extensionValues).map((blockKey) => {
                return (
                  <DataBlock
                    key={blockKey}
                    removeBlock={removeBlock}
                    name={`${name}.${blockKey}`}
                    blockKey={blockKey}
                    readOnly={readOnly}
                    blockAddable={blockAddable}
                    unitsAddable={unitsAddable}
                    typesAddable={typesAddable}
                    isVocabularyBasedEnabledForBlock={
                      isVocabularyBasedEnabledForBlock
                    }
                    isVocabularyBasedEnabledForType={
                      isVocabularyBasedEnabledForType
                    }
                    extensionValues={extensionValues}
                    blockOptionsQuery={blockOptionsQuery}
                    blockOptions={blockOptions}
                    unitsOptions={vocabQuery?.vocabOptions}
                    typeOptions={
                      typeOptionsEndpoint ? queriedTypeOptions : undefined
                    }
                  />
                );
              })
            : null}
        </div>
      }
    </FieldSet>
  );
}

/**
 * Gets extensionValues from individual Material Samples to be displayed in bulk edit tab
 * @param bulkContext
 * @returns extensionValues taken from individual Material Samples used for displaying in bulk edit tab
 */
function getBulkContextExtensionValues(
  bulkContext: BulkEditTabContextI<KitsuResource> | null,
  name
): any {
  const extensionValues = {};
  bulkContext?.resourceHooks?.forEach((resourceHook: any) => {
    if (!!resourceHook.resource[name]) {
      Object.keys(resourceHook.resource[name]).forEach((fieldKey) => {
        if (extensionValues[fieldKey]) {
          Object.keys(resourceHook?.resource?.[name][fieldKey].rows).forEach(
            (extensionKey) => {
              extensionValues[fieldKey].rows[extensionKey] = undefined;
            }
          );
        } else {
          extensionValues[fieldKey] = resourceHook.resource?.[name][fieldKey];
          Object.keys(resourceHook?.resource?.[name][fieldKey].rows).forEach(
            (extensionKey) => {
              extensionValues[fieldKey].rows[extensionKey] = undefined;
            }
          );
        }
      });
    }
  });
  return extensionValues;
}
