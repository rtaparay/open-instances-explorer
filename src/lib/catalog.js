export const LBL = { t:'Instance type', v:'vCPUs', m:'Memory', sto:'Storage', net:'Network', a:'Arch', gpu:'GPU', cfg:'Configuration', famlabel:'Family', hr:'Hourly', mo:'Monthly' };
export const NUMK = new Set(['v', 'm', 'hr', 'mo']);
export const CATORDER = ['general', 'compute', 'memory', 'storage', 'accel'];

export const REGIONS = [
  ['us-east-1','US East (N. Virginia)'],['us-east-2','US East (Ohio)'],['us-west-1','US West (N. California)'],['us-west-2','US West (Oregon)'],
  ['af-south-1','Africa (Cape Town)'],
  ['ap-east-1','Asia Pacific (Hong Kong)'],['ap-south-1','Asia Pacific (Mumbai)'],['ap-south-2','Asia Pacific (Hyderabad)'],
  ['ap-southeast-1','Asia Pacific (Singapore)'],['ap-southeast-2','Asia Pacific (Sydney)'],['ap-southeast-3','Asia Pacific (Jakarta)'],['ap-southeast-4','Asia Pacific (Melbourne)'],
  ['ap-northeast-1','Asia Pacific (Tokyo)'],['ap-northeast-2','Asia Pacific (Seoul)'],['ap-northeast-3','Asia Pacific (Osaka)'],
  ['ca-central-1','Canada (Central)'],['ca-west-1','Canada West (Calgary)'],
  ['eu-central-1','Europe (Frankfurt)'],['eu-central-2','Europe (Zurich)'],['eu-west-1','Europe (Ireland)'],['eu-west-2','Europe (London)'],['eu-west-3','Europe (Paris)'],
  ['eu-north-1','Europe (Stockholm)'],['eu-south-1','Europe (Milan)'],['eu-south-2','Europe (Spain)'],
  ['il-central-1','Israel (Tel Aviv)'],['me-south-1','Middle East (Bahrain)'],['me-central-1','Middle East (UAE)'],
  ['sa-east-1','South America (São Paulo)'],
];

const fmt = (n, min, max) => n.toLocaleString('en-US', { minimumFractionDigits: min, maximumFractionDigits: max });
export const money = n => '$' + fmt(n, n < 10 ? 4 : 2, n < 10 ? 4 : 2) + '/hr';
export const money0 = n => '$' + fmt(n, 0, 2) + '/mo';

/* On-Demand prices, us-east-1 (Linux). AWS linear model: price = base (the family's .large) × size factor. */
const NORM = { nano:0.0625,micro:0.125,small:0.25,medium:0.5,large:1,xlarge:2,'2xlarge':4,'3xlarge':6,'4xlarge':8,'6xlarge':12,'8xlarge':16,'9xlarge':18,'12xlarge':24,'16xlarge':32,'18xlarge':36,'24xlarge':48,'32xlarge':64,'48xlarge':96 };
const FAMILY_LARGE = {
  t2:0.0928,t3:0.0832,t3a:0.0752,t4g:0.0672,
  m4:0.10,m5:0.096,m5a:0.086,m5ad:0.103,m5d:0.113,m5n:0.119,m5dn:0.136,m5zn:0.1652,m6i:0.096,m6id:0.11859,m6a:0.0864,m6idn:0.11867,m6g:0.077,m6gd:0.0904,m7i:0.1008,m7g:0.0816,m7a:0.11592,
  c4:0.10,c5:0.085,c5a:0.077,c5ad:0.086,c5d:0.096,c5n:0.108,c6i:0.085,c6id:0.1008,c6a:0.0765,c6in:0.1134,c6g:0.068,c6gd:0.0768,c6gn:0.0864,c7i:0.08925,c7a:0.09146,c7g:0.0725,c7gd:0.087,c7gn:0.0998,
  r4:0.133,r5:0.126,r5a:0.113,r5ad:0.131,r5d:0.144,r5n:0.149,r5dn:0.167,r5b:0.149,r6i:0.126,r6id:0.1512,r6a:0.1134,r6idn:0.1659,r6in:0.14751,r6g:0.1008,r6gd:0.1152,r7i:0.1323,r7a:0.15295,r7g:0.1071,r7gd:0.12243,z1d:0.186,x2idn:0.2084,
  i3:0.156,i3en:0.226,i4i:0.1716,
};
const sizeTok = t => t.split('.').slice(1).join('.');

/** Returns the catalog with computed EC2 prices (without mutating the original). */
export function applyPrices(db) {
  return {
    ...db,
    services: db.services.map(s => s.id !== 'ec2' ? s : {
      ...s,
      instances: s.instances.map(d => {
        const base = FAMILY_LARGE[d.fam], f = NORM[sizeTok(d.t)];
        if (base != null && f != null && !d.t.includes('-flex')) {
          const hr = Math.round(base * f * 10000) / 10000;
          return { ...d, hr, mo: Math.round(hr * 730 * 100) / 100 };
        }
        return { ...d, hr: null, mo: null };
      }),
    }),
  };
}

export function filterAndSort(s, { famFilter, fV, fM, fMo, q, qf, sortKey, sortDir }) {
  const gq = q.trim().toLowerCase(), lq = qf.trim().toLowerCase();
  const rows = s.instances.filter(d => {
    if (famFilter && d.fam !== famFilter) return false;
    if ((d.v || 0) < fV || (d.m || 0) < fM) return false;
    if (fMo !== Infinity && (d.mo == null || d.mo > fMo)) return false;
    const hay = `${d.t} ${d.famlabel || ''} ${d.cfg || ''} ${d.a || ''}`.toLowerCase();
    return (!gq || hay.includes(gq)) && (!lq || hay.includes(lq));
  });
  rows.sort((a, b) => {
    let x = a[sortKey], y = b[sortKey];
    if (NUMK.has(sortKey)) { x = x ?? -1; y = y ?? -1; return (x - y) * sortDir; }
    x = String(x ?? '').toLowerCase(); y = String(y ?? '').toLowerCase();
    return x < y ? -sortDir : x > y ? sortDir : 0;
  });
  return rows;
}
