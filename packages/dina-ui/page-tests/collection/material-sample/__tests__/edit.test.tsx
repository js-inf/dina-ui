import { KitsuResourceLink, PersistedResource } from "kitsu";
import { default as ReactSwitch, default as Switch } from "react-switch";
import { BLANK_PREPARATION } from "../../../../components/collection/PreparationField";
import { MaterialSampleForm } from "../../../../pages/collection/material-sample/edit";
import { mountWithAppContext } from "../../../../test-util/mock-app-context";
import {
  CollectingEvent,
  MaterialSample
} from "../../../../types/collection-api";

// Mock out the dynamic component, which should only be rendered in the browser
jest.mock("next/dynamic", () => () => {
  return function MockDynamicComponent() {
    return <div>Mock dynamic component</div>;
  };
});

function testCollectionEvent(): Partial<CollectingEvent> {
  return {
    startEventDateTime: "2021-04-13",
    verbatimEventDateTime: "2021-04-13",
    id: "1",
    type: "collecting-event",
    group: "test group"
  };
}

function testMaterialSample(): PersistedResource<MaterialSample> {
  return {
    id: "1",
    type: "material-sample",
    group: "test group",
    materialSampleName: "my-sample-name",
    collectingEvent: {
      id: "1",
      type: "collecting-event"
    } as PersistedResource<CollectingEvent>
  };
}

const TEST_MANAGED_ATTRIBUTE = {
  id: "1",
  type: "managed-attribute",
  name: "testAttr"
};

const mockGet = jest.fn<any, any>(async path => {
  switch (path) {
    case "collection-api/collecting-event":
      return { data: [testCollectionEvent()] };
    case "collection-api/collecting-event/1?include=collectors,attachment,collectionMethod":
      // Populate the linker table:
      return { data: testCollectionEvent() };
    case "collection-api/preparation-type":
    case "collection-api/managed-attribute":
    case "collection-api/material-sample":
    case "collection-api/material-sample-type":
    case "user-api/group":
    case "agent-api/person":
    case "collection-api/vocabulary/srs":
    case "collection-api/vocabulary/coordinateSystem":
    case "collection-api/vocabulary/degreeOfEstablishment":
    case "collection-api/vocabulary/typeStatus":
    case "collection-api/storage-unit-type":
    case "collection-api/storage-unit":
    case "objectstore-api/metadata":
    case "collection-api/collection":
    case "collection-api/collection-method":
    case "collection-api/storage-unit/76575":
      return { data: [] };
  }
});

const mockSave = jest.fn<any, any>(async saves => {
  return saves.map(save => {
    if (save.type === "material-sample") {
      return testMaterialSample();
    }
    if (save.type === "collecting-event") {
      return testCollectionEvent();
    }
  });
});

const mockBulkGet = jest.fn<any, any>(async paths => {
  if (!paths.length) {
    return [];
  }
  if ((paths[0] as string).startsWith("/managed-attribute")) {
    return [TEST_MANAGED_ATTRIBUTE];
  }
});

const testCtx = {
  apiContext: {
    bulkGet: mockBulkGet,
    save: mockSave,
    apiClient: {
      get: mockGet
    }
  }
};

const mockOnSaved = jest.fn();

