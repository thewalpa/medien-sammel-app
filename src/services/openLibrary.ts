const BASE = 'https://openlibrary.org'

export async function searchBooks(query: string, limit = 12): Promise<any[]> {
  if (!query || query.trim().length < 2) return []
  const url = BASE + '/search.json?q=' + encodeURIComponent(query) + '&limit=' + limit +
    '&fields=key,title,author_name,first_publish_year,cover_i,isbn,edition_count'
  const res = await fetch(url)
  if (!res.ok) throw new Error('Open Library search failed: ' + res.status)
  const data = await res.json()
  return (data.docs || []).map((doc: any) => ({
    title: doc.title || 'Untitled',
    subtitle: [doc.author_name?.join(', '), doc.first_publish_year].filter(Boolean).join(' · '),
    imageUrl: doc.cover_i ? 'https://covers.openlibrary.org/b/id/' + doc.cover_i + '-M.jpg' : null,
    year: doc.first_publish_year || null,
    externalId: doc.key,
    type: 'book',
    source: 'openlibrary',
    rawData: doc,
  }))
}
