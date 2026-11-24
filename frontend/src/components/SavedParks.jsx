import { useFavorites } from '../favorites.js'
import ParkCard from './ParkCard.jsx'

// The parks saved in this browser, oldest first. Shown only once there are
// some, so first-time visitors see the park list straight away.
function SavedParks({ onSelect, hidden = false }) {
  const favorites = useFavorites()
  if (favorites.length === 0) return null

  return (
    <section className="saved-parks" aria-labelledby="saved-parks-heading" hidden={hidden}>
      <h2 id="saved-parks-heading">Saved parks ({favorites.length})</h2>
      <ul className="park-list">
        {favorites.map((park) => (
          <li key={park._id}><ParkCard park={park} onSelect={onSelect} /></li>
        ))}
      </ul>
    </section>
  )
}

export default SavedParks
