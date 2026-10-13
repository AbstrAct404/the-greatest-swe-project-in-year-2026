import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
const MAX_ZOOM = 19
const BOUNDARY_STYLE = { color: '#2f7d32', weight: 2, fillOpacity: 0.25 }

// Draws a park's boundary (GeoJSON, [lng, lat] order) on an OpenStreetMap
// map, zoomed to fit the park.
function ParkMap({ geometry, name }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!geometry) return undefined
    const map = L.map(containerRef.current, { scrollWheelZoom: false })
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: MAX_ZOOM })
      .addTo(map)
    const boundary = L.geoJSON(geometry, { style: BOUNDARY_STYLE }).addTo(map)
    map.fitBounds(boundary.getBounds(), { padding: [16, 16] })
    return () => map.remove()
  }, [geometry])

  if (!geometry) return <p>No map available for this park.</p>

  return (
    <div
      ref={containerRef}
      className="park-map"
      role="img"
      aria-label={`Map of ${name}`}
    />
  )
}

export default ParkMap
