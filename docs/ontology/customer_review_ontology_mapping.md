# Customer Credit Review Ontology: Attribute Instantiation and SQL/API Correspondence

## 1. Document Purpose / Purpose

This document instantiates the entities and properties in `customer_review_ontology.yaml` against database objects, query SQL, and APIs that can currently be verified.

This document maps the entities and properties in `customer_review_ontology.yaml` to database objects, replayable SQL, and APIs that were identifiable during the source review.

### Status Definition / Status

- **Found / Found**: A definite object, field, or API is available; runtime verification can continue.
- **Partial / Partial**: The concept or interface exists, but its grain, field contract, production implementation, or business definition still needs verification.
- **Not found / Not found**: No confirmable object/API was found in the sources reviewed this round; it must not be completed by guesswork.
- **External / External**: Requires NACM, D&B, NexChat/AI, customer-uploaded files, or another external system.

### Important Boundaries / Important boundary

- No specific customer business data was read this round, so this document is a **mapping and query plan**, not the current customer review result.
- Vertica is preferred for analytics; CIS Sybase is the transaction source. Their fields and update times must not be assumed to be equivalent.
- `customer_credit` has a composite grain and cannot be treated as one row by `cust_no` alone.
- Any `PUT/POST/DELETE` write API is recorded only for system correspondence and is not recommended for analysis tasks.

## 2. Executive Summary / Executive summary

### Found / Found

1. **Customer identity, credit limit, AR, pending, past due, terms, review date, and restriction status** are available in Vertica published tables and customer-service APIs.
2. **Customer360, financial-master relationship roll-up, and score refresh** have API/KB mappings, but some Customer360 query field contracts have not yet been fully verified.
3. **Financial relationships** can be retrieved through the `FINAN_SUB` relationship in `cust_xref` and `/api/customer/{custNo}/relationship/{relationshipType}`; `MASTER_SUB` and `GLOBAL_SUB` cannot substitute for `FINAN_SUB`.
4. **Security/collateral** has a `cust_security` table and a source description in customer-service credit-profile.
5. **Financial statement file metadata** has a read-only attachment API; structured statements, AI parsing, and approval data remain proposed/unverified.

### Not Found or Requiring External Acquisition / Not found or external

1. The complete monthly bucket table/fields for `ARAgingSnapshot`, authoritative calculation SQL for `ADPDBTProfile`, the 90-day peak balance, and purchase-trend sources were not fully verified this round.
2. Net leverage, Altman Z, EBITDA/gross margin, current ratio, interest coverage, and similar `FinancialProfile` metrics cannot be obtained directly from the currently verified Vertica structures.
3. Third-party data such as D&B, Capital IQ, and S&P requires an external vendor or a deployed external feed; it should not be inferred from NACM tables.
4. No complete canonical review-case storage or read/write API has yet been found for the ontology's `AIReview`, `ReviewRuleResult`, `ReviewHistoryEntry`, `CreditDecision`, and `AnalystAction` entities.
5. The database tables and formal APIs for structured financial-statement storage, AI parsing, and draft/approval/rejection have not yet been verified against the API KB.

## 3. Found Ontology Instances / Found ontology instances

### 3.1 CustomerReview and CustomerAccount

