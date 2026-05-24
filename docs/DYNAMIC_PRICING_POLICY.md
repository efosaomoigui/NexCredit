# Dynamic Pricing Policy (Sprint 2)

## What is now live
- Borrower eligibility is evaluated by backend policy service:
  - `services/lending_engine/app/services/pricing_policy.py`
- `/api/v1/loans/eligibility` now returns:
  - backward-compatible fields: `max_limit`, `min_amount`, `interest_rate`, `processing_fee`, `tenor_range_days`
  - new fields: `eligible_products`, `ineligible_products`, `selected_product`, `effective_interest_rate`, `pricing_reason_codes`, `benefits`, `policy_version`, `performance`
- `/api/v1/admin/loans/pricing-preview/{user_id}` gives admin visibility into the policy decision.

## Default policy behavior
- Performance bands:
  - `high`: completed >= 3, on-time >= 0.90, overdue = 0
  - `medium`: completed >= 1, on-time >= 0.60, overdue <= 1
  - `low`: otherwise
- Product selection: lowest base interest among eligible products.
- Effective rate: `base_interest_rate * rate_multiplier[band]`
- Effective max limit: `product.max_amount * limit_multiplier[band]`

## Configure without code changes
Set env vars on lending engine:
- `PRICING_POLICY_VERSION` (example: `pricing_policy_v2`)
- `PRICING_RATE_MULTIPLIERS_JSON` (JSON string)
- `PRICING_LIMIT_MULTIPLIERS_JSON` (JSON string)

Example:

```env
PRICING_POLICY_VERSION=pricing_policy_v1
PRICING_RATE_MULTIPLIERS_JSON={"high":0.85,"medium":1.0,"low":1.15}
PRICING_LIMIT_MULTIPLIERS_JSON={"high":1.0,"medium":0.85,"low":0.6}
```

## Product-level eligibility rules
Each `loan_products.eligibility_rules` can contain:
- `min_completed_loans`
- `max_overdue_loans`
- `min_on_time_ratio`

These are applied per product by the policy service.
