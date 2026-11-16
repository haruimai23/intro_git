// TaskBoard（カンバン）Bootstrap 版
// 未着手／進行中／完了の3列。カードはドラッグ＆ドロップで列間を移動できる。
// タスクは localStorage に保存され、ブラウザを閉じても残る。

const STORAGE_KEY = "task-app.tasks";
const THEME_KEY = "task-app.theme";

const STATUSES = ["todo", "doing", "done"];
const STATUS_LABELS = { todo: "未着手", doing: "進行中", done: "完了" };
const STATUS_ICONS = { todo: "bi-circle", doing: "bi-hourglass-split", done: "bi-check2-circle" };
const PRIORITY_LABELS = { high: "高", medium: "中", low: "低" };
// 優先度ごとの Bootstrap の色（badge に使う）
const PRIORITY_COLORS = { high: "danger", medium: "warning", low: "success" };

// ===== 状態 =====
// { id, title, description, priority, status, createdAt } の配列。
// 配列の並び順が、各列の中での表示順になる。
let tasks = loadTasks();
let editingId = null;      // 編集中のタスクの id（新規追加のときは null）
let draggingCard = null;   // ドラッグ中のカード要素
let undoSnapshot = null;   // 「元に戻す」用に、削除前の状態を保存しておく
let pendingClear = null;   // 一括削除の確認中の列

// ===== 画面の要素 =====
const totalCount = document.getElementById("total-count");
const dropzones = document.querySelectorAll("[data-dropzone]");

const modalEl = document.getElementById("task-modal");
const modalIcon = document.getElementById("task-modal-icon");
const modalText = document.getElementById("task-modal-text");
const taskForm = document.getElementById("task-form");
const formTitle = document.getElementById("form-title");
const formDescription = document.getElementById("form-description");
const formDelete = document.getElementById("form-delete");
const formSubmit = document.getElementById("form-submit");

const confirmModalEl = document.getElementById("confirm-modal");
const confirmMessage = document.getElementById("confirm-message");
const confirmOk = document.getElementById("confirm-ok");

const toastEl = document.getElementById("app-toast");
const toastIcon = document.getElementById("toast-icon");
const toastMessage = document.getElementById("toast-message");
const toastUndo = document.getElementById("toast-undo");

const themeToggle = document.getElementById("theme-toggle");
const themeIcon = document.getElementById("theme-icon");

// ===== 保存・読み込み =====
function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(saved)) return [];
    // 以前のリスト版のデータ（text / completed）も、カンバン版の形にそろえる
    return saved.map((t) => ({
      id: t.id,
      title: t.title ?? t.text ?? "",
      description: t.description ?? "",
      priority: PRIORITY_LABELS[t.priority] ? t.priority : "medium",
      status: STATUSES.includes(t.status) ? t.status : (t.completed ? "done" : "todo"),
      createdAt: t.createdAt ?? Date.now(),
    }));
  } catch (error) {
    // 保存データが壊れている、または localStorage が使えない場合は空から始める
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.warn("タスクを保存できませんでした:", error);
  }
}

// 削除の前に今の状態を控えておく（「元に戻す」用）
function rememberForUndo() {
  undoSnapshot = JSON.parse(JSON.stringify(tasks));
}

// ===== 操作 =====
function addTask(fields) {
  tasks.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    ...fields,
    createdAt: Date.now(),
  });
  saveTasks();
  render();
  showToast(`「${fields.title}」を${STATUS_LABELS[fields.status]}に追加しました`);
}

function updateTask(id, changes, { silent = false } = {}) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  const statusChanged = changes.status && changes.status !== task.status;
  Object.assign(task, changes);
  if (statusChanged) {
    // 列を変えたときは、移動先の列の一番下に置く
    tasks = tasks.filter((t) => t.id !== id).concat(task);
  }
  saveTasks();
  render();
  if (!silent) showToast(`「${task.title}」を更新しました`);
}

function moveTask(id, status) {
  const task = tasks.find((t) => t.id === id);
  if (!task || task.status === status) return;
  updateTask(id, { status }, { silent: true });
  showToast(`「${task.title}」を${STATUS_LABELS[status]}へ移動しました`, { icon: STATUS_ICONS[status], color: "primary" });
}

function deleteTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  rememberForUndo();
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  render();
  showToast(`「${task.title}」を削除しました`, { icon: "bi-trash3", color: "danger", undo: true });
}

