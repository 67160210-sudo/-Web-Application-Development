<?php
// 1. Define your MySQL database credentials
$host = "localhost";
$db_user = "root";       // Default username for local environments like XAMPP
$db_pass = "";           // Default password is blank for local XAMPP
$db_name = "my_database"; // Change to your actual database name

// 2. Establish connection to MySQL using MySQLi
$conn = new mysqli($host, $db_user, $db_pass, $db_name);

// Check if the connection failed
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// 3. Process the form data when submitted
if (isset($_POST['submit'])) {
    $username = $_POST['username'];
    $email = $_POST['email'];

    // 4. Securely prepare the SQL injection-proof query
    $stmt = $conn->prepare("INSERT INTO users (username, email) VALUES (?, ?)");
    $stmt->bind_param("ss", $username, $email);

    // 5. Execute and check success
    if ($stmt->execute()) {
        echo "Data saved successfully!";
    } else {
        echo "Error saving data: " . $stmt->error;
    }

    // Close connections
    $stmt->close();
}

$conn->close();

?>