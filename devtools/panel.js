import * as store from '../lib/store.js';
import * as har from '../lib/har.js';
import * as curl from '../lib/curl.js';
import { parseQuery, matches, classifyType } from '../lib/filter.js';

const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2MB per response

// Klook 域名白名单（与 manifest host_permissions 保持一致）
const HOST_WHITELIST = [
  /\.klook\.com$/i,
  /\.klook\.io$/i,
  /\.klooktest\.com$/i,
  /^localhost$/i,
];

function inWhitelist(url) {
  try {
    const host = new URL(url).hostname;
    return HOST_WHITELIST.some(re => re.test(host));
  } catch {
    return false;
  }
}

const state = {
  records: [],         // in-memory, ordered by insertion (== chronological)
  byId: new Map(),
  selectedId: null,
  recording: true,
  filterInput: '',
  allowedTypes: new Set(['xhr', 'fetch', 'document', 'other']),
  detailTab: 'response',
  bodyView: 'pretty',
};

const els = {
  recording: document.getElementById('recording'),
  clear: document.getElementById('clear'),
  filter: document.getElementById('filter'),
  rows: document.getElementById('rows'),
  list: document.getElementById('list'),
  empty: document.getElementById('empty'),
  detail: document.getElementById('detail'),
  info: document.getElementById('info'),
  exportHar: document.getElementById('export-har'),
  exportJson: document.getElementById('export-json'),
  typeBoxes: document.querySelectorAll('.toolbar .types input[type=checkbox]'),
};

// ---------- Capture ----------

chrome.devtools.network.onRequestFinished.addListener(handleRequest);

function handleRequest(harEntry) {
  if (!state.recording) return;
  const url = harEntry.request?.url || '';
  if (!inWhitelist(url)) return;

  // request.getContent must be called immediately while devtools holds the body.
  harEntry.getContent((content, encoding) => {
    const record = buildRecord(harEntry, content, encoding);
    addRecord(record);
  });
}

function buildRecord(harEntry, content, encoding) {
  const req = harEntry.request || {};
  const res = harEntry.response || {};

  let body = content || '';
  let truncated = false;
  if (body.length > MAX_BODY_BYTES) {
    body = body.slice(0, MAX_BODY_BYTES);
    truncated = true;
  }

  const startedDateTime = harEntry.startedDateTime || new Date().toISOString();
  const requestId = `${req.method || 'GET'}-${req.url || ''}-${startedDateTime}`;

  return {
    id: requestId,
    url: req.url || '',
    method: req.method || 'GET',
    status: res.status || 0,
    statusText: res.statusText || '',
    httpVersion: res.httpVersion || 'HTTP/1.1',
    type: classifyType(harEntry),
    size: (res.content && res.content.size) || 0,
    time: harEntry.time || 0,
    timings: harEntry.timings || null,
    reqHeaders: req.headers || [],
    reqPostData: req.postData || null,
    resHeaders: res.headers || [],
    body,
    encoding: encoding || 'utf-8',
    truncated,
    startedDateTime,
    tabId: chrome.devtools.inspectedWindow.tabId,
  };
}

async function addRecord(record) {
  const existing = state.byId.get(record.id);
  if (existing) {
    // Merge: prefer the side that actually has body content. DevTools-side
    // capture often lands first with empty body (race during navigation),
    // page-hook capture arrives later with the real body — upgrade in place.
    const existingHasBody = !!(existing.body && existing.body.length);
    const incomingHasBody = !!(record.body && record.body.length);
    if (incomingHasBody && !existingHasBody) {
      Object.assign(existing, record);
      try { await store.put(existing); } catch (_) {}
      if (state.selectedId === existing.id) renderDetail(existing.id);
    }
    return;
  }
  state.records.push(record);
  state.byId.set(record.id, record);
  appendRowIfMatch(record);
  updateInfo();

  try {
    await store.put(record);
    // prune occasionally to avoid pruning on every insert
    if (state.records.length % 50 === 0) await store.pruneByLRU();
  } catch (e) {
    console.warn('[Network+] IDB put failed', e);
  }
}

