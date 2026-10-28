import { useEffect, useMemo, useState } from 'react';
import Topbar from './components/Topbar.jsx';
import Sidebar from './components/Sidebar.jsx';
import FilterPopover from './components/FilterPopover.jsx';
import ServiceTable from './components/ServiceTable.jsx';
import Home from './components/Home.jsx';
import { applyPrices } from './lib/catalog.js';

const NO_FILTERS = { v: '', m: '', mo: '' };
const isDark = () => getComputedStyle(document.documentElement).colorScheme.includes('dark');

export default function App() {
  const [db, setDb] = useState(null);
  const [error, setError] = useState(null);
  const [view, setView] = useState('home');
  const [activeSvc, setActiveSvc] = useState(null);
  const [famFilter, setFamFilter] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(NO_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sideHidden, setSideHidden] = useState(false);
  const [region, setRegion] = useState('us-east-1');
  const [dark, setDark] = useState(true);

  useEffect(() => {
    let saved = null;
    try { saved = localStorage.getItem('ie-theme'); } catch { /* sin storage */ }
    if (saved) document.documentElement.setAttribute('data-theme', saved);
    setDark(isDark());
  }, []);

  useEffect(() => {
    fetch('services.json', { cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error('services.json HTTP ' + r.status); return r.json(); })
      .then(d => setDb(applyPrices(d)))
      .catch(e => setError(e.message));
  }, []);

  const numFilters = useMemo(() => ({
    fV: parseFloat(filters.v) || 0,
    fM: parseFloat(filters.m) || 0,
    fMo: parseFloat(filters.mo) || Infinity,
  }), [filters]);
  const filtersActive = numFilters.fV > 0 || numFilters.fM > 0 || numFilters.fMo !== Infinity;

  const openService = id => { setView('service'); setActiveSvc(id); setFamFilter(null); };
  const ensureService = () => { if (view !== 'service') { setView('service'); setActiveSvc(a => a || 'ec2'); } };

  const toggleTheme = () => {
    const next = isDark() ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('ie-theme', next); } catch { /* sin storage */ }
    setDark(next === 'dark');
  };

  const service = db && view === 'service' ? db.services.find(s => s.id === activeSvc) : null;

  return (
    <div className="flex h-screen flex-col overflow-hidden max-[900px]:h-auto max-[900px]:overflow-auto">
      <Topbar
        search={search} onSearch={v => { setSearch(v); ensureService(); }}
        region={region} onRegion={setRegion}
        dark={dark} onTheme={toggleTheme}
        onToggleSide={() => setSideHidden(h => !h)}
        onHome={() => { setView('home'); setFamFilter(null); }}
        filterOn={filtersActive || filterOpen}
        onFilter={() => { ensureService(); setFilterOpen(o => !o); }}
      />
      {filterOpen && (
        <FilterPopover filters={filters} onChange={p => setFilters(f => ({ ...f, ...p }))} onClear={() => setFilters(NO_FILTERS)} />
      )}
      <div className={`grid min-h-0 flex-1 max-[900px]:grid-cols-1 ${sideHidden ? 'grid-cols-1' : 'grid-cols-[252px_1fr]'}`}>
        {db && !sideHidden && (
          <Sidebar services={db.services} catLabels={db.catlabels || {}} activeSvc={view === 'service' ? activeSvc : null} famFilter={famFilter} onService={openService} onFam={setFamFilter} />
        )}
        <main className="min-h-0 overflow-y-auto px-6 pb-10 pt-[22px]">
          {error && <div className="p-10 text-center text-muted">No se pudo cargar el catálogo: {error}. Usa <code>npm run dev</code> o <code>npm run preview</code>, no file://</div>}
          {!db && !error && <div className="p-10 text-center text-muted">Cargando…</div>}
          {db && view === 'home' && <Home services={db.services} />}
          {service && <ServiceTable key={service.id} service={service} famFilter={famFilter} filters={numFilters} search={search} />}
        </main>
      </div>
    </div>
  );
}
