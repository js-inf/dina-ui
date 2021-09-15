import {
  BackButton,
  ButtonBar,
  DateField,
  DinaForm,
  DinaFormSubmitParams,
  SubmitButton,
  TextField,
  useDinaFormContext,
  useQuery,
  withResponse,
  ResourceSelectField,
  filterBy
} from "common-ui";
import { PersistedResource } from "kitsu";
import { NextRouter, useRouter } from "next/router";
import {
  GroupSelectField,
  Head,
  InstitutionSelectField,
  Nav
} from "../../../components";
import { DinaMessage, useDinaIntl } from "../../../intl/dina-ui-intl";
import { Collection, Institution } from "../../../types/collection-api";
import { toPairs, fromPairs } from "lodash";

export default function CollectionEditPage() {
  const router = useRouter();
  const { formatMessage } = useDinaIntl();

  const {
    query: { id }
  } = router;

  const collectionQuery = useQuery<Collection>(
    { path: `collection-api/collection/${id}`, include: "institution" },
    { disabled: !id }
  );

  const title = id ? "editCollectionTitle" : "addCollectionTitle";

  return (
    <div>
      <Head title={formatMessage(title)} />
      <Nav />
      <main className="container">
        {id ? (
          withResponse(collectionQuery, ({ data }) => (
            <CollectionForm collection={data} router={router} />
          ))
        ) : (
          <CollectionForm router={router} />
        )}
      </main>
    </div>
  );
}

export interface CollectionFormProps {
  collection?: PersistedResource<Collection>;
  router: NextRouter;
}

export function CollectionForm({ collection, router }: CollectionFormProps) {
  const initialValues = collection
    ? {
        ...collection,
        // Convert multilingualDescription to editable Dictionary format:
        multilingualDescription: fromPairs<string | undefined>(
          collection.multilingualDescription?.descriptions?.map(
            ({ desc, lang }) => [lang ?? "", desc ?? ""]
          )
        )
      }
    : { type: "collection", institution: undefined };

  const {
    query: { id }
  } = router;

  const title = id ? "editCollectionTitle" : "addCollectionTitle";

  async function onSubmit({
    submittedValues,
    api: { save }
  }: DinaFormSubmitParams<Collection>) {
    const input: Collection = {
      ...submittedValues,
      // Convert the editable format to the stored format:
      multilingualDescription: {
        descriptions: toPairs(submittedValues.multilingualDescription).map(
          ([lang, desc]) => ({ lang, desc: desc as any })
        )
      }
    };

    const [savedCollection] = await save(
      [
        {
          resource: input,
          type: "collection"
        }
      ],
      { apiBaseUrl: "/collection-api" }
    );
    await router.push(`/collection/collection/view?id=${savedCollection.id}`);
  }

  const buttonBar = (
    <ButtonBar>
      <BackButton
        entityId={collection?.id}
        entityLink="/collection/collection"
      />
      <SubmitButton className="ms-auto" />
    </ButtonBar>
  );

  return (
    <DinaForm<Collection> initialValues={initialValues} onSubmit={onSubmit}>
      {buttonBar}
      <CollectionFormFields title={title} />
    </DinaForm>
  );
}

/** Re-usable field layout between edit and view pages. */
export function CollectionFormFields({ title }) {
  const { readOnly } = useDinaFormContext();
  const { formatMessage } = useDinaIntl();

  return (
    <div>
      <div className="row">
        <GroupSelectField
          name="group"
          enableStoredDefaultGroup={true}
          className="col-md-6"
          showAllGroups={true}
        />
      </div>
      <h1 id="wb-cont">
        <DinaMessage id={title} />
      </h1>
      <div className="row">
        <ResourceSelectField<Institution>
          name="institution"
          readOnlyLink="/collection/institution/view?id="
          filter={filterBy(["name"])}
          model="collection-api/institution"
          optionLabel={institution => institution.name as any}
          className="col-md-6"
        />
        <ResourceSelectField<Collection>
          name="collection"
          readOnlyLink="/collection/collection/view?id="
          filter={filterBy(["name"])}
          model="collection-api/collection"
          optionLabel={collection => collection.name as any}
          className="col-md-6"
          isDisabled={true}
          label={formatMessage("parentCollectionLabel")}
        />
      </div>
      <div className="row">
        <TextField className="col-md-6" name="name" />
        <TextField className="col-md-6" name="code" noSpace={true} />
      </div>
      <div className="row">
        <TextField
          className="english-description col-md-6"
          name="multilingualDescription.en"
          label={formatMessage("field_description.en")}
          multiLines={true}
        />
        <TextField
          className="french-description col-md-6"
          name="multilingualDescription.fr"
          label={formatMessage("field_description.fr")}
          multiLines={true}
        />
      </div>
      {readOnly && (
        <div className="row">
          <DateField className="col-md-6" name="createdOn" />
          <TextField className="col-md-6" name="createdBy" />
        </div>
      )}
    </div>
  );
}
