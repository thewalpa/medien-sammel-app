async function searchVAMuseum(q: string, type: 'fashion' | 'ad', limit = 12): Promise<any[]> {
  if (!q || q.trim().length < 2) return [];
  const url = `https://api.vam.ac.uk/v2/objects/search?q=${encodeURIComponent(q)}&page_size=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('V&A collections search failed: ' + res.status);
  const data = await res.json();
  return (data.records || []).map((item: any) => {
    const title = item._primaryTitle || (type === 'fashion' ? 'Fashion Piece' : 'Ad Campaign');
    const creator = item._primaryMaker?.name || 'Unknown Maker';
    const date = item._primaryDate || '';
    
    // Extract year
    const yearMatch = date.match(/\b(19\d\d|20\d\d|18\d\d|17\d\d)\b/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();
    
    // Image URL construction
    let imageUrl = null;
    if (item._images?._primary_thumbnail) {
      imageUrl = item._images._primary_thumbnail;
    } else if (item._primaryImageId) {
      imageUrl = `https://media.vam.ac.uk/media/thb/images/od/${item._primaryImageId}.jpg`;
    }

    return {
      title,
      subtitle: [creator, date].filter(Boolean).join(' · '),
      imageUrl,
      year,
      externalId: item.systemNumber,
      type,
      source: 'vamuseum',
      rawData: item,
    };
  });
}

export function searchFashion(query: string, limit = 12) {
  return searchVAMuseum(`fashion ${query}`, 'fashion', limit);
}

export function searchAds(query: string, limit = 12) {
  return searchVAMuseum(`advertisement ${query}`, 'ad', limit);
}
