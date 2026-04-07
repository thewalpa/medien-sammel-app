const BASE = 'https://musicbrainz.org/ws/2'

export async function searchMusic(query, limit = 12) {
  if (!query || query.trim().length < 2) return []
  const url = BASE + '/release?query=' + encodeURIComponent(query) + '&fmt=json&limit=' + limit
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'MedienSammelApp/1.0 (medien-sammel-app)',
      Accept: 'application/json',
    },
  })
  if (!res.ok) throw new Error('MusicBrainz search failed: ' + res.status)
  const data = await res.json()
  return (data.releases || []).map((release) => {
    const artists = release['artist-credit']?.map((c) => c.name || c.artist?.name).filter(Boolean).join(', ')
    return {
      title: release.title || 'Untitled',
      subtitle: [artists, release.date?.slice(0, 4)].filter(Boolean).join(' · '),
      imageUrl: release.id ? 'https://coverartarchive.org/release/' + release.id + '/front-250' : null,
      year: release.date ? parseInt(release.date.slice(0, 4), 10) : null,
      externalId: release.id,
      type: 'music',
      source: 'musicbrainz',
      rawData: release,
    }
  })
}
