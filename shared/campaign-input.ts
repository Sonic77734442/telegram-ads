const strings = ['title', 'text', 'url', 'website_name', 'button', 'target', 'other_info', 'conversion_event'];
const lists = ['countries', 'locations', 'langs', 'topics', 'ex_topics', 'channels', 'audiences', 'exclude_channels', 'devices'];
const booleans = ['schedule_enabled', 'politics_only', 'exclude_politics'];

export function campaignInput(body: unknown): Record<string, any> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid campaign');
  const input = body as Record<string, any>;
  const out: Record<string, any> = {};
  for (const key of strings) {
    if (input[key] === undefined) continue;
    if (typeof input[key] !== 'string' || input[key].length > 10000) throw new Error(`Invalid ${key}`);
    out[key] = input[key].trim();
  }
  if (!out.title || !out.url) throw new Error('Укажите название объявления и ссылку.');
  if (!['user','channel','search','bot'].includes(input.type)) throw new Error('Invalid campaign type');
  out.type = input.type;
  if (out.type !== 'search' && !out.text) throw new Error('Укажите текст объявления.');
  if (/^(?:javascript|data|vbscript):/i.test(out.url)) throw new Error('Invalid URL');
  for (const key of ['cpm','budget','daily_budget','daily_views']) {
    if (input[key] === undefined && ['daily_budget','daily_views'].includes(key)) continue;
    const value = input[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error(`Invalid ${key}`);
    if (key === 'cpm' && value <= 0) throw new Error('CPM должен быть больше нуля.');
    if (key === 'daily_views' && (!Number.isInteger(value) || value < 1 || value > 4)) throw new Error('Invalid daily views');
    out[key] = value;
  }
  for (const key of lists) {
    if (input[key] === undefined) continue;
    if (!Array.isArray(input[key]) || input[key].length > 1000 || input[key].some((v: unknown) => typeof v !== 'string' || v.length > 1000)) throw new Error(`Invalid ${key}`);
    out[key] = input[key];
  }
  for (const key of booleans) {
    if (input[key] === undefined) continue;
    if (typeof input[key] !== 'boolean') throw new Error(`Invalid ${key}`);
    out[key] = input[key];
  }
  const status = String(input.status || 'hold').trim().toLowerCase();
  if (!['active','hold','on hold','paused','moderate'].includes(status)) throw new Error('Invalid status');
  out.status = status === 'active' ? 'Active' : status === 'moderate' ? 'Moderate' : 'On Hold';
  for (const key of ['start_date','end_date']) {
    if (input[key] === undefined) continue;
    if (input[key] !== null && (typeof input[key] !== 'string' || !Number.isFinite(Date.parse(input[key])))) throw new Error(`Invalid ${key}`);
    out[key] = input[key];
  }
  if (out.start_date && out.end_date && Date.parse(out.end_date) < Date.parse(out.start_date)) throw new Error('Дата окончания должна быть позже даты начала.');
  if (input.media_url !== undefined) {
    if (typeof input.media_url !== 'string' || input.media_url.length > 4000 || (input.media_url && !/^https:\/\//i.test(input.media_url))) throw new Error('Invalid media URL');
    out.media_url = input.media_url;
  }
  if (input.media_type !== undefined) {
    if (![null,'image','video'].includes(input.media_type)) throw new Error('Invalid media type');
    out.media_type = input.media_type;
  }
  if (input.placement !== undefined) {
    if (!['message','banner'].includes(input.placement)) throw new Error('Invalid placement');
    out.placement = input.placement;
  }
  // Ownership, IDs, timestamps, metrics and computed columns never come from the browser.
  return out;
}
