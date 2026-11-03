import { useEffect, useRef, useState } from 'react'
import { getPark } from '../api.js'
import ParkMap from './ParkMap.jsx'
import NearbyParks from './NearbyParks.jsx'
import { BOROUGH_NAMES } from '../boroughs.js'

function ParkDetail({ parkId, onBack, onSelect }) {
  const [park, setPark] = useState(null)
  const [status, setStatus] = useState('loading')
  const [retryCount, setRetryCount] = useState(0)
  const headingRef = useRef(null)

  function retryPark() {
    setStatus('loading')
    setRetryCount((count) => count + 1)
  }

  useEffect(() => {
    let active = true

    getPark(parkId)
      .then((result) => {
        if (active) {
          setPark(result)
          setStatus('ok')
        }
      })
      .catch((error) => {
        if (active) setStatus(error.status === 404 ? 'missing' : 'error')
      })

    return () => { active = false }
  }, [parkId, retryCount])

  // Brings the page back up to the park, e.g. after picking a nearby one.
  useEffect(() => {
    if (status === 'ok') headingRef.current?.focus()
  }, [status])

  return (
    <section className="park-detail" aria-label="Park details">
      <button type="button" onClick={onBack}>← Back to parks</button>
      {status === 'loading' && <p>Loading park…</p>}
      {status === 'missing' && <p>Park not found.</p>}
      {status === 'error' && (
        <div>
          <p>Unable to load this park. Please try again later.</p>
          <button type="button" onClick={retryPark}>Try again</button>
        </div>
      )}
      {status === 'ok' && (
        <>
          <h2 ref={headingRef} tabIndex={-1}>{park.name}</h2>
          <ParkMap geometry={park.geometry} name={park.name} />
          <dl>
            <dt>Type</dt>
            <dd>{park.type}</dd>
            <dt>Borough</dt>
            <dd>{BOROUGH_NAMES[park.borough] ?? park.borough}</dd>
            <dt>Size</dt>
            <dd>{park.acres} acres</dd>
            <dt>Address</dt>
            <dd>{park.address || 'Not listed'}</dd>
            <dt>ZIP code</dt>
            <dd>{park.zipcode || 'Not listed'}</dd>
            <dt>Waterfront</dt>
            <dd>{park.waterfront ? 'Yes' : 'No'}</dd>
          </dl>
          <NearbyParks park={park} onSelect={onSelect} />
        </>
      )}
    </section>
  )
}

export default ParkDetail
