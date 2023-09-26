import { startCase, uniq } from "lodash";
import React, { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useLocalStorage } from "@rehooks/local-storage";

export interface CheckboxProps {
  id: string;
  name?: string;
  handleClick: (e: any) => void;
  isChecked: boolean;
  isField?: boolean;
}

export function Checkbox({
  id,
  name,
  handleClick,
  isChecked,
  isField
}: CheckboxProps) {
  const { formatMessage, messages } = useIntl();
  // Try to use dina messages first, if not just use the string directly.
  const messageKey = isField ? `field_${id}` : id;
  const label =
    name ??
    (messages[messageKey]
      ? formatMessage({ id: messageKey as any })
      : messages[id]
      ? formatMessage({ id: id as any })
      : startCase(id));
  return (
    <div>
      <input
        id={id}
        type={"checkbox"}
        onChange={handleClick}
        checked={isChecked}
        style={{
          marginRight: "0.3rem",
          height: "1.3rem",
          width: "1.3rem"
        }}
      />
      <span>{label}</span>
    </div>
  );
}

interface CheckboxResource {
  accessorKey: string;
  id: string;
  [key: string]: any;
}
export interface UseGroupedCheckboxWithLabelProps {
  resources: CheckboxResource[];
  isField?: boolean;
  indexName?: string;
}

export function useGroupedCheckboxWithLabel({
  resources,
  isField,
  indexName
}: UseGroupedCheckboxWithLabelProps) {
  const [list, setList] = useState<CheckboxResource[]>(getResourcesWithId());
  const [checkedColumnIds, setCheckedColumnIds] = useLocalStorage<string[]>(
    `${indexName}_columnChooser`,
    uniq([...list.map((resource) => resource.id ?? ""), "selectColumn"])
  );
  const [isCheckAll, setIsCheckAll] = useState<boolean>(
    checkedColumnIds.length === list.length
  );

  const handleSelectAll = (_e) => {
    setIsCheckAll(!isCheckAll);
    setCheckedColumnIds(uniq([...list.map((li) => li.id), "selectColumn"]));
    if (isCheckAll) {
      setCheckedColumnIds(["selectColumn"]);
    }
  };

  const handleClick = (e) => {
    const { id, checked } = e.target;
    if (!checked) {
      setCheckedColumnIds(
        uniq([
          ...checkedColumnIds.filter((item) => item !== id),
          "selectColumn"
        ])
      );
      setIsCheckAll(false);
    } else {
      if ([...checkedColumnIds, id].length === list.length) {
        setIsCheckAll(true);
      }
      setCheckedColumnIds(uniq([...checkedColumnIds, id, "selectColumn"]));
    }
  };

  const groupedCheckBoxes = GroupedCheckboxes({
    handleSelectAll,
    isCheckAll,
    list: list.filter((item) => item.id !== "selectColumn"),
    handleClick,
    checkedColumnIds,
    isField
  });

  return { groupedCheckBoxes, checkedColumnIds };

  function getResourcesWithId() {
    return resources.map((resource) => {
      if (!resource.id) {
        resource.id = resource.accessorKey.split(".").at(-1) as string;
      }
      return resource;
    });
  }
}

export interface GroupedCheckboxesProps {
  handleSelectAll: (_e: any) => void;
  isCheckAll: boolean;
  list: CheckboxResource[];
  handleClick: (e: any) => void;
  checkedColumnIds: any;
  isField: boolean | undefined;
}

function GroupedCheckboxes({
  handleSelectAll,
  isCheckAll,
  list,
  handleClick,
  checkedColumnIds,
  isField
}: GroupedCheckboxesProps) {
  return (
    <div>
      <Checkbox
        id="selectAll"
        handleClick={handleSelectAll}
        isChecked={isCheckAll}
      />
      {list.map(({ id }) => {
        return (
          <>
            <Checkbox
              key={id}
              id={id}
              handleClick={handleClick}
              isChecked={checkedColumnIds.includes(id)}
              isField={isField}
            />
          </>
        );
      })}
    </div>
  );
}