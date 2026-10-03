// Pick up to n links spread down the viewport, unique by href.
module.exports = function select(links, n) {
  const seen = new Set();
  const uniq = links.filter(l => !seen.has(l.href) && seen.add(l.href)).sort((a, b) => a.y - b.y || a.x - b.x);
  // Prefer shadow-DOM / SVG links when present: they are the rarer cases.
  const special = uniq.filter(l => l.shadow || l.svg).slice(0, 2);
  const rest = uniq.filter(l => !special.includes(l));
  const step = rest.length / Math.max(1, n - special.length);
  const picked = [...special];
  for (let i = 0; picked.length < n && i < rest.length; i++) picked.push(rest[Math.floor(i * step)]);
  return picked.filter(Boolean).slice(0, n);
};