| Ontology property | Identified source | Instantiated field/API | Status and notes |
|---|---|---|---|
| `CustomerReview.customer_id` | Vertica / customer-service | `dim_us.dim_pub_customer_info.cust_no`; `GET /api/customer/{custNo}` | Found; the review case itself still has no canonical table |
| `CustomerReview.current_region` | Vertica | `dim_us.dim_pub_customer_info.region`, `company_code`, `company_no` | Partial; region is a warehouse code, and the US/CA mapping requires a business dictionary |
| `CustomerReview.currency` | Vertica / customer credit | `dim_us.dim_pub_customer_info.currency`, `dim_us.dim_pub_customer_credit_info.terms`; API `localCurrency/custCurrency` | Partial; local, customer, and trade currency must be distinguished |
| `CustomerReview.next_review_date` | Vertica / API | `dim_us.dim_pub_customer_info.next_review`; `PUT /api/customer/nextReview` | Found |
| `CustomerReview.current_reviewer` | Vertica / API | `reviewer`, `credit_analyst_name`, `collector_name` | Found; reviewer, collector, and credit analyst are different roles |
| `CustomerReview.source_system` | Vertica | `data_source`, `credit_data_source` | Found |
| `CustomerAccount.customer_id` | Vertica / CIS | `cust_no` | Found; the primary-key semantics are clearest here |
| `CustomerAccount.customer_name` | Vertica / CIS | `cust_name`; `customer_header.cust_name` | Found |
| `CustomerAccount.legal_name` | Vertica | `finance_cust_name` can be used as a candidate | Partial; it cannot be directly equated with legal name |
| `CustomerAccount.territory` | Vertica / API | `sales_terr`, `sales_terr_name` | Found |
| `CustomerAccount.business_segment` | Vertica | `sales_segment`, `division_desc`, `cust_seg_id` | Partial; an authoritative business field must be selected |
| `CustomerAccount.account_type` | Vertica / CIS | `cust_acct_type`, `cust_type_descr` | Partial; the ontology enum requires code-table mapping |
| `CustomerAccount.terms` | Vertica / CIS | `default_terms`, `terms`, `terms_desc`, `terms_days` | Found |
| `CustomerAccount.company_number` | Vertica / CIS | `company_no`, `company_code` | Found |
| `CustomerAccount.region` | Vertica | `region` | Partial; the code meaning requires a business dictionary |
| `CustomerAccount.currency` | Vertica | `currency`, `currency_profile` | Found |
| `CustomerAccount.purchase_since` | Vertica / CIS | `customer_entry_datetime` or `customer_credit.sold_since` | Partial; the definitions of purchase since and account entry must be clarified |
| `CustomerAccount.pe_owned` | — | — | Not found |
| `CustomerAccount.ciq_rating` | — | — | External; no Capital IQ API/feed was found this round |

### 3.2 CreditDecision, ExposureProfile, and ARBalance

| Ontology property | Identified source | Instantiated field/API | Status and notes |
|---|---|---|---|
| `current_credit_limit` | Vertica / API | `credit_limit`; `GET /api/customers/{custNos}/creditInfo` | Found |
| `proposed_credit_limit` | — | — | Not found; usually belongs to the review case or user input |
| `recommended_credit_limit` | — | — | Not found; requires a rules engine or canonical AI review output |
| `max_suggested_limit` | — | — | Not found |
| `recommended_terms` | API / CIS | The read API can return terms; the recommended value has no independent source | Partial |
| `total_exposure` | Derived | `curr_bal + pending_amt` | Found; the account or financial-group grain must be declared |
| `utilization_of_limit` | Derived | `(curr_bal + pending_amt) / credit_limit` | Found; cannot be calculated when the denominator is 0 or NULL |
| `peak_balance_90d` | — | — | Not found; requires an order/AR time-series source |
| `peak_balance_date` | — | — | Not found |
| `trailing_twelve_month_purchases` | — | — | Not found; requires a sales/order warehouse |
| `monthly_average_purchases` | — | — | Not found |
| `purchases_yoy` | — | — | Not found |
| `implied_cycle_exposure` | Derived | `monthly_average_purchases * terms_days / 30` | The formula is defined in the ontology, but the input average purchases value was not found |
| `ar_balance` | Vertica / CIS / API | `curr_bal`; `GET /api/customers/{custNos}/creditInfo` | Found |
| `past_due_amount` | Vertica / CIS / API | `past_due_amt`; `GET /api/customer/credit/pastdue` | Found |
| `past_due_percentage` | Derived | `past_due_amt / curr_bal` | Formula found; the distinction between NULL and 0 must be preserved |
| `aging_as_of` | Vertica | `past_due_date` / `etl_timestamp` are candidate dates | Partial; this is not a complete aging snapshot as-of date |
| `pending_amount` | Vertica / CIS / API | `pending_amt`; `GET /api/customer/credit/pendingAmt/custNos` | Found |
| `terms` | Vertica / API | `terms`, `terms_desc`, `terms_days` | Found |
| `limit_change_percent` | Derived | `(proposed - current) / current` | Formula found; the proposed value was not found |
| `limit_hold`, `recommendation`, `recommendation_tone` | — | — | No canonical decision table/API found |

