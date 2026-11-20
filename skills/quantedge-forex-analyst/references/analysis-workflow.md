# Forex analysis workflow

Use this workflow for an evidence-based review, not as a signal generator.

## Required context

Record only information actually supplied or returned by a connected tool:

- Pair and timeframe(s)
- Data source and retrieval timestamp, including timezone
- Current or last observed price and candle timestamp
- Relevant price history or indicators, with their calculation timeframe
- User-provided support, resistance, entry, stop, and target levels
- Relevant economic events, including source and release time
- Account currency and any conversion rate used for sizing

If price data is only a screenshot or excerpt, say so. If the timestamp is
missing or stale, do not call the values current. A calendar headline or
forecast is not the same as a confirmed release.

## Review sequence

1. **Data quality:** Check timestamps, timeframe consistency, missing candles,
   units, pair orientation, and whether values are observed or user-estimated.
2. **Market structure:** Describe the visible swing sequence and range/trend
   only when enough price history is present. Avoid asserting a pattern from a
   single price.
3. **Context:** Review supplied higher-timeframe levels and verified event
   risk. Explain when the available information is insufficient.
4. **Scenarios:** State what supports each plausible direction and what
   evidence would invalidate it. If only one side is supported by the supplied
   evidence, state that the review is limited to that evidence.
5. **Trade geometry:** If the user supplies a proposed entry, stop and target,
   calculate distances and reward-to-risk arithmetically. Do not invent levels.
6. **Risk:** Establish the cash risk and size from the supplied account and
   conversion inputs. Identify costs and execution risks not included.
7. **Conclusion:** Present a conditional summary, not an instruction to trade.

## Distinguish evidence from interpretation

Use language like:

- **Provided:** “The user supplied EUR/USD H1 candles ending at 10:00 UTC.”
- **Calculated:** “The proposed entry-to-stop distance is 50 pips.”
- **Interpretation:** “The supplied swings are consistent with a short-term
  higher-high sequence; the sample is too short to establish a durable trend.”
- **Unknown:** “No verified event calendar or current spread was provided.”

Do not describe a technical interpretation as a fact about future price.
