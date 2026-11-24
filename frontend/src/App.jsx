import { useEffect, useRef, useState } from 'react'
import { API_URL, getHealth, listParks, searchParks } from './api.js'
import { BOROUGH_NAMES } from './boroughs.js'
import { PARK_TYPES } from './parkTypes.js'
import { SIZE_OPTIONS } from './sizes.js'
import { SORT_OPTIONS } from './sortOrders.js'
import ParkCard from './components/ParkCard.jsx'
import BoroughFilter from './components/BoroughFilter.jsx'
import SearchBar, { MAX_SEARCH_LENGTH } from './components/SearchBar.jsx'
import TypeFilter from './components/TypeFilter.jsx'
import SortFilter from './components/SortFilter.jsx'
import SizeFilter from './components/SizeFilter.jsx'
import ParkDetail from './components/ParkDetail.jsx'
import FindNearby from './components/FindNearby.jsx'
import SavedParks from './components/SavedParks.jsx'

// The server filters and pages both the list and search results.
// Search results stay in best-match order, so sort only applies to the list.
function loadParks(query, borough, type, minAcres, page, sort) {
  const filters = {
    borough: borough || undefined,
    type: type || undefined,
    minAcres: minAcres ? Number(minAcres) : undefined,
    page,
  }
  if (!query) return listParks({ ...filters, sort: sort || undefined })
  return searchParks({ text: query, ...filters })
}

// The open park lives in ?park=<id>, so a refresh or a shared link reopens
// it and the browser's Back button closes it.
// An empty ?park= counts as no park, or it would hide the list too.
function parkFromUrl() {
  return new URLSearchParams(window.location.search).get('park') || null
}

function urlWithPark(id) {
  const url = new URL(window.location.href)
  if (id === null) url.searchParams.delete('park')
  else url.searchParams.set('park', id)
  return url
}

// The search, filters, sort and page live in the URL too, so a list can be
// bookmarked or shared. Defaults are left out to keep links short.
const LIST_PARAMS = {
  query: 'q', borough: 'borough', type: 'type', minAcres: 'min_acres', sort: 'sort',
}

// Values the filters can't show (an edited or outdated link) are dropped
// rather than sent to the server, which would reject some of them.
const ALLOWED = {
  borough: Object.keys(BOROUGH_NAMES),
  type: PARK_TYPES,
  minAcres: SIZE_OPTIONS.map((option) => option.value),
  sort: SORT_OPTIONS.map((option) => option.value),
}

function listFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const page = Number(params.get('page'))
  const list = {
    query: (params.get('q') ?? '').trim().slice(0, MAX_SEARCH_LENGTH),
    page: Number.isSafeInteger(page) && page > 1 ? page : 1,
  }
  for (const [key, allowed] of Object.entries(ALLOWED)) {
    const value = params.get(LIST_PARAMS[key]) ?? ''
    list[key] = allowed.includes(value) ? value : ''
  }
  return list
}

function sameList(a, b) {
  return Object.keys(a).every((key) => a[key] === b[key])
}

function urlWithList(list) {
  const url = new URL(window.location.href)
  for (const [key, param] of Object.entries(LIST_PARAMS)) {
    if (list[key]) url.searchParams.set(param, list[key])
    else url.searchParams.delete(param)
  }
  if (list.page > 1) url.searchParams.set('page', list.page)
  else url.searchParams.delete('page')
  return url
}

function emptyMessage(query, borough, type, minAcres) {
  if (query) return `No parks match "${query}".`
  if (type || minAcres) return 'No parks match these filters.'
  if (borough) return 'No parks found in this borough.'
  return 'No parks available yet.'
}

