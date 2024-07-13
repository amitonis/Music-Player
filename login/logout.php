<?php
session_start();

$_SESSION = array();

session_destroy();

if (isset($_COOKIE['username'])) {
    setcookie('username', '', time() - 3600, "/", "", true, true);
}

header("Location: login.html");
exit();
?>
