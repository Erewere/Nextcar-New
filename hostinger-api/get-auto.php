<?php
// hostinger-api/get-auto.php
require_once 'config.php';

$id = intval($_GET['id'] ?? 0);
if ($id <= 0) {
    echo json_encode(["success" => false, "message" => "ID inválido"]);
    exit;
}

$stmt = $conn->prepare("SELECT * FROM cars WHERE id = ?");
$stmt->bind_param("i", $id);
$stmt->execute();
$result = $stmt->get_result();

if ($result && $result->num_rows > 0) {
    $row = $result->fetch_assoc();
    
    // Fetch images for this car
    $img_stmt = $conn->prepare("SELECT image_path FROM car_images WHERE car_id = ? ORDER BY sort_order ASC");
    $img_stmt->bind_param("i", $id);
    $img_stmt->execute();
    $img_result = $img_stmt->get_result();
    
    $images = [];
    while($img_row = $img_result->fetch_assoc()) {
        $images[] = $img_row['image_path'];
    }
    
    $row['images'] = $images;
    
    // Convert comma-separated strings back to arrays
    $row['features'] = !empty($row['features']) ? explode(',', $row['features']) : [];
    $row['highlights'] = !empty($row['highlights']) ? explode(',', $row['highlights']) : [];
    
    // Force numeric types
    $row['price'] = (float)$row['price'];
    $row['year'] = (int)$row['year'];
    $row['mileage'] = (int)$row['mileage'];
    $row['passengers'] = (int)$row['passengers'];
    
    echo json_encode([
        "success" => true,
        "message" => "Vehículo encontrado",
        "data" => $row
    ]);
} else {
    echo json_encode(["success" => false, "message" => "Vehículo no encontrado"]);
}

$stmt->close();
$conn->close();
?>