### 3.3 FinancialRelationship

| Ontology property | Identified source | Instantiated field/API | Status and notes |
|---|---|---|---|
| `financial_master_id` | Vertica / API | `mcust_no`, `finance_master`; relationship tree API | Found candidate; `mcust_no` and `FINAN_SUB.xref_no` must be distinguished |
| `parent_customer_id` | CIS | `cust_xref.xref_no` where `xref_type='FINAN_SUB'` | Found |
| `subsidiary_customer_id` | CIS | `cust_xref.cust_no` | Found |
| `relationship_type` | CIS / API | `cust_xref.xref_type`; `/relationship/{relationshipType}` | Found; `FINAN_SUB`, `MASTER_SUB`, and `GLOBAL_SUB` have different semantics |
| `sharing` | Vertica / API | `share_credit_limit_flag`, `is_share_credit_limit` | Found candidate; actual business values need confirmation |
| `restricted` / `discontinued` | Vertica / CIS | `is_restricted`, `is_discontinued`; `customer_header.restricted/discontinued` | Found |
| `own_credit_limit`, `rolled_up_credit_limit` | Vertica / API | `credit_limit`, `mcust_credit_limit`; relationship tree/payment credit APIs | Found candidate; do not add duplicate group totals again |
| `ar_balance`, `pending_amount`, `past_due_amount` | Vertica / API | credit snapshot fields | Found; the account/group grain must be labeled |
| `max_past_due_days` | — | — | Not found; requires aging bucket details or invoice-level AR |
| `region`, `currency` | Vertica | `region`, `currency` | Found |

### 3.4 ADPDBTProfile, RiskAssessment, and FinancialProfile

| Ontology property | Identified source | Instantiated field/API | Status and notes |
|---|---|---|---|
| `risk_number`, `internal_risk_score`, `weighted_score` | Customer score KB / C360 API | `customer_score`/classification fields are described, but exact current warehouse columns not verified | Partial |
| `risk_band`, `trend` | Customer score KB | customer score classification / trend concepts | Partial; enum mapping has not been verified |
| `factor_scores.adp_w` | — | — | Not found; no authoritative field or formula found |
| `factor_scores.security` | CIS | `cust_security.sec_type`, `sec_amt`, active dates | Partial; scoring rules were not found |
| `adp_w`, `dbt_w`, `weighted_terms` | — | — | Not found; requires an approved payment-behavior calculation |
| `ytd_adp`, `prior_year_adp` | — | — | Not found |
| `open_invoices_over_39_days` | — | — | Not found; requires an open invoice/aging source |
| `nsf_count_90d`, `chargeback_count_90d` | — | — | Not found; requires a payment/AR event source |
| `invoice_type_50_status` | — | — | Not found |
| `net_leverage`, `net_debt_to_ebitda`, `altman_z_score` | — | — | Not found; no canonical financial-statement ratio source |
| `ebitda_margin`, `gross_margin`, `current_ratio`, `interest_coverage` | — | — | Not found |
| `revenue`, `revenue_growth` | Customer360 / score KB | revenue fields are described in `customer_360_view`, exact Vertica object not verified here | Partial |
| `frisk_score` | Customer score KB | finance-risk score feed is documented, exact live structure not verified | Partial |
| `security_type`, `collateral_percentage` | CIS | `cust_security.sec_type`, `sec_amt` | Partial; the collateral-percentage formula was not found |

