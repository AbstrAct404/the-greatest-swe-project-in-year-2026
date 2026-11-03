import FilterDropdown from './FilterDropdown.jsx'

// '' is the backend's default order (by name), so it isn't sent.
const OPTIONS = [
  { value: '', label: 'Name (A–Z)' },
  { value: 'largest', label: 'Largest first' },
  { value: 'smallest', label: 'Smallest first' },
]

function SortFilter({ value, onChange }) {
  return <FilterDropdown label="Sort by" options={OPTIONS} value={value} onChange={onChange} />
}

export default SortFilter
