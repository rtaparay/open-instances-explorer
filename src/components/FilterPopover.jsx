const field = 'rounded-lg border border-line bg-panel-2 px-2.5 py-2 font-mono text-[0.84rem] normal-case tracking-normal text-fg focus-visible:border-accent focus-visible:outline-none';

function Num({ label, value, onChange, placeholder }) {
  return (
    <label className="flex flex-col gap-[5px] text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-muted">
      {label}
      <input type="number" min="0" value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} className={field} />
    </label>
  );
}

export default function FilterPopover({ filters, onChange, onClear }) {
  return (
    <div className="fixed left-[112px] top-16 z-30 flex w-[270px] flex-col gap-3 rounded-xl border border-line bg-panel p-3.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,.6)] max-[900px]:inset-x-3 max-[900px]:left-3 max-[900px]:w-auto">
      <div className="font-mono text-[0.64rem] uppercase tracking-[0.1em] text-muted">Filters</div>
      <Num label="Min vCPU" value={filters.v} onChange={v => onChange({ v })} placeholder="0" />
      <Num label="Min RAM (GiB)" value={filters.m} onChange={m => onChange({ m })} placeholder="0" />
      <Num label="Max budget ($/mo)" value={filters.mo} onChange={mo => onChange({ mo })} placeholder="∞" />
      <button onClick={onClear} className="cursor-pointer self-end rounded-lg border border-line bg-panel-2 px-3 py-[7px] text-[0.8rem] font-semibold text-fg hover:border-accent hover:text-accent">Clear</button>
    </div>
  );
}
