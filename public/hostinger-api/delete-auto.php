<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'DELETE') {
  http_response_code(405);
  echo json_encode(['error' => 'Method not allowed']);
  exit();
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
  $input = $_POST;
}

$id = $input['id'] ?? null;
if (!$id) {
  http_response_code(400);
  echo json_encode(['error' => 'Missing id']);
  exit();
}

$dataFile = __DIR__ . '/../../autos.json';
$autos = [];
if (file_exists($dataFile)) {
  $autos = json_decode(file_get_contents($dataFile), true) ?? [];
}

$found = false;
$newAutos = [];
foreach ($autos as $auto) {
  if ($auto['id'] === $id) {
    $found = true;
    // Delete images
    if (!empty($auto['images'])) {
      foreach ($auto['images'] as $imgUrl) {
        $imgPath = __DIR__ . '/../../' . ltrim($imgUrl, '/');
        if (file_exists($imgPath)) {
          unlink($imgPath);
        }
      }
    }
  } else {
    $newAutos[] = $auto;
  }
}

if (!$found) {
  http_response_code(404);
  echo json_encode(['error' => 'Auto not found']);
  exit();
}

file_put_contents($dataFile, json_encode($newAutos, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

echo json_encode(['success' => true, 'message' => 'Auto deleted']);
?>
