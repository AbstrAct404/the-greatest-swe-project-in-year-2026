import { useEffect, useState } from 'react'
import { nearParks } from '../api.js'

const RADIUS_M = 1000
const MAX_SHOWN = 5

function formatDistance(meters) {
  return `${Math.round(meters)} m`
}

// Lists the parks closest to a park's centre point, leaving out the park itself.
function NearbyParks({ park, onSelect }) {
  const [parks, setParks] = useState([])
  const [status, setStatus] = useState('loading')
  const [lng, lat] = park.centroid?.coordinates ?? []

  useEffect(() => {
    if (lat === undefined || lng === undefined) return undefined
    let active = true

    // Ask for one extra, since the park itself is usually in the results.
    nearParks({ lat, lng, radius: RADIUS_M, limit: MAX_SHOWN + 1 })
      .then((results) => {
        if (active) {
          setParks(results.filter((p) => p._id !== park._id).slice(0, MAX_SHOWN))
          setStatus('ok')
        }
      })
      .catch(() => {
        if (active) setStatus('error')
      })

    return () => { active = false }
  }, [park._id, lat, lng])

  if (lat === undefined || lng === undefined) return null

  return (
    <section className="nearby-parks" aria-labelledby="nearby-heading">
      <h3 id="nearby-heading">Nearby parks</h3>
      {status === 'loading' && <p>Finding nearby parks…</p>}
      {status === 'error' && <p>Unable to load nearby parks.</p>}
      {status === 'ok' && parks.length === 0 && (
        <p>No other parks within {RADIUS_M / 1000} km.</p>
      )}
      {status === 'ok' && parks.length > 0 && (
        <>
          <p className="nearby-note">Distances are from the centre of {park.name}.</p>
          <ul>
            {parks.map((nearby) => (
              <li key={nearby._id}>
                <button type="button" onClick={() => onSelect(nearby._id)}>
                  {nearby.name}
                </button>
                {' '}
                <span className="nearby-distance">{formatDistance(nearby.distance)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

export default NearbyParks
