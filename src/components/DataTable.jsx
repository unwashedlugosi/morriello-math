export default function DataTable({ xLabel, yLabel, rows }) {
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>{xLabel}</th>
            {rows.map((r, i) => <td key={`x${i}`}>{r.x}</td>)}
          </tr>
          <tr>
            <th>{yLabel}</th>
            {rows.map((r, i) => <td key={`y${i}`}>{r.y}</td>)}
          </tr>
        </thead>
      </table>
    </div>
  )
}
