import EmptyState from "./EmptyState";
import Loader from "./Loader";

export default function DataTable({
  columns,
  rows,
  loading = false,
  emptyTitle = "No records found",
  emptyDescription = "Try adjusting the search or filters.",
  getRowKey = (row) => row.id,
  className = "",
}) {
  if (loading) {
    return <Loader label="Loading records..." />;
  }

  if (!rows?.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-eromza-border bg-eromza-bg/70">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle ${column.className ?? ""}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={getRowKey(row)}
              className="border-b border-eromza-border/80 last:border-0 hover:bg-eromza-bg/60"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-4 py-3 align-middle text-eromza-muted ${column.cellClassName ?? ""}`}
                >
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
