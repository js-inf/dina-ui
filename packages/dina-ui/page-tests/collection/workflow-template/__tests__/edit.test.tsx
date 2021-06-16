import { SaveArgs } from "common-ui";
import { ReactWrapper } from "enzyme";
import { PersistedResource } from "kitsu";
import Select from "react-select";
import ReactSwitch from "react-switch";
import { WorkflowTemplateForm } from "../../../../pages/collection/workflow-template/edit";
import { mountWithAppContext } from "../../../../test-util/mock-app-context";
import {
  CollectingEvent,
  PreparationProcessDefinition
} from "../../../../types/collection-api";

const mockOnSaved = jest.fn();

const TEST_GROUP_1 = {
  type: "group",
  name: "test-group-1",
  labels: { en: "Test Group 1" }
};

const TEST_PREP_TYPE = {
  id: "100",
  type: "preparation-type",
  name: "test-prep-type"
};

function testCollectionEvent(): Partial<CollectingEvent> {
  return {
    startEventDateTime: "2021-04-13",
    id: "321",
    type: "collecting-event",
    group: "test group"
  };
}

const mockGet = jest.fn<any, any>(async path => {
  switch (path) {
    case "user-api/group":
      return { data: [TEST_GROUP_1] };
    case "objectstore-api/metadata":
      return { data: [] };
    case "collection-api/coordinate-system":
      return { data: [] };
    case "collection-api/srs":
      return { data: [] };
    case "collection-api/collecting-event":
      return { data: [testCollectionEvent()] };
    case "collection-api/collecting-event/321?include=collectors,attachment":
      return { data: testCollectionEvent() };
    case "agent-api/person":
      return { data: [] };
    case "collection-api/preparation-type":
      return { data: [TEST_PREP_TYPE] };
  }
});

const mockSave = jest.fn<any, any>(async (saves: SaveArgs[]) =>
  saves.map(save => {
    switch (save.type) {
      case "material-sample-action-definition":
        return { ...save.resource, id: "123" };
      default:
        console.error("No save return type defined for", save);
    }
  })
);

const apiContext = {
  apiClient: {
    get: mockGet
  },
  save: mockSave
};

/** Mount the form and provide test util functions. */
async function mountForm(
  existingActionDefinition?: PersistedResource<PreparationProcessDefinition>
) {
  const wrapper = mountWithAppContext(
    <WorkflowTemplateForm
      onSaved={mockOnSaved}
      fetchedActionDefinition={existingActionDefinition}
    />,
    { apiContext }
  );

  await new Promise(setImmediate);
  wrapper.update();

  const colEventSwitch = () =>
    wrapper.find(".enable-collecting-event").find(ReactSwitch);
  const catalogSwitch = () =>
    wrapper.find(".enable-catalogue-info").find(ReactSwitch);

  async function toggleDataComponent(
    switchElement: ReactWrapper<any>,
    val: boolean
  ) {
    switchElement.prop<any>("onChange")(val);
    if (!val) {
      // Click "yes" when asked Are You Sure:
      await new Promise(setImmediate);
      wrapper.update();
      wrapper.find(".modal-content form").simulate("submit");
    }
    await new Promise(setImmediate);
    wrapper.update();
  }

  async function toggleColEvent(val: boolean) {
    await toggleDataComponent(colEventSwitch(), val);
  }

  async function togglePreparations(val: boolean) {
    await toggleDataComponent(catalogSwitch(), val);
  }

  async function toggleActionType(
    val: PreparationProcessDefinition["actionType"]
  ) {
    wrapper
      .find(`input.actionType-${val}`)
      .simulate("change", { target: { checked: true } });
    await new Promise(setImmediate);
    wrapper.update();

    if (wrapper.find(".modal-content form").exists()) {
      wrapper.find(".modal-content form").simulate("submit");
    }
    await new Promise(setImmediate);
    wrapper.update();
  }

  async function fillOutRequiredFields() {
    // Set the name:
    wrapper
      .find(".workflow-main-details .name-field input")
      .simulate("change", { target: { value: "test-config" } });
    // Set the group:
    wrapper
      .find(".workflow-main-details .group-field")
      .find(Select)
      .prop<any>("onChange")({ value: TEST_GROUP_1.name });

    await new Promise(setImmediate);
    wrapper.update();
  }

  async function submitForm() {
    wrapper.find("form").simulate("submit");
    await new Promise(setImmediate);
    wrapper.update();
  }

  return {
    wrapper,
    toggleColEvent,
    togglePreparations,
    colEventSwitch,
    catalogSwitch,
    fillOutRequiredFields,
    submitForm,
    toggleActionType
  };
}

