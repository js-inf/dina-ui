import { FieldHeader, dateCell } from "..";
import { DynamicField, ESIndexMapping } from "../list-page/types";
import Kitsu from "kitsu";
import lodash, { get, startCase } from "lodash";
import { useMemo } from "react";
import { useIntl } from "react-intl";

export interface ColumnSelectorIndexMapColumns {
  groupedIndexMappings: any;
  setLoadedIndexMapColumns?: React.Dispatch<React.SetStateAction<boolean>>;
  setColumnSelectorIndexMapColumns?: React.Dispatch<
    React.SetStateAction<any[]>
  >;
  setLoadingIndexMapColumns?: React.Dispatch<React.SetStateAction<boolean>>;
  apiClient: Kitsu;
}

// Hook to get all of index map columns to be added to column selector
export async function getColumnSelectorIndexMapColumns({
  groupedIndexMappings,
  setLoadedIndexMapColumns,
  setColumnSelectorIndexMapColumns,
  apiClient,
  setLoadingIndexMapColumns
}: ColumnSelectorIndexMapColumns) {
  setLoadingIndexMapColumns?.(true);
  for (const groupedIndexMapping of groupedIndexMappings) {
    const groupedIndexMappingOptions = groupedIndexMapping.options;
    for (const queryOption of groupedIndexMappingOptions) {
      if (queryOption.dynamicField) {
        await getDynamicFieldColumns(
          queryOption,
          apiClient,
          setColumnSelectorIndexMapColumns
        );
      } else {
        getStandardColumns(queryOption, setColumnSelectorIndexMapColumns);
      }
    }
  }
  setLoadingIndexMapColumns?.(false);
  setLoadedIndexMapColumns?.(true);
}

// Get standard columns that don't have dynamicField
function getStandardColumns(
  queryOption: QueryOption,
  setColumnSelectorIndexMapColumns?: React.Dispatch<any>
) {
  if (queryOption.parentType) {
    getIncludedStandardColumns(queryOption, setColumnSelectorIndexMapColumns);
  } else {
    getAttributesStandardColumns(queryOption, setColumnSelectorIndexMapColumns);
  }
}

// Get standard columns that are the default attributes of the resource
export function getAttributesStandardColumns(
  queryOption: QueryOption,
  setColumnSelectorIndexMapColumns?: React.Dispatch<any>
) {
  let column;
  if (queryOption.type === "date") {
    column = dateCell(
      queryOption.label,
      queryOption.value,
      undefined,
      false,
      queryOption
    );
  } else {
    column = {
      id: queryOption.label,
      header: () => <FieldHeader name={queryOption.label} />,
      accessorKey: queryOption.value,
      isKeyword: queryOption.keywordMultiFieldSupport,
      isColumnVisible: false,
      queryOption
    };
  }
  addColumnToIndexMapColumns(column, setColumnSelectorIndexMapColumns);
}

// Get standard columns that are the included relationships of the resource
export function getIncludedStandardColumns(
  queryOption: QueryOption,
  setColumnSelectorIndexMapColumns?: React.Dispatch<any>
) {
  let column;

  const accessorKey = `${queryOption.parentPath}.${queryOption.path}.${queryOption.label}`;
  if (queryOption.type === "date") {
    column = dateCell(
      queryOption.value,
      accessorKey,
      queryOption.parentType,
      false,
      queryOption
    );
  } else {
    column = {
      id: queryOption.value,
      header: () => <FieldHeader name={queryOption.value} />,
      accessorKey,
      isKeyword: queryOption.keywordMultiFieldSupport,
      isColumnVisible: false,
      cell: ({ row: { original } }) => {
        const relationshipAccessor = accessorKey?.split(".");
        relationshipAccessor?.splice(
          1,
          0,
          queryOption.parentType ? queryOption.parentType : ""
        );
        const valuePath = relationshipAccessor?.join(".");
        const value = get(original, valuePath);
        return <>{value}</>;
      },
      relationshipType: queryOption.parentType,
      queryOption
    };
  }
  addColumnToIndexMapColumns(column, setColumnSelectorIndexMapColumns);
}