// ---------- Page-hook captures (MAIN-world fetch/XHR patch via content.js) ----------
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || msg.type !== 'NETPLUS_CAPTURE' || !msg.record) return;
  const r = msg.record;
  // Match the id scheme used for chrome.devtools.network captures so the two
  // sources dedupe and merge correctly.
  const id = `${r.method}-${r.url}-${r.startedDateTime}`;
  if (!state.recording) return;
  if (!inWhitelist(r.url)) return;
  addRecord({
    ...r,
    id,
    tabId: sender?.tab?.id ?? chrome.devtools.inspectedWindow.tabId,
  });
});

// ---------- Render ----------

function statusClass(s) {
  if (s >= 500) return 'status-5xx';
  if (s >= 400) return 'status-4xx';
  if (s >= 300) return 'status-3xx';
  if (s >= 200) return 'status-2xx';
  return '';
}

function shortName(url) {
  try {
    const u = new URL(url);
    const last = u.pathname.split('/').filter(Boolean).pop() || u.hostname;
    return last + (u.search ? u.search : '');
  } catch {
    return url;
  }
}

function fmtSize(n) {
  if (!n) return '0 B';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(2) + ' MB';
}

function fmtTime(ms) {
  if (!ms || ms < 0) return '-';
  if (ms < 1000) return ms.toFixed(0) + ' ms';
  return (ms / 1000).toFixed(2) + ' s';
}

function rowHTML(r) {
  return `
    <tr data-id="${escapeAttr(r.id)}" class="${state.selectedId === r.id ? 'selected' : ''}">
      <td class="col-name" title="${escapeAttr(r.url)}">${escapeHTML(shortName(r.url))}</td>
      <td class="col-method">${escapeHTML(r.method)}</td>
      <td class="col-status ${statusClass(r.status)}">${r.status || '-'}</td>
      <td class="col-type">${escapeHTML(r.type)}</td>
      <td class="col-size">${fmtSize(r.size)}</td>
      <td class="col-time">${fmtTime(r.time)}</td>
    </tr>`;
}

function appendRowIfMatch(r) {
  const parsed = parseQuery(state.filterInput);
  if (!matches(r, parsed, state.allowedTypes)) return;
  els.rows.insertAdjacentHTML('beforeend', rowHTML(r));
  els.list.classList.remove('is-empty');
}

function rerenderAll() {
  const parsed = parseQuery(state.filterInput);
  const filtered = state.records.filter(r => matches(r, parsed, state.allowedTypes));
  els.rows.innerHTML = filtered.map(rowHTML).join('');
  els.list.classList.toggle('is-empty', filtered.length === 0 && state.records.length === 0);
  // keep empty placeholder hidden when there are records but filter excludes all
  if (filtered.length === 0 && state.records.length > 0) {
    els.list.classList.remove('is-empty');
  }
  updateInfo();
}

function updateInfo() {
  const parsed = parseQuery(state.filterInput);
  const filtered = state.records.filter(r => matches(r, parsed, state.allowedTypes)).length;
  els.info.textContent = `${filtered} / ${state.records.length}`;
}

// ---------- Detail pane ----------

function renderDetail(id) {
  const r = state.byId.get(id);
  if (!r) {
    els.detail.innerHTML = `<div class="placeholder">点击左侧任一行查看详情</div>`;
    return;
  }

  const tabs = [
    ['headers', 'Headers'],
    ['payload', 'Payload'],
    ['response', 'Response'],
    ['timing', 'Timing'],
  ];
  const tabBtns = tabs
    .map(([k, label]) => `<button data-tab="${k}" class="${state.detailTab === k ? 'active' : ''}">${label}</button>`)
    .join('');

  let body = '';
  if (state.detailTab === 'headers') body = renderHeaders(r);
  else if (state.detailTab === 'payload') body = renderPayload(r);
  else if (state.detailTab === 'response') body = renderResponse(r);
  else if (state.detailTab === 'timing') body = renderTiming(r);

  els.detail.innerHTML = `
    <div class="detail-actions">
      <button data-act="copy-curl">Copy as cURL</button>
      <button data-act="copy-curl-cmd">Copy as cURL (cmd)</button>
      <button data-act="copy-url">Copy URL</button>
      <button data-act="copy-resp">Copy Response</button>
      <span class="copy-status" data-status></span>
    </div>
    <div class="tabs">${tabBtns}</div>
    <div class="tab-body">${body}</div>
  `;

  els.detail.querySelectorAll('.tabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      state.detailTab = btn.dataset.tab;
      renderDetail(id);
    });
  });

  els.detail.querySelectorAll('.detail-actions button').forEach(btn => {
    btn.addEventListener('click', async () => {
      const act = btn.dataset.act;
      let text = '';
      if (act === 'copy-curl') text = curl.toCurl(r);
      else if (act === 'copy-curl-cmd') text = curl.toCurlCmd(r);
      else if (act === 'copy-url') text = r.url;
      else if (act === 'copy-resp') text = r.body || '';
      try {
        await navigator.clipboard.writeText(text);
        showCopyStatus('已复制');
      } catch (e) {
        // Fallback for older Chrome / when clipboard API is blocked
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); showCopyStatus('已复制'); }
        catch { showCopyStatus('复制失败', true); }
        ta.remove();
      }
    });
  });

  if (state.detailTab === 'response') {
    els.detail.querySelectorAll('.body-toolbar button').forEach(btn => {
      btn.addEventListener('click', () => {
        state.bodyView = btn.dataset.view;
        renderDetail(id);
      });
    });
  }
}

function renderHeaders(r) {
  return `
    <section class="detail-section">
      <h4>General</h4>
      <div class="kv">
        <div class="k">Request URL</div><div class="v">${escapeHTML(r.url)}</div>
        <div class="k">Method</div><div class="v">${escapeHTML(r.method)}</div>
        <div class="k">Status</div><div class="v">${r.status} ${escapeHTML(r.statusText)}</div>
        <div class="k">Type</div><div class="v">${escapeHTML(r.type)}</div>
        <div class="k">Time</div><div class="v">${fmtTime(r.time)}</div>
      </div>
    </section>
    <section class="detail-section">
      <h4>Request Headers</h4>
      ${renderHeadersTable(r.reqHeaders)}
    </section>
    <section class="detail-section">
      <h4>Response Headers</h4>
      ${renderHeadersTable(r.resHeaders)}
    </section>
  `;
}

function renderHeadersTable(headers) {
  if (!headers || !headers.length) return '<div class="v">(无)</div>';
  return `<div class="kv">${headers
    .map(h => `<div class="k">${escapeHTML(h.name)}</div><div class="v">${escapeHTML(String(h.value ?? ''))}</div>`)
    .join('')}</div>`;
}

function renderPayload(r) {
  if (r.method === 'GET') {
    let qs = '';
    try {
      const u = new URL(r.url);
      const params = [...u.searchParams.entries()];
      if (params.length) {
        qs = `<div class="kv">${params
          .map(([k, v]) => `<div class="k">${escapeHTML(k)}</div><div class="v">${escapeHTML(v)}</div>`)
          .join('')}</div>`;
      }
    } catch {}
    return `<section class="detail-section"><h4>Query String Parameters</h4>${qs || '<div class="v">(无)</div>'}</section>`;
  }
  if (!r.reqPostData) {
    return '<div class="v">(无 request body)</div>';
  }
  const text = r.reqPostData.text || '';
  return `
    <section class="detail-section">
      <h4>Request Body</h4>
      <div class="kv">
        <div class="k">Content-Type</div><div class="v">${escapeHTML(r.reqPostData.mimeType || '')}</div>
      </div>
      <pre class="body">${escapeHTML(formatMaybeJSON(text))}</pre>
    </section>
  `;
}

