from pydantic import BaseModel
from typing import Literal

class FinancialTerm(BaseModel):
    category: Literal["settlement_terms", "fee_structure", "penalties_and_chargebacks", "cash_flow_impact"]
    clause_evidence: str
    page_number: int | None = None
    impact: Literal["favorable", "neutral", "unfavorable"]
    estimated_impact: str
    recommendation: str

class FinanceAnalysisOut(BaseModel):
    document_id: str
    financial_health_score: int
    financial_health_level: Literal["poor", "moderate", "good"]
    summary: str
    financial_terms: list[FinancialTerm]
    tokens_used: int
