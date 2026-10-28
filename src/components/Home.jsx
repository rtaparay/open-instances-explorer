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
          <Icon name="gear" className="size-3.5" /> Catálogo de specs y precios AWS
        </span>
        <h2 className="m-0 mb-4 max-w-[20ch] text-[clamp(1.9rem,3.4vw,2.8rem)] font-bold leading-[1.06] tracking-[-0.03em]">Cada tipo de instancia AWS, con specs y precio comparables.</h2>
        <p className="m-0 max-w-[62ch] text-[1.02rem] leading-[1.6] text-muted">Explora los tipos de instancia de seis servicios de AWS —EC2, RDS, ElastiCache, OpenSearch, Redshift y MQ— organizados por familia. Encuentra la instancia adecuada, revisa su configuración y compárala por specs.</p>
      </section>
      <div className="mb-[18px] grid grid-cols-4 gap-3.5 max-[1040px]:grid-cols-2 max-[900px]:grid-cols-1">
        <Stat icon="cube" label="Tipos de instancia" value={total.toLocaleString('en-US')} sub="en 6 servicios AWS" />
        <Stat icon="db" label="Servicios" value={services.length} sub="EC2 · RDS · ElastiCache · OpenSearch · Redshift · MQ" />
        <Stat icon="layers" label="Familias" value={fams} sub="agrupadas por categoría" />
        <Stat icon="gear" label="Fuente" value="moto" sub="DescribeInstanceTypes · Apache-2.0" />
      </div>
      <div className="grid grid-cols-3 gap-3.5 max-[1040px]:grid-cols-1">
        <Feat icon="layers" title="Explora por servicio y familia">Los tipos de EC2, RDS, ElastiCache, OpenSearch, Redshift y MQ, organizados por familia con sus especificaciones.</Feat>
        <Feat icon="sliders" title="Filtra y ordena cada opción">Acota por vCPU, memoria y presupuesto mensual, y ordena por cualquier columna para hallar la instancia ideal.</Feat>
        <Feat icon="compare" title="Specs reales desde la API">Specs tomadas de DescribeInstanceTypes; precios referenciales listos para cruzar con el AWS Price List.</Feat>
      </div>
    </>
  );
}
