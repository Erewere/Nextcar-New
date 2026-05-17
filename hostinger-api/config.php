<?php
// hostinger-api/config.php
error_reporting(0);
ini_set('display_errors', 0);

// CORS Configuration
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE, PUT");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit;
}

// Database Configuration
$servername = "localhost";
$username = "u123456789_user"; // Replace with your MySQL user
$password = "your_password";   // Replace with your MySQL password
$dbname = "u123456789_db";     // Replace with your MySQL database name

// Connection
$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    die(json_encode(["success" => false, "message" => "Connection failed: " . $conn->connect_error]));
}

$conn->set_charset("utf8mb4");

// Configuration for Uploads
// Auto-detect the base URL path based on where this script is located
$protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http";
$dir_path = dirname($_SERVER['SCRIPT_NAME']); // e.g. /hostinger-api
$base_url = $protocol . "://" . $_SERVER['HTTP_HOST'] . rtrim($dir_path, '/') . "/uploads/autos/";
$upload_dir = __DIR__ . "/uploads/autos/";

if (!file_exists($upload_dir)) {
    mkdir($upload_dir, 0755, true);
}

// Helper for image validation
function validateImage($file) {
    $max_size = 5 * 1024 * 1024; // 5MB
    $allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    if ($file['size'] > $max_size) {
        return "El archivo " . $file['name'] . " es demasiado grande (Máx 5MB).";
    }
    
    if (class_exists('finfo')) {
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($file['tmp_name']);
    } elseif (function_exists('mime_content_type')) {
        $mime = mime_content_type($file['tmp_name']);
    } else {
        $info = getimagesize($file['tmp_name']);
        $mime = $info ? $info['mime'] : '';
    }
    
    if (!in_array($mime, $allowed_types)) {
        return "El archivo " . $file['name'] . " no es un tipo de imagen permitido (JPG, PNG, WEBP).";
    }
    
    return true;
}
?>
