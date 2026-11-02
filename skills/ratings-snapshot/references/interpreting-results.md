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

### Value Profile
Low P/E score (1-2) + Low P/B score (1-2):
- Scores run from unattractive (1) to attractive (5), so low scores mean the stock is priced richly on earnings and assets
- May be a quality premium, or an overvalued name
- Confirm with the raw multiples when the tool returns them

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
- D/E: 1-3
- P/E: 2-4 (may pay up for quality)

### "Deep Value"
- Overall: C or D
- ROE: 1-3
- ROA: 1-3
- D/E: varies
- P/E: 1-2
- P/B: 1-2

### "Quality at Fair Price"
- Overall: B
- ROE: 4-5
- ROA: 3-5
- D/E: 1-3
- P/E: 3
- P/B: 2-3

### "Growth Premium"
- Overall: B or C
- ROE: 4-5
- ROA: 3-4
- D/E: 2-4
- P/E: 4-5 (expensive on earnings)
- DCF: 2-3 (priced for growth)

## Red Flags

### Concerning Combinations
1. **Low ROE + Low ROA + High D/E**: Struggling with leverage
2. **Declining overall rating**: Deteriorating fundamentals
3. **Low DCF + High P/E + High P/B**: Potentially overvalued
4. **All low scores**: Multiple fundamental concerns

## Using for Screening

### Initial Filter
Start with:
- Overall Rating >= B
- ROE >= 3
- D/E <= 3

### Value Screen
Focus on:
- P/E <= 2
- P/B <= 2
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