function addColumnToIndexMapColumns(
  column,
  setColumnSelectorIndexMapColumns?: React.Dispatch<any>
) {
  setColumnSelectorIndexMapColumns?.((currentColumns) => {
    if (
      !currentColumns.find(
        (currentColumn) => currentColumn.id === (column as any).id
      )
    ) {
      const newColumns = [...currentColumns, column];
      return newColumns;
    } else {
      return currentColumns;
    }
  });
}

// Handle getting columns from query options that contain dynamicField
async function getDynamicFieldColumns(
  queryOption: QueryOption,
  apiClient: Kitsu,
  setColumnSelectorIndexMapColumns?: React.Dispatch<any>
) {
  if (queryOption.type === "fieldExtension") {
    await getExtensionValuesColumns(
      queryOption,
      apiClient,
      setColumnSelectorIndexMapColumns
    );
  } else if (queryOption.type === "managedAttribute") {
    await getManagedAttributesColumns(
      queryOption,
      apiClient,
      setColumnSelectorIndexMapColumns
    );
  } else {
    throw Error("Uncaught queryOption type.");
  }
}

async function getManagedAttributesColumns(
  queryOption: QueryOption,
  apiClient: Kitsu,
  setColumnSelectorIndexMapColumns?: React.Dispatch<any>
) {
  const filter = {
    managedAttributeComponent: queryOption.dynamicField?.component
  };
  try {
    const managedAttributes = await fetchDynamicField(
      apiClient,
      queryOption.dynamicField?.apiEndpoint,
      filter
    );
    if (queryOption.parentType) {
      // Handle included managed attribute
      getIncludedManagedAttributeColumns(
        managedAttributes,
        queryOption,
        setColumnSelectorIndexMapColumns
      );
    } else {
      getAttributesManagedAttributeColumns(
        managedAttributes,
        queryOption,
        setColumnSelectorIndexMapColumns
      );
    }
  } catch (error) {
    // Handle the error here, e.g., log it or display an error message.
    throw error;
  }
}

function getIncludedManagedAttributeColumns(
  managedAttributes,
  queryOption: QueryOption,
  setColumnSelectorIndexMapColumns?: React.Dispatch<any>
) {
  for (const managedAttribute of managedAttributes) {
    getIncludedManagedAttributeColumn(
      managedAttribute,
      queryOption,
      setColumnSelectorIndexMapColumns
    );
  }
}

export function getIncludedManagedAttributeColumn(
  managedAttribute: any,
  queryOption: QueryOption,
  setColumnSelectorIndexMapColumns?: React.Dispatch<any>
) {
  const managedAttributeKey = managedAttribute.key;
  const accessorKey = `${queryOption.path}.${managedAttributeKey}`;

  const managedAttributesColumn = {
    cell: ({ row: { original } }) => {
      const relationshipAccessor = accessorKey?.split(".");
      relationshipAccessor?.splice(
        1,
        0,
        queryOption.parentType ? queryOption.parentType : ""
      );
      const valuePath = relationshipAccessor?.join(".");
      const value = get(original, valuePath);
      return <>{value}</>;
    },
    header: () => <FieldHeader name={managedAttribute.name} />,
    accessorKey,
    id: `${queryOption.type}.${managedAttributeKey}`,
    isKeyword: queryOption.keywordMultiFieldSupport,
    isColumnVisible: false,
    relationshipType: queryOption.parentType,
    managedAttribute,
    queryOption
  };
  addColumnToIndexMapColumns(
    managedAttributesColumn,
    setColumnSelectorIndexMapColumns
  );
}

function getAttributesManagedAttributeColumns(
  managedAttributes,
  queryOption: QueryOption,
  setColumnSelectorIndexMapColumns?: React.Dispatch<any>
) {
  for (const managedAttribute of managedAttributes) {
    getAttributesManagedAttributeColumn(
      managedAttribute,
      queryOption,
      setColumnSelectorIndexMapColumns
    );
  }
}

