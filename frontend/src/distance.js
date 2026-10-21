// Show a distance in meters the way people say it: "here", "394 m", "1.5 km".
export function formatDistance(meters) {
  if (meters < 1) return 'here'
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}
