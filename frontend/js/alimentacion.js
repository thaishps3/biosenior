/**
 * Módulo Tipo Alimentación - v2.0
 * Admin: define tipos y asigna residentes.
 * Auxiliar: filtra por tipo y ve los asientos resaltados en el mapa del comedor.
 * Datos compartidos con Comedor via localStorage (sgp_alimentacion).
 */

const AlimentacionModule = (() => {

  const C = {
    teal:      '#0f7b8c', tealDark: '#0a5a68', tealLight: '#e6f4f6',
    green:     '#2e7d5e', greenLight: '#e6f4ee', greenBorder: '#8ecfb0',
    amber:     '#d4860b', amberLight: '#fef3e2',
    red:       '#c0392b', redLight: '#fff5f5',
    gray:      '#4a7a8a', bg: '#f0f4f7', border: '#dde4ea', white: '#ffffff',
  };

  const COLOR_OPTIONS = [
    { hex:'#2e7d5e', label:'Verde'   },
    { hex:'#d4860b', label:'Ámbar'   },
    { hex:'#c0392b', label:'Rojo'    },
    { hex:'#6b21a8', label:'Morado'  },
    { hex:'#0f7b8c', label:'Teal'    },
    { hex:'#1d6fa8', label:'Azul'    },
    { hex:'#b5470b', label:'Naranja' },
    { hex:'#7c6a1e', label:'Ocre'    },
  ];

  const STORE_KEY = 'sgp_alimentacion';

  function loadState() {
    try { const r = localStorage.getItem(STORE_KEY); return r ? JSON.parse(r) : null; }
    catch(e) { return null; }
  }

  function saveState() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ types: state.types, assignments: state.assignments })); }
    catch(e) {}
  }

  function syncResidents() {
    try {
      const sgp = JSON.parse(localStorage.getItem('sgp_usuarios') || '[]');
      state.residents = sgp.map(u => u.nombre || u).filter(Boolean);
    } catch(e) { state.residents = []; }
  }

  function getComedorData() {
    try { return JSON.parse(localStorage.getItem('sgp_comedor') || '{}'); }
    catch(e) { return {}; }
  }

  const _p = loadState();
  let state = {
    role:        'admin',
    types:       _p?.types       || [],
    assignments: _p?.assignments || {},
    residents:   [],
    typeCounter: _p?.types?.length || 0,
    searchVal:   '',
    activeFilter: null,  // id del tipo filtrado en vista auxiliar
  };

  let root = null;

  const initials   = n => n.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
  const getType    = id => state.types.find(t=>t.id===id);
  const countAssigned = id => Object.values(state.assignments).filter(v=>v===id).length;

  function lighten(hex) {
    const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},0.13)`;
  }

  function showToast(msg) {
    const t = root?.querySelector('.alim-toast');
    if (!t) return;
    t.textContent = msg; t.style.display = 'block';
    clearTimeout(t._timer);
    t._timer = setTimeout(()=>t.style.display='none', 2500);
  }

  // ── CSS ──────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('alim-styles')) return;
    const s = document.createElement('style');
    s.id = 'alim-styles';
    s.textContent = `
      .alim *, .alim *::before, .alim *::after { box-sizing:border-box; margin:0; padding:0; }
      .alim { font-family:'Segoe UI',system-ui,sans-serif; border:1px solid ${C.border}; border-radius:12px; overflow:hidden; background:${C.bg}; display:flex; flex-direction:column; }
      .alim-body { padding:16px; overflow:auto; flex:1; position:relative; }
      .alim-toast { display:none; position:absolute; top:10px; left:50%; transform:translateX(-50%); background:${C.greenLight}; color:${C.green}; border:1px solid ${C.greenBorder}; border-radius:20px; padding:5px 16px; font-size:12px; white-space:nowrap; z-index:200; pointer-events:none; }

      .alim-toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
      .alim-section-title { font-size:12px; font-weight:600; color:${C.tealDark}; }
      .alim-btn-add { font-size:11px; padding:6px 14px; background:${C.tealDark}; color:#fff; border:none; border-radius:8px; cursor:pointer; }
      .alim-btn-add:hover { background:${C.teal}; }
      .alim-types { display:flex; flex-direction:column; gap:6px; margin-bottom:20px; }
      .alim-type-row { background:${C.white}; border:1px solid ${C.border}; border-radius:8px; padding:10px 12px; display:flex; align-items:center; gap:10px; }
      .alim-type-dot { width:14px; height:14px; border-radius:4px; flex-shrink:0; }
      .alim-type-info { flex:1; min-width:0; }
      .alim-type-name { font-size:12px; font-weight:600; color:#222; }
      .alim-type-meta { font-size:10px; color:${C.gray}; margin-top:2px; }
      .alim-type-abbr { font-size:10px; font-weight:600; padding:2px 8px; border-radius:4px; }
      .alim-row-actions { display:flex; gap:5px; }
      .alim-btn-edit { font-size:10px; padding:4px 9px; border:1px solid ${C.border}; border-radius:6px; background:${C.white}; color:${C.gray}; cursor:pointer; }
      .alim-btn-edit:hover { background:${C.bg}; }
      .alim-btn-del { font-size:10px; padding:4px 9px; border:1px solid #f09595; border-radius:6px; background:${C.redLight}; color:${C.red}; cursor:pointer; }
      .alim-divider { height:1px; background:${C.border}; margin:16px 0; }
      .alim-res-toolbar { display:flex; align-items:center; gap:8px; margin-bottom:10px; flex-wrap:wrap; }
      .alim-res-search { flex:1; padding:6px 10px; font-size:12px; border:1px solid ${C.border}; border-radius:8px; background:${C.white}; color:#222; outline:none; min-width:120px; }
      .alim-res-search:focus { border-color:${C.teal}; }
      .alim-res-count { font-size:11px; color:${C.gray}; white-space:nowrap; }
      .alim-res-list { display:flex; flex-direction:column; gap:5px; }
      .alim-res-row { background:${C.white}; border:1px solid ${C.border}; border-radius:8px; padding:9px 12px; display:flex; align-items:center; gap:10px; }
      .alim-res-row:hover { border-color:${C.teal}; }
      .alim-avatar { width:28px; height:28px; border-radius:50%; background:${C.tealLight}; color:${C.tealDark}; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:600; flex-shrink:0; }
      .alim-res-name { font-size:12px; font-weight:600; color:#222; flex:1; min-width:0; }
      .alim-type-badge { font-size:10px; font-weight:600; padding:3px 9px; border-radius:20px; white-space:nowrap; }
      .alim-no-type { font-size:10px; color:${C.gray}; font-style:italic; }
      .alim-select { font-size:11px; padding:4px 8px; border:1px solid ${C.border}; border-radius:6px; background:${C.bg}; color:#222; cursor:pointer; outline:none; }
      .alim-select:focus { border-color:${C.teal}; }
      .alim-btn-clear { font-size:10px; padding:4px 8px; border:1px solid #f09595; border-radius:6px; background:${C.redLight}; color:${C.red}; cursor:pointer; white-space:nowrap; }
      .alim-empty { font-size:12px; color:${C.gray}; text-align:center; padding:20px; }
      .alim-btn-cancel { font-size:12px; padding:6px 14px; border:1px solid ${C.border}; border-radius:8px; background:transparent; color:${C.gray}; cursor:pointer; }
      .alim-btn-save { font-size:12px; padding:6px 14px; border:none; border-radius:8px; background:${C.tealDark}; color:#fff; cursor:pointer; }
      .alim-btn-save:hover { background:${C.teal}; }
      .alim-btn-danger { font-size:12px; padding:6px 14px; border:1px solid #f09595; border-radius:8px; background:${C.redLight}; color:${C.red}; cursor:pointer; }
      .alim-overlay { position:fixed; inset:0; background:rgba(0,0,0,.35); display:flex; align-items:center; justify-content:center; z-index:300; }
      .alim-modal { background:${C.white}; border-radius:12px; padding:20px; width:290px; border:1px solid ${C.border}; }
      .alim-modal h3 { font-size:14px; font-weight:600; color:#222; margin-bottom:14px; }
      .alim-field { margin-bottom:10px; }
      .alim-field label { font-size:11px; color:${C.gray}; display:block; margin-bottom:4px; }
      .alim-field input { width:100%; padding:7px 10px; font-size:13px; border:1px solid ${C.border}; border-radius:8px; background:${C.bg}; color:#222; outline:none; font-family:inherit; }
      .alim-field input:focus { border-color:${C.teal}; }
      .alim-color-grid { display:flex; gap:8px; flex-wrap:wrap; margin-top:4px; }
      .alim-color-opt { width:28px; height:28px; border-radius:6px; cursor:pointer; border:2px solid transparent; transition:border-color .15s; }
      .alim-color-opt.selected { border-color:#222; }
      .alim-modal-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:14px; }

      /* ── Vista auxiliar ── */
      .alim-filter-bar { background:${C.white}; border-bottom:1px solid ${C.border}; padding:10px 14px; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
      .alim-filter-lbl { font-size:10px; color:${C.gray}; text-transform:uppercase; letter-spacing:.05em; font-weight:600; white-space:nowrap; }
      .alim-tipo-btn { padding:6px 12px; border-radius:20px; font-size:11px; font-weight:600; cursor:pointer; border:1.5px solid transparent; transition:all .15s; white-space:nowrap; }
      .alim-tipo-btn.inactive { opacity:.35; }
      .alim-tipo-all { padding:6px 12px; border-radius:20px; font-size:11px; font-weight:500; cursor:pointer; border:1.5px solid ${C.border}; background:${C.bg}; color:${C.gray}; white-space:nowrap; transition:all .15s; }
      .alim-tipo-all.active { background:${C.tealDark}; color:#fff; border-color:${C.tealDark}; }

      /* Mapa auxiliar */
      .alim-canvas-wrap { padding:14px; overflow:auto; flex:1; }
      .alim-zone-lbl { font-size:10px; font-weight:600; color:${C.gray}; text-transform:uppercase; letter-spacing:.06em; margin-bottom:8px; }
      .alim-zone { background:${C.bg}; border-radius:8px; padding:14px; background-image:radial-gradient(circle,${C.border} 1px,transparent 1px); background-size:24px 24px; margin-bottom:10px; overflow:auto; }
      .alim-zone-inner { position:relative; min-width:100%; min-height:80px; }
      .alim-aisle { text-align:center; font-size:10px; color:${C.gray}; padding:4px 0 10px; display:flex; align-items:center; gap:8px; text-transform:uppercase; letter-spacing:.05em; }
      .alim-aisle::before,.alim-aisle::after { content:''; flex:1; height:1px; background:${C.border}; }
      .alim-table { position:absolute; }
      .alim-table-card { background:${C.white}; border:1px solid ${C.border}; border-radius:10px; overflow:hidden; display:inline-flex; transition:opacity .2s; }
      .alim-table-card.dimmed { opacity:.18; }
      .alim-seats-side { display:flex; flex-direction:column; gap:2px; padding:5px 3px; }
      .alim-mesa-mid { display:flex; align-items:center; justify-content:center; background:${C.tealDark}; min-width:24px; padding:0 3px; }
      .alim-mesa-num { font-size:13px; font-weight:600; color:${C.tealLight}; writing-mode:vertical-rl; transform:rotate(180deg); }
      .alim-seat-wrap { width:70px; border-radius:5px; overflow:hidden; border:1px solid ${C.seatBorder||'#9ecfd6'}; transition:opacity .2s, border-color .15s; }
      .alim-seat-wrap.dimmed { opacity:.15; }
      .alim-seat-wrap.highlighted { border-width:2px; }
      .alim-seat-name { font-size:9px; font-weight:500; text-align:center; padding:4px 3px 3px; line-height:1.2; display:flex; align-items:center; justify-content:center; min-height:18px; }
      .alim-seat-tag  { font-size:8px; font-weight:600; text-align:center; padding:2px 3px; line-height:1; }
      .alim-seat-empty { width:70px; height:30px; border-radius:5px; border:1px dashed ${C.border}; background:${C.bg}; display:flex; align-items:center; justify-content:center; font-size:10px; color:${C.gray}; transition:opacity .2s; }
      .alim-seat-empty.dimmed { opacity:.15; }

      .alim-footer { background:${C.white}; border-top:1px solid ${C.border}; padding:7px 14px; display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
      .alim-leg { display:flex; align-items:center; gap:4px; font-size:10px; color:${C.gray}; }
      .alim-lsw { width:12px; height:8px; border-radius:2px; }
      .alim-res-count { margin-left:auto; font-size:11px; font-weight:600; }
    `;
    document.head.appendChild(s);
  }

  // ── Render ────────────────────────────────────────────────────────────
  function render() {
    if (!root) return;
    root.innerHTML = state.role === 'admin' ? renderAdmin() : renderAuxiliar();
    root.innerHTML += `<div class="alim-toast"></div>`;
    bindEvents();
  }

  // ── Vista Admin ───────────────────────────────────────────────────────
  function renderAdmin() {
    const typeRows = state.types.map(t => {
      const count = countAssigned(t.id);
      return `<div class="alim-type-row">
        <div class="alim-type-dot" style="background:${t.color}"></div>
        <div class="alim-type-info">
          <div class="alim-type-name">${t.name}</div>
          <div class="alim-type-meta">${count} residente${count!==1?'s':''}</div>
        </div>
        <span class="alim-type-abbr" style="background:${lighten(t.color)};color:${t.color}">${t.abbr}</span>
        <div class="alim-row-actions">
          <button class="alim-btn-edit" data-tid="${t.id}">Editar</button>
          <button class="alim-btn-del"  data-tid="${t.id}">Eliminar</button>
        </div>
      </div>`;
    }).join('');

    const filteredRes = state.residents.filter(n =>
      n.toLowerCase().includes(state.searchVal.toLowerCase())
    );

    const resRows = filteredRes.map(name => {
      const typeId = state.assignments[name];
      const type   = typeId ? getType(typeId) : null;
      const typeOptions = state.types.map(t =>
        `<option value="${t.id}" ${typeId===t.id?'selected':''}>${t.name}</option>`
      ).join('');
      return `<div class="alim-res-row">
        <div class="alim-avatar">${initials(name)}</div>
        <span class="alim-res-name">${name}</span>
        ${type
          ? `<span class="alim-type-badge" style="background:${lighten(type.color)};color:${type.color}">${type.abbr}</span>`
          : `<span class="alim-no-type">Sin tipo</span>`}
        <select class="alim-select" data-res="${name}">
          <option value="">— Sin tipo —</option>
          ${typeOptions}
        </select>
        ${type ? `<button class="alim-btn-clear" data-res="${name}">✕</button>` : ''}
      </div>`;
    }).join('');

    return `<div class="alim-body">
      <div class="alim-toolbar">
        <span class="alim-section-title">Tipos de dieta</span>
        <button class="alim-btn-add" id="alim-add-type">+ Nuevo tipo</button>
      </div>
      <div class="alim-types">
        ${typeRows || `<p class="alim-empty">Sin tipos definidos. Añade el primero.</p>`}
      </div>
      <div class="alim-divider"></div>
      <div class="alim-res-toolbar">
        <span class="alim-section-title">Asignación por residente</span>
      </div>
      <div class="alim-res-toolbar">
        <input class="alim-res-search" type="text" placeholder="Buscar residente…" value="${state.searchVal}" />
        <span class="alim-res-count">${filteredRes.length} de ${state.residents.length}</span>
      </div>
      <div class="alim-res-list">
        ${resRows || `<p class="alim-empty">${state.residents.length===0?'Sin residentes. Se cargan desde Bio-Senior.':'Sin coincidencias.'}</p>`}
      </div>
    </div>`;
  }

  // ── Vista Auxiliar ────────────────────────────────────────────────────
  function renderAuxiliar() {
    const active     = state.activeFilter;

    const filterBtns = state.types.map(t => {
      const isActive   = active === t.id;
      const isInactive = active && !isActive;
      const count      = countAssigned(t.id);
      return `<div class="alim-tipo-btn ${isInactive?'inactive':''}" data-fid="${t.id}"
        style="background:${lighten(t.color)};color:${t.color};border-color:${isActive?t.color:'transparent'};${isActive?'border-width:2px':''}">
        ${t.name} · ${count}
      </div>`;
    }).join('');

    const resFiltered = state.residents.filter(n =>
      active ? state.assignments[n] === active : !!state.assignments[n]
    );

    const resRows = resFiltered.map(name => {
      const type = getType(state.assignments[name]);
      if (!type) return '';
      return `<div class="alim-res-row" style="border-left:4px solid ${type.color};padding-left:10px">
        <div class="alim-avatar" style="background:${lighten(type.color)};color:${type.color}">${initials(name)}</div>
        <span class="alim-res-name">${name}</span>
        <span class="alim-type-badge" style="background:${lighten(type.color)};color:${type.color}">${type.name}</span>
      </div>`;
    }).join('');

    return `<div class="alim-body">
      <div class="alim-toolbar">
        <span class="alim-section-title">Dietas especiales</span>
        <span style="font-size:11px;color:${C.gray}">${resFiltered.length} residente${resFiltered.length!==1?'s':''}</span>
      </div>
      <div class="alim-filter-bar" style="margin-bottom:14px">
        <div class="alim-tipo-all ${!active?'active':''}" id="alim-filter-all">Todos</div>
        ${filterBtns || `<span style="font-size:11px;color:${C.gray}">Sin tipos definidos</span>`}
      </div>
      <div class="alim-res-list">
        ${resRows || `<p class="alim-empty">${state.types.length===0?'El administrador aún no ha definido tipos de dieta.':'Ningún residente con dieta especial.'}</p>`}
      </div>
    </div>`;
  }

  // ── Bind Events ───────────────────────────────────────────────────────
  function bindEvents() {
    root.querySelector('#alim-add-type')?.addEventListener('click', ()=>showTypeModal());

    root.querySelectorAll('.alim-btn-edit[data-tid]').forEach(btn=>{
      btn.addEventListener('click', ()=>showTypeModal(btn.dataset.tid));
    });

    root.querySelectorAll('.alim-btn-del[data-tid]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const t=getType(btn.dataset.tid); if(!t) return;
        if(!confirm(`¿Eliminar "${t.name}"? Los residentes quedarán sin tipo.`)) return;
        Object.keys(state.assignments).forEach(n=>{ if(state.assignments[n]===t.id) delete state.assignments[n]; });
        state.types=state.types.filter(tp=>tp.id!==t.id);
        saveState(); render();
        showToast(`Tipo "${t.name}" eliminado`);
      });
    });

    root.querySelector('.alim-res-search')?.addEventListener('input', function(){
      state.searchVal=this.value; render();
    });

    root.querySelectorAll('.alim-select[data-res]').forEach(sel=>{
      sel.addEventListener('change', function(){
        const name=this.dataset.res;
        if(this.value) state.assignments[name]=this.value;
        else delete state.assignments[name];
        saveState(); render();
        const type=this.value?getType(this.value):null;
        showToast(type?`${name} → ${type.name}`:`${name} sin tipo`);
      });
    });

    root.querySelectorAll('.alim-btn-clear[data-res]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        delete state.assignments[btn.dataset.res];
        saveState(); render();
        showToast(`${btn.dataset.res} sin tipo`);
      });
    });

    // Filtros auxiliar
    root.querySelector('#alim-filter-all')?.addEventListener('click', ()=>{
      state.activeFilter=null; render();
    });

    root.querySelectorAll('.alim-tipo-btn[data-fid]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        state.activeFilter = state.activeFilter===btn.dataset.fid ? null : btn.dataset.fid;
        render();
      });
    });
  }

  // ── Modal tipo ────────────────────────────────────────────────────────
  function showTypeModal(typeId) {
    const existing    = typeId ? getType(typeId) : null;
    let selectedColor = existing?.color || COLOR_OPTIONS[0].hex;

    const colorDots = COLOR_OPTIONS.map(c=>
      `<div class="alim-color-opt ${selectedColor===c.hex?'selected':''}" data-hex="${c.hex}" title="${c.label}" style="background:${c.hex}"></div>`
    ).join('');

    const overlay=document.createElement('div');
    overlay.className='alim-overlay';
    overlay.innerHTML=`
      <div class="alim-modal">
        <h3>${existing?'Editar tipo':'Nuevo tipo de dieta'}</h3>
        <div class="alim-field"><label>Nombre</label>
          <input class="f-name" type="text" placeholder="Ej: Fácil masticación" value="${existing?.name||''}" /></div>
        <div class="alim-field"><label>Abreviación (máx. 8 caracteres)</label>
          <input class="f-abbr" type="text" placeholder="Ej: F.Mast." maxlength="8" value="${existing?.abbr||''}" /></div>
        <div class="alim-field"><label>Color identificador</label>
          <div class="alim-color-grid">${colorDots}</div></div>
        <div class="alim-modal-actions">
          ${existing?`<button class="alim-btn-danger alim-del-type" data-tid="${typeId}">Eliminar</button>`:''}
          <button class="alim-btn-cancel">Cancelar</button>
          <button class="alim-btn-save">Guardar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelectorAll('.alim-color-opt').forEach(dot=>{
      dot.addEventListener('click', ()=>{
        selectedColor=dot.dataset.hex;
        overlay.querySelectorAll('.alim-color-opt').forEach(d=>d.classList.remove('selected'));
        dot.classList.add('selected');
      });
    });

    overlay.querySelector('.alim-btn-cancel').addEventListener('click', ()=>overlay.remove());

    overlay.querySelector('.alim-btn-save').addEventListener('click', ()=>{
      const name=overlay.querySelector('.f-name').value.trim();
      const abbr=overlay.querySelector('.f-abbr').value.trim();
      if(!name){alert('Indica el nombre');return;}
      if(!abbr){alert('Indica una abreviación');return;}
      if(existing){ existing.name=name; existing.abbr=abbr; existing.color=selectedColor; }
      else { state.typeCounter++; state.types.push({id:'type'+state.typeCounter,name,abbr,color:selectedColor}); }
      saveState(); render(); overlay.remove();
      showToast(existing?`"${name}" actualizado`:`Tipo "${name}" creado`);
    });

    overlay.querySelector('.alim-del-type')?.addEventListener('click', ()=>{
      const t=getType(typeId); if(!t){overlay.remove();return;}
      if(!confirm(`¿Eliminar "${t.name}"?`)) return;
      Object.keys(state.assignments).forEach(n=>{ if(state.assignments[n]===t.id) delete state.assignments[n]; });
      state.types=state.types.filter(tp=>tp.id!==t.id);
      saveState(); render(); overlay.remove();
      showToast(`"${t.name}" eliminado`);
    });
  }

  // ── API pública ───────────────────────────────────────────────────────
  function init(selector, options={}) {
    const container=typeof selector==='string'?document.querySelector(selector):selector;
    if(!container){console.error('AlimentacionModule: contenedor no encontrado');return;}
    container.classList.add('alim');
    injectStyles();
    if(options.role) state.role=options.role;
    syncResidents();
    root=container;
    render();
    return {
      setRole:       (role)=>{state.role=role;render();},
      getData:       ()=>JSON.parse(JSON.stringify({types:state.types,assignments:state.assignments})),
      syncResidents: ()=>{syncResidents();render();},
    };
  }

  function getAssignments() {
    try { const d=loadState(); return {types:d?.types||[],assignments:d?.assignments||{}}; }
    catch(e){ return {types:[],assignments:{}}; }
  }

  return { init, getAssignments };
})();
