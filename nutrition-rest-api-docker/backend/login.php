<?php
// Database configuration
$servername = "127.0.0.1";
$db_username = "";       // Change to your database username
$db_password = "";           // Change to your database password
$dbname = ""; // Change to your database name

// Create database connection
$conn = new mysqli($servername, $db_username, $db_password, $dbname);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
$conn->set_charset("utf8mb4");

// Process form data when submitted via POST
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['submit'])) {
    $user = trim($_POST['username']);
    $email = trim($_POST['email']);

    if (empty($user) || empty($email)) {
        echo "<script>alert('กรุณากรอกข้อมูลให้ครบถ้วน'); window.history.back();</script>";
        exit();
    }

    // Check if user already exists in the database
    $stmt = $conn->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
    $stmt->bind_param("ss", $user, $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        // User exists -> Log them in successfully
        echo "<script>
            alert('เข้าสู่ระบบสำเร็จ!'); 
            window.location.href = 'index.html';
        </script>";
        exit();
    } else {
        // User does not exist -> Automatically register them as a new user
        $stmt_insert = $conn->prepare("INSERT INTO users (username, email) VALUES (?, ?)");
        $stmt_insert->bind_param("ss", $user, $email);
        
        if ($stmt_insert->execute()) {
 $username_safe = htmlspecialchars($user, ENT_QUOTES, 'UTF-8');
echo "<script>
    localStorage.setItem('kitchen_sure_user', '$username_safe');
    alert('เข้าสู่ระบบสำเร็จ!'); 
    window.location.href = 'index.html';
</script>";
exit();
        } else {
            echo "<script>alert('เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง'); window.history.back();</script>";
        }
        $stmt_insert->close();
    }
    $stmt->close();
}
$conn->close();

?>