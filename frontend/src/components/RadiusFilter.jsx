import { RADII, formatRadius } from '../radius.js'
import FilterDropdown from './FilterDropdown.jsx'

const OPTIONS = RADII.map((meters) => ({ value: meters, label: formatRadius(meters) }))

function RadiusFilter({ value, onChange, disabled = false }) {
  return <FilterDropdown label="Within" options={OPTIONS} value={value} onChange={onChange} disabled={disabled} />
}

export default RadiusFilter
