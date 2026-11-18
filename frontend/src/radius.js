// Nearby search radii in meters. The backend allows up to 50 km, but past a
// few km "nearby" stops meaning walking distance.
export const RADII = [500, 1000, 2000, 5000]
export const DEFAULT_RADIUS = 1000

export function formatRadius(meters) {
  return meters < 1000 ? `${meters} m` : `${meters / 1000} km`
}
