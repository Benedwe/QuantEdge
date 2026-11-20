# Risk and position sizing

## Formula

For a standard FX lot of 100,000 base-currency units:

1. `pip_size` is 0.01 when the quote currency is JPY, otherwise 0.0001.
2. `stop_pips = abs(entry - stop) / pip_size`.
3. `pip_value_in_quote = 100,000 * pip_size`.
4. Convert pip value to the account currency using a supplied quote-to-account
   rate.
5. `risk_cash = account_balance * risk_percent / 100`.
6. `unrounded_lots = risk_cash / (stop_pips * pip_value_in_account)`.
7. Round **down** to the requested lot step so rounding does not exceed the
   stated risk budget.

The script rejects a stop on the wrong side of entry for the selected direction,
non-positive inputs, unsupported symbols, missing currency conversion, and
positions below the configured minimum lot size.

## Important limitations

- The calculation assumes the standard 100,000-unit FX contract. Confirm the
  instrument contract size and minimum/step size with the broker.
- The result is a planned loss at the stop price, not a guaranteed maximum
  realized loss. Gaps, fast markets, and execution quality can increase loss.
- The estimate excludes spread, commission, swaps/financing, slippage, margin
  requirements, and correlations with other positions.
- Pip value and currency conversion can change as prices move.
- “Risk percent” is an input selected by the user, not a recommendation.
- Never infer account balance, leverage, tolerance, or an appropriate risk
  budget from unrelated conversation context.
