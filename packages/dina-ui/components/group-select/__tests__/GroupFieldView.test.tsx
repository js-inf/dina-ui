import { DinaForm } from "common-ui";
import { mountWithAppContext2 } from "../../../test-util/mock-app-context";
import { GroupFieldView } from "../GroupFieldView";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

describe("GroupFieldView component.", () => {
  it("Renders the default group name without accessing the user API.", async () => {
    const { getByText } = mountWithAppContext2(
      <DinaForm initialValues={{ group: "mygroup" }}>
        <GroupFieldView name="group" />
      </DinaForm>
    );

    // Wait for the component to render the expected output
    await waitFor(() => {
      expect(getByText("mygroup")).toBeInTheDocument();
    });
  });

  it("Renders the group name from the user API.", async () => {
    const mockGet = jest.fn(async () => ({
      data: [
        {
          name: "mygroup",
          labels: { en: "My Group" }
        }
      ]
    }));

    const { getByText } = mountWithAppContext2(
      <DinaForm initialValues={{ group: "mygroup" }}>
        <GroupFieldView name="group" />
      </DinaForm>,
      {
        apiContext: {
          apiClient: { get: mockGet } as any
        }
      }
    );

    // Wait for the component to render the expected output
    await waitFor(() => {
      expect(getByText("My Group")).toBeInTheDocument();
    });
  });
});
