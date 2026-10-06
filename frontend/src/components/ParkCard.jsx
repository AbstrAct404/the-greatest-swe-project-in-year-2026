function ParkCard({ park }) {
  return (
    <article className="park-card">
      <h3>{park.name}</h3>
      <p>{park.borough} · {park.type}</p>
      <p>{park.acres} acres</p>
    </article>
  )
}

export default ParkCard
