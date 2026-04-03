<?php
declare(strict_types=1);

function sayHello(): string
{
    return 'Hello, World!';
}

function getCurrentDatetime(): string
{
    $now = new DateTimeImmutable('now', new DateTimeZone('Asia/Tokyo'));
    return $now->format('Y年n月j日 H:i:s');
}

$message = htmlspecialchars(sayHello(), ENT_QUOTES, 'UTF-8');
$datetime = htmlspecialchars(getCurrentDatetime(), ENT_QUOTES, 'UTF-8');
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My First Claude Code PHP App</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            background-color: #f0f4f8;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .card {
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            padding: 48px 64px;
            text-align: center;
            max-width: 480px;
            width: 90%;
        }

        .card h1 {
            font-size: 2.4rem;
            color: #2d3748;
            margin-bottom: 16px;
        }

        .card .datetime {
            font-size: 1rem;
            color: #718096;
            margin-top: 12px;
        }

        .card .label {
            font-size: 0.85rem;
            color: #a0aec0;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 8px;
        }
    </style>
</head>
<body>
    <div class="card">
        <p class="label">Welcome</p>
        <h1><?= $message ?></h1>
        <p class="datetime"><?= $datetime ?></p>
    </div>
</body>
</html>
