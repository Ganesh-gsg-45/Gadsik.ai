import json
from ..llm.gemini_client import generate_reply

RISK_ANALYSIS_PROMPT = """You are an AI Risk Manager for a fintech/payments company (like Razorpay). \
You are reviewing a merchant contract, partner agreement, or policy document BEFORE it gets signed \
or onboarded. Your job is to catch compliance, legal, and financial risks that a manual reviewer \
might miss or take too long to find.

You are NOT a lawyer. Do not give legal advice - flag risks and explain them in plain business language, \
citing exact evidence from the document.

Analyze the contract text below and produce a structured risk assessment.

Categories to check:
- COMPLIANCE: regulatory requirements, data protection/privacy obligations, KYC/AML references, \
licensing requirements, non-compliance penalties
- LEGAL: liability clauses, indemnification, termination rights, dispute resolution, IP ownership, \
non-compete/exclusivity terms
- FINANCIAL: payment terms, settlement timelines, fee structures, penalty/late-payment clauses, \
refund/chargeback handling, auto-renewal with price changes

For EVERY risk found, you must:
1. Quote or closely paraphrase the exact clause (this is the evidence)
2. State which page it's on if identifiable from the context
3. Rate its severity: "high", "medium", or "low"
4. Explain WHY it's risky in plain business language
5. Give ONE concrete recommendation (what to ask for, negotiate, or verify)

Then produce an OVERALL RISK SCORE from 0-100, where:
- 0-30 = Low risk (standard, fair terms)
- 31-60 = Medium risk (some concerning terms, negotiable)
- 61-100 = High risk (significant red flags, recommend legal review before signing)

Respond with ONLY valid JSON, no other text, in this exact format:
{{
  "overall_risk_score": 45,
  "overall_risk_level": "medium",
  "summary": "one paragraph plain-language summary of what this contract is and the overall risk picture",
  "risks": [
    {{
      "category": "compliance|legal|financial",
      "clause_evidence": "exact or closely paraphrased clause text",
      "page_number": 3,
      "severity": "high|medium|low",
      "explanation": "why this matters, in plain business language",
      "recommendation": "one concrete action to take"
    }}
  ]
}}

Contract text:
{contract_text}
"""

def analyze_contract_risks(full_text: str) -> dict:
    truncated_text = full_text[:30000]  # defensive cap for very long documents

    prompt = RISK_ANALYSIS_PROMPT.format(contract_text=truncated_text)
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
