import Icon from './Icon.jsx';
import { CATORDER } from '../lib/catalog.js';

function Families({ service, catLabels, famFilter, onFam }) {
  const byCat = {};
  service.instances.forEach(d => {
    byCat[d.cat] ??= {};
    byCat[d.cat][d.fam] = (byCat[d.cat][d.fam] || 0) + 1;
  });
  const row = (key, label, count) => (
    <button
      key={key} onClick={() => onFam(key || null)} aria-current={famFilter === (key || null)}
      className="flex w-full cursor-pointer items-center gap-[9px] rounded-[7px] border border-transparent bg-transparent px-2.5 py-[7px] text-left font-mono text-[0.8rem] text-muted hover:bg-panel-2 hover:text-fg aria-[current=true]:bg-accent/[0.13] aria-[current=true]:text-accent"
    >
      <span>{label}</span><span className="ml-auto text-[0.72rem] text-faint group-aria-[current=true]:text-accent">{count}</span>
    </button>
  );
  return (
    <div className="pb-2 pl-1.5 pt-1">
      {row('', 'All families', service.instances.length)}
      {CATORDER.filter(c => byCat[c]).map(c => (
        <div key={c}>
          <div className="px-2 pb-1 pt-2 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-faint">{catLabels[c] || c}</div>
          {Object.keys(byCat[c]).sort().map(f => row(f, f, byCat[c][f]))}
        </div>
      ))}
    </div>
  );
}

export default function Sidebar({ services, catLabels, activeSvc, famFilter, onService, onFam }) {
  return (
    <aside className="min-h-0 overflow-y-auto border-r border-line bg-panel p-2.5 max-[900px]:max-h-[300px] max-[900px]:border-b max-[900px]:border-r-0">
      {services.map(s => {
        const open = s.id === activeSvc;
        return (
          <div key={s.id} className="mb-0.5">
            <button
              onClick={() => onService(s.id)}
              className={`flex w-full cursor-pointer items-center gap-2.5 rounded-[9px] border border-transparent bg-transparent px-[11px] py-2.5 text-left text-[0.9rem] font-semibold hover:bg-panel-2 ${open ? 'text-accent' : 'text-fg'}`}
            >
              <Icon name={s.id} className={`size-[18px] flex-none ${open ? 'text-accent' : 'text-muted'}`} />
              {s.name.replace('Amazon ', '').replace(' Service', '')}
              <span className={`ml-auto text-faint transition-transform duration-150 ${open ? 'rotate-90' : ''}`}>›</span>
            </button>
            {open && <Families service={s} catLabels={catLabels} famFilter={famFilter} onFam={onFam} />}
          </div>
        );
      })}
    </aside>
  );
}
