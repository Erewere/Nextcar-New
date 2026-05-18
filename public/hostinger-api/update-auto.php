<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['error' => 'Method not allowed']);
  exit();
}

$id = $_POST['id'] ?? null;
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
foreach ($autos as &$auto) {
  if ($auto['id'] === $id) {
    $found = true;
    // Update fields
    $fields = ['brand','model','year','price','mileage','bodyType','transmission','engineType','horsepower','fuelConsumption','passengers','description'];
    foreach ($fields as $field) {
      if (isset($_POST[$field])) {
        $auto[$field] = $_POST[$field];
      }
    }
    if (isset($_POST['highlights'])) {
      $auto['highlights'] = json_decode($_POST['highlights'], true) ?? [];
    }
    if (isset($_POST['features'])) {
      $auto['features'] = json_decode($_POST['features'], true) ?? [];
    }
    // Handle new images
    $uploadDir = __DIR__ . '/../../uploads/autos/';
    if (!is_dir($uploadDir)) {
      mkdir($uploadDir, 0755, true);
    }
    if (!empty($_FILES['images']['name'][0])) {
      $imageUrls = $auto['images'] ?? [];
      $files = $_FILES['images'];
      $count = count($files['name']);
      for ($i = 0; $i < $count; $i++) {
        if ($files['error'][$i] === UPLOAD_ERR_OK) {
          $ext = pathinfo($files['name'][$i], PATHINFO_EXTENSION);
          $filename = $id . '_' . time() . '_' . $i . '.' . $ext;
          $dest = $uploadDir . $filename;
          if (move_uploaded_file($files['tmp_name'][$i], $dest)) {
            $imageUrls[] = '/uploads/autos/' . $filename;
          }
        }
      }
      $auto['images'] = $imageUrls;
    }
    break;
  }
}
unset($auto);

if (!$found) {
  http_response_code(404);
  echo json_encode(['error' => 'Auto not found']);
  exit();
}

file_put_contents($dataFile, json_encode($autos, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

echo json_encode(['success' => true, 'message' => 'Auto updated']);
?>
