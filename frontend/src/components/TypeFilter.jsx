import { PARK_TYPES } from '../parkTypes.js'
import FilterDropdown from './FilterDropdown.jsx'

const OPTIONS = [
  { value: '', label: 'All types' },
  ...PARK_TYPES.map((type) => ({ value: type, label: type })),
]

function TypeFilter({ value, onChange }) {
  return <FilterDropdown label="Park type" options={OPTIONS} value={value} onChange={onChange} />
}

export default TypeFilter
