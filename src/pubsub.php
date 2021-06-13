<?php

require __DIR__ . '/../vendor/autoload.php';

use AsyncAws\DynamoDb\Input\DeleteItemInput;
use AsyncAws\DynamoDb\Input\PutItemInput;
use AsyncAws\DynamoDb\ValueObject\AttributeValue;
use Bref\Context\Context;
use Bref\Event\ApiGateway\WebsocketEvent;
use Bref\Event\Http\HttpResponse;
use Bref\Event\ApiGateway\WebsocketHandler;
use AsyncAws\DynamoDb\DynamoDbClient;

class Websocket extends WebsocketHandler
{
    /**
     * @throws JsonException
     */
    public function handleWebsocket(WebsocketEvent $event, Context $context): HttpResponse
    {
        if ($eventType = $event->getEventType()) {
            $dynamoDb = new DynamoDbClient([
                'accessKeyId' => $_ENV['AWS_ACCESS_KEY_ID'] ?? null,
                'accessKeySecret' => $_ENV['AWS_SECRET_ACCESS_KEY'] ?? null,
                'region' => $_ENV['AWS_DEFAULT_REGION'] ?? null,
                'sessionToken' => $_ENV['AWS_SESSION_TOKEN'] ?? null
            ]);

            switch ($eventType) {
                case 'DISCONNECT':
                    $dynamoDb->deleteItem(
                        new DeleteItemInput(
                            [
                                'TableName' => 'production-ActivityTimerPubSub',
                                'ConsistentRead' => true,
                                'Key' => [
                                    'connection_id' => new AttributeValue(['S' => $event->getConnectionId()]),
                                ],
                            ]
                        )
                    );
                    break;

                case 'MESSAGE':
                    if (
                        ($body = $event->getBody()) &&
                        ($body = json_decode($body, true, 512, JSON_THROW_ON_ERROR)) &&
                        ($memberId = $body['listen_member_id'] ?? null)
                    ) {
                        $dynamoDb->putItem(new PutItemInput([
                            'TableName' => 'production-ActivityTimerPubSub',
                            'Item' => [
                                'connection_id' => new AttributeValue(['S' => $event->getConnectionId()]),
                                'member_id' => new AttributeValue(['S' => $memberId]),
                                'api_id' => new AttributeValue(['S' => $event->getApiId()]),
                                'region' => new AttributeValue(['S' => $event->getRegion()]),
                                'stage' => new AttributeValue(['S' => $event->getStage()]),
                            ],
                        ]));
                    } else {
                        return new HttpResponse('invalid event payload', [], 500);
                    }
                    break;
            }

            return new HttpResponse('OK', [], 200);
        }

        return new HttpResponse('No event type found', [], 500);
    }
}

return new Websocket();
