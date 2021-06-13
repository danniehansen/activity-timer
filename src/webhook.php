<?php

use AsyncAws\DynamoDb\DynamoDbClient;
use AsyncAws\DynamoDb\Input\QueryInput;
use Bref\Websocket\SimpleWebsocketClient;

require_once '../vendor/autoload.php';

if ($_SERVER['REQUEST_METHOD'] === 'HEAD') {
    http_response_code(200);
    exit;
}

$secret = $_ENV['TRELLO_SECRET'] ?? '';
$postData = file_get_contents('php://input');

function hashIt(string $string): string {
    return base64_encode(hash_hmac('sha1', $string, $_ENV['TRELLO_SECRET'] ?? '', true));
}

$incomingHash = $_SERVER['HTTP_X_TRELLO_WEBHOOK'] ?? '';
$h2 = hashIt(hashIt($postData . 'https://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI']));
$h1 = hashIt($incomingHash);

$stderr = fopen('php://stderr', 'wb');

if ($h1 !== $h2) {
    fwrite($stderr, '[ERROR] Failed to verify signature. Re-registering webhook for safety');
    fclose($stderr);
    http_response_code(410);
    exit;
}

$client = new \GuzzleHttp\Client();

try {
    if (
        empty($_GET['token']) ||
        empty($_GET['apiKey'])
    ) {
        fwrite($stderr, '[ERROR] Failed to verify that token was valid. Re-registering webhook for safety');
        fclose($stderr);

        http_response_code(410);
        exit;
    }
} catch (\GuzzleHttp\Exception\GuzzleException $e) {
    fwrite($stderr, '[ERROR] Failed to verify that token was valid. Re-registering webhook for safety');
    fclose($stderr);
    http_response_code(410);
    exit;
}

/***
 * Validate plugin data for a valid Activity timer plugin which has both auto-timer enabled but also
 * matches the list id for triggering the timer from the settings on the action.
 *
 * @param array $pluginData
 * @param string|null $validateListAgainst
 *
 * @return bool
 */
function validatePluginData(array $pluginData, ?string $validateListAgainst = null): bool {
    return !empty(
        array_filter(
            $pluginData,
            static function ($plugin) use ($validateListAgainst) {
                try {
                    if (
                        !empty($plugin['value']) &&
                        (
                            $data = json_decode(
                                $plugin['value'],
                                true,
                                512,
                                JSON_THROW_ON_ERROR
                            )
                        )
                    ) {
                        return (
                            !empty($data['act-timer-auto-timer']) &&
                            !empty($data['act-timer-auto-timer-list-id']) &&
                            (
                                !$validateListAgainst ||
                                $validateListAgainst === $data['act-timer-auto-timer-list-id']
                            )
                        );
                    }
                } catch (JsonException $e) {
                }

                return false;
            }
        )
    );
}

try {
    if (
        ($token = $_GET['token'] ?? null) &&
        ($apiKey = $_GET['apiKey'] ?? null) &&
        !empty($postData) &&
        ($data = json_decode($postData, true, 512, JSON_THROW_ON_ERROR)) &&
        ($cardId = $data['action']['data']['card']['id'] ?? null) &&
        ($boardId = $data['action']['data']['board']['id'] ?? null) &&
        ($memberId = $data['action']['idMemberCreator'] ?? null) &&
        !empty($data['action']['type']) &&
        $data['action']['type'] === 'updateCard' &&
        !empty($data['action']['data']['listAfter']['id']) &&
        !empty($data['action']['data']['listBefore']['id']) &&
        // Detect that card moved
        $data['action']['data']['listAfter']['id'] !== $data['action']['data']['listBefore']['id']
    ) {
        if (
            (
                $board = $client->get(
                    sprintf(
                        'https://api.trello.com/1/boards/%s',
                        $boardId
                    ),
                    [
                        'query' => [
                            'token' => $token,
                            'key' => $apiKey,
                            'pluginData' => 'true',
                        ],
                    ]
                )->getBody()
            ) &&
            (
                $boardData = json_decode(
                    $board,
                    true,
                    512,
                    JSON_THROW_ON_ERROR
                )
            ) &&
            !empty($boardData['pluginData']) &&
            validatePluginData($boardData['pluginData'])
        ) {
            if (validatePluginData($boardData['pluginData'], $data['action']['data']['listAfter']['id'])) {
                $dynamoDb = new DynamoDbClient(
                    [
                        'accessKeyId' => $_ENV['AWS_ACCESS_KEY_ID'] ?? null,
                        'accessKeySecret' => $_ENV['AWS_SECRET_ACCESS_KEY'] ?? null,
                        'region' => $_ENV['AWS_DEFAULT_REGION'] ?? null,
                        'sessionToken' => $_ENV['AWS_SESSION_TOKEN'] ?? null
                    ]
                );

                if (
                    (
                        $result = $dynamoDb->query(
                            new QueryInput(
                                [
                                    'TableName' => 'production-ActivityTimerPubSub',
                                    'IndexName' => 'MemberIdIndex',
                                    'Limit' => 1,
                                    'KeyConditionExpression' => 'member_id = :m',
                                    'ExpressionAttributeValues' => [':m' => ['S' => $memberId]],
                                ]
                            )
                        )
                    )
                ) {
                    foreach ($result->getItems() as $item) {
                        if (
                            (
                                $websocketClient = SimpleWebsocketClient::create(
                                    $item['api_id']->getS(),
                                    $item['region']->getS(),
                                    $item['stage']->getS()
                                )
                            )
                        ) {
                            $websocketClient->message(
                                $item['connection_id']->getS(),
                                json_encode(
                                    [
                                        'type' => 'startTimer',
                                        'cardId' => $cardId,
                                    ],
                                    JSON_THROW_ON_ERROR
                                )
                            );
                        }
                    }
                }
            }

            fwrite($stderr, '[INFO] Webhook is valid!');
            fclose($stderr);
            exit;
        }

        fwrite($stderr, '[ERROR] Failed to get board plugin data. Re-registering webhook for safety');
        fclose($stderr);
        http_response_code(410);
        exit;
    }
} catch (JsonException $e) {
    fwrite($stderr, '[ERROR] Failed to decode JSON payload. Re-registering webhook for safety');
    fclose($stderr);
    http_response_code(410);
    exit;
}
