import { useState } from 'react'
import { geocode, nearParks, parksAt } from '../api.js'
import { DEFAULT_RADIUS, formatRadius } from '../radius.js'
import NearbyParkList from './NearbyParkList.jsx'
import RadiusFilter from './RadiusFilter.jsx'
import TypeFilter from './TypeFilter.jsx'

// Matches MAX_ADDRESS_LEN in parks/geocode.py.
const MAX_ADDRESS_LENGTH = 200

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
  const [radius, setRadius] = useState(DEFAULT_RADIUS)
  const [type, setType] = useState('')
  // The last spot searched, so changing a filter can search it again.
  const [place, setPlace] = useState(null)
  // The radius and type the shown results were found with.
  const [shown, setShown] = useState({ radius: DEFAULT_RADIUS, type: '' })
  const busy = status === 'loading' || status === 'locating'
  const canLocate = typeof navigator !== 'undefined' && 'geolocation' in navigator

  async function findParks(lat, lng, label, filters = { radius, type }) {
    const [nearby, containing] = await Promise.all([
      nearParks({
        lat, lng, radius: filters.radius, limit: MAX_SHOWN, type: filters.type || undefined,
      }),
      parksAt({ lat, lng }),
    ])
    setPlace({ lat, lng, label })
    setOrigin(label)
    setInside(containing)
    setParks(nearby)
    setShown(filters)
    setStatus('ok')
  }

  // Search the same spot again when a filter changes after a search.
  async function changeFilters(filters) {
    setRadius(filters.radius)
    setType(filters.type)
    if (!place || busy) return
    setStatus('loading')
    try {
      await findParks(place.lat, place.lng, place.label, filters)
    } catch {
      setStatus('error')
    }
  }

  async function searchAddress(event) {
    event.preventDefault()
    if (busy) return
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
    if (busy) return
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
            maxLength={MAX_ADDRESS_LENGTH}
            disabled={busy}
            placeholder="e.g. 120 Broadway"
            onChange={(event) => setAddress(event.target.value)}
          />
        </label>
        <button type="submit" disabled={busy}>Find parks</button>
        {canLocate && (
          <button type="button" onClick={searchMyLocation} disabled={busy}>Use my location</button>
        )}
      </form>
      <div className="nearby-filters">
        <RadiusFilter value={radius} onChange={(value) => changeFilters({ radius: value, type })} />
        <TypeFilter
          label="Nearby park type"
          value={type}
          onChange={(value) => changeFilters({ radius, type: value })}
        />
      </div>
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
            <p>No {shown.type ? `${shown.type} ` : ''}parks within {formatRadius(shown.radius)} of {origin}.</p>
          ) : (
            <>
              <p className="nearby-note">
                {shown.type ? `${shown.type} parks` : 'Parks'} within {formatRadius(shown.radius)} of {origin},
                closest first:
              </p>
              <NearbyParkList parks={parks} onSelect={onSelect} />
            </>
          )}
        </div>
      )}
    </section>
  )
}

export default FindNearby