function renderResponse(r) {
  const isBase64 = r.encoding === 'base64';
  const truncatedNote = r.truncated ? `<div class="truncated-warn">⚠ 响应已截断到 2MB（原始大小 ${fmtSize(r.size)}），完整内容请查看接口返回。</div>` : '';
  const views = isBase64
    ? [['raw', 'Base64 (binary)']]
    : [['pretty', 'Pretty'], ['raw', 'Raw']];
  const toolbar = `<div class="body-toolbar">${views
    .map(([v, l]) => `<button data-view="${v}" class="${state.bodyView === v ? 'active' : ''}">${l}</button>`)
    .join('')}</div>`;

  let display = r.body || '';
  if (!isBase64 && state.bodyView === 'pretty') display = formatMaybeJSON(display);

  return `
    <section class="detail-section">
      ${truncatedNote}
      ${toolbar}
      <pre class="body">${escapeHTML(display)}</pre>
    </section>
  `;
}

function renderTiming(r) {
  const t = r.timings || {};
  const rows = ['blocked', 'dns', 'connect', 'ssl', 'send', 'wait', 'receive']
    .filter(k => k in t)
    .map(k => `<div class="k">${k}</div><div class="v">${fmtTime(t[k])}</div>`);
  return `<section class="detail-section"><h4>Timings</h4><div class="kv">${rows.join('')}</div></section>`;
}

function formatMaybeJSON(text) {
  if (!text) return '';
  try {
    const obj = JSON.parse(text);
    return JSON.stringify(obj, null, 2);
  } catch {
    return text;
  }
}

function showCopyStatus(msg, isErr) {
  const el = els.detail.querySelector('[data-status]');
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('err', !!isErr);
  setTimeout(() => { if (el) { el.textContent = ''; el.classList.remove('err'); } }, 1500);
}

function escapeHTML(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function escapeAttr(s) { return escapeHTML(s); }

// ---------- Events ----------

els.recording.addEventListener('change', () => {
  state.recording = els.recording.checked;
});

els.clear.addEventListener('click', async () => {
  if (!confirm('确定清空所有捕获记录？此操作会同时清空 IndexedDB。')) return;
  state.records = [];
  state.byId.clear();
  state.selectedId = null;
  await store.clear();
  rerenderAll();
  renderDetail(null);
  els.list.classList.add('is-empty');
});

els.filter.addEventListener('input', () => {
  state.filterInput = els.filter.value;
  rerenderAll();
});

els.typeBoxes.forEach(cb => {
  cb.addEventListener('change', () => {
    if (cb.checked) state.allowedTypes.add(cb.dataset.type);
    else state.allowedTypes.delete(cb.dataset.type);
    rerenderAll();
  });
});

els.rows.addEventListener('click', e => {
  const tr = e.target.closest('tr[data-id]');
  if (!tr) return;
  state.selectedId = tr.dataset.id;
  els.rows.querySelectorAll('tr.selected').forEach(t => t.classList.remove('selected'));
  tr.classList.add('selected');
  renderDetail(state.selectedId);
});

els.exportHar.addEventListener('click', () => {
  har.download(`network-plus-${Date.now()}.har`, har.toHAR(state.records));
});
els.exportJson.addEventListener('click', () => {
  har.download(`network-plus-${Date.now()}.json`, har.toJSON(state.records));
});

// ---------- Bootstrap: load persisted records ----------

(async function bootstrap() {
  try {
    const persisted = await store.getAll();
    for (const r of persisted) {
      if (!state.byId.has(r.id)) {
        state.records.push(r);
        state.byId.set(r.id, r);
      }
    }
    rerenderAll();
    if (state.records.length === 0) els.list.classList.add('is-empty');
  } catch (e) {
    console.warn('[Network+] IDB bootstrap failed', e);
  }
})();
