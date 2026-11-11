/* OFOQ Core v1 — personal navigation, favorites and recently visited sections.
 * Local-first: stores only section IDs in this browser; no network/API calls.
 */
(function () {
  'use strict';
  if (window.__OFOQ_CORE_V1__) return;
  window.__OFOQ_CORE_V1__ = true;
  const STORAGE_KEY = 'ofoq_personal_space_v1';
  const sections = Array.isArray(window.BAWABA_SECTIONS) ? window.BAWABA_SECTIONS : [];
  const byId = new Map(sections.map(section => [section.id, section]));
  const state = { favorites: [], recent: [], view: 'all' };

  function readState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (saved && typeof saved === 'object') {
        state.favorites = Array.isArray(saved.favorites) ? [...new Set(saved.favorites.filter(id => byId.has(id)))].slice(0, 78) : [];
        state.recent = Array.isArray(saved.recent) ? [...new Set(saved.recent.filter(id => byId.has(id)))].slice(0, 12) : [];
      }
    } catch (_) {}
  }
  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, favorites: state.favorites, recent: state.recent, updatedAt: new Date().toISOString() }));
      return true;
    } catch (_) { return false; }
  }
  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function open(id) {
    const section = byId.get(id);
    if (section && typeof window.openSection === 'function') window.openSection(section);
  }
  function updateDetailButton(id) {
    const button = document.getElementById('ofoq-favorite-current');
    if (!button || button.dataset.sectionId !== id) return;
    const saved = state.favorites.includes(id);
    button.textContent = saved ? '★ إزالة من المفضلة' : '☆ أضف إلى المفضلة';
    button.setAttribute('aria-pressed', String(saved));
  }
  function toggleFavorite(id) {
    if (!byId.has(id)) return;
    const index = state.favorites.indexOf(id);
    if (index >= 0) state.favorites.splice(index, 1);
    else state.favorites.unshift(id);
    persist();
    render();
    updateDetailButton(id);
  }
  function recordVisit(id) {
    if (!byId.has(id)) return;
    state.recent = [id, ...state.recent.filter(item => item !== id)].slice(0, 12);
    persist();
    render();
  }
  function visibleIds() {
    if (state.view === 'favorites') return state.favorites;
    if (state.view === 'recent') return state.recent;
    return sections.map(section => section.id);
  }
  function applyCatalogView() {
    const grid = document.getElementById('sectionsGrid');
    if (!grid) return;
    const allowed = new Set(visibleIds());
    grid.querySelectorAll('.tile').forEach(tile => {
      tile.hidden = state.view !== 'all' && !allowed.has(tile.dataset.ofoqSectionId);
    });
    grid.querySelectorAll('.catalog-group-heading').forEach(heading => {
      let sibling = heading.nextElementSibling;
      let hasVisible = false;
      while (sibling && !sibling.classList.contains('catalog-group-heading')) {
        if (sibling.classList.contains('tile') && !sibling.hidden) hasVisible = true;
        sibling = sibling.nextElementSibling;
      }
      heading.hidden = state.view !== 'all' && !hasVisible;
    });
    let empty = document.getElementById('ofoq-personal-empty');
    const count = [...grid.querySelectorAll('.tile')].filter(tile => !tile.hidden).length;
    if (!count && state.view !== 'all') {
      if (!empty) {
        empty = el('div', 'empty', 'لا توجد أقسام هنا بعد. أضف الأقسام إلى مفضلتك أو افتح بعض الأقسام أولاً.');
        empty.id = 'ofoq-personal-empty';
        grid.appendChild(empty);
      }
      empty.hidden = false;
    } else if (empty) empty.hidden = true;
  }
  function renderLinks(host, ids, emptyText) {
    host.replaceChildren();
    if (!ids.length) {
      host.appendChild(el('span', 'ofoq-personal-empty-note', emptyText));
      return;
    }
    ids.forEach(id => {
      const section = byId.get(id);
      if (!section) return;
      const button = el('button', 'ofoq-personal-chip');
      button.type = 'button';
      button.append(el('span', 'ofoq-personal-chip-icon', section.icon || '✦'));
      button.append(el('span', '', section.title));
      button.addEventListener('click', () => open(id));
      host.appendChild(button);
    });
  }
  function render() {
    const favorites = document.getElementById('ofoq-favorite-links');
    const recent = document.getElementById('ofoq-recent-links');
    if (favorites) renderLinks(favorites, state.favorites, 'لم تحفظ أي قسم في المفضلة بعد.');
    if (recent) renderLinks(recent, state.recent, 'ستظهر هنا الأقسام التي تزورها.');
    document.querySelectorAll('[data-ofoq-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.ofoqView === state.view)));
    applyCatalogView();
  }
  function mountPersonalSpace() {
    const grid = document.getElementById('sectionsGrid');
    if (!grid || document.getElementById('ofoq-personal-space')) return;
    const toolbar = el('section', 'ofoq-personal-space');
    toolbar.id = 'ofoq-personal-space';
    toolbar.setAttribute('aria-label', 'مساحتي الشخصية في أفق');
    const heading = el('div', 'ofoq-personal-heading');
    const copy = el('div');
    copy.append(el('strong', '', 'مساحتي في أُفُق'));
    copy.append(el('p', '', 'مفضلتك وآخر أقسام زرتها محفوظة على هذا الجهاز فقط.'));
    heading.append(copy);
    const filters = el('div', 'ofoq-personal-filters');
    [['all', 'كل الأقسام'], ['favorites', '★ المفضلة'], ['recent', '◷ زرتها مؤخراً']].forEach(([view, label]) => {
      const button = el('button', 'ofoq-personal-filter', label);
      button.type = 'button';
      button.dataset.ofoqView = view;
      button.setAttribute('aria-pressed', String(state.view === view));
      button.addEventListener('click', () => { state.view = view; render(); });
      filters.appendChild(button);
    });
    const favoritesTitle = el('h3', '', 'الأقسام المفضلة');
    const favorites = el('div', 'ofoq-personal-links'); favorites.id = 'ofoq-favorite-links';
    const recentTitle = el('h3', '', 'آخر زياراتك');
    const recent = el('div', 'ofoq-personal-links'); recent.id = 'ofoq-recent-links';
    toolbar.append(heading, filters, favoritesTitle, favorites, recentTitle, recent);
    grid.parentNode.insertBefore(toolbar, grid);
  }
  function decorateTiles() {
    const grid = document.getElementById('sectionsGrid');
    if (!grid) return;
    grid.querySelectorAll('.tile').forEach(tile => {
      if (tile.dataset.ofoqCoreDecorated === 'true') return;
      const title = tile.querySelector('h3')?.textContent?.trim();
      const section = sections.find(item => item.title === title);
      if (!section) return;
      tile.dataset.ofoqSectionId = section.id;
      tile.dataset.ofoqCoreDecorated = 'true';
    });
    applyCatalogView();
  }
  function mountDetailAction(section) {
    const tool = document.getElementById('specialTool');
    if (!tool || !section) return;
    let actions = document.getElementById('ofoq-detail-actions');
    if (!actions) {
      actions = el('div', 'ofoq-detail-actions');
      actions.id = 'ofoq-detail-actions';
      tool.parentNode.insertBefore(actions, tool);
    }
    actions.replaceChildren();
    const favorite = el('button', 'ofoq-personal-filter', '☆ أضف إلى المفضلة');
    favorite.type = 'button';
    favorite.id = 'ofoq-favorite-current';
    favorite.dataset.sectionId = section.id;
    favorite.addEventListener('click', () => toggleFavorite(section.id));
    actions.appendChild(favorite);
    updateDetailButton(section.id);
  }
  function injectStyles() {
    if (document.getElementById('ofoq-core-styles')) return;
    const style = el('style');
    style.id = 'ofoq-core-styles';
    style.textContent = [
      '.ofoq-personal-space{margin:22px 0 12px;padding:18px;border:1px solid var(--line,#2a3a55);border-radius:18px;background:linear-gradient(145deg,#15243b,#101a2d)}',
      '.ofoq-personal-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}',
      '.ofoq-personal-heading strong{color:var(--gold2,#ffda83);font-size:17px}.ofoq-personal-heading p{margin:5px 0 0;color:var(--muted,#a8b4c8);font-size:12px;line-height:1.7}',
      '.ofoq-personal-filters,.ofoq-detail-actions{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 14px}',
      '.ofoq-personal-filter{border:1px solid var(--line,#2a3a55);background:#0c1729;color:#e8edf5;border-radius:999px;padding:9px 13px;font:inherit;font-size:12px;cursor:pointer}',
      '.ofoq-personal-filter[aria-pressed="true"]{border-color:var(--gold,#e8b44d);color:var(--gold2,#ffda83);background:#30291d}',
      '.ofoq-personal-space h3{font-size:13px;color:var(--gold2,#ffda83);margin:14px 0 8px}',
      '.ofoq-personal-links{display:flex;flex-wrap:wrap;gap:7px;min-height:28px}',
      '.ofoq-personal-chip{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line,#2a3a55);border-radius:10px;padding:8px 10px;background:#0c1729;color:#e8edf5;font:inherit;font-size:12px;cursor:pointer;max-width:100%}',
      '.ofoq-personal-chip:hover,.ofoq-personal-chip:focus-visible,.ofoq-personal-filter:hover,.ofoq-personal-filter:focus-visible{border-color:var(--gold,#e8b44d);outline:2px solid transparent}',
      '.ofoq-personal-chip-icon{font-size:16px}.ofoq-personal-empty-note{color:var(--muted,#a8b4c8);font-size:12px;padding:5px 0}',
      '.ofoq-detail-actions{margin:14px 0}.tile[hidden],.catalog-group-heading[hidden],#ofoq-personal-empty[hidden]{display:none!important}',
      '@media(prefers-reduced-motion:reduce){.ofoq-personal-chip,.ofoq-personal-filter{transition:none!important}}'
    ].join('');
    document.head.appendChild(style);
  }
  readState();
  injectStyles();
  mountPersonalSpace();
  decorateTiles();
  render();
  const grid = document.getElementById('sectionsGrid');
  if (grid && typeof MutationObserver === 'function') {
    const observer = new MutationObserver(() => { decorateTiles(); render(); });
    observer.observe(grid, { childList: true });
  }
  if (typeof window.openSection === 'function' && !window.openSection.__ofoqCoreWrapped) {
    const original = window.openSection;
    const wrapped = async function (section) {
      if (section && section.id) recordVisit(section.id);
      const result = await original.apply(this, arguments);
      mountDetailAction(section);
      return result;
    };
    wrapped.__ofoqCoreWrapped = true;
    window.openSection = wrapped;
  }
  window.OFOQ_CORE = Object.freeze({
    version: '1.0.0',
    getFavorites: () => state.favorites.map(id => byId.get(id)).filter(Boolean),
    getRecent: () => state.recent.map(id => byId.get(id)).filter(Boolean),
    addFavorite: toggleFavorite,
    recordVisit,
    setView(view) { if (['all', 'favorites', 'recent'].includes(view)) { state.view = view; render(); } }
  });
})();