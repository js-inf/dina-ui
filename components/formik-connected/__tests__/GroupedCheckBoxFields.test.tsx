import { mount } from "enzyme";
import { Form, Formik } from "formik";
import { useEffect } from "react";
import { Sample } from "types/seqdb-api";
import { useGroupedCheckBoxes } from "../GroupedCheckBoxFields";

const TEST_SAMPLES: Sample[] = [
  { id: 1, name: "1" },
  { id: 2, name: "2" },
  { id: 3, name: "3" },
  { id: 4, name: "4" },
  { id: 5, name: "5" }
] as any[];

const mockOnSubmit = jest.fn();

function TestComponent() {
  const { CheckBoxField, setAvailableItems } = useGroupedCheckBoxes<any>({
    fieldName: "checkedIds"
  });

  useEffect(() => {
    setAvailableItems(TEST_SAMPLES);
  }, []);

  return (
    <Formik initialValues={{ checkedIds: {} }} onSubmit={mockOnSubmit}>
      <Form>
        {TEST_SAMPLES.map(s => (
          <CheckBoxField key={s.id} resource={s} />
        ))}
      </Form>
    </Formik>
  );
}

describe("Grouped check boxes hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Renders checkboxes.", () => {
    const wrapper = mount(<TestComponent />);
    expect(wrapper.find("input[type='checkbox']").length).toEqual(5);
  });

  it("Sets the checked ID in the formik state.", async () => {
    const wrapper = mount(<TestComponent />);
    // Check the third checkbox.
    wrapper
      .find("input[type='checkbox']")
      .at(2)
      .prop("onClick")({ target: { checked: true } } as any);

    wrapper.find("form").simulate("submit");
    await new Promise(setImmediate);

    expect(mockOnSubmit).lastCalledWith(
      { checkedIds: { "3": true } },
      expect.anything()
    );
  });

  it("Lets you shift+click to toggle multiple check boxes at a time.", async () => {
    const wrapper = mount(<TestComponent />);

    // Check the second checkbox.
    wrapper
      .find("input[type='checkbox']")
      .at(1)
      .prop("onClick")({ target: { checked: true } } as any);

    wrapper.update();

    // Shift+click the fourth checkbox.
    wrapper
      .find("input[type='checkbox']")
      .at(3)
      .prop("onClick")({ shiftKey: true, target: { checked: true } } as any);

    wrapper.update();

    // Boxes 2 to 4 should be checked.
    expect(
      wrapper.find("input[type='checkbox']").map(i => i.prop("value"))
    ).toEqual([false, true, true, true, false]);

    wrapper.find("form").simulate("submit");
    await new Promise(setImmediate);

    expect(mockOnSubmit).lastCalledWith(
      { checkedIds: { "2": true, "3": true, "4": true } },
      expect.anything()
    );
  });

  it("Multi-toggles checkboxes even when they are in reverse order.", async () => {
    const wrapper = mount(<TestComponent />);

    // Click the fourth checkbox.
    wrapper
      .find("input[type='checkbox']")
      .at(3)
      .prop("onClick")({ target: { checked: true } } as any);
    wrapper.update();

    // Shift+click the second checkbox.
    wrapper
      .find("input[type='checkbox']")
      .at(1)
      .prop("onClick")({ shiftKey: true, target: { checked: true } } as any);
    wrapper.update();

    // Boxes 2 to 4 should be checked.
    expect(
      wrapper.find("input[type='checkbox']").map(i => i.prop("value"))
    ).toEqual([false, true, true, true, false]);

    wrapper.find("form").simulate("submit");
    await new Promise(setImmediate);

    expect(mockOnSubmit).lastCalledWith(
      { checkedIds: { "2": true, "3": true, "4": true } },
      expect.anything()
    );
  });
});
