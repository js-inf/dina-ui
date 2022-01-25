import Select from "react-select";
import { mountWithAppContext } from "../../test-util/mock-app-context";
import { QueryPage } from "../QueryPage";
import DatePicker from "react-datepicker";

/** Mock resources returned by elastic search mapping from api. */
const MOCK_INDEX_MAPPING_RESP = {
  data: {
    "data.id.type": "text",
    "data.attributes.createdOn.type": "date",
    "meta.moduleVersion.type": "text",
    "data.attributes.allowDuplicateName.type": "boolean"
  }
};

const mockGet = jest.fn<any, any>(async path => {
  switch (path) {
    case "search-api/search/mapping":
      return MOCK_INDEX_MAPPING_RESP;
  }
});

const TEST_SEARCH_DATE =
  "Tue Jan 25 2022 21:05:30 GMT+0000 (Coordinated Universal Time)";

const apiContext = {
  apiClient: {
    axios: { get: mockGet } as any
  }
} as any;
describe("QueryPage component", () => {
  it("Query Page is able to aggretate first level queries", async () => {
    const wrapper = mountWithAppContext(<QueryPage indexName="testIndex" />, {
      apiContext
    });

    await new Promise(setImmediate);
    wrapper.update();

    wrapper.find("FaPlus[name='queryRows[0].addRow']").simulate("click");

    await new Promise(setImmediate);
    wrapper.update();

    // select first row to a date field
    wrapper
      .find("SelectField[name='queryRows[0].fieldName']")
      .find(Select)
      .prop<any>("onChange")({ value: "createdOn(date)" });

    await new Promise(setImmediate);
    wrapper.update();
    // set date value
    wrapper
      .find("DateField[name='queryRows[0].date']")
      .find(DatePicker)
      .prop<any>("onChange")(new Date(TEST_SEARCH_DATE));

    // select second row to a boolean field
    wrapper
      .find("SelectField[name='queryRows[1].fieldName']")
      .find(Select)
      .prop<any>("onChange")({ value: "allowDuplicateName(boolean)" });

    await new Promise(setImmediate);
    wrapper.update();

    expect(
      wrapper.find("SelectField[name='queryRows[1].boolean']").length
    ).toEqual(1);

    // set boolean value
    wrapper
      .find("SelectField[name='queryRows[1].boolean']")
      .find(Select)
      .prop<any>("onChange")({ value: "true" });

    wrapper.find("form").simulate("submit");

    await new Promise(setImmediate);
    wrapper.update();

    expect(mockGet.mock.calls).toEqual([
      [
        "search-api/search/mapping",
        {
          params: {
            indexName: "testIndex"
          }
        }
      ],
      [
        "es/testIndex/_search",
        {
          params: {
            source: {
              query: {
                bool: {
                  filter: {
                    bool: {
                      must: [
                        {
                          term: {
                            createdOn: "2022-01-25"
                          }
                        },
                        {
                          term: {
                            allowDuplicateName: "true"
                          }
                        }
                      ]
                    }
                  }
                }
              }
            },
            source_content_type: "application/json"
          }
        }
      ]
    ]);
  });
});
