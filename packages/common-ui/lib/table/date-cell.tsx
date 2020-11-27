import { DateView } from "common-ui";

/** Renders a date cell into a tabl in a user-friendly / readable format. */
export function dateCell(accessor: string) {
  return {
    Cell: ({ original }) => {
      const value = original[accessor];
      return <DateView date={value} />;
    },
    accessor
  };
}
