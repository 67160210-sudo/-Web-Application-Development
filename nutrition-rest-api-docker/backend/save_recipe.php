<?php
// Enable error logging for debugging (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json; charset=utf-8');

// Database configuration
$servername = "127.0.0.1";
$db_username = "";       // Change to your database username
$db_password = "";           // Change to your database password
$dbname = ""; // Change to your database name

$conn = new mysqli($servername, $db_username, $db_password, $dbname);
if ($conn->connect_error) {
    echo json_encode(["status" => "error", "message" => "Database connection failed: " . $conn->connect_error]);
    exit();
}
$conn->set_charset("utf8mb4");

// Read raw JSON post data sent from JavaScript fetch
$inputJSON = file_get_contents('php://input');
$data = json_decode($inputJSON, true);

if ($data && !empty($data['dishName'])) {
    $username = $data['username'] ?? 'Guest';
    $dishName = $data['dishName'];
    $servings = $data['servings'] ?? 1;
    $kcal = $data['kcal'] ?? 0;
    $protein = $data['protein'] ?? 0;
    $carb = $data['carb'] ?? 0;
    $fat = $data['fat'] ?? 0;
    $sugar = $data['sugar'] ?? 0;
    $sodium = $data['sodium'] ?? 0;

    $stmt = $conn->prepare("INSERT INTO user_recipes (username, dish_name, servings, total_kcal, total_protein, total_carb, total_fat, total_sugar, total_sodium) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    if (!$stmt) {
        echo json_encode(["status" => "error", "message" => "Prepare failed: " . $conn->error]);
        exit();
    }

    $stmt->bind_param("ssidddddd", $username, $dishName, $servings, $kcal, $protein, $carb, $fat, $sugar, $sodium);

    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "Recipe calculation uploaded successfully!"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Execute failed: " . $stmt->error]);
    }
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "Invalid data received"]);
}

$conn->close();
?>