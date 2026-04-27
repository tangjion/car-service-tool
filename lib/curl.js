// Convert a captured record into a `curl` command string.
// Two flavors: POSIX (bash/zsh) and Windows cmd.exe.
//
// Skips HTTP/2 pseudo-headers (`:authority` etc.) which curl doesn't accept,
// and Content-Length (curl recomputes).

const SKIP_HEADER_RE = /^(:|content-length$|host$)/i;

function shellEscapePosix(s) {
  // Single-quote everything; an embedded single quote becomes '\'' inside.
  return "'" + String(s).replace(/'/g, "'\\''") + "'";
}

function cmdEscapeWin(s) {
  // Wrap in double quotes; escape internal "  ^  &  |  <  >  %  \\  per cmd.exe.
  return '"' + String(s)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/[\^&|<>%]/g, m => '^' + m)
    + '"';
}

function buildArgs(record, escape) {
  const parts = ['curl', escape(record.url)];
  if (record.method && record.method !== 'GET') {
    parts.push('-X', record.method);
  }
  for (const h of record.reqHeaders || []) {
    if (!h || !h.name || SKIP_HEADER_RE.test(h.name)) continue;
    parts.push('-H', escape(`${h.name}: ${h.value ?? ''}`));
  }
  if (record.reqPostData && record.reqPostData.text) {
    parts.push('--data-raw', escape(record.reqPostData.text));
  }
  // --compressed: ask curl to handle gzip/br like the browser did.
  parts.push('--compressed');
  return parts.join(' ');
}

export function toCurl(record) {
  return buildArgs(record, shellEscapePosix);
}

export function toCurlCmd(record) {
  return buildArgs(record, cmdEscapeWin);
}
