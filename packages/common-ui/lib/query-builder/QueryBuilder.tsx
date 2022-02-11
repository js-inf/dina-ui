import { FieldWrapperProps, useApiClient } from "..";
import { ESIndexMapping, QueryRow } from "./QueryRow";
import { FieldArray } from "formik";
import moment from "moment";

interface QueryBuilderProps extends FieldWrapperProps {
  esIndexMapping?: ESIndexMapping[];
}
export function QueryBuilder({ name, esIndexMapping }: QueryBuilderProps) {
  return (
    <FieldArray name={name}>
      {fieldArrayProps => {
        const elements: [] = fieldArrayProps.form.values.queryRows;

        function addRow() {
          fieldArrayProps.push(
            <QueryRow
              name={fieldArrayProps.name}
              esIndexMapping={esIndexMapping as any}
              index={elements?.length ?? 0}
              removeRow={removeRow}
              addRow={addRow}
              form={fieldArrayProps.form}
            />
          );
          // initialize the logic switch value to be "and"//
          fieldArrayProps.form.setFieldValue(
            `${fieldArrayProps.name}[${
              elements?.length ?? 0
            }].compoundQueryType`,
            "and"
          );
        }

        function removeRow(index) {
          fieldArrayProps.remove(index);
        }

        return elements?.length > 0
          ? elements?.map((_, index) => (
              <QueryRow
                name={fieldArrayProps.name}
                key={index}
                index={index}
                addRow={addRow}
                removeRow={removeRow}
                esIndexMapping={esIndexMapping as any}
                form={fieldArrayProps.form}
              />
            ))
          : null;
      }}
    </FieldArray>
  );
}
