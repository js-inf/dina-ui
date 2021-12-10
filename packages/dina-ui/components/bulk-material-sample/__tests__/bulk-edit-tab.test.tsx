import { InputResource } from "kitsu";
import { MaterialSample } from "../../../types/collection-api";
import { mountWithAppContext } from "../../../test-util/mock-app-context";
import { useBulkEditTab } from "../bulk-edit-tab";
import Switch from "react-switch";

const mockSubmitOverride = jest.fn();

interface BulkEditTabProps {
  baseSample?: InputResource<MaterialSample>;
}

/** Test component to test the Bulk Edit Tab in isolation. */
function BulkEditTab({ baseSample }: BulkEditTabProps) {
  const { bulkEditTab, withBulkEditOverrides } = useBulkEditTab();

  return (
    <div>
      {bulkEditTab.content}
      <button
        className="get-overrides"
        type="button"
        onClick={async () => {
          mockSubmitOverride(
            await withBulkEditOverrides(
              baseSample || { type: "material-sample" }
            )
          );
        }}
      />
    </div>
  );
}

const mockGet = jest.fn<any, any>(async path => {
  switch (path) {
    case "agent-api/person":
    case "collection-api/collection":
    case "collection-api/collection-method":
    case "collection-api/collecting-event":
    case "collection-api/material-sample":
    case "collection-api/acquisition-event":
    case "collection-api/managed-attribute":
    case "collection-api/material-sample-type":
    case "collection-api/project":
    case "collection-api/vocabulary/materialSampleState":
    case "collection-api/preparation-type":
    case "objectstore-api/metadata":
    case "user-api/group":
    case "user-api/user":
    case "collection-api/storage-unit":
    case "collection-api/storage-unit-type":
    case "collection-api/vocabulary/degreeOfEstablishment":
    case "collection-api/vocabulary/srs":
    case "collection-api/vocabulary/coordinateSystem":
      return { data: [] };
  }
});

const mockSave = jest.fn<any, any>(ops =>
  ops.map(op => ({
    ...op.resource,
    id: op.resource.id ?? "11111111-1111-1111-1111-111111111111"
  }))
);

const testCtx = {
  apiContext: { apiClient: { get: mockGet }, save: mockSave }
};

describe("Material sample bulk edit tab", () => {
  beforeEach(jest.clearAllMocks);

  it("Without changing any fields, overrides nothing", async () => {
    const wrapper = mountWithAppContext(<BulkEditTab />, testCtx);

    await new Promise(setImmediate);
    wrapper.update();

    wrapper.find("button.get-overrides").simulate("click");

    await new Promise(setImmediate);
    wrapper.update();

    expect(mockSubmitOverride).lastCalledWith({ type: "material-sample" });
  });

  it("Overrides the barcode field", async () => {
    const wrapper = mountWithAppContext(
      <BulkEditTab
        baseSample={{
          type: "material-sample",
          materialSampleName: "test-sample",
          barcode: "test-barcode-original"
        }}
      />,
      testCtx
    );

    await new Promise(setImmediate);
    wrapper.update();

    // Update the barcode
    wrapper
      .find(".barcode-field input")
      .simulate("change", { target: { value: "test-barcode-override" } });

    wrapper.find("button.get-overrides").simulate("click");

    await new Promise(setImmediate);
    wrapper.update();

    expect(mockSubmitOverride).lastCalledWith({
      type: "material-sample",
      materialSampleName: "test-sample",
      barcode: "test-barcode-override"
    });
  });

  it("Overrides only the linked resources after enabling all data components", async () => {
    const wrapper = mountWithAppContext(
      <BulkEditTab
        baseSample={{
          type: "material-sample",
          materialSampleName: "test-sample"
        }}
      />,
      testCtx
    );

    await new Promise(setImmediate);
    wrapper.update();

    wrapper
      .find(".material-sample-nav")
      .find(Switch)
      .forEach(node => node.prop<any>("onChange")(true));

    await new Promise(setImmediate);
    wrapper.update();

    wrapper.find("button.get-overrides").simulate("click");

    await new Promise(setImmediate);
    wrapper.update();

    expect(mockSubmitOverride).lastCalledWith({
      // Keeps the name and type:
      type: "material-sample",
      materialSampleName: "test-sample",
      // Adds the acq event and Col event:
      acquisitionEvent: {
        id: "11111111-1111-1111-1111-111111111111",
        type: "acquisition-event"
      },
      collectingEvent: {
        id: "11111111-1111-1111-1111-111111111111",
        type: "collecting-event"
      }
    });
  });
});
