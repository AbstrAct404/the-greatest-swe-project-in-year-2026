import { addFavorite, removeFavorite, useFavorites } from '../favorites.js'

// A toggle: aria-pressed tells screen readers whether the park is saved.
function FavoriteButton({ park }) {
  const favorites = useFavorites()
  const saved = favorites.some((favorite) => favorite._id === park._id)

  return (
    <button
      type="button"
      className="favorite-button"
      aria-label={`Save ${park.name}`}
      aria-pressed={saved}
      onClick={() => (saved ? removeFavorite(park._id) : addFavorite(park))}
    >
      <span aria-hidden="true">{saved ? '★' : '☆'}</span> {saved ? 'Saved' : 'Save'}
    </button>
  )
}

export default FavoriteButton
