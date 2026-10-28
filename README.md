# Instance Explorer — API Inventory and Catalog Generator

Tools to populate the **Instance Explorer** platform with **real specifications and prices**
(hourly and monthly) for 6 services: **EC2, RDS, ElastiCache, OpenSearch, Redshift and MQ**.

- `scripts/generate_catalog.py` — generates `services.json` by calling the AWS APIs with **boto3**.
- This README documents, as an **inventory**, which API each service uses for *specifications* and for *pricing*.

---

## 1. Getting started

```bash
# Create and activate the virtual environment (one time only)
python3 -m venv .venv
source .venv/bin/activate        # Windows (PowerShell): .venv\Scripts\Activate.ps1

pip install boto3
export AWS_ACCESS_KEY_ID=        # or use a profile / SSO
export AWS_SECRET_ACCESS_KEY=
python3 scripts/generate_catalog.py --region us-east-1   # (from the project root) writes public/services.json
```

The web app is built with **React + Vite + Tailwind CSS v4** and reads `public/services.json`:

```bash
npm install
npm run dev       # development
npm run build     # production build into dist/
```

(The previous plain HTML/JS version is kept in `legacy/`.)

Monthly prices are computed as **hourly × 730**. The **Pricing API** (`pricing:GetProducts`) only
responds on the **us-east-1** and **ap-south-1** endpoints, but the `regionCode` filter lets you request
prices for **any** commercial region.

---

## 2. API inventory by service

| Service | **Specifications** API | **Pricing** serviceCode (Price List) | Key price filters | Data type |
|---|---|---|---|---|
| **EC2** | `ec2:DescribeInstanceTypes` | `AmazonEC2` | `operatingSystem=Linux`, `tenancy=Shared`, `preInstalledSw=NA`, `capacitystatus=Used`, `regionCode` | vCPU, memory, network, storage, GPU, arch |
| **RDS** | `rds:DescribeOrderableDBInstanceOptions` (classes) + specs via EC2 | `AmazonRDS` | `databaseEngine`, `deploymentOption`, `regionCode` | `db.*` class |
| **ElastiCache** | `elasticache:DescribeReservedCacheNodesOfferings` / `DescribeCacheEngineVersions` + specs via EC2 | `AmazonElastiCache` | `cacheEngine`, `regionCode` | `cache.*` node |
| **OpenSearch** | `opensearch:ListInstanceTypeDetails` + specs via EC2 | `AmazonES` | `regionCode` | `*.search` |
| **Redshift** | `redshift:DescribeOrderableClusterOptions` / `DescribeNodeConfigurationOptions` | `AmazonRedshift` | `regionCode` | `dc2/ra3/rg` node |
| **Amazon MQ** | `mq:DescribeBrokerInstanceOptions` | `AmazonMQ` | `brokerEngine`, `deploymentOption`, `regionCode` | `mq.*` |

> **Note on specifications:** only EC2 exposes vCPU/memory/network/etc. directly
> (`DescribeInstanceTypes`). RDS, ElastiCache, OpenSearch and MQ do **not** return those specs in their APIs;
> the generator **reuses them from the equivalent EC2 family** (`db.m6i.large` → `m6i.large`), which is the
> same hardware class. Redshift has its own nodes (fixed specs).

### Pricing — two Price List variants

| Variant | Access | Use in the generator |
|---|---|---|
| **Price List Query API** (`pricing:GetProducts`, `DescribeServices`, `GetAttributeValues`) | IAM credentials; us-east-1 / ap-south-1 endpoints | ✅ The one used by `scripts/generate_catalog.py` |
| **Price List Bulk API** (JSON/CSV files at `pricing.<region>.amazonaws.com`) | **Public, no credentials** | Alternative for offline bulk downloads |

---

## 3. Required IAM permissions (read-only)

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

## 4. Generator parameters

| Flag | Default | Purpose |
|---|---|---|
| `--region` | `us-east-1` | Region (regionCode) whose prices are queried |
| `--out` | `public/services.json` | Output file (path relative to where you run the script; run it from the project root) |
| `--rds-engine` / `--rds-deployment` | `PostgreSQL` / `Single-AZ` | RDS pricing by engine + deployment |
| `--cache-engine` | `Redis` | ElastiCache engine |
| `--mq-engine` / `--mq-deployment` | `ActiveMQ` / `Single-AZ` (or `Multi-AZ`) | MQ engine and deployment |

RDS, ElastiCache and MQ pricing **depends on the engine and deployment**: change these flags to
get, for example, RDS MySQL Multi-AZ or MQ RabbitMQ in a cluster.

---

## 5. Official links (API Reference) and endpoints

### Specifications — by service
| Service | API | Documentation |
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

### Pricing — AWS Price List
| Resource | URL |
|---|---|
| `GetProducts` (Query API) | https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_pricing_GetProducts.html |
| `DescribeServices` | https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_pricing_DescribeServices.html |
| `GetAttributeValues` | https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_pricing_GetAttributeValues.html |
| Price List API guide | https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/price-changes.html |
| **Query endpoint** (us-east-1) | https://api.pricing.us-east-1.amazonaws.com |
| **Query endpoint** (ap-south-1) | https://api.pricing.ap-south-1.amazonaws.com |
| **Bulk API** — offer index (public) | https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/index.json |
| **Bulk API** — EC2 index (public) | https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/index.json |

### SDK / boto3 reference
| Client | Documentation |
|---|---|
| `boto3` EC2 `describe_instance_types` | https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/ec2/client/describe_instance_types.html |
| `boto3` Pricing `get_products` | https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/pricing/client/get_products.html |
| AWS regions and endpoints | https://docs.aws.amazon.com/general/latest/gr/rande.html |

> The **Query** endpoints (`api.pricing.*`) require SigV4 signing (IAM credentials). The **Bulk API** ones
> (`pricing.us-east-1.amazonaws.com/offers/...`) are **public** static files, no credentials needed.
