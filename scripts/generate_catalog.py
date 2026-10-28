#!/usr/bin/env python3
"""
generate_catalog.py — Genera el catálogo de tipos de instancia con PRECIOS reales
(hora y mes) para 6 servicios de AWS: EC2, RDS, ElastiCache, OpenSearch, Redshift y MQ.

Produce un services.json con la MISMA forma que consume la página Instance Explorer:
  { "catlabels": {...}, "services": [ {id,name,cols,instances:[...]} ] }

Fuentes:
  - Especificaciones (vCPU, memoria, red, almacenamiento, GPU, arquitectura): EC2 DescribeInstanceTypes.
    Los servicios gestionados reusan la spec de su familia EC2 equivalente (db.<t> / cache.<t> / <t>.search / mq.<t>).
  - Precios On-Demand: AWS Price List Query API (pricing:GetProducts), por serviceCode y región.
  - Mensual = hora × 730.

Requisitos:
  pip install boto3
  Credenciales AWS con permisos de lectura (ver README). La Pricing API vive en us-east-1 / ap-south-1.

Uso:
  python generate_catalog.py --region us-east-1 --out services.json
  python generate_catalog.py --region eu-west-1 --rds-engine PostgreSQL --mq-engine ActiveMQ
"""
import argparse, json, re, sys
import boto3

HRS = 730
CATLBL = {'general':'Propósito general','compute':'Cómputo optimizado','memory':'Memoria optimizada',
          'storage':'Almacenamiento optimizado','accel':'Cómputo acelerado'}

# ---------- helpers de clasificación ----------
def fam_of(t):            # familia: token antes del primer punto (sin prefijo de servicio)
    base = t.split('.', 1)[0]
    return re.match(r'[a-z0-9]+', base).group(0)

def cat_of(fam):
    f = re.match(r'[a-z]+', fam).group(0)
    if fam.startswith('u'): return 'memory'
    if f == 't': return 'general'
    if f in ('c','hpc'): return 'compute'
    if f in ('r','x','z','cr','hi'): return 'memory'
    if f in ('i','d','h','im','is','hs'): return 'storage'
    if f in ('g','p','inf','trn','dl','vt','f','gr'): return 'accel'
    if f in ('m','a','mac'): return 'general'
    return 'general'

# ---------- EC2 specs (DescribeInstanceTypes) ----------
def ec2_specs(region):
    ec2 = boto3.client('ec2', region_name=region)
    spec = {}
    for page in ec2.get_paginator('describe_instance_types').paginate():
        for v in page['InstanceTypes']:
            t = v['InstanceType']
            net = (v.get('NetworkInfo') or {}).get('NetworkPerformance', '—')
            arch = ','.join(a for a in (v.get('ProcessorInfo') or {}).get('SupportedArchitectures', []) if a != 'i386') or '—'
            if v.get('InstanceStorageSupported'):
                disks = (v.get('InstanceStorageInfo') or {}).get('Disks', [])
                sto = ' + '.join(f"{d.get('Count',1)}×{d.get('SizeInGB','?')} GB {d.get('Type','SSD').upper()}" for d in disks) or 'NVMe SSD'
            else:
                sto = 'EBS only'
            gi = v.get('GpuInfo')
            gpu = f"{round(gi['TotalGpuMemoryInMiB']/1024)} GB" if gi and gi.get('TotalGpuMemoryInMiB') else ''
            spec[t] = {
                'v': (v.get('VCpuInfo') or {}).get('DefaultVCpus'),
                'm': round((v.get('MemoryInfo') or {}).get('SizeInMiB', 0) / 1024, 2),
                'net': net, 'a': arch, 'sto': sto, 'gpu': gpu,
                'gen': 1 if v.get('CurrentGeneration') else 0,
            }
    return spec

# ---------- Price List (GetProducts) ----------
def od_price(pj):
    for off in pj.get('terms', {}).get('OnDemand', {}).values():
        for pd in off.get('priceDimensions', {}).values():
            usd = pd.get('pricePerUnit', {}).get('USD')
            try:
                f = float(usd)
                if f > 0:
                    return f
            except (TypeError, ValueError):
                pass
    return None

def price_map(pricing, service_code, region, extra_filters, type_field='instanceType'):
    """Devuelve {instanceType: precio_hora_USD} On-Demand para la región dada."""
    filters = [{'Type': 'TERM_MATCH', 'Field': 'regionCode', 'Value': region}] + extra_filters
    out = {}
    try:
        for page in pricing.get_paginator('get_products').paginate(
                ServiceCode=service_code, Filters=filters, FormatVersion='aws_v1'):
            for s in page['PriceList']:
                pj = json.loads(s)
                it = pj.get('product', {}).get('attributes', {}).get(type_field)
                if not it:
                    continue
                p = od_price(pj)
                if p is not None and (it not in out or p < out[it]):
                    out[it] = p
    except Exception as e:
        print(f"  [aviso] precios {service_code}: {e}", file=sys.stderr)
    if not out:
        print(f"  [aviso] {service_code}: 0 precios con los filtros {[(f['Field'], f['Value']) for f in extra_filters]}. "
              f"Valores publicados por AWS en {region}:", file=sys.stderr)
        try:
            seen = {}
            for page in pricing.get_paginator('get_products').paginate(
                    ServiceCode=service_code, Filters=filters[:1], FormatVersion='aws_v1'):
                for s in page['PriceList']:
                    attrs = json.loads(s).get('product', {}).get('attributes', {})
                    for f in extra_filters:
                        seen.setdefault(f['Field'], set()).add(attrs.get(f['Field']))
            for field, vals in seen.items():
                print(f"      {field}: {sorted(map(str, vals))}", file=sys.stderr)
        except Exception as e:
            print(f"      (no se pudo listar: {e})", file=sys.stderr)
    return out

