<?php
// hostinger-api/upload.php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["success" => false, "message" => "Método no permitido"]);
    exit;
}

// Sanitization
$brand = trim($_POST['brand'] ?? '');
$model = trim($_POST['model'] ?? '');
$year = intval($_POST['year'] ?? 0);
$price = floatval($_POST['price'] ?? 0);
$mileage = intval($_POST['mileage'] ?? 0);
$bodyType = trim($_POST['bodyType'] ?? '');
$transmission = trim($_POST['transmission'] ?? '');
$engineType = trim($_POST['engineType'] ?? '');
$horsepower = trim($_POST['horsepower'] ?? '');
$fuelConsumption = trim($_POST['fuelConsumption'] ?? '');
$passengers = intval($_POST['passengers'] ?? 5);
$description = trim($_POST['description'] ?? '');
$features = trim($_POST['features'] ?? '');
$highlights = trim($_POST['highlights'] ?? '');
$status = 'available';

if (empty($brand) || empty($model) || $year <= 0 || $price <= 0) {
    echo json_encode(["success" => false, "message" => "Faltan campos obligatorios (Marca, Modelo, Año, Precio)"]);
    exit;
}

$stmt = $conn->prepare("INSERT INTO cars (brand, model, year, price, mileage, bodyType, transmission, engineType, horsepower, fuelConsumption, passengers, description, features, highlights, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

// Types: s=string, i=integer, d=double
$stmt->bind_param("ssidisssssissss", 
    $brand, $model, $year, $price, $mileage, 
    $bodyType, $transmission, $engineType, $horsepower, $fuelConsumption, 
    $passengers, $description, $features, $highlights, $status
);

if ($stmt->execute()) {
    $car_id = $conn->insert_id;
    $errors = [];
    
    // Process Images
    if (isset($_FILES['images'])) {
        $files = $_FILES['images'];
        for ($i = 0; $i < count($files['name']); $i++) {
            $file_arr = [
                'name' => $files['name'][$i],
                'type' => $files['type'][$i],
                'tmp_name' => $files['tmp_name'][$i],
                'error' => $files['error'][$i],
                'size' => $files['size'][$i]
            ];
            
            if ($file_arr['error'] === UPLOAD_ERR_OK) {
                $validation = validateImage($file_arr);
                if ($validation === true) {
                    $ext = pathinfo($file_arr['name'], PATHINFO_EXTENSION);
                    $filename = time() . "_" . uniqid() . "." . $ext;
                    $target = $upload_dir . $filename;
                    
                    if (move_uploaded_file($file_arr['tmp_name'], $target)) {
                        $image_path = $base_url . $filename;
                        $img_stmt = $conn->prepare("INSERT INTO car_images (car_id, image_path, sort_order) VALUES (?, ?, ?)");
                        $img_stmt->bind_param("isi", $car_id, $image_path, $i);
                        $img_stmt->execute();
                        $img_stmt->close();
                    } else {
                        $errors[] = "No se pudo mover el archivo " . $file_arr['name'];
                    }
                } else {
                    $errors[] = $validation;
                }
            } else if ($file_arr['error'] !== UPLOAD_ERR_NO_FILE) {
                $errors[] = "Error al subir " . $file_arr['name'] . " (Código: " . $file_arr['error'] . ")";
            }
        }
    }
    
    echo json_encode([
        "success" => true, 
        "message" => "Vehículo creado con éxito" . (count($errors) > 0 ? ". Pero algunas imágenes fallaron." : ""), 
        "data" => ["id" => $car_id],
        "errors" => $errors
    ]);
} else {
    echo json_encode(["success" => false, "message" => "Error de base de datos: " . $conn->error]);
}

$stmt->close();
$conn->close();
?>
