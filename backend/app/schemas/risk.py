from pydantic import BaseModel
from typing import Literal

class RiskItem(BaseModel):
    category: Literal["compliance", "legal", "financial"]
    clause_evidence: str
    page_number: int | None = None
    severity: Literal["high", "medium", "low"]
    explanation: str
    recommendation: str

class RiskAnalysisOut(BaseModel):
    document_id: str
    overall_risk_score: int
    overall_risk_level: Literal["low", "medium", "high"]
    summary: str
    risks: list[RiskItem]
    tokens_used: int
