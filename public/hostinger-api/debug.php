<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

$jsonPath = __DIR__ . '/../autos.json';
$uploadDir = __DIR__ . '/../uploads/autos/';

$info = [
    '__DIR__' => __DIR__,
    'jsonPath' => $jsonPath,
    'jsonExists' => file_exists($jsonPath),
    'jsonWritable' => is_writable($jsonPath),
    'jsonDirWritable' => is_writable(dirname($jsonPath)),
    'uploadDir' => $uploadDir,
    'uploadDirExists' => is_dir($uploadDir),
    'uploadDirWritable' => is_writable($uploadDir),
    'phpVersion' => PHP_VERSION,
    'serverSoftware' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
];

echo json_encode($info, JSON_PRETTY_PRINT);
?>