describe("Material Sample Edit Page", () => {
  beforeEach(jest.clearAllMocks);

  it("Submits a new material-sample with a new CollectingEvent.", async () => {
    const wrapper = mountWithAppContext(
      <MaterialSampleForm onSaved={mockOnSaved} />,
      testCtx
    );

    await new Promise(setImmediate);
    wrapper.update();

    // Enable Collecting Event and catalogue info form sections:
    wrapper.find(".enable-collecting-event").find(Switch).prop<any>("onChange")(
      true
    );
    wrapper.find(".enable-catalogue-info").find(Switch).prop<any>("onChange")(
      true
    );

    wrapper
      .find(".materialSampleName-field input")
      .simulate("change", { target: { value: "test-material-sample-id" } });
    wrapper
      .find(".verbatimEventDateTime-field input")
      .simulate("change", { target: { value: "2019-12-21T16:00" } });
    wrapper.find("form").simulate("submit");

    await new Promise(setImmediate);
    wrapper.update();

    // Saves the Collecting Event and the Material Sample:
    expect(mockSave.mock.calls).toEqual([
      [
        // New collecting-event:
        [
          {
            resource: {
              dwcOtherRecordNumbers: null,
              dwcVerbatimCoordinateSystem: "decimal degrees",
              dwcVerbatimSRS: "WGS84 (EPSG:4326)",
              geoReferenceAssertions: [
                {
                  isPrimary: true
                }
              ],
              managedAttributes: {},
              relationships: {},
              verbatimEventDateTime: "2019-12-21T16:00",
              type: "collecting-event"
            },
            type: "collecting-event"
          }
        ],
        { apiBaseUrl: "/collection-api" }
      ],
      [
        // New material-sample:
        [
          {
            resource: {
              collectingEvent: {
                id: "1",
                type: "collecting-event"
              },
              storageUnit: { id: null, type: "storage-unit" },
              materialSampleName: "test-material-sample-id",
              managedAttributes: {},
              determination: [],
              relationships: {},
              type: "material-sample"
            },
            type: "material-sample"
          }
        ],
        { apiBaseUrl: "/collection-api" }
      ]
    ]);
  });

  it("Submits a new material-sample linked to an existing CollectingEvent.", async () => {
    const wrapper = mountWithAppContext(
      <MaterialSampleForm onSaved={mockOnSaved} />,
      testCtx
    );

    await new Promise(setImmediate);
    wrapper.update();

    // Enable Collecting Event and catalogue info form sections:
    wrapper.find(".enable-collecting-event").find(Switch).prop<any>("onChange")(
      true
    );
    wrapper.find(".enable-catalogue-info").find(Switch).prop<any>("onChange")(
      true
    );

    await new Promise(setImmediate);
    wrapper.update();

    wrapper
      .find(".materialSampleName-field input")
      .simulate("change", { target: { value: "test-material-sample-id" } });

    wrapper.find("button.collecting-event-link-button").simulate("click");

    await new Promise(setImmediate);
    wrapper.update();

    wrapper.find("form").simulate("submit");

    await new Promise(setImmediate);
    wrapper.update();

    // Saves the Collecting Event and the Material Sample:
    expect(mockSave.mock.calls).toEqual([
      [
        // Doesn't save the existing Collecting Event because it wasn't edited:
        [
          // New material-sample:
          {
            resource: {
              collectingEvent: {
                id: "1",
                type: "collecting-event"
              },
              storageUnit: { id: null, type: "storage-unit" },
              materialSampleName: "test-material-sample-id",
              managedAttributes: {},
              determination: [],
              type: "material-sample",
              relationships: {}
            },
            type: "material-sample"
          }
        ],
        { apiBaseUrl: "/collection-api" }
      ]
    ]);
  });

  it("Edits an existing material-sample", async () => {
    const wrapper = mountWithAppContext(
      <MaterialSampleForm
        materialSample={testMaterialSample()}
        onSaved={mockOnSaved}
      />,
      testCtx
    );

    await new Promise(setImmediate);
    wrapper.update();

    // Existing CollectingEvent should show up:
    expect(
      wrapper.find(".startEventDateTime-field input").prop("value")
    ).toEqual("2021-04-13");

    wrapper
      .find(".materialSampleName-field input")
      .simulate("change", { target: { value: "test-material-sample-id" } });

    wrapper.find("form").simulate("submit");

    await new Promise(setImmediate);
    wrapper.update();

    expect(mockSave.mock.calls).toEqual([
      [
        // Edits existing material-sample:
        [
          {
            resource: {
              id: "1",
              type: "material-sample",
              group: "test group",
              materialSampleName: "test-material-sample-id",
              collectingEvent: { id: "1", type: "collecting-event" },
              storageUnit: { id: null, type: "storage-unit" },

              // Preparations are not enabled, so the preparation fields are set to null:
              ...BLANK_PREPARATION,
              determination: [],

              managedAttributes: {},
              relationships: {}
            },
            type: "material-sample"
          }
        ],
        { apiBaseUrl: "/collection-api" }
      ]
    ]);
  });

  it("Lets you remove the attached Collecting Event.", async () => {
    const wrapper = mountWithAppContext(
      <MaterialSampleForm
        materialSample={testMaterialSample()}
        onSaved={mockOnSaved}
      />,
      testCtx
    );

    await new Promise(setImmediate);
    wrapper.update();

    // Existing CollectingEvent should show up:
    expect(
      wrapper.find(".verbatimEventDateTime-field input").prop("value")
    ).toEqual("2021-04-13");

    wrapper.find("button.detach-collecting-event-button").simulate("click");

    await new Promise(setImmediate);
    wrapper.update();

    // Existing CollectingEvent should be gone:
    expect(
      wrapper.find(".verbatimEventDateTime-field input").prop("value")
    ).toEqual("");

    // Set the new Collecting Event's verbatimEventDateTime:
    wrapper
      .find(".verbatimEventDateTime-field input")
      .simulate("change", { target: { value: "2019-12-21T16:00" } });

    wrapper.find("form").simulate("submit");

    await new Promise(setImmediate);
    wrapper.update();

    expect(mockSave.mock.calls).toEqual([
      [
        // New collecting-event created:
        [
          {
            resource: {
              dwcOtherRecordNumbers: null,
              dwcVerbatimCoordinateSystem: "decimal degrees",
              dwcVerbatimSRS: "WGS84 (EPSG:4326)",
              geoReferenceAssertions: [
                {
                  isPrimary: true
                }
              ],
              managedAttributes: {},
              relationships: {},
              verbatimEventDateTime: "2019-12-21T16:00",
              type: "collecting-event"
            },
            type: "collecting-event"
          }
        ],
        { apiBaseUrl: "/collection-api" }
      ],
      [
        // Existing material-sample updated:
        [
          {
            resource: {
              collectingEvent: {
                id: "1",
                type: "collecting-event"
              },
              storageUnit: { id: null, type: "storage-unit" },
              materialSampleName: "my-sample-name",
              group: "test group",
              id: "1",
              type: "material-sample",

              // Preparations are not enabled, so the preparation fields are set to null:
              ...BLANK_PREPARATION,
              determination: [],
              managedAttributes: {},
              relationships: {}
            },
            type: "material-sample"
          }
        ],
        { apiBaseUrl: "/collection-api" }
      ]
    ]);
  });

  it("Renders an existing Material Sample with the Preparations section enabled.", async () => {
    const wrapper = mountWithAppContext(
      <MaterialSampleForm
        materialSample={{
          type: "material-sample",
          id: "333",
          materialSampleName: "test-ms",
          preparationType: {
            id: "65765",
            type: "preparation-type",
            name: "test-prep-type"
          } as KitsuResourceLink
        }}
        onSaved={mockOnSaved}
      />,
      testCtx
    );

    await new Promise(setImmediate);
    wrapper.update();

    // Preparations are enabled:
    expect(
      wrapper.find(".enable-catalogue-info").find(ReactSwitch).prop("checked")
    ).toEqual(true);
  });

  it("Renders an existing Material Sample with the Storage section enabled.", async () => {
    const wrapper = mountWithAppContext(
      <MaterialSampleForm
        materialSample={{
          type: "material-sample",
          id: "333",
          materialSampleName: "test-ms",
          storageUnit: {
            id: "76575",
            type: "storage-unit",
            name: "test-storage-unit"
          } as KitsuResourceLink
        }}
        onSaved={mockOnSaved}
      />,
      testCtx
    );

    await new Promise(setImmediate);
    wrapper.update();

    // Storage is enabled:
    expect(
      wrapper.find(".enable-storage").find(ReactSwitch).prop("checked")
    ).toEqual(true);
    expect(wrapper.find("#storage-section").exists()).toEqual(true);
  });

  it("Renders an existing Material Sample with the Determinations section enabled.", async () => {
    const wrapper = mountWithAppContext(
      <MaterialSampleForm
        materialSample={{
          type: "material-sample",
          id: "333",
          materialSampleName: "test-ms",
          determination: [
            { verbatimScientificName: "test verbatim scientific name" }
          ]
        }}
        onSaved={mockOnSaved}
      />,
      testCtx
    );

    await new Promise(setImmediate);
    wrapper.update();

    // Determinations are enabled:
    expect(
      wrapper.find(".enable-determination").find(ReactSwitch).prop("checked")
    ).toEqual(true);
    expect(wrapper.find("#determination-section").exists()).toEqual(true);
  });

  it("Renders an existing Material Sample with all toggleable data components disabled.", async () => {
    const wrapper = mountWithAppContext(
      <MaterialSampleForm
        materialSample={{
          type: "material-sample",
          id: "333",
          materialSampleName: "test-ms"
        }}
        onSaved={mockOnSaved}
      />,
      testCtx
    );

    await new Promise(setImmediate);
    wrapper.update();

    // Data components are disabled:
    expect(
      wrapper.find(".enable-catalogue-info").find(ReactSwitch).prop("checked")
    ).toEqual(false);
    expect(
      wrapper.find(".enable-collecting-event").find(ReactSwitch).prop("checked")
    ).toEqual(false);
    expect(
      wrapper.find(".enable-storage").find(ReactSwitch).prop("checked")
    ).toEqual(false);
    expect(
      wrapper.find(".enable-determination").find(ReactSwitch).prop("checked")
    ).toEqual(false);
  });

  it("Renders an existing Material Sample with the managed attribute when there is selected attribute with assinged value", async () => {
    const wrapper = mountWithAppContext(
      <MaterialSampleForm
        materialSample={{
          type: "material-sample",
          id: "333",
          materialSampleName: "test-ms",
          managedAttributeValues: {
            testAttr: { assignedValue: "do the test" }
          }
        }}
        onSaved={mockOnSaved}
      />,
      testCtx
    );

    await new Promise(setImmediate);
    wrapper.update();

    wrapper.find("form").simulate("submit");

    await new Promise(setImmediate);
    wrapper.update();

    expect(mockSave.mock.calls).toEqual([
      [
        [
          {
            resource: {
              collectingEvent: {
                id: null,
                type: "collecting-event"
              },
              storageUnit: { id: null, type: "storage-unit" },
              id: "333",
              managedAttributes: {
                testAttr: "do the test"
              },
              materialSampleName: "test-ms",
              ...BLANK_PREPARATION,
              determination: [],
              relationships: {},
              type: "material-sample"
            },
            type: "material-sample"
          }
        ],
        {
          apiBaseUrl: "/collection-api"
        }
      ]
    ]);
  });

  it("Submits a new Material Sample with 3 Determinations.", async () => {
    const wrapper = mountWithAppContext(
      <MaterialSampleForm onSaved={mockOnSaved} />,
      testCtx
    );

    await new Promise(setImmediate);
    wrapper.update();

    wrapper
      .find(".materialSampleName-field input")
      .simulate("change", { target: { value: "test-material-sample-id" } });

    // Enable Collecting Event and catalogue info form sections:
    wrapper.find(".enable-determination").find(Switch).prop<any>("onChange")(
      true
    );

    wrapper.update();

    function fillOutDetermination(num: number) {
      wrapper
        .find(".verbatimScientificName-field input")
        .last()
        .simulate("change", { target: { value: `test-name-${num}` } });
      wrapper
        .find(".verbatimDeterminer-field input")
        .last()
        .simulate("change", { target: { value: `test-agent-${num}` } });
    }

    // Enter the first determination:
    fillOutDetermination(1);

    // Enter the second determination:
    wrapper.find("button.add-determination-button").simulate("click");
    await new Promise(setImmediate);
    fillOutDetermination(2);

    // Enter the third determination:
    wrapper.find("button.add-determination-button").simulate("click");
    await new Promise(setImmediate);
    fillOutDetermination(3);

    wrapper.find("form").simulate("submit");

    await new Promise(setImmediate);
    wrapper.update();

    // Saves the Material Sample:
    expect(mockSave.mock.calls).toEqual([
      [
        [
          {
            resource: expect.objectContaining({
              // The 3 determinations are added:
              determination: [
                {
                  verbatimDeterminer: "test-agent-1",
                  verbatimScientificName: "test-name-1"
                },
                {
                  verbatimDeterminer: "test-agent-2",
                  verbatimScientificName: "test-name-2"
                },
                {
                  verbatimDeterminer: "test-agent-3",
                  verbatimScientificName: "test-name-3"
                }
              ],
              type: "material-sample"
            }),
            type: "material-sample"
          }
        ],
        { apiBaseUrl: "/collection-api" }
      ]
    ]);
  });
});
