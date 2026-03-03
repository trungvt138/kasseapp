import { calculateChange, generateQuickCash } from '../utils/logic';

describe('calculateChange', () => {
  it('returns positive change when cash exceeds total', () => {
    expect(calculateChange(20, 13.5)).toBeCloseTo(6.5);
  });

  it('returns zero when cash equals total exactly', () => {
    expect(calculateChange(10, 10)).toBe(0);
  });

  it('returns negative when cash is short', () => {
    expect(calculateChange(5, 8.0)).toBeCloseTo(-3.0);
  });

  it('handles very small totals (e.g. €0.50 coffee)', () => {
    expect(calculateChange(1, 0.5)).toBeCloseTo(0.5);
  });

  it('handles large totals (e.g. catering order)', () => {
    expect(calculateChange(500, 347.89)).toBeCloseTo(152.11);
  });

  it('handles zero cash', () => {
    expect(calculateChange(0, 15.0)).toBeCloseTo(-15.0);
  });
});

describe('generateQuickCash', () => {
  it('always returns amounts >= total', () => {
    const amounts = generateQuickCash(13.50);
    amounts.forEach(a => expect(a).toBeGreaterThanOrEqual(13.50));
  });

  it('returns unique values only', () => {
    const amounts = generateQuickCash(10);
    const unique = new Set(amounts);
    expect(unique.size).toBe(amounts.length);
  });

  it('returns at most 4 options', () => {
    expect(generateQuickCash(7.30).length).toBeLessThanOrEqual(4);
  });

  it('includes exact rounded-up value for a whole-euro total', () => {
    // Total = €10.00 exactly → Math.ceil(10) = 10, should appear
    const amounts = generateQuickCash(10);
    expect(amounts).toContain(10);
  });

  it('rounds up to next euro for a decimal total', () => {
    // Total = €13.50 → Math.ceil(13.50) = 14
    const amounts = generateQuickCash(13.5);
    expect(amounts[0]).toBe(14);
  });

  it('handles a total that is already a round 50', () => {
    const amounts = generateQuickCash(50);
    expect(amounts).toContain(50);
  });

  it('handles a very small total (€0.10)', () => {
    const amounts = generateQuickCash(0.1);
    amounts.forEach(a => expect(a).toBeGreaterThanOrEqual(0.1));
  });

  it('handles a total of €0', () => {
    // Edge case: empty cart somehow reaches checkout
    const amounts = generateQuickCash(0);
    // Math.ceil(0) = 0, but all filters still apply
    amounts.forEach(a => expect(a).toBeGreaterThanOrEqual(0));
  });

  // Stress: many different totals produce valid results
  it('produces valid results for 500 random totals', () => {
    for (let i = 0; i < 500; i++) {
      const total = Math.random() * 200;
      const amounts = generateQuickCash(total);
      expect(amounts.length).toBeGreaterThanOrEqual(0);
      expect(amounts.length).toBeLessThanOrEqual(4);
      amounts.forEach(a => expect(a).toBeGreaterThanOrEqual(total));
    }
  });
});
