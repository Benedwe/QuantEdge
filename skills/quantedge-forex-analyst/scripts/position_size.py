#!/usr/bin/env python3
"""Estimate standard FX position size from a user-defined risk budget."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict, dataclass
from decimal import Decimal, ROUND_DOWN, InvalidOperation


STANDARD_LOT_UNITS = Decimal("100000")
SUPPORTED_CURRENCIES = {"AUD", "CAD", "CHF", "EUR", "GBP", "JPY", "NZD", "USD"}
SUPPORTED_PIP_QUOTES = {"JPY": Decimal("0.01")}
DEFAULT_PIP_SIZE = Decimal("0.0001")


@dataclass(frozen=True)
class PositionEstimate:
    symbol: str
    direction: str
    account_currency: str
    balance: str
    risk_percent: str
    risk_amount: str
    entry: str
    stop: str
    pip_size: str
    stop_distance_pips: str
    pip_value_per_lot_account_currency: str
    unrounded_lots: str
    lot_step: str
    rounded_lots: str
    units: str
    estimated_loss_at_stop: str
    quote_to_account_rate: str
    limitations: tuple[str, ...]


def positive_decimal(value: str, label: str) -> Decimal:
    try:
        result = Decimal(value)
    except InvalidOperation as error:
        raise ValueError(f"{label} must be a number.") from error
    if not result.is_finite() or result <= 0:
        raise ValueError(f"{label} must be a finite number greater than zero.")
    return result


def parse_symbol(symbol: str) -> tuple[str, str, str]:
    normalized = symbol.strip().upper().replace("_", "/").replace("-", "/")
    parts = normalized.split("/")
    if len(parts) != 2 or any(len(currency) != 3 or not currency.isalpha() for currency in parts):
        raise ValueError("Symbol must be a six-letter FX pair, for example EUR/USD.")
    base, quote = parts
    if base not in SUPPORTED_CURRENCIES or quote not in SUPPORTED_CURRENCIES:
        raise ValueError(
            "This calculator supports pairs using AUD, CAD, CHF, EUR, GBP, JPY, NZD, and USD."
        )
    return f"{base}/{quote}", base, quote


def calculate_position(
    *,
    symbol: str,
    direction: str,
    entry: str,
    stop: str,
    balance: str,
    account_currency: str,
    risk_percent: str,
    quote_to_account_rate: str | None = None,
    lot_step: str = "0.01",
    min_lots: str = "0.01",
) -> PositionEstimate:
    normalized_symbol, _, quote_currency = parse_symbol(symbol)
    normalized_direction = direction.strip().upper()
    if normalized_direction not in {"BUY", "SELL"}:
        raise ValueError("Direction must be BUY or SELL.")

    entry_value = positive_decimal(entry, "Entry")
    stop_value = positive_decimal(stop, "Stop")
    balance_value = positive_decimal(balance, "Balance")
    risk_value = positive_decimal(risk_percent, "Risk percent")
    step_value = positive_decimal(lot_step, "Lot step")
    min_lots_value = positive_decimal(min_lots, "Minimum lots")
    account_currency_value = account_currency.strip().upper()
    if len(account_currency_value) != 3 or not account_currency_value.isalpha():
        raise ValueError("Account currency must be a three-letter currency code.")
    if risk_value > Decimal("100"):
        raise ValueError("Risk percent cannot exceed 100.")

    if normalized_direction == "BUY" and stop_value >= entry_value:
        raise ValueError("For a BUY, the stop must be below entry.")
    if normalized_direction == "SELL" and stop_value <= entry_value:
        raise ValueError("For a SELL, the stop must be above entry.")

    pip_size = SUPPORTED_PIP_QUOTES.get(quote_currency, DEFAULT_PIP_SIZE)
    stop_pips = abs(entry_value - stop_value) / pip_size
    pip_value_quote = STANDARD_LOT_UNITS * pip_size

    if quote_currency == account_currency_value:
        conversion = Decimal("1")
    elif quote_to_account_rate is None:
        raise ValueError(
            f"Provide --quote-to-account-rate to convert {quote_currency} "
            f"to {account_currency_value}."
        )
    else:
        conversion = positive_decimal(quote_to_account_rate, "Quote-to-account rate")

    pip_value_account = pip_value_quote * conversion
    risk_amount = balance_value * risk_value / Decimal("100")
    risk_per_lot = stop_pips * pip_value_account
    if risk_per_lot <= 0:
        raise ValueError("Stop distance must be greater than zero.")

    unrounded_lots = risk_amount / risk_per_lot
    rounded_lots = (unrounded_lots / step_value).to_integral_value(rounding=ROUND_DOWN) * step_value
    if rounded_lots < min_lots_value:
        raise ValueError(
            f"Calculated size rounds below the minimum of {min_lots_value} lots; "
            "do not round up because that would exceed the stated risk budget."
        )

    estimated_loss = rounded_lots * risk_per_lot
    units = rounded_lots * STANDARD_LOT_UNITS
    lot_decimal_places = max(0, -step_value.as_tuple().exponent)
    return PositionEstimate(
        symbol=normalized_symbol,
        direction=normalized_direction,
        account_currency=account_currency_value,
        balance=str(balance_value),
        risk_percent=str(risk_value),
        risk_amount=f"{risk_amount:.2f}",
        entry=str(entry_value),
        stop=str(stop_value),
        pip_size=str(pip_size),
        stop_distance_pips=f"{stop_pips:.2f}",
        pip_value_per_lot_account_currency=f"{pip_value_account:.4f}",
        unrounded_lots=f"{unrounded_lots:.6f}",
        lot_step=str(step_value),
        rounded_lots=f"{rounded_lots:.{lot_decimal_places}f}",
        units=f"{units.normalize():f}",
        estimated_loss_at_stop=f"{estimated_loss:.2f}",
        quote_to_account_rate=str(conversion),
        limitations=(
            "Assumes a standard 100,000-unit FX lot.",
            "Excludes spread, commission, swaps, slippage, gaps, and margin.",
            "A stop price does not guarantee the realized loss during fast or gapping markets.",
            "Verify contract size, lot increment, and currency conversion with the broker.",
        ),
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Estimate FX lot size from a user-defined account risk budget."
    )
    parser.add_argument("--symbol", required=True, help="FX pair, e.g. EUR/USD or USD_JPY")
    parser.add_argument("--direction", required=True, choices=("BUY", "SELL"))
    parser.add_argument("--entry", required=True, help="Planned entry price")
    parser.add_argument("--stop", required=True, help="Planned stop price")
    parser.add_argument("--balance", required=True, help="Account balance")
    parser.add_argument("--account-currency", required=True, help="Three-letter currency code")
    parser.add_argument("--risk-percent", required=True, help="User-selected percent of balance")
    parser.add_argument(
        "--quote-to-account-rate",
        help="Current user-verified conversion rate: one quote-currency unit in account currency",
    )
    parser.add_argument("--lot-step", default="0.01", help="Broker lot increment (default: 0.01)")
    parser.add_argument("--min-lots", default="0.01", help="Broker minimum lot size (default: 0.01)")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    try:
        result = calculate_position(
            symbol=args.symbol,
            direction=args.direction,
            entry=args.entry,
            stop=args.stop,
            balance=args.balance,
            account_currency=args.account_currency,
            risk_percent=args.risk_percent,
            quote_to_account_rate=args.quote_to_account_rate,
            lot_step=args.lot_step,
            min_lots=args.min_lots,
        )
    except ValueError as error:
        print(json.dumps({"error": str(error)}), file=sys.stderr)
        return 2

    print(json.dumps(asdict(result), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
