import { screen } from "@testing-library/react";
import PersonDetailsPage from "../../../pages/person/view";
import { mountWithAppContext2 } from "../../../test-util/mock-app-context";
import { Person } from "../../../types/agent-api/resources/Person";
import "@testing-library/jest-dom";

/** Test person with all fields defined. */
const TEST_AGENT: Person = {
  displayName: "person a",
  email: "testperson@a.b",
  id: "1",
  type: "person",
  uuid: "323423-23423-234"
};

/** Mock Kitsu "get" method. */
const mockGet = jest.fn(async () => {
  return { data: TEST_AGENT };
});

// Mock out the Link component, which normally fails when used outside of a Next app.
jest.mock("next/link", () => () => <div />);

// Mock API requests:
const apiContext: any = {
  apiClient: { get: mockGet }
};

jest.mock("next/router", () => ({
  useRouter: () => ({ query: { id: "100" } })
}));

describe("Person details page", () => {
  it("Renders initially with a loading spinner.", () => {
    const wrapper = mountWithAppContext2(<PersonDetailsPage />, { apiContext });

    screen.logTestingPlaygroundURL();

    expect(wrapper.getByText(/loading\.\.\./i)).toBeInTheDocument();
  });

  it("Render the Person details", async () => {
    const wrapper = mountWithAppContext2(<PersonDetailsPage />, { apiContext });

    // Wait for the page to load.
    await new Promise(setImmediate);

    screen.logTestingPlaygroundURL();

    expect(wrapper.queryByText(/loading\.\.\./i)).not.toBeInTheDocument();

    // The person's name should be rendered in a FieldView.
    expect(wrapper.getByText(/display name/i)).toBeInTheDocument();
    expect(wrapper.getAllByText(/person a/i)[1]).toBeInTheDocument();
    // expect(wrapper.container.querySelector('#sandbox > div:nth-child(1) > div > div > main > form > div:nth-child(2) > div > label > div:nth-child(2) > div'));
    // expect(wrapper.containsMatchingElement(<div>person a</div>)).toEqual(true);

    // // The person's email should be rendered in a FieldView.
    expect(wrapper.getByText(/email/i)).toBeInTheDocument();
    expect(wrapper.getByText(/testperson@a\.b/i)).toBeInTheDocument();
  });
});
