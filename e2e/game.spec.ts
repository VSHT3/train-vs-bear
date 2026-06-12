import { expect, test, type Page } from '@playwright/test';

async function startSide(page: Page, side: 'TRAIN' | 'BEAR') {
  await page.goto('/?seed=123');
  await expect(page.getByRole('button', { name: `PLAY ${side}` })).toBeEnabled();
  await page.getByRole('button', { name: `PLAY ${side}` }).click();
  await expect(page.getByRole('button', { name: 'Close how to play' })).toBeVisible();
  await page.getByRole('button', { name: 'Close how to play' }).click();
}

test('train flow reaches simulation and opens a complete shared replay', async ({ page }) => {
  await startSide(page, 'TRAIN');
  await expect(page.getByText('Train Crew · Round 1/7')).toBeVisible();

  await page.getByRole('button', { name: 'READY — See Bear Intel' }).click();
  await expect(page.getByRole('heading', { name: '🕵️ Bear Intel — Round 1' })).toBeVisible();
  await page.getByRole('button', { name: 'RUN SIMULATION' }).click();
  await expect(page.getByRole('heading', { name: '🚂 Break Through the Defense' })).toBeVisible();

  await page.getByRole('button', { name: 'Share replay' }).click();
  await expect(page.getByRole('button', { name: 'Replay link copied' })).toBeVisible();

  const replayUrl = await page.evaluate(() => navigator.clipboard.readText());
  expect(replayUrl).toContain('?replay=');
  expect(replayUrl).not.toContain('?seed=');

  await page.goto(replayUrl);
  await expect(page.getByRole('heading', { name: '🔁 Replay Viewer' })).toBeVisible();
  await expect(page.getByText('This replay contains the exact train stats, flags, bear plan, perspective, target distance, and simulation seed.')).toBeVisible();

  const timeline = page.getByLabel('Replay timeline');
  const maximum = await timeline.getAttribute('max');
  expect(maximum).not.toBeNull();
  await timeline.fill(maximum!);
  await expect(page.getByText(/TRAIN BREAKS THROUGH|TRAIN STOPPED/)).toBeVisible();
});

test('bear flow places a unit, inspects the train, and starts defense playback', async ({ page }) => {
  await startSide(page, 'BEAR');
  await expect(page.getByRole('heading', { name: '🐻 Bear Defense Shop' })).toBeVisible();

  await page.getByRole('button', { name: 'Place 🐻 Bear at 1.5 km · 10 credits' }).click();
  await expect(page.getByText('🐾 370 credits')).toBeVisible();

  await page.getByRole('button', { name: 'READY — Inspect Incoming Train' }).click();
  await expect(page.getByRole('heading', { name: '🚂 Incoming Train Intel — Round 1' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Handcar of Despair' })).toBeVisible();

  await page.getByRole('button', { name: 'RUN SIMULATION' }).click();
  await expect(page.getByRole('heading', { name: '🐻 Defend the Finish Line' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Share replay' })).toBeVisible();
});

test('invalid replay links fail closed and keep the game playable', async ({ page }) => {
  await page.goto('/?replay=not-a-valid-replay');
  await expect(page.getByText('This replay link is invalid, unsupported, or too large.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'PLAY TRAIN' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'PLAY BEAR' })).toBeVisible();
});
