import { mount } from "enzyme";
import Kitsu, { KitsuResource, KitsuResponse } from "kitsu";
import { range } from "lodash";
import { MetaWithTotal } from "../../../types/seqdb-api/meta";
import { ApiClientContext } from "../../api-client/ApiClientContext";
import { QueryTable } from "../QueryTable";

/** Example of an API resource interface definition for a todo-list entry. */
interface Todo extends KitsuResource {
  type: "todo";
  name: string;
  description: string;
}

/**
 * Helper function to get mock todos with the specified range of IDs.
 */
function getMockTodos(page): KitsuResponse<Todo[], MetaWithTotal> {
  const offset = page.offset || 0;
  const idRange = range(offset, offset + page.limit);

  return {
    data: idRange.map<Todo>(i => ({
      id: `${i}`,
      type: "todo",
      name: `todo ${i}`,
      description: `todo description ${i}`
    })),
    meta: {
      totalResourceCount: 300
    }
  };
}

const mockGet = jest.fn(async (_, { page }) => {
  return getMockTodos(page);
});

// Mock Kitsu, the client class that talks to the backend.
jest.mock(
  "kitsu",
  () =>
    class {
      get = mockGet;
    }
);

describe("QueryTable component", () => {
  /** JSONAPI client. */
  const testClient = new Kitsu({
    baseURL: "/api",
    pluralize: false,
    resourceCase: "none"
  });

  function mountWithContext(element: JSX.Element) {
    return mount(
      <ApiClientContext.Provider value={{ apiClient: testClient }}>
        {element}
      </ApiClientContext.Provider>
    );
  }

  it("Renders loading state initially.", () => {
    const wrapper = mountWithContext(
      <QueryTable
        initialQuery={{ path: "todo" }}
        columns={["id", "name", "description"]}
      />
    );

    expect(
      wrapper.contains(
        <div className="-loading -active">
          <div className="-loading-inner">Loading...</div>
        </div>
      )
    ).toEqual(true);
  });

  it("Renders the data from the mocked backend.", async () => {
    const wrapper = mountWithContext(
      <QueryTable
        initialQuery={{ path: "todo" }}
        columns={["id", "name", "description"]}
      />
    );

    // Continue the test after the data fetch is done.
    await Promise.resolve();
    wrapper.update();

    // The loading screen should be gone.
    expect(wrapper.find(".-loading.-active").exists()).toEqual(false);

    const rows = wrapper.find(".rt-tr-group");

    // Expect 25 rows for the 25 mock todos.
    expect(rows.length).toEqual(25);

    // Expect the first row to show the first todo's data.
    expect(
      rows
        .first()
        .find(".rt-td")
        .map(cell => cell.text())
    ).toEqual(["0", "todo 0", "todo description 0"]);

    // Expect the last row to show the last todo's data.
    expect(
      rows
        .last()
        .find(".rt-td")
        .map(cell => cell.text())
    ).toEqual(["24", "todo 24", "todo description 24"]);
  });

  it("Renders the headers defined in the columns prop.", () => {
    const headers = ["id", "name", "description"];

    const wrapper = mountWithContext(
      <QueryTable initialQuery={{ path: "todo" }} columns={headers} />
    );

    for (const header of headers) {
      expect(
        wrapper.contains(
          <div className="rt-resizable-header-content">{header}</div>
        )
      ).toEqual(true);
    }
  });

  it("Renders the total number of pages when no custom pageSize is specified.", async () => {
    const wrapper = mountWithContext(
      <QueryTable
        initialQuery={{ path: "todo" }}
        columns={["id", "name", "description"]}
      />
    );

    // Wait until the data is loaded into the table.
    await Promise.resolve();
    wrapper.update();
    expect(
      // 300 total records with a pageSize of 25 means 12 pages.
      wrapper.find("span.-totalPages").text()
    ).toEqual("12");
  });

  it("Renders the total number of pages when a custom pageSize is specified.", async () => {
    const wrapper = mountWithContext(
      <QueryTable
        initialQuery={{ path: "todo" }}
        columns={["id", "name", "description"]}
        pageSize={40}
      />
    );

    // Wait until the data is loaded into the table.
    await Promise.resolve();
    wrapper.update();
    expect(
      // 300 total records with a pageSize of 40 means 8 pages.
      wrapper.find("span.-totalPages").text()
    ).toEqual("8");
  });

  it("Fetches the next page when the Next button is pressed.", async done => {
    const wrapper = mountWithContext(
      <QueryTable
        initialQuery={{ path: "todo" }}
        columns={["id", "name", "description"]}
        pageSize={25}
      />
    );

    // Wait for page 1 to load.
    await Promise.resolve();
    wrapper.update();

    const page1Rows = wrapper.find(".rt-tr-group");

    // The first page should end with todo #24.
    expect(
      page1Rows
        .last()
        .find(".rt-td")
        .map(cell => cell.text())
    ).toEqual(["24", "todo 24", "todo description 24"]);

    // Click the "Next" button.
    wrapper.find(".-next button").simulate("click");

    // Clicking "Next" should enable the loading screen.
    expect(wrapper.find(".-loading.-active").exists()).toEqual(true);

    // Wait for the second query to load.
    await Promise.resolve();
    const page2Rows = wrapper.find(".rt-tr-group");

    // The second page should start with todo #25.
    expect(
      page2Rows
        .first()
        .find(".rt-td")
        .map(cell => cell.text())
    ).toEqual(["25", "todo 25", "todo description 25"]);

    // The second page should end with todo #49.
    expect(
      page2Rows
        .last()
        .find(".rt-td")
        .map(cell => cell.text())
    ).toEqual(["49", "todo 49", "todo description 49"]);

    done();
  });

  it("Fetches the prevous page when the previous button is pressed.", async () => {
    const wrapper = mountWithContext(
      <QueryTable
        initialQuery={{ path: "todo" }}
        columns={["id", "name", "description"]}
        pageSize={25}
      />
    );

    // Wait for page 1 to load.
    await Promise.resolve();

    // Click the "Next" button.
    wrapper.find(".-next button").simulate("click");

    // Wait for the second query to load.
    await Promise.resolve();

    // Click the "Previous" button.
    wrapper.find(".-previous button").simulate("click");

    // Clicking "Previous" should enable the loading screen.
    expect(wrapper.find(".-loading.-active").exists()).toEqual(true);

    // Wait for the "Previous" request to finish.
    await Promise.resolve();

    const rows = wrapper.find(".rt-tr-group");

    // The first page should start with todo #0.
    expect(
      rows
        .first()
        .find(".rt-td")
        .map(cell => cell.text())
    ).toEqual(["0", "todo 0", "todo description 0"]);

    // The first page should end with todo #24.
    expect(
      rows
        .last()
        .find(".rt-td")
        .map(cell => cell.text())
    ).toEqual(["24", "todo 24", "todo description 24"]);
  });
});
