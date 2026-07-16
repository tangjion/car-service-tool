// 测量模式：Figma Dev Mode 式的页面尺寸/间距标注
// 再次注入时切换关闭（popup 按钮即开关）
(() => {
  if (window.__carToolMeasure) {
    window.__carToolMeasure.destroy();
    return;
  }

  const BLUE = '#18A0FB';
  const RED = '#F24822';
  const Z = 2147483647;

  let hoverEl = null;   // 当前悬停元素
  let selEl = null;     // 已锁定元素 A
  let descendStack = []; // ↑ 上浮后用 ↓ 原路返回

  const root = document.createElement('div');
  root.id = '__car-tool-measure';
  root.style.cssText = `position:fixed;inset:0;pointer-events:none;z-index:${Z};font:11px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;`;
  document.documentElement.appendChild(root);

  const tip = document.createElement('div');
  tip.textContent = '测量模式 · 点击锁定元素 · ↑↓ 切换层级 · Esc 退出';
  tip.style.cssText = `position:fixed;top:8px;left:50%;transform:translateX(-50%);background:rgba(30,30,30,.9);color:#fff;padding:4px 10px;border-radius:12px;pointer-events:none;z-index:${Z};font-size:11px;`;
  root.appendChild(tip);

  const layer = document.createElement('div');
  root.appendChild(layer);

  function box(rect, color, dashed) {
    const d = document.createElement('div');
    d.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;border:1px ${dashed ? 'dashed' : 'solid'} ${color};box-sizing:border-box;`;
    layer.appendChild(d);
  }

  function badge(text, x, y, color) {
    const d = document.createElement('div');
    d.textContent = text;
    d.style.cssText = `position:fixed;left:${x}px;top:${y}px;transform:translate(-50%,0);background:${color};color:#fff;padding:1px 5px;border-radius:2px;white-space:nowrap;`;
    layer.appendChild(d);
    // 防止贴边溢出视口
    const r = d.getBoundingClientRect();
    if (r.left < 2) d.style.left = `${x + (2 - r.left)}px`;
    if (r.right > innerWidth - 2) d.style.left = `${x - (r.right - innerWidth + 2)}px`;
    if (r.bottom > innerHeight - 2) d.style.top = `${y - r.height - 4}px`;
  }

  function line(x1, y1, x2, y2) {
    const d = document.createElement('div');
    const horizontal = y1 === y2;
    d.style.cssText = horizontal
      ? `position:fixed;left:${Math.min(x1, x2)}px;top:${y1}px;width:${Math.abs(x2 - x1)}px;height:0;border-top:1px solid ${RED};`
      : `position:fixed;left:${x1}px;top:${Math.min(y1, y2)}px;width:0;height:${Math.abs(y2 - y1)}px;border-left:1px solid ${RED};`;
    layer.appendChild(d);
  }

  // 单轴上 A、B 两线段间需要标注的距离段
  // 分离 → 面对面边缘的间隙；包含 → 两侧各一段；部分重叠 → 重叠量
  function axisSegments(a1, a2, b1, b2) {
    if (b1 >= a2) return [{ from: a2, to: b1 }];
    if (a1 >= b2) return [{ from: b2, to: a1 }];
    if (b1 >= a1 && b2 <= a2) return [{ from: a1, to: b1 }, { from: b2, to: a2 }];
    if (a1 >= b1 && a2 <= b2) return [{ from: b1, to: a1 }, { from: a2, to: b2 }];
    return [{ from: Math.max(a1, b1), to: Math.min(a2, b2), overlap: true }];
  }

  function drawMeasure(a, b) {
    // 横向距离线的 y：两矩形纵向有交集取交集中心，否则取 B 中心
    const yOverlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    const y = yOverlap > 0 ? (Math.max(a.top, b.top) + Math.min(a.bottom, b.bottom)) / 2 : (b.top + b.bottom) / 2;
    const xOverlap = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const x = xOverlap > 0 ? (Math.max(a.left, b.left) + Math.min(a.right, b.right)) / 2 : (b.left + b.right) / 2;

    for (const s of axisSegments(a.left, a.right, b.left, b.right)) {
      const len = s.to - s.from;
      if (len < 0.5) continue;
      line(s.from, y, s.to, y);
      badge(`${Math.round(len)}${s.overlap ? ' 重叠' : ''}`, (s.from + s.to) / 2, y + 4, RED);
    }
    for (const s of axisSegments(a.top, a.bottom, b.top, b.bottom)) {
      const len = s.to - s.from;
      if (len < 0.5) continue;
      line(x, s.from, x, s.to);
      badge(`${Math.round(len)}${s.overlap ? ' 重叠' : ''}`, x, (s.from + s.to) / 2 - 8, RED);
    }
  }

  function sizeText(el, r) {
    return `${el.tagName.toLowerCase()} ${Math.round(r.width)} × ${Math.round(r.height)}`;
  }

  function render() {
    layer.textContent = '';
    if (selEl && !selEl.isConnected) selEl = null;
    if (hoverEl && !hoverEl.isConnected) { hoverEl = null; descendStack = []; }

    if (selEl) {
      const a = selEl.getBoundingClientRect();
      box(a, BLUE);
      badge(sizeText(selEl, a), a.left + a.width / 2, a.bottom + 4, BLUE);
      if (hoverEl && hoverEl !== selEl) {
        const b = hoverEl.getBoundingClientRect();
        box(b, RED, true);
        badge(sizeText(hoverEl, b), b.left + b.width / 2, b.bottom + 4, RED);
        drawMeasure(a, b);
      }
    } else if (hoverEl) {
      const r = hoverEl.getBoundingClientRect();
      box(r, BLUE);
      badge(sizeText(hoverEl, r), r.left + r.width / 2, r.bottom + 4, BLUE);
    }
  }

  let raf = 0;
  function scheduleRender() {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; render(); });
  }

  function pickable(el) {
    return el && el !== document.documentElement && el !== document.body && !root.contains(el);
  }

  function onMouseMove(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const next = pickable(el) ? el : null;
    if (next !== hoverEl) {
      hoverEl = next;
      descendStack = [];
      scheduleRender();
    }
  }

  // 测量模式下拦截页面点击：点击只用于锁定元素
  // 用点击坐标重新取元素，避免键盘/程序化移动后 hoverEl 过期
  function onClick(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.type !== 'click') return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const target = pickable(el) ? el : hoverEl;
    if (target) {
      selEl = selEl === target ? null : target;
      hoverEl = target;
      descendStack = [];
      scheduleRender();
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (selEl) { selEl = null; scheduleRender(); } else destroy();
      return;
    }
    if (e.key === 'ArrowUp' && hoverEl) {
      const parent = hoverEl.parentElement;
      if (pickable(parent)) {
        descendStack.push(hoverEl);
        hoverEl = parent;
      }
    } else if (e.key === 'ArrowDown' && descendStack.length) {
      hoverEl = descendStack.pop();
    } else {
      return;
    }
    e.preventDefault();
    e.stopImmediatePropagation();
    scheduleRender();
  }

  const blockedEvents = ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'auxclick', 'dblclick'];
  window.addEventListener('mousemove', onMouseMove, true);
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('scroll', scheduleRender, { capture: true, passive: true });
  window.addEventListener('resize', scheduleRender);
  blockedEvents.forEach((t) => window.addEventListener(t, onClick, true));

  function destroy() {
    window.removeEventListener('mousemove', onMouseMove, true);
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('scroll', scheduleRender, { capture: true });
    window.removeEventListener('resize', scheduleRender);
    blockedEvents.forEach((t) => window.removeEventListener(t, onClick, true));
    if (raf) cancelAnimationFrame(raf);
    root.remove();
    delete window.__carToolMeasure;
  }

  window.__carToolMeasure = { destroy };
})();
