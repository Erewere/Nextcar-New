<?php
// hostinger-api/update-auto.php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["success" => false, "message" => "Método no permitido"]);
    exit;
}

$id = intval($_POST['id'] ?? 0);
if ($id <= 0) {
    echo json_encode(["success" => false, "message" => "ID inválido"]);
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
$status = trim($_POST['status'] ?? 'available');

if (empty($brand) || empty($model) || $id <= 0) {
    echo json_encode(["success" => false, "message" => "ID, Marca y Modelo son requeridos"]);
    exit;
}

// Ensure $status is initialized (done above)
$stmt = $conn->prepare("UPDATE cars SET 
        brand=?, model=?, year=?, price=?, mileage=?, 
        bodyType=?, transmission=?, engineType=?, 
        horsepower=?, fuelConsumption=?, passengers=?, 
        description=?, features=?, highlights=?, status=? 
        WHERE id=?");

$stmt->bind_param("ssidisssssissssi", 
    $brand, $model, $year, $price, $mileage, 
    $bodyType, $transmission, $engineType, $horsepower, $fuelConsumption, 
    $passengers, $description, $features, $highlights, $status, $id
);

if ($stmt->execute()) {
    $errors = [];
    
    // Handle Images
    // 1. Get current images in DB using Prepared Statement
    $current_images = [];
    $img_stmt = $conn->prepare("SELECT image_path FROM car_images WHERE car_id = ?");
    $img_stmt->bind_param("i", $id);
    $img_stmt->execute();
    $img_res = $img_stmt->get_result();
    while($img_row = $img_res->fetch_assoc()) {
        $current_images[] = $img_row['image_path'];
    }
    $img_stmt->close();

    // 2. Identify which ones to keep (from front-end)
    $keep_images = [];
    if (isset($_POST['keep_images'])) {
        $received_keep = $_POST['keep_images'];
        if (is_array($received_keep)) {
            $keep_images = $received_keep;
        } else {
            // Check if it's JSON string or comma separated
            $decoded = json_decode($received_keep, true);
            $keep_images = is_array($decoded) ? $decoded : explode(',', $received_keep);
        }
    }

    // 3. Delete from DB and disk images not in keep list using Prepared Statement
    foreach ($current_images as $img_path) {
        if (!in_array($img_path, $keep_images)) {
            $filename = basename($img_path);
            $filepath = $upload_dir . $filename;
            if (file_exists($filepath)) {
                unlink($filepath);
            }
            $del_img = $conn->prepare("DELETE FROM car_images WHERE car_id = ? AND image_path = ?");
            $del_img->bind_param("is", $id, $img_path);
            $del_img->execute();
            $del_img->close();
        }
    }

    // 4. Add new images using Prepared Statement
    if (isset($_FILES['images'])) {
        $files = $_FILES['images'];
        if (is_array($files['name'])) {
            for ($i = 0; $i < count($files['name']); $i++) {
                $file_arr = [
                    'name' => $files['name'][$i],
                    'type' => $files['type'][$i], // Now including full type
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
                            $new_img_stmt = $conn->prepare("INSERT INTO car_images (car_id, image_path, sort_order) VALUES (?, ?, ?)");
                            $order = $i + 100;
                            $new_img_stmt->bind_param("isi", $id, $image_path, $order);
                            $new_img_stmt->execute();
                            $new_img_stmt->close();
                        } else {
                            $errors[] = "Error al mover " . $file_arr['name'];
                        }
                    } else {
                        $errors[] = $validation;
                    }
                } else if ($file_arr['error'] !== UPLOAD_ERR_NO_FILE) {
                    $errors[] = "Error en subida de " . $file_arr['name'] . " (Código: " . $file_arr['error'] . ")";
                }
            }
        }
    }
    
    echo json_encode([
        "success" => true, 
        "message" => "Vehículo actualizado con éxito" . (count($errors) > 0 ? ". Pero algunas imágenes fallaron." : ""),
        "errors" => $errors
    ]);
} else {
    echo json_encode(["success" => false, "message" => "Error de base de datos: " . $conn->error]);
}

$stmt->close();
$conn->close();
?>
