import Link from "next/link";
import { MaterialSample } from "../../../types/collection-api";

export interface MaterialSampleBreadCrumbProps {
  disableLastLink?: boolean;
  materialSample: MaterialSample;
}

export function MaterialSampleBreadCrumb({
  disableLastLink,
  materialSample
}: MaterialSampleBreadCrumbProps) {
  const parentPath = [...(materialSample.hierarchy?.slice(1) ?? [])].reverse();

  const displayName = materialSample.materialSampleName;

  return (
    <ol
      className="breadcrumb mb-3"
      style={{ "--bs-breadcrumb-divider": "'>'" } as any}
    >
      {parentPath.map(node => (
        <li className="breadcrumb-item" key={node.uuid}>
          <Link href={`/collection/material-sample/view?id=${node.uuid}`}>
            <a>{node.name}</a>
          </Link>
        </li>
      ))}
      <li className="breadcrumb-item">
        <strong>
          {!disableLastLink ? (
            <Link
              href={`/collection/material-sample/view?id=${materialSample.id}`}
            >
              <a>{displayName}</a>
            </Link>
          ) : (
            displayName
          )}
        </strong>
      </li>
    </ol>
  );
}