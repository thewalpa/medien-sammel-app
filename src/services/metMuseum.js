const BASE = 'https://collectionapi.metmuseum.org/public/collection/v1'

export async function searchArt(query, limit = 12) {
  if (!query || query.trim().length < 2) return []
  const searchRes = await fetch(BASE + '/search?q=' + encodeURIComponent(query) + '&hasImages=true')
  if (!searchRes.ok) throw new Error('Met Museum search failed: ' + searchRes.status)
  const searchData = await searchRes.json()
  const objectIDs = (searchData.objectIDs || []).slice(0, limit)
  if (objectIDs.length === 0) return []
  const objects = await Promise.allSettled(
    objectIDs.map((id) => fetch(BASE + '/objects/' + id).then((r) => {
      if (!r.ok) throw new Error(r.status)
      return r.json()
    }))
  )
  return objects
    .filter((r) => r.status === 'fulfilled' && r.value)
    .map((r) => r.value)
    .filter((obj) => obj.primaryImageSmall)
    .map((obj) => ({
      title: obj.title || 'Untitled',
      subtitle: [obj.artistDisplayName, obj.objectDate].filter(Boolean).join(' · '),
      imageUrl: obj.primaryImageSmall || null,
      year: obj.objectBeginDate || null,
      externalId: String(obj.objectID),
      type: 'art',
      source: 'metmuseum',
      rawData: { department: obj.department, medium: obj.medium, artistDisplayName: obj.artistDisplayName, objectDate: obj.objectDate },
    }))
}
