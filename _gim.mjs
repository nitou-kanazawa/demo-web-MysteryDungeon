import { chromium } from 'playwright-core';
const out = process.argv[2];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 760 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:4173/?seed=4242');
await page.waitForTimeout(500);
await page.evaluate(() => window.app.startSortie(4242));
await page.waitForTimeout(3000);
const rebuild = (floor, overrides, wantTheme, wantLayout) => page.evaluate(([floor, overrides, wantTheme, wantLayout]) => {
  const s = window.app.scene.game.session;
  Object.assign(s.floors.config, overrides);
  for (let i = 0; i < 60; i++) {
    s.state.floor = floor;
    s.floors.build(s.state, s.rng);
    if ((!wantTheme || s.state.theme.id === wantTheme) && (!wantLayout || s.state.layout === wantLayout)) break;
  }
  s.visuals.drain();
  window.app.scene.game.markCurrentTheme();
  window.app.scene.game.anim.items = [];
  s.state.visibility.revealAll();
  const feats = [...s.state.allFeatures].map(([k, f]) => f.kind);
  return { theme: s.state.theme.id, layout: s.state.layout, fog: s.state.fog, features: feats, market: !!s.state.blackMarket, locked: s.state.lockedTiles.size, mirrors: (() => { let n = 0; for (let y = 0; y < s.state.map.height; y++) for (let x = 0; x < s.state.map.width; x++) if (s.state.map.get({ x, y }) === 8) n++; return n; })() };
}, [floor, overrides, wantTheme, wantLayout]);
const shot = async (name) => { await page.waitForTimeout(250); await page.screenshot({ path: `${out}/${name}.png` }); };

console.log('vault', await rebuild(2, { vaultChance: 1, cageChance: 1, mirrorChance: 1, switchChance: 1, alternativeThemes: false, mazeChance: 0, bigRoomChance: 0 }));
await shot('p1_vault_cage_mirror');
console.log('water', await rebuild(3, { switchChance: 1, rollingRockChance: 1, fogChance: 1, mazeChance: 0, bigRoomChance: 0 }));
await shot('p2_water_fog_switch');
console.log('market', await rebuild(4, { blackMarketChance: 1, shopChance: 0, fogChance: 0, rollingRockChance: 0.3 }));
await shot('p3_black_market');
console.log('maze', await rebuild(3, { mazeChance: 1, fogChance: 0 }, undefined, 'maze'));
await shot('p4_maze');
console.log('big', await rebuild(3, { mazeChance: 0, bigRoomChance: 1 }, undefined, 'bigRoom'));
await shot('p5_bigroom');
console.log('ruins', await rebuild(5, { bigRoomChance: 0, alternativeThemes: true }, 'ruins'));
await shot('p6_ruins');
console.log('dark', await rebuild(7, { alternativeThemes: true }, 'dark'));
await shot('p7_dark');
await page.evaluate(() => { const s = window.app.scene.game.session; s.state.player.torch = 0; });
await page.keyboard.press('Period'); // wait a turn if bound; otherwise no-op
await shot('p8_dark_torch_out');
console.log('errors', errors);
await browser.close();