export function getAttributesManagedAttributeColumn(
  managedAttribute: any,
  queryOption: QueryOption,
  setColumnSelectorIndexMapColumns?: React.Dispatch<any>
) {
  const managedAttributeKey = managedAttribute.key;
  const accessorKey = `${queryOption.path}.${managedAttributeKey}`;
  const managedAttributesColumn = {
    header: () => <FieldHeader name={managedAttribute.name} />,
    accessorKey,
    id: `${queryOption.type}.${managedAttributeKey}`,
    isKeyword: queryOption.keywordMultiFieldSupport,
    isColumnVisible: false,
    queryOption,
    managedAttribute
  };
  addColumnToIndexMapColumns(
    managedAttributesColumn,
    setColumnSelectorIndexMapColumns
  );
}

function getAttributesExtensionValuesColumns(
  extensionValues,
  queryOption: QueryOption,
  setColumnSelectorIndexMapColumns?: React.Dispatch<any>
) {
  for (const extensionValue of extensionValues) {
    getAttributeExtensionValuesColumn(
      extensionValue,
      queryOption,
      setColumnSelectorIndexMapColumns
    );
  }
}

function getAttributeExtensionValuesColumn(
  extensionValue: any,
  queryOption: QueryOption,
  setColumnSelectorIndexMapColumns?: React.Dispatch<any>
) {
  const extensionFields = extensionValue.extension.fields;
  for (const extensionField of extensionFields) {
    getAttributeExtensionFieldColumn(
      queryOption,
      extensionValue,
      extensionField,
      setColumnSelectorIndexMapColumns
    );
  }
}

export function getAttributeExtensionFieldColumn(
  queryOption: QueryOption,
  extensionValue: any,
  extensionField: any,
  setColumnSelectorIndexMapColumns?: React.Dispatch<any>
) {
  const fieldExtensionResourceType = queryOption.path.split(".").at(-1);
  const extensionValuesColumn = {
    accessorKey: `${queryOption.path}.${extensionValue.id}.${extensionField.key}`,
    id: `${fieldExtensionResourceType}.${extensionValue.id}.${extensionField.key}`,
    header: () => (
      <FieldHeader name={`${extensionValue.id}.${extensionField.key}`} />
    ),
    isKeyword: queryOption.keywordMultiFieldSupport,
    isColumnVisible: false,
    queryOption,
    extensionValue,
    extensionField
  };
  addColumnToIndexMapColumns(
    extensionValuesColumn,
    setColumnSelectorIndexMapColumns
  );
}

// Fetch filtered dynamic field from back end
async function fetchDynamicField(apiClient: Kitsu, path, filter?: any) {
  const { data } = await apiClient.get(path, {
    filter
  });

  return data;
}

interface QueryOption {
  parentName: any;
  value: string;
  label: string;
  type: string;
  subType?: string | undefined;
  distinctTerm: boolean;
  optimizedPrefix: boolean;
  containsSupport: boolean;
  endsWithSupport: boolean;
  keywordMultiFieldSupport: boolean;
  path: string;
  parentPath?: string | undefined;
  parentType?: string | undefined;
  dynamicField?: DynamicField | undefined;
}

// Get attribute and included extension values columns
async function getExtensionValuesColumns(
  queryOption: QueryOption,
  apiClient: Kitsu,
  setColumnSelectorIndexMapColumns?: React.Dispatch<any>
) {
  const filter = {
    "extension.fields.dinaComponent": queryOption.dynamicField?.component
  };
  try {
    const extensionValues = await fetchDynamicField(
      apiClient,
      queryOption.dynamicField?.apiEndpoint,
      filter
    );
    if (queryOption.parentType) {
      // Handle included extension values
      getIncludedExtensionValuesColumns(
        extensionValues,
        queryOption,
        setColumnSelectorIndexMapColumns
      );
    } else {
      getAttributesExtensionValuesColumns(
        extensionValues,
        queryOption,
        setColumnSelectorIndexMapColumns
      );
    }
  } catch (error) {
    // Handle the error here, e.g., log it or display an error message.
    throw error;
  }
}

// Get included Extension Values column from ES field
function getIncludedExtensionValuesColumns(
  extensionValues,
  queryOption: QueryOption,
  setColumnSelectorIndexMapColumns?: React.Dispatch<any>
) {
  for (const extensionValue of extensionValues) {
    getIncludedExtensionValuesColumn(
      extensionValue,
      queryOption,
      setColumnSelectorIndexMapColumns
    );
  }
}

