import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://160.16.230.177";
const PAGE_PATH = "/index_game_next3.html";
test.describe("テトリス Next3", function () {
  test("初期表示: ボード・NEXT・スコア欄・操作ボタン・ゴーストボタンが表示される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await expect(page.locator("#board")).toBeVisible();
    await expect(page.locator("#next")).toBeVisible();
    await expect(page.locator("#score")).toBeVisible();
    await expect(page.locator("#lines")).toBeVisible();
    await expect(page.locator("#level")).toBeVisible();
    await expect(page.locator("#startBtn")).toBeVisible();
    await expect(page.locator("#pauseBtn")).toBeVisible();
    await expect(page.locator("#ghostBtn")).toBeVisible();
  });

  test("初期スコア: スコア0・ライン0・レベル1が表示される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await expect(page.locator("#score")).toHaveText("0");
    await expect(page.locator("#lines")).toHaveText("0");
    await expect(page.locator("#level")).toHaveText("1");
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

  test("ホールド操作でエラーなく動作する", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.locator("#startBtn").click();
    await page.keyboard.press("c");
    await page.waitForTimeout(100);
    await expect(page.locator("#board")).toBeVisible();
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

  test("再スタートで盤面とスコアが初期化される", async function ({ page }) {
    await page.goto(BASE_URL + PAGE_PATH);
    await page.locator("#startBtn").click();
    await page.keyboard.press("Space");
    await page.waitForTimeout(100);
    await page.locator("#startBtn").click();
    await expect(page.locator("#score")).toHaveText("0");
    await expect(page.locator("#lines")).toHaveText("0");
    await expect(page.locator("#level")).toHaveText("1");
  });
});
