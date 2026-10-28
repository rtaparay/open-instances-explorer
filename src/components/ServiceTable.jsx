import { useMemo, useState } from 'react';
import Icon from './Icon.jsx';
import { LBL, NUMK, filterAndSort, money, money0 } from '../lib/catalog.js';

const Dash = () => <span className="text-faint">—</span>;

function Cell({ d, k }) {
  const num = 'text-right font-mono';
  switch (k) {
    case 't': return <td className="whitespace-nowrap border-b border-line-soft px-4 py-3 font-mono font-semibold">{d.t}{d.gen === 0 && <span className="ml-1.5 rounded-[5px] border border-line px-1 align-middle font-mono text-[0.6rem] font-normal text-faint">prev gen</span>}</td>;
    case 'v': return <td className={`whitespace-nowrap border-b border-line-soft px-4 py-3 ${num}`}>{d.v ?? '—'}</td>;
    case 'm': return <td className={`whitespace-nowrap border-b border-line-soft px-4 py-3 ${num}`}>{d.m != null ? `${d.m} GiB` : '—'}</td>;
    case 'sto': case 'net': case 'famlabel':
      return <td className="whitespace-nowrap border-b border-line-soft px-4 py-3 text-faint">{d[k] || '—'}</td>;
    case 'a': return <td className="whitespace-nowrap border-b border-line-soft px-4 py-3 font-mono text-[0.78rem] text-muted">{d.a || '—'}</td>;
    case 'gpu': return <td className="whitespace-nowrap border-b border-line-soft px-4 py-3 font-mono text-[0.78rem] text-muted">{d.gpu || <Dash />}</td>;
    case 'cfg': return <td className="whitespace-nowrap border-b border-line-soft px-4 py-3">{d.cfg ? <span className="inline-block rounded-full border border-accent/30 bg-accent/12 px-2.5 py-0.5 font-mono text-[0.74rem] text-accent-strong">{d.cfg}</span> : <Dash />}</td>;
    case 'hr': return <td className={`whitespace-nowrap border-b border-line-soft px-4 py-3 font-semibold ${num}`}>{d.hr != null ? money(d.hr) : <Dash />}</td>;
    case 'mo': return <td className={`whitespace-nowrap border-b border-line-soft px-4 py-3 font-semibold text-muted ${num}`}>{d.mo != null ? money0(d.mo) : <Dash />}</td>;
    default: return <td />;
  }
}

export default function ServiceTable({ service, famFilter, filters, search }) {
  const [qf, setQf] = useState('');
  const [sort, setSort] = useState({ key: 't', dir: 1 });
  const rows = useMemo(
    () => filterAndSort(service, { famFilter, ...filters, q: search, qf, sortKey: sort.key, sortDir: sort.dir }),
    [service, famFilter, filters, search, qf, sort],
  );
  const toggleSort = key => setSort(s => s.key === key ? { key, dir: -s.dir } : { key, dir: 1 });
  const fmtN = n => n.toLocaleString('en-US');

  return (
    <>
      <div className="mb-[18px] flex flex-wrap items-center gap-3.5">
        <h2 className="m-0 text-[1.7rem] font-bold tracking-[-0.02em]">{service.name}</h2>
        <span className="text-[0.95rem] text-muted">{fmtN(rows.length)} de {fmtN(service.instances.length)} instancias</span>
        <div className="relative ml-auto min-w-60">
          <Icon name="search" className="absolute left-[11px] top-1/2 size-[15px] -translate-y-1/2 text-faint" />
          <input
            type="search" value={qf} onChange={e => setQf(e.target.value)} placeholder="Quick filter, e.g. r7g…" autoComplete="off"
            className="w-full rounded-[10px] border border-line bg-panel-2 py-[9px] pl-[34px] pr-[11px] font-mono text-[0.82rem] text-fg focus-visible:border-accent focus-visible:outline-none"
          />
        </div>
      </div>
      <div className="overflow-auto rounded-[14px] border border-line bg-panel">
        <table className="w-full border-collapse text-[0.86rem]">
          <thead>
            <tr>
              {service.cols.map(k => (
                <th
                  key={k} onClick={() => toggleSort(k)}
                  className={`sticky top-0 z-[1] cursor-pointer select-none whitespace-nowrap border-b border-line bg-panel px-4 py-[13px] font-mono text-[0.72rem] font-semibold tracking-[0.03em] text-muted ${NUMK.has(k) ? 'text-right' : 'text-left'}`}
                >
                  {LBL[k]}{sort.key === k && <span className="ml-1 text-[0.7rem] text-accent">{sort.dir > 0 ? '▲' : '▼'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="[&>tr:hover]:bg-panel-2">
            {rows.length
              ? rows.map(d => <tr key={d.t}>{service.cols.map(k => <Cell key={k} d={d} k={k} />)}</tr>)
              : <tr><td colSpan={service.cols.length} className="p-10 text-center text-muted">No results.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-5 rounded-xl border border-line-soft bg-panel px-4 py-3.5 text-[0.8rem] leading-[1.55] text-muted">
        <b className="text-fg">Source.</b> EC2 specs from <Code>DescribeInstanceTypes</Code> (moto, Apache-2.0). <b className="text-fg">Prices</b> On-Demand us-east-1 (Linux) computed with AWS's linear model: base price <Code>.large</Code> of the family × size factor (large=1, xlarge=2, 2xlarge=4…). Covers the standard families; families without a base price and the managed services (RDS, ElastiCache, OpenSearch, MQ, Redshift) show <Code>—</Code> until matched against the <b className="text-fg">AWS Price List</b> per service and region.
      </div>
    </>
  );
}

const Code = ({ children }) => <code className="rounded-[5px] bg-panel-3 px-1.5 py-px font-mono text-accent-strong">{children}</code>;