### 3.5 ExternalCreditProfile and ExternalTradeLine

| Ontology property | Identified source | Instantiated field/API | Status and notes |
|---|---|---|---|
| NACM aging/score concepts | Vertica catalog / CIS | `dim_us.dim_customer_nacm_cms_aging`; `nacm_raw` | Partial; fields and the latest partition require verification |
| NACM profile API | CAC API | `POST /api/customer/nacm/nacmDetail/excel/queryForm` | API entry found; the Excel query contract requires further reading |
| `nacm_risk_score`, `nacm_dbt`, `nacm_tradeline_count` | — | — | Concepts partially found; concrete fields have not been verified |
| `nacm_aging_distribution` | — | — | No complete queryable bucket mapping found |
| D&B rating/Paydex/delinquency/failure/high credit | — | — | External; no verifiable D&B API was found this round |
| `derogatory_remarks`, `establishment_info`, `payment_trend` | — | — | External raw report/parsed results; should not be inferred directly from the raw text payload in `nacm_raw.data` |
| `ExternalTradeLine.*` | — | — | External; no canonical trade-line table/API found |

### 3.6 FinancialStatement and ReviewDocument

| Ontology property | Identified source | Instantiated field/API | Status and notes |
|---|---|---|---|
| `ReviewDocument.document_id`, `file_name`, `uploaded_at`, `document_status` | customer-service | `customer_attach`; `GET /api/customer/{customerNo}/files?templateType=FINANCIAL_STATEMENT` | Attachment metadata read path found |
| `storage_key` | — | attachment storage implementation | Not found; do not guess the object-storage path |
| `FinancialStatement.statement_id`, period, line items | — | — | No canonical structured statement schema found |
| `fiscal_year`, `period`, `period_end`, currency, source | Proposal/KB | proposed query contract includes customer, statement type, fiscal year, fiscal period | Partial; this is not a deployed fact |
| `auditor`, `auditor_opinion`, statement status | — | — | Not found |
| AI parse draft/review values | Proposal/KB | NexChat/AI + CAC workflow | External/unverified |

### 3.7 CustomerReview Workflow Entities

| Entity | Identified correspondence | Status |
|---|---|---|
| `AIReview` | Customer score/C360 has score and AI credit-profile consumption; no review-case result table found | Partial |
| `ReviewRuleResult` | order-review-service has order credit-rule APIs, but not customer-review R1–R6 result storage | Partial; the order rule cannot be reused directly |
| `ReviewHistoryEntry` | `crdt_change_log`, `cust_change_log` provide credit/customer change events | Partial; this is not a complete review history |
| `CreditDecision` | customer credit update API exists, but the proposed/recommended decision object was not found | Partial |
| `AnalystAction` | credit update, next-review update, file read, and order-review APIs exist | Partial; action audit/case binding was not found |

## 4. Replayable SQL / Replayable SQL

The SQL below is read-only and parameterized by customer, making it suitable for initial structure/grain validation. Before execution, still call `get_table_structure` and confirm the region, snapshot time, and field semantics.

### 4.1 Vertica: Customer Identity + Current Credit Snapshot

```sql
SELECT
    ci.cust_no,
    ci.cust_name,
    ci.mcust_no,
    ci.mcust_name,
    ci.is_restricted,
    ci.is_discontinued,
    ci.sales_terr,
    ci.sales_terr_name,
    ci.sales_segment,
    ci.division_desc,
    ci.default_terms,
    ci.currency,
    ci.region,
    ci.next_review,
    ci.credit_analyst_name,
    ci.credit_analyst_manager_name,
    ci.customer_delete_datetime,
    ci.etl_timestamp AS customer_etl_timestamp,
    cc.credit_limit,
    cc.mcust_credit_limit,
    cc.terms,
    cc.terms_desc,
    cc.terms_days,
    cc.curr_bal,
    cc.curr_pymts,
    cc.pending_amt,
    cc.past_due_amt,
    cc.last_pay_date,
    cc.last_purchase,
    cc.past_due_date,
    cc.share_credit_limit_flag,
    cc.bill_to_addr,
    cc.sequence_no,
    cc.etl_timestamp AS credit_etl_timestamp
FROM dim_us.dim_pub_customer_info AS ci
JOIN dim_us.dim_pub_customer_credit_info AS cc
  ON ci.cust_no = cc.cust_no
WHERE ci.cust_no = :cust_no
  AND ci.customer_delete_datetime IS NULL
  AND ci.is_discontinued = 'N';
```

