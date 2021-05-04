import { DinaFormSection, DinaFormSectionProps } from "./DinaForm";

export interface FieldSetProps extends DinaFormSectionProps {
  /** fieldset title. */
  legend: JSX.Element;
}

/** Wrapper around HTML fieldset element with Bootstrap styling. */
export function FieldSet({ legend, ...formSectionProps }: FieldSetProps) {
  return (
    <fieldset className="form-group border card px-4 py-2">
      <legend className="w-auto">{legend}</legend>
      <DinaFormSection {...formSectionProps} />
    </fieldset>
  );
}