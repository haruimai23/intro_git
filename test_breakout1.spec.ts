import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://160.16.230.177";
const PAGE_PATH = "/index_game_breakout1.html";

// スクリーンショット保存先ディレクトリ
const SCREENSHOT_DIR = "screenshots/test_breakout1";

test.describe("ブロック崩し 1", function () {
  test("初期表示: ボード・スコア欄・ハイスコア欄・残機欄・操作ボタンが表示される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await expect(page.locator("#board")).toBeVisible();
    await expect(page.locator("#score")).toBeVisible();
    await expect(page.locator("#highScore")).toBeVisible();
    await expect(page.locator("#lives")).toBeVisible();
    await expect(page.locator("#startBtn")).toBeVisible();
    await expect(page.locator("#pauseBtn")).toBeVisible();
    await expect(page.locator("#resetHighScoreBtn")).toBeVisible();

    // 初期表示状態のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01_initial_view.png`,
      fullPage: true,
    });
  });

  test("初期スコア・残機: スコア0・残機3が表示される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await expect(page.locator("#score")).toHaveText("0");
    await expect(page.locator("#lives")).toHaveText("3");

    // 初期スコア・残機状態のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02_initial_score.png`,
      fullPage: true,
    });
  });

  test("初期ハイスコア: localStorageが空の場合はハイスコア0が表示される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.evaluate(() => localStorage.removeItem("breakout1HighScore"));
    await page.reload();
    await expect(page.locator("#highScore")).toHaveText("0");
  });

  test("ブロック配置: 画面を開いた直後は40個のブロックが盤面上部に配置されている", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    const state = await page.evaluate(() => (window as any).__test.getState());
    expect(state.bricksAlive).toBe(40);

    // ブロック配置状態のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03_bricks_layout.png`,
      fullPage: true,
    });
  });

  test("スタートボタン押下でゲームが開始し、ボールが移動を始める", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.locator("#startBtn").click();
    const before = await page.evaluate(() => (window as any).__test.getState());
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => (window as any).__test.getState());
    expect(after.running).toBe(true);
    expect(after.ballY).not.toBe(before.ballY);

    // ゲーム開始後のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04_after_start.png`,
      fullPage: true,
    });
  });

  test("左右キーでパドルが移動し、盤面端で停止する", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.locator("#startBtn").click();
    const initial = await page.evaluate(() => (window as any).__test.getState());

    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(50);
    const afterLeft = await page.evaluate(() => (window as any).__test.getState());
    expect(afterLeft.paddleX).toBeLessThan(initial.paddleX);

    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(50);
    const afterRight = await page.evaluate(() => (window as any).__test.getState());
    expect(afterRight.paddleX).toBeGreaterThan(afterLeft.paddleX);

    // 盤面左端まで移動して停止することを確認
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press("ArrowLeft");
    }
    await page.waitForTimeout(50);
    const atLeftEdge = await page.evaluate(() => (window as any).__test.getState());
    expect(atLeftEdge.paddleX).toBe(0);

    // パドル移動後のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05_paddle_moved.png`,
      fullPage: true,
    });
  });

  test("ブロックにボールが当たるとブロックが破壊されスコアが加算される", async function ({ page }) {
    test.setTimeout(30000);
    await page.goto(BASE_URL + PAGE_PATH);
    await page.locator("#startBtn").click();

    let brickBroken = false;
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(200);
      const state = await page.evaluate(() => (window as any).__test.getState());
      if (state.bricksAlive < 40 && state.score > 0) {
        brickBroken = true;
        break;
      }
    }
    expect(brickBroken).toBe(true);

    // ブロック破壊後のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06_brick_broken.png`,
      fullPage: true,
    });
  });

  test("一時停止ボタンで一時停止メッセージが表示され、再度押すと解除される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.locator("#startBtn").click();
    await page.locator("#pauseBtn").click();
    await expect(page.locator("#message")).toHaveText("一時停止中");

    // 一時停止中のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07_paused.png`,
      fullPage: true,
    });

    const paused = await page.evaluate(() => (window as any).__test.getState());
    await page.waitForTimeout(500);
    const stillPaused = await page.evaluate(() => (window as any).__test.getState());
    expect(stillPaused.ballY).toBe(paused.ballY);

    await page.locator("#pauseBtn").click();
    await expect(page.locator("#message")).toHaveText("");

    // 一時停止解除後のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/08_resumed.png`,
      fullPage: true,
    });
  });

  test("ボールを取り逃すと残機が1減る", async function ({ page }) {
    test.setTimeout(30000);
    await page.goto(BASE_URL + PAGE_PATH);
    await page.locator("#startBtn").click();

    // パドルを盤面端に寄せ、中央から発射されるボールを確実に取り逃す
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press("ArrowLeft");
    }

    let livesLost = false;
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(200);
      const state = await page.evaluate(() => (window as any).__test.getState());
      if (state.lives < 3) {
        livesLost = true;
        break;
      }
    }
    expect(livesLost).toBe(true);

    // 残機減少後のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/09_life_lost.png`,
      fullPage: true,
    });
  });

  test("残機が0になるとゲームオーバーメッセージが表示される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.locator("#startBtn").click();
    await page.evaluate(() => (window as any).__test.forceGameOver());
    await expect(page.locator("#message")).toHaveText("ゲームオーバー");
    await expect(page.locator("#lives")).toHaveText("0");

    // ゲームオーバー時のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/10_game_over.png`,
      fullPage: true,
    });
  });

  test("ゲームオーバー後に再スタートすると盤面・スコア・残機が初期化される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.locator("#startBtn").click();
    await page.evaluate(() => (window as any).__test.forceGameOver());
    await expect(page.locator("#message")).toHaveText("ゲームオーバー");

    await page.locator("#startBtn").click();
    await expect(page.locator("#score")).toHaveText("0");
    await expect(page.locator("#lives")).toHaveText("3");
    await expect(page.locator("#message")).toHaveText("");
    const state = await page.evaluate(() => (window as any).__test.getState());
    expect(state.bricksAlive).toBe(40);
    expect(state.gameOver).toBe(false);

    // 再スタート後の初期化状態のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/11_after_restart.png`,
      fullPage: true,
    });
  });

  test("全ブロックを破壊するとクリアメッセージが表示される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.locator("#startBtn").click();
    await page.evaluate(() => (window as any).__test.forceWin());
    await expect(page.locator("#message")).toHaveText("クリア!");

    // クリア時のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/12_cleared.png`,
      fullPage: true,
    });
  });

  test("ハイスコアがlocalStorageに保存され、ページ再読み込み後も保持される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.evaluate(() => localStorage.setItem("breakout1HighScore", "1234"));
    await page.reload();
    await expect(page.locator("#highScore")).toHaveText("1234");

    // ハイスコア保持確認のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/13_high_score_persisted.png`,
      fullPage: true,
    });
  });

  test("ハイスコアをリセットボタンでリセットできる", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.evaluate(() => localStorage.setItem("breakout1HighScore", "999"));
    await page.reload();
    await expect(page.locator("#highScore")).toHaveText("999");
    await page.locator("#resetHighScoreBtn").click();
    await expect(page.locator("#highScore")).toHaveText("0");

    // ハイスコアリセット後のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/14_high_score_reset.png`,
      fullPage: true,
    });
  });
});
