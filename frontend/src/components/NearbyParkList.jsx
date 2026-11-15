import { formatDistance } from '../distance.js'

export default function NearbyParkList({ parks, onSelect }) {
  return (
    <ul>
      {parks.map((park) => (
        <li key={park._id}>
          <button type="button" onClick={() => onSelect(park._id)}>
            {park.name}
          </button>
          {' '}
          <span className="nearby-distance">{formatDistance(park.distance)}</span>
        </li>
      ))}
    </ul>
  )
}
