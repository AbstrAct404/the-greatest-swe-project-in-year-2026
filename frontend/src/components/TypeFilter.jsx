import { PARK_TYPES } from '../parkTypes.js'

function TypeFilter({ value, onChange }) {
  return (
    <label className="type-filter">
      Park type
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">All types</option>
        {PARK_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
      </select>
    </label>
  )
}

export default TypeFilter
