// Convert internal records to HAR 1.2 (loadable in Chrome DevTools Network panel)
// or to a flat JSON dump.

const VERSION = '1.0';

function toHarEntry(r) {
  const reqHeaders = (r.reqHeaders || []).map(h => ({ name: h.name, value: String(h.value ?? '') }));
  const resHeaders = (r.resHeaders || []).map(h => ({ name: h.name, value: String(h.value ?? '') }));

  const mimeType =
    (r.resHeaders || []).find(h => /^content-type$/i.test(h.name))?.value || '';

  return {
    startedDateTime: r.startedDateTime,
    time: r.time || 0,
    request: {
      method: r.method,
      url: r.url,
      httpVersion: r.httpVersion || 'HTTP/1.1',
      headers: reqHeaders,
      queryString: [],
      cookies: [],
      headersSize: -1,
      bodySize: r.reqPostData ? (r.reqPostData.text || '').length : 0,
      postData: r.reqPostData
        ? { mimeType: r.reqPostData.mimeType || '', text: r.reqPostData.text || '' }
        : undefined,
    },
    response: {
      status: r.status || 0,
      statusText: r.statusText || '',
      httpVersion: r.httpVersion || 'HTTP/1.1',
      headers: resHeaders,
      cookies: [],
      content: {
        size: r.size || 0,
        mimeType,
        text: r.body || '',
        encoding: r.encoding === 'base64' ? 'base64' : undefined,
      },
      redirectURL: '',
      headersSize: -1,
      bodySize: r.size || 0,
    },
    cache: {},
    timings: r.timings || { send: 0, wait: r.time || 0, receive: 0 },
    _truncated: r.truncated || false,
    _resourceType: r.type,
  };
}

export function toHAR(records) {
  return {
    log: {
      version: '1.2',
      creator: { name: 'Car Service Tool Network+', version: VERSION },
      pages: [],
      entries: records.map(toHarEntry),
    },
  };
}

export function toJSON(records) {
  return records;
}

export function download(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
