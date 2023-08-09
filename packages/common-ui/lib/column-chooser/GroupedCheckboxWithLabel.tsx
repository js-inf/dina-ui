import { startCase } from "lodash";
import { DinaMessage } from "packages/dina-ui/intl/dina-ui-intl";
import React, { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { Value } from "sass";

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
      : startCase(id));
  return (
    <div>
      <label>
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
      </label>
    </div>
  );
}

interface CheckboxResource {
  id: string;
  [key: string]: any;
}
export interface GroupedCheckboxWithLabelProps {
  resources: CheckboxResource[];
  isField?: boolean;
}

export function GroupedCheckboxWithLabel({
  resources,
  isField
}: GroupedCheckboxWithLabelProps) {
  const [isCheckAll, setIsCheckAll] = useState(false);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [list, setList] = useState<CheckboxResource[]>([]);

  useEffect(() => {
    setList(resources);
  }, [list]);

  const handleSelectAll = (_e) => {
    setIsCheckAll(!isCheckAll);
    setCheckedIds(list.map((li) => li.id));
    if (isCheckAll) {
      setCheckedIds([]);
    }
  };

  const handleClick = (e) => {
    const { id, checked } = e.target;
    setCheckedIds([...checkedIds, id]);
    if (!checked) {
      setCheckedIds(checkedIds.filter((item) => item !== id));
    }
  };

  const groupedCheckboxes = list.map(({ id }) => {
    return (
      <>
        <Checkbox
          key={id}
          id={id}
          handleClick={handleClick}
          isChecked={checkedIds.includes(id)}
          isField={isField}
        />
      </>
    );
  });

  return (
    <div>
      <Checkbox
        id="selectAll"
        handleClick={handleSelectAll}
        isChecked={isCheckAll}
      />
      {groupedCheckboxes}
    </div>
  );
}
