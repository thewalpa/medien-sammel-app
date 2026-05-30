export async function searchWikipedia(query: string, type: 'person' | 'place', limit = 12): Promise<any[]> {
  if (!query || query.trim().length < 2) return [];
  
  // Construct Wikipedia search query with extracts and pageimages
  const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=${limit}&prop=pageimages|extracts&piprop=thumbnail&pithumbsize=250&exintro&explaintext&exsentences=1&format=json&origin=*`;
  
  const res = await fetch(url);
  if (!res.ok) throw new Error('Wikipedia search failed: ' + res.status);
  const data = await res.json();
  
  const pages = data.query?.pages;
  if (!pages) return [];
  
  return Object.values(pages).map((page: any) => {
    const title = page.title || 'Untitled Entity';
    const snippet = page.extract || '';
    const imageUrl = page.thumbnail?.source || null;
    
    // Extract year from snippet if possible
    const yearMatch = snippet.match(/\b(19\d\d|20\d\d|18\d\d|17\d\d)\b/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();

    return {
      title,
      subtitle: snippet ? (snippet.length > 80 ? snippet.slice(0, 80) + '...' : snippet) : (type === 'person' ? 'Wikipedia Person' : 'Wikipedia Place'),
      imageUrl,
      year,
      externalId: String(page.pageid),
      type,
      source: 'wikipedia',
      rawData: page,
    };
  });
}
