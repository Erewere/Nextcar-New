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

// Paths relative to this file location (public_html/hostinger-api/)
$jsonPath = __DIR__ . '/../autos.json';
$uploadDir = __DIR__ . '/../uploads/autos/';
$canUploadImages = false;

// Try to ensure upload directory exists (non-fatal if fails)
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
        // Handle both formats: plain array OR {success:true, data:[...]}
        if (isset($decoded['data']) && is_array($decoded['data'])) {
            $autos = $decoded['data'];
        } elseif (is_array($decoded)) {
            $autos = $decoded;
        }
    }
}

$id = uniqid('auto_', true);
$imageUrls = [];
if ($canUploadImages && !empty($_FILES['images'])) {
    $files = $_FILES['images'];
    $count = count($files['name']);
    for ($i = 0; $i < $count; $i++) {
        if ($files['error'][$i] === UPLOAD_ERR_OK) {
            $ext = strtolower(pathinfo($files['name'][$i], PATHINFO_EXTENSION));
            $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
            if (!in_array($ext, $allowed)) continue;
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
    'status' => 'available',
    'createdAt' => date('c'),
];

$autos[] = $newAuto;

// Save back in {success:true, data:[...]} format
$saveData = ['success' => true, 'data' => $autos];
$result = file_put_contents($jsonPath, json_encode($saveData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

if ($result === false) {
    echo json_encode(['success' => false, 'message' => 'Error al escribir autos.json. Writable: ' . (is_writable(dirname($jsonPath)) ? 'si' : 'no')]);
    exit();
}

echo json_encode(['success' => true, 'message' => 'Auto guardado correctamente', 'auto' => $newAuto, 'imagesUploaded' => count($imageUrls), 'imageUploadAvailable' => $canUploadImages]);
?>
