import { Person } from "packages/dina-ui/types/agent-api/resources/Person";
import { CollectingEventDetailsPage } from "../../../../pages/collection/collecting-event/view";
import { mountWithAppContext } from "../../../../test-util/mock-app-context";
import { CollectingEvent } from "../../../../types/collection-api/resources/CollectingEvent";

/** Test organization with all fields defined. */
const TEST_COLLECTION_EVENT: CollectingEvent = {
  startEventDateTime: "2019_01_01_10_10_10",
  endEventDateTime: "2019_01_06_10_10_10",
  verbatimEventDateTime: "From 2019, 1,1,10,10,10 to 2019, 1.6, 10,10,10",
  id: "1",
  type: "collecting-event",
  uuid: "323423-23423-234",
  group: "test group",
  dwcOtherRecordNumbers: ["12", "13", "14"],
  geoReferenceAssertions: [
    {
      id: "1",
      type: "georeference-assertion",
      dwcDecimalLongitude: 12.5,
      georeferencedBy: [{ id: "1", type: "agent" }]
    }
  ]
};

/** Mock Kitsu "get" method. */
const mockGet = jest.fn(async model => {
  // The get request will return the existing collecting-event.
  if (model === "collection-api/collecting-event/100") {
    return { data: TEST_COLLECTION_EVENT };
  } else if (model === "agent-api/person") {
    return { data: [TEST_AGENT] };
  }
});

const mockBulkGet = jest.fn(async paths => {
  if (!paths.length) {
    return [];
  }
  if ((paths[0] as string).startsWith("/person/")) {
    return paths.map(path => ({
      id: path.replace("/person/", ""),
      type: "agent",
      displayName: "person a"
    }));
  }

  if (
    (paths[0] as string).startsWith(
      "/georeference-assertion/1?include=georeferencedBy"
    )
  ) {
    return paths.map(path => ({
      id: path.replace("/georeference-assertion/", ""),
      type: "georeference-assertion",
      dwcDecimalLongitude: 12.5,
      georeferencedBy: [{ id: "1", type: "agent" }]
    }));
  }
});

// Mock out the Link component, which normally fails when used outside of a Next app.
jest.mock("next/link", () => () => <div />);

// Mock API requests:
const apiContext: any = {
  apiClient: { get: mockGet },
  bulkGet: mockBulkGet
};

describe("CollectingEvent details page", () => {
  it("Renders initially with a loading spinner.", () => {
    const wrapper = mountWithAppContext(
      <CollectingEventDetailsPage router={{ query: { id: "100" } } as any} />,
      { apiContext }
    );

    expect(wrapper.find(".spinner-border").exists()).toEqual(true);
  });

  it("Render the CollectingEvent details", async () => {
    const wrapper = mountWithAppContext(
      <CollectingEventDetailsPage router={{ query: { id: "100" } } as any} />,
      { apiContext }
    );

    // Wait for the page to load.
    await new Promise(setImmediate);
    wrapper.update();

    expect(wrapper.find(".spinner-border").exists()).toEqual(false);

    // The collecting-event's start, end and verbatim time should be rendered in a FieldView.
    expect(wrapper.containsMatchingElement(<p>2019_01_01_10_10_10</p>)).toEqual(
      true
    );
    expect(wrapper.containsMatchingElement(<p>2019_01_06_10_10_10</p>)).toEqual(
      true
    );

    // The collecting-event's verbatim datetime should be rendered in a FieldView.
    expect(
      wrapper.containsMatchingElement(
        <p>From 2019, 1,1,10,10,10 to 2019, 1.6, 10,10,10</p>
      )
    ).toEqual(true);

    expect(wrapper.containsMatchingElement(<p>12, 13, 14</p>)).toEqual(true);

    expect(wrapper.containsMatchingElement(<p>12.5</p>)).toEqual(true);

    expect(wrapper.containsMatchingElement(<p>person a</p>)).toEqual(true);
  });
});

const TEST_AGENT: Person = {
  displayName: "person a",
  email: "testperson@a.b",
  id: "1",
  type: "person",
  uuid: "323423-23423-234"
};