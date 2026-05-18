/**
 * Módulo Comedor - v3.0
 * Tres vistas: Mapa | Mesas | Residentes
 * Auxiliar: barra de filtros por tipo de dieta en el mapa
 * Uso: ComedorModule.init('#contenedor', { role: 'admin' | 'auxiliar' })
 */

const ComedorModule = (() => {

  // ── Paleta ──────────────────────────────────────────────────────────
  const C = {
    teal:        '#0f7b8c',
    tealDark:    '#0a5a68',
    tealLight:   '#e6f4f6',
    green:       '#2e7d5e',
    greenLight:  '#e6f4ee',
    greenBorder: '#8ecfb0',
    amber:       '#d4860b',
    amberLight:  '#fef3e2',
    red:         '#c0392b',
    redLight:    '#fff5f5',
    gray:        '#4a7a8a',
    bg:          '#f0f4f7',
    border:      '#dde4ea',
    white:       '#ffffff',
    seatBorder:  '#9ecfd6',
  };

  // ── Persistencia ─────────────────────────────────────────────────────
  const STORE_KEY = 'sgp_comedor';

  function loadPersistedState() {
    try { const r = localStorage.getItem(STORE_KEY); return r ? JSON.parse(r) : null; }
    catch(e) { return null; }
  }

  function saveState() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        tables:          state.tables,
        residents:       state.residents,
        tableCounter:    state.tableCounter,
        residentCounter: state.residentCounter,
      }));
    } catch(e) {}
  }

  function syncResidentsFromSgp() {
    try {
      const sgp    = JSON.parse(localStorage.getItem('sgp_usuarios') || '[]');
      const nombres = sgp.map(u => u.nombre || u);
      nombres.forEach(nombre => {
        if (!state.residents.find(r => r.name === nombre)) {
          state.residentCounter++;
          state.residents.push({ id: 'r' + state.residentCounter, name: nombre, tableId: null });
        }
      });
      state.residents.forEach(r => { r.inactive = !nombres.includes(r.name); });
    } catch(e) {}
  }

  // ── Datos alimentación (módulo externo) ──────────────────────────────
  function getAlimData() {
    try {
      const d = JSON.parse(localStorage.getItem('sgp_alimentacion') || '{}');
      return { types: d.types || [], assignments: d.assignments || {} };
    } catch(e) { return { types: [], assignments: {} }; }
  }

  function lightenColor(hex) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},0.13)`;
  }

  // ── Estado ───────────────────────────────────────────────────────────
  const _p = loadPersistedState();
  let state = {
    role:            'admin',
    view:            'map',
    activeFilter:    null,
    tables:          _p?.tables          || [],
    residents:       _p?.residents       || [],
    tableCounter:    _p?.tableCounter    || 0,
    residentCounter: _p?.residentCounter || 0,
  };

  let dragInfo  = null;
  let tableMove = null;
  let root      = null;

  // ── Helpers ───────────────────────────────────────────────────────────
  const initials    = n => n.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
  const getTable    = id => state.tables.find(t => t.id === id);
  const getResByName = name => state.residents.find(r => r.name === name);
  const unassigned  = () => state.residents.filter(r => !r.tableId && !r.inactive);
  const activeRes   = () => state.residents.filter(r => !r.inactive);

  function showToast(msg) {
    const t = root?.querySelector('.cm-toast');
    if (!t) return;
    t.textContent = msg; t.style.display = 'block';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.style.display = 'none', 2500);
  }

  // ── CSS ──────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('cm-styles-v3')) return;
    const s = document.createElement('style');
    s.id = 'cm-styles-v3';
    s.textContent = `
      .cm2 *, .cm2 *::before, .cm2 *::after { box-sizing:border-box; margin:0; padding:0; }
      .cm2 { font-family:'Segoe UI',system-ui,sans-serif; border:1px solid ${C.border}; border-radius:12px; overflow:hidden; background:${C.bg}; display:flex; flex-direction:column; user-select:none; }

      /* Tabs */
      .cm2-tabs { background:${C.teal}; display:flex; padding:0 14px; }
      .cm2-tab  { font-size:12px; color:rgba(255,255,255,.6); padding:8px 16px; cursor:pointer; border-bottom:2px solid transparent; white-space:nowrap; transition:color .15s; }
      .cm2-tab:hover { color:rgba(255,255,255,.9); }
      .cm2-tab.active { color:#fff; border-bottom-color:${C.tealLight}; }

      /* Buscador auxiliar */
      .cm2-search-bar { padding:9px 14px; background:${C.white}; border-bottom:1px solid ${C.border}; display:flex; align-items:center; gap:8px; position:relative; }
      .cm2-search-bar input { flex:1; padding:6px 10px; font-size:12px; border:1px solid ${C.border}; border-radius:8px; background:${C.bg}; color:#222; outline:none; }
      .cm2-search-result { font-size:11px; background:${C.amberLight}; color:${C.amber}; border:1px solid ${C.amber}; border-radius:20px; padding:3px 10px; white-space:nowrap; display:none; }
      .cm2-dropdown { position:absolute; top:calc(100% + 2px); left:14px; right:14px; background:${C.white}; border:1px solid ${C.border}; border-radius:8px; overflow:hidden; z-index:100; display:none; box-shadow:0 4px 12px rgba(0,0,0,.08); }
      .cm2-dd-item { padding:8px 12px; font-size:12px; cursor:pointer; border-bottom:1px solid ${C.border}; display:flex; justify-content:space-between; align-items:center; }
      .cm2-dd-item:last-child { border-bottom:none; }
      .cm2-dd-item:hover { background:${C.tealLight}; }
      .cm2-dd-name { font-weight:600; color:#222; }
      .cm2-dd-loc  { font-size:11px; color:${C.gray}; margin-top:1px; }
      .cm2-dd-moved { font-size:10px; background:${C.greenLight}; color:${C.green}; padding:1px 6px; border-radius:10px; }

      /* Barra filtro dietas auxiliar */
      .cm2-diet-bar { background:${C.white}; border-bottom:1px solid ${C.border}; padding:8px 14px; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
      .cm2-diet-lbl { font-size:10px; color:${C.gray}; text-transform:uppercase; letter-spacing:.05em; font-weight:600; white-space:nowrap; }
      .cm2-diet-all { padding:5px 11px; border-radius:20px; font-size:11px; font-weight:500; cursor:pointer; border:1.5px solid ${C.border}; background:${C.bg}; color:${C.gray}; white-space:nowrap; transition:all .15s; }
      .cm2-diet-all.active { background:${C.tealDark}; color:#fff; border-color:${C.tealDark}; }
      .cm2-diet-btn { padding:5px 11px; border-radius:20px; font-size:11px; font-weight:600; cursor:pointer; border:1.5px solid transparent; white-space:nowrap; transition:all .15s; }
      .cm2-diet-btn.inactive { opacity:.35; }

      /* Canvas */
      .cm2-canvas-wrap { flex:1; overflow:auto; padding:14px; }
      .cm2-zone-label { font-size:10px; font-weight:600; color:${C.gray}; text-transform:uppercase; letter-spacing:.06em; margin-bottom:8px; }
      .cm2-zone { background:${C.bg}; border-radius:8px; padding:14px; position:relative; background-image:radial-gradient(circle,${C.border} 1px,transparent 1px); background-size:24px 24px; margin-bottom:10px; overflow:auto; }
      .cm2-zone-inner { position:relative; min-width:100%; min-height:80px; }
      .cm2-aisle { text-align:center; font-size:10px; color:${C.gray}; padding:4px 0 10px; display:flex; align-items:center; gap:8px; text-transform:uppercase; letter-spacing:.05em; }
      .cm2-aisle::before,.cm2-aisle::after { content:''; flex:1; height:1px; background:${C.border}; }

      /* Mesas */
      .cm2-table { position:absolute; }
      .cm2-table-card { background:${C.white}; border:1px solid ${C.border}; border-radius:10px; overflow:hidden; display:inline-flex; transition:border-color .15s, opacity .2s; }
      .cm2-table-card:hover { border-color:${C.teal}; }
      .cm2-table.dragging-t .cm2-table-card { border-color:${C.teal}; opacity:.85; }
      .cm2-table-card.cm2-dimmed { opacity:.18; }
      .cm2-table.cm-found-table .cm2-table-card { border:2px solid ${C.amber}; }
      .cm2-seats-side { display:flex; flex-direction:column; gap:2px; padding:5px 3px; }
      .cm2-mesa-mid { display:flex; align-items:center; justify-content:center; background:${C.tealDark}; min-width:26px; padding:0 3px; cursor:grab; }
      .cm2-mesa-num { font-size:14px; font-weight:600; color:${C.tealLight}; writing-mode:vertical-rl; transform:rotate(180deg); letter-spacing:.04em; }

      /* Asientos */
      .cm2-seat-wrap { width:70px; border-radius:5px; overflow:hidden; display:flex; flex-direction:column; transition:opacity .2s, border-color .15s; }
      .cm2-seat-wrap.occ  { cursor:grab; }
      .cm2-seat-wrap.moved { cursor:grab; }
      .cm2-seat-wrap.empty { cursor:default; }
      .cm2-seat-wrap.cm2-dimmed { opacity:.15; }
      .cm2-seat-name { font-size:9px; font-weight:500; text-align:center; padding:4px 3px 3px; line-height:1.2; display:flex; align-items:center; justify-content:center; min-height:18px; }
      .cm2-seat-alim { font-size:8px; font-weight:600; text-align:center; padding:2px 3px; line-height:1; letter-spacing:.02em; }
      .cm2-seat-empty { width:70px; height:30px; border-radius:5px; border:1px dashed ${C.border}; background:${C.bg}; display:flex; align-items:center; justify-content:center; font-size:10px; color:${C.gray}; transition:opacity .2s; }
      .cm2-seat-empty.cm2-dimmed { opacity:.15; }

      /* Drag estados */
      .cm2-seat-wrap.seat-drag { opacity:.25; border:1.5px dashed ${C.teal} !important; }
      .cm2-seat-wrap.drop-empty,.cm2-seat-empty.drop-empty { background:#d4f0e8 !important; border:1.5px solid ${C.green} !important; }
      .cm2-seat-wrap.drop-swap { background:${C.amberLight} !important; border:1.5px solid ${C.amber} !important; }

      /* Búsqueda */
      .cm2-seat-wrap.cm-found-seat { border:2px solid ${C.amber} !important; }
      .cm2-table.cm-found-table .cm2-table-card { border:2px solid ${C.amber}; }

      /* Ghost */
      .cm2-ghost { position:fixed; pointer-events:none; z-index:9999; background:${C.tealLight}; color:${C.tealDark}; border:1.5px solid ${C.teal}; border-radius:6px; padding:4px 10px; font-size:11px; font-weight:500; display:none; white-space:nowrap; }

      /* Toast */
      .cm-toast { display:none; position:absolute; top:10px; left:50%; transform:translateX(-50%); background:${C.greenLight}; color:${C.green}; border:1px solid ${C.greenBorder}; border-radius:20px; padding:5px 16px; font-size:12px; white-space:nowrap; z-index:200; pointer-events:none; }

      /* Hint / lock */
      .cm2-hint { display:inline-block; font-size:11px; color:${C.gray}; background:${C.white}; border:1px solid ${C.border}; border-radius:20px; padding:4px 14px; pointer-events:none; white-space:nowrap; margin-top:8px; }
      .cm2-lock { font-size:10px; color:${C.gray}; background:${C.white}; border:1px solid ${C.border}; border-radius:20px; padding:3px 10px; }

      /* Footer */
      .cm2-footer { background:${C.white}; border-top:1px solid ${C.border}; padding:7px 14px; display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
      .cm2-leg { display:flex; align-items:center; gap:4px; font-size:10px; color:${C.gray}; }
      .cm2-lsw { width:12px; height:8px; border-radius:2px; }
      .cm2-stats { margin-left:auto; font-size:10px; color:${C.gray}; }

      /* Vista Mesas */
      .cm2-mgmt { padding:14px; overflow:auto; flex:1; }
      .cm2-mgmt-toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
      .cm2-mgmt-title { font-size:12px; font-weight:600; color:${C.tealDark}; }
      .cm2-btn-add { font-size:11px; padding:6px 14px; background:${C.tealDark}; color:#fff; border:none; border-radius:8px; cursor:pointer; }
      .cm2-btn-add:hover { background:${C.teal}; }
      .cm2-list { display:flex; flex-direction:column; gap:6px; }
      .cm2-row { background:${C.white}; border:1px solid ${C.border}; border-radius:8px; padding:10px 12px; display:flex; align-items:center; gap:10px; }
      .cm2-row-num { width:30px; height:30px; border-radius:6px; background:${C.tealDark}; color:${C.tealLight}; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; flex-shrink:0; }
      .cm2-row-info { flex:1; min-width:0; }
      .cm2-row-name { font-size:12px; font-weight:600; color:#222; }
      .cm2-row-meta { font-size:10px; color:${C.gray}; margin-top:2px; }
      .cm2-seats-preview { display:flex; gap:2px; margin:3px 0 2px; flex-wrap:wrap; }
      .cm2-sp { width:16px; height:8px; border-radius:2px; background:${C.tealLight}; border:1px solid ${C.seatBorder}; }
      .cm2-sp.empty { background:${C.bg}; border:1px dashed ${C.border}; }
      .cm2-row-actions { display:flex; gap:5px; flex-shrink:0; }
      .cm2-btn-edit { font-size:10px; padding:4px 10px; border:1px solid ${C.border}; border-radius:6px; background:${C.white}; color:${C.gray}; cursor:pointer; }
      .cm2-btn-edit:hover { background:${C.bg}; }
      .cm2-btn-del { font-size:10px; padding:4px 10px; border:1px solid #f09595; border-radius:6px; background:${C.redLight}; color:${C.red}; cursor:pointer; }

      /* Vista Residentes */
      .cm2-res-toolbar { display:flex; align-items:center; gap:8px; margin-bottom:10px; flex-wrap:wrap; }
      .cm2-res-search { flex:1; padding:6px 10px; font-size:12px; border:1px solid ${C.border}; border-radius:8px; background:${C.white}; color:#222; outline:none; min-width:120px; }
      .cm2-res-search:focus { border-color:${C.teal}; }
      .cm2-res-count { font-size:11px; color:${C.gray}; white-space:nowrap; }
      .cm2-res-row { background:${C.white}; border:1px solid ${C.border}; border-radius:8px; padding:9px 12px; display:flex; align-items:center; gap:10px; }
      .cm2-res-av { width:28px; height:28px; border-radius:50%; background:${C.tealLight}; color:${C.tealDark}; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:600; flex-shrink:0; }
      .cm2-res-av.unassigned { background:${C.amberLight}; color:${C.amber}; }
      .cm2-res-info { flex:1; min-width:0; }
      .cm2-res-name { font-size:12px; font-weight:600; color:#222; }
      .cm2-res-loc { font-size:10px; color:${C.gray}; margin-top:1px; }
      .cm2-res-loc.moved { color:${C.green}; }
      .cm2-unassigned-pill { font-size:10px; background:${C.amberLight}; color:${C.amber}; padding:1px 7px; border-radius:10px; }
      .cm2-res-actions { display:flex; gap:5px; flex-shrink:0; }
      .cm2-btn-assign { font-size:10px; padding:4px 9px; border:1px solid ${C.seatBorder}; border-radius:6px; background:${C.tealLight}; color:${C.tealDark}; cursor:pointer; }
      .cm2-btn-remove { font-size:10px; padding:4px 9px; border:1px solid #f09595; border-radius:6px; background:${C.redLight}; color:${C.red}; cursor:pointer; }

      /* Modal */
      .cm2-overlay { position:fixed; inset:0; background:rgba(0,0,0,.35); display:flex; align-items:center; justify-content:center; z-index:300; }
      .cm2-modal { background:${C.white}; border-radius:12px; padding:20px; width:290px; border:1px solid ${C.border}; }
      .cm2-modal h3 { font-size:14px; font-weight:600; color:#222; margin-bottom:14px; }
      .cm2-field { margin-bottom:10px; }
      .cm2-field label { font-size:11px; color:${C.gray}; display:block; margin-bottom:4px; }
      .cm2-field input,.cm2-field select { width:100%; padding:7px 10px; font-size:13px; border:1px solid ${C.border}; border-radius:8px; background:${C.bg}; color:#222; outline:none; font-family:inherit; }
      .cm2-field input:focus,.cm2-field select:focus { border-color:${C.teal}; }
      .cm2-modal-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:14px; }
      .cm2-btn-cancel { font-size:12px; padding:6px 14px; border:1px solid ${C.border}; border-radius:8px; background:transparent; color:${C.gray}; cursor:pointer; }
      .cm2-btn-save { font-size:12px; padding:6px 14px; border:none; border-radius:8px; background:${C.tealDark}; color:#fff; cursor:pointer; }
      .cm2-btn-save:hover { background:${C.teal}; }
      .cm2-btn-danger { font-size:12px; padding:6px 14px; border:1px solid #f09595; border-radius:8px; background:${C.redLight}; color:${C.red}; cursor:pointer; }
    `;
    document.head.appendChild(s);
  }

  // ── Render principal ──────────────────────────────────────────────────
  function render() {
    if (!root) return;
    const isAdmin = state.role === 'admin';

    root.innerHTML = `
      ${isAdmin ? `
      <div class="cm2-tabs">
        <div class="cm2-tab ${state.view==='map'?'active':''}" data-view="map">Mapa</div>
        <div class="cm2-tab ${state.view==='tables'?'active':''}" data-view="tables">Mesas</div>
        <div class="cm2-tab ${state.view==='residents'?'active':''}" data-view="residents">Residentes</div>
      </div>` : ''}
      ${state.view==='map'       ? renderMap(isAdmin)      : ''}
      ${state.view==='tables'    ? renderTablesMgmt()      : ''}
      ${state.view==='residents' ? renderResidentsMgmt()   : ''}
      <div class="cm-toast"></div>
    `;

    bindCommon();
    if (state.view==='map')       bindMap(isAdmin);
    if (state.view==='tables')    bindTablesMgmt();
    if (state.view==='residents') bindResidentsMgmt();
  }

  // ── Vista Mapa ────────────────────────────────────────────────────────
  function renderMap(isAdmin) {
    const zonaA  = state.tables.filter(t => t.zone==='A');
    const zonaB  = state.tables.filter(t => t.zone==='B');
    const alim   = getAlimData();
    const filter = state.activeFilter;

    // ── Asiento ──
    const renderSeat = (s) => {
      if (!s) return `<div style="width:70px;height:34px;visibility:hidden"></div>`;

      if (!s.name) {
        const dimCls = (!isAdmin && filter) ? 'cm2-dimmed' : '';
        return `<div class="cm2-seat-empty ${dimCls}"
          data-sid="${s.id}" data-tid="${s.tableId||''}" data-occ="false">—</div>`;
      }

      const typeId        = alim.assignments[s.name];
      const type          = typeId ? alim.types.find(t=>t.id===typeId) : null;
      const drag          = isAdmin ? 'draggable="true"' : '';
      const isHighlighted = !isAdmin && filter && typeId === filter;
      const isDimmed      = !isAdmin && filter && !isHighlighted;

      let nameBg    = C.tealLight;
      let nameColor = C.tealDark;
      let border    = `1px solid ${C.seatBorder}`;

      if (s.moved) {
        nameBg    = C.greenLight;
        nameColor = C.green;
        border    = `1px solid ${C.greenBorder}`;
      }
      if (type) {
        nameBg    = lightenColor(type.color);
        nameColor = type.color;
        border    = `1px solid ${type.color}`;
      }
      if (isHighlighted) {
        border = `2px solid ${type?.color || C.amber}`;
      }

      const alimTag = type
        ? `<div class="cm2-seat-alim" style="background:${lightenColor(type.color)};color:${type.color}">${type.abbr}</div>`
        : '';

      return `<div class="cm2-seat-wrap ${s.moved?'moved':'occ'} ${isDimmed?'cm2-dimmed':''}" ${drag}
        data-sid="${s.id}" data-tid="${s.tableId||''}" data-occ="true"
        style="border:${border};background:${nameBg}">
        <div class="cm2-seat-name" style="color:${nameColor};background:${nameBg}">${s.name}</div>
        ${alimTag}
      </div>`;
    };

    // ── Mesa ──
    const renderTable = (t) => {
      const left  = t.seats.filter(s=>s.side==='left');
      const right = t.seats.filter(s=>s.side==='right');
      const rows  = Math.max(left.length, right.length);
      const h     = rows * 34 + 14;
      const hasActive = !isAdmin && filter
        ? t.seats.some(s => s.name && alim.assignments[s.name] === filter)
        : true;
      const cardDimmed = (!isAdmin && filter && !hasActive) ? 'cm2-dimmed' : '';

      return `<div class="cm2-table" id="cmt-${t.id}" data-tid="${t.id}" style="left:${t.x}px;top:${t.y}px">
        <div class="cm2-table-card ${cardDimmed}">
          <div class="cm2-seats-side">
            ${Array.from({length:rows},(_,i)=>renderSeat(left[i]?{...left[i],tableId:t.id}:null)).join('')}
          </div>
          <div class="cm2-mesa-mid" style="min-height:${h}px" data-tid="${t.id}">
            <span class="cm2-mesa-num">${t.label}</span>
          </div>
          <div class="cm2-seats-side">
            ${Array.from({length:rows},(_,i)=>renderSeat(right[i]?{...right[i],tableId:t.id}:null)).join('')}
          </div>
        </div>
      </div>`;
    };

    const canvasSize = (tables) => {
      let w=500, h=150;
      tables.forEach(t=>{
        const rows=Math.ceil(t.seats.length/2);
        w=Math.max(w,t.x+180); h=Math.max(h,t.y+rows*34+40);
      });
      return {w,h};
    };

    const sA = canvasSize(zonaA);
    const sB = canvasSize(zonaB);

    // Barra filtros dieta (solo auxiliar, solo si hay tipos)
    const filterBar = !isAdmin && alim.types.length ? `
      <div class="cm2-diet-bar">
        <span class="cm2-diet-lbl">Dieta:</span>
        <div class="cm2-diet-all ${!filter?'active':''}" id="cm2-diet-all">Todos</div>
        ${alim.types.map(t => {
          const isActive   = filter===t.id;
          const isInactive = filter && !isActive;
          const count      = Object.values(alim.assignments).filter(v=>v===t.id).length;
          return `<div class="cm2-diet-btn ${isInactive?'inactive':''}" data-did="${t.id}"
            style="background:${lightenColor(t.color)};color:${t.color};border-color:${isActive?t.color:'transparent'};${isActive?'border-width:2px':''}">
            ${t.name} · ${count}
          </div>`;
        }).join('')}
      </div>` : '';

    // Footer leyenda
    const footerLegend = filter
      ? (() => {
          const t     = alim.types.find(t=>t.id===filter);
          const count = t ? Object.values(alim.assignments).filter(v=>v===t.id).length : 0;
          const mesas = t ? [...new Set(state.tables
            .filter(tb=>tb.seats.some(s=>s.name&&alim.assignments[s.name]===filter))
            .map(tb=>`Mesa ${tb.label}`)
          )].join(', ') : '';
          return t ? `<div class="cm2-leg"><div class="cm2-lsw" style="background:${lightenColor(t.color)};border:2px solid ${t.color}"></div>
            <span style="color:${t.color};font-weight:600">${t.name} · ${count} residentes${mesas?' · '+mesas:''}</span></div>` : '';
        })()
      : `
        <div class="cm2-leg"><div class="cm2-lsw" style="background:${C.tealLight};border:1px solid ${C.seatBorder}"></div>Ocupado</div>
        <div class="cm2-leg"><div class="cm2-lsw" style="background:${C.bg};border:1px dashed ${C.border}"></div>Libre</div>
        <div class="cm2-leg"><div class="cm2-lsw" style="background:${C.greenLight};border:1px solid ${C.greenBorder}"></div>Movido hoy</div>
        ${alim.types.map(t=>`
          <div class="cm2-leg">
            <div class="cm2-lsw" style="background:${lightenColor(t.color)};border:1px solid ${t.color}"></div>
            <span style="color:${t.color};font-weight:600;font-size:10px">${t.abbr}</span>
            <span style="font-size:10px;color:${C.gray}">${t.name}</span>
          </div>`).join('')}`;

    return `
      ${!isAdmin ? `
        <div class="cm2-search-bar">
          <input class="cm2-aux-search" type="text" placeholder="Buscar residente…" autocomplete="off" />
          <span class="cm2-search-result" id="cm2-search-result"></span>
          <div class="cm2-dropdown" id="cm2-dropdown"></div>
        </div>
        ${filterBar}
      ` : ''}

      <div class="cm2-canvas-wrap">
        <div class="cm2-zone-label">Zona A</div>
        <div class="cm2-zone" style="height:${sA.h}px">
          <div class="cm2-zone-inner" style="width:${sA.w}px;height:${sA.h}px">
            ${zonaA.map(renderTable).join('')}
          </div>
        </div>
        <div class="cm2-aisle">Zona B — pasillo</div>
        <div class="cm2-zone-label">Zona B</div>
        <div class="cm2-zone" style="height:${sB.h}px">
          <div class="cm2-zone-inner" style="width:${sB.w}px;height:${sB.h}px">
            ${zonaB.map(renderTable).join('')}
          </div>
        </div>
        <div style="text-align:center;padding-bottom:8px">
          ${isAdmin
            ? `<span class="cm2-hint">Arrastra residentes al asiento · Arrastra el lomo de la mesa para moverla</span>`
            : `<span class="cm2-lock">Solo lectura</span>`}
        </div>
      </div>

      <div class="cm2-footer">
        ${footerLegend}
        <span class="cm2-stats">${unassigned().length} sin asignar · ${activeRes().length} residentes · ${state.tables.length} mesas</span>
      </div>
    `;
  }

  // ── Vista Gestión Mesas ───────────────────────────────────────────────
  function renderTablesMgmt() {
    const total = state.tables.reduce((a,t)=>a+t.seats.length,0);
    const rows  = state.tables.map(t => {
      const occ  = t.seats.filter(s=>s.name).length;
      const free = t.seats.length - occ;
      const prev = t.seats.map(s=>`<div class="cm2-sp ${s.name?'':'empty'}"></div>`).join('');
      return `<div class="cm2-row">
        <div class="cm2-row-num">${t.label}</div>
        <div class="cm2-row-info">
          <div class="cm2-row-name">Mesa ${t.label} · Zona ${t.zone}</div>
          <div class="cm2-seats-preview">${prev}</div>
          <div class="cm2-row-meta">${t.seats.length} asientos · ${occ} ocupados${free?` · ${free} libres`:''}</div>
        </div>
        <div class="cm2-row-actions">
          <button class="cm2-btn-edit" data-tid="${t.id}">Editar</button>
          <button class="cm2-btn-del"  data-tid="${t.id}">Eliminar</button>
        </div>
      </div>`;
    }).join('');

    return `<div class="cm2-mgmt">
      <div class="cm2-mgmt-toolbar">
        <span class="cm2-mgmt-title">${state.tables.length} mesas · ${total} asientos</span>
        <button class="cm2-btn-add" id="cm2-add-table">+ Nueva mesa</button>
      </div>
      <div class="cm2-list">${rows || `<p style="font-size:12px;color:${C.gray};text-align:center;padding:20px">Sin mesas creadas aún</p>`}</div>
    </div>`;
  }

  // ── Vista Gestión Residentes ──────────────────────────────────────────
  function renderResidentsMgmt() {
    const rows = activeRes().map(r => {
      const t    = r.tableId ? getTable(r.tableId) : null;
      const seat = t ? t.seats.find(s=>s.name===r.name) : null;
      const loc  = seat ? `Mesa ${t.label} · lado ${seat.side==='left'?'izquierdo':'derecho'}` : null;
      return `<div class="cm2-res-row">
        <div class="cm2-res-av ${!r.tableId?'unassigned':''}">${initials(r.name)}</div>
        <div class="cm2-res-info">
          <div class="cm2-res-name">${r.name}</div>
          <div class="cm2-res-loc ${seat?.moved?'moved':''}">
            ${loc
              ? (seat?.moved ? `${loc} · <span style="color:${C.green}">Movido hoy ✦</span>` : loc)
              : `<span class="cm2-unassigned-pill">Sin asignar</span>`}
          </div>
        </div>
        <div class="cm2-res-actions">
          <button class="cm2-btn-assign" data-rid="${r.id}">${r.tableId?'Cambiar mesa':'Asignar mesa'}</button>
          ${r.tableId ? `<button class="cm2-btn-remove" data-rid="${r.id}">Quitar asiento</button>` : ''}
        </div>
      </div>`;
    }).join('');

    return `<div class="cm2-mgmt">
      <div class="cm2-res-toolbar">
        <input class="cm2-res-search" type="text" placeholder="Buscar residente…" />
        <span class="cm2-res-count">${activeRes().length} residentes · ${unassigned().length} sin asignar</span>
        <button class="cm2-btn-add" id="cm2-add-res">+ Residente</button>
      </div>
      <div class="cm2-list" id="cm2-res-list">
        ${rows || `<p style="font-size:12px;color:${C.gray};text-align:center;padding:20px">Sin residentes cargados</p>`}
      </div>
    </div>`;
  }

  // ── Bind común ────────────────────────────────────────────────────────
  function bindCommon() {
    root.querySelectorAll('.cm2-tab').forEach(tab => {
      tab.addEventListener('click', () => { state.view=tab.dataset.view; render(); });
    });
  }

  // ── Bind Mapa ─────────────────────────────────────────────────────────
  function bindMap(isAdmin) {
    if (!isAdmin) {
      bindAuxSearch();
      bindDietFilters();
      return;
    }
    bindDragDrop();
    bindTableDrag();
  }

  // ── Filtros dieta auxiliar ────────────────────────────────────────────
  function bindDietFilters() {
    root.querySelector('#cm2-diet-all')?.addEventListener('click', () => {
      state.activeFilter=null; render();
    });
    root.querySelectorAll('.cm2-diet-btn[data-did]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.activeFilter = state.activeFilter===btn.dataset.did ? null : btn.dataset.did;
        render();
      });
    });
  }

  // ── Búsqueda auxiliar ─────────────────────────────────────────────────
  function bindAuxSearch() {
    const input    = root.querySelector('.cm2-aux-search');
    const result   = root.querySelector('#cm2-search-result');
    const dropdown = root.querySelector('#cm2-dropdown');
    if (!input) return;

    input.addEventListener('input', () => {
      const val = input.value.trim().toLowerCase();
      clearHighlights();
      result.style.display='none';
      dropdown.style.display='none';
      if (!val) return;
      const matches = activeRes().filter(r => r.name.toLowerCase().includes(val));
      if (!matches.length) return;
      dropdown.innerHTML = matches.slice(0,6).map(r => {
        const t    = r.tableId ? getTable(r.tableId) : null;
        const seat = t ? t.seats.find(s=>s.name===r.name) : null;
        return `<div class="cm2-dd-item" data-rname="${r.name}">
          <div>
            <div class="cm2-dd-name">${r.name}</div>
            <div class="cm2-dd-loc">${t?`Mesa ${t.label} · Zona ${t.zone}`:'Sin asignar'}</div>
          </div>
          ${seat?.moved?`<span class="cm2-dd-moved">Movido hoy</span>`:''}
        </div>`;
      }).join('');
      dropdown.style.display='block';
      dropdown.querySelectorAll('.cm2-dd-item').forEach(item => {
        item.addEventListener('click', () => {
          const name = item.dataset.rname;
          const t    = state.tables.find(t=>t.seats.some(s=>s.name===name));
          if (t) {
            result.textContent=`${name} → Mesa ${t.label} · Zona ${t.zone}`;
            result.style.display='block';
          }
          input.value=name;
          dropdown.style.display='none';
          highlightResident(name);
        });
      });
    });

    document.addEventListener('click', e => {
      if (!root.querySelector('.cm2-search-bar')?.contains(e.target)) {
        dropdown.style.display='none';
      }
    });
  }

  function highlightResident(name) {
    clearHighlights();
    state.tables.forEach(t => {
      const seat = t.seats.find(s=>s.name===name);
      if (!seat) return;
      const seatEl  = root.querySelector(`[data-sid="${seat.id}"]`);
      const tableEl = root.querySelector(`#cmt-${t.id}`);
      if (seatEl)  seatEl.classList.add('cm-found-seat');
      if (tableEl) tableEl.classList.add('cm-found-table');
      if (tableEl) tableEl.scrollIntoView({behavior:'smooth',block:'nearest'});
    });
  }

  function clearHighlights() {
    root.querySelectorAll('.cm-found-seat').forEach(e=>e.classList.remove('cm-found-seat'));
    root.querySelectorAll('.cm-found-table').forEach(e=>e.classList.remove('cm-found-table'));
  }

  // ── Drag & Drop asientos ──────────────────────────────────────────────
  function bindDragDrop() {
    let ghost = document.getElementById('cm2-ghost');
    if (!ghost) {
      ghost = document.createElement('div');
      ghost.id = 'cm2-ghost';
      ghost.className = 'cm2-ghost';
      document.body.appendChild(ghost);
    }

    document.addEventListener('dragover', e => {
      ghost.style.left=(e.clientX+14)+'px';
      ghost.style.top=(e.clientY-18)+'px';
    });

    root.querySelectorAll('.cm2-seat-wrap[draggable="true"]').forEach(seat => {
      seat.addEventListener('dragstart', e => {
        const name = seat.querySelector('.cm2-seat-name')?.textContent.trim() || '';
        dragInfo = { type:'seat', sid:seat.dataset.sid, tid:seat.dataset.tid, name };
        ghost.textContent = name; ghost.style.display='block';
        seat.classList.add('seat-drag');
        e.dataTransfer.setDragImage(new Image(),0,0);
      });
      seat.addEventListener('dragend', () => {
        ghost.style.display='none';
        root.querySelectorAll('.cm2-seat-wrap,.cm2-seat-empty').forEach(s=>
          s.classList.remove('seat-drag','drop-empty','drop-swap'));
        dragInfo=null;
      });
    });

    root.querySelectorAll('.cm2-seat-wrap, .cm2-seat-empty').forEach(seat => {
      seat.addEventListener('dragover', e => {
        if (!dragInfo) return; e.preventDefault();
        const isSelf = dragInfo.sid===seat.dataset.sid;
        if (!isSelf) {
          seat.classList.toggle('drop-swap',  seat.dataset.occ==='true');
          seat.classList.toggle('drop-empty', seat.dataset.occ==='false');
        }
      });
      seat.addEventListener('dragleave', () => seat.classList.remove('drop-empty','drop-swap'));
      seat.addEventListener('drop', e => {
        e.preventDefault(); if (!dragInfo) return;
        const tTable = getTable(seat.dataset.tid);
        const tSeat  = tTable?.seats.find(s=>s.id===seat.dataset.sid);
        if (!tTable||!tSeat) return;
        if (dragInfo.sid===seat.dataset.sid) return;

        const sTable = getTable(dragInfo.tid);
        const sSeat  = sTable?.seats.find(s=>s.id===dragInfo.sid);
        if (!sTable||!sSeat) return;

        if (seat.dataset.occ==='true') {
          const tmp=sSeat.name; sSeat.name=tSeat.name; tSeat.name=tmp;
          const rA=getResByName(tSeat.name); if(rA){rA.tableId=sTable.id;rA.moved=true;}
          const rB=getResByName(sSeat.name); if(rB){rB.tableId=tTable.id;rB.moved=true;}
          saveState(); render();
          showToast(`${sSeat.name} y ${tSeat.name} intercambiados`);
        } else {
          const name=sSeat.name;
          tSeat.name=name; sSeat.name='';
          const res=getResByName(name);
          if(res){res.tableId=tTable.id;res.moved=true;}
          saveState(); render();
          showToast(`${name} movido a Mesa ${tTable.label}`);
        }
      });
    });
  }

  // ── Drag mesas ────────────────────────────────────────────────────────
  function bindTableDrag() {
    root.querySelectorAll('.cm2-mesa-mid').forEach(mid => {
      mid.addEventListener('mousedown', e => {
        const t    = getTable(mid.dataset.tid);
        const node = root.querySelector(`#cmt-${t.id}`);
        tableMove  = { node, table:t, startX:e.clientX, startY:e.clientY, origX:t.x, origY:t.y };
        node.classList.add('dragging-t');
        e.preventDefault();
      });
    });
    document.addEventListener('mousemove', e => {
      if (!tableMove) return;
      const nx = Math.max(0, tableMove.origX+e.clientX-tableMove.startX);
      const ny = Math.max(0, tableMove.origY+e.clientY-tableMove.startY);
      tableMove.table.x=nx; tableMove.table.y=ny;
      tableMove.node.style.left=nx+'px'; tableMove.node.style.top=ny+'px';
    });
    document.addEventListener('mouseup', () => {
      if (tableMove) { tableMove.node.classList.remove('dragging-t'); saveState(); tableMove=null; }
    });
  }

  // ── Bind Gestión Mesas ────────────────────────────────────────────────
  function bindTablesMgmt() {
    root.querySelector('#cm2-add-table')?.addEventListener('click', ()=>showAddTableModal());
    root.querySelectorAll('.cm2-btn-edit[data-tid]').forEach(btn=>{
      btn.addEventListener('click', ()=>showEditTableModal(btn.dataset.tid));
    });
    root.querySelectorAll('.cm2-btn-del[data-tid]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const t=getTable(btn.dataset.tid); if(!t) return;
        if(!confirm(`¿Eliminar Mesa ${t.label}? Los residentes asignados quedarán sin asignar.`)) return;
        t.seats.forEach(s=>{if(s.name){const r=getResByName(s.name);if(r)r.tableId=null;}});
        state.tables=state.tables.filter(tb=>tb.id!==t.id);
        saveState(); render();
        showToast(`Mesa ${t.label} eliminada`);
      });
    });
  }

  // ── Bind Gestión Residentes ───────────────────────────────────────────
  function bindResidentsMgmt() {
    root.querySelector('.cm2-res-search')?.addEventListener('input', function(){
      const val=this.value.toLowerCase();
      root.querySelectorAll('.cm2-res-row').forEach(row=>{
        const name=row.querySelector('.cm2-res-name')?.textContent.toLowerCase()||'';
        row.style.display=name.includes(val)?'':'none';
      });
    });
    root.querySelector('#cm2-add-res')?.addEventListener('click', ()=>showAddResidentModal());
    root.querySelectorAll('.cm2-btn-remove[data-rid]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const res=state.residents.find(r=>r.id===btn.dataset.rid);
        if(!res||!res.tableId) return;
        const t=getTable(res.tableId);
        if(t){const s=t.seats.find(s=>s.name===res.name);if(s)s.name='';}
        res.tableId=null; delete res.moved;
        saveState(); render();
        showToast(`${res.name} quitado del asiento`);
      });
    });
    root.querySelectorAll('.cm2-btn-assign[data-rid]').forEach(btn=>{
      btn.addEventListener('click', ()=>showAssignSeatModal(btn.dataset.rid));
    });
  }

  // ── Modales ───────────────────────────────────────────────────────────
  function openModal(html, onSave, onDelete) {
    const overlay=document.createElement('div');
    overlay.className='cm2-overlay';
    overlay.innerHTML=`<div class="cm2-modal">${html}</div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.cm2-btn-save')?.addEventListener('click',()=>{if(onSave(overlay)!==false)overlay.remove();});
    overlay.querySelector('.cm2-btn-cancel')?.addEventListener('click',()=>overlay.remove());
    overlay.querySelector('.cm2-btn-danger')?.addEventListener('click',()=>{if(onDelete)onDelete();overlay.remove();});
  }

  function showAddTableModal() {
    openModal(`
      <h3>Nueva mesa</h3>
      <div class="cm2-field"><label>Número o nombre</label><input class="f-label" type="text" placeholder="Ej: 6" /></div>
      <div class="cm2-field"><label>Zona</label>
        <select class="f-zone"><option value="A">Zona A</option><option value="B">Zona B</option></select></div>
      <div class="cm2-field"><label>Asientos por lado</label>
        <select class="f-seats"><option>1</option><option>2</option><option selected>3</option></select></div>
      <div class="cm2-modal-actions">
        <button class="cm2-btn-cancel">Cancelar</button>
        <button class="cm2-btn-save">Guardar</button>
      </div>`, (overlay) => {
      const label=overlay.querySelector('.f-label').value.trim();
      const zone=overlay.querySelector('.f-zone').value;
      const count=parseInt(overlay.querySelector('.f-seats').value);
      if(!label){alert('Indica un número de mesa');return false;}
      state.tableCounter++;
      const id='m'+state.tableCounter;
      const seats=[];
      for(let i=0;i<count;i++){
        seats.push({id:`${id}-a${i+1}`,name:'',side:'left'});
        seats.push({id:`${id}-b${i+1}`,name:'',side:'right'});
      }
      state.tables.push({id,label,x:20+Math.random()*200,y:30+Math.random()*60,zone,seats});
      saveState(); render();
      showToast(`Mesa ${label} creada`);
    });
  }

  function showEditTableModal(tableId) {
    const t=getTable(tableId);
    openModal(`
      <h3>Editar Mesa ${t.label}</h3>
      <div class="cm2-field"><label>Número o nombre</label><input class="f-label" type="text" value="${t.label}" /></div>
      <div class="cm2-field"><label>Zona</label>
        <select class="f-zone">
          <option value="A" ${t.zone==='A'?'selected':''}>Zona A</option>
          <option value="B" ${t.zone==='B'?'selected':''}>Zona B</option>
        </select></div>
      <div class="cm2-field"><label>Asientos por lado</label>
        <select class="f-seats">
          <option ${Math.ceil(t.seats.length/2)===1?'selected':''}>1</option>
          <option ${Math.ceil(t.seats.length/2)===2?'selected':''}>2</option>
          <option ${Math.ceil(t.seats.length/2)===3?'selected':''}>3</option>
        </select></div>
      <div class="cm2-modal-actions">
        <button class="cm2-btn-danger">Eliminar mesa</button>
        <button class="cm2-btn-cancel">Cancelar</button>
        <button class="cm2-btn-save">Guardar</button>
      </div>`, (overlay) => {
      t.label=overlay.querySelector('.f-label').value.trim()||t.label;
      t.zone=overlay.querySelector('.f-zone').value;
      const newCount=parseInt(overlay.querySelector('.f-seats').value);
      const oldCount=Math.ceil(t.seats.length/2);
      if(newCount!==oldCount){
        const lo=t.seats.filter(s=>s.side==='left');
        const ro=t.seats.filter(s=>s.side==='right');
        t.seats=[];
        for(let i=0;i<newCount;i++){
          t.seats.push({id:`${t.id}-a${i+1}`,name:lo[i]?.name||'',side:'left'});
          t.seats.push({id:`${t.id}-b${i+1}`,name:ro[i]?.name||'',side:'right'});
        }
      }
      saveState(); render();
      showToast(`Mesa ${t.label} actualizada`);
    }, () => {
      t.seats.forEach(s=>{if(s.name){const r=getResByName(s.name);if(r)r.tableId=null;}});
      state.tables=state.tables.filter(tb=>tb.id!==t.id);
      saveState(); render();
      showToast(`Mesa ${t.label} eliminada`);
    });
  }

  function showAddResidentModal() {
    openModal(`
      <h3>Nuevo residente</h3>
      <div class="cm2-field"><label>Nombre completo</label><input class="f-name" type="text" placeholder="Nombre y apellido" /></div>
      <div class="cm2-modal-actions">
        <button class="cm2-btn-cancel">Cancelar</button>
        <button class="cm2-btn-save">Guardar</button>
      </div>`, (overlay) => {
      const name=overlay.querySelector('.f-name').value.trim();
      if(!name){alert('Indica el nombre');return false;}
      if(state.residents.find(r=>r.name===name)){alert('Ya existe un residente con ese nombre');return false;}
      state.residentCounter++;
      state.residents.push({id:'r'+state.residentCounter,name,tableId:null});
      saveState(); render();
      showToast(`${name} añadido`);
    });
  }

  function showAssignSeatModal(resId) {
    const res=state.residents.find(r=>r.id===resId);
    if(!res) return;
    const tableOptions=state.tables.map(t=>{
      const free=t.seats.filter(s=>!s.name);
      if(!free.length) return '';
      return `<optgroup label="Mesa ${t.label} · Zona ${t.zone}">
        ${free.map(s=>`<option value="${t.id}|${s.id}">Mesa ${t.label} · lado ${s.side==='left'?'izquierdo':'derecho'}</option>`).join('')}
      </optgroup>`;
    }).join('');
    if(!tableOptions){alert('No hay asientos libres. Añade mesas o libera asientos.');return;}
    openModal(`
      <h3>Asignar asiento</h3>
      <div class="cm2-field"><label>Residente</label><input type="text" value="${res.name}" disabled style="opacity:.7" /></div>
      <div class="cm2-field"><label>Asiento disponible</label>
        <select class="f-seat">${tableOptions}</select></div>
      <div class="cm2-modal-actions">
        <button class="cm2-btn-cancel">Cancelar</button>
        <button class="cm2-btn-save">Asignar</button>
      </div>`, (overlay) => {
      const val=overlay.querySelector('.f-seat').value;
      if(!val) return false;
      const [tid,sid]=val.split('|');
      const t=getTable(tid); const s=t?.seats.find(s=>s.id===sid);
      if(!t||!s) return false;
      if(res.tableId){const pt=getTable(res.tableId);const ps=pt?.seats.find(s=>s.name===res.name);if(ps)ps.name='';}
      s.name=res.name; s.moved=true; res.tableId=t.id;
      saveState(); render();
      showToast(`${res.name} asignado a Mesa ${t.label}`);
    });
  }

  // ── API pública ───────────────────────────────────────────────────────
  function init(selector, options={}) {
    const container=typeof selector==='string'?document.querySelector(selector):selector;
    if(!container){console.error('ComedorModule: contenedor no encontrado');return;}
    container.classList.add('cm2');
    injectStyles();
    if(options.role) state.role=options.role;
    if(state.role==='auxiliar') state.view='map';
    syncResidentsFromSgp();
    saveState();
    root=container;
    render();
    return {
      setRole:       (role)=>{state.role=role;if(role==='auxiliar')state.view='map';render();},
      getData:       ()=>JSON.parse(JSON.stringify(state)),
      setData:       (data)=>{state={...state,...data};saveState();render();},
      syncResidents: ()=>{syncResidentsFromSgp();saveState();render();},
    };
  }

  return { init };
})();