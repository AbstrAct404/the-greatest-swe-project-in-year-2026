import FilterDropdown from './FilterDropdown.jsx'

// Values are the backend's min_acres; '' means no minimum, so it isn't sent.
const OPTIONS = [
  { value: '', label: 'Any size' },
  { value: '1', label: '1+ acres' },
  { value: '5', label: '5+ acres' },
  { value: '10', label: '10+ acres' },
  { value: '50', label: '50+ acres' },
  { value: '100', label: '100+ acres' },
]

function SizeFilter({ value, onChange }) {
  return <FilterDropdown label="Minimum size" options={OPTIONS} value={value} onChange={onChange} />
}

export default SizeFilter