### 4.2 Vertica: Aggregate Composite Credit Grain by Customer

`dim_pub_customer_credit_info` contains a grain related to `cust_no + terms + bill_to_addr + sequence_no`; aggregate only when an account total is needed.

```sql
SELECT
    cust_no,
    SUM(credit_limit) AS credit_limit_account_total,
    SUM(curr_bal) AS ar_balance_account_total,
    SUM(pending_amt) AS pending_account_total,
    SUM(past_due_amt) AS past_due_account_total,
    MAX(last_pay_date) AS last_pay_date,
    MAX(last_purchase) AS last_purchase,
    MAX(etl_timestamp) AS max_credit_etl_timestamp
FROM dim_us.dim_pub_customer_credit_info
WHERE cust_no = :cust_no
GROUP BY cust_no;
```

### 4.3 Derived Metrics: Exposure, Utilization, and Past-Due Percentage

```sql
WITH account_credit AS (
    SELECT
        cust_no,
        SUM(credit_limit) AS credit_limit,
        SUM(curr_bal) AS ar_balance,
        SUM(pending_amt) AS pending_amount,
        SUM(past_due_amt) AS past_due_amount
    FROM dim_us.dim_pub_customer_credit_info
    WHERE cust_no = :cust_no
    GROUP BY cust_no
)
SELECT
    cust_no,
    credit_limit,
    ar_balance,
    pending_amount,
    past_due_amount,
    ar_balance + pending_amount AS total_exposure,
    CASE
        WHEN credit_limit IS NULL OR credit_limit = 0 THEN NULL
        ELSE (ar_balance + pending_amount) / credit_limit
    END AS utilization_of_limit,
    CASE
        WHEN ar_balance IS NULL OR ar_balance = 0 THEN NULL
        ELSE past_due_amount / ar_balance
    END AS past_due_percentage
FROM account_credit;
```

### 4.4 Vertica: Duplication/Grain Check for Identity and Credit Data

```sql
SELECT
    cust_no,
    COUNT(*) AS credit_rows,
    COUNT(DISTINCT terms) AS term_count,
    COUNT(DISTINCT bill_to_addr) AS bill_to_count,
    COUNT(DISTINCT sequence_no) AS sequence_count
FROM dim_us.dim_pub_customer_credit_info
WHERE cust_no = :cust_no
GROUP BY cust_no;
```

### 4.5 Sybase CIS: Transaction-Source Customer + Composite Credit Grain

```sql
SELECT
    ch.cust_no,
    ch.cust_name,
    ch.default_terms,
    ch.restricted,
    ch.discontinued,
    ch.reviewer,
    ch.cred_analyst,
    ch.last_review,
    ch.next_review,
    cc.terms,
    cc.bill_to_addr,
    cc.sequence_no,
    cc.credit_limit,
    cc.curr_bal,
    cc.curr_pymts,
    cc.pending_amt,
    cc.past_due_amt,
    cc.last_pay_date,
    cc.last_purchase,
    cc.past_due_date,
    cc.delete_datetime
FROM CIS.dbo.customer_header AS ch
JOIN CIS.dbo.customer_credit AS cc
  ON ch.cust_no = cc.cust_no
WHERE ch.cust_no = :cust_no
  AND ch.delete_datetime IS NULL
  AND cc.delete_datetime IS NULL;
```

### 4.6 Sybase CIS: Financial Relationship

