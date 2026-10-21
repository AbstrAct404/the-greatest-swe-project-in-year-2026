import { useState } from 'react'
import { geocode, nearParks, parksAt } from '../api.js'
import { formatDistance } from '../distance.js'

const RADIUS_M = 1000
const MAX_SHOWN = 10
const MY_LOCATION = 'your location'
const GEO_TIMEOUT_MS = 10000

// The browser's location API uses callbacks; wrap it in a promise.
function currentPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
      reject,
      { timeout: GEO_TIMEOUT_MS },
    )
  })
}

// Find parks near an address or the user's own location, and say which
// park (if any) that spot is inside.
function FindNearby({ onSelect, hidden = false }) {
  const [address, setAddress] = useState('')
  const [status, setStatus] = useState('idle')
  const [origin, setOrigin] = useState('')
  const [inside, setInside] = useState([])
  const [parks, setParks] = useState([])
  const canLocate = typeof navigator !== 'undefined' && 'geolocation' in navigator

  async function findParks(lat, lng, label) {
    const [nearby, containing] = await Promise.all([
      nearParks({ lat, lng, radius: RADIUS_M, limit: MAX_SHOWN }),
      parksAt({ lat, lng }),
    ])
    setOrigin(label)
    setInside(containing)
    setParks(nearby)
    setStatus('ok')
  }

  async function searchAddress(event) {
    event.preventDefault()
    const text = address.trim()
    if (!text) return
    setStatus('loading')
    try {
      const place = await geocode(text)
      await findParks(place.lat, place.lng, place.label)
    } catch (error) {
      setStatus(error.status === 404 ? 'not-found' : 'error')
    }
  }

  async function searchMyLocation() {
    setStatus('locating')
    let position
    try {
      position = await currentPosition()
    } catch {
      setStatus('denied')
      return
    }
    setStatus('loading')
    try {
      await findParks(position.lat, position.lng, MY_LOCATION)
    } catch {
      setStatus('error')
    }
  }

  return (
    <section className="find-nearby" aria-labelledby="find-nearby-heading" hidden={hidden}>
      <h2 id="find-nearby-heading">Find parks near you</h2>
      <form onSubmit={searchAddress}>
        <label>
          Address or place
          <input
            type="text"
            value={address}
            placeholder="e.g. 120 Broadway"
            onChange={(event) => setAddress(event.target.value)}
          />
        </label>
        <button type="submit">Find parks</button>
        {canLocate && (
          <button type="button" onClick={searchMyLocation}>Use my location</button>
        )}
      </form>
      {status === 'locating' && <p>Getting your location…</p>}
      {status === 'loading' && <p>Finding parks…</p>}
      {status === 'not-found' && <p>Couldn't find that address. Try adding the borough.</p>}
      {status === 'denied' && (
        <p>Couldn't get your location. Check your browser's location permission, or type an address.</p>
      )}
      {status === 'error' && <p>Unable to find parks right now. Please try again later.</p>}
      {status === 'ok' && (
        <div aria-live="polite">
          {inside.length > 0 && (
            <p className="inside-park">
              {origin === MY_LOCATION ? "You're in " : `${origin} is in `}
              <strong>{inside.map((park) => park.name).join(' and ')}</strong>.
            </p>
          )}
          {parks.length === 0 ? (
            <p>No parks within {RADIUS_M / 1000} km of {origin}.</p>
          ) : (
            <>
              <p className="nearby-note">Parks within {RADIUS_M / 1000} km of {origin}, closest first:</p>
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
            </>
          )}
        </div>
      )}
    </section>
  )
}

export default FindNearby
