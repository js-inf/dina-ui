import classNames from "classnames";
import { useContext } from "react";
import { DinaFormContext, FieldSpy, FieldSpyRenderProps } from "..";
import { DinaFormSection, DinaFormSectionProps } from "./DinaForm";

export interface FieldSetProps extends DinaFormSectionProps {
  /** fieldset title. */
  legend: JSX.Element;

  className?: string;

  id?: string;

  /** The fieldName if  this fieldset corresponds to a DinaForm field. */
  fieldName?: string;

  /** Renders this JSX to the right of the FieldSet legend. */
  wrapLegend?: (legend: JSX.Element) => JSX.Element;
}

/** Wrapper around HTML fieldset element with Bootstrap styling. */
export function FieldSet({
  legend,
  className,
  id,
  fieldName,
  wrapLegend,
  ...formSectionProps
}: FieldSetProps) {
  const isInForm = !!useContext(DinaFormContext);

  const legendElement = (
    <legend className={classNames("w-auto", fieldName && "field-label")}>
      <h2 className="fieldset-h2-adjustment">{legend}</h2>
    </legend>
  );

  const fieldSetProps = (fieldSpyProps?: FieldSpyRenderProps) => ({
    className: classNames("mb-3 border card px-4 py-2", className),
    id,
    children: (
      <>
        <div
          className={classNames(
            "legend-wrapper",
            fieldSpyProps?.bulkContext?.bulkEditClasses,
            fieldSpyProps?.isChanged && "changed-field"
          )}
        >
          {wrapLegend?.(legendElement) ?? legendElement}
        </div>
        <DinaFormSection {...formSectionProps} />
      </>
    )
  });

  return isInForm ? (
    // Show the green fieldset legend/title when the field is bulk edited:
    <FieldSpy fieldName={fieldName ?? "notAField"}>
      {(_value, fieldSpyProps) => (
        <fieldset {...fieldSetProps(fieldSpyProps)} />
      )}
    </FieldSpy>
  ) : (
    <fieldset {...fieldSetProps()} />
  );
}
