import { SIZE_OPTIONS } from '../sizes.js'
import FilterDropdown from './FilterDropdown.jsx'

function SizeFilter({ value, onChange }) {
  return <FilterDropdown label="Minimum size" options={SIZE_OPTIONS} value={value} onChange={onChange} />
}

export default SizeFilter
