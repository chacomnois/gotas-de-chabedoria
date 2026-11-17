const STORAGE_KEY = 'dev1';

const iso = (d) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 6e4);
  return z.toISOString().slice(0, 10);
};

const BK = [
  { k: 's', n: 'Salmos', t: 150, slug: 'sl' },
  { k: 'p', n: 'Provérbios', t: 31, slug: 'pv' },
  { k: 'e', n: 'Eclesiastes', t: 12, slug: 'ec' }
];

const defaultState = () => ({
  start: iso(new Date()),
  done: {},
  ref: {},
  gen: {},
  theme: ''
});

let S = defaultState();
try {
  const x = localStorage.getItem(STORAGE_KEY);
  if (x) S = Object.assign(defaultState(), JSON.parse(x));
} catch (e) {}

const save = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(S));
  } catch (e) {}
};

const $ = (s) => document.querySelector(s);
const today = () => iso(new Date());
const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (s) =>
  new Date(s + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
const dn = (s) => Math.round((new Date(s + 'T12:00') - new Date(S.start + 'T12:00')) / 864e5);
const addDays = (s, n) => {
  const d = new Date(s + 'T12:00');
  d.setDate(d.getDate() + n);
  return iso(d);
};

const plan = (d) => {
  const n = dn(d);
  return BK.map((b) => ({
    ...b,
    ch: (((n % b.t) + b.t) % b.t) + 1,
    cy: Math.floor(n / b.t) + 1,
    ok: !!(S.done[d] && S.done[d][b.k])
  }));
};

const cnt = (d) => (S.done[d] ? BK.filter((b) => S.done[d][b.k]).length : 0);
const full = (d) => dn(d) >= 0 && cnt(d) === 3;
const hasRef = (d) => {
  const r = S.ref[d];
  return !!(r && (r.v || r.r || r.o || r.ig));
};

function streak() {
  let d = today();
  let n = 0;
  if (!full(d)) d = addDays(d, -1);
  while (full(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

let V = 'hoje';
let sel = today();
const cm = new Date();
cm.setDate(1);
let rs = false;
let busy = false;
let gerr = '';
let bmsg = '';

function genCard() {
  const g = (S.gen || {})[sel];
  let h = '<div class="card gen"><h2>💧 Gota do dia</h2>';
  if (busy) {
    return (
      h +
      '<p class="mut">Gerando…</p>' +
      '<button class="chip on" disabled>Gerando…</button></div>'
    );
  }
  if (!g) {
    return (
      h +
      '<p class="mut sm">Gere uma reflexão sobre os três capítulos e uma frase para o Instagram com IA.</p>' +
      (gerr ? `<p class="sm gen-err">${esc(gerr)}</p>` : '') +
      '<button class="chip on" data-a="gen">Gerar com Google IA</button></div>'
    );
  }
  return (
    h +
    `<p class="mut sm">${esc(g.h || '')}</p>` +
    (gerr ? `<p class="sm gen-err">${esc(gerr)}</p>` : '') +
    '<div class="seg">' +
    '<button class="chip on" data-a="cp-legenda">Copiar legenda</button>' +
    '<button class="chip" data-a="gen">Gerar de novo</button>' +
    '</div>' +
    '<p class="mut sm" id="cpm" style="margin:8px 0 0">Gerado por IA: revise antes de postar.</p></div>'
  );
}

function hoje() {
  const n = dn(sel);
  const p = plan(sel);
  const c = cnt(sel);
  const r = S.ref[sel] || {};
  const dt = new Date(sel + 'T12:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  let h =
    `<div class="top">` +
    `<button class="ib" data-a="nav" data-v="-1" aria-label="Dia anterior">‹</button>` +
    `<div><h1>${dt}</h1><p class="mut sm" style="margin:2px 0 0">${
      n < 0 ? 'Antes do início do plano' : 'Dia ' + (n + 1) + ' do plano · ' + streak() + ' dia(s) seguidos'
    }</p></div>` +
    `<button class="ib" data-a="nav" data-v="1" aria-label="Próximo dia">›</button>` +
    `</div>`;

  if (sel !== today()) {
    h += '<p style="text-align:center"><button class="chip" data-a="goto">Voltar para hoje</button></p>';
  }
  if (n < 0) {
    return h + `<div class="card"><p>O plano começa em ${fmt(S.start)}. Ajuste a data inicial em Ajustes.</p></div>`;
  }

  h += `<div class="bar"><i style="width:${(c / 3) * 100}%"></i></div><p class="mut sm">${c} de 3 leituras concluídas</p>`;

  p.forEach((b) => {
    h +=
      `<div class="card row ${b.ok ? 'ok' : ''}">` +
      `<button class="ck" data-a="tog" data-k="${b.k}" aria-pressed="${b.ok}" aria-label="Marcar ${b.n} como lido">${
        b.ok ? '✓' : ''
      }</button>` +
      `<div class="g"><div class="mut sm">Ciclo ${b.cy}</div><div class="big">${b.n} ${b.ch}</div></div>` +
      `<a class="chip" target="_blank" rel="noopener" href="https://www.bibliaonline.com.br/nvi/${b.slug}/${b.ch}">Ler ↗</a>` +
      `</div>`;
  });

  return (
    h +
    genCard() +
    `<div class="card">` +
    `<h2>Reflexão do dia</h2>` +
    `<label>Versículo que marcou<textarea rows="2" data-f="v">${esc(r.v || '')}</textarea></label>` +
    `<label>O que Deus falou comigo<textarea rows="4" data-f="r">${esc(r.r || '')}</textarea></label>` +
    `<label>Aplicação / oração<textarea rows="3" data-f="o">${esc(r.o || '')}</textarea></label>` +
    `<label for="ig-frase">Frase para o Instagram</label>` +
    `<div class="insta-row">` +
    `<textarea id="ig-frase" rows="2" maxlength="200" placeholder="Escreva ou gere uma frase para postar…" data-f="ig">${esc(
      r.ig || ''
    )}</textarea>` +
    `<button class="chip" type="button" data-a="cp-ig">Copiar</button>` +
    `</div>` +
    `<p class="mut sm" id="sv" style="margin:0">Salvo automaticamente neste aparelho.</p>` +
    `</div>`
  );
}

function cal() {
  const y = cm.getFullYear();
  const m = cm.getMonth();
  const first = new Date(y, m, 1).getDay();
  const len = new Date(y, m + 1, 0).getDate();

  let h =
    `<div class="top">` +
    `<button class="ib" data-a="cm" data-v="-1" aria-label="Mês anterior">‹</button>` +
    `<h1>${cm.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h1>` +
    `<button class="ib" data-a="cm" data-v="1" aria-label="Próximo mês">›</button>` +
    `</div><div class="card"><div class="cal">`;

  'DSTQQSS'.split('').forEach((x) => (h += `<b class="wd">${x}</b>`));
  for (let i = 0; i < first; i++) h += '<span></span>';
  for (let d = 1; d <= len; d++) {
    const s = iso(new Date(y, m, d, 12));
    h += `<button class="day ${s === today() ? 'td' : ''} ${s === sel ? 'sl' : ''} ${
      dn(s) < 0 ? 'off' : ''
    }" data-a="day" data-d="${s}">${d}<em>${'●'.repeat(cnt(s))}</em></button>`;
  }

  return (
    h +
    '</div></div><p class="mut sm">Os pontos mostram quantas das 3 leituras foram concluídas em cada dia. Toque num dia para abri-lo.</p>'
  );
}

function refs(q = '') {
  const ks = Object.keys(S.ref)
    .filter((d) => hasRef(d) && (!q || JSON.stringify(S.ref[d]).toLowerCase().includes(q)))
    .sort()
    .reverse();

  return (
    ks
      .map((d) => {
        const r = S.ref[d];
        return (
          `<div class="card"><div class="mut sm">${fmt(d)}</div>` +
          (r.v ? `<p class="vs">${esc(r.v)}</p>` : '') +
          (r.r ? `<p>${esc(r.r)}</p>` : '') +
          (r.o ? `<p class="mut">🙏 ${esc(r.o)}</p>` : '') +
          (r.ig ? `<p class="sm">📲 ${esc(r.ig)}</p>` : '') +
          `<button class="chip" data-a="day" data-d="${d}">Abrir dia</button></div>`
        );
      })
      .join('') || '<p class="mut">Nenhuma reflexão encontrada.</p>'
  );
}

function prog() {
  const ds = Object.keys(S.done);
  let h =
    `<div class="top"><h1>Progresso</h1></div>` +
    `<div class="stats">` +
    `<div class="card"><b>${streak()}</b><span>dias seguidos</span></div>` +
    `<div class="card"><b>${ds.filter((d) => full(d)).length}</b><span>dias completos</span></div>` +
    `<div class="card"><b>${Object.keys(S.ref).filter(hasRef).length}</b><span>reflexões</span></div>` +
    `</div>`;

  BK.forEach((b) => {
    const n = ds.filter((d) => S.done[d][b.k]).length;
    const cy = Math.floor(n / b.t);
    h +=
      `<div class="card"><div class="row2"><b>${b.n}</b>` +
      `<span class="mut sm">${n} cap. lidos${cy ? ' · ' + cy + ' ciclo(s) completo(s)' : ''}</span></div>` +
      `<div class="bar"><i style="width:${((n % b.t) / b.t) * 100}%"></i></div>` +
      `<p class="mut sm" style="margin:6px 0 0">${n % b.t} de ${b.t} no ciclo ${cy + 1}</p></div>`;
  });

  return h;
}

function cfg() {
  return (
    `<div class="top"><h1>Ajustes</h1></div>` +
    `<div class="card"><label>Data de início do plano<input type="date" id="st" value="${esc(S.start)}"></label>` +
    `<p class="mut sm" style="margin:0">Os capítulos avançam por data (todos leem o mesmo dia): Salmos 1–150, Provérbios 1–31 e Eclesiastes 1–12, recomeçando ao terminar cada livro.</p></div>` +
    `<div class="card"><h2>Tema</h2><div class="seg">${[
      ['', 'Automático'],
      ['light', 'Claro'],
      ['dark', 'Escuro']
    ]
      .map((t) => `<button class="chip ${S.theme === t[0] ? 'on' : ''}" data-a="th" data-v="${t[0]}">${t[1]}</button>`)
      .join('')}</div></div>` +
    `<div class="card"><h2>Backup</h2><p class="mut sm">Exporte suas leituras e reflexões em JSON ou restaure um arquivo salvo anteriormente.</p>` +
    `<div class="seg">` +
    `<button class="chip" data-a="export">Exportar backup (.json)</button>` +
    `<label class="chip file-btn">Importar backup (.json)<input type="file" id="imp" accept="application/json,.json"></label>` +
    `</div>` +
    (bmsg ? `<p class="mut sm" style="margin:8px 0 0">${esc(bmsg)}</p>` : '') +
    `</div>` +
    `<div class="card"><h2>Dados</h2><p class="mut sm">Tudo fica salvo apenas neste navegador.</p>` +
    `<button class="chip warn" data-a="reset">${rs ? 'Toque de novo para apagar tudo' : 'Apagar todos os dados'}</button></div>`
  );
}

async function copyText(t) {
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch (e) {
    const a = document.createElement('textarea');
    a.value = t;
    document.body.appendChild(a);
    a.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (x) {}
    a.remove();
    return ok;
  }
}

async function gen() {
  const d = sel;
  const leitura = plan(d)
    .map((b) => `${b.n} ${b.ch}`)
    .join(', ');
  busy = true;
  gerr = '';
  render();

  try {
    const res = await fetch('/api/gerar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leitura })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Não foi possível gerar agora. Tente novamente.');
    }

    (S.gen = S.gen || {})[d] = {
      r: data.reflexao,
      f: data.frase,
      h: data.hashtags
    };
    S.ref[d] = S.ref[d] || {};
    S.ref[d].r = data.reflexao;
    S.ref[d].ig = data.frase;
    save();
  } catch (e) {
    gerr = e && e.message ? e.message : 'Não foi possível gerar agora. Tente novamente.';
  }

  busy = false;
  render();
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gotas-de-chabedoria-backup-${today()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  bmsg = 'Backup exportado ✓';
  render();
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result || ''));
      if (!data || typeof data !== 'object' || typeof data.start !== 'string') {
        throw new Error('Formato inválido');
      }
      S = {
        start: /^\d{4}-\d{2}-\d{2}$/.test(data.start) ? data.start : today(),
        done: data.done && typeof data.done === 'object' ? data.done : {},
        ref: data.ref && typeof data.ref === 'object' ? data.ref : {},
        gen: data.gen && typeof data.gen === 'object' ? data.gen : {},
        theme: data.theme === 'light' || data.theme === 'dark' ? data.theme : ''
      };
      save();
      bmsg = 'Backup importado com sucesso ✓';
    } catch (e) {
      bmsg = 'Arquivo de backup inválido.';
    }
    render();
  };
  reader.readAsText(file);
}

const NAV = [
  ['hoje', '☀', 'Hoje'],
  ['cal', '▦', 'Calendário'],
  ['ref', '✎', 'Reflexões'],
  ['prog', '◔', 'Progresso'],
  ['cfg', '⚙', 'Ajustes']
];

const VIEWS = {
  hoje,
  cal,
  prog,
  cfg,
  ref: () => `<div class="top"><h1>Reflexões</h1></div><input data-q placeholder="Buscar nas reflexões…"><div id="rl">${refs()}</div>`
};

function render() {
  if (S.theme) document.documentElement.dataset.theme = S.theme;
  else document.documentElement.removeAttribute('data-theme');

  $('#nav').innerHTML = NAV.map(
    (n) => `<button class="${V === n[0] ? 'on' : ''}" data-a="tab" data-v="${n[0]}"><span>${n[1]}</span>${n[2]}</button>`
  ).join('');
  $('#main').innerHTML = VIEWS[V]();
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-a]');
  if (!t) return;
  const a = t.dataset.a;
  const v = t.dataset.v;
  if (a !== 'reset') rs = false;
  if (a !== 'export') bmsg = '';

  if (a === 'tab') {
    V = v;
    gerr = '';
  } else if (a === 'nav') {
    sel = addDays(sel, +v);
    gerr = '';
  } else if (a === 'goto') {
    sel = today();
    gerr = '';
  } else if (a === 'tog') {
    (S.done[sel] = S.done[sel] || {})[t.dataset.k] = !S.done[sel][t.dataset.k];
    save();
  } else if (a === 'cm') {
    cm.setMonth(cm.getMonth() + +v);
  } else if (a === 'day') {
    sel = t.dataset.d;
    V = 'hoje';
    gerr = '';
  } else if (a === 'gen') {
    gen();
    return;
  } else if (a === 'cp-ig') {
    const text = (S.ref[sel] && S.ref[sel].ig) || '';
    if (!text.trim()) return;
    copyText(text).then(() => {
      t.textContent = 'Copiado ✓';
      setTimeout(() => {
        if (t.isConnected) t.textContent = 'Copiar';
      }, 2000);
    });
    return;
  } else if (a === 'cp-legenda') {
    const g = (S.gen || {})[sel];
    const r = S.ref[sel] || {};
    if (!g) return;
    const frase = (r.ig || g.f || '').trim();
    const reflexao = (r.r || g.r || '').trim();
    const hashtags = (g.h || '').trim();
    const fullCaption = [frase, reflexao, hashtags].filter(Boolean).join('\n\n');
    copyText(fullCaption).then(() => {
      const m = $('#cpm');
      if (m) m.textContent = 'Legenda copiada ✓';
    });
    return;
  } else if (a === 'th') {
    S.theme = v;
    save();
  } else if (a === 'export') {
    exportBackup();
    return;
  } else if (a === 'reset') {
    if (rs) {
      S = defaultState();
      save();
      rs = false;
    } else {
      rs = true;
    }
  }
  render();
});

document.addEventListener('input', (e) => {
  const f = e.target.dataset.f;
  if (f) {
    (S.ref[sel] = S.ref[sel] || {})[f] = e.target.value;
    save();
    const sv = $('#sv');
    if (sv) sv.textContent = 'Salvo ✓';
  } else if ('q' in e.target.dataset) {
    const rl = $('#rl');
    if (rl) rl.innerHTML = refs(e.target.value.toLowerCase());
  }
});

document.addEventListener('change', (e) => {
  if (e.target.id === 'st' && e.target.value) {
    S.start = e.target.value;
    save();
    render();
  } else if (e.target.id === 'imp' && e.target.files && e.target.files[0]) {
    importBackup(e.target.files[0]);
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

render();
