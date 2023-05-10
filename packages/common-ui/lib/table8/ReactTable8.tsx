import {
  ColumnDef,
  Row,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortDirection
} from "@tanstack/react-table";
import { useDrag, useDrop } from "react-dnd-cjs";
import { useIntl } from "react-intl";
import classnames from "classnames";
import { v4 as uuidv4 } from "uuid";

export function ReactTable8<TData>({
  data,
  setData,
  columns,
  enableDnd = false,
  className
}: {
  columns: ColumnDef<TData>[];
  data: TData[];
  setData?: (data?: TData[]) => void;
  enableDnd?: boolean;
  className?: string;
}) {
  const { formatMessage } = useIntl();
  function reorderRow(draggedRowIndex: number, targetRowIndex: number) {
    data.splice(targetRowIndex, 0, data.splice(draggedRowIndex, 1)[0] as TData);
    if (!!setData) {
      setData([...data]);
    }
  }

  const table = useReactTable<TData>({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => ((row as any).id ? (row as any).id : uuidv4())
  });

  return (
    <table className={`ReactTable8 w-100 ${className}`}>
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th
                key={header.id}
                colSpan={header.colSpan}
                className={classnames(
                  header.column.getCanSort() && "-cursor-pointer",
                  header.column.getIsSorted() === "asc" && "-sort-asc",
                  header.column.getIsSorted() === "desc" && "-sort-desc"
                )}
              >
                {header.isPlaceholder ? null : (
                  <div
                    {...{
                      className: header.column.getCanSort()
                        ? "-cursor-pointer select-none"
                        : "",
                      onClick: header.column.getToggleSortingHandler()
                    }}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </div>
                )}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.length === 0 ? (
          <tr>
            <td colSpan={table.getAllColumns().length} className="text-center">
              {formatMessage({ id: "noRowsFound" })}
            </td>
          </tr>
        ) : (
          table
            .getRowModel()
            .rows.map((row, index) =>
              enableDnd ? (
                <DraggableRow
                  row={row}
                  reorderRow={reorderRow}
                  className={index % 2 === 0 ? "-odd" : "-even"}
                />
              ) : (
                <DefaultRow
                  row={row}
                  className={index % 2 === 0 ? "-odd" : "-even"}
                />
              )
            )
        )}
      </tbody>
    </table>
  );
}

function DefaultRow<TData>({
  row,
  className
}: {
  row: Row<TData>;
  className?: string;
}) {
  return (
    <tr key={row.id} className={className}>
      {row.getVisibleCells().map((cell) => {
        return (
          <td key={cell.id}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        );
      })}
    </tr>
  );
}

const ITEM_DRAG_KEY = "ReactTable8RowDndKey";

function DraggableRow<TData>({
  row,
  reorderRow,
  className
}: {
  row: Row<TData>;
  reorderRow: (draggedRowIndex: number, targetRowIndex: number) => void;
  className?: string;
}) {
  const [, dropRef] = useDrop({
    accept: ITEM_DRAG_KEY,
    drop: (draggedRow) => reorderRow((draggedRow as any).row.index, row.index),
    canDrop: () => true
  });

  const [{ isDragging }, dragRef, previewRef] = useDrag({
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    }),
    item: { row, type: ITEM_DRAG_KEY },
    canDrag: true
  });

  return (
    <tr
      className={className}
      ref={(el) => {
        dropRef(el);
        dragRef(el);
        previewRef(el);
      }}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? "grabbing" : "grab"
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <td key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  );
}
