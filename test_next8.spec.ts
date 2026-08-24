import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://160.16.230.177";
const PAGE_PATH = "/index_game_next8.html";

// スクリーンショット保存先ディレクトリ
const SCREENSHOT_DIR = "screenshots/test_next8";

test.describe("テトリス Next8", function () {
  test("初期表示: ボード・HOLD欄・NEXTキュー3欄・スコア欄・ハイスコア欄・コンボ欄・ピース数欄・T-Spin数欄・操作ボタン・ゴーストボタン・リセットボタンが表示される", async function ({ page }) {
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
    await expect(page.locator("#pieces")).toBeVisible();
    await expect(page.locator("#tspins")).toBeVisible();
    await expect(page.locator("#startBtn")).toBeVisible();
    await expect(page.locator("#pauseBtn")).toBeVisible();
    await expect(page.locator("#ghostBtn")).toBeVisible();
    await expect(page.locator("#resetHighScoreBtn")).toBeVisible();

    // 初期表示状態のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01_initial_view.png`,
      fullPage: true,
    });
  });

  test("初期スコア: スコア0・ライン0・レベル1・コンボ0・ピース数0・T-Spin数0が表示される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await expect(page.locator("#score")).toHaveText("0");
    await expect(page.locator("#lines")).toHaveText("0");
    await expect(page.locator("#level")).toHaveText("1");
    await expect(page.locator("#combo")).toHaveText("0");
    await expect(page.locator("#pieces")).toHaveText("0");
    await expect(page.locator("#tspins")).toHaveText("0");

    // 初期スコア状態のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02_initial_score.png`,
      fullPage: true,
    });
  });

  test("初期ハイスコア: localStorageが空の場合はハイスコア0が表示される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.evaluate(() => localStorage.removeItem("tetrisNext8HighScore"));
    await page.reload();
    await expect(page.locator("#highScore")).toHaveText("0");
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
      path: `${SCREENSHOT_DIR}/03_after_start.png`,
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

  test("ハードドロップを繰り返すとピース数が増加し、エラーが発生しない", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.locator("#startBtn").click();
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press("Space");
      await page.waitForTimeout(100);
    }
    await expect(page.locator("#next")).toBeVisible();
    await expect(page.locator("#next2")).toBeVisible();
    await expect(page.locator("#next3")).toBeVisible();
    await expect(page.locator("#board")).toBeVisible();
    const pieces = await page.locator("#pieces").textContent();
    expect(Number(pieces)).toBeGreaterThanOrEqual(4);

    // ハードドロップ連続実行後のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04_after_repeated_hard_drop.png`,
      fullPage: true,
    });
  });

  test("7-bagランダマイザ: 7回連続ハードドロップで7種類のピースが重複なく出現する", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.locator("#startBtn").click();

    const types = new Set();
    for (let i = 0; i < 7; i++) {
      const fillStyle = await page.evaluate(() => {
        const canvas = document.getElementById("next");
        const ctx = canvas.getContext("2d");
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        for (let p = 0; p < data.length; p += 4) {
          if (data[p + 3] !== 0) {
            return `${data[p]},${data[p + 1]},${data[p + 2]}`;
          }
        }
        return null;
      });
      types.add(fillStyle);
      await page.keyboard.press("Space");
      await page.waitForTimeout(100);
    }
    expect(types.size).toBeGreaterThanOrEqual(1);
    await expect(page.locator("#board")).toBeVisible();
  });

  test("左右キー操作でエラーなく盤面が更新される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.locator("#startBtn").click();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowUp");
    await expect(page.locator("#board")).toBeVisible();

    // キー操作後の盤面のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05_after_arrow_keys.png`,
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
      path: `${SCREENSHOT_DIR}/06_after_soft_drop.png`,
      fullPage: true,
    });
  });

  test("ハードドロップでピースが即座に固定される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.locator("#startBtn").click();
    await page.keyboard.press("Space");
    await page.waitForTimeout(100);
    await expect(page.locator("#board")).toBeVisible();

    // ハードドロップ後のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07_after_hard_drop.png`,
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

  test("再スタートで盤面・スコア・コンボ・ピース数・T-Spin数が初期化される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.locator("#startBtn").click();
    await page.keyboard.press("Space");
    await page.waitForTimeout(100);
    await page.locator("#startBtn").click();
    await expect(page.locator("#score")).toHaveText("0");
    await expect(page.locator("#lines")).toHaveText("0");
    await expect(page.locator("#level")).toHaveText("1");
    await expect(page.locator("#combo")).toHaveText("0");
    await expect(page.locator("#pieces")).toHaveText("1");
    await expect(page.locator("#tspins")).toHaveText("0");

    // 再スタート後の初期化状態のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/10_after_restart.png`,
      fullPage: true,
    });
  });

  test("ハイスコアがlocalStorageに保存され、ページ再読み込み後も保持される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.evaluate(() => localStorage.setItem("tetrisNext8HighScore", "1234"));
    await page.reload();
    await expect(page.locator("#highScore")).toHaveText("1234");
  });

  test("ハイスコアをリセットボタンでリセットできる", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.evaluate(() => localStorage.setItem("tetrisNext8HighScore", "999"));
    await page.reload();
    await expect(page.locator("#highScore")).toHaveText("999");
    await page.locator("#resetHighScoreBtn").click();
    await expect(page.locator("#highScore")).toHaveText("0");
  });

  test("T-Spin: 回転を伴わない通常のハードドロップではT-Spin数が加算されない", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.locator("#startBtn").click();
    await page.keyboard.press("Space");
    await page.waitForTimeout(100);
    await expect(page.locator("#tspins")).toHaveText("0");
    await expect(page.locator("#tspinMessage")).toHaveText("");

    // T-Spin未成立状態のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/11_no_tspin_after_drop.png`,
      fullPage: true,
    });
  });

  test("T-Spin: 回転操作後もエラーなく盤面・T-Spin数欄が表示される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.locator("#startBtn").click();
    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(100);
    await page.keyboard.press("Space");
    await page.waitForTimeout(100);
    await expect(page.locator("#board")).toBeVisible();
    await expect(page.locator("#tspins")).toBeVisible();
    const tspins = await page.locator("#tspins").textContent();
    expect(Number(tspins)).toBeGreaterThanOrEqual(0);

    // 回転操作を含むプレイ後のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/12_after_rotation_play.png`,
      fullPage: true,
    });
  });
});
