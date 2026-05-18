<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Metodo no permitido']);
    exit();
}

$id = $_POST['id'] ?? null;
if (!$id) {
    echo json_encode(['success' => false, 'message' => 'ID requerido']);
    exit();
}

$jsonPath = __DIR__ . '/../autos.json';
$uploadDir = __DIR__ . '/../uploads/autos/';

if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

if (!is_writable(dirname($jsonPath))) {
    echo json_encode(['success' => false, 'message' => 'Sin permiso de escritura en: ' . dirname($jsonPath)]);
    exit();
}

// Read existing autos.json
$autos = [];
if (file_exists($jsonPath)) {
    $content = file_get_contents($jsonPath);
    if ($content !== false) {
        $decoded = json_decode($content, true);
        if (isset($decoded['data']) && is_array($decoded['data'])) {
            $autos = $decoded['data'];
        } elseif (is_array($decoded)) {
            $autos = $decoded;
        }
    }
}

$foundIndex = -1;
foreach ($autos as $index => $auto) {
    if (isset($auto['id']) && $auto['id'] === $id) {
        $foundIndex = $index;
        break;
    }
}

if ($foundIndex === -1) {
    echo json_encode(['success' => false, 'message' => 'Auto no encontrado con id: ' . $id]);
    exit();
}

$existingAuto = $autos[$foundIndex];
$imageUrls = $existingAuto['images'] ?? [];

if (!empty($_FILES['images'])) {
    $files = $_FILES['images'];
    $count = count($files['name']);
    $newImages = [];
    for ($i = 0; $i < $count; $i++) {
        if ($files['error'][$i] === UPLOAD_ERR_OK) {
            $ext = strtolower(pathinfo($files['name'][$i], PATHINFO_EXTENSION));
            $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
            if (!in_array($ext, $allowed)) continue;
            $filename = $id . '_upd_' . $i . '_' . time() . '.' . $ext;
            $dest = $uploadDir . $filename;
            if (move_uploaded_file($files['tmp_name'][$i], $dest)) {
                $newImages[] = '/uploads/autos/' . $filename;
            }
        }
    }
    if (!empty($newImages)) {
        $imageUrls = $newImages;
    }
}

$autos[$foundIndex] = array_merge($existingAuto, [
    'brand' => $_POST['brand'] ?? $existingAuto['brand'],
    'model' => $_POST['model'] ?? $existingAuto['model'],
    'year' => (int)($_POST['year'] ?? $existingAuto['year']),
    'price' => (float)($_POST['price'] ?? $existingAuto['price']),
    'mileage' => (int)($_POST['mileage'] ?? $existingAuto['mileage']),
    'bodyType' => $_POST['bodyType'] ?? $existingAuto['bodyType'],
    'transmission' => $_POST['transmission'] ?? $existingAuto['transmission'],
    'engineType' => $_POST['engineType'] ?? $existingAuto['engineType'] ?? '',
    'horsepower' => (int)($_POST['horsepower'] ?? $existingAuto['horsepower'] ?? 0),
    'fuelConsumption' => $_POST['fuelConsumption'] ?? $existingAuto['fuelConsumption'] ?? '',
    'passengers' => (int)($_POST['passengers'] ?? $existingAuto['passengers'] ?? 0),
    'description' => $_POST['description'] ?? $existingAuto['description'],
    'highlights' => json_decode($_POST['highlights'] ?? '[]', true) ?: ($existingAuto['highlights'] ?? []),
    'features' => json_decode($_POST['features'] ?? '[]', true) ?: ($existingAuto['features'] ?? []),
    'images' => $imageUrls,
    'updatedAt' => date('c'),
]);

$saveData = ['success' => true, 'data' => array_values($autos)];
$result = file_put_contents($jsonPath, json_encode($saveData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

if ($result === false) {
    echo json_encode(['success' => false, 'message' => 'Error al escribir autos.json']);
    exit();
}

echo json_encode(['success' => true, 'message' => 'Auto actualizado correctamente', 'auto' => $autos[$foundIndex]]);
?>
