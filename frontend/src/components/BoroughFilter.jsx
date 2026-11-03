import FilterDropdown from './FilterDropdown.jsx'

const OPTIONS = [
  { value: '', label: 'All boroughs' },
  { value: 'X', label: 'Bronx' },
  { value: 'B', label: 'Brooklyn' },
  { value: 'M', label: 'Manhattan' },
  { value: 'Q', label: 'Queens' },
  { value: 'R', label: 'Staten Island' },
]

function BoroughFilter({ value, onChange }) {
  return <FilterDropdown label="Borough" options={OPTIONS} value={value} onChange={onChange} />
}

export default BoroughFilter
