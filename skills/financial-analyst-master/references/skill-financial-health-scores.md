# Skill: Financial Health Scores

## Purpose

Retrieve Altman Z-Score and Piotroski Score for financial health assessment of public companies.

## When to Use

- Assessing bankruptcy risk
- Evaluating overall financial strength
- Screening for quality investments
- Risk assessment for credit analysis

## Example Prompt

```
Retrieve Altman Z-Score and Piotroski Score for GE
```

## Key Metrics Returned

| Metric | Description |
|--------|-------------|
| Altman Z-Score | Bankruptcy prediction score |
| Piotroski F-Score | Financial strength score (0-9) |
| Zone Classification | Safe/Grey/Distress zone |

## Score Interpretation

### Altman Z-Score
| Score | Zone | Meaning |
|-------|------|---------|
| > 3.0 | Safe | Low bankruptcy risk |
| 1.8 - 3.0 | Grey | Moderate risk |
| < 1.8 | Distress | High bankruptcy risk |

### Piotroski F-Score
| Score | Meaning |
|-------|---------|
| 8-9 | Strong financial health |
| 5-7 | Moderate financial health |
| 0-4 | Weak financial health |

## Integration with Other Skills

- **Validates**: balance-sheet analysis
- **Pairs with**: historical-financial-ratings for trend
- **Supports**: Risk section of report

## Report Section Mapping

| Report Section | Usage |
|----------------|-------|
| Key Risks | Financial stability assessment |
| Valuation | Quality premium/discount |
| Executive Summary | Quick health check |

## Data Source

octagon-financials-agent
