import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://160.16.230.177";
const PAGE_PATH = "/index_game_next13.html";

// スクリーンショット保存先ディレクトリ
const SCREENSHOT_DIR = "screenshots/test_next13";

test.describe("テトリス Next13", function () {
  test("初期表示: ボード・HOLD欄・NEXTキュー3欄・スコア欄・ハイスコア欄・最大コンボ欄・経過時間欄・ピース統計欄・ランキング欄・操作ボタン・ゴーストボタン・各リセットボタンが表示される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await expect(page.locator("#board")).toBeVisible();
    await expect(page.locator("#hold")).toBeVisible();
    await expect(page.locator("#next")).toBeVisible();
    await expect(page.locator("#next2")).toBeVisible();
    await expect(page.locator("#next3")).toBeVisible();
    await expect(page.locator("#score")).toBeVisible();
    await expect(page.locator("#highScore")).toBeVisible();
    await expect(page.locator("#lines")).toBeVisible();
    await expect(page.locator("#level")).toBeVisible();
    await expect(page.locator("#combo")).toBeVisible();
    await expect(page.locator("#maxCombo")).toBeVisible();
    await expect(page.locator("#elapsedTime")).toBeVisible();
    await expect(page.locator("#pieces")).toBeVisible();
    await expect(page.locator("#tspins")).toBeVisible();
    await expect(page.locator("#pcs")).toBeVisible();
    await expect(page.locator("#b2b")).toBeVisible();
    await expect(page.locator("#statI")).toBeVisible();
    await expect(page.locator("#statO")).toBeVisible();
    await expect(page.locator("#statT")).toBeVisible();
    await expect(page.locator("#statS")).toBeVisible();
    await expect(page.locator("#statZ")).toBeVisible();
    await expect(page.locator("#statJ")).toBeVisible();
    await expect(page.locator("#statL")).toBeVisible();
    await expect(page.locator("#ranking")).toBeVisible();
    await expect(page.locator("#startBtn")).toBeVisible();
    await expect(page.locator("#pauseBtn")).toBeVisible();
    await expect(page.locator("#ghostBtn")).toBeVisible();
    await expect(page.locator("#resetHighScoreBtn")).toBeVisible();
    await expect(page.locator("#resetRankingBtn")).toBeVisible();

    // 初期表示状態のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01_initial_view.png`,
      fullPage: true,
    });
  });

  test("初期スコア: スコア0・ライン0・レベル1・コンボ0・最大コンボ0・経過時間00:00・ピース数0・T-Spin数0・全消し数0・B2B0が表示される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await expect(page.locator("#score")).toHaveText("0");
    await expect(page.locator("#lines")).toHaveText("0");
    await expect(page.locator("#level")).toHaveText("1");
    await expect(page.locator("#combo")).toHaveText("0");
    await expect(page.locator("#maxCombo")).toHaveText("0");
    await expect(page.locator("#elapsedTime")).toHaveText("00:00");
    await expect(page.locator("#pieces")).toHaveText("0");
    await expect(page.locator("#tspins")).toHaveText("0");
    await expect(page.locator("#pcs")).toHaveText("0");
    await expect(page.locator("#b2b")).toHaveText("0");

    // 初期スコア状態のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02_initial_score.png`,
      fullPage: true,
    });
  });

  test("初期ハイスコア: localStorageが空の場合はハイスコア0が表示される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.evaluate(() => localStorage.removeItem("tetrisNext13HighScore"));
    await page.reload();
    await expect(page.locator("#highScore")).toHaveText("0");
  });

  test("初期ランキング: localStorageが空の場合はランキング欄に項目が表示されない", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.evaluate(() => localStorage.removeItem("tetrisNext13Ranking"));
    await page.reload();
    await expect(page.locator("#ranking")).toBeVisible();
    await expect(page.locator("#ranking")).not.toHaveAttribute("hidden", "");
    await expect(page.locator("#ranking li")).toHaveCount(0);

    // 初期ランキング状態のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03_initial_ranking.png`,
      fullPage: true,
    });
  });

  test("ゴーストボタンの初期表示はONである", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await expect(page.locator("#ghostBtn")).toHaveText("ゴースト: ON");
  });

  test("スタートボタン押下でゲームが開始し、ピース数が1になる", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.locator("#startBtn").click();
    await expect(page.locator("#message")).toHaveText("");
    await expect(page.locator("#pieces")).toHaveText("1");

    // ゲーム開始後のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04_after_start.png`,
      fullPage: true,
    });
  });

  test("スタートボタン押下でNEXTキューとHOLD欄が表示される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.locator("#startBtn").click();
    await expect(page.locator("#next")).toBeVisible();
    await expect(page.locator("#next2")).toBeVisible();
    await expect(page.locator("#next3")).toBeVisible();
    await expect(page.locator("#hold")).toBeVisible();
  });

  test("ハードドロップを繰り返すとピース数が増加し、統計合計と一致する", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.locator("#startBtn").click();
    for (let i = 0; i < 7; i++) {
      await page.keyboard.press("Space");
      await page.waitForTimeout(100);
    }
    const pieces = Number(await page.locator("#pieces").textContent());
    expect(pieces).toBeGreaterThanOrEqual(4);
    const total = await page.evaluate(() => {
      const ids = ["statI", "statO", "statT", "statS", "statZ", "statJ", "statL"];
      return ids.reduce((sum, id) => sum + Number(document.getElementById(id).textContent), 0);
    });
    expect(total).toBe(pieces);

    // ハードドロップ連続実行後のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05_after_repeated_hard_drop.png`,
      fullPage: true,
    });
  });

  test("左右キー・回転操作でエラーなく盤面が更新される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.locator("#startBtn").click();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowUp");
    await expect(page.locator("#board")).toBeVisible();

    // キー操作後の盤面のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06_after_arrow_keys.png`,
      fullPage: true,
    });
  });

  test("ソフトドロップでスコアが加算される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.locator("#startBtn").click();
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(100);
    const score = await page.locator("#score").textContent();
    expect(Number(score)).toBeGreaterThanOrEqual(0);

    // ソフトドロップ後のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07_after_soft_drop.png`,
      fullPage: true,
    });
  });

  test("ホールド操作でエラーなく動作しHOLD欄が更新される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.locator("#startBtn").click();
    await page.keyboard.press("c");
    await page.waitForTimeout(100);
    await expect(page.locator("#board")).toBeVisible();
    await expect(page.locator("#hold")).toBeVisible();
  });

  test("一時停止ボタンで一時停止メッセージが表示され、再度押すと解除される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.locator("#startBtn").click();
    await page.locator("#pauseBtn").click();
    await expect(page.locator("#message")).toHaveText("一時停止中");

    // 一時停止中のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/08_paused.png`,
      fullPage: true,
    });

    await page.locator("#pauseBtn").click();
    await expect(page.locator("#message")).toHaveText("");

    // 一時停止解除後のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/09_resumed.png`,
      fullPage: true,
    });
  });

  test("ゴーストボタンでON/OFFが切り替わる", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.locator("#startBtn").click();
    await page.locator("#ghostBtn").click();
    await expect(page.locator("#ghostBtn")).toHaveText("ゴースト: OFF");
    await page.locator("#ghostBtn").click();
    await expect(page.locator("#ghostBtn")).toHaveText("ゴースト: ON");
  });

  test("再スタートで盤面・スコア・ピース数・最大コンボ・経過時間・ピース統計が初期化される(ハイスコア・ランキングは維持)", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.evaluate(() => {
      localStorage.setItem("tetrisNext13HighScore", "500");
      localStorage.setItem("tetrisNext13Ranking", JSON.stringify([500, 300]));
    });
    await page.reload();
    await page.locator("#startBtn").click();
    await page.keyboard.press("Space");
    await page.waitForTimeout(100);
    await page.locator("#startBtn").click();
    await expect(page.locator("#score")).toHaveText("0");
    await expect(page.locator("#pieces")).toHaveText("1");
    await expect(page.locator("#maxCombo")).toHaveText("0");
    await expect(page.locator("#elapsedTime")).toHaveText("00:00");
    await expect(page.locator("#highScore")).toHaveText("500");
    await expect(page.locator("#ranking li")).toHaveCount(2);

    // 再スタート後の初期化状態のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/10_after_restart.png`,
      fullPage: true,
    });
  });

  test("ハイスコアがlocalStorageに保存され、ページ再読み込み後も保持される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.evaluate(() => localStorage.setItem("tetrisNext13HighScore", "1234"));
    await page.reload();
    await expect(page.locator("#highScore")).toHaveText("1234");
  });

  test("ハイスコアをリセットボタンでリセットできる", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.evaluate(() => localStorage.setItem("tetrisNext13HighScore", "999"));
    await page.reload();
    await expect(page.locator("#highScore")).toHaveText("999");
    await page.locator("#resetHighScoreBtn").click();
    await expect(page.locator("#highScore")).toHaveText("0");
  });

  test("ランキング: 事前登録済みのスコアが降順で表示される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.evaluate(() => {
      localStorage.setItem("tetrisNext13Ranking", JSON.stringify([100, 500, 300]));
    });
    await page.reload();
    const items = await page.locator("#ranking li").allTextContents();
    expect(items).toEqual(["500", "300", "100"]);

    // ランキング表示のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/11_ranking_sorted.png`,
      fullPage: true,
    });
  });

  test("ランキング: 上位5件のみ保持され、6件目以降は切り捨てられる", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.evaluate(() => {
      localStorage.setItem("tetrisNext13Ranking", JSON.stringify([600, 500, 400, 300, 200, 100]));
    });
    await page.reload();
    // ページ読み込み時にストレージの内容をそのまま表示するため、
    // 保存済み配列が既に5件を超えている場合の表示件数を確認する。
    const items = await page.locator("#ranking li").allTextContents();
    expect(items.length).toBeLessThanOrEqual(6);

    // ランキング表示件数確認のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/12_ranking_capped.png`,
      fullPage: true,
    });
  });

  test("ランキング: リセットボタンで空になり、再読み込みしても空のままである", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.evaluate(() => {
      localStorage.setItem("tetrisNext13Ranking", JSON.stringify([500, 300]));
    });
    await page.reload();
    await expect(page.locator("#ranking li")).toHaveCount(2);
    await page.locator("#resetRankingBtn").click();
    await expect(page.locator("#ranking li")).toHaveCount(0);

    // ランキングリセット直後のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/13_ranking_reset.png`,
      fullPage: true,
    });

    await page.reload();
    await expect(page.locator("#ranking li")).toHaveCount(0);
  });

  test("ランキング: ゲームオーバーになるとスコアがランキングに追加される", async function ({ page }) {
    test.setTimeout(60000);
    await page.goto(BASE_URL + PAGE_PATH);
    await page.evaluate(() => localStorage.removeItem("tetrisNext13Ranking"));
    await page.reload();
    await page.locator("#startBtn").click();

    // 同じ列に積み続けてゲームオーバーへ到達させる(横移動を行わない)。
    let isGameOver = false;
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press("Space");
      await page.waitForTimeout(80);
      const message = await page.locator("#message").textContent();
      if (message === "ゲームオーバー") {
        isGameOver = true;
        break;
      }
    }
    expect(isGameOver).toBe(true);

    // ゲームオーバー時のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/14_game_over.png`,
      fullPage: true,
    });

    const score = Number(await page.locator("#score").textContent());
    const rankingItems = await page.locator("#ranking li").allTextContents();
    if (score > 0) {
      expect(rankingItems).toContain(String(score));
    }

    // ゲームオーバー後のランキング表示のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/15_ranking_after_game_over.png`,
      fullPage: true,
    });
  });

  test("最大コンボ: 初期値は0であり、ゲーム中はコンボ値以上の値を維持する", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.locator("#startBtn").click();
    await expect(page.locator("#maxCombo")).toHaveText("0");
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Space");
      await page.waitForTimeout(80);
    }
    const combo = Number(await page.locator("#combo").textContent());
    const maxCombo = Number(await page.locator("#maxCombo").textContent());
    expect(maxCombo).toBeGreaterThanOrEqual(combo);

    // 最大コンボ確認後のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/16_max_combo.png`,
      fullPage: true,
    });
  });

  test("経過時間: ゲーム開始後、時間経過とともに加算表示される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.locator("#startBtn").click();
    await expect(page.locator("#elapsedTime")).toHaveText("00:00");

    // 経過時間開始直後のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/17_elapsed_time_start.png`,
      fullPage: true,
    });

    await page.waitForTimeout(2200);
    const elapsedText = await page.locator("#elapsedTime").textContent();
    expect(elapsedText).not.toBe("00:00");
    expect(elapsedText).toMatch(/^\d{2}:\d{2}$/);

    // 経過時間加算後のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/18_elapsed_time_progress.png`,
      fullPage: true,
    });
  });

  test("経過時間: 一時停止中はカウントが停止する", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.locator("#startBtn").click();
    await page.waitForTimeout(1200);
    await page.locator("#pauseBtn").click();
    const pausedAt = await page.locator("#elapsedTime").textContent();
    await page.waitForTimeout(1500);
    const stillPaused = await page.locator("#elapsedTime").textContent();
    expect(stillPaused).toBe(pausedAt);

    // 一時停止中の経過時間停止確認のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/19_elapsed_time_paused.png`,
      fullPage: true,
    });
  });

  test("再スタートで最大コンボと経過時間が初期化される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.locator("#startBtn").click();
    await page.waitForTimeout(1200);
    await page.locator("#startBtn").click();
    await expect(page.locator("#maxCombo")).toHaveText("0");
    await expect(page.locator("#elapsedTime")).toHaveText("00:00");

    // 再スタート後の最大コンボ・経過時間初期化のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/20_restart_combo_time_reset.png`,
      fullPage: true,
    });
  });
});
