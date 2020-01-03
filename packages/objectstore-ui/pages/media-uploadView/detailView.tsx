import { ApiClientContext, LoadingSpinner, Query } from "common-ui";
import { GetParams } from "kitsu";
import { omitBy } from "lodash";
import withRouter, { WithRouterProps } from "next/dist/client/with-router";
import Link from "next/link";
import { useCallback, useContext } from "react";
import { useAsyncRun, useAsyncTask } from "react-hooks-async";
import { FileDownLoadResponseAttributes } from "types/objectstore-api/resources/FileDownLoadResponse";
import { Metadata } from "types/objectstore-api/resources/Metadata";
import { isArray, isUndefined } from "util";
import { Head, Nav } from "../../components";
import {
  ObjectStoreMessage,
  useObjectStoreIntl
} from "../../intl/objectstore-intl";
import { GenerateManagedAttributesView } from "../../page-fragments/viewManagedAttributes";
import ViewMetadataFormPage from "../../page-fragments/viewMetadata";
import ViewTagsForm from "../../page-fragments/viewTags";

interface DownloadFileResponse {
  error?: string;
  loading?: boolean;
  imgResponse: FileDownLoadResponseAttributes;
}
function useImageQuery(id: string): DownloadFileResponse {
  const { apiClient } = useContext(ApiClientContext);

  // Memoize the callback. Only re-create it when the query spec changes.
  const fetchData = useCallback(() => {
    const getParams = omitBy<GetParams>({}, isUndefined);

    const downloadResponse = apiClient.axios.get(
      "/v1/file/mybucket/" + id,
      getParams
    );
    return downloadResponse;
  }, [id]);

  // fetchData function should re-run when the query spec changes.
  const task = useAsyncTask(fetchData);
  useAsyncRun(task);

  return {
    error: task.error ? task.error.message : "",
    imgResponse: task.result
      ? {
          body: task.result.data,
          headers: task.result.headers,
          status: task.result.status
        }
      : null,
    loading: !!task.pending
  };
}

export function ObjectStoreDetailsPage({ router }: WithRouterProps) {
  const id = router?.query?.id;
  const stringId = isArray(id) ? id[0] : id;
  const { imgResponse } = useImageQuery(stringId);
  const { formatMessage } = useObjectStoreIntl();

  return (
    <div>
      <Head title={formatMessage("objectStoreDetailsTitle")} />
      <Nav />
      <div>
        <h4>
          <ObjectStoreMessage id="objectStoreDetailsTitle" />
        </h4>
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-6">
              <a
                href={`/media-uploadView/detailEdit?id=${id}`}
                className="btn btn-info"
              >
                Edit View
              </a>
            </div>
            <div style={{ marginBottom: "25px", marginTop: "25px" }} />
          </div>
          <div className="row">
            {imgResponse &&
            imgResponse.headers["content-type"].indexOf("image") > -1 ? (
              <div className="col-md-5 ">
                <img
                  src={`/api/v1/file/mybucket/${id}`}
                  className="img-fluid"
                  style={{ maxWidth: "100%", height: "auto" }}
                />
              </div>
            ) : imgResponse &&
              imgResponse.headers["content-type"].indexOf("pdf") > -1 ? (
              <div className="col-md-5">
                <img
                  src={`https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg`}
                  style={{ width: 400, height: "80%" }}
                />
              </div>
            ) : imgResponse &&
              imgResponse.headers["content-type"].indexOf("/msword") > -1 ? (
              <div className="col-md-5">
                <img
                  src={`https://cdn2.iconfinder.com/data/icons/flat-file-types-1-1/300/icon_file-DOC_plano-512.png`}
                  style={{ width: 400, height: "80%" }}
                />
              </div>
            ) : imgResponse ? (
              <div className="col-md-5">
                <img
                  src={`https://ya-webdesign.com/transparent250_/files-icon-png.png`}
                  style={{ width: 400, height: "80%" }}
                />
              </div>
            ) : (
              <div className="col-md-5">
                <p>
                  <ObjectStoreMessage id="noFileToDisplay" />
                </p>
              </div>
            )}

            <Query<Metadata>
              query={{
                filter: { fileIdentifier: `${id}` },
                include: "acMetadataCreator,managedAttribute",
                path: "metadata/"
              }}
            >
              {({ loading, response }) => (
                <div className="col-md-7">
                  <LoadingSpinner loading={loading} />
                  {response && response.data[0] && (
                    <div>
                      <div style={{ marginBottom: "20px", marginTop: "20px" }}>
                        <h5 style={{ color: "#1465b7" }}>Metadata</h5>
                      </div>
                      <div>
                        <ViewMetadataFormPage metadata={response.data[0]} />
                      </div>
                      <hr
                        style={{
                          borderColor: "black",
                          marginLeft: "0",
                          width: "80%"
                        }}
                      />
                      <div style={{ marginBottom: "20px", marginTop: "20px" }}>
                        <h5 style={{ color: "#1465b7" }}>Managed Attributes</h5>
                      </div>
                      {response.data[0] &&
                        response.data[0].managedAttribute &&
                        response.data[0].managedAttribute.map(ma => (
                          <GenerateManagedAttributesView ma={ma} />
                        ))}
                      <hr
                        style={{
                          borderColor: "black",
                          marginLeft: "0",
                          width: "80%"
                        }}
                      />
                      <div style={{ marginBottom: "20px", marginTop: "20px" }}>
                        <h5 style={{ color: "#1465b7" }}>Tags</h5>
                      </div>
                      <ViewTagsForm meta={response.data[0]} />
                    </div>
                  )}
                </div>
              )}
            </Query>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withRouter(ObjectStoreDetailsPage);
