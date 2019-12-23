import { Formik } from "formik";
import { noop } from "lodash";
import { mountWithAppContext } from "../../test-util/mock-app-context";
import { FieldView } from "../FieldView";

describe("FieldView component", () => {
  it("Renders the label and field value. ( minimal use case )", () => {
    const wrapper = mountWithAppContext(
      <Formik
        initialValues={{ testObject: { name: "testName" } }}
        onSubmit={noop}
      >
        <FieldView name="testObject.name" />
      </Formik>
    );

    expect(wrapper.find("label").text()).toEqual("Test Object Name");
    expect(wrapper.find("p").text()).toEqual("testName");
  });

  it("Renders with a custom label.", () => {
    const wrapper = mountWithAppContext(
      <Formik
        initialValues={{ testObject: { name: "testName" } }}
        onSubmit={noop}
      >
        <FieldView label="Custom Label" name="testObject.name" />
      </Formik>
    );

    expect(wrapper.find("label").text()).toEqual("Custom Label");
  });
});
