import { PARK_TYPES } from '../parkTypes.js'
import FilterDropdown from './FilterDropdown.jsx'

const OPTIONS = [
  { value: '', label: 'All types' },
  ...PARK_TYPES.map((type) => ({ value: type, label: type })),
]

// label can be changed so two type filters on one page have distinct names.
function TypeFilter({ value, onChange, label = 'Park type', disabled = false }) {
  return <FilterDropdown label={label} options={OPTIONS} value={value} onChange={onChange} disabled={disabled} />
}

export default TypeFilter
