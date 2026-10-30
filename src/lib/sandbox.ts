// Deterministic, synthetic sandbox scenarios. Outputs are simulations, never credit or business decisions.

export type Scenario = { id: string; name: string; description: string; inputs: Record<string, number> };

export const SCENARIOS: Record<string, Scenario[]> = {
  "financial-analysis-intelligence": [
    { id: "seasonal-agri", name: "Seasonal agri-supply SME", description: "Strong Q4, weak Q2 revenue pattern.", inputs: { q1: 420, q2: 210, q3: 380, q4: 690, prior_q2: 230, debt_service: 60 } },
    { id: "steady-retail", name: "Steady retail SME", description: "Flat revenue across quarters.", inputs: { q1: 400, q2: 410, q3: 395, q4: 420, prior_q2: 405, debt_service: 70 } },
  ],
  "sme-credit-decisioning": [
    { id: "thin-file", name: "Thin-file applicant", description: "18 months trading, limited bureau history.", inputs: { months_trading: 18, dscr_x100: 135, bureau_score: 610, leverage_x100: 220 } },
    { id: "established", name: "Established manufacturer", description: "8 years trading, solid coverage.", inputs: { months_trading: 96, dscr_x100: 190, bureau_score: 720, leverage_x100: 140 } },
  ],
  "credit-strategy-simulator": [
    { id: "tighten", name: "Raise minimum score by 20", description: "Policy change simulation on a synthetic book.", inputs: { min_score_change: 20, base_approval_pct: 62, base_default_pct: 4 } },
  ],
  "similar-portfolio-intelligence": [
    { id: "peer-match", name: "Peer segment match", description: "Compare to a synthetic historical segment.", inputs: { dscr_x100: 150, segment_dscr_x100: 165, segment_default_pct: 3 } },
  ],
  riva: [
    { id: "validation", name: "Quarterly return validation", description: "Synthetic report with mapped fields.", inputs: { fields: 120, missing: 4, out_of_range: 2 } },
  ],
};

type Output = { headline: string; evidence: string[]; caveat: string };

export function runScenario(offering: string, s: Scenario): Output {
  const i = s.inputs;
  const caveat = "Simulated output on synthetic data. Not an approved credit or business decision.";
  switch (offering) {
    case "financial-analysis-intelligence": {
      const annual = i.q1 + i.q2 + i.q3 + i.q4;
      const yoy = Math.round(((i.q2 - i.prior_q2) / i.prior_q2) * 100);
      const seasonalShare = Math.round((i.q2 / (annual / 4)) * 100);
      return {
        headline: seasonalShare < 70 ? `Q2 is ${seasonalShare}% of the quarterly average, consistent with a seasonal trough (YoY ${yoy}%).` : `Revenue is stable (Q2 at ${seasonalShare}% of average, YoY ${yoy}%).`,
        evidence: [`Annual revenue ${annual}k`, `Q2 year-on-year change ${yoy}%`, `Debt service cover on annual basis ${(annual / (i.debt_service * 4)).toFixed(1)}x`],
        caveat,
      };
    }
    case "sme-credit-decisioning": {
      const score = (i.dscr_x100 >= 150 ? 2 : i.dscr_x100 >= 125 ? 1 : 0) + (i.bureau_score >= 680 ? 2 : i.bureau_score >= 600 ? 1 : 0) + (i.months_trading >= 36 ? 1 : 0) + (i.leverage_x100 <= 200 ? 1 : 0);
      return {
        headline: score >= 5 ? "Simulated recommendation: proceed to standard review" : score >= 3 ? "Simulated recommendation: refer for enhanced review" : "Simulated recommendation: insufficient evidence",
        evidence: [`DSCR ${(i.dscr_x100 / 100).toFixed(2)}x`, `Bureau score ${i.bureau_score}`, `Trading ${i.months_trading} months`, `Leverage ${(i.leverage_x100 / 100).toFixed(1)}x`, `Policy points ${score}/6`],
        caveat,
      };
    }
    case "credit-strategy-simulator": {
      const approval = i.base_approval_pct - i.min_score_change * 0.35;
      const dflt = i.base_default_pct - i.min_score_change * 0.04;
      return { headline: `Approval rate ${approval.toFixed(1)}% (from ${i.base_approval_pct}%), default rate ${dflt.toFixed(1)}%`, evidence: ["Linear sensitivity model on synthetic book", "No segment-level effects modelled"], caveat };
    }
    case "similar-portfolio-intelligence":
      return { headline: `Applicant DSCR is ${i.segment_dscr_x100 - i.dscr_x100 > 0 ? "below" : "above"} the matched segment median`, evidence: [`Segment default rate ${i.segment_default_pct}%`, "Matched on sector and size band (synthetic)"], caveat };
    default:
      return { headline: `${i.missing + i.out_of_range} of ${i.fields} fields need attention`, evidence: [`${i.missing} missing`, `${i.out_of_range} out of range`], caveat };
  }
}