# ---------- construcción por servicio ----------
def row(t, spec_base, price, extra=None):
    fam = fam_of(t); cat = cat_of(fam)
    s = spec_base or {}
    r = {'t': t, 'fam': fam, 'cat': cat,
         'v': s.get('v'), 'm': s.get('m'), 'net': s.get('net'), 'sto': (s.get('sto') or 'EBS only'),
         'a': s.get('a'), 'gpu': s.get('gpu', ''), 'gen': s.get('gen', 1),
         'hr': round(price, 4) if price else None,
         'mo': round(price * HRS, 2) if price else None}
    if extra:
        r.update(extra)
    return r

def build_ec2(spec, pricing, region):
    pm = price_map(pricing, 'AmazonEC2', region, [
        {'Type':'TERM_MATCH','Field':'operatingSystem','Value':'Linux'},
        {'Type':'TERM_MATCH','Field':'tenancy','Value':'Shared'},
        {'Type':'TERM_MATCH','Field':'preInstalledSw','Value':'NA'},
        {'Type':'TERM_MATCH','Field':'capacitystatus','Value':'Used'},
    ])
    return [row(t, spec[t], pm.get(t)) for t in sorted(spec)]

def build_managed(spec, pricing, region, service_code, extra_filters, prefix='', suffix='', cfg=None, add_family=False):
    """Deriva specs de la familia EC2 y toma precios reales del servicio gestionado."""
    pm = price_map(pricing, service_code, region, extra_filters)   # {db.m5.large: precio, ...}
    rows = []
    for it in sorted(pm):
        ec2_base = it[len(prefix):len(it)-len(suffix)] if (it.startswith(prefix) and it.endswith(suffix)) else it
        base = spec.get(ec2_base)
        extra = {}
        if prefix and not it.startswith(prefix):   # MQ publica m5.large sin el prefijo mq.
            it_name = prefix + it
        else:
            it_name = it
        if cfg: extra['cfg'] = cfg
        if add_family: extra['famlabel'] = CATLBL[cat_of(fam_of(it))]
        rows.append(row(it_name, base, pm[it], extra))
    return rows

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--region', default='us-east-1', help='Región AWS (regionCode), p.ej. us-east-1')
    ap.add_argument('--out', default='public/services.json')
    ap.add_argument('--rds-engine', default='PostgreSQL')
    ap.add_argument('--rds-deployment', default='Single-AZ')
    ap.add_argument('--cache-engine', default='Redis')
    ap.add_argument('--mq-engine', default='ActiveMQ')
    ap.add_argument('--mq-deployment', default='Single-AZ', help='Single-AZ | Multi-AZ (valores de la Price List)')
    args = ap.parse_args()

    print(f"[1/3] EC2 DescribeInstanceTypes ({args.region})…")
    spec = ec2_specs(args.region)
    print(f"      {len(spec)} tipos EC2")

    pricing = boto3.client('pricing', region_name='us-east-1')  # endpoint de Pricing

    print("[2/3] Precios On-Demand por servicio (Price List)…")
    services = [
        {'id':'ec2','name':'Amazon EC2','cols':['t','v','m','sto','net','a','gpu','hr','mo'],
         'instances': build_ec2(spec, pricing, args.region)},
        {'id':'rds','name':'Amazon RDS','cols':['t','v','m','cfg','net','hr','mo'],
         'instances': build_managed(spec, pricing, args.region, 'AmazonRDS',
            [{'Type':'TERM_MATCH','Field':'databaseEngine','Value':args.rds_engine},
             {'Type':'TERM_MATCH','Field':'deploymentOption','Value':args.rds_deployment}],
            prefix='db.', cfg=f'{args.rds_engine} · {args.rds_deployment}')},
        {'id':'elasticache','name':'Amazon ElastiCache','cols':['t','v','m','cfg','net','hr','mo'],
         'instances': build_managed(spec, pricing, args.region, 'AmazonElastiCache',
            [{'Type':'TERM_MATCH','Field':'cacheEngine','Value':args.cache_engine}],
            prefix='cache.', cfg=args.cache_engine)},
        {'id':'opensearch','name':'Amazon OpenSearch Service','cols':['t','famlabel','v','m','sto','hr','mo'],
         'instances': build_managed(spec, pricing, args.region, 'AmazonES', [],
            suffix='.search', add_family=True)},
        {'id':'redshift','name':'Amazon Redshift','cols':['t','famlabel','v','m','sto','hr','mo'],
         'instances': build_managed(spec, pricing, args.region, 'AmazonRedshift', [], add_family=True)},
        {'id':'mq','name':'Amazon MQ','cols':['t','v','m','cfg','net','hr','mo'],
         'instances': build_managed(spec, pricing, args.region, 'AmazonMQ',
            [{'Type':'TERM_MATCH','Field':'brokerEngine','Value':args.mq_engine},
             {'Type':'TERM_MATCH','Field':'deploymentOption','Value':args.mq_deployment}],
            prefix='mq.', cfg=f'{args.mq_engine} · {args.mq_deployment}')},
    ]

    out = {'source': f'AWS APIs en vivo · región {args.region}', 'region': args.region,
           'catlabels': CATLBL, 'services': services}
    with open(args.out, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))

    print("[3/3] Resumen:")
    for s in services:
        with_price = sum(1 for d in s['instances'] if d['hr'] is not None)
        print(f"      {s['id']:12} {len(s['instances']):>5} tipos · {with_price} con precio")
    print(f"Escrito {args.out}. Pégalo en la página: reemplaza el contenido de <script id=\"svc-data\">.")

if __name__ == '__main__':
    main()