function clearColumn(status) {
  const count = tasks.filter((t) => t.status === status).length;
  if (count === 0) return;
  rememberForUndo();
  tasks = tasks.filter((t) => t.status !== status);
  saveTasks();
  render();
  showToast(`${STATUS_LABELS[status]}の ${count} 件を削除しました`, { icon: "bi-trash3", color: "danger", undo: true });
}

function undo() {
  if (!undoSnapshot) return;
  tasks = undoSnapshot;
  undoSnapshot = null;
  saveTasks();
  render();
  showToast("元に戻しました", { icon: "bi-arrow-counterclockwise", color: "primary" });
}

// ===== トースト通知 =====
function showToast(message, { icon = "bi-check-circle-fill", color = "success", undo = false } = {}) {
  if (!window.bootstrap) return;
  toastIcon.className = `bi ${icon} text-${color}`;
  toastMessage.textContent = message;
  toastUndo.hidden = !undo;
  bootstrap.Toast.getOrCreateInstance(toastEl, { delay: undo ? 6000 : 3000 }).show();
}

toastUndo.addEventListener("click", () => {
  bootstrap.Toast.getOrCreateInstance(toastEl).hide();
  undo();
});

// ===== 描画 =====
function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;  // textContent なので HTML として解釈されない
  return element;
}

function icon(name, extra = "") {
  return el("i", `bi ${name} ${extra}`.trim());
}

function formatDate(time) {
  const d = new Date(time);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function createCard(task) {
  const card = el("article", `card task-card shadow-sm rounded-3 priority-${task.priority}`);
  card.draggable = true;
  card.dataset.id = task.id;

  const body = el("div", "card-body p-3");

  // タイトル・説明
  body.append(el("h3", "task-title h6 fw-semibold mb-1", task.title));
  if (task.description) {
    body.append(el("p", "task-description small text-body-secondary mb-2", task.description));
  }

  // 下段：優先度・作成日・列移動ボタン
  const meta = el("div", "d-flex align-items-center gap-2 mt-2");

  const color = PRIORITY_COLORS[task.priority];
  const badge = el("span", `badge rounded-pill bg-${color}-subtle text-${color}-emphasis fw-semibold`);
  badge.append(icon("bi-flag-fill", "me-1"), document.createTextNode(PRIORITY_LABELS[task.priority]));
  badge.title = "優先度：" + PRIORITY_LABELS[task.priority];

  const date = el("span", "small text-body-tertiary");
  date.append(icon("bi-calendar3", "me-1"), document.createTextNode(formatDate(task.createdAt)));
  date.title = "作成日";

  const moves = el("div", "btn-group btn-group-sm ms-auto move-buttons");
  moves.setAttribute("role", "group");
  const index = STATUSES.indexOf(task.status);
  if (index > 0) {
    moves.append(makeMoveButton("bi-chevron-left", STATUSES[index - 1], task.id));
  }
  if (index < STATUSES.length - 1) {
    moves.append(makeMoveButton("bi-chevron-right", STATUSES[index + 1], task.id));
  }

  meta.append(badge, date, moves);
  body.append(meta);
  card.append(body, createCardMenu(task));

  // ダブルクリックで編集
  card.addEventListener("dblclick", (event) => {
    if (event.target.closest("button, .dropdown-menu")) return;
    openModal({ id: task.id });
  });

  // ドラッグ開始・終了
  card.addEventListener("dragstart", (event) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", task.id);
    draggingCard = card;
    // ドラッグ中の見た目は、ドラッグ用の画像が作られた後に変える
    requestAnimationFrame(() => card.classList.add("dragging"));
  });
  card.addEventListener("dragend", () => {
    draggingCard = null;
    card.classList.remove("dragging");
    dropzones.forEach((zone) => zone.classList.remove("drag-over"));
    // 列の外で離した場合などに、表示を保存内容に戻す
    render();
  });

  return card;
}

