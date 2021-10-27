import {
  BASE_NAME,
  START,
  TYPE_NUMERIC
} from "../../../../../../dina-ui/types/collection-api";
import {
  ConfigAction,
  SPLIT_CHILD_SAMPLE_RUN_CONFIG_KEY
} from "../../../../../pages/collection/material-sample/workflows/split-config";
import { mountWithAppContext } from "../../../../../test-util/mock-app-context";

const testRunConfig = {
  "split-child-sample-run-config": {
    metadata: { actionRemarks: "Remarks on this run config" },
    configure: {
      numOfChildToCreate: "1",
      baseName: "Custom Parent Name",
      start: "10",
      type: "Numerical",
      destroyOriginal: true
    },
    configure_children: { sampleNames: ["my custom name"] }
  }
};

const testMaterialSample = {
  id: "123",
  type: "material-sample",
  materialSampleName: "my-sample-name"
};

const mockGet = jest.fn<any, any>(async path => {
  switch (path) {
    case "collection-api/material-sample/123":
      return {
        data: testMaterialSample
      };
  }
});

const apiContext = {
  apiClient: {
    get: mockGet
  }
};

jest.mock("next/router", () => ({
  withRouter: () => ({ push: jest.fn() })
}));

describe("MaterialSample split workflow series-mode run config", () => {
  beforeEach(() => localStorage.clear());

  it("Initially display the workfow run config with defaults", async () => {
    const wrapper = mountWithAppContext(
      <ConfigAction router={{ query: { id: "123" } } as any} />,
      { apiContext }
    );

    // Making sure the fetching of material sample parent query promise returns
    await new Promise(setImmediate);
    wrapper.update();

    // Switch to the "Series" tab:
    wrapper.find("li.react-tabs__tab.series-tab").simulate("click");
    expect(wrapper.find(".start-field input").prop("value")).toEqual(START);

    expect(wrapper.find(".suffixType-field Select").prop("value")).toEqual({
      label: "Numerical",
      value: TYPE_NUMERIC
    });
  });

  it("Creates a new Material Sample workfow series-mode run config with user custom entries", async () => {
    const wrapper = mountWithAppContext(
      <ConfigAction router={{ query: { id: "123" } } as any} />,
      { apiContext }
    );

    await new Promise(setImmediate);
    wrapper.update();

    // Switch to the "Series" tab:
    wrapper.find("li.react-tabs__tab.series-tab").simulate("click");

    wrapper
      .find(".baseName-field input")
      .simulate("change", { target: { value: "Custom Parent Name" } });

    wrapper
      .find(".start-field input")
      .simulate("change", { target: { value: "10" } });

    wrapper
      .find(".remarks-field textarea")
      .simulate("change", { target: { value: "Remarks on this run config" } });

    wrapper
      .find(".sampleNames0 input")
      .simulate("change", { target: { value: "my custom name" } });

    wrapper.update();

    wrapper.find("form").simulate("submit");

    await new Promise(setImmediate);
    wrapper.update();

    // item exists with the key
    expect(
      localStorage.getItem(SPLIT_CHILD_SAMPLE_RUN_CONFIG_KEY)?.length
    ).toBeGreaterThan(0);

    // content contains the values user set
    expect(localStorage.getItem(SPLIT_CHILD_SAMPLE_RUN_CONFIG_KEY)).toContain(
      testRunConfig[SPLIT_CHILD_SAMPLE_RUN_CONFIG_KEY].metadata.actionRemarks
    );
    expect(localStorage.getItem(SPLIT_CHILD_SAMPLE_RUN_CONFIG_KEY)).toContain(
      testRunConfig[SPLIT_CHILD_SAMPLE_RUN_CONFIG_KEY].configure.baseName
    );
    expect(localStorage.getItem(SPLIT_CHILD_SAMPLE_RUN_CONFIG_KEY)).toContain(
      testRunConfig[SPLIT_CHILD_SAMPLE_RUN_CONFIG_KEY].configure_children
        .sampleNames[0]
    );
  });

  it("Creates a new Material Sample workfow batch-mode run config with user custom entries", async () => {
    const wrapper = mountWithAppContext(
      <ConfigAction router={{ query: { id: "123" } } as any} />,
      { apiContext }
    );

    await new Promise(setImmediate);
    wrapper.update();

    // Switch to the "Batch" tab:
    wrapper.find("li.react-tabs__tab.batch-tab").simulate("click");

    wrapper
      .find(".baseName-field input")
      .simulate("change", { target: { value: "TestBaseName" } });

    wrapper
      .find(".suffix-field input")
      .simulate("change", { target: { value: "TestSuffix" } });

    wrapper
      .find(".numOfChildToCreate-field input")
      .simulate("change", { target: { value: 3 } });

    wrapper
      .find(".sampleNames0 input")
      .simulate("change", { target: { value: "CustomName1" } });

    wrapper.update();

    wrapper.find("form").simulate("submit");

    await new Promise(setImmediate);
    wrapper.update();

    expect(
      JSON.parse(
        localStorage.getItem(SPLIT_CHILD_SAMPLE_RUN_CONFIG_KEY) ?? "{}"
      )
    ).toEqual({
      configure: {
        collection: {
          id: null,
          type: "collection"
        },
        baseName: "TestBaseName",
        generationMode: "BATCH",
        numOfChildToCreate: 3,
        suffix: "TestSuffix"
      },
      configure_children: {
        sampleNames: [
          "CustomName1",
          "TestBaseNameTestSuffix",
          "TestBaseNameTestSuffix"
        ]
      },
      metadata: {}
    });
  });

  it("When come from material sample view page, baseName is set with parent sample name", async () => {
    const wrapper = mountWithAppContext(
      <ConfigAction router={{ query: { id: "123" } } as any} />,
      { apiContext }
    );
    await new Promise(setImmediate);
    wrapper.update();
    expect(wrapper.find(".baseName-field input").prop("value")).toEqual(
      "my-sample-name"
    );
  });

  it("Has a reset button to revert to the default sample names.", async () => {
    const wrapper = mountWithAppContext(
      <ConfigAction router={{ query: { id: "123" } } as any} />,
      { apiContext }
    );

    await new Promise(setImmediate);
    wrapper.update();

    // Reset button is initially hidden:
    expect(wrapper.find("button.reset-sample-names").exists()).toEqual(false);

    // The input begins with the default value:
    expect(wrapper.find(".sampleNames0 input").prop("value")).toEqual(
      "my-sample-name"
    );

    // Edit a sample name:
    wrapper
      .find(".sampleNames0 input")
      .simulate("change", { target: { value: "my custom name" } });

    // Reset button appears when a name value is changed:
    expect(wrapper.find("button.reset-sample-names").exists()).toEqual(true);

    // Press the reset button:
    wrapper.find("button.reset-sample-names").simulate("click");
    // The reset button disappears again because the names were reset:
    expect(wrapper.find("button.reset-sample-names").exists()).toEqual(false);
  });

  it("The reset button still works when using a custom suffix.", async () => {
    const wrapper = mountWithAppContext(
      <ConfigAction router={{ query: { id: "123" } } as any} />,
      { apiContext }
    );

    await new Promise(setImmediate);
    wrapper.update();

    // Switch to the "Series" tab:
    wrapper.find("li.react-tabs__tab.series-tab").simulate("click");

    wrapper
      .find(".start-field input")
      .simulate("change", { target: { value: "5" } });

    // The input begins with the default value:
    expect(wrapper.find(".sampleNames0 input").prop("value")).toEqual(
      "my-sample-name5"
    );
    // Reset button is initially hidden:
    expect(wrapper.find("button.reset-sample-names").exists()).toEqual(false);

    // Edit a sample name:
    wrapper
      .find(".sampleNames0 input")
      .simulate("change", { target: { value: "my custom name" } });

    // Reset button appears when a name value is changed:
    expect(wrapper.find("button.reset-sample-names").exists()).toEqual(true);

    // Press the reset button:
    wrapper.find("button.reset-sample-names").simulate("click");

    // The sample name is reverted to the default value:
    expect(wrapper.find(".sampleNames0 input").prop("value")).toEqual(
      "my-sample-name5"
    );

    // The reset button is hidden again:
    expect(wrapper.find("button.reset-sample-names").exists()).toEqual(false);
  });
});