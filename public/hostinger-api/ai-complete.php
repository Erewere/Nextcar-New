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

// Leer API Key desde variable de entorno o archivo de configuracion
$apiKey = getenv('GEMINI_API_KEY');
if (!$apiKey) {
    $configFile = __DIR__ . '/gemini-config.php';
    if (file_exists($configFile)) {
        require_once $configFile;
    }
}

if (!$apiKey) {
    echo json_encode(['success' => false, 'message' => 'GEMINI_API_KEY no configurada']);
    exit();
}

// Leer datos del request
$input = json_decode(file_get_contents('php://input'), true);
$brand = isset($input['brand']) ? trim($input['brand']) : '';
$model = isset($input['model']) ? trim($input['model']) : '';
$year  = isset($input['year'])  ? trim($input['year'])  : '';

if (!$brand || !$model) {
    echo json_encode(['success' => false, 'message' => 'Marca y modelo son requeridos']);
    exit();
}

// Construir prompt para Gemini
$prompt = "Eres un experto en autos. Para el vehiculo: $year $brand $model, proporciona la siguiente informacion en formato JSON (sin markdown, solo JSON puro):\n\n{\n  \"bodyType\": \"tipo de carroceria en espanol (Sedan, SUV, Pickup, Hatchback, Coupe, etc)\",\n  \"transmission\": \"Automatica o Manual\",\n  \"engineType\": \"descripcion del motor (ej: 4 cilindros 1.8L)\",\n  \"horsepower\": \"caballos de fuerza numericos (solo el numero)\",\n  \"fuelConsumption\": \"consumo promedio en km/l (solo el numero)\",\n  \"highlights\": [\"caracteristica 1\", \"caracteristica 2\", \"caracteristica 3\"],\n  \"features\": [\"equipamiento 1\", \"equipamiento 2\", \"equipamiento 3\", \"equipamiento 4\"],\n  \"description\": \"descripcion atractiva de 2-3 oraciones para venta en Mexico\"\n}";

// Llamar a la API de Gemini
$url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' . $apiKey;

$requestBody = json_encode([
    'contents' => [
        [
            'parts' => [
                ['text' => $prompt]
            ]
        ]
    ],
    'generationConfig' => [
        'temperature' => 0.7,
        'maxOutputTokens' => 1024
    ]
]);

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $requestBody);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    echo json_encode(['success' => false, 'message' => 'Error de conexion: ' . $curlError]);
    exit();
}

if ($httpCode !== 200) {
    echo json_encode(['success' => false, 'message' => 'Error de Gemini API: HTTP ' . $httpCode, 'detail' => $response]);
    exit();
}

$geminiData = json_decode($response, true);
$text = $geminiData['candidates'][0]['content']['parts'][0]['text'] ?? '';

// Limpiar posible markdown del response
$text = preg_replace('/^```json\s*/i', '', $text);
$text = preg_replace('/\s*```$/i', '', $text);
$text = trim($text);

$aiData = json_decode($text, true);

if (!$aiData) {
    echo json_encode(['success' => false, 'message' => 'No se pudo parsear respuesta de IA', 'raw' => $text]);
    exit();
}

// Formatear highlights y features como strings separados por coma si vienen como array
if (isset($aiData['highlights']) && is_array($aiData['highlights'])) {
    $aiData['highlights'] = implode(', ', $aiData['highlights']);
}
if (isset($aiData['features']) && is_array($aiData['features'])) {
    $aiData['features'] = implode(', ', $aiData['features']);
}

echo json_encode(array_merge(['success' => true], $aiData));
?>
