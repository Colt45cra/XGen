import test from 'node:test';
import assert from 'node:assert/strict';
import { appearanceCount, buildAppearancePlan, normalizeAppearance, possibleCombinations } from '../src/generation.mjs';

test('existing layers without an appearance setting remain at 100%', () => {
  const plan = buildAppearancePlan([{ traits: [{}] }], 100, () => 0.5);
  assert.equal(plan[0].filter(Boolean).length, 100);
});

test('layer appearance produces the exact requested share of the supply', () => {
  const plan = buildAppearancePlan([{ appearance: 30, traits: [{}] }], 100, () => 0.42);
  assert.equal(plan[0].filter(Boolean).length, 30);
});

test('appearance counts round to the nearest whole NFT and clamp safely', () => {
  assert.equal(appearanceCount(7, 50), 4);
  assert.equal(appearanceCount(100, -5), 0);
  assert.equal(appearanceCount(100, 105), 100);
  assert.equal(normalizeAppearance(undefined), 100);
});

test('optional layers add a none state to possible combinations', () => {
  assert.equal(possibleCombinations([{ appearance: 100, traits: [{}, {}] }]), 2);
  assert.equal(possibleCombinations([{ appearance: 50, traits: [{}, {}] }]), 3);
  assert.equal(possibleCombinations([{ appearance: 0, traits: [{}, {}] }]), 1);
});