// カード右上の「︙」メニュー（編集・移動・削除）
function createCardMenu(task) {
  const menu = el("div", "dropdown card-menu");

  const toggle = el("button", "btn btn-sm btn-link text-body-secondary px-1");
  toggle.type = "button";
  toggle.dataset.bsToggle = "dropdown";
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "カードのメニュー");
  toggle.append(icon("bi-three-dots-vertical"));

  const list = el("ul", "dropdown-menu dropdown-menu-end shadow border-0");

  const addItem = (iconName, label, onClick, extraClass = "") => {
    const li = el("li");
    const button = el("button", `dropdown-item ${extraClass}`.trim());
    button.type = "button";
    button.append(icon(iconName, "me-2"), document.createTextNode(label));
    button.addEventListener("click", onClick);
    li.append(button);
    list.append(li);
  };

  const addDivider = () => {
    const li = el("li");
    li.append(el("hr", "dropdown-divider"));
    list.append(li);
  };

  addItem("bi-pencil", "編集", () => openModal({ id: task.id }));
  addDivider();
  STATUSES.filter((s) => s !== task.status).forEach((status) => {
    addItem(STATUS_ICONS[status], `${STATUS_LABELS[status]}へ移動`, () => moveTask(task.id, status));
  });
  addDivider();
  addItem("bi-trash3", "削除", () => deleteTask(task.id), "text-danger");

  menu.append(toggle, list);
  return menu;
}

function makeMoveButton(iconName, status, id) {
  const button = el("button", "btn btn-outline-secondary border-0");
  button.type = "button";
  button.title = `${STATUS_LABELS[status]}へ移動`;
  button.setAttribute("aria-label", `${STATUS_LABELS[status]}へ移動`);
  button.append(icon(iconName));
  button.addEventListener("click", () => moveTask(id, status));
  return button;
}

function render() {
  const counts = {};

  dropzones.forEach((zone) => {
    const status = zone.dataset.dropzone;
    const columnTasks = tasks.filter((t) => t.status === status);
    counts[status] = columnTasks.length;

    if (columnTasks.length === 0) {
      const empty = el("div", "empty-column");
      empty.append(icon("bi-inbox"), el("span", "small", "ここにカードをドラッグ"));
      zone.replaceChildren(empty);
    } else {
      zone.replaceChildren(...columnTasks.map(createCard));
    }

    document.querySelector(`[data-count="${status}"]`).textContent = columnTasks.length;
    document.querySelector(`[data-legend="${status}"]`).textContent = columnTasks.length;
    document.querySelector(`[data-clear-status="${status}"]`).disabled = columnTasks.length === 0;
  });

  totalCount.textContent = `${tasks.length}件のタスク`;

  // 積み上げ進捗バー（完了・進行中・未着手の割合）
  const total = tasks.length || 1;
  STATUSES.forEach((status) => {
    const bar = document.getElementById(`bar-${status}`);
    const percent = (counts[status] / total) * 100;
    bar.style.width = percent + "%";
    bar.setAttribute("aria-valuenow", String(Math.round(percent)));
  });
  const donePercent = tasks.length === 0 ? 0 : Math.round((counts.done / tasks.length) * 100);
  document.getElementById("progress-percent").textContent = `達成率 ${donePercent}%`;
}

// ===== ドラッグ＆ドロップ =====
// マウスの高さから、どのカードの前に差し込むかを求める（なければ列の最後）
function getCardAfter(zone, mouseY) {
  const cards = [...zone.querySelectorAll(".task-card")].filter((card) => card !== draggingCard);
  return cards.find((card) => {
    const box = card.getBoundingClientRect();
    return mouseY < box.top + box.height / 2;
  }) ?? null;
}

dropzones.forEach((zone) => {
  zone.addEventListener("dragover", (event) => {
    const dragging = draggingCard;
    if (!dragging) return;
    event.preventDefault();                 // これでドロップが許可される
    event.dataTransfer.dropEffect = "move";
    zone.classList.add("drag-over");

    // ドラッグ中のカードを、離したときの位置へ仮に移動して見せる
    zone.querySelector(".empty-column")?.remove();
    const after = getCardAfter(zone, event.clientY);
    if (after) {
      if (dragging.nextElementSibling !== after) zone.insertBefore(dragging, after);
    } else if (zone.lastElementChild !== dragging) {
      zone.append(dragging);
    }
  });

  zone.addEventListener("dragleave", (event) => {
    if (!zone.contains(event.relatedTarget)) zone.classList.remove("drag-over");
  });

  zone.addEventListener("drop", (event) => {
    event.preventDefault();
    zone.classList.remove("drag-over");
    applyBoardOrder();
  });
});

