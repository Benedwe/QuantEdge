import unittest

from position_size import calculate_position


class PositionSizeTests(unittest.TestCase):
    def test_eurusd_size_uses_user_risk_and_rounds_down(self):
        result = calculate_position(
            symbol="EUR/USD",
            direction="BUY",
            entry="1.0850",
            stop="1.0800",
            balance="10000",
            account_currency="USD",
            risk_percent="0.51",
        )
        self.assertEqual(result.stop_distance_pips, "50.00")
        self.assertEqual(result.risk_amount, "51.00")
        self.assertEqual(result.rounded_lots, "0.10")
        self.assertEqual(result.estimated_loss_at_stop, "50.00")
        self.assertLessEqual(float(result.estimated_loss_at_stop), 51)

    def test_jpy_quote_requires_and_uses_conversion_rate(self):
        with self.assertRaisesRegex(ValueError, "quote-to-account-rate"):
            calculate_position(
                symbol="USD/JPY",
                direction="BUY",
                entry="150.00",
                stop="149.50",
                balance="10000",
                account_currency="USD",
                risk_percent="0.5",
            )

        result = calculate_position(
            symbol="USD/JPY",
            direction="BUY",
            entry="150.00",
            stop="149.50",
            balance="10000",
            account_currency="USD",
            risk_percent="0.5",
            quote_to_account_rate="0.00667",
        )
        self.assertEqual(result.stop_distance_pips, "50.00")
        self.assertAlmostEqual(float(result.pip_value_per_lot_account_currency), 6.67)
        self.assertLessEqual(float(result.estimated_loss_at_stop), 50)

    def test_sell_stop_must_be_above_entry(self):
        with self.assertRaisesRegex(ValueError, "For a SELL"):
            calculate_position(
                symbol="EUR/USD",
                direction="SELL",
                entry="1.0850",
                stop="1.0800",
                balance="10000",
                account_currency="USD",
                risk_percent="0.5",
            )

    def test_does_not_round_up_below_minimum(self):
        with self.assertRaisesRegex(ValueError, "rounds below the minimum"):
            calculate_position(
                symbol="EUR/USD",
                direction="BUY",
                entry="1.0850",
                stop="1.0800",
                balance="100",
                account_currency="USD",
                risk_percent="0.1",
            )

    def test_rejects_unsupported_instrument(self):
        with self.assertRaisesRegex(ValueError, "supports pairs"):
            calculate_position(
                symbol="XAU/USD",
                direction="BUY",
                entry="2000",
                stop="1990",
                balance="10000",
                account_currency="USD",
                risk_percent="0.5",
            )


if __name__ == "__main__":
    unittest.main()
