import { BOROUGH_NAMES } from '../boroughs.js'
import FavoriteButton from './FavoriteButton.jsx'

function ParkCard({ park, onSelect }) {
  return (
    <article className="park-card">
      <h3>{park.name}</h3>
      <p>{BOROUGH_NAMES[park.borough] ?? park.borough} · {park.type || 'Type not listed'}</p>
      <p>{Number.isFinite(park.acres) ? `${park.acres} acres` : 'Size not listed'}</p>
      <div className="park-card-actions">
        {onSelect && (
          <button
            type="button"
            aria-label={`View details for ${park.name}`}
            onClick={() => onSelect(park._id)}
          >
            View details
          </button>
        )}
        <FavoriteButton park={park} />
      </div>
    </article>
  )
}

export default ParkCard
