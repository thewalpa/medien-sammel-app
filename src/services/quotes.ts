export async function searchQuotes(query: string, limit = 12): Promise<any[]> {
  if (!query || query.trim().length < 2) return [];
  const url = `https://dummyjson.com/quotes/search?q=${encodeURIComponent(query)}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Quotes search failed: ' + res.status);
  const data = await res.json();
  return (data.quotes || []).map((item: any) => ({
    title: item.quote,
    subtitle: item.author,
    imageUrl: null,
    year: new Date().getFullYear(), // Fallback / placeholder year
    externalId: String(item.id),
    type: 'quote',
    source: 'dummyjson',
    rawData: item,
  }));
}
