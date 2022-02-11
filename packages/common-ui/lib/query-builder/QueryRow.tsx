import { useState } from "react";
import {
  DateField,
  NumberField,
  QueryLogicSwitchField,
  SelectField,
  TextField
} from "..";
import { FaPlus, FaMinus } from "react-icons/fa";
import moment from "moment";
import { FormikContextType } from "formik";
export interface QueryRowProps {
  esIndexMapping: ESIndexMapping[];
  index: number;
  addRow?: () => void;
  removeRow?: (index) => void;
  name: string;
  form?: FormikContextType<QueryRowExportProps>;
}

export interface ESIndexMapping {
  value: string;
  label: string;
  type: string;
}

export interface QueryRowExportProps {
  fieldName: string;
  matchValue?: string;
  fieldRangeStart?: string;
  fieldRangeEnd?: string;
  matchType?: string;
  compoundQueryType?: string;
  number?: string;
  date?: string;
  boolean?: string;
  type?: string;
}

type queryRowMatchType = "PARTIAL_MATCH" | "EXACT_MATCH" | "BLANK_FIELD";
type queryRowBooleanType = "TRUE" | "FALSE";

const queryRowMatchOptions = [
  { label: "PARTIAL_MATCH", value: "match" },
  { label: "EXACT_MATCH", value: "term" }
];

const queryRowBooleanOptions = [
  { label: "TRUE", value: "true" },
  { label: "FALSE", value: "false" }
];

export function QueryRow(queryRowProps: QueryRowProps) {
  const { esIndexMapping, index, addRow, removeRow, name, form } =
    queryRowProps;
  const initVisibility = {
    text: false,
    date: false,
    boolean: false,
    number: false,
    numberRange: false,
    dateRange: false
  };
  const fieldName = form?.values?.[`${name}`]?.[`${index}`]?.fieldName;
  const fieldType = fieldName?.substring(
    fieldName?.lastIndexOf("(") + 1,
    fieldName?.lastIndexOf(")")
  );
  const visibilityOverridden =
    fieldType === "boolean"
      ? { boolean: true }
      : fieldType === "number"
      ? { number: true }
      : fieldType === "date"
      ? { date: true }
      : { text: true };
  const [visibility, setVisibility] = useState({
    ...initVisibility,
    ...visibilityOverridden
  });

  const initState = {
    matchValue: null,
    matchType: "match",
    date: moment().format("YYYY-MM-DD"),
    boolean: "true",
    number: null
  };

  function onSelectionChange(value, formik, idx) {
    const type = value.substring(value.indexOf("(") + 1, value.indexOf(")"));
    const state = {
      ...formik.values?.[`${name}`]?.[`${idx}`],
      ...initState,
      fieldName: value
    };

    formik.setFieldValue(`${name}[${idx}]`, state);
    switch (type) {
      case "text": {
        return setVisibility({ ...initVisibility, text: true });
      }
      case "date": {
        return setVisibility({ ...initVisibility, date: true });
      }
      case "boolean": {
        return setVisibility({ ...initVisibility, boolean: true });
      }
      case "long": {
        return setVisibility({ ...initVisibility, number: true });
      }
    }
  }

  const queryRowOptions = esIndexMapping?.map(prop => ({
    label: prop.label,
    value: prop.value + "(" + prop.type + ")"
  }));

  function fieldProps(fldName: string, idx: number) {
    return {
      name: `${name}[${idx}].${fldName}`
    };
  }
  return (
    <div className="row">
      <div className="col-md-6 d-flex">
        {index > 0 && (
          <div style={{ width: index > 0 ? "8%" : "100%" }}>
            <QueryLogicSwitchField
              name={fieldProps("compoundQueryType", index).name}
              removeLabel={true}
              className={"compoundQueryType" + index}
            />
          </div>
        )}
        <div style={{ width: index > 0 ? "92%" : "100%" }}>
          <SelectField
            name={fieldProps("fieldName", index).name}
            options={queryRowOptions}
            onChange={(value, formik) =>
              onSelectionChange(value, formik, index)
            }
            className={`flex-grow-1 me-2 ps-0`}
            removeLabel={true}
          />
        </div>
      </div>
      <div className="col-md-6">
        <div className="d-flex">
          {visibility.text && (
            <TextField
              name={fieldProps("matchValue", index).name}
              className="me-1 flex-fill"
              removeLabel={true}
            />
          )}
          {visibility.date && (
            <DateField
              name={fieldProps("date", index).name}
              className="me-1 flex-fill"
              removeLabel={true}
            />
          )}
          {visibility.text && (
            <SelectField
              name={fieldProps("matchType", index).name}
              options={queryRowMatchOptions}
              className="me-1 flex-fill"
              removeLabel={true}
            />
          )}
          {visibility.boolean && (
            <SelectField
              name={fieldProps("boolean", index).name}
              options={queryRowBooleanOptions}
              className="me-1 flex-fill"
              removeLabel={true}
            />
          )}
          {visibility.number && (
            <NumberField
              name={fieldProps("number", index).name}
              className="me-1 flex-fill"
              removeLabel={true}
            />
          )}

          {index === 0 ? (
            <FaPlus
              onClick={addRow as any}
              size="2em"
              style={{ cursor: "pointer" }}
              name={fieldProps("addRow", index).name}
            />
          ) : (
            <FaMinus
              onClick={() => removeRow?.(index)}
              size="2em"
              style={{ cursor: "pointer" }}
              name={fieldProps("removeRow", index).name}
            />
          )}
        </div>
      </div>
    </div>
  );
}
