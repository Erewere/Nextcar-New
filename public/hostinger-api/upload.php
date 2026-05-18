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

// Paths
$jsonPath = __DIR__ . '/../autos.json';
$uploadDir = __DIR__ . '/uploads/autos/';
$uploadUrlBase = '/hostinger-api/uploads/autos/';
$canUploadImages = false;

if (!is_dir($uploadDir)) {
    @mkdir($uploadDir, 0755, true);
}
$canUploadImages = is_dir($uploadDir) && is_writable($uploadDir);

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

// Parse highlights and features - support both JSON array and comma-separated string
$highlightsRaw = $_POST['highlights'] ?? '';
$featuresRaw = $_POST['features'] ?? '';

if (is_string($highlightsRaw)) {
    $decoded_h = json_decode($highlightsRaw, true);
    $highlights = is_array($decoded_h) ? $decoded_h : array_values(array_filter(array_map('trim', explode(',', $highlightsRaw))));
} else {
    $highlights = [];
}

if (is_string($featuresRaw)) {
    $decoded_f = json_decode($featuresRaw, true);
    $features = is_array($decoded_f) ? $decoded_f : array_values(array_filter(array_map('trim', explode(',', $featuresRaw))));
} else {
    $features = [];
}

// Build new auto entry using English field names sent by frontend
$newAuto = [
    'id'              => uniqid('auto_', true),
    'brand'           => $_POST['brand'] ?? '',
    'model'           => $_POST['model'] ?? '',
    'year'            => (int)($_POST['year'] ?? 0),
    'price'           => (float)($_POST['price'] ?? 0),
    'mileage'         => (int)($_POST['mileage'] ?? 0),
    'bodyType'        => $_POST['bodyType'] ?? '',
    'transmission'    => $_POST['transmission'] ?? '',
    'engineType'      => $_POST['engineType'] ?? '',
    'horsepower'      => $_POST['horsepower'] ?? '',
    'fuelConsumption' => $_POST['fuelConsumption'] ?? '',
    'description'     => $_POST['description'] ?? '',
    'highlights'      => $highlights,
    'features'        => $features,
    'passengers'      => (int)($_POST['passengers'] ?? 0),
    'status'          => 'available',
    'images'          => [],
    'fecha'           => date('Y-m-d H:i:s')
];

// Handle image uploads
if ($canUploadImages && isset($_FILES['images']) && is_array($_FILES['images']['name'])) {
    $allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    foreach ($_FILES['images']['name'] as $i => $name) {
        if ($_FILES['images']['error'][$i] !== UPLOAD_ERR_OK) continue;
        $mime = mime_content_type($_FILES['images']['tmp_name'][$i]);
        if (!in_array($mime, $allowedTypes)) continue;
        $ext = pathinfo($name, PATHINFO_EXTENSION);
        $filename = uniqid('img_', true) . '.' . $ext;
        $dest = $uploadDir . $filename;
        if (move_uploaded_file($_FILES['images']['tmp_name'][$i], $dest)) {
            $newAuto['images'][] = $uploadUrlBase . $filename;
        }
    }
}

// Also handle imagenes[] (legacy field name)
if ($canUploadImages && isset($_FILES['imagenes']) && is_array($_FILES['imagenes']['name'])) {
    $allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    foreach ($_FILES['imagenes']['name'] as $i => $name) {
        if ($_FILES['imagenes']['error'][$i] !== UPLOAD_ERR_OK) continue;
        $mime = mime_content_type($_FILES['imagenes']['tmp_name'][$i]);
        if (!in_array($mime, $allowedTypes)) continue;
        $ext = pathinfo($name, PATHINFO_EXTENSION);
        $filename = uniqid('img_', true) . '.' . $ext;
        $dest = $uploadDir . $filename;
        if (move_uploaded_file($_FILES['imagenes']['tmp_name'][$i], $dest)) {
            $newAuto['images'][] = $uploadUrlBase . $filename;
        }
    }
}

// Append new auto and save
$autos[] = $newAuto;
$result = file_put_contents($jsonPath, json_encode(['success' => true, 'data' => $autos], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

if ($result === false) {
    echo json_encode(['success' => false, 'message' => 'Error al guardar en autos.json']);
} else {
    echo json_encode(['success' => true, 'message' => 'Auto publicado con exito', 'auto' => $newAuto]);
}
