import { SORT_OPTIONS } from '../sortOrders.js'
import FilterDropdown from './FilterDropdown.jsx'

function SortFilter({ value, onChange }) {
  return <FilterDropdown label="Sort by" options={SORT_OPTIONS} value={value} onChange={onChange} />
}

export default SortFilter
