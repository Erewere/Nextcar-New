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

$autos = [];
if (file_exists($jsonPath)) {
    $content = file_get_contents($jsonPath);
    if ($content !== false) {
        $autos = json_decode($content, true) ?: [];
    }
}

$found = false;
$newAutos = [];
foreach ($autos as $auto) {
    if ($auto['id'] === $id) {
        $found = true;
        // Delete associated images
        if (!empty($auto['images'])) {
            foreach ($auto['images'] as $imgUrl) {
                $imgPath = __DIR__ . '/../' . ltrim($imgUrl, '/');
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
    echo json_encode(['success' => false, 'message' => 'Auto no encontrado: ' . $id]);
    exit();
}

$result = file_put_contents($jsonPath, json_encode($newAutos, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

if ($result === false) {
    echo json_encode(['success' => false, 'message' => 'Error al escribir autos.json']);
    exit();
}

echo json_encode(['success' => true, 'message' => 'Auto eliminado correctamente', 'id' => $id]);
?>
