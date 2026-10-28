import Icon from './Icon.jsx';

const Stat = ({ icon, label, value, sub }) => (
  <div className="rounded-[14px] border border-line bg-panel p-[18px]">
    <div className="flex items-center justify-between gap-2.5 text-[0.86rem] text-muted">
      <span>{label}</span>
      <span className="grid size-[30px] flex-none place-items-center rounded-lg bg-accent/14 text-accent"><Icon name={icon} className="size-4" /></span>
    </div>
    <div className="mb-0.5 mt-3 font-mono text-[1.9rem] font-bold">{value}</div>
    <div className="font-mono text-[0.76rem] text-faint">{sub}</div>
  </div>
);

const Feat = ({ icon, title, children }) => (
  <div className="rounded-[14px] border border-line bg-panel p-5">
    <div className="mb-3.5 grid size-[34px] place-items-center rounded-[9px] bg-accent/14 text-accent"><Icon name={icon} className="size-[18px]" /></div>
    <h3 className="m-0 mb-[7px] text-base font-bold">{title}</h3>
    <p className="m-0 text-[0.86rem] leading-[1.55] text-muted">{children}</p>
  </div>
);

export default function Home({ services }) {
  const total = services.reduce((a, s) => a + s.instances.length, 0);
  const fams = new Set(services.flatMap(s => s.instances.map(d => `${s.id}:${d.fam}`))).size;
  return (
    <>
      <section className="relative mb-[18px] overflow-hidden rounded-2xl border border-line bg-[radial-gradient(900px_280px_at_0%_0%,color-mix(in_srgb,var(--accent)_16%,transparent),transparent_60%),linear-gradient(180deg,var(--panel),var(--bg))] px-10 pb-12 pt-10">
        <span className="mb-[22px] inline-flex items-center gap-2 rounded-[7px] border border-accent/45 bg-accent/12 px-[11px] py-1.5 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-accent">
          <Icon name="gear" className="size-3.5" /> AWS specs and pricing catalog
        </span>
        <h2 className="m-0 mb-4 max-w-[20ch] text-[clamp(1.9rem,3.4vw,2.8rem)] font-bold leading-[1.06] tracking-[-0.03em]">Every AWS instance type, with comparable specs and prices.</h2>
        <p className="m-0 max-w-[62ch] text-[1.02rem] leading-[1.6] text-muted">Explore the instance types of six AWS services — EC2, RDS, ElastiCache, OpenSearch, Redshift and MQ — organized by family. Find the right instance, review its configuration and compare it by specs.</p>
      </section>
      <div className="mb-[18px] grid grid-cols-4 gap-3.5 max-[1040px]:grid-cols-2 max-[900px]:grid-cols-1">
        <Stat icon="cube" label="Instance types" value={total.toLocaleString('en-US')} sub="across 6 AWS services" />
        <Stat icon="db" label="Services" value={services.length} sub="EC2 · RDS · ElastiCache · OpenSearch · Redshift · MQ" />
        <Stat icon="layers" label="Families" value={fams} sub="grouped by category" />
        <Stat icon="gear" label="Source" value="moto" sub="DescribeInstanceTypes · Apache-2.0" />
      </div>
      <div className="grid grid-cols-3 gap-3.5 max-[1040px]:grid-cols-1">
        <Feat icon="layers" title="Browse by service and family">The EC2, RDS, ElastiCache, OpenSearch, Redshift and MQ types, organized by family with their specifications.</Feat>
        <Feat icon="sliders" title="Filter and sort every option">Narrow by vCPU, memory and monthly budget, and sort by any column to find the ideal instance.</Feat>
        <Feat icon="compare" title="Real specs from the API">Specs taken from DescribeInstanceTypes; reference prices ready to be matched against the AWS Price List.</Feat>
      </div>
    </>
  );
}
