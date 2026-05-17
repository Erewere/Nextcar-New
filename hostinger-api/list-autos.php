<?php
// hostinger-api/list-autos.php
require_once 'config.php';

$sql = "SELECT * FROM cars ORDER BY createdAt DESC";
$result = $conn->query($sql);

$cars = [];

if ($result && $result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $car_id = $row['id'];
        
        // Fetch images for this car using prepared statement
        $img_stmt = $conn->prepare("SELECT image_path FROM car_images WHERE car_id = ? ORDER BY sort_order ASC");
        $img_stmt->bind_param("i", $car_id);
        $img_stmt->execute();
        $img_result = $img_stmt->get_result();
        
        $images = [];
        while($img_row = $img_result->fetch_assoc()) {
            $images[] = $img_row['image_path'];
        }
        $img_stmt->close();
        
        $row['images'] = $images;
        
        // Convert comma-separated strings back to arrays
        $row['features'] = !empty($row['features']) ? explode(',', $row['features']) : [];
        $row['highlights'] = !empty($row['highlights']) ? explode(',', $row['highlights']) : [];
        
        // Force numeric types
        $row['price'] = (float)$row['price'];
        $row['year'] = (int)$row['year'];
        $row['mileage'] = (int)$row['mileage'];
        $row['passengers'] = (int)$row['passengers'];
        
        $cars[] = $row;
    }
}

echo json_encode([
    "success" => true,
    "message" => "Autos listados correctamente",
    "data" => $cars
]);
$conn->close();
?>
