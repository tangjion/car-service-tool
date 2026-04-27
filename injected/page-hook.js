// MAIN-world hook — runs in page context, monkey-patches fetch + XMLHttpRequest.
// Captures request + response synchronously inside the page, then posts to the
// content script via window.postMessage. This bypasses the
// chrome.devtools.network.getContent async race that loses bodies during navigation.

(function () {
  if (window.__NETPLUS_HOOKED__) return;
  window.__NETPLUS_HOOKED__ = true;

  const TAG = 'NETPLUS_CAPTURE';
  const MAX_BODY = 2 * 1024 * 1024;

  function send(record) {
    try {
      window.postMessage({ __netplus: true, tag: TAG, record }, '*');
    } catch (_) {}
  }

  function nowIso() { return new Date().toISOString(); }

  function headersToList(h) {
    const out = [];
    if (!h) return out;
    if (typeof h.forEach === 'function') {
      h.forEach((v, k) => out.push({ name: k, value: String(v) }));
    } else if (Array.isArray(h)) {
      for (const [k, v] of h) out.push({ name: k, value: String(v) });
    } else if (typeof h === 'object') {
      for (const k of Object.keys(h)) out.push({ name: k, value: String(h[k]) });
    }
    return out;
  }

  function truncate(s) {
    if (typeof s !== 'string') return { text: '', truncated: false };
    if (s.length <= MAX_BODY) return { text: s, truncated: false };
    return { text: s.slice(0, MAX_BODY), truncated: true };
  }

  function safeUrl(u) {
    try { return new URL(u, location.href).href; } catch { return String(u || ''); }
  }

  // ---------- fetch ----------
  const origFetch = window.fetch;
  if (typeof origFetch === 'function') {
    window.fetch = function patchedFetch(input, init) {
      const startedAt = performance.now();
      const startedDateTime = nowIso();
      const req = (input instanceof Request) ? input : new Request(input, init);
      const url = safeUrl(req.url);
      const method = req.method || 'GET';

      let reqBodyText = '';
      let reqBodyMime = '';
      try {
        if (init && init.body && typeof init.body === 'string') {
          reqBodyText = init.body;
          reqBodyMime = (init.headers && new Headers(init.headers).get('content-type')) || '';
        }
      } catch (_) {}

      return origFetch.apply(this, arguments).then(async (res) => {
        const time = performance.now() - startedAt;
        let body = '';
        let encoding = 'utf-8';
        try {
          const clone = res.clone();
          const ct = clone.headers.get('content-type') || '';
          if (/text|json|xml|javascript|x-www-form-urlencoded/i.test(ct) || ct === '') {
            body = await clone.text();
          } else {
            const buf = await clone.arrayBuffer();
            body = btoa(String.fromCharCode(...new Uint8Array(buf).slice(0, MAX_BODY)));
            encoding = 'base64';
          }
        } catch (_) {}

        const t = truncate(body);
        send({
          source: 'page-hook',
          url, method,
          status: res.status,
          statusText: res.statusText,
          httpVersion: 'HTTP/1.1',
          type: 'fetch',
          size: t.text.length,
          time,
          timings: null,
          reqHeaders: headersToList(req.headers),
          reqPostData: reqBodyText ? { mimeType: reqBodyMime, text: reqBodyText } : null,
          resHeaders: headersToList(res.headers),
          body: t.text,
          encoding,
          truncated: t.truncated,
          startedDateTime,
        });
        return res;
      }).catch((err) => {
        send({
          source: 'page-hook',
          url, method,
          status: 0, statusText: String(err && err.message || err),
          httpVersion: 'HTTP/1.1',
          type: 'fetch',
          size: 0, time: performance.now() - startedAt,
          timings: null,
          reqHeaders: headersToList(req.headers),
          reqPostData: reqBodyText ? { mimeType: reqBodyMime, text: reqBodyText } : null,
          resHeaders: [],
          body: '', encoding: 'utf-8',
          truncated: false,
          startedDateTime,
        });
        throw err;
      });
    };
  }

  // ---------- XMLHttpRequest ----------
  const XHR = window.XMLHttpRequest;
  if (typeof XHR === 'function') {
    const origOpen = XHR.prototype.open;
    const origSend = XHR.prototype.send;
    const origSetHeader = XHR.prototype.setRequestHeader;

    XHR.prototype.open = function (method, url) {
      this.__netplus = {
        method: String(method || 'GET').toUpperCase(),
        url: safeUrl(url),
        startedAt: 0,
        startedDateTime: '',
        reqHeaders: [],
        reqBody: '',
      };
      return origOpen.apply(this, arguments);
    };

    XHR.prototype.setRequestHeader = function (name, value) {
      if (this.__netplus) this.__netplus.reqHeaders.push({ name: String(name), value: String(value) });
      return origSetHeader.apply(this, arguments);
    };

    XHR.prototype.send = function (body) {
      const ctx = this.__netplus;
      if (ctx) {
        ctx.startedAt = performance.now();
        ctx.startedDateTime = nowIso();
        try {
          if (typeof body === 'string') ctx.reqBody = body;
          else if (body instanceof URLSearchParams) ctx.reqBody = body.toString();
          else if (body instanceof FormData) ctx.reqBody = '[FormData]';
          else if (body && typeof body === 'object') {
            try { ctx.reqBody = JSON.stringify(body); } catch { ctx.reqBody = String(body); }
          }
        } catch (_) {}

        const onLoadEnd = () => {
          this.removeEventListener('loadend', onLoadEnd);
          let resBody = '';
          let encoding = 'utf-8';
          try {
            const ct = (this.getResponseHeader && this.getResponseHeader('content-type')) || '';
            if (this.responseType === '' || this.responseType === 'text') {
              resBody = this.responseText || '';
            } else if (this.responseType === 'json') {
              try { resBody = JSON.stringify(this.response); } catch { resBody = ''; }
            } else if (this.responseType === 'arraybuffer' && this.response) {
              const view = new Uint8Array(this.response);
              const slice = view.slice(0, MAX_BODY);
              resBody = btoa(String.fromCharCode(...slice));
              encoding = 'base64';
            } else if (this.responseType === 'blob') {
              resBody = '[Blob]';
            }
            void ct;
          } catch (_) {}

          const resHeadersRaw = (this.getAllResponseHeaders && this.getAllResponseHeaders()) || '';
          const resHeaders = resHeadersRaw
            .trim().split(/\r?\n/).filter(Boolean).map(line => {
              const i = line.indexOf(':');
              return i > 0
                ? { name: line.slice(0, i).trim(), value: line.slice(i + 1).trim() }
                : { name: line, value: '' };
            });

          const t = truncate(resBody);
          send({
            source: 'page-hook',
            url: ctx.url,
            method: ctx.method,
            status: this.status || 0,
            statusText: this.statusText || '',
            httpVersion: 'HTTP/1.1',
            type: 'xhr',
            size: t.text.length,
            time: performance.now() - ctx.startedAt,
            timings: null,
            reqHeaders: ctx.reqHeaders,
            reqPostData: ctx.reqBody ? { mimeType: '', text: ctx.reqBody } : null,
            resHeaders,
            body: t.text,
            encoding,
            truncated: t.truncated,
            startedDateTime: ctx.startedDateTime,
          });
        };
        this.addEventListener('loadend', onLoadEnd);
      }
      return origSend.apply(this, arguments);
    };
  }
})();
