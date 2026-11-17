import { test, expect, Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://160.16.230.177";
// BASE_URL は、ブランチの場合 http://.../branches/<ブランチ名> の形になる
const BRANCH_NAME = (BASE_URL.match(/\/branches\/([^/]+)/) || [])[1] || "main";
const TARGET_URL = BASE_URL + "/index_task_db.php";
const API_LIST_URL = TARGET_URL + "?api=list";
const API_DELETE_URL = TARGET_URL + "?api=delete";

// テストで作るデータのタイトルは必ずこの接頭辞で始める（CLAUDE.md のルール）
const TITLE_PREFIX = `[TEST-${BRANCH_NAME}]`;
const SCREENSHOT_DIR = "screenshots/test_task_db";

let shotNumber = 0;

// 操作ごとにスクリーンショットを撮る（連番_内容.png）
async function shot(page: Page, name: string) {
  shotNumber += 1;
  const prefix = String(shotNumber).padStart(2, "0");
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${prefix}_${name}.png`, fullPage: true });
}

function column(page: Page, status: string) {
  return page.locator(`[data-dropzone="${status}"]`);
}

function card(page: Page, title: string) {
  return page.locator(".task-card", { hasText: title });
}

// 新規タスクをモーダルから追加する
async function addTask(page: Page, title: string, status: string, priority = "medium") {
  await page.locator("nav [data-add-status]").click();
  await expect(page.locator("#task-modal")).toBeVisible();
  await page.locator("#form-title").fill(title);
  await page.locator(`label[for="priority-${priority}"]`).click();
  await page.locator(`label[for="status-${status}"]`).click();
  await shot(page, "add_modal_filled");
  await page.locator("#form-submit").click();
  await expect(card(page, title)).toBeVisible();
  await expect(page.locator("#task-modal")).toBeHidden();
}

// 自分が作ったテストデータだけを API で削除する
async function cleanup(page: Page) {
  const res = await page.request.get(API_LIST_URL);
  const data = await res.json();
  for (const task of data.tasks) {
    if (String(task.title).startsWith(TITLE_PREFIX)) {
      await page.request.post(API_DELETE_URL, { data: { id: task.id } });
    }
  }
}

test.describe("タスクボード（DB版）", () => {
  test.beforeEach(async ({ page }) => {
    shotNumber = 0;
    await page.goto(TARGET_URL);
  });

  test.afterEach(async ({ page }) => {
    await cleanup(page);
  });

  test("初期表示: 3列とボタンが表示される", async ({ page }) => {
    await expect(page.locator("[data-dropzone]")).toHaveCount(3);
    await expect(page.locator("nav [data-add-status]")).toBeVisible();
    await expect(page.locator("#theme-toggle")).toBeVisible();
    await shot(page, "initial_view");
  });

  test("追加: 再読み込み後も残る", async ({ page }) => {
    const title = `${TITLE_PREFIX} 追加`;
    await addTask(page, title, "todo", "high");
    await shot(page, "after_add");
    await page.reload();
    await expect(column(page, "todo").locator(".task-card", { hasText: title })).toBeVisible();
    await shot(page, "after_reload");
  });

  test("編集: 再読み込み後も残る", async ({ page }) => {
    const title = `${TITLE_PREFIX} 編集前`;
    const newTitle = `${TITLE_PREFIX} 編集後`;
    await addTask(page, title, "todo");
    await card(page, title).dblclick();
    await expect(page.locator("#task-modal")).toBeVisible();
    await page.locator("#form-title").fill(newTitle);
    await page.locator("#form-description").fill("説明文");
    await shot(page, "edit_modal_filled");
    await page.locator("#form-submit").click();
    await expect(card(page, newTitle)).toBeVisible();
    await shot(page, "after_edit");
    await page.reload();
    await expect(card(page, newTitle)).toBeVisible();
    await expect(card(page, newTitle)).toContainText("説明文");
    await expect(card(page, title)).toHaveCount(0);
    await shot(page, "after_reload");
  });

  test("削除: 再読み込み後も消えたまま", async ({ page }) => {
    const title = `${TITLE_PREFIX} 削除`;
    await addTask(page, title, "doing");
    await card(page, title).dblclick();
    await page.locator("#form-delete").click();
    await expect(card(page, title)).toHaveCount(0);
    await shot(page, "after_delete");
    await page.reload();
    await expect(card(page, title)).toHaveCount(0);
    await shot(page, "after_reload");
  });

  test("列の移動（ボタン）: 再読み込み後も移動先に残る", async ({ page }) => {
    const title = `${TITLE_PREFIX} 移動ボタン`;
    await addTask(page, title, "todo");
    await card(page, title).hover();
    await card(page, title).locator('button[aria-label="進行中へ移動"]').click();
    await expect(column(page, "doing").locator(".task-card", { hasText: title })).toBeVisible();
    await shot(page, "after_move");
    await page.reload();
    await expect(column(page, "doing").locator(".task-card", { hasText: title })).toBeVisible();
    await shot(page, "after_reload");
  });

  test("列の移動（ドラッグ＆ドロップ）: 再読み込み後も移動先に残る", async ({ page }) => {
    const title = `${TITLE_PREFIX} ドラッグ`;
    await addTask(page, title, "todo");
    await card(page, title).dragTo(column(page, "done"));
    await expect(column(page, "done").locator(".task-card", { hasText: title })).toBeVisible();
    await shot(page, "after_drag");
    await page.reload();
    await expect(column(page, "done").locator(".task-card", { hasText: title })).toBeVisible();
    await shot(page, "after_reload");
  });

  test("並べ替え: 同じ列内の順番が再読み込み後も残る", async ({ page }) => {
    const first = `${TITLE_PREFIX} 並び1`;
    const second = `${TITLE_PREFIX} 並び2`;
    await addTask(page, first, "doing");
    await addTask(page, second, "doing");
    const titles = async () => {
      const all = await column(page, "doing").locator(".task-title").allTextContents();
      return all.filter((t) => t.startsWith(TITLE_PREFIX));
    };
    expect(await titles()).toEqual([first, second]);
    await shot(page, "before_reorder");
    // 2つ目のカードを、1つ目のカードの上半分へドラッグする
    await card(page, second).dragTo(card(page, first), { targetPosition: { x: 20, y: 5 } });
    await expect.poll(titles).toEqual([second, first]);
    await shot(page, "after_reorder");
    await page.reload();
    await expect.poll(titles).toEqual([second, first]);
    await shot(page, "after_reload");
  });

  test("完了の一括削除: 確認画面でキャンセルするとタスクは残る", async ({ page }) => {
    const title = `${TITLE_PREFIX} 一括削除キャンセル`;
    await addTask(page, title, "done");
    await page.locator('[data-clear-status="done"]').locator("xpath=ancestor::div[contains(@class,'dropdown')]").locator("button[data-bs-toggle='dropdown']").click();
    await page.locator('[data-clear-status="done"]').click();
    await expect(page.locator("#confirm-modal")).toBeVisible();
    await shot(page, "confirm_modal");
    // 実際の一括削除は実行しない（キャンセルまで）
    await page.locator("#confirm-modal button[data-bs-dismiss='modal']").click();
    await expect(page.locator("#confirm-modal")).toBeHidden();
    await expect(card(page, title)).toBeVisible();
    await shot(page, "after_cancel");
    await page.reload();
    await expect(card(page, title)).toBeVisible();
    await shot(page, "after_reload");
  });

  test("ライト/ダーク切り替え: 設定が再読み込み後も残る", async ({ page }) => {
    const html = page.locator("html");
    const before = await html.getAttribute("data-bs-theme");
    await page.locator("#theme-toggle").click();
    const after = before === "dark" ? "light" : "dark";
    await expect(html).toHaveAttribute("data-bs-theme", after);
    await shot(page, "after_toggle");
    await page.reload();
    await expect(html).toHaveAttribute("data-bs-theme", after);
    await shot(page, "after_reload");
    // 元の設定に戻す
    await page.locator("#theme-toggle").click();
    await expect(html).toHaveAttribute("data-bs-theme", before as string);
  });
});
