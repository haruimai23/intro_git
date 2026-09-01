<?php
$message = '';
$rows = [];
$columns = [];
$showResult = false;

$isShowRequest = $_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'show';

$host = 'localhost';
$dbname = 'test';
$username = 'root';
$password = 'Haruimai0331';
$dsn = "mysql:host={$host};dbname={$dbname};charset=utf8mb4";
$sql = 'SELECT * FROM application_logs';
$errPrefix = 'DB接続エラー: ';
$pdoOptions = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

if ($isShowRequest):
    $showResult = true;
endif;

if ($showResult):
    try {
        $pdo = new PDO($dsn, $username, $password, $pdoOptions);
        $stmt = $pdo->query($sql);
        $rows = $stmt->fetchAll();
    } catch (PDOException $e) {
        $message = $errPrefix . $e->getMessage();
    }
endif;

if ($showResult && $message === '' && count($rows) > 0):
    $columns = array_keys($rows[0]);
endif;
?>
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>DBログ確認画面</title>
<style>
  body { font-family: sans-serif; margin: 20px; }
  table { border-collapse: collapse; margin-top: 16px; }
  th, td { border: 1px solid #999; padding: 4px 8px; }
  button { margin-right: 8px; padding: 6px 16px; }
  #showBtn { background-color: #007bff; color: #fff; border: 1px solid #007bff; }
</style>
</head>
<body>
<h1>DBログ確認画面</h1>
<form method="post" id="logForm">
  <button type="submit" name="action" value="show" id="showBtn">表示</button>
  <button type="button" id="closeBtn">閉じる</button>
</form>

<div id="result">
<?php if ($showResult): ?>
  <?php if ($message !== ''): ?>
    <p id="errorMessage"><?php echo htmlspecialchars($message, ENT_QUOTES, 'UTF-8'); ?></p>
  <?php elseif (count($rows) === 0): ?>
    <p id="noDataMessage">データがありません</p>
  <?php else: ?>
    <table id="logTable">
      <thead>
        <tr>
          <?php foreach ($columns as $col): ?>
            <th><?php echo htmlspecialchars($col, ENT_QUOTES, 'UTF-8'); ?></th>
          <?php endforeach; ?>
        </tr>
      </thead>
      <tbody>
        <?php foreach ($rows as $row): ?>
          <tr>
            <?php foreach ($row as $value): ?>
              <td><?php echo htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8'); ?></td>
            <?php endforeach; ?>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  <?php endif; ?>
<?php endif; ?>
</div>

<script>
document.getElementById('closeBtn').addEventListener('click', function () {
  window.close();
});
</script>
</body>
</html>