```sql
SELECT
    x.cust_no AS subsidiary_customer_id,
    x.xref_no AS financial_master_id,
    x.xref_type,
    x.active,
    x.entry_datetime,
    x.update_datetime
FROM CIS.dbo.cust_xref AS x
WHERE x.cust_no = :cust_no
  AND x.xref_type = 'FINAN_SUB'
  AND x.active = 'Y'
  AND x.xref_no IS NOT NULL;
```

### 4.7 Sybase CIS: Security/Collateral

```sql
SELECT
    cust_no,
    line_no,
    sec_type,
    sec_amt,
    begin_date,
    end_date,
    discharge_date,
    delete_date
FROM CIS.dbo.cust_security
WHERE cust_no = :cust_no
  AND delete_date IS NULL;
```

### 4.8 SQL Not to Use Directly

- Do not use `SELECT *` to query `contacts`, `customer_bank_info`, `gm_cust_notes`, or `nacm_raw`.
- Do not sum the duplicate financial-group total in `customer_360_view` by member.
- Do not treat `MASTER_SUB` or `GLOBAL_SUB` as `FINAN_SUB`.
- Do not put the raw text payload from `nacm_raw.data` into the review document.
- Do not derive risk bands from the flag columns in `cust_score` before their semantics are verified.

## 5. API Correspondence / API mapping

### 5.1 Read-Only APIs: Prioritize for Review Reads

| Purpose | API | Ontology correspondence |
|---|---|---|
| Full customer details | `GET /api/customer/{custNo}` | `CustomerAccount`, `CustomerReview` identity |
| Batch credit information | `POST /api/customers/creditInfo/queryForm`, with a customer number array in the body | `CreditDecision` current limit, `ARBalance`, exposure inputs |
| Single-customer credit profile | `GET /api/customers/{custNo}/credit-profile` | `RiskAssessment`, financial group, security, AR/credit profile |
| Relationship tree | `GET /api/customer/{custNo}/relationship/{relationshipType}` | `FinancialRelationship` |
| C360 read | `POST /api/customer/360View/queryForm` | `ExposureProfile`, AR aging, score, collection; detailed contract not fully verified |
| C360 consolidated read | `POST /api/customer/360View/consolidate/queryForm` | financial-master roll-up; detailed contract not fully verified |
| Past-due query | `GET /api/customer/credit/pastdue` | `ARBalance.past_due_amount` |
| Pending customer batch | `GET /api/customer/credit/pendingAmt/custNos` | pending workflow inputs |
| NACM detail export/query | `POST /api/customer/nacm/nacmDetail/excel/queryForm` | NACM portion of `ExternalCreditProfile` |
| Financial statement attachments | `GET /api/customer/{customerNo}/files?templateType=FINANCIAL_STATEMENT` | `ReviewDocument` |
| Customer360 batch customer IDs | `GET /api/customer/batch/custNos` | C360 refresh preparation |
| Customer360 financial masters | `GET /api/customer/batch/financialMasterNos` | financial-master refresh preparation |

### 5.2 APIs with Side Effects: Record Correspondence Only; Do Not Use for Analytical Reads

| API | Purpose | Ontology correspondence |
|---|---|---|
| `PUT /api/customer/{custNo}/credit` | Update terms/credit limit | `CreditDecision` action |
| `PUT /api/customer/{custNo}/pastDueAmt` | Update past-due | `ARBalance` |
| `PUT /api/customer/{custNo}/pendingAmt` | Update pending | `ARBalance` |
| `PUT /api/customer/nextReview` | Update review date | `CustomerReview` |
| `POST /api/customer/customer360View/financialInfo` | C360 financial batch upsert | `ExposureProfile`/C360 |
| `POST /api/customer/customer360View/collectionInfo` | C360 collection/AR aging upsert | `ARAgingSnapshot`/C360 |
| `POST /api/customer/customer360View/customerScoreInfo` | C360 score batch upsert | `RiskAssessment` |
| `PUT /api/customer/{custNo}/arBalance` | Recalculate AR balance | `ARBalance` |

