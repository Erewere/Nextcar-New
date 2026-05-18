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

$jsonPath = __DIR__ . '/../autos.json';
$uploadDir = __DIR__ . '/../uploads/autos/';

if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$autos = [];
if (file_exists($jsonPath)) {
    $content = file_get_contents($jsonPath);
    $autos = json_decode($content, true) ?: [];
}

$id = uniqid('auto_', true);
$imageUrls = [];

if (!empty($_FILES['images'])) {
    $files = $_FILES['images'];
    $count = count($files['name']);
    for ($i = 0; $i < $count; $i++) {
        if ($files['error'][$i] === UPLOAD_ERR_OK) {
            $ext = pathinfo($files['name'][$i], PATHINFO_EXTENSION);
            $filename = $id . '_' . $i . '.' . $ext;
            $dest = $uploadDir . $filename;
            if (move_uploaded_file($files['tmp_name'][$i], $dest)) {
                $imageUrls[] = '/uploads/autos/' . $filename;
            }
        }
    }
}

$newAuto = [
    'id' => $id,
    'brand' => $_POST['brand'] ?? '',
    'model' => $_POST['model'] ?? '',
    'year' => (int)($_POST['year'] ?? 0),
    'price' => (float)($_POST['price'] ?? 0),
    'mileage' => (int)($_POST['mileage'] ?? 0),
    'bodyType' => $_POST['bodyType'] ?? '',
    'transmission' => $_POST['transmission'] ?? '',
    'engineType' => $_POST['engineType'] ?? '',
    'horsepower' => (int)($_POST['horsepower'] ?? 0),
    'fuelConsumption' => $_POST['fuelConsumption'] ?? '',
    'passengers' => (int)($_POST['passengers'] ?? 0),
    'description' => $_POST['description'] ?? '',
    'highlights' => json_decode($_POST['highlights'] ?? '[]', true) ?: [],
    'features' => json_decode($_POST['features'] ?? '[]', true) ?: [],
    'images' => $imageUrls,
    'createdAt' => date('c'),
];

$autos[] = $newAuto;
file_put_contents($jsonPath, json_encode($autos, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

echo json_encode(['success' => true, 'message' => 'Auto subido correctamente', 'id' => $id]);
?>
