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

$autos = [];
if (file_exists($jsonPath)) {
    $content = file_get_contents($jsonPath);
    if ($content !== false) {
        $autos = json_decode($content, true) ?: [];
    }
}

$found = false;
foreach ($autos as &$auto) {
    if ($auto['id'] === $id) {
        $found = true;

        // Handle new image uploads
        $newImageUrls = [];
        if (!empty($_FILES['images'])) {
            $files = $_FILES['images'];
            $count = count($files['name']);
            for ($i = 0; $i < $count; $i++) {
                if ($files['error'][$i] === UPLOAD_ERR_OK) {
                    $ext = strtolower(pathinfo($files['name'][$i], PATHINFO_EXTENSION));
                    $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
                    if (!in_array($ext, $allowed)) continue;
                    $filename = $id . '_' . time() . '_' . $i . '.' . $ext;
                    $dest = $uploadDir . $filename;
                    if (move_uploaded_file($files['tmp_name'][$i], $dest)) {
                        $newImageUrls[] = '/uploads/autos/' . $filename;
                    }
                }
            }
        }

        // Keep existing images the user wants to keep
        $keepImages = [];
        if (!empty($_POST['keep_images'])) {
            $keepImages = is_array($_POST['keep_images']) ? $_POST['keep_images'] : [$_POST['keep_images']];
        }
        $allImages = array_merge($keepImages, $newImageUrls);

        // Update fields
        $fields = ['brand', 'model', 'bodyType', 'transmission', 'engineType', 'fuelConsumption', 'description', 'status'];
        foreach ($fields as $field) {
            if (isset($_POST[$field])) $auto[$field] = $_POST[$field];
        }
        $intFields = ['year', 'mileage', 'horsepower', 'passengers'];
        foreach ($intFields as $field) {
            if (isset($_POST[$field])) $auto[$field] = (int)$_POST[$field];
        }
        if (isset($_POST['price'])) $auto['price'] = (float)$_POST['price'];
        if (isset($_POST['highlights'])) $auto['highlights'] = json_decode($_POST['highlights'], true) ?: [];
        if (isset($_POST['features'])) $auto['features'] = json_decode($_POST['features'], true) ?: [];
        $auto['images'] = $allImages;
        $auto['updatedAt'] = date('c');
        break;
    }
}

if (!$found) {
    echo json_encode(['success' => false, 'message' => 'Auto no encontrado: ' . $id]);
    exit();
}

$result = file_put_contents($jsonPath, json_encode($autos, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

if ($result === false) {
    echo json_encode(['success' => false, 'message' => 'Error al escribir autos.json. Writable: ' . (is_writable($jsonPath) ? 'si' : 'no')]);
    exit();
}

echo json_encode(['success' => true, 'message' => 'Auto actualizado correctamente', 'id' => $id]);
?>
