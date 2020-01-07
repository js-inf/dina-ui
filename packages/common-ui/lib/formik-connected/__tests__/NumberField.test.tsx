import { Form, Formik } from "formik";
import NumberFormat from "react-number-format";
import { mountWithAppContext } from "../../test-util/mock-app-context";
import { NumberField } from "../NumberField";

const mockOnSubmit = jest.fn();

function getWrapper({ initialValues }) {
  return mountWithAppContext(
    <Formik initialValues={initialValues} onSubmit={mockOnSubmit}>
      <Form>
        <NumberField name="testField" />
      </Form>
    </Formik>
  );
}

describe("NumberField component", () => {
  it("Displays the field's label and value.", async () => {
    const wrapper = getWrapper({ initialValues: { testField: 123.23 } });

    expect(wrapper.find("label").text()).toEqual("Test Field");
    expect((wrapper.find("input").instance() as any).value).toEqual("123.23");
  });

  it("Changes the field's value.", async () => {
    const wrapper = getWrapper({ initialValues: { testField: 123.23 } });

    // Change the value.
    wrapper.find(NumberFormat).prop<any>("onValueChange")({
      floatValue: 456.78
    });

    // Submit the form.
    wrapper.find("form").simulate("submit");
    await new Promise(setImmediate);

    // Expect the correct value to have been submitted.
    expect(mockOnSubmit).lastCalledWith(
      { testField: 456.78 },
      expect.anything()
    );
  });

  it("Sets the field value as null if the input is blank.", async () => {
    const wrapper = getWrapper({ initialValues: { testField: 123.23 } });

    // Change the value to undefined.
    wrapper.find(NumberFormat).prop<any>("onValueChange")({
      floatValue: undefined
    });

    // Submit the form.
    wrapper.find("form").simulate("submit");
    await new Promise(setImmediate);

    // Expect the correct value to have been submitted.
    expect(mockOnSubmit).lastCalledWith({ testField: null }, expect.anything());
  });

  it("Shows a blank input when the formik value becomes undefined.", async () => {
    const wrapper = getWrapper({ initialValues: { testField: 123.23 } });
    expect(wrapper.find("input").prop("value")).toEqual("123.23");

    // Change the value to undefined.
    (wrapper.find(Formik).instance() as any).setFieldValue(
      "testField",
      undefined
    );
    wrapper.update();

    // The input should become blank.
    expect(wrapper.find("input").prop("value")).toEqual("");
  });
});
