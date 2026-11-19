import { RADII, formatRadius } from '../radius.js'
import FilterDropdown from './FilterDropdown.jsx'

const OPTIONS = RADII.map((meters) => ({ value: meters, label: formatRadius(meters) }))

function RadiusFilter({ value, onChange }) {
  return <FilterDropdown label="Within" options={OPTIONS} value={value} onChange={onChange} />
}

export default RadiusFilter
