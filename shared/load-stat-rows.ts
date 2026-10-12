// Supabase caps each response at 1,000 rows. Five-minute statistics need pagination.
export async function loadStatRows(db: any, adId: string, columns: string) {
  const rows: any[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from('ad_stats').select(columns).eq('ad_id', adId)
      .order('timestamp', { ascending: true }).order('id', { ascending: true }).range(offset, offset + 999);
    if (error) return { data: null, error };
    rows.push(...(data || []));
    if (!data || data.length < 1000) return { data: rows, error: null };
  }
}
