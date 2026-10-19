import { useEffect, useState } from 'react'
import { API_URL, getHello, listParks, searchParks } from './api.js'
import ParkCard from './components/ParkCard.jsx'
import BoroughFilter from './components/BoroughFilter.jsx'
import SearchBar from './components/SearchBar.jsx'
import ParkDetail from './components/ParkDetail.jsx'

// Search has no borough parameter, so narrow its results here.
async function loadParks(query, borough) {
  if (!query) return listParks({ borough: borough || undefined })
  const results = await searchParks(query)
  return borough ? results.filter((park) => park.borough === borough) : results
}

function emptyMessage(query, borough) {
  if (query) return `No parks match "${query}".`
  if (borough) return 'No parks found in this borough.'
  return 'No parks available yet.'
}

function App() {
  const [status, setStatus] = useState('loading')
  const [parks, setParks] = useState([])
  const [parksStatus, setParksStatus] = useState('loading')
  const [borough, setBorough] = useState('')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  function changeBorough(value) {
    if (value === borough) return
    setBorough(value)
    setParksStatus('loading')
  }

  function changeQuery(value) {
    if (value === query) return
    setQuery(value)
    setParksStatus('loading')
  }

  useEffect(() => {
    getHello()
      .then(() => setStatus('ok'))
      .catch(() => setStatus('error'))
  }, [])

  useEffect(() => {
    let active = true

    loadParks(query, borough)
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
  }, [query, borough])

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
      {selectedId && (
        <ParkDetail
          key={selectedId}
          parkId={selectedId}
          onBack={() => setSelectedId(null)}
          onSelect={setSelectedId}
        />
      )}
      {/* Hidden rather than removed, so the search and filter survive. */}
      <section aria-labelledby="parks-heading" hidden={selectedId !== null}>
        <h2 id="parks-heading">Parks</h2>
        <SearchBar onSearch={changeQuery} />
        <BoroughFilter value={borough} onChange={changeBorough} />
        {parksStatus === 'loading' && <p>Loading parks…</p>}
        {parksStatus === 'error' && <p>Unable to load parks. Please try again later.</p>}
        {parksStatus === 'ok' && parks.length === 0 && (
          <p>{emptyMessage(query, borough)}</p>
        )}
        {parksStatus === 'ok' && parks.length > 0 && (
          <ul className="park-list">
            {parks.map((park) => (
              <li key={park._id}><ParkCard park={park} onSelect={setSelectedId} /></li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

export default App
