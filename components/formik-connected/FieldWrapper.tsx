import titleCase from "title-case";

export interface LabelWrapperParams {
  /** The CSS classes of the div wrapper. */
  className?: string;

  /** The name of the field. */
  name: string;

  /** The label for the field. */
  label?: string;
}

export interface FieldWrapperProps extends LabelWrapperParams {
  children: JSX.Element;
}

/**
 * Wraps a field with a label of the field's name. The label can be auto-generated as a title-case
 * version of the field name, or can be specified as a custom label string.
 *
 * This component also wraps the field in a div with the className `${fieldName}-field` for testing purposes.
 * e.g. select the "description" text input using wrapper.find(".description-field input").
 */
export function FieldWrapper({
  className,
  name,
  label = titleCase(name),
  children
}: FieldWrapperProps) {
  return (
    <div className={className}>
      <div className={`form-group ${name}-field`}>
        <label>
          <strong>{label}</strong>
        </label>
        {children}
      </div>
    </div>
  );
}