describe("Workflow template edit page", () => {
  beforeEach(jest.clearAllMocks);

  it("Renders the blank template edit page", async () => {
    const { colEventSwitch, catalogSwitch } = await mountForm();
    // Switches are off by default:
    expect(colEventSwitch().prop("checked")).toEqual(false);
    expect(catalogSwitch().prop("checked")).toEqual(false);
  });

  it("Submits a new ADD-type action-definition: minimal form submission.", async () => {
    const {
      toggleColEvent,
      togglePreparations,
      catalogSwitch,
      colEventSwitch,
      fillOutRequiredFields,
      submitForm
    } = await mountForm();

    // Enable the component toggles:
    await toggleColEvent(true);
    expect(colEventSwitch().prop("checked")).toEqual(true);
    await togglePreparations(true);
    expect(catalogSwitch().prop("checked")).toEqual(true);

    await fillOutRequiredFields();

    await submitForm();

    expect(mockOnSaved).lastCalledWith({
      actionType: "ADD",
      formTemplates: {
        // Both data components enabled but no fields defined:
        COLLECTING_EVENT: {
          templateFields: {}
        },
        MATERIAL_SAMPLE: {
          templateFields: {}
        }
      },
      group: "test-group-1",
      id: "123",
      name: "test-config",
      type: "material-sample-action-definition"
    });
  });

  it("Submits a new ADD-type action-definition: Only set collecting event template fields.", async () => {
    const { wrapper, toggleColEvent, fillOutRequiredFields, submitForm } =
      await mountForm();

    await fillOutRequiredFields();

    // Enable the component toggles:
    await toggleColEvent(true);

    // Include all col date fields:
    wrapper
      .find("input[name='includeAllCollectingDate']")
      .simulate("change", { target: { checked: true } });
    wrapper.find(".verbatimEventDateTime-field input").simulate("change", {
      target: { value: "test-verbatim-default-datetime" }
    });

    // Set default geo assertion lat/lng:
    wrapper
      .find(".dwcDecimalLatitude.row input[type='checkbox']")
      .simulate("change", { target: { checked: true } });
    wrapper
      .find(".dwcDecimalLongitude.row input[type='checkbox']")
      .simulate("change", { target: { checked: true } });
    wrapper
      .find(".dwcDecimalLatitude.row NumberFormat")
      .prop<any>("onValueChange")({ floatValue: 1 });
    wrapper
      .find(".dwcDecimalLongitude.row NumberFormat")
      .prop<any>("onValueChange")({ floatValue: 2 });

    // Only allow new attachments:
    wrapper
      .find("#collecting-event-section input.allow-new-checkbox")
      .simulate("change", { target: { checked: true } });

    await new Promise(setImmediate);
    wrapper.update();

    await submitForm();

    expect(mockOnSaved).lastCalledWith({
      actionType: "ADD",
      formTemplates: {
        COLLECTING_EVENT: {
          allowNew: true,
          templateFields: {
            "geoReferenceAssertions[0].dwcDecimalLatitude": {
              defaultValue: 1,
              enabled: true
            },
            "geoReferenceAssertions[0].dwcDecimalLongitude": {
              defaultValue: 2,
              enabled: true
            },
            startEventDateTime: {
              // No default value set:
              enabled: true
            },
            verbatimEventDateTime: {
              defaultValue: "test-verbatim-default-datetime",
              enabled: true
            }
          }
        }
      },
      group: "test-group-1",
      id: "123",
      name: "test-config",
      type: "material-sample-action-definition"
    });
  });

  it("Submits a new ADD-type action-definition: Only set preparations template fields.", async () => {
    const { wrapper, togglePreparations, fillOutRequiredFields, submitForm } =
      await mountForm();

    await fillOutRequiredFields();

    // Enable the component toggles:
    await togglePreparations(true);

    // Only allow new attachments:
    wrapper
      .find("#material-sample-attachments-section input.allow-new-checkbox")
      .simulate("change", { target: { checked: true } });

    // Set a default prep type:
    wrapper
      .find(".preparation-type input[type='checkbox']")
      .simulate("change", { target: { checked: true } });
    wrapper.find(".preparationType-field Select").prop<any>("onChange")({
      resource: TEST_PREP_TYPE
    });

    await submitForm();

    expect(mockOnSaved).lastCalledWith({
      actionType: "ADD",
      formTemplates: {
        MATERIAL_SAMPLE: {
          allowNew: true,
          templateFields: {
            preparationType: {
              defaultValue: {
                id: "100",
                name: "test-prep-type",
                type: "preparation-type"
              },
              enabled: true
            }
          }
        }
      },
      group: "test-group-1",
      id: "123",
      name: "test-config",
      type: "material-sample-action-definition"
    });
  });

  it("Submits a new ADD-type action-definition: Link to an existing Collecting Event.", async () => {
    const { wrapper, toggleColEvent, fillOutRequiredFields, submitForm } =
      await mountForm();

    await fillOutRequiredFields();

    // Enable the component toggles:
    await toggleColEvent(true);

    wrapper.find("button.collecting-event-link-button").simulate("click");

    await new Promise(setImmediate);
    wrapper.update();

    expect(wrapper.find(".attached-collecting-event-link").text()).toEqual(
      "Attached Collecting Event: 321"
    );

    await submitForm();

    expect(mockOnSaved).lastCalledWith({
      actionType: "ADD",
      formTemplates: {
        COLLECTING_EVENT: {
          templateFields: {
            // Only includes the linked collecting event's ID:
            id: {
              defaultValue: "321",
              enabled: true
            }
          }
        }
      },
      group: "test-group-1",
      id: "123",
      name: "test-config",
      type: "material-sample-action-definition"
    });
  });

  it("Edits an existing action-definition: Renders the form with minimal data.", async () => {
    const { colEventSwitch, catalogSwitch } = await mountForm({
      actionType: "ADD",
      formTemplates: {},
      group: "test-group-1",
      id: "123",
      name: "test-config",
      type: "material-sample-action-definition"
    });

    // Checkboxes are unchecked:
    expect(colEventSwitch().prop("checked")).toEqual(false);
    expect(catalogSwitch().prop("checked")).toEqual(false);
  });

  it("Edits an existing action-definition: Can unlink an existing Collecting Event.", async () => {
    const { wrapper, colEventSwitch, catalogSwitch, submitForm } =
      await mountForm({
        actionType: "ADD",
        formTemplates: {
          COLLECTING_EVENT: {
            allowExisting: false,
            allowNew: false,
            templateFields: {
              id: {
                enabled: true,
                defaultValue: "321"
              }
            }
          }
        },
        group: "test-group-1",
        id: "123",
        name: "test-config",
        type: "material-sample-action-definition"
      });

    expect(colEventSwitch().prop("checked")).toEqual(true);
    expect(catalogSwitch().prop("checked")).toEqual(false);

    expect(wrapper.find(".attached-collecting-event-link").text()).toEqual(
      "Attached Collecting Event: 321"
    );

    // Unlink the Collecting Event:
    wrapper.find("button.detach-collecting-event-button").simulate("click");

    await submitForm();

    // The template's link was removed:
    expect(mockOnSaved).lastCalledWith({
      actionType: "ADD",
      formTemplates: {
        COLLECTING_EVENT: {
          allowExisting: false,
          allowNew: false,
          templateFields: {}
        }
      },
      group: "test-group-1",
      id: "123",
      name: "test-config",
      type: "material-sample-action-definition"
    });
  });

  it("Edits an existing action-definition: Can change the enabled and default values.", async () => {
    const { wrapper, colEventSwitch, catalogSwitch, submitForm } =
      await mountForm({
        actionType: "ADD",
        formTemplates: {
          COLLECTING_EVENT: {
            allowNew: true,
            allowExisting: true,
            templateFields: {
              dwcRecordNumber: {
                defaultValue: null,
                enabled: true
              },
              verbatimEventDateTime: {
                defaultValue: "test-verbatim-default-datetime",
                enabled: true
              }
            }
          },
          MATERIAL_SAMPLE: {
            allowNew: true,
            allowExisting: true,
            templateFields: {
              preparationType: {
                defaultValue: {
                  id: "100",
                  name: "test-prep-type",
                  type: "preparation-type"
                },
                enabled: true
              }
            }
          }
        },
        group: "test-group-1",
        id: "123",
        name: "test-config",
        type: "material-sample-action-definition"
      });

    // Data Component checkboxes are checked:
    expect(colEventSwitch().prop("checked")).toEqual(true);
    expect(catalogSwitch().prop("checked")).toEqual(true);

    // Change a default value:
    wrapper.find(".dwcRecordNumber-field input").simulate("change", {
      target: { value: "test-default-recorded-by" }
    });
    // Uncheck a box:
    wrapper
      .find("input[name='includeAllCollectingDate']")
      .simulate("change", { target: { checked: false } });

    await new Promise(setImmediate);
    wrapper.update();

    await submitForm();

    // The template's link was removed:
    expect(mockOnSaved).lastCalledWith({
      actionType: "ADD",
      formTemplates: {
        COLLECTING_EVENT: {
          allowExisting: true,
          allowNew: true,
          templateFields: {
            // New values:
            dwcRecordNumber: {
              enabled: true,
              defaultValue: "test-default-recorded-by"
            }
          }
        },
        MATERIAL_SAMPLE: {
          allowExisting: true,
          allowNew: true,
          templateFields: {
            preparationType: {
              defaultValue: {
                id: "100",
                name: "test-prep-type",
                type: "preparation-type"
              },
              enabled: true
            }
          }
        }
      },
      group: "test-group-1",
      id: "123",
      name: "test-config",
      type: "material-sample-action-definition"
    });
  });

  it("Edits an existing action-definition: Can remove the data components.", async () => {
    const {
      colEventSwitch,
      catalogSwitch,
      toggleColEvent,
      togglePreparations,
      submitForm
    } = await mountForm({
      actionType: "ADD",
      formTemplates: {
        COLLECTING_EVENT: {
          allowNew: true,
          allowExisting: true,
          templateFields: {
            verbatimEventDateTime: {
              defaultValue: "test-verbatim-default-datetime",
              enabled: true
            }
          }
        },
        MATERIAL_SAMPLE: {
          allowNew: true,
          allowExisting: true,
          templateFields: {
            preparationType: {
              defaultValue: {
                id: "100",
                name: "test-prep-type",
                type: "preparation-type"
              },
              enabled: true
            }
          }
        }
      },
      group: "test-group-1",
      id: "123",
      name: "test-config",
      type: "material-sample-action-definition"
    });

    // Data Component checkboxes are checked:
    expect(colEventSwitch().prop("checked")).toEqual(true);
    expect(catalogSwitch().prop("checked")).toEqual(true);

    // Remove both data components:
    await toggleColEvent(false);
    await togglePreparations(false);

    await submitForm();

    expect(mockOnSaved).lastCalledWith({
      actionType: "ADD",
      // Both data components removed:
      formTemplates: {},
      group: "test-group-1",
      id: "123",
      name: "test-config",
      type: "material-sample-action-definition"
    });
  });

  it("Adds a new SPLIT-type action definition", async () => {
    const { wrapper, fillOutRequiredFields, toggleActionType, submitForm } =
      await mountForm();
    await fillOutRequiredFields();
    await toggleActionType("SPLIT");

    // Only allow new attachments:
    wrapper
      .find("input.allow-new-checkbox")
      .simulate("change", { target: { checked: true } });

    // Set a default prep type:
    wrapper
      .find(".preparation-type input[type='checkbox']")
      .simulate("change", { target: { checked: true } });
    wrapper.find(".preparationType-field Select").prop<any>("onChange")({
      resource: TEST_PREP_TYPE
    });

    await submitForm();

    expect(mockOnSaved).lastCalledWith({
      actionType: "SPLIT",
      formTemplates: {
        MATERIAL_SAMPLE: {
          allowNew: true,
          templateFields: {
            preparationType: {
              defaultValue: {
                id: "100",
                name: "test-prep-type",
                type: "preparation-type"
              },
              enabled: true
            }
          }
        }
      },
      group: "test-group-1",
      id: "123",
      name: "test-config",
      type: "material-sample-action-definition"
    });
  });
});