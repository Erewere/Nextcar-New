<?php
// hostinger-api/delete-auto.php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["success" => false, "message" => "Método no permitido"]);
    exit;
}

// Support both JSON input and Form input
$data = json_decode(file_get_contents('php://input'), true);
$id = intval($data['id'] ?? $_POST['id'] ?? 0);

if ($id <= 0) {
    echo json_encode(["success" => false, "message" => "ID inválido"]);
    exit;
}

// 1. Get images to delete files
$img_stmt = $conn->prepare("SELECT image_path FROM car_images WHERE car_id = ?");
$img_stmt->bind_param("i", $id);
$img_stmt->execute();
$img_res = $img_stmt->get_result();

while($img_row = $img_res->fetch_assoc()) {
    $filename = basename($img_row['image_path']);
    $filepath = $upload_dir . $filename;
    if (file_exists($filepath)) {
        unlink($filepath);
    }
}
$img_stmt->close();

// 2. Delete from DB (FK with Cascade will delete images entries)
$stmt = $conn->prepare("DELETE FROM cars WHERE id = ?");
$stmt->bind_param("i", $id);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Vehículo eliminado con éxito"]);
} else {
    echo json_encode(["success" => false, "message" => "Error de base de datos: " . $conn->error]);
}

$stmt->close();
$conn->close();
?>
