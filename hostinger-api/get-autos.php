<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$jsonFile = __DIR__ . '/autos.json';

if (!file_exists($jsonFile)) {
    echo json_encode(['success' => true, 'data' => []]);
    exit();
}

$content = file_get_contents($jsonFile);
$data = json_decode($content, true);

if ($data === null) {
    echo json_encode(['success' => true, 'data' => []]);
    exit();
}

// Support both {data: [...]} and plain array formats
if (isset($data['data'])) {
    echo json_encode(['success' => true, 'data' => $data['data']]);
} else if (is_array($data)) {
    echo json_encode(['success' => true, 'data' => $data]);
} else {
    echo json_encode(['success' => true, 'data' => []]);
}
?>
