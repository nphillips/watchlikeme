export function generateMarqueeRows<T>(items: T[], rowCount: number): T[][] {
  const rows: T[][] = [];

  for (let i = 0; i < rowCount; i++) {
    const shuffled = [...items];
    for (let j = shuffled.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]];
    }
    if (shuffled[0] === shuffled[shuffled.length - 1]) {
      const swapIdx = Math.floor(Math.random() * (shuffled.length - 1)) + 1;
      [shuffled[0], shuffled[swapIdx]] = [shuffled[swapIdx], shuffled[0]];
    }
    rows.push(shuffled);
  }

  return rows;
}
