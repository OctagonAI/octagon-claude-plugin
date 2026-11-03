# Interpreting Ratings Snapshot Results

## Reading the Output

| Metric | Score |
|--------|-------|
| Overall Rating | B |
| Discounted Cash Flow (DCF) | 3 |
| Return on Equity (ROE) | 5 |
| Return on Assets (ROA) | 5 |
| Debt-to-Equity | 1 |
| Price-to-Earnings (P/E) | 2 |
| Price-to-Book (P/B) | 1 |

## Score Scales

### Overall Rating (Letter Grade)
| Grade | Quality | Action |
|-------|---------|--------|
| A | Excellent | Strong candidate |
| B | Good | Worth deeper analysis |
| C | Average | Proceed with caution |
| D | Below Average | Significant concerns |
| F | Poor | Likely avoid |

### Component Scores (1-5 Scale)
| Score | Percentile | Interpretation |
|-------|------------|----------------|
| 5 | Top 20% | Excellent |
| 4 | 60-80% | Above Average |
| 3 | 40-60% | Average |
| 2 | 20-40% | Below Average |
| 1 | Bottom 20% | Poor |

## Profile Analysis

### Quality Profile
High ROE (5) + High ROA (5):
- Efficient operator
- Strong competitive position
- Pricing power or cost advantages

### Valuation Profile
Valuation scores run from unattractive (1) to attractive (5): a high P/E or P/B score means the stock is priced cheaply on that metric, a low score means it is priced richly.

High P/E score (4-5) + High P/B score (4-5):
- Trading at a discount to earnings and assets
- May be undervalued, or may have issues depressing the valuation

Low P/E score (1-2) + Low P/B score (1-2):
- Priced richly on earnings and assets
- May be a quality premium, or an overvalued name

Confirm with the raw multiples when the tool returns them.

### Leverage Profile
Low D/E score (1):
- A weak leverage assessment: the score rises as leverage falls, so 1 flags heavy debt relative to equity
- Inspect the underlying debt-to-equity ratio and the sector norm before drawing a company-specific conclusion
- Capital-intensive sectors carry structurally higher ratios; the score alone does not say whether the debt is a problem

### Growth vs Value Balance
- High profitability + Low valuation = Potential opportunity
- Low profitability + High valuation = Overvalued risk
- Balance suggests fair pricing

## Common Score Combinations

### "Quality Compounder"
- Overall: A or B
- ROE: 4-5
- ROA: 4-5
- D/E: 3-5 (moderate to low leverage)
- P/E: 2-3 (a middling valuation score: the market pays up for quality)

### "Deep Value"
- Overall: C or D
- ROE: 1-3
- ROA: 1-3
- D/E: varies
- P/E: 4-5 (cheap on earnings)
- P/B: 4-5 (cheap on book value)

### "Quality at Fair Price"
- Overall: B
- ROE: 4-5
- ROA: 3-5
- D/E: 3-5 (moderate to low leverage)
- P/E: 3
- P/B: 2-3

### "Growth Premium"
- Overall: B or C
- ROE: 4-5
- ROA: 3-4
- D/E: 2-4
- P/E: 1-2 (expensive on earnings)
- DCF: 2-3 (priced for growth)

## Red Flags

### Concerning Combinations
1. **Low ROE + Low ROA + Low D/E score**: Weak returns carrying heavy leverage
2. **Declining overall rating**: Deteriorating fundamentals
3. **Low DCF + Low P/E score + Low P/B score**: Potentially overvalued on every valuation measure
4. **All low scores**: Multiple fundamental concerns

## Using for Screening

### Initial Filter
Start with:
- Overall Rating >= B
- ROE >= 3
- D/E >= 3 (moderate or low leverage)

### Value Screen
Focus on:
- P/E >= 4 (cheap on earnings)
- P/B >= 4 (cheap on book value)
- DCF >= 3

### Quality Screen
Focus on:
- ROE >= 4
- ROA >= 4
- Overall Rating = A or B

## Follow-up Analysis

```
Retrieve detailed ROE breakdown (DuPont analysis) for AAPL
```

```
Compare P/E and P/B ratios for AAPL vs tech sector average
```

```
What is driving AAPL's high ROE score?
```
