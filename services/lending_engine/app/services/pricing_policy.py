"""
Policy-driven eligibility and pricing evaluator.
"""
from __future__ import annotations

import os
import json
from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.models import Loan, LoanProduct, LoanStatus, User, PricingPolicyConfig


@dataclass
class PerformanceSnapshot:
    total_loans: int
    completed_loans: int
    fully_repaid_loans: int
    overdue_loans: int
    active_loans: int
    on_time_ratio: float
    performance_band: str


class PricingPolicyService:
    DEFAULT_POLICY_VERSION = "pricing_policy_v1"
    DEFAULT_RATE_MULTIPLIERS = {"high": 0.85, "medium": 1.0, "low": 1.15}
    DEFAULT_LIMIT_MULTIPLIERS = {"high": 1.0, "medium": 0.85, "low": 0.6}
    DEFAULT_SCORE_GATES = {
        "credit_score_min": 0,
        "location_score_min": 0,
        "composite_score_min": 0,
    }

    @staticmethod
    def _policy_version() -> str:
        return os.getenv("PRICING_POLICY_VERSION", PricingPolicyService.DEFAULT_POLICY_VERSION)

    @staticmethod
    def _load_json_env(name: str, fallback: dict[str, float]) -> dict[str, float]:
        raw = os.getenv(name)
        if not raw:
            return fallback
        try:
            parsed = json.loads(raw)
            out: dict[str, float] = {}
            for k, v in parsed.items():
                out[str(k)] = float(v)
            return out or fallback
        except Exception:
            return fallback

    @staticmethod
    async def build_performance_snapshot(db: AsyncSession, user: User) -> PerformanceSnapshot:
        loans = (
            await db.execute(
                select(Loan).where(Loan.user_id == user.id).order_by(Loan.created_at.desc())
            )
        ).scalars().all()

        total_loans = len(loans)
        fully_repaid = [l for l in loans if l.status == LoanStatus.FULLY_REPAID]
        overdue = [l for l in loans if l.status == LoanStatus.OVERDUE]
        active = [l for l in loans if l.status in {LoanStatus.ACTIVE, LoanStatus.PARTIALLY_REPAID}]
        completed = [
            l for l in loans if l.status in {LoanStatus.FULLY_REPAID, LoanStatus.OVERDUE, LoanStatus.CANCELLED, LoanStatus.WRITTEN_OFF}
        ]

        completed_count = len(completed)
        on_time_ratio = (len(fully_repaid) / completed_count) if completed_count > 0 else 0.0

        if completed_count >= 3 and on_time_ratio >= 0.9 and len(overdue) == 0:
            band = "high"
        elif completed_count >= 1 and on_time_ratio >= 0.6 and len(overdue) <= 1:
            band = "medium"
        else:
            band = "low"

        return PerformanceSnapshot(
            total_loans=total_loans,
            completed_loans=completed_count,
            fully_repaid_loans=len(fully_repaid),
            overdue_loans=len(overdue),
            active_loans=len(active),
            on_time_ratio=round(on_time_ratio, 4),
            performance_band=band,
        )

    @staticmethod
    def _product_is_eligible(product: LoanProduct, perf: PerformanceSnapshot) -> tuple[bool, list[str]]:
        reasons: list[str] = []
        rules: dict[str, Any] = product.eligibility_rules or {}

        min_completed = int(rules.get("min_completed_loans", 0))
        max_overdue = int(rules.get("max_overdue_loans", 9999))
        min_on_time = float(rules.get("min_on_time_ratio", 0.0))

        if perf.completed_loans < min_completed:
            reasons.append("INSUFFICIENT_COMPLETED_LOANS")
        if perf.overdue_loans > max_overdue:
            reasons.append("OVERDUE_EXCEEDS_RULE")
        if perf.on_time_ratio < min_on_time:
            reasons.append("ON_TIME_RATIO_BELOW_RULE")

        return (len(reasons) == 0), reasons

    @staticmethod
    async def evaluate_for_user(db: AsyncSession, user: User) -> dict[str, Any]:
        active_cfg = (
            await db.execute(
                select(PricingPolicyConfig).where(PricingPolicyConfig.is_active == True).limit(1)
            )
        ).scalar_one_or_none()

        if active_cfg:
            policy_version = active_cfg.version
            cfg = active_cfg.config or {}
            rate_multipliers = cfg.get("rate_multipliers") or PricingPolicyService.DEFAULT_RATE_MULTIPLIERS
            limit_multipliers = cfg.get("limit_multipliers") or PricingPolicyService.DEFAULT_LIMIT_MULTIPLIERS
            score_gates = cfg.get("score_gates") or PricingPolicyService.DEFAULT_SCORE_GATES
        else:
            policy_version = PricingPolicyService._policy_version()
            rate_multipliers = PricingPolicyService._load_json_env(
                "PRICING_RATE_MULTIPLIERS_JSON",
                PricingPolicyService.DEFAULT_RATE_MULTIPLIERS,
            )
            limit_multipliers = PricingPolicyService._load_json_env(
                "PRICING_LIMIT_MULTIPLIERS_JSON",
                PricingPolicyService.DEFAULT_LIMIT_MULTIPLIERS,
            )
            score_gates = PricingPolicyService.DEFAULT_SCORE_GATES

        perf = await PricingPolicyService.build_performance_snapshot(db, user)
        active_products = (
            await db.execute(select(LoanProduct).where(LoanProduct.is_active == True))
        ).scalars().all()

        eligible: list[dict[str, Any]] = []
        rejected: list[dict[str, Any]] = []
        for p in active_products:
            ok, reasons = PricingPolicyService._product_is_eligible(p, perf)
            item = {
                "id": str(p.id),
                "name": p.name,
                "description": p.description,
                "min_amount": p.min_amount,
                "max_amount": p.max_amount,
                "min_tenor": p.min_tenor,
                "max_tenor": p.max_tenor,
                "base_interest_rate": float(p.interest_rate),
                "fees": p.fees or {},
            }
            if ok:
                eligible.append(item)
            else:
                item["ineligible_reasons"] = reasons
                rejected.append(item)

        # Placeholder scored signals (to be fed by dedicated engines as they are finalized).
        measured_scores = {
            "credit_score": 0,
            "location_score": 0,
            "composite_score": 0,
        }
        score_gate_failures: list[str] = []
        if measured_scores["credit_score"] < int(score_gates.get("credit_score_min", 0)):
            score_gate_failures.append("CREDIT_SCORE_BELOW_MIN")
        if measured_scores["location_score"] < int(score_gates.get("location_score_min", 0)):
            score_gate_failures.append("LOCATION_SCORE_BELOW_MIN")
        if measured_scores["composite_score"] < int(score_gates.get("composite_score_min", 0)):
            score_gate_failures.append("COMPOSITE_SCORE_BELOW_MIN")

        if score_gate_failures:
            return {
                "policy_version": policy_version,
                "performance": perf.__dict__,
                "measured_scores": measured_scores,
                "eligible_products": [],
                "ineligible_products": rejected,
                "selected_product": None,
                "effective_interest_rate": None,
                "pricing_reason_codes": score_gate_failures,
                "benefits": {"coupon_eligible": False, "limit_bonus": 0},
            }

        if not eligible:
            return {
                "policy_version": policy_version,
                "performance": perf.__dict__,
                "measured_scores": measured_scores,
                "eligible_products": [],
                "ineligible_products": rejected,
                "selected_product": None,
                "effective_interest_rate": None,
                "pricing_reason_codes": ["NO_ELIGIBLE_PRODUCT"],
                "benefits": {"coupon_eligible": False, "limit_bonus": 0},
            }

        selected = sorted(eligible, key=lambda x: (x["base_interest_rate"], x["max_amount"]))[0]
        band = perf.performance_band
        rate_multiplier = float(rate_multipliers.get(band, 1.0))
        limit_multiplier = float(limit_multipliers.get(band, 1.0))
        effective_rate = round(selected["base_interest_rate"] * rate_multiplier, 6)
        effective_limit = int(selected["max_amount"] * limit_multiplier)
        effective_limit = max(int(selected["min_amount"]), effective_limit)

        pricing_reasons = [f"PERFORMANCE_BAND_{band.upper()}", "PRODUCT_BASED_PRICING", "POLICY_APPLIED"]
        benefits = {
            "coupon_eligible": band == "high" and perf.completed_loans >= 3 and perf.overdue_loans == 0,
            "limit_bonus": max(0, effective_limit - int(selected["max_amount"])),
        }

        selected_out = {
            **selected,
            "effective_interest_rate": effective_rate,
            "effective_max_limit": effective_limit,
            "rate_multiplier": rate_multiplier,
            "limit_multiplier": limit_multiplier,
        }

        return {
            "policy_version": policy_version,
            "performance": perf.__dict__,
            "measured_scores": measured_scores,
            "eligible_products": eligible,
            "ineligible_products": rejected,
            "selected_product": selected_out,
            "effective_interest_rate": effective_rate,
            "effective_max_limit": effective_limit,
            "pricing_reason_codes": pricing_reasons,
            "benefits": benefits,
        }