function App() {
  const [initialList] = useState(listFromUrl)
  const [status, setStatus] = useState('loading')
  const [parks, setParks] = useState([])
  const [parksStatus, setParksStatus] = useState('loading')
  const [borough, setBorough] = useState(initialList.borough)
  const [type, setType] = useState(initialList.type)
  const [minAcres, setMinAcres] = useState(initialList.minAcres)
  const [sort, setSort] = useState(initialList.sort)
  const [query, setQuery] = useState(initialList.query)
  const [searchText, setSearchText] = useState(initialList.query)
  const [page, setPage] = useState(initialList.page)
  const [totalPages, setTotalPages] = useState(1)
  const [totalParks, setTotalParks] = useState(0)
  const [selectedId, setSelectedId] = useState(parkFromUrl)
  const [retryCount, setRetryCount] = useState(0)
  const openerRef = useRef(null)
  // Set when the next list change fixes up the URL rather than being
  // something the user did, so it shouldn't add a history entry.
  const replaceUrlRef = useRef(true)

  // Remember what opened the first park (not a nearby one picked from its
  // details), so going back can return focus to it.
  // Each park opened adds a history entry; parkDepth counts how many in a
  // row, so going back to the list can skip past them all.
  function openPark(id) {
    if (selectedId === null) openerRef.current = document.activeElement
    const parkDepth = (window.history.state?.parkDepth ?? 0) + 1
    window.history.pushState({ parkDepth }, '', urlWithPark(id))
    setSelectedId(id)
  }

  // A park opened straight from a link has no list entry behind it, so
  // replace its entry with the list instead.
  function closePark() {
    const parkDepth = window.history.state?.parkDepth ?? 0
    if (parkDepth > 0) window.history.go(-parkDepth)
    else window.history.replaceState(null, '', urlWithPark(null))
    setSelectedId(null)
  }

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

  function changeMinAcres(value) {
    if (value === minAcres) return
    setMinAcres(value)
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
    setMinAcres('')
    setSort('')
    setPage(1)
    if (query || borough || type || minAcres || sort || page !== 1) setParksStatus('loading')
  }

  useEffect(() => {
    getHealth()
      .then((health) => setStatus(health.database === 'up' ? 'ok' : 'db-down'))
      .catch(() => setStatus('error'))
  }, [])

  // Back and Forward can change the open park, the list, or both.
  useEffect(() => {
    function syncUrl() {
      setSelectedId(parkFromUrl())
      const list = listFromUrl()
      if (sameList(list, { query, borough, type, minAcres, sort, page })) return
      setQuery(list.query)
      setSearchText(list.query)
      setBorough(list.borough)
      setType(list.type)
      setMinAcres(list.minAcres)
      setSort(list.sort)
      setPage(list.page)
      setParksStatus('loading')
    }
    window.addEventListener('popstate', syncUrl)
    return () => window.removeEventListener('popstate', syncUrl)
  }, [query, borough, type, minAcres, sort, page])

  // Each search, filter or page change gets its own history entry, so Back
  // undoes it. State restored by Back already matches the URL, so it's
  // skipped here. Fix-ups (dropping bad values on load, moving off a page
  // past the end) replace the entry and keep the park's parkDepth.
  useEffect(() => {
    const url = urlWithList({ query, borough, type, minAcres, sort, page })
    if (url.href !== window.location.href) {
      if (replaceUrlRef.current) window.history.replaceState(window.history.state, '', url)
      else window.history.pushState(null, '', url)
    }
    replaceUrlRef.current = false
  }, [query, borough, type, minAcres, sort, page])

  // Runs once the list is shown again, since a hidden button can't take focus.
  useEffect(() => {
    if (selectedId === null && openerRef.current) {
      openerRef.current.focus()
      openerRef.current = null
    }
  }, [selectedId])

  useEffect(() => {
    let active = true

    loadParks(query, borough, type, minAcres, page, sort)
      .then((result) => {
        if (!active) return
        const lastPage = Math.max(1, Math.ceil(result.total / result.per_page))
        // A link to a page that no longer exists loads the last one instead.
        if (page > lastPage) {
          replaceUrlRef.current = true
          setPage(lastPage)
          return
        }
        setParks(result.parks)
        setTotalParks(result.total)
        setTotalPages(lastPage)
        setParksStatus('ok')
      })
      .catch(() => {
        if (active) setParksStatus('error')
      })

    return () => { active = false }
  }, [query, borough, type, minAcres, page, sort, retryCount])

  return (
    <main>
      <h1>NYC Parks</h1>
      {status === 'loading' && <p className="status">Connecting to API…</p>}
      {status === 'ok' && (
        <p className="status ok">Connected to API at {API_URL}</p>
      )}
      {status === 'db-down' && (
        <p className="status error">
          The API at {API_URL} is running, but it can't reach the database.
          Is MongoDB running?
        </p>
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
          onBack={closePark}
          onSelect={openPark}
        />
      )}
      {/* Hidden rather than removed, so the search and filter survive. */}
      <FindNearby onSelect={openPark} hidden={selectedId !== null} />
      <SavedParks onSelect={openPark} hidden={selectedId !== null} />
      <section aria-labelledby="parks-heading" hidden={selectedId !== null}>
        <h2 id="parks-heading">Parks</h2>
        <div className="filter-panel">
          <SearchBar text={searchText} onTextChange={setSearchText} onSearch={changeQuery} />
          <div className="filters">
            <BoroughFilter value={borough} onChange={changeBorough} />
            <TypeFilter value={type} onChange={changeType} />
            <SizeFilter value={minAcres} onChange={changeMinAcres} />
            {!query && <SortFilter value={sort} onChange={changeSort} />}
            <button
              type="button"
              className="clear-filters"
              onClick={clearFilters}
              disabled={!searchText && !query && !borough && !type && !minAcres && !sort && page === 1}
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
        {parksStatus === 'ok' && (
          <p role="status">
            {totalParks.toLocaleString('en-US')} {totalParks === 1 ? 'park' : 'parks'} found
          </p>
        )}
        {parksStatus === 'ok' && parks.length === 0 && (
          <p>{emptyMessage(query, borough, type, minAcres)}</p>
        )}
        {parksStatus === 'ok' && parks.length > 0 && (
          <ul className="park-list">
            {parks.map((park) => (
              <li key={park._id}><ParkCard park={park} onSelect={openPark} /></li>
            ))}
          </ul>
        )}
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
      </section>
    </main>
  )
}

export default App
