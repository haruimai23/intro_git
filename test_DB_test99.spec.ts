import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://160.16.230.177";
const PAGE_PATH = "/index_DB_test99.php";
const TARGET_URL = BASE_URL + PAGE_PATH;

const SEL_SHOW_BTN = "#showBtn";
const SEL_CLOSE_BTN = "#closeBtn";
const SEL_LOG_TABLE = "#logTable";
const SEL_NO_DATA = "#noDataMessage";
const SEL_ERROR = "#errorMessage";
const SEL_TABLE_HEADER = "#logTable thead th";

const SUITE_NAME = "DBログテーブル確認画面99";
const TEST_1_NAME = "初期表示: 表示ボタン・閉じるボタンが表示され、ログ一覧・メッセージは表示されない";
const TEST_2_NAME = "表示ボタン押下でログ一覧またはメッセージのいずれかが表示される";
const TEST_3_NAME = "表示ボタン押下後、データがある場合はテーブルの見出しが表示される";
const TEST_4_NAME = "閉じるボタン押下がエラーなく実行できる";
const TEST_5_NAME = "表示ボタンの背景色が青である";

const EXPECTED_SHOW_BTN_BG_COLOR = "rgb(0, 0, 255)";

const ZERO = 0;

// スクリーンショット保存先ディレクトリ
const SCREENSHOT_DIR = "screenshots/test_DB_test99";

test.describe(SUITE_NAME, function () {
  test(TEST_1_NAME, async function ({ page }) {
    await page.goto(TARGET_URL);
    await expect(page.locator(SEL_SHOW_BTN)).toBeVisible();
    await expect(page.locator(SEL_CLOSE_BTN)).toBeVisible();
    await expect(page.locator(SEL_LOG_TABLE)).toHaveCount(ZERO);
    await expect(page.locator(SEL_NO_DATA)).toHaveCount(ZERO);
    await expect(page.locator(SEL_ERROR)).toHaveCount(ZERO);

    // 初期表示状態のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01_initial_view.png`,
      fullPage: true,
    });
  });

  test(TEST_2_NAME, async function ({ page }) {
    await page.goto(TARGET_URL);
    await page.locator(SEL_SHOW_BTN).click();
    const table = page.locator(SEL_LOG_TABLE);
    const noData = page.locator(SEL_NO_DATA);
    const error = page.locator(SEL_ERROR);
    await expect(table.or(noData).or(error)).toBeVisible();

    // 表示ボタン押下後の結果(テーブル/データなし/エラーのいずれか)のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02_after_show_click.png`,
      fullPage: true,
    });
  });

  test(TEST_3_NAME, async function ({ page }) {
    await page.goto(TARGET_URL);
    await page.locator(SEL_SHOW_BTN).click();
    const table = page.locator(SEL_LOG_TABLE);
    const count = await table.count();
    if (count > ZERO) {
      await expect(page.locator(SEL_TABLE_HEADER).first()).toBeVisible();

      // テーブル見出し表示状態のハードコピー
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/03_table_with_header.png`,
        fullPage: true,
      });
    }
  });

  test(TEST_4_NAME, async function ({ page }) {
    await page.goto(TARGET_URL);

    // 閉じるボタン押下前の状態のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04_before_close.png`,
      fullPage: true,
    });

    await page.locator(SEL_CLOSE_BTN).click();
  });

  test(TEST_5_NAME, async function ({ page }) {
    await page.goto(TARGET_URL);
    const showBtn = page.locator(SEL_SHOW_BTN);
    await expect(showBtn).toHaveCSS("background-color", EXPECTED_SHOW_BTN_BG_COLOR);

    // 表示ボタンの背景色確認時のハードコピー
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05_show_btn_blue.png`,
      fullPage: true,
    });
  });
});
