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
    echo json_encode(['success' => false, 'message' => 'Metodo no permitido']);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    $input = $_POST;
}

$id = $input['id'] ?? null;
if (!$id) {
    echo json_encode(['success' => false, 'message' => 'ID requerido']);
    exit();
}

$jsonPath = __DIR__ . '/../autos.json';
$uploadDir = __DIR__ . '/../uploads/autos/';

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

// Delete associated images
$deletedAuto = $autos[$foundIndex];
if (!empty($deletedAuto['images'])) {
    foreach ($deletedAuto['images'] as $imgUrl) {
        $filename = basename($imgUrl);
        $imgPath = $uploadDir . $filename;
        if (file_exists($imgPath)) {
            unlink($imgPath);
        }
    }
}

array_splice($autos, $foundIndex, 1);

$saveData = ['success' => true, 'data' => array_values($autos)];
$result = file_put_contents($jsonPath, json_encode($saveData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

if ($result === false) {
    echo json_encode(['success' => false, 'message' => 'Error al escribir autos.json']);
    exit();
}

echo json_encode(['success' => true, 'message' => 'Auto eliminado correctamente', 'id' => $id]);
?>
