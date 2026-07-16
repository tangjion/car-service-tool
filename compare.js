// 视觉对比：把 Figma 设计稿截图叠在页面上走查还原度
// 导入：Cmd/Ctrl+V 粘贴（Figma Copy as PNG）、拖入文件、文件选择
// 模式：叠加（透明度）/ 差异（mix-blend-mode: difference，一致处为黑）/ 分屏
// 再次注入时切换关闭（popup 按钮即开关）
(() => {
  if (window.__carToolCompare) {
    window.__carToolCompare.destroy();
    return;
  }
  // 与测量模式互斥：它会拦截全部鼠标事件，拖拽对齐没法用
  if (window.__carToolMeasure) window.__carToolMeasure.destroy();

  const Z = 2147483647;
  let x = 24, y = 88;      // 图片左上角（视口坐标）
  let scale = 1;
  let mode = 'overlay';    // overlay | diff | swipe
  let opacity = 50;        // 叠加模式透明度 %
  let swipe = 50;          // 分屏位置 %
  let amp = 30;            // 差异模式增强强度 %（亮度放大，让微小差异可见）
  let through = false;     // 穿透：图片不接鼠标，方便操作页面

  const root = document.createElement('div');
  root.id = '__car-tool-compare';
  root.style.cssText = `position:fixed;inset:0;pointer-events:none;z-index:${Z};font:11px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;`;
  document.documentElement.appendChild(root);

  // 图片不能放进 root：position:fixed 容器是独立层叠上下文，
  // mix-blend-mode 只和上下文内的背景（透明）混合，差异模式会失效。
  // 直接挂 <html> 下且插在 root 之前——混合背景是页面内容，控制条保持在图片上方。
  const img = document.createElement('img');
  img.draggable = false;
  img.style.cssText = `position:fixed;display:none;cursor:move;pointer-events:auto;user-select:none;z-index:${Z};`;
  document.documentElement.insertBefore(img, root);

  // 分屏模式的分割线
  const divider = document.createElement('div');
  divider.style.cssText = `position:fixed;display:none;width:0;border-left:1px dashed #F24822;pointer-events:none;z-index:${Z};`;
  document.documentElement.insertBefore(divider, root);

  // 差异增强层：backdrop-filter 放大混合结果的亮度。
  // 一致区域是纯黑（放大后仍黑），微小差异（如圆角差几像素的低对比像素）被提亮到可见。
  // 必须是 img 的兄弟节点且在其上方——作为祖先会创建层叠上下文，隔离掉 difference 混合。
  const ampDiv = document.createElement('div');
  ampDiv.style.cssText = `position:fixed;display:none;pointer-events:none;z-index:${Z};`;
  document.documentElement.insertBefore(ampDiv, root);

  const hint = document.createElement('div');
  hint.textContent = '在 Figma 中 Copy as PNG，回到页面按 Cmd/Ctrl+V 粘贴；也可拖入图片文件或点上方「导入」';
  hint.style.cssText = 'position:fixed;top:45%;left:50%;transform:translate(-50%,-50%);background:rgba(30,30,30,.9);color:#fff;padding:10px 16px;border-radius:8px;font-size:12px;max-width:320px;text-align:center;';
  root.appendChild(hint);

  // ── 控制条 ─────────────────────────────────────────────
  const bar = document.createElement('div');
  bar.style.cssText = 'position:fixed;top:8px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:8px;background:rgba(30,30,30,.92);color:#fff;padding:6px 10px;border-radius:16px;pointer-events:auto;white-space:nowrap;';
  root.appendChild(bar);

  function barBtn(text, onClick) {
    const b = document.createElement('span');
    b.textContent = text;
    b.style.cssText = 'padding:2px 8px;border-radius:10px;cursor:pointer;user-select:none;';
    b.addEventListener('click', onClick);
    bar.appendChild(b);
    return b;
  }

  const modeBtns = {
    overlay: barBtn('叠加', () => setMode('overlay')),
    diff: barBtn('差异', () => setMode('diff')),
    swipe: barBtn('分屏', () => setMode('swipe'))
  };

  const sliderLabel = document.createElement('span');
  sliderLabel.style.cssText = 'color:#aaa;';
  bar.appendChild(sliderLabel);

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '100';
  slider.value = String(opacity);
  slider.style.cssText = 'width:90px;accent-color:#FF5B00;';
  slider.addEventListener('input', () => {
    if (mode === 'swipe') swipe = Number(slider.value);
    else if (mode === 'diff') amp = Number(slider.value);
    else opacity = Number(slider.value);
    apply();
  });
  bar.appendChild(slider);

  const scaleSel = document.createElement('select');
  scaleSel.style.cssText = 'background:#444;color:#fff;border:none;border-radius:4px;font-size:11px;';
  [['0.5', '0.5x'], ['1', '1x'], ['2', '2x']].forEach(([v, t]) => {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = t;
    scaleSel.appendChild(o);
  });
  scaleSel.value = '1';
  scaleSel.addEventListener('change', () => { scale = Number(scaleSel.value); apply(); });
  bar.appendChild(scaleSel);

  const throughBtn = barBtn('穿透', () => {
    through = !through;
    throughBtn.style.background = through ? '#FF5B00' : '';
    apply();
  });

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) loadFile(fileInput.files[0]);
  });
  bar.appendChild(fileInput);
  barBtn('导入', () => fileInput.click());

  const offsetLabel = document.createElement('span');
  offsetLabel.style.cssText = 'color:#aaa;min-width:52px;text-align:center;';
  bar.appendChild(offsetLabel);

  barBtn('✕', () => destroy());

  // ── 渲染 ─────────────────────────────────────────────
  function setMode(m) {
    mode = m;
    slider.value = String(mode === 'swipe' ? swipe : mode === 'diff' ? amp : opacity);
    apply();
  }

  function apply() {
    Object.entries(modeBtns).forEach(([k, b]) => {
      b.style.background = k === mode ? '#FF5B00' : '';
    });
    sliderLabel.textContent = mode === 'swipe' ? '位置' : mode === 'diff' ? '增强' : '透明度';

    if (!img.src) return;
    const w = img.naturalWidth * scale;
    img.style.display = 'block';
    img.style.left = `${x}px`;
    img.style.top = `${y}px`;
    img.style.width = `${w}px`;
    img.style.pointerEvents = through ? 'none' : 'auto';
    img.style.opacity = mode === 'overlay' ? String(opacity / 100) : '1';
    img.style.mixBlendMode = mode === 'diff' ? 'difference' : 'normal';
    img.style.clipPath = mode === 'swipe' ? `inset(0 ${100 - swipe}% 0 0)` : 'none';

    if (mode === 'swipe') {
      divider.style.display = 'block';
      divider.style.left = `${x + w * swipe / 100}px`;
      divider.style.top = `${y}px`;
      divider.style.height = `${img.naturalHeight * scale}px`;
    } else {
      divider.style.display = 'none';
    }

    if (mode === 'diff' && amp > 0) {
      ampDiv.style.display = 'block';
      ampDiv.style.left = `${x}px`;
      ampDiv.style.top = `${y}px`;
      ampDiv.style.width = `${w}px`;
      ampDiv.style.height = `${img.naturalHeight * scale}px`;
      // 0-100% → 1-31 倍亮度：一致处 0×N 仍为黑，微小差异被提亮
      ampDiv.style.backdropFilter = `brightness(${1 + amp * 0.3})`;
    } else {
      ampDiv.style.display = 'none';
    }
    offsetLabel.textContent = `${x}, ${y}`;
  }

  function setImage(src) {
    img.onload = () => {
      // 宽度超过视口按 2x 导出处理，自动缩半
      if (img.naturalWidth > innerWidth && scale === 1) {
        scale = 0.5;
        scaleSel.value = '0.5';
      }
      hint.style.display = 'none';
      apply();
    };
    img.src = src;
  }

  function loadFile(file) {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(file);
  }

  // ── 导入：粘贴 / 拖入 ─────────────────────────────────
  function onPaste(e) {
    const item = [...(e.clipboardData || {}).items || []].find(i => i.type.startsWith('image/'));
    if (item) {
      e.preventDefault();
      loadFile(item.getAsFile());
    }
  }

  function onDragOver(e) { e.preventDefault(); }
  function onDrop(e) {
    e.preventDefault();
    if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
  }

  // ── 对齐：鼠标拖拽 + 方向键微调 ───────────────────────
  let dragging = null;
  img.addEventListener('mousedown', (e) => {
    e.preventDefault();
    dragging = { dx: e.clientX - x, dy: e.clientY - y };
  });
  function onMouseMove(e) {
    if (!dragging) return;
    x = Math.round(e.clientX - dragging.dx);
    y = Math.round(e.clientY - dragging.dy);
    apply();
  }
  function onMouseUp() { dragging = null; }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      destroy();
      return;
    }
    if (!img.src) return;
    const step = e.shiftKey ? 10 : 1;
    const moves = { ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0] };
    const mv = moves[e.key];
    if (!mv) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    x += mv[0];
    y += mv[1];
    apply();
  }

  window.addEventListener('paste', onPaste, true);
  window.addEventListener('dragover', onDragOver, true);
  window.addEventListener('drop', onDrop, true);
  window.addEventListener('mousemove', onMouseMove, true);
  window.addEventListener('mouseup', onMouseUp, true);
  window.addEventListener('keydown', onKeyDown, true);

  function destroy() {
    window.removeEventListener('paste', onPaste, true);
    window.removeEventListener('dragover', onDragOver, true);
    window.removeEventListener('drop', onDrop, true);
    window.removeEventListener('mousemove', onMouseMove, true);
    window.removeEventListener('mouseup', onMouseUp, true);
    window.removeEventListener('keydown', onKeyDown, true);
    img.remove();
    divider.remove();
    ampDiv.remove();
    root.remove();
    delete window.__carToolCompare;
  }

  window.__carToolCompare = { destroy };
  apply();
})();
