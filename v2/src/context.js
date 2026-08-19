/* Version 2 fictional review context (Tier-2 data).
   Everything in this file is invented, corroborating color for the four SE-aligned
   business scenarios (2001–2004). It has no engine equivalent: territories,
   reviewers, review history, attachments, and NACM / D&B style external data.
   All review facts, rules, findings, calculator output, and actions come from
   the v2 deterministic review pack. Context here cannot change those results. */

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
    scope: "Applies to this single account. No financial-group restriction is present in the fictional relationship snapshot.",
    persona: "Low-risk automatic pass: no old open invoices, no past due, ADP-W below weighted terms, no recent payment exceptions, current statements, and one prior automatic review.",
    files: [
      ["Northwind_FS_FY2025.pdf", "Financial Stmt", "System", "07/12/2026 10:02"],
      ["AR_Aging_Jul2026.xlsx", "Payment Terms", "System", "07/28/2026 01:00"]
    ],
    history: [
      ["07/25/2025", "$575,000", "$620,000", "+8%", "J. Kim", "Analyst approved a routine increase after current statements and order demand supported the change."]
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
        tradelines: "11 trade experiences · high credit $700K · strong payment record",
        maxCredit: "$750,000 USD",
        derog: "No insolvency, judgments, liens, suits, or public filings reported.",
        estab: "Commenced 2016 / registered 2016-05-10 — established.",
        trend: "PAYDEX stable 12 mo."
      },
      summary: "External trade data is stable and directionally consistent with the clean internal payment record."
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
    scope: "Applies to the financial master represented by this fictional roll-up. No sharing-member restriction is present.",
    persona: "Deteriorating payer: financial-group ADP-W is 73.9 days against 45 weighted-term days, three recent NSF/chargeback events require review, and the 90-day peak balance is 168% of limit. R3 adds visibility but does not create the manual-review action.",
    files: [
      ["Cascade_FS_FY2025.pdf", "Financial Stmt", "P. Rao", "07/18/2026 14:30"],
      ["AR_Aging_Jul2026.xlsx", "Payment Terms", "System", "07/28/2026 01:00"]
    ],
    history: [
      ["01/15/2026", "$7,500,000", "$8,500,000", "+13%", "P. Rao", "Increase for contract season; payment trend flagged for monitoring."],
      ["07/10/2025", "$7,500,000", "$7,500,000", "hold", "P. Rao", "Hold — payment timing had begun to deteriorate."]
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
        tradelines: "15 trade experiences · high credit $9.2M · payment record on file",
        maxCredit: "$8,000,000 USD",
        derog: "No insolvency, judgments, liens, suits, or public filings reported.",
        estab: "Commenced 2009 / registered 2009-08-02 — established.",
        trend: "PAYDEX down from 74 (6 mo)."
      },
      summary: "Trade-group payment timing is also slowing, corroborating the internal ADP-W and exception-event findings without determining the review action."
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
    scope: "Applies to the financial master represented by this fictional roll-up. No sharing-member restriction is present.",
    persona: "Mandatory manual gate: ADP-W remains below 39 days, but old invoices are open and 14% of AR is past due. The account has reached its automatic-review limit, and stale statements separately block limit advice.",
    files: [
      ["Meridian_FS_FY2024.pdf", "Financial Stmt", "J. Kim", "06/15/2025 09:00"],
      ["AR_Aging_Jul2026.xlsx", "Payment Terms", "System", "07/28/2026 01:00"]
    ],
    history: [
      ["06/20/2025", "$2,800,000", "$3,200,000", "+14%", "J. Kim", "Increase after FY24 statements; request FY25 statements next cycle."]
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
        tradelines: "13 trade experiences · high credit $3.4M · generally prompt payment record",
        maxCredit: "$3,100,000 USD",
        derog: "No insolvency, judgments, liens, suits, or public filings reported.",
        estab: "Commenced 2012 / registered 2012-11-19 — established.",
        trend: "PAYDEX stable."
      },
      summary: "The external file remains broadly stable; it does not override the internal old-invoice, past-due, automatic-review, or stale-statement controls."
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
    scope: "Applies to this single account. The requested increase remains advisory until an authorized analyst decides.",
    persona: "Supported increase: clean payment behavior and current statements produce no R1–R6 intervention. Strong capacity and order demand support the requested move from $1.75M to $2.0M, subject to analyst decision.",
    files: [
      ["Ironclad_FS_FY2025.pdf", "Financial Stmt", "N. Owens", "07/22/2026 16:40"],
      ["Ironclad_CashFlow_Note.pdf", "Analyst Note", "N. Owens", "07/23/2026 09:12"],
      ["AR_Aging_Jul2026.xlsx", "Payment Terms", "System", "07/28/2026 01:00"]
    ],
    history: [
      ["02/10/2026", "$1,500,000", "$1,750,000", "+17%", "N. Owens", "Increase supported by demand and current financial capacity."],
      ["08/05/2025", "$1,350,000", "$1,500,000", "+11%", "N. Owens", "Increase for plant expansion orders; PMSI security filed."]
    ],
    ext: {
      flag: ["ok", "Green Flag"],
      nacm: {
        score: "20 / 100", scoreA: "✓ Low", dbt: "3", dbtA: "✓ stable", lines: "10",
        aging: [["Current", "95%"], ["1–30", "5%"], ["31–60", "0%"], ["61–90", "0%"], ["90+", "0%"]],
        trades: [["Member A (steel)", "$2,200,000", "$1,050,000", "NET 45", "Prompt"], ["Member B (coatings)", "$650,000", "$240,000", "NET 30", "Prompt"], ["Member C (freight)", "$300,000", "$96,000", "NET 30", "Prompt"]],
        note: "External trade experiences are stable and support the clean internal payment pattern."
      },
      db: {
        rating: ["4A1", "✓ Strong"], paydex: ["82", "✓ prompt"], delinq: ["11", "✓ Low"], failure: ["8", "✓ Low"],
        tradelines: "19 trade experiences · high credit $2.2M · strong payment record",
        maxCredit: "$2,250,000 USD",
        derog: "No insolvency, judgments, liens, suits, or public filings reported.",
        estab: "Commenced 2005 / registered 2005-03-30 — long-established.",
        trend: "PAYDEX stable over 12 months."
      },
      summary: "Prompt external trade experience and low external risk indicators support, but do not authorize, the deterministic increase recommendation."
    }
  }
});
