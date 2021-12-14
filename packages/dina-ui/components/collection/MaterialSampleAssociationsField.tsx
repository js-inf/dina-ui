import classNames from "classnames";
import {
  AssociatedMaterialSampleSearchBoxField,
  MaterialSampleSearchHelper,
  TextField,
  useQuery,
  withResponse
} from "common-ui";
import { PersistedResource } from "kitsu";
import Link from "next/link";
import React, { useRef, useState } from "react";
import { VocabularyReadOnlyView, VocabularySelectField } from "..";
import {
  MaterialSample,
  MaterialSampleAssociation
} from "../../../dina-ui/types/collection-api/resources/MaterialSample";
import { DinaMessage, useDinaIntl } from "../../intl/dina-ui-intl";
import { TabbedArrayField, TabPanelCtx } from "./TabbedArrayField";
import { useFormikContext } from "formik";

/** Type-safe object with all MaterialSampleAssociation fields. */
export const MATERIALSAMPLE_ASSOCIATION_FIELDS_OBJECT: Required<
  Record<keyof MaterialSampleAssociation, true>
> = {
  associatedSample: true,
  associationType: true,
  remarks: true
};

/** All fields of the MaterialSampleAssociation type. */
export const MATERIALSAMPLE_ASSOCIATION_FIELDS = Object.keys(
  MATERIALSAMPLE_ASSOCIATION_FIELDS_OBJECT
);

export interface MaterialSampleAssociationsFieldProps {
  className?: string;
}

export function MaterialSampleAssociationsField({
  className
}: MaterialSampleAssociationsFieldProps) {
  const fieldName = "associations";
  const { formatMessage } = useDinaIntl();

  return (
    <TabbedArrayField<MaterialSampleAssociation>
      legend={<DinaMessage id="materialSampleAssociationLegend" />}
      typeName={formatMessage("association")}
      makeNewElement={() => ({})}
      name={fieldName}
      sectionId="associations-section"
      className={classNames(className, "non-strip")}
      renderTab={(assoc, index) => {
        const hasName = Boolean(
          (assoc.associationType || assoc.associatedSample)?.trim()
        );

        return hasName ? (
          <div className="d-flex gap-2">
            {assoc.associationType && (
              <VocabularyReadOnlyView
                value={assoc.associationType}
                path="collection-api/vocabulary/associationType"
              />
            )}
            {assoc.associatedSample && (
              <MaterialSampleLink
                id={assoc.associatedSample}
                disableLink={true}
              />
            )}
          </div>
        ) : (
          index + 1
        );
      }}
      renderTabPanel={props => <AssociationTabPanel {...props} />}
    />
  );
}

function AssociationTabPanel({
  fieldProps,
  index
}: TabPanelCtx<MaterialSampleAssociation>) {
  const [showSearch, setShowSearch] = useState(false);
  const formikCtx = useFormikContext<MaterialSample>();
  const [showSearchBtn, setShowSearchBtn] = useState(
    formikCtx.values.associations?.[index].associatedSample ? false : true
  );

  function resetSearchState() {
    setShowSearch(false);
    setShowSearchBtn(true);
  }

  function onAssociatedSampleSelected(
    sample: PersistedResource<MaterialSample>
  ) {
    const fieldName = fieldProps("associatedSample").name;
    formikCtx.setFieldValue(fieldName, sample.id);
    formikCtx.setFieldError(fieldName, undefined);
    resetSearchState();
    setShowSearchBtn(false);
  }
  return (
    <div>
      <div className="row">
        <div className="col-sm-6">
          <div className="association-type">
            <VocabularySelectField
              {...fieldProps("associationType")}
              path="collection-api/vocabulary/associationType"
            />
          </div>
          <div className="associated-sample">
            <AssociatedMaterialSampleSearchBoxField
              showSearchBtn={showSearchBtn}
              onRemoveEntry={resetSearchState}
              onSearchClicked={() => setShowSearch(true)}
              props={fieldProps("associatedSample")}
            />
          </div>
        </div>
        <div className="col-sm-6">
          <TextField {...fieldProps("remarks")} multiLines={true} />
        </div>
      </div>
      <MaterialSampleSearchHelper
        fieldName={fieldProps("associatedSample").name}
        showSearch={showSearch}
        onAssociatedSampleSelected={onAssociatedSampleSelected}
        onCloseClicked={resetSearchState}
      />
    </div>
  );
}

/** Displays the material sample name and link given the ID. */
export function MaterialSampleLink({ id, disableLink = false }) {
  const sampleQuery = useQuery<MaterialSample>({
    path: `collection-api/material-sample/${id}`
  });
  return withResponse(sampleQuery, ({ data: sample }) => {
    const name =
      sample.materialSampleName ||
      sample.dwcOtherCatalogNumbers?.join?.(", ") ||
      id;
    return disableLink ? (
      name
    ) : (
      <Link href={`/collection/material-sample/view?id=${id}`}>
        <a target="_blank">{name}</a>
      </Link>
    );
  });
}
