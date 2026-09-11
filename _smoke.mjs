import { chromium } from 'playwright-core';
const out = process.argv[2];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 760 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text()); });
await page.goto('http://localhost:4173/?seed=555');
await page.waitForTimeout(500);
// settings screen: walk to house, open, choose 設定
await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(700); await page.keyboard.up('ArrowLeft'); await page.waitForTimeout(150);
await page.keyboard.press('ArrowUp'); await page.waitForTimeout(150);
await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
await page.screenshot({ path: `${out}/s1_settings.png` });
console.log('audio ready', await page.evaluate(() => window.app.sound.engine.ready), 'mode', await page.evaluate(() => JSON.stringify(window.app.baseCtrl.mode)));
await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await page.waitForTimeout(100);
// sortie via debug and play some turns
await page.evaluate(() => window.app.startSortie(555));
await page.waitForTimeout(3000);
for (const k of ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown', 'Period', 'ArrowLeft', 'ArrowUp']) { await page.keyboard.press(k); await page.waitForTimeout(150); }
const before = await page.evaluate(() => { const s = window.app.scene.game.session; return { turn: s.state.turn, pos: s.state.player.pos, cmds: s.history.length, saved: !!localStorage.getItem('mysterydungeon.sortie.v1') }; });
console.log('before reload', before);
await page.reload();
await page.waitForTimeout(800);
const after = await page.evaluate(() => { const a = window.app; if (a.scene.kind !== 'dungeon') return { scene: a.scene.kind }; const s = a.scene.game.session; return { scene: 'dungeon', resumed: a.resumed, turn: s.state.turn, pos: s.state.player.pos, cmds: s.history.length, last: s.log.recent(1) }; });
console.log('after reload', after);
await page.screenshot({ path: `${out}/s2_resumed.png` });
// ranch idle allies screenshot
await page.evaluate(() => { const g = window.app.scene.game; g.session.state.status = 'escaped'; g.exitRequested = true; });
await page.waitForTimeout(4200);
await page.keyboard.press('Enter'); await page.waitForTimeout(200);
await page.evaluate(() => { const b = window.app.base; const mk = (d, l) => ({ defId: d, level: l, exp: 0, bonusHp: 0, bonusAtk: 0, bonusDef: 0 }); b.addAlly(mk('slime', 2), true); b.addAlly(mk('dracky', 1), false); b.addAlly(mk('hammerhood', 1), false); });
await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(4200); await page.keyboard.up('ArrowLeft');
await page.waitForTimeout(300);
console.log('hero x', await page.evaluate(() => window.app.baseCtrl.hero.x), 'saved after return', await page.evaluate(() => !!localStorage.getItem('mysterydungeon.sortie.v1')));
await page.screenshot({ path: `${out}/s3_ranch.png` });
console.log('errors', errors);
await browser.close();
