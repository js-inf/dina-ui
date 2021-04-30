import {
  BackButton,
  ButtonBar,
  DateField,
  DeleteButton,
  DinaForm,
  DinaFormOnSubmit,
  FieldSet,
  filterBy,
  Query,
  ResourceSelectField,
  SelectField,
  SubmitButton,
  TextField,
  useApiClient,
  withResponse
} from "common-ui";
import { useFormikContext } from "formik";
import { NextRouter, useRouter } from "next/router";
import { Head, Nav } from "../../../components";
import { ManagedAttributesEditor } from "../../../components/object-store/managed-attributes/ManagedAttributesEditor";
import { MetadataFileView } from "../../../components/object-store/metadata/MetadataFileView";
import { DinaMessage, useDinaIntl } from "../../../intl/dina-ui-intl";
import { License, Metadata, Person } from "../../../types/objectstore-api";

interface SingleMetadataFormProps {
  /** Existing Metadata is required, no new ones are added with this form. */
  metadata: Metadata;
  router: NextRouter;
}

export default function MetadataEditPage() {
  const router = useRouter();
  const { formatMessage } = useDinaIntl();
  const { apiClient } = useApiClient();

  const {
    query: { id }
  } = router;

  return (
    <div>
      <Head title={formatMessage("editMetadataTitle")} />
      <Nav />
      <main className="container-fluid">
        {id && (
          <div>
            <h1>
              <DinaMessage id="editMetadataTitle" />
            </h1>
            <Query<Metadata>
              query={{
                path: `objectstore-api/metadata/${id}`,
                include: "managedAttributeMap,dcCreator,derivatives"
              }}
              options={{
                joinSpecs: [
                  // Join to persons api:
                  {
                    apiBaseUrl: "/agent-api",
                    idField: "dcCreator",
                    joinField: "dcCreator",
                    path: metadata => `person/${metadata.dcCreator.id}`
                  }
                ],
                onSuccess: async ({ data: metadata }) => {
                  // Get the License resource based on the Metadata's xmpRightsWebStatement field:
                  if (metadata.xmpRightsWebStatement) {
                    const url = metadata.xmpRightsWebStatement;
                    (metadata as any).license = (
                      await apiClient.get<License[]>(
                        "objectstore-api/license",
                        { filter: { url } }
                      )
                    ).data[0];
                  }
                }
              }}
            >
              {metadataQuery =>
                withResponse(metadataQuery, ({ data }) => (
                  <SingleMetadataForm metadata={data} router={router} />
                ))
              }
            </Query>
          </div>
        )}
      </main>
    </div>
  );
}

function SingleMetadataForm({ router, metadata }: SingleMetadataFormProps) {
  const { formatMessage, locale } = useDinaIntl();
  const { id } = router.query;

  const PUBLICLY_RELEASABLE_OPTIONS = [
    { label: formatMessage("true"), value: true },
    { label: formatMessage("false"), value: false }
  ];

  // Convert acTags array to a comma-separated string:
  const initialValues = {
    ...metadata,
    acTags: metadata.acTags?.join(", ") ?? ""
  };

  const onSubmit: DinaFormOnSubmit = async ({
    submittedValues,
    api: { apiClient, save }
  }) => {
    const {
      acTags,
      // Don't include derivatives in the form submission:
      derivatives,
      license,
      managedAttributeMap,
      ...metadataValues
    } = submittedValues;
    delete managedAttributeMap.id;

    if (license) {
      const selectedLicense = license?.id
        ? (
            await apiClient.get<License>(
              `objectstore-api/license/${license.id}`,
              {}
            )
          ).data
        : null;
      // The Metadata's xmpRightsWebStatement field stores the license's url.
      metadataValues.xmpRightsWebStatement = selectedLicense?.url ?? "";
      // No need to store this ; The url should be enough.
      metadataValues.xmpRightsUsageTerms = "";
    }

    const metadataEdit = {
      ...metadataValues,
      acTags: acTags.split(",").map(tag => tag.trim())
    };

    await save(
      [
        {
          resource: metadataEdit,
          type: "metadata"
        },
        {
          resource: { ...managedAttributeMap, metadata },
          type: "managed-attribute-map"
        }
      ],
      { apiBaseUrl: "/objectstore-api" }
    );

    await router.push(`/object-store/object/view?id=${id}`);
  };

  const buttonBar = (
    <ButtonBar>
      <BackButton entityId={id as string} entityLink="/object-store/object" />
      <SubmitButton className="ml-auto" />
    </ButtonBar>
  );

  return (
    <DinaForm initialValues={initialValues} onSubmit={onSubmit}>
      {buttonBar}
      <div className="form-group">
        <MetadataFileView metadata={metadata} imgHeight="15rem" />
      </div>
      <FieldSet legend={<DinaMessage id="metadataMediaDetailsLabel" />}>
        <div className="row">
          <TextField
            className="col-md-3 col-sm-4"
            name="originalFilename"
            readOnly={true}
          />
          <DateField
            className="col-md-3 col-sm-4"
            name="acDigitizationDate"
            showTime={true}
          />
        </div>
        <div className="row">
          <SelectField
            className="col-md-3 col-sm-4"
            name="dcType"
            options={DCTYPE_OPTIONS}
          />
          <TextField className="col-md-3 col-sm-4" name="acCaption" />
          <TextField
            className="col-md-3 col-sm-4"
            name="acTags"
            multiLines={true}
            label={formatMessage("metadataBulkEditTagsLabel")}
          />
        </div>
        <div className="row">
          <ResourceSelectField<Person>
            className="col-md-3 col-sm-4"
            name="dcCreator"
            filter={filterBy(["displayName"])}
            model="agent-api/person"
            optionLabel={person => person.displayName}
            label={formatMessage("field_dcCreator.displayName")}
          />
        </div>
      </FieldSet>
      <FieldSet legend={<DinaMessage id="metadataRightsDetailsLabel" />}>
        <div className="row">
          <TextField className="col-md-3 col-sm-4" name="dcRights" />
          <ResourceSelectField<License>
            className="col-md-3 col-sm-4"
            name="license"
            filter={() => ({})}
            model="objectstore-api/license"
            optionLabel={license => license.titles[locale] ?? license.url}
          />
          <SelectField
            className="col-md-3 col-sm-4"
            name="publiclyReleasable"
            options={PUBLICLY_RELEASABLE_OPTIONS}
          />
          <NotPubliclyReleasableReasonField />
        </div>
      </FieldSet>
      <FieldSet legend={<DinaMessage id="managedAttributeListTitle" />}>
        <div className="row">
          <div className="col-sm-6">
            <ManagedAttributesEditor
              valuesPath="managedAttributeMap.values"
              managedAttributeApiPath="objectstore-api/managed-attribute"
              apiBaseUrl="/objectstore-api"
            />
          </div>
        </div>
      </FieldSet>
      {buttonBar}
    </DinaForm>
  );
}

function NotPubliclyReleasableReasonField() {
  const {
    values: { publiclyReleasable }
  } = useFormikContext<Metadata>();

  return publiclyReleasable ? null : (
    <TextField
      className="col-md-3 col-sm-4"
      name="notPubliclyReleasableReason"
      multiLines={true}
    />
  );
}

const DCTYPE_OPTIONS = [
  { label: "Image", value: "IMAGE" },
  { label: "Moving Image", value: "MOVING_IMAGE" },
  { label: "Sound", value: "SOUND" },
  { label: "Text", value: "TEXT" },
  { label: "Dataset", value: "DATASET" },
  { label: "Undetermined", value: "UNDETERMINED" }
];