// 画面上のカードの並び（列と順番）を、そのまま保存データに反映する
function applyBoardOrder() {
  const moved = draggingCard && tasks.find((t) => t.id === draggingCard.dataset.id);
  const before = moved?.status;

  const byId = new Map(tasks.map((t) => [t.id, t]));
  const ordered = [];
  dropzones.forEach((zone) => {
    zone.querySelectorAll(".task-card").forEach((card) => {
      const task = byId.get(card.dataset.id);
      if (!task) return;
      task.status = zone.dataset.dropzone;
      ordered.push(task);
      byId.delete(card.dataset.id);
    });
  });
  tasks = ordered.concat([...byId.values()]); // 念のため、画面に無かったものも残す
  saveTasks();
  render();

  if (moved && moved.status !== before) {
    showToast(`「${moved.title}」を${STATUS_LABELS[moved.status]}へ移動しました`,
              { icon: STATUS_ICONS[moved.status], color: "primary" });
  }
}

// ===== 追加・編集モーダル =====
// openModal({ status })：新規追加（指定した列に入れる）
// openModal({ id })    ：既存タスクの編集
function openModal({ id = null, status = "todo" }) {
  if (!window.bootstrap) return;
  editingId = id;
  const task = id ? tasks.find((t) => t.id === id) : null;

  modalText.textContent = task ? "タスクを編集" : "新規タスク";
  modalIcon.className = `bi ${task ? "bi-pencil-square" : "bi-plus-square"} me-2 text-primary`;
  formSubmit.textContent = task ? "保存" : "追加";
  formDelete.hidden = !task;

  formTitle.value = task ? task.title : "";
  formTitle.classList.remove("is-invalid");
  formDescription.value = task ? task.description : "";
  taskForm.querySelector(`input[name="priority"][value="${task ? task.priority : "medium"}"]`).checked = true;
  taskForm.querySelector(`input[name="status"][value="${task ? task.status : status}"]`).checked = true;

  bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

function closeModal() {
  bootstrap.Modal.getOrCreateInstance(modalEl).hide();
}

modalEl.addEventListener("shown.bs.modal", () => formTitle.focus());
modalEl.addEventListener("hidden.bs.modal", () => { editingId = null; });

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = formTitle.value.trim();
  if (title === "") {
    formTitle.classList.add("is-invalid");
    formTitle.focus();
    return;
  }
  const fields = {
    title,
    description: formDescription.value.trim(),
    priority: taskForm.querySelector('input[name="priority"]:checked').value,
    status: taskForm.querySelector('input[name="status"]:checked').value,
  };
  if (editingId) {
    updateTask(editingId, fields);
  } else {
    addTask(fields);
  }
  closeModal();
});

formTitle.addEventListener("input", () => formTitle.classList.remove("is-invalid"));

formDelete.addEventListener("click", () => {
  const id = editingId;
  closeModal();
  if (id) deleteTask(id);
});

// 「新規タスク」「+ タスクを追加」ボタン
document.querySelectorAll("[data-add-status]").forEach((button) => {
  button.addEventListener("click", () => openModal({ status: button.dataset.addStatus }));
});

// ===== 一括削除（確認モーダル付き） =====
document.querySelectorAll("[data-clear-status]").forEach((button) => {
  button.addEventListener("click", () => {
    const status = button.dataset.clearStatus;
    const count = tasks.filter((t) => t.status === status).length;
    if (count === 0 || !window.bootstrap) return;
    pendingClear = status;
    confirmMessage.textContent = `「${STATUS_LABELS[status]}」の ${count} 件のタスクを削除します。`;
    bootstrap.Modal.getOrCreateInstance(confirmModalEl).show();
  });
});

confirmOk.addEventListener("click", () => {
  bootstrap.Modal.getOrCreateInstance(confirmModalEl).hide();
  if (pendingClear) clearColumn(pendingClear);
  pendingClear = null;
});

// ===== ライト/ダーク切り替え =====
function applyThemeIcon() {
  const dark = document.documentElement.dataset.bsTheme === "dark";
  themeIcon.className = dark ? "bi bi-sun-fill" : "bi bi-moon-stars-fill";
}

themeToggle.addEventListener("click", () => {
  const next = document.documentElement.dataset.bsTheme === "dark" ? "light" : "dark";
  document.documentElement.dataset.bsTheme = next;
  try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* 保存できなくても切り替えは有効 */ }
  applyThemeIcon();
});

// ===== 初期化 =====
// ツールチップ（Bootstrap の吹き出し）を有効にする
if (window.bootstrap) {
  document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((target) => new bootstrap.Tooltip(target));
}

applyThemeIcon();
render();
