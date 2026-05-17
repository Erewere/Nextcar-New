<?php
// hostinger-api/config.php

// CORS Configuration - ONLY ALLOW YOUR DOMAINS
$allowed_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://yourdomain.com", // Replace with your actual domain
    "https://ais-dev-loqdmqkye4utksjuxsc57k-171595729037.us-west2.run.app" // App preview
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
}

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
$base_url = "https://" . $_SERVER['HTTP_HOST'] . "/api/uploads/autos/";
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
    
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($file['tmp_name']);
    
    if (!in_array($mime, $allowed_types)) {
        return "El archivo " . $file['name'] . " no es un tipo de imagen permitido (JPG, PNG, WEBP).";
    }
    
    return true;
}
?>
