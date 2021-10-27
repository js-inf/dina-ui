import { FieldWrapper, LabelWrapperParams, useQuery } from "common-ui";
import CreatableSelect, { CreatableProps } from "react-select/creatable";
import { GroupBase } from "react-select";
import { useDinaIntl } from "../../intl/dina-ui-intl";
import { Vocabulary } from "../../types/collection-api";

export interface VocabularySelectFieldProps extends LabelWrapperParams {
  path: string;
  selectProps?: Partial<
    CreatableProps<VocabularyOption, true, GroupBase<VocabularyOption>>
  >;
}

export interface VocabularyOption {
  label: string;
  value: string;
}

/**
 * Multi-select field backed by the vocabulary endpoint.
 * Allows the user to add options not found from the list.
 */
export function VocabularySelectField({
  path,
  selectProps,
  ...labelWrapperProps
}: VocabularySelectFieldProps) {
  const { response, loading } = useQuery<Vocabulary>({ path });
  const { locale, formatMessage } = useDinaIntl();

  const options =
    response?.data?.vocabularyElements?.map(el => {
      const value = el.labels?.[locale] || el.name || String(el);
      return { label: value, value };
    }) ?? [];

  function toOption(value: string): VocabularyOption {
    return { label: value, value };
  }

  return (
    <FieldWrapper
      // Re-initialize the component if the labels change:
      key={options.map(option => option.label).join()}
      {...labelWrapperProps}
    >
      {({ setValue, value }) => {
        const selectValue = (value ? value.map(val => val.trim()) : []).map(
          toOption
        );

        function setAsStringArray(selected: VocabularyOption[]) {
          setValue(selected.map(option => option.value));
        }

        return (
          <CreatableSelect<VocabularyOption, true>
            isClearable={true}
            options={options}
            isLoading={loading}
            isMulti={true}
            onChange={setAsStringArray}
            value={selectValue}
            formatCreateLabel={inputValue => `Add "${inputValue}"`}
            placeholder={formatMessage("selectOrType")}
            {...selectProps}
          />
        );
      }}
    </FieldWrapper>
  );
}