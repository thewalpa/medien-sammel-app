const BASE = 'https://api.themoviedb.org/3'
const IMG_BASE = 'https://image.tmdb.org/t/p/w185'

function getApiKey() {
  try { return localStorage.getItem('tmdb_api_key') || '' } catch { return '' }
}
export function hasTmdbKey() { return getApiKey().length > 0 }
export function setTmdbKey(key) { localStorage.setItem('tmdb_api_key', key.trim()) }
export function getTmdbKey() { return getApiKey() }

export async function searchMovies(query, limit = 12) {
  if (!query || query.trim().length < 2) return []
  const apiKey = getApiKey()
  if (!apiKey) return []
  const url = BASE + '/search/multi?api_key=' + apiKey + '&query=' + encodeURIComponent(query) + '&include_adult=false&language=en-US&page=1'
  const res = await fetch(url)
  if (!res.ok) {
    if (res.status === 401) throw new Error('Invalid TMDB API key')
    throw new Error('TMDB search failed: ' + res.status)
  }
  const data = await res.json()
  return (data.results || [])
    .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
    .slice(0, limit)
    .map((item) => {
      const isMovie = item.media_type === 'movie'
      const title = isMovie ? item.title : item.name
      const date = isMovie ? item.release_date : item.first_air_date
      const year = date ? date.slice(0, 4) : null
      return {
        title: title || 'Untitled',
        subtitle: [(item.media_type === 'tv' ? 'Series' : 'Movie'), year].filter(Boolean).join(' · '),
        imageUrl: item.poster_path ? IMG_BASE + item.poster_path : null,
        year: year ? parseInt(year, 10) : null,
        externalId: String(item.id),
        type: 'movie',
        source: 'tmdb',
        rawData: item,
      }
    })
}
