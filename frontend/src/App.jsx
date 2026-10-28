import { useEffect, useState } from 'react'
import { API_URL, getHello, listParks, searchParks } from './api.js'
import ParkCard from './components/ParkCard.jsx'
import BoroughFilter from './components/BoroughFilter.jsx'
import SearchBar from './components/SearchBar.jsx'
import TypeFilter from './components/TypeFilter.jsx'
import SortFilter from './components/SortFilter.jsx'
import ParkDetail from './components/ParkDetail.jsx'
import FindNearby from './components/FindNearby.jsx'

// Search has no borough or type parameter, so narrow its results here.
// Search results stay in best-match order, so sort only applies to the list.
async function loadParks(query, borough, type, page, sort) {
  if (!query) {
    return listParks({
      borough: borough || undefined, type: type || undefined, page, sort: sort || undefined,
    })
  }
  const results = await searchParks(query)
  return {
    parks: results.filter((park) => (!borough || park.borough === borough)
      && (!type || park.type === type)),
  }
}

function emptyMessage(query, borough, type) {
  if (query) return `No parks match "${query}".`
  if (type) return 'No parks match these filters.'
  if (borough) return 'No parks found in this borough.'
  return 'No parks available yet.'
}

function App() {
  const [status, setStatus] = useState('loading')
  const [parks, setParks] = useState([])
  const [parksStatus, setParksStatus] = useState('loading')
  const [borough, setBorough] = useState('')
  const [type, setType] = useState('')
  const [sort, setSort] = useState('')
  const [query, setQuery] = useState('')
  const [searchText, setSearchText] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedId, setSelectedId] = useState(null)
  const [retryCount, setRetryCount] = useState(0)

  function retryParks() {
    setParksStatus('loading')
    setRetryCount((count) => count + 1)
  }

  function changeBorough(value) {
    if (value === borough) return
    setBorough(value)
    setPage(1)
    setParksStatus('loading')
  }

  function changeType(value) {
    if (value === type) return
    setType(value)
    setPage(1)
    setParksStatus('loading')
  }

  function changeSort(value) {
    if (value === sort) return
    setSort(value)
    setPage(1)
    setParksStatus('loading')
  }

  function changeQuery(value) {
    if (value === query) return
    setQuery(value)
    setPage(1)
    setParksStatus('loading')
  }

  function changePage(value) {
    setPage(value)
    setParksStatus('loading')
  }

  function clearFilters() {
    setSearchText('')
    setQuery('')
    setBorough('')
    setType('')
    setSort('')
    setPage(1)
    if (query || borough || type || sort || page !== 1) setParksStatus('loading')
  }

  useEffect(() => {
    getHello()
      .then(() => setStatus('ok'))
      .catch(() => setStatus('error'))
  }, [])

  useEffect(() => {
    let active = true

    loadParks(query, borough, type, page, sort)
      .then((result) => {
        if (active) {
          setParks(result.parks)
          setTotalPages(query ? 1 : Math.max(1, Math.ceil(result.total / result.per_page)))
          setParksStatus('ok')
        }
      })
      .catch(() => {
        if (active) setParksStatus('error')
      })

    return () => { active = false }
  }, [query, borough, type, page, sort, retryCount])

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
      <FindNearby onSelect={setSelectedId} hidden={selectedId !== null} />
      <section aria-labelledby="parks-heading" hidden={selectedId !== null}>
        <h2 id="parks-heading">Parks</h2>
        <div className="filter-panel">
          <SearchBar text={searchText} onTextChange={setSearchText} onSearch={changeQuery} />
          <div className="filters">
            <BoroughFilter value={borough} onChange={changeBorough} />
            <TypeFilter value={type} onChange={changeType} />
            {!query && <SortFilter value={sort} onChange={changeSort} />}
            <button
              type="button"
              className="clear-filters"
              onClick={clearFilters}
              disabled={!searchText && !query && !borough && !type && !sort && page === 1}
            >Clear all filters</button>
          </div>
        </div>
        {parksStatus === 'loading' && <p>Loading parks…</p>}
        {parksStatus === 'error' && (
          <div>
            <p>Unable to load parks. Please try again later.</p>
            <button type="button" onClick={retryParks}>Try again</button>
          </div>
        )}
        {parksStatus === 'ok' && parks.length === 0 && (
          <p>{emptyMessage(query, borough, type)}</p>
        )}
        {parksStatus === 'ok' && parks.length > 0 && (
          <ul className="park-list">
            {parks.map((park) => (
              <li key={park._id}><ParkCard park={park} onSelect={setSelectedId} /></li>
            ))}
          </ul>
        )}
        {!query && (
          <nav className="pagination" aria-label="Parks pagination">
            <button
              type="button"
              disabled={parksStatus !== 'ok' || page <= 1}
              onClick={() => changePage(page - 1)}
            >Previous</button>
            <span role="status">
              {parksStatus === 'ok' ? `Page ${page} of ${totalPages}` : `Page ${page}`}
            </span>
            <button
              type="button"
              disabled={parksStatus !== 'ok' || page >= totalPages}
              onClick={() => changePage(page + 1)}
            >Next</button>
          </nav>
        )}
      </section>
    </main>
  )
}

export default App
