exports.sb = async (path, o = {}) => {
  const U = process.env.SUPABASE_URL, K = process.env.SUPABASE_SERVICE_KEY;
  if (!U || !K) throw new Error('Supabase is not configured');
  const r = await fetch(U.replace(/\/$/, '') + '/rest/v1/' + path, {
    method: o.method || 'GET',
    headers: { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json', Prefer: o.prefer || 'return=representation' },
    body: o.body ? JSON.stringify(o.body) : undefined
  });
  const t = await r.text();
  if (!r.ok) throw new Error(t);
  return t ? JSON.parse(t) : [];
};
exports.isAdmin = s => {
  const a = (process.env.ADMIN_IDS || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
  return a.includes(String(s.id).toLowerCase()) || (!!s.email && a.includes(s.email.toLowerCase()));
};
exports.GIFTS = [
  { id: 'star', name: 'Star', price: 10 }, { id: 'heart', name: 'Heart', price: 25 },
  { id: 'gem', name: 'Gem', price: 50 }, { id: 'crown', name: 'Crown', price: 100 },
  { id: 'rocket', name: 'Rocket', price: 200 }
];
