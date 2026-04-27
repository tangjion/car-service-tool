// Pure filter predicates for captured network records.
//
// Query language (space-separated tokens):
//   plain text                -> URL substring (case-insensitive)
//   method:GET                -> exact method match
//   status:200                -> exact status
//   status:5..                -> status range (5..  = 500..599; 4..5 = 400..599)
//   -foo                      -> exclude URL substring
//
// Type filters are passed separately as a Set of allowed types
// (xhr | fetch | document | other). Empty set = allow all.

export function parseQuery(input) {
  const tokens = String(input || '').trim().split(/\s+/).filter(Boolean);
  const includeText = [];
  const excludeText = [];
  let method = null;
  let statusRange = null;

  for (const t of tokens) {
    const m = t.match(/^method:(.+)$/i);
    if (m) { method = m[1].toUpperCase(); continue; }

    const s = t.match(/^status:(\d?)\.\.(\d?)$/);
    if (s) {
      const lo = s[1] === '' ? 0 : Number(s[1]) * 100;
      const hi = s[2] === '' ? 999 : Number(s[2]) * 100 + 99;
      statusRange = [lo, hi];
      continue;
    }
    const sExact = t.match(/^status:(\d+)$/);
    if (sExact) { statusRange = [Number(sExact[1]), Number(sExact[1])]; continue; }

    if (t.startsWith('-') && t.length > 1) excludeText.push(t.slice(1).toLowerCase());
    else includeText.push(t.toLowerCase());
  }

  return { includeText, excludeText, method, statusRange };
}

export function matches(record, parsed, allowedTypes) {
  if (allowedTypes && allowedTypes.size > 0 && !allowedTypes.has(record.type)) return false;
  if (parsed.method && record.method !== parsed.method) return false;
  if (parsed.statusRange) {
    const [lo, hi] = parsed.statusRange;
    if (!(record.status >= lo && record.status <= hi)) return false;
  }
  const url = String(record.url || '').toLowerCase();
  for (const ex of parsed.excludeText) if (url.includes(ex)) return false;
  for (const inc of parsed.includeText) if (!url.includes(inc)) return false;
  return true;
}

export function classifyType(harEntry) {
  // harEntry._resourceType is set by Chrome devtools API ("xhr", "fetch", "document", ...).
  const t = harEntry && harEntry._resourceType;
  if (t === 'xhr' || t === 'fetch' || t === 'document') return t;
  return 'other';
}
