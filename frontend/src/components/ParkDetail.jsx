import { useEffect, useState } from 'react'
import { getPark } from '../api.js'
import ParkMap from './ParkMap.jsx'

const BOROUGH_NAMES = {
  X: 'Bronx',
  B: 'Brooklyn',
  M: 'Manhattan',
  Q: 'Queens',
  R: 'Staten Island',
}

function ParkDetail({ parkId, onBack }) {
  const [park, setPark] = useState(null)
  const [status, setStatus] = useState('loading')

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
  }, [parkId])

  return (
    <section className="park-detail" aria-label="Park details">
      <button type="button" onClick={onBack}>← Back to parks</button>
      {status === 'loading' && <p>Loading park…</p>}
      {status === 'missing' && <p>Park not found.</p>}
      {status === 'error' && <p>Unable to load this park. Please try again later.</p>}
      {status === 'ok' && (
        <>
          <h2>{park.name}</h2>
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
        </>
      )}
    </section>
  )
}

export default ParkDetail
