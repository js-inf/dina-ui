import {
  BackToListButton,
  ButtonBar,
  DeleteButton,
  LoadingSpinner,
  useQuery
} from "common-ui";
import Link from "next/link";
import { useRouter } from "next/router";
import { Head, Nav } from "../../components";
import { FileView } from "../../components/file-view/FileView";
import { MetadataDetails } from "../../components/metadata/MetadataDetails";
import { ObjectStoreMessage } from "../../intl/objectstore-intl";
import { Metadata } from "../../types/objectstore-api";

const OBJECT_DETAILS_PAGE_CSS = `
  .file-viewer-wrapper img {
    max-width: 100%;
    height: auto;
  }
`;

export default function MetadataViewPage() {
  const router = useRouter();

  const id = router.query.id as string;

  const { loading, response } = useQuery<Metadata>(
    {
      include: "acDerivedFrom,managedAttributeMap",
      path: `metadata/${id}`
    },
    {
      joinSpecs: [
        {
          apiBaseUrl: "/v1",
          idField: "acMetadataCreator",
          joinField: "acMetadataCreator",
          path: metadata => `agent/${metadata.acMetadataCreator}`
        },
        {
          apiBaseUrl: "/v1",
          idField: "dcCreator",
          joinField: "dcCreator",
          path: metadata => `agent/${metadata.dcCreator}`
        }
      ]
    }
  );

  if (loading) {
    return <LoadingSpinner loading={true} />;
  }

  if (response) {
    const metadata = response.data;

    const fileId =
      metadata.acSubType === "THUMBNAIL"
        ? `${metadata.fileIdentifier}.thumbnail`
        : metadata.fileIdentifier;

    const filePath = `/api/file/${metadata.bucket}/${fileId}`;
    const fileType = metadata.fileExtension.replace(/\./, "").toLowerCase();

    return (
      <div>
        <Head title={metadata.originalFilename} />
        <Nav />
        <ButtonBar>
          <Link href={`/metadata/edit?ids=${id}`}>
            <a className="btn btn-primary">
              <ObjectStoreMessage id="editButtonText" />
            </a>
          </Link>
          <DeleteButton
            id={id}
            postDeleteRedirect="/object/list"
            type="metadata"
          />
          <BackToListButton entityLink="object" />
        </ButtonBar>
        <style>{OBJECT_DETAILS_PAGE_CSS}</style>
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-4">
              <FileView
                clickToDownload={true}
                filePath={filePath}
                fileType={fileType}
              />
            </div>
            <div className="col-md-8">
              <div className="container">
                <div className="form-group">
                  <Link href={`/metadata/edit?ids=${id}`}>
                    <a className="btn btn-primary">
                      <ObjectStoreMessage id="editButtonText" />
                    </a>
                  </Link>
                </div>
                <MetadataDetails metadata={metadata} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
