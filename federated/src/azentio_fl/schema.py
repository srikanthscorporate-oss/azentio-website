"""Learning task and feature schema shared by every participant.

Task: predict whether a synthetic SME borrower enters repayment stress (90+ days past due)
within 12 months. Model: logistic regression, so every update is a fixed-length weight vector.
Compatibility assumption: all participants compute the same features, in this order, with the
same units and the same standardisation constants below. A participant with a different schema
cannot join a round (the coordinator rejects updates of the wrong shape).
"""

FEATURES = (
    "dscr",  # debt service coverage ratio
    "leverage",  # total debt / equity
    "revenue_volatility",  # coefficient of variation of monthly revenue
    "seasonality_index",  # share of annual revenue in the peak quarter (0.25 = flat)
    "log_months_trading",
    "overdue_days_90d",  # days overdue on any facility in the last 90 days / 30
    "seasonal_sector",  # 1 if the sector is seasonal by nature
)

# Fixed standardisation constants agreed by the programme (not learned from any one client).
MEANS = (1.4, 1.8, 0.30, 0.35, 3.6, 0.30, 0.4)
SCALES = (0.5, 0.8, 0.15, 0.10, 0.8, 0.6, 0.5)

N_WEIGHTS = len(FEATURES) + 1  # + bias
TASK = "sme-stress-12m"
