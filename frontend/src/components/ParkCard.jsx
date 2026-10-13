function ParkCard({ park, onSelect }) {
  return (
    <article className="park-card">
      <h3>{park.name}</h3>
      <p>{park.borough} · {park.type}</p>
      <p>{park.acres} acres</p>
      {onSelect && (
        <button
          type="button"
          aria-label={`View details for ${park.name}`}
          onClick={() => onSelect(park._id)}
        >
          View details
        </button>
      )}
    </article>
  )
}

export default ParkCard
