<?php
// タスクボード（PHP + データベース版）
// 画面（HTML）と、タスクを読み書きする API（JSON）を、このファイル1つで提供する。
// API は「?api=アクション名」で呼び出す。

// 並び順（sort_order）を持つ列の一覧
$validStatuses = array('todo', 'doing', 'done');
$validPriorities = array('high', 'medium', 'low');

// JSON を返して終了する
function sendJson($data, $code = 200)
{
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

// DB に接続する（接続情報はリポジトリ外の設定ファイルから読み込む）
function connectDb()
{
  require '/var/www/config/db_config.php';
  $dsn = "mysql:host={$host};dbname={$dbname};charset=utf8mb4";
  return new PDO($dsn, $username, $password, array(
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
  ));
}

// タイトル・説明・優先度・列を検証して取り出す。不正なら null
function readFields($input)
{
  global $validStatuses, $validPriorities;
  $title = isset($input['title']) && is_string($input['title']) ? trim($input['title']) : '';
  $description = isset($input['description']) && is_string($input['description']) ? trim($input['description']) : '';
  $priority = isset($input['priority']) ? $input['priority'] : '';
  $status = isset($input['status']) ? $input['status'] : '';
  if ($title === '' || mb_strlen($title, 'UTF-8') > 100) return null;
  if (mb_strlen($description, 'UTF-8') > 2000) return null;
  if (!in_array($priority, $validPriorities, true)) return null;
  if (!in_array($status, $validStatuses, true)) return null;
  return array('title' => $title, 'description' => $description, 'priority' => $priority, 'status' => $status);
}

// 列の一番下に置くための sort_order を求める
function nextSortOrder($pdo, $status)
{
  $stmt = $pdo->prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM tasks WHERE status = ?');
  $stmt->execute(array($status));
  return (int) $stmt->fetchColumn();
}

// 全タスクを、列ごとの表示順で返す
function fetchTasks($pdo)
{
  $stmt = $pdo->query('SELECT id, title, description, priority, status, sort_order, created_at FROM tasks ORDER BY sort_order ASC, id ASC');
  $rows = $stmt->fetchAll();
  foreach ($rows as &$row) {
    $row['id'] = (int) $row['id'];
    $row['sort_order'] = (int) $row['sort_order'];
    $row['description'] = (string) $row['description'];
  }
  unset($row);
  return $rows;
}

if (isset($_GET['api'])) {
  $action = $_GET['api'];
  $input = json_decode(file_get_contents('php://input'), true);
  if (!is_array($input)) $input = array();

  try {
    $pdo = connectDb();

    if ($action === 'list' && $_SERVER['REQUEST_METHOD'] === 'GET') {
      sendJson(array('tasks' => fetchTasks($pdo)));
    }

    // 以降は書き込み系なので POST のみ受け付ける
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
      sendJson(array('error' => 'POST で呼び出してください'), 405);
    }

    if ($action === 'create') {
      $fields = readFields($input);
      if ($fields === null) sendJson(array('error' => '入力内容が正しくありません'), 400);
      $stmt = $pdo->prepare('INSERT INTO tasks (title, description, priority, status, sort_order) VALUES (?, ?, ?, ?, ?)');
      $stmt->execute(array($fields['title'], $fields['description'], $fields['priority'], $fields['status'], nextSortOrder($pdo, $fields['status'])));
      sendJson(array('id' => (int) $pdo->lastInsertId()));
    }

    if ($action === 'update') {
      $fields = readFields($input);
      $id = isset($input['id']) ? (int) $input['id'] : 0;
      if ($fields === null || $id <= 0) sendJson(array('error' => '入力内容が正しくありません'), 400);
      $pdo->beginTransaction();
      $stmt = $pdo->prepare('SELECT status FROM tasks WHERE id = ? FOR UPDATE');
      $stmt->execute(array($id));
      $current = $stmt->fetchColumn();
      if ($current === false) {
        $pdo->rollBack();
        sendJson(array('error' => 'タスクが見つかりません'), 404);
      }
      if ($current !== $fields['status']) {
        // 列を変えたときは、移動先の列の一番下に置く
        $stmt = $pdo->prepare('UPDATE tasks SET title = ?, description = ?, priority = ?, status = ?, sort_order = ?, updated_at = NOW() WHERE id = ?');
        $stmt->execute(array($fields['title'], $fields['description'], $fields['priority'], $fields['status'], nextSortOrder($pdo, $fields['status']), $id));
      } else {
        $stmt = $pdo->prepare('UPDATE tasks SET title = ?, description = ?, priority = ?, updated_at = NOW() WHERE id = ?');
        $stmt->execute(array($fields['title'], $fields['description'], $fields['priority'], $id));
      }
      $pdo->commit();
      sendJson(array('ok' => true));
    }

    if ($action === 'delete') {
      $id = isset($input['id']) ? (int) $input['id'] : 0;
      if ($id <= 0) sendJson(array('error' => '入力内容が正しくありません'), 400);
      $stmt = $pdo->prepare('DELETE FROM tasks WHERE id = ?');
      $stmt->execute(array($id));
      sendJson(array('ok' => true));
    }

    if ($action === 'clear') {
      $status = isset($input['status']) ? $input['status'] : '';
      if (!in_array($status, $validStatuses, true)) sendJson(array('error' => '入力内容が正しくありません'), 400);
      $stmt = $pdo->prepare('DELETE FROM tasks WHERE status = ?');
      $stmt->execute(array($status));
      sendJson(array('deleted' => $stmt->rowCount()));
    }

    // ドラッグ＆ドロップ後の並びを保存する。items は画面の表示順の { id, status } の配列
    if ($action === 'reorder') {
      $items = isset($input['items']) && is_array($input['items']) ? $input['items'] : array();
      $pdo->beginTransaction();
      $orders = array('todo' => 0, 'doing' => 0, 'done' => 0);
      $stmt = $pdo->prepare('UPDATE tasks SET status = ?, sort_order = ? WHERE id = ?');
      foreach ($items as $item) {
        $id = isset($item['id']) ? (int) $item['id'] : 0;
        $status = isset($item['status']) ? $item['status'] : '';
        if ($id <= 0 || !in_array($status, $validStatuses, true)) {
          $pdo->rollBack();
          sendJson(array('error' => '入力内容が正しくありません'), 400);
        }
        $orders[$status]++;
        $stmt->execute(array($status, $orders[$status], $id));
      }
      $pdo->commit();
      sendJson(array('ok' => true));
    }

    // 「元に戻す」：削除したタスクを、元の id・並び順のまま戻す
    if ($action === 'restore') {
      $items = isset($input['tasks']) && is_array($input['tasks']) ? $input['tasks'] : array();
      $pdo->beginTransaction();
      $stmt = $pdo->prepare('INSERT INTO tasks (id, title, description, priority, status, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
      foreach ($items as $item) {
        $fields = readFields($item);
        $id = isset($item['id']) ? (int) $item['id'] : 0;
        $createdAt = isset($item['created_at']) ? $item['created_at'] : '';
        if ($fields === null || $id <= 0 || !preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $createdAt)) {
          $pdo->rollBack();
          sendJson(array('error' => '入力内容が正しくありません'), 400);
        }
        $sortOrder = isset($item['sort_order']) ? (int) $item['sort_order'] : 0;
        $stmt->execute(array($id, $fields['title'], $fields['description'], $fields['priority'], $fields['status'], $sortOrder, $createdAt));
      }
      $pdo->commit();
      sendJson(array('ok' => true));
    }

    sendJson(array('error' => '不明なアクションです'), 400);
  } catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    // 詳細はサーバーのログへ。画面には接続情報などを出さない
    error_log('index_task_db.php: ' . $e->getMessage());
    sendJson(array('error' => 'データベースの処理に失敗しました'), 500);
  }
}
?>
<!doctype html>
<html lang="ja" data-bs-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TaskBoard（DB版）</title>

  <!-- 保存されたテーマ（ライト/ダーク）を、画面が表示される前に反映する -->
  <script>
    try {
      const saved = localStorage.getItem("task-app.theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.dataset.bsTheme = saved || (prefersDark ? "dark" : "light");
    } catch (e) { /* localStorage が使えない場合はライトのまま */ }
  </script>

  <!-- Bootstrap CSS（CDN） -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
  <!-- Bootstrap Icons（CDN） -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet" integrity="sha384-XGjxtQfXaH2tnPFa9x+ruJTuLE3Aa6LhHSWRr1XeTyhezb4abCG4ccI5AkVDxqC+" crossorigin="anonymous">
  <!-- 独自の追加デザイン（Bootstrap の後に読み込む） -->
  <link rel="stylesheet" href="style_db.css">

  <script src="app_db.js" defer></script>
</head>
<body class="bg-body-tertiary">

  <!-- ===== ナビゲーションバー ===== -->
  <nav class="navbar sticky-top bg-body border-bottom">
    <div class="container-fluid px-3 px-lg-5 py-2 gap-2">
      <a class="navbar-brand d-flex align-items-center gap-2 fw-bold fs-4 me-auto" href="#">
        <span class="brand-icon d-inline-flex align-items-center justify-content-center rounded-3">
          <i class="bi bi-kanban"></i>
        </span>
        TaskBoard
        <span class="badge rounded-pill text-bg-secondary bg-opacity-10 fw-medium fs-6 ms-1 board-total" id="total-count">0件のタスク</span>
      </a>

      <button type="button" class="btn btn-outline-secondary border-0 rounded-circle theme-toggle" id="theme-toggle"
              data-bs-toggle="tooltip" data-bs-placement="bottom" data-bs-title="ライト/ダークを切り替え"
              aria-label="ライト/ダークを切り替え">
        <i class="bi bi-moon-stars-fill" id="theme-icon"></i>
      </button>
      <button type="button" class="btn btn-new-task fw-semibold px-4" data-add-status="todo">
        <i class="bi bi-plus-lg me-2"></i>新規タスク
      </button>
    </div>
  </nav>

  <main class="container-fluid px-3 px-lg-5 py-4">

    <!-- ===== 進捗サマリー（積み上げバー） ===== -->
    <section class="card border-0 shadow-sm rounded-4 mb-4">
      <div class="card-body p-3 p-md-4">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
          <h2 class="h6 fw-bold mb-0"><i class="bi bi-bar-chart-line me-2 text-primary"></i>進捗</h2>
          <div class="d-flex gap-3 small text-body-secondary">
            <span><i class="bi bi-square-fill text-secondary me-1"></i>未着手 <span data-legend="todo">0</span></span>
            <span><i class="bi bi-square-fill text-primary me-1"></i>進行中 <span data-legend="doing">0</span></span>
            <span><i class="bi bi-square-fill text-success me-1"></i>完了 <span data-legend="done">0</span></span>
            <span class="fw-bold text-body" id="progress-percent">0%</span>
          </div>
        </div>
        <div class="progress-stacked summary-progress">
          <div class="progress" role="progressbar" aria-label="完了" id="bar-done" style="width: 0%">
            <div class="progress-bar bg-success"></div>
          </div>
          <div class="progress" role="progressbar" aria-label="進行中" id="bar-doing" style="width: 0%">
            <div class="progress-bar bg-primary"></div>
          </div>
          <div class="progress" role="progressbar" aria-label="未着手" id="bar-todo" style="width: 0%">
            <div class="progress-bar bg-secondary bg-opacity-50"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== カンバンボード ===== -->
    <div class="row flex-nowrap overflow-x-auto g-4 pb-3 board">

      <!-- 未着手 -->
      <div class="col-10 col-sm-7 col-md-5 col-xl-3">
        <section class="card border-0 shadow-sm rounded-4 h-100 column" data-status="todo">
          <div class="card-header bg-transparent border-0 pt-3 px-3 d-flex align-items-center gap-2">
            <span class="status-icon text-secondary bg-secondary-subtle"><i class="bi bi-circle"></i></span>
            <h2 class="h6 fw-bold mb-0">未着手</h2>
            <span class="badge rounded-pill bg-secondary-subtle text-secondary-emphasis" data-count="todo">0</span>
            <div class="dropdown ms-auto">
              <button type="button" class="btn btn-sm btn-link text-body-secondary" data-bs-toggle="dropdown" aria-expanded="false" aria-label="未着手の列のメニュー">
                <i class="bi bi-three-dots"></i>
              </button>
              <ul class="dropdown-menu dropdown-menu-end shadow border-0">
                <li><button type="button" class="dropdown-item" data-add-status="todo"><i class="bi bi-plus-lg me-2"></i>タスクを追加</button></li>
                <li><hr class="dropdown-divider"></li>
                <li><button type="button" class="dropdown-item text-danger" data-clear-status="todo"><i class="bi bi-trash3 me-2"></i>この列をすべて削除</button></li>
              </ul>
            </div>
          </div>
          <div class="card-body px-3 pt-2 pb-3 d-flex flex-column">
            <button type="button" class="btn btn-add-in-column w-100 mb-3" data-add-status="todo">
              <i class="bi bi-plus-lg me-1"></i>タスクを追加
            </button>
            <div class="column-body" data-dropzone="todo" aria-label="未着手の列"></div>
          </div>
        </section>
      </div>

      <!-- 進行中 -->
      <div class="col-10 col-sm-7 col-md-5 col-xl-3">
        <section class="card border-0 shadow-sm rounded-4 h-100 column" data-status="doing">
          <div class="card-header bg-transparent border-0 pt-3 px-3 d-flex align-items-center gap-2">
            <span class="status-icon text-primary bg-primary-subtle"><i class="bi bi-hourglass-split"></i></span>
            <h2 class="h6 fw-bold mb-0">進行中</h2>
            <span class="badge rounded-pill bg-primary-subtle text-primary-emphasis" data-count="doing">0</span>
            <div class="dropdown ms-auto">
              <button type="button" class="btn btn-sm btn-link text-body-secondary" data-bs-toggle="dropdown" aria-expanded="false" aria-label="進行中の列のメニュー">
                <i class="bi bi-three-dots"></i>
              </button>
              <ul class="dropdown-menu dropdown-menu-end shadow border-0">
                <li><button type="button" class="dropdown-item" data-add-status="doing"><i class="bi bi-plus-lg me-2"></i>タスクを追加</button></li>
                <li><hr class="dropdown-divider"></li>
                <li><button type="button" class="dropdown-item text-danger" data-clear-status="doing"><i class="bi bi-trash3 me-2"></i>この列をすべて削除</button></li>
              </ul>
            </div>
          </div>
          <div class="card-body px-3 pt-2 pb-3 d-flex flex-column">
            <button type="button" class="btn btn-add-in-column w-100 mb-3" data-add-status="doing">
              <i class="bi bi-plus-lg me-1"></i>タスクを追加
            </button>
            <div class="column-body" data-dropzone="doing" aria-label="進行中の列"></div>
          </div>
        </section>
      </div>

      <!-- 完了 -->
      <div class="col-10 col-sm-7 col-md-5 col-xl-3">
        <section class="card border-0 shadow-sm rounded-4 h-100 column" data-status="done">
          <div class="card-header bg-transparent border-0 pt-3 px-3 d-flex align-items-center gap-2">
            <span class="status-icon text-success bg-success-subtle"><i class="bi bi-check2-circle"></i></span>
            <h2 class="h6 fw-bold mb-0">完了</h2>
            <span class="badge rounded-pill bg-success-subtle text-success-emphasis" data-count="done">0</span>
            <div class="dropdown ms-auto">
              <button type="button" class="btn btn-sm btn-link text-body-secondary" data-bs-toggle="dropdown" aria-expanded="false" aria-label="完了の列のメニュー">
                <i class="bi bi-three-dots"></i>
              </button>
              <ul class="dropdown-menu dropdown-menu-end shadow border-0">
                <li><button type="button" class="dropdown-item" data-add-status="done"><i class="bi bi-plus-lg me-2"></i>タスクを追加</button></li>
                <li><hr class="dropdown-divider"></li>
                <li><button type="button" class="dropdown-item text-danger" data-clear-status="done"><i class="bi bi-trash3 me-2"></i>完了を一括削除</button></li>
              </ul>
            </div>
          </div>
          <div class="card-body px-3 pt-2 pb-3 d-flex flex-column">
            <button type="button" class="btn btn-add-in-column w-100 mb-3" data-add-status="done">
              <i class="bi bi-plus-lg me-1"></i>タスクを追加
            </button>
            <div class="column-body" data-dropzone="done" aria-label="完了の列"></div>
          </div>
        </section>
      </div>

      <!-- カラムを追加（枠の表示のみ。動作は未実装） -->
      <div class="col-10 col-sm-7 col-md-5 col-xl-3">
        <div class="column-placeholder rounded-4 h-100 d-flex flex-column align-items-center justify-content-center gap-2 text-body-secondary" aria-hidden="true">
          <i class="bi bi-plus-circle-dotted fs-2"></i>
          <span class="small fw-semibold">カラムを追加</span>
        </div>
      </div>

    </div>
  </main>

  <!-- ===== 追加・編集用モーダル ===== -->
  <div class="modal fade" id="task-modal" tabindex="-1" aria-labelledby="task-modal-title" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <form class="modal-content border-0 rounded-4 shadow" id="task-form" autocomplete="off" novalidate>
        <div class="modal-header border-0 pb-0">
          <h2 class="modal-title h5 fw-bold" id="task-modal-title">
            <i class="bi bi-plus-square me-2 text-primary" id="task-modal-icon"></i><span id="task-modal-text">新規タスク</span>
          </h2>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="閉じる"></button>
        </div>
        <div class="modal-body">
          <div class="form-floating mb-3">
            <input type="text" id="form-title" class="form-control" maxlength="100" placeholder="タイトル">
            <label for="form-title">タイトル</label>
            <div class="invalid-feedback">タイトルを入力してください。</div>
          </div>
          <div class="form-floating mb-3">
            <textarea id="form-description" class="form-control" maxlength="500" placeholder="説明" style="height: 110px"></textarea>
            <label for="form-description">説明（任意）</label>
          </div>

          <!-- 優先度：ボタン型のラジオ -->
          <div class="mb-3">
            <div class="form-label small fw-semibold mb-1">優先度</div>
            <div class="btn-group w-100" role="group" aria-label="優先度">
              <input type="radio" class="btn-check" name="priority" id="priority-high" value="high">
              <label class="btn btn-outline-danger" for="priority-high"><i class="bi bi-flag-fill me-1"></i>高</label>
              <input type="radio" class="btn-check" name="priority" id="priority-medium" value="medium" checked>
              <label class="btn btn-outline-warning" for="priority-medium"><i class="bi bi-flag-fill me-1"></i>中</label>
              <input type="radio" class="btn-check" name="priority" id="priority-low" value="low">
              <label class="btn btn-outline-success" for="priority-low"><i class="bi bi-flag-fill me-1"></i>低</label>
            </div>
          </div>

          <!-- 列：ボタン型のラジオ -->
          <div>
            <div class="form-label small fw-semibold mb-1">列</div>
            <div class="btn-group w-100" role="group" aria-label="列">
              <input type="radio" class="btn-check" name="status" id="status-todo" value="todo" checked>
              <label class="btn btn-outline-secondary" for="status-todo">未着手</label>
              <input type="radio" class="btn-check" name="status" id="status-doing" value="doing">
              <label class="btn btn-outline-primary" for="status-doing">進行中</label>
              <input type="radio" class="btn-check" name="status" id="status-done" value="done">
              <label class="btn btn-outline-success" for="status-done">完了</label>
            </div>
          </div>
        </div>
        <div class="modal-footer border-0 pt-0">
          <button type="button" class="btn btn-outline-danger me-auto" id="form-delete"><i class="bi bi-trash3 me-1"></i>削除</button>
          <button type="button" class="btn btn-light" data-bs-dismiss="modal">キャンセル</button>
          <button type="submit" class="btn btn-primary px-4" id="form-submit">追加</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ===== 一括削除の確認モーダル ===== -->
  <div class="modal fade" id="confirm-modal" tabindex="-1" aria-labelledby="confirm-modal-title" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-sm">
      <div class="modal-content border-0 rounded-4 shadow">
        <div class="modal-body text-center p-4">
          <div class="confirm-icon text-danger bg-danger-subtle rounded-circle mx-auto mb-3">
            <i class="bi bi-trash3"></i>
          </div>
          <h2 class="h6 fw-bold mb-2" id="confirm-modal-title">タスクを削除しますか？</h2>
          <p class="small text-body-secondary mb-0" id="confirm-message"></p>
        </div>
        <div class="modal-footer border-0 pt-0 justify-content-center">
          <button type="button" class="btn btn-light" data-bs-dismiss="modal">キャンセル</button>
          <button type="button" class="btn btn-danger" id="confirm-ok">削除する</button>
        </div>
      </div>
    </div>
  </div>

  <!-- ===== トースト通知（画面右下） ===== -->
  <div class="toast-container position-fixed bottom-0 end-0 p-3">
    <div class="toast align-items-center border-0 shadow" id="app-toast" role="status" aria-live="polite" aria-atomic="true">
      <div class="d-flex align-items-center">
        <div class="toast-body d-flex align-items-center gap-2">
          <i class="bi bi-check-circle-fill text-success" id="toast-icon"></i>
          <span id="toast-message"></span>
        </div>
        <button type="button" class="btn btn-sm btn-link fw-semibold text-decoration-none ms-auto" id="toast-undo" hidden>
          <i class="bi bi-arrow-counterclockwise me-1"></i>元に戻す
        </button>
        <button type="button" class="btn-close me-2" data-bs-dismiss="toast" aria-label="閉じる"></button>
      </div>
    </div>
  </div>

  <!-- Bootstrap JavaScript (Bundle)（CDN）：モーダル・メニュー・トースト・ツールチップで使用 -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>
</body>
</html>
