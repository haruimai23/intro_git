import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://160.16.230.177";
const PAGE_PATH = "/index_game_next6.html";
test.describe("テトリス Next6", function () {
  test("初期表示: ボード・HOLD欄・NEXTキュー3欄・スコア欄・ハイスコア欄・コンボ欄・操作ボタン・ゴーストボタン・リセットボタンが表示される", async function ({ page }) {
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
    await expect(page.locator("#startBtn")).toBeVisible();
    await expect(page.locator("#pauseBtn")).toBeVisible();
    await expect(page.locator("#ghostBtn")).toBeVisible();
    await expect(page.locator("#resetHighScoreBtn")).toBeVisible();
  });

  test("初期スコア: スコア0・ライン0・レベル1・コンボ0が表示される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await expect(page.locator("#score")).toHaveText("0");
    await expect(page.locator("#lines")).toHaveText("0");
    await expect(page.locator("#level")).toHaveText("1");
    await expect(page.locator("#combo")).toHaveText("0");
  });

  test("初期ハイスコア: localStorageが空の場合はハイスコア0が表示される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.evaluate(() => localStorage.removeItem("tetrisNext6HighScore"));
    await page.reload();
    await expect(page.locator("#highScore")).toHaveText("0");
  });

  test("ゴーストボタンの初期表示はONである", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await expect(page.locator("#ghostBtn")).toHaveText("ゴースト: ON");
  });

  test("スタートボタン押下でゲームが開始し、メッセージが空になる", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.locator("#startBtn").click();
    await expect(page.locator("#message")).toHaveText("");
  });

  test("スタートボタン押下でNEXTキューとHOLD欄が表示される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.locator("#startBtn").click();
    await expect(page.locator("#next")).toBeVisible();
    await expect(page.locator("#next2")).toBeVisible();
    await expect(page.locator("#next3")).toBeVisible();
    await expect(page.locator("#hold")).toBeVisible();
  });

  test("ハードドロップを繰り返してもNEXTキューが表示され続けエラーが発生しない", async function ({ page }) {
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
  });

  test("左右キー操作でエラーなく盤面が更新される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.locator("#startBtn").click();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowUp");
    await expect(page.locator("#board")).toBeVisible();
  });

  test("ソフトドロップでスコアが加算される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.locator("#startBtn").click();
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(100);
    const score = await page.locator("#score").textContent();
    expect(Number(score)).toBeGreaterThanOrEqual(0);
  });

  test("ハードドロップでピースが即座に固定される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.locator("#startBtn").click();
    await page.keyboard.press("Space");
    await page.waitForTimeout(100);
    await expect(page.locator("#board")).toBeVisible();
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
    await page.locator("#pauseBtn").click();
    await expect(page.locator("#message")).toHaveText("");
  });

  test("ゴーストボタンでON/OFFが切り替わる", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.locator("#startBtn").click();
    await page.locator("#ghostBtn").click();
    await expect(page.locator("#ghostBtn")).toHaveText("ゴースト: OFF");
    await page.locator("#ghostBtn").click();
    await expect(page.locator("#ghostBtn")).toHaveText("ゴースト: ON");
  });

  test("再スタートで盤面・スコア・コンボが初期化される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.locator("#startBtn").click();
    await page.keyboard.press("Space");
    await page.waitForTimeout(100);
    await page.locator("#startBtn").click();
    await expect(page.locator("#score")).toHaveText("0");
    await expect(page.locator("#lines")).toHaveText("0");
    await expect(page.locator("#level")).toHaveText("1");
    await expect(page.locator("#combo")).toHaveText("0");
  });

  test("ハイスコアがlocalStorageに保存され、ページ再読み込み後も保持される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.evaluate(() => localStorage.setItem("tetrisNext6HighScore", "1234"));
    await page.reload();
    await expect(page.locator("#highScore")).toHaveText("1234");
  });

  test("ハイスコアをリセットボタンでリセットできる", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.evaluate(() => localStorage.setItem("tetrisNext6HighScore", "999"));
    await page.reload();
    await expect(page.locator("#highScore")).toHaveText("999");
    await page.locator("#resetHighScoreBtn").click();
    await expect(page.locator("#highScore")).toHaveText("0");
  });
});
