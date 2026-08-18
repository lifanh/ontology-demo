/* Version 2 fictional review context (Tier-2 data).
   Everything in this file is invented, illustrative color for the four shared
   Narrative Customers (2001–2004). It has no engine equivalent: territories,
   reviewers, review history, attachments, and NACM / D&B style external data.
   All authoritative review data (facts, rules, findings, calculator output,
   actions) comes from the shared deterministic engine in ../../src. */

export const actionLabels = Object.freeze({
  AUTO_REVIEW_PASS: "Auto review pass",
  NEED_CREDIT_MANAGER_REVIEW: "Credit manager review",
  REQUEST_UPDATED_FINANCIAL_STATEMENTS: "Request updated financial statements",
  NEED_TO_RESTRICT: "Restrict customer",
  NEED_MANUAL_REVIEW: "Manual review",
  RECOMMEND_CREDIT_LIMIT_REASSESSMENT: "Reassess credit limit"
});

export const reviewMeta = Object.freeze({
  2001: {
    territory: "Components · WA",
    segment: "Electronic components",
    security: "None",
    since: "2018",
    nrd: "07/31/2027",
    nextReviewDelta: "+12 mo",
    ask: null,
    scope: "Applies to this single account. Financial groups are a production CIS concept and are not modeled in this POC.",
    persona: "Small components distributor on standard NET 30 terms. Pays inside terms with zero past due, steady order volume, and current audited-style statements. Textbook auto-clear profile.",
    files: [
      ["Northwind_FS_FY2025.pdf", "Financial Stmt", "System", "07/12/2026 10:02"],
      ["AR_Aging_Jul2026.xlsx", "Payment Terms", "System", "07/28/2026 01:00"]
    ],
    history: [
      ["07/25/2025", "$55,000", "$60,000", "+9%", "System", "Auto review pass — routine increase in line with demand."]
    ],
    ext: {
      flag: ["ok", "Green Flag"],
      nacm: {
        score: "18 / 100", scoreA: "✓ Low", dbt: "2", dbtA: "✓ stable", lines: "6",
        aging: [["Current", "96%"], ["1–30", "4%"], ["31–60", "0%"], ["61–90", "0%"], ["90+", "0%"]],
        trades: [["Member A (components)", "$80,000", "$46,000", "NET 30", "Prompt"], ["Member B (logistics)", "$25,000", "$9,000", "NET 30", "Prompt"]],
        note: "Prompt payer across the trade group."
      },
      db: {
        rating: ["4A1", "✓"], paydex: ["81", "✓ prompt"], delinq: ["9", "✓ Low"], failure: ["7", "✓ Low"],
        tradelines: "11 trade experiences · high credit $70K · strong payment record",
        maxCredit: "$90,000 USD",
        derog: "No insolvency, judgments, liens, suits, or public filings reported.",
        estab: "Commenced 2016 / registered 2016-05-10 — established.",
        trend: "PAYDEX stable 12 mo."
      },
      summary: "Credit risk low: prompt internal and external payment files; external max-credit guidance comfortably covers the current limit."
    }
  },
  2002: {
    territory: "Freight · OR",
    segment: "Logistics services",
    security: "None",
    since: "2014",
    nrd: "10/31/2026",
    nextReviewDelta: "+3 mo",
    ask: null,
    scope: "Applies to this single account. Financial groups are a production CIS concept and are not modeled in this POC.",
    persona: "Regional freight operator with strong financials but slipping payment discipline. AR is at the limit and the past-due share has drifted above both the global and NET 30 policy thresholds.",
    files: [
      ["Cascade_FS_FY2025.pdf", "Financial Stmt", "P. Rao", "07/18/2026 14:30"],
      ["AR_Aging_Jul2026.xlsx", "Payment Terms", "System", "07/28/2026 01:00"]
    ],
    history: [
      ["01/15/2026", "$90,000", "$100,000", "+11%", "P. Rao", "Increase for contract season; flagged past-due drift to watch."],
      ["07/10/2025", "$90,000", "$90,000", "hold", "P. Rao", "Hold — past-due ratio trending up two consecutive cycles."]
    ],
    ext: {
      flag: ["warn", "Yellow Flag"],
      nacm: {
        score: "52 / 100", scoreA: "⚠️ Elevated", dbt: "18", dbtA: "⚠️ worse QoQ", lines: "9",
        aging: [["Current", "74%"], ["1–30", "14%"], ["31–60", "8%"], ["61–90", "3%"], ["90+", "1%"]],
        trades: [["Member A (fuel)", "$120,000", "$95,000", "NET 30", "Slow 15"], ["Member B (tires & parts)", "$60,000", "$41,000", "NET 30", "Slow 10"], ["Member C (insurance)", "$30,000", "$8,000", "NET 30", "Prompt"]],
        note: "Trade group slowing is consistent with our past-due rise."
      },
      db: {
        rating: ["2A3", "⚠️ Fair"], paydex: ["68", "⚠️ pays 12d slow"], delinq: ["46", "⚠️ Moderate"], failure: ["31", "⚠️ Moderate"],
        tradelines: "15 trade experiences · high credit $130K · payment record on file",
        maxCredit: "$110,000 USD",
        derog: "No insolvency, judgments, liens, suits, or public filings reported.",
        estab: "Commenced 2009 / registered 2009-08-02 — established.",
        trend: "PAYDEX down from 74 (6 mo)."
      },
      summary: "Credit risk moderate: financial capacity is sound, but internal past-due breach is corroborated by trade-group slowing. Hold limit pending the analyst decision."
    }
  },
  2003: {
    territory: "Industrial · OH",
    segment: "Industrial supply",
    security: "None",
    since: "2016",
    nrd: "09/30/2026",
    nextReviewDelta: "+2 mo",
    ask: null,
    scope: "Applies to this single account. Financial groups are a production CIS concept and are not modeled in this POC.",
    persona: "Mid-size industrial supplier that pays well inside terms. The only open issue is documentation: financial statements on file are stale, which blocks the deterministic limit calculator and policy compliance above $50,000.",
    files: [
      ["Meridian_FS_FY2024.pdf", "Financial Stmt", "J. Kim", "06/15/2025 09:00"],
      ["AR_Aging_Jul2026.xlsx", "Payment Terms", "System", "07/28/2026 01:00"]
    ],
    history: [
      ["06/20/2025", "$80,000", "$90,000", "+13%", "J. Kim", "Increase after FY24 statements; request FY25 statements next cycle."]
    ],
    ext: {
      flag: ["ok", "Green Flag"],
      nacm: {
        score: "24 / 100", scoreA: "✓ Low", dbt: "5", dbtA: "✓ stable", lines: "8",
        aging: [["Current", "92%"], ["1–30", "6%"], ["31–60", "2%"], ["61–90", "0%"], ["90+", "0%"]],
        trades: [["Member A (fasteners)", "$70,000", "$38,000", "NET 30", "Prompt"], ["Member B (abrasives)", "$40,000", "$22,000", "NET 30", "Prompt"]],
        note: "Clean external file — the stale statements are an internal documentation gap."
      },
      db: {
        rating: ["3A2", "✓"], paydex: ["78", "✓ prompt"], delinq: ["15", "✓ Low"], failure: ["12", "✓ Low"],
        tradelines: "13 trade experiences · high credit $85K · strong payment record",
        maxCredit: "$100,000 USD",
        derog: "No insolvency, judgments, liens, suits, or public filings reported.",
        estab: "Commenced 2012 / registered 2012-11-19 — established.",
        trend: "PAYDEX stable."
      },
      summary: "Credit risk low externally; the deterministic blocker is stale financial statements. Refresh documentation before any limit move."
    }
  },
  2004: {
    territory: "Manufacturing · PA",
    segment: "Metal fabrication",
    security: "PMSI",
    since: "2011",
    nrd: "08/31/2026",
    nextReviewDelta: "+1 mo",
    ask: null,
    scope: "Applies to this single account. Financial groups are a production CIS concept and are not modeled in this POC.",
    persona: "Long-standing fabricator under real stress: negative operating cash flow, weak liquidity, rising leverage, and a fifth of AR past due. Deterministic policy fires the critical restriction trigger and the calculator sizes a reduced limit.",
    files: [
      ["Ironclad_FS_FY2025.pdf", "Financial Stmt", "N. Owens", "07/22/2026 16:40"],
      ["Ironclad_CashFlow_Note.pdf", "Analyst Note", "N. Owens", "07/23/2026 09:12"],
      ["AR_Aging_Jul2026.xlsx", "Payment Terms", "System", "07/28/2026 01:00"]
    ],
    history: [
      ["02/10/2026", "$100,000", "$100,000", "hold", "N. Owens", "Hold — margins compressing, cash flow turning negative."],
      ["08/05/2025", "$85,000", "$100,000", "+18%", "N. Owens", "Increase for plant expansion orders; PMSI security filed."]
    ],
    ext: {
      flag: ["warn", "Yellow Flag"],
      nacm: {
        score: "66 / 100", scoreA: "⚠️ Elevated", dbt: "34", dbtA: "⚠️ worse QoQ", lines: "10",
        aging: [["Current", "61%"], ["1–30", "17%"], ["31–60", "12%"], ["61–90", "7%"], ["90+", "3%"]],
        trades: [["Member A (steel)", "$150,000", "$128,000", "NET 45", "Slow 30"], ["Member B (coatings)", "$45,000", "$36,000", "NET 30", "Slow 20"], ["Member C (freight)", "$20,000", "$6,000", "NET 30", "Prompt"]],
        note: "Pays other suppliers 34 days beyond terms on average — slower than with us."
      },
      db: {
        rating: ["2A4", "⚠️ Limited"], paydex: ["58", "⚠️ pays 22d slow"], delinq: ["74", "⚠️ High"], failure: ["55", "⚠️ Elevated"],
        tradelines: "19 trade experiences · high credit $160K · payment record on file",
        maxCredit: "$60,000 USD",
        derog: "No insolvency, judgments, liens, suits, or public filings reported.",
        estab: "Commenced 2005 / registered 2005-03-30 — long-established.",
        trend: "PAYDEX down from 66 (6 mo)."
      },
      summary: "Credit risk high: internal restriction trigger corroborated by external delinquency scores and trade-group slowing. PMSI security partially mitigates."
    }
  }
});
