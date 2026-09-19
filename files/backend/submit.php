<?php
// Include the database connection file
include 'login.php';

// Check if the form was actually submitted
if (isset($_POST['submit'])) {
    
    // Collect and sanitize input variables from the form
    $user = $_POST['username'];
    $email = $_POST['email'];

    // Use Prepared Statements to securely insert data
    $stmt = $conn->prepare("INSERT INTO users (username, email) VALUES (?, ?)");
    $stmt->bind_param("ss", $user, $email);

    // Execute the query and check if successful
    if ($stmt->execute()) {
        echo "<h3>Data successfully submitted to the database!</h3>";
        echo "<a href='login.php'>Go Back</a>";
    } else {
        echo "Error: " . $stmt->error;
    }

    // Close the statement and connection
    $stmt->close();
    $conn->close();
} else {
    // Redirect back to the form if someone tries to access this page directly
    header("Location: login.php");
    exit();
}
?>
