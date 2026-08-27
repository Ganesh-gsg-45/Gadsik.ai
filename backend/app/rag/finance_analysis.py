import json
from ..llm.gemini_client import generate_reply

FINANCE_CONTROLLER_PROMPT = """You are an AI Finance Controller for a fintech/payments company. \
You are reviewing a merchant contract or partner agreement to assess its FINANCIAL terms - \
not legal risk, but concrete cash flow, revenue, and cost impact.

You are not a lawyer or accountant giving formal advice - you are flagging financial terms a \
Finance Controller would want to model and negotiate before signing.

Analyze the contract text below and extract EVERY financial term you can find, organized into:

- SETTLEMENT_TERMS: settlement timelines, holdback/reserve amounts, conditions for delay
- FEE_STRUCTURE: processing fees, minimum fees, fee change terms, hidden/variable charges
- PENALTIES_AND_CHARGEBACKS: chargeback costs, penalty fees, liability for disputes
- CASH_FLOW_IMPACT: anything that ties up working capital (reserves, holds, deposits) or creates 
  unpredictable costs

For each financial term found:
1. Quote or closely paraphrase the exact clause (evidence)
2. State the page number if identifiable
3. Classify its cash flow impact: "favorable", "neutral", "unfavorable"
4. Estimate impact where possible in concrete terms (e.g., "ties up 10% of monthly settlement \
   value indefinitely" or "adds ~2.9% + INR 5000/month minimum fee")
5. Give one recommendation for negotiation or internal financial planning

Then produce an OVERALL FINANCIAL HEALTH SCORE from 0-100, where:
- 0-30 = Poor (heavily unfavorable financial terms, significant cash flow risk)
- 31-60 = Moderate (some unfavorable terms, manageable with planning)
- 61-100 = Good (fair, predictable financial terms)

Respond with ONLY valid JSON, no other text, in this exact format:
{{
  "financial_health_score": 25,
  "financial_health_level": "poor",
  "summary": "one paragraph plain-language summary of the overall financial picture of this contract",
  "financial_terms": [
    {{
      "category": "settlement_terms|fee_structure|penalties_and_chargebacks|cash_flow_impact",
      "clause_evidence": "exact or closely paraphrased clause text",
      "page_number": 1,
      "impact": "favorable|neutral|unfavorable",
      "estimated_impact": "concrete estimate of the financial effect",
      "recommendation": "one concrete negotiation or planning action"
    }}
  ]
}}

Contract text:
{contract_text}
"""

def analyze_finance_terms(full_text: str) -> dict:
    truncated_text = full_text[:30000]

    prompt = FINANCE_CONTROLLER_PROMPT.format(contract_text=truncated_text)
    raw_response, tokens_used = generate_reply(prompt)

    cleaned = raw_response.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("```")[1]
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
    cleaned = cleaned.strip()

    try:
        result = json.loads(cleaned)
    except json.JSONDecodeError:
        raise ValueError(f"Gemini did not return valid JSON. Raw response: {raw_response[:500]}")

    result["tokens_used"] = tokens_used
    return result
