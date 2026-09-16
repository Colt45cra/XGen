export function normalizeAppearance(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 100;
  return Math.max(0, Math.min(100, parsed));
}

export function appearanceCount(supply, percentage) {
  return Math.round(Math.max(0, Number(supply) || 0) * normalizeAppearance(percentage) / 100);
}

export function buildAppearancePlan(layers, supply, random = Math.random) {
  const total = Math.max(0, Math.floor(Number(supply) || 0));
  return layers.map((layer) => {
    const plan = Array(total).fill(false);
    const count = appearanceCount(total, layer.appearance ?? 100);
    for (let index = 0; index < count; index += 1) plan[index] = true;
    for (let index = total - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [plan[index], plan[swapIndex]] = [plan[swapIndex], plan[index]];
    }
    return plan;
  });
}

export function possibleCombinations(layers) {
  return layers.reduce((total, layer) => {
    const appearance = normalizeAppearance(layer.appearance ?? 100);
    const traitCount = layer.traits?.length ?? 0;
    const choices = appearance === 0 ? 1 : traitCount + (appearance < 100 ? 1 : 0);
    return total * Math.max(choices, 1);
  }, 1);
}
