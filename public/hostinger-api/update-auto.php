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
$uploadDir = __DIR__ . '/uploads/autos/';
$uploadUrlBase = '/hostinger-api/uploads/autos/';

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

// Handle images: start with keep_images[] sent from frontend, then add newly uploaded
$imageUrls = [];

// 1. Keep existing images selected by frontend
if (isset($_POST['keep_images']) && is_array($_POST['keep_images'])) {
    $imageUrls = array_values($_POST['keep_images']);
} elseif (!empty($_POST['keep_images[]'])) {
    $imageUrls = is_array($_POST['keep_images[]']) ? array_values($_POST['keep_images[]']) : [$_POST['keep_images[]']];
} else {
    // If no keep_images sent at all, preserve existing images from JSON
    $imageUrls = $existingAuto['images'] ?? [];
}

// 2. Upload new images and append
if (!empty($_FILES['images'])) {
    $files = $_FILES['images'];
    $count = count($files['name']);
    $allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    for ($i = 0; $i < $count; $i++) {
        if ($files['error'][$i] !== UPLOAD_ERR_OK) continue;
        $mime = mime_content_type($files['tmp_name'][$i]);
        if (!in_array($mime, $allowedTypes)) continue;
        $ext = strtolower(pathinfo($files['name'][$i], PATHINFO_EXTENSION));
        $filename = $id . '_upd_' . $i . '_' . time() . '.' . $ext;
        $dest = $uploadDir . $filename;
        if (move_uploaded_file($files['tmp_name'][$i], $dest)) {
            $imageUrls[] = $uploadUrlBase . $filename;
        }
    }
}

// Also handle images[] field name variant
if (!empty($_FILES['images[]'])) {
    $files = $_FILES['images[]'];
    $count = count($files['name']);
    $allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    for ($i = 0; $i < $count; $i++) {
        if ($files['error'][$i] !== UPLOAD_ERR_OK) continue;
        $mime = mime_content_type($files['tmp_name'][$i]);
        if (!in_array($mime, $allowedTypes)) continue;
        $ext = strtolower(pathinfo($files['name'][$i], PATHINFO_EXTENSION));
        $filename = $id . '_upd_' . $i . '_' . time() . '.' . $ext;
        $dest = $uploadDir . $filename;
        if (move_uploaded_file($files['tmp_name'][$i], $dest)) {
            $imageUrls[] = $uploadUrlBase . $filename;
        }
    }
}

// Parse highlights and features - support both JSON array and comma-separated string
$highlightsRaw = $_POST['highlights'] ?? null;
$featuresRaw = $_POST['features'] ?? null;

if ($highlightsRaw !== null) {
    if (is_string($highlightsRaw)) {
        $decoded_h = json_decode($highlightsRaw, true);
        $highlights = is_array($decoded_h) ? $decoded_h : array_values(array_filter(array_map('trim', explode(',', $highlightsRaw))));
    } else {
        $highlights = $existingAuto['highlights'] ?? [];
    }
} else {
    $highlights = $existingAuto['highlights'] ?? [];
}

if ($featuresRaw !== null) {
    if (is_string($featuresRaw)) {
        $decoded_f = json_decode($featuresRaw, true);
        $features = is_array($decoded_f) ? $decoded_f : array_values(array_filter(array_map('trim', explode(',', $featuresRaw))));
    } else {
        $features = $existingAuto['features'] ?? [];
    }
} else {
    $features = $existingAuto['features'] ?? [];
}

$autos[$foundIndex] = array_merge($existingAuto, [
    'brand'           => $_POST['brand'] ?? $existingAuto['brand'],
    'model'           => $_POST['model'] ?? $existingAuto['model'],
    'year'            => (int)($_POST['year'] ?? $existingAuto['year']),
    'price'           => (float)($_POST['price'] ?? $existingAuto['price']),
    'mileage'         => (int)($_POST['mileage'] ?? $existingAuto['mileage']),
    'bodyType'        => $_POST['bodyType'] ?? $existingAuto['bodyType'],
    'transmission'    => $_POST['transmission'] ?? $existingAuto['transmission'],
    'engineType'      => $_POST['engineType'] ?? $existingAuto['engineType'] ?? '',
    'horsepower'      => $_POST['horsepower'] ?? $existingAuto['horsepower'] ?? '',
    'fuelConsumption' => $_POST['fuelConsumption'] ?? $existingAuto['fuelConsumption'] ?? '',
    'passengers'      => (int)($_POST['passengers'] ?? $existingAuto['passengers'] ?? 0),
    'description'     => $_POST['description'] ?? $existingAuto['description'],
    'highlights'      => $highlights,
    'features'        => $features,
    'status'          => $_POST['status'] ?? $existingAuto['status'] ?? 'available',
    'images'          => array_values($imageUrls),
    'updatedAt'       => date('c'),
]);

$saveData = ['success' => true, 'data' => array_values($autos)];
$result = file_put_contents($jsonPath, json_encode($saveData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

if ($result === false) {
    echo json_encode(['success' => false, 'message' => 'Error al escribir autos.json']);
    exit();
}

echo json_encode(['success' => true, 'message' => 'Auto actualizado correctamente', 'auto' => $autos[$foundIndex]]);
?>
