function BoroughFilter({ value, onChange }) {
  return (
    <label className="borough-filter">
      Borough
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">All boroughs</option>
        <option value="X">Bronx</option>
        <option value="B">Brooklyn</option>
        <option value="M">Manhattan</option>
        <option value="Q">Queens</option>
        <option value="R">Staten Island</option>
      </select>
    </label>
  )
}

export default BoroughFilter
