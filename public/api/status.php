<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

// Execute openclaw status --json
$output = shell_exec('openclaw status --json 2>&1');

// Parse the JSON output
$data = json_decode($output, true);

if ($data === null) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to get status', 'raw' => $output]);
    exit;
}

echo json_encode($data);
?>