import { useEffect, useState } from 'react'
import { API_URL, getHello, listParks } from './api.js'
import ParkCard from './components/ParkCard.jsx'

function App() {
  const [status, setStatus] = useState('loading')
  const [parks, setParks] = useState([])
  const [parksStatus, setParksStatus] = useState('loading')

  useEffect(() => {
    getHello()
      .then(() => setStatus('ok'))
      .catch(() => setStatus('error'))
  }, [])

  useEffect(() => {
    let active = true

    listParks()
      .then((items) => {
        if (active) {
          setParks(items)
          setParksStatus('ok')
        }
      })
      .catch(() => {
        if (active) setParksStatus('error')
      })

    return () => { active = false }
  }, [])

  return (
    <main>
      <h1>NYC Parks</h1>
      {status === 'loading' && <p className="status">Connecting to API…</p>}
      {status === 'ok' && (
        <p className="status ok">Connected to API at {API_URL}</p>
      )}
      {status === 'error' && (
        <p className="status error">
          Can't reach the API at {API_URL}. Is the Flask server running?
        </p>
      )}
      <section aria-labelledby="parks-heading">
        <h2 id="parks-heading">Parks</h2>
        {parksStatus === 'loading' && <p>Loading parks…</p>}
        {parksStatus === 'error' && <p>Unable to load parks. Please try again later.</p>}
        {parksStatus === 'ok' && parks.length === 0 && <p>No parks available yet.</p>}
        {parksStatus === 'ok' && parks.length > 0 && (
          <ul className="park-list">
            {parks.map((park) => (
              <li key={park._id}><ParkCard park={park} /></li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

export default App