function getIncludedExtensionValuesColumn(
  extensionValue: any,
  queryOption: QueryOption,
  setColumnSelectorIndexMapColumns?: React.Dispatch<any>
) {
  const extensionFields = extensionValue.extension.fields;
  for (const extensionField of extensionFields) {
    getIncludedExtensionFieldColumn(
      queryOption,
      extensionValue,
      extensionField,
      setColumnSelectorIndexMapColumns
    );
  }
}

export function getIncludedExtensionFieldColumn(
  queryOption: QueryOption,
  extensionValue: any,
  extensionField: any,
  setColumnSelectorIndexMapColumns?: React.Dispatch<any>
) {
  const fieldExtensionResourceType = queryOption.path.split(".").at(-1);
  const accessorKey = `${queryOption.path}.${extensionValue.id}.${extensionField.key}`;
  const extensionValuesColumn = {
    cell: ({ row: { original } }) => {
      const relationshipAccessor = accessorKey?.split(".");
      relationshipAccessor?.splice(
        1,
        0,
        queryOption.parentType ? queryOption.parentType : ""
      );
      const valuePath = relationshipAccessor?.join(".");
      const value = get(original, valuePath);
      return <>{value}</>;
    },
    accessorKey,
    id: `${fieldExtensionResourceType}.${extensionValue.id}.${extensionField.key}`,
    header: () => (
      <FieldHeader name={`${extensionValue.id}.${extensionField.key}`} />
    ),
    isKeyword: queryOption.keywordMultiFieldSupport,
    isColumnVisible: false,
    relationshipType: queryOption.parentType,
    queryOption,
    extensionValue,
    extensionField
  };
  addColumnToIndexMapColumns(
    extensionValuesColumn,
    setColumnSelectorIndexMapColumns
  );
}

export function getGroupedIndexMappings(
  indexName: string,
  indexMap: ESIndexMapping[] | undefined
) {
  const { formatMessage, locale, messages } = useIntl();
  return useMemo(() => {
    // Get all of the attributes from the index for the filter dropdown.
    const columnSelectorParentNameMap = {
      dina_material_sample_index: "Material Sample",
      dina_loan_transaction_index: "Loan Transaction",
      dina_object_store_index: "Object Store"
    };
    const attributeMappings = indexMap
      ?.filter((indexMapping) => !indexMapping.parentPath)
      ?.map((indexMapping) => ({
        ...indexMapping,
        parentName: columnSelectorParentNameMap[indexName]
      }))
      ?.sort((aProp, bProp) => aProp.label.localeCompare(bProp.label));

    // Get all the relationships for the search dropdown.
    const relationshipMappings = indexMap
      ?.filter((indexMapping) => !!indexMapping.parentPath)
      ?.map((indexMapping) => {
        return {
          parentName: indexMapping.parentName,
          ...indexMapping
        };
      })
      ?.sort((aProp, bProp) => aProp.label.localeCompare(bProp.label));

    // Using the parent name, group the attributes into section
    const groupedAttributeMappings = lodash
      .chain(attributeMappings)
      .groupBy((prop) => prop.parentName)
      .map((group, key) => {
        return {
          label: messages["title_" + key]
            ? formatMessage({ id: "title_" + key })
            : startCase(key),
          options: group
        };
      })
      .sort((aProp, bProp) => aProp.label.localeCompare(bProp.label))
      .value();

    // Using the parent name, group the relationships into sections.
    const groupedRelationshipMappings = lodash
      .chain(relationshipMappings)
      .groupBy((prop) => prop.parentName)
      .map((group, key) => {
        return {
          label: messages["title_" + key]
            ? formatMessage({ id: "title_" + key })
            : startCase(key),
          options: group
        };
      })
      .sort((aProp, bProp) => aProp.label.localeCompare(bProp.label))
      .value();
    const groupedMappings = [
      ...groupedAttributeMappings,
      ...groupedRelationshipMappings
    ];

    return groupedAttributeMappings ? groupedMappings : [];
  }, [indexMap, locale]);
}
