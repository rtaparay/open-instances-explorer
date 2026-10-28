# Instance Explorer — Inventario de APIs y generador de catálogo

Herramientas para poblar la plataforma **Instance Explorer** con **especificaciones y precios reales**
(hora y mes) de los 6 servicios: **EC2, RDS, ElastiCache, OpenSearch, Redshift y MQ**.

- `scripts/generate_catalog.py` — genera `services.json` llamando a las APIs de AWS con **boto3**.
- Este README documenta, como **inventario**, qué API usa cada servicio para *especificaciones* y para *precios*.

---

## 1. Puesta en marcha

```bash
# Crear y activar el entorno virtual (una sola vez)
python3 -m venv .venv
source .venv/bin/activate        # Windows (PowerShell): .venv\Scripts\Activate.ps1

pip install boto3
export AWS_ACCESS_KEY_ID=        # o usa un perfil / SSO
export AWS_SECRET_ACCESS_KEY=
python3 scripts/generate_catalog.py --region us-east-1   # (desde la raíz) escribe public/services.json
```

La web es una app **React + Vite + Tailwind CSS v4** que lee `public/services.json`:

```bash
npm install
npm run dev       # desarrollo
npm run build     # producción en dist/
```

(La versión anterior en HTML/JS plano quedó en `legacy/`.)

Monthly se calcula como **hora × 730**. La **Pricing API** (`pricing:GetProducts`) solo responde en
los endpoints **us-east-1** y **ap-south-1**, pero el campo `regionCode` del filtro permite pedir
precios de **cualquier** región comercial.

---

## 2. Inventario de APIs por servicio

| Servicio | API de **especificaciones** | serviceCode de **precios** (Price List) | Filtros clave de precio | Tipo de dato |
|---|---|---|---|---|
| **EC2** | `ec2:DescribeInstanceTypes` | `AmazonEC2` | `operatingSystem=Linux`, `tenancy=Shared`, `preInstalledSw=NA`, `capacitystatus=Used`, `regionCode` | vCPU, mem, red, almacenamiento, GPU, arch |
| **RDS** | `rds:DescribeOrderableDBInstanceOptions` (clases) + specs vía EC2 | `AmazonRDS` | `databaseEngine`, `deploymentOption`, `regionCode` | clase `db.*` |
| **ElastiCache** | `elasticache:DescribeReservedCacheNodesOfferings` / `DescribeCacheEngineVersions` + specs vía EC2 | `AmazonElastiCache` | `cacheEngine`, `regionCode` | nodo `cache.*` |
| **OpenSearch** | `opensearch:ListInstanceTypeDetails` + specs vía EC2 | `AmazonES` | `regionCode` | `*.search` |
| **Redshift** | `redshift:DescribeOrderableClusterOptions` / `DescribeNodeConfigurationOptions` | `AmazonRedshift` | `regionCode` | nodo `dc2/ra3/rg` |
| **Amazon MQ** | `mq:DescribeBrokerInstanceOptions` | `AmazonMQ` | `brokerEngine`, `deploymentOption`, `regionCode` | `mq.*` |

> **Nota de especificaciones:** solo EC2 expone vCPU/memoria/red/etc. de forma directa
> (`DescribeInstanceTypes`). RDS, ElastiCache, OpenSearch y MQ **no** devuelven esas specs en su API;
> el generador las **reutiliza de la familia EC2 equivalente** (`db.m6i.large` → `m6i.large`), que es la
> misma clase de hardware. Redshift tiene nodos propios (specs fijas).

### Precios — dos variantes del Price List

| Variante | Acceso | Uso en el generador |
|---|---|---|
| **Price List Query API** (`pricing:GetProducts`, `DescribeServices`, `GetAttributeValues`) | Credenciales IAM; endpoints us-east-1 / ap-south-1 | ✅ La que usa `scripts/generate_catalog.py` |
| **Price List Bulk API** (archivos JSON/CSV en `pricing.<region>.amazonaws.com`) | **Pública, sin credenciales** | Alternativa para descargas masivas offline |

---

