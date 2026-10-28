import Icon from './Icon.jsx';
import { REGIONS } from '../lib/catalog.js';

const iconBtn = on =>
  `grid h-9 min-w-9 flex-none cursor-pointer place-items-center rounded-[9px] border bg-panel-2 px-[9px] hover:border-accent hover:text-accent ${on ? 'border-accent text-accent' : 'border-line text-muted'}`;

export default function Topbar({ search, onSearch, region, onRegion, dark, onTheme, onToggleSide, onHome, filterOn, onFilter }) {
  return (
    <header className="flex h-[58px] flex-none flex-wrap items-center gap-3 border-b border-line bg-panel px-4 max-[900px]:h-auto max-[900px]:px-3 max-[900px]:py-2.5">
      <div className="flex w-[220px] min-w-0 items-center gap-2.5 max-[900px]:w-auto">
        <span className="grid size-[34px] flex-none place-items-center rounded-lg bg-gradient-to-br from-accent to-accent-strong text-[#06142e]">
          <Icon name="logo" strokeWidth={2.2} className="size-[19px]" />
        </span>
        <div className="min-w-0">
          <h1 className="m-0 text-base font-bold leading-none tracking-tight">Instance <b className="text-accent">Explorer</b></h1>
          <div className="mt-0.5 font-mono text-[0.58rem] uppercase tracking-[0.04em] text-muted">specs y precios por servicio</div>
        </div>
      </div>
      <button className={iconBtn(false)} onClick={onToggleSide} title="Ocultar/mostrar menú"><Icon name="side" className="size-[18px]" /></button>
      <button className={iconBtn(false)} onClick={onHome} title="Inicio"><Icon name="home" className="size-[18px]" /></button>
      <button className={iconBtn(filterOn)} onClick={onFilter} title="Filtros"><Icon name="filter" className="size-[18px]" /></button>
      <div className="relative max-w-[620px] flex-1 max-[900px]:order-3 max-[900px]:max-w-none max-[900px]:basis-full">
        <Icon name="search" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
        <input
          type="search" value={search} onChange={e => onSearch(e.target.value)}
          placeholder="Buscar tipos de instancia…" autoComplete="off" spellCheck={false}
          className="w-full rounded-[10px] border border-line bg-panel-2 py-[9px] pl-9 pr-3 font-mono text-[0.84rem] text-fg focus-visible:border-accent focus-visible:outline-none"
        />
      </div>
      <span className="flex-1" />
      <span className="inline-flex items-center gap-2 rounded-[10px] border border-line bg-panel-2 px-3 py-2 text-[0.82rem] font-medium">
        <Icon name="globe" className="size-[15px] text-accent" />
        <select
          value={region} onChange={e => onRegion(e.target.value)} aria-label="Región AWS"
          className="max-w-[210px] cursor-pointer appearance-none border-0 bg-transparent font-ui text-[0.82rem] font-medium text-fg focus-visible:outline-none"
        >
          {REGIONS.map(([c, n]) => <option key={c} value={c} className="bg-panel text-fg">{n} · {c}</option>)}
        </select>
      </span>
      <button className={iconBtn(false)} onClick={onTheme} title="Cambiar tema"><Icon name={dark ? 'sun' : 'moon'} className="size-[18px]" /></button>
    </header>
  );
}