### 5.3 Known API/Database Limitations

- The API KB for `POST /api/customers/creditInfo/queryForm` explicitly describes the `customer_credit + customer_header + cust_profile` query and US/CA financial-master sharing logic; however, the aggregation grain of the API response still needs to be reviewed against the actual customer and region.
- Both `/credit/profile` and `/credit-profile` naming appear in the customer-service API KB; use the current service route/API reference and do not guess the path from the ontology alone.
- The C360 refresh workflow already has `financial`, `collection`, and `customerScore` update types; this is not a review-case AI recommendation API.
- `GET .../files` for financial statements only proves attachment metadata can be read; it does not prove upload, parsing, approval, or canonical statement publication.

## 6. Not Found / External Acquisition List

### 6.1 External Systems or Additional Permissions Required

1. **D&B / Capital IQ / S&P**: ratings, Paydex, failure score, high credit, and external trade lines.
2. **NexChat/AI**: file-upload parsing, confidence, drivers, topic assessments, and AI conclusion.
3. **Customer/finance team uploads**: audited/unaudited statements, auditor opinion, and original financial statement files.
4. **External payment/AR event source**: NSF, chargeback, invoice types 66/98/99, and open invoices over 39 days.
5. **Sales/order warehouse**: TTM purchases, monthly average, YoY, and 90-day peak balance.

### 6.2 Internal Objects/APIs Requiring Further Verification

1. The monthly bucket table and as-of field for `ARAgingSnapshot`.
2. The service, SP, warehouse view, or job where the `ADP-W/DBT` calculation resides.
3. The `FinancialStatement` canonical tables (header, column definition, data, ratio) and their APIs.
4. The MySQL tables and APIs for the `CustomerReview` case, decision, history, and AI review queue.
5. The configuration tables, executor, and `ReviewRuleResult` output for the R1–R6 customer-review rules.
6. The current queryable Vertica object for `dlake_loat.dm_ai_us_disty_customer_finance_score` / CA variant; its name is known this round, but a usable table structure was not confirmed.
7. The current queryable schema, field definitions, and process freshness for `customer_360_view` and `customer_360_view_consolidate`.

## 7. Recommended Next Verification Order / Recommended next steps

1. First provide or confirm `customer_id + region/company + as_of_date`, then verify the identity/credit snapshot.
2. Run `get_table_structure` and freshness checks on `dim_pub_customer_credit_info`, `dim_pub_customer_info`, `customer_360_view`, and NACM aging.
3. For one customer, run account-grain and financial-group-grain queries simultaneously to verify sharing logic and duplicate counting.
4. Continue reading the complete response contracts for the `credit-profile`, C360 query, and attachment APIs from the API KB.
5. Establish field-level mappings separately for ADP/DBT, aging buckets, financial statements, and the AI review queue; keep the status as `Not found/External` until authoritative sources are found.

## 8. Sources / Sources

- Input ontology: `C:\Users\T944384Y\Downloads\customer_review_ontology.yaml`
- Project reference: `.agents/skills/customer-credit-review/references/credit-domain.md`
- Project reference: `.agents/skills/customer-credit-review/references/customer_data_dictionary.md`
- Project reference: `.agents/skills/customer-credit-review/references/mcp-review-playbook.md`
- Data Compass: customer credit, NACM aging, published customer credit/info catalog search
- Vertica: `dim_us.dim_pub_customer_credit_info`, `dim_us.dim_pub_customer_info` structure checks
- Finance KB: `credit.cac.customer-360-view`, `credit.cac.pymt-credit`, `credit.cac.financial-statement-maint`, `credit.cac.customer-score`
- CIS API KB: `customer-service`, `cac`, `credit-app`, `order-review-service`

Document status: **mapping draft**. All fields marked "Found" should still undergo runtime verification of structure, permissions, data freshness, and business definitions before formal integration.