## 3. Permisos IAM necesarios (solo lectura)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": [
        "ec2:DescribeInstanceTypes",
        "ec2:DescribeInstanceTypeOfferings",
        "rds:DescribeOrderableDBInstanceOptions",
        "elasticache:DescribeCacheEngineVersions",
        "elasticache:DescribeReservedCacheNodesOfferings",
        "es:ListInstanceTypeDetails",
        "redshift:DescribeOrderableClusterOptions",
        "redshift:DescribeNodeConfigurationOptions",
        "mq:DescribeBrokerInstanceOptions",
        "pricing:GetProducts",
        "pricing:DescribeServices",
        "pricing:GetAttributeValues"
      ], "Resource": "*" }
  ]
}
```

---

## 4. Parámetros del generador

| Flag | Por defecto | Para qué |
|---|---|---|
| `--region` | `us-east-1` | Región (regionCode) cuyos precios se consultan |
| `--out` | `public/services.json` | Archivo de salida (ruta relativa a donde ejecutas el script; ejecútalo desde la raíz del proyecto) |
| `--rds-engine` / `--rds-deployment` | `PostgreSQL` / `Single-AZ` | RDS tarifa por motor + despliegue |
| `--cache-engine` | `Redis` | Motor de ElastiCache |
| `--mq-engine` / `--mq-deployment` | `ActiveMQ` / `Single-AZ` (o `Multi-AZ`) | Motor y despliegue de MQ |

El precio de RDS, ElastiCache y MQ **depende del motor y del despliegue**: cambia esos flags para
obtener, por ejemplo, RDS MySQL Multi-AZ o MQ RabbitMQ en clúster.

---

## 5. Enlaces oficiales (API Reference) y endpoints

### Especificaciones — por servicio
| Servicio | API | Documentación |
|---|---|---|
| EC2 | `DescribeInstanceTypes` | https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_DescribeInstanceTypes.html |
| EC2 | `DescribeInstanceTypeOfferings` | https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_DescribeInstanceTypeOfferings.html |
| RDS | `DescribeOrderableDBInstanceOptions` | https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_DescribeOrderableDBInstanceOptions.html |
| ElastiCache | `DescribeCacheEngineVersions` | https://docs.aws.amazon.com/AmazonElastiCache/latest/APIReference/API_DescribeCacheEngineVersions.html |
| ElastiCache | `DescribeReservedCacheNodesOfferings` | https://docs.aws.amazon.com/AmazonElastiCache/latest/APIReference/API_DescribeReservedCacheNodesOfferings.html |
| OpenSearch | `ListInstanceTypeDetails` | https://docs.aws.amazon.com/opensearch-service/latest/APIReference/API_ListInstanceTypeDetails.html |
| Redshift | `DescribeOrderableClusterOptions` | https://docs.aws.amazon.com/redshift/latest/APIReference/API_DescribeOrderableClusterOptions.html |
| Redshift | `DescribeNodeConfigurationOptions` | https://docs.aws.amazon.com/redshift/latest/APIReference/API_DescribeNodeConfigurationOptions.html |
| Amazon MQ | `DescribeBrokerInstanceOptions` | https://docs.aws.amazon.com/amazon-mq/latest/api-reference/brokers-instance-options.html |

### Precios — AWS Price List
| Recurso | URL |
|---|---|
| `GetProducts` (Query API) | https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_pricing_GetProducts.html |
| `DescribeServices` | https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_pricing_DescribeServices.html |
| `GetAttributeValues` | https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_pricing_GetAttributeValues.html |
| Guía Price List API | https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/price-changes.html |
| **Endpoint** Query (us-east-1) | https://api.pricing.us-east-1.amazonaws.com |
| **Endpoint** Query (ap-south-1) | https://api.pricing.ap-south-1.amazonaws.com |
| **Bulk API** — índice de ofertas (público) | https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/index.json |
| **Bulk API** — índice EC2 (público) | https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/index.json |

### SDK / referencia boto3
| Cliente | Documentación |
|---|---|
| `boto3` EC2 `describe_instance_types` | https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/ec2/client/describe_instance_types.html |
| `boto3` Pricing `get_products` | https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/pricing/client/get_products.html |
| Regiones y endpoints de AWS | https://docs.aws.amazon.com/general/latest/gr/rande.html |

> Los endpoints **Query** (`api.pricing.*`) requieren firma SigV4 (credenciales IAM). Los de la **Bulk API**
> (`pricing.us-east-1.amazonaws.com/offers/...`) son archivos estáticos **públicos**, sin credenciales.
