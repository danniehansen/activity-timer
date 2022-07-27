const crypto = require('crypto');
const https = require('https');
const {
  DynamoDB,
  QueryCommand,
  DeleteItemCommand
} = require('@aws-sdk/client-dynamodb');
const {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand
} = require('@aws-sdk/client-apigatewaymanagementapi');

const dynamoDbClient = new DynamoDB({ region: process.env.ACT_AWS_REGION });

class ValidationException extends Error {}

function verifyTrelloWebhookRequest(request, callbackURL) {
  const base64Digest = function (s) {
    return crypto
      .createHmac('sha1', process.env.ACT_TRELLO_SECRET)
      .update(s)
      .digest('base64');
  };

  const content = request.body + callbackURL;
  const doubleHash = base64Digest(content);
  const headerHash = request.headers['x-trello-webhook'];

  return doubleHash === headerHash;
}

/**
 * Validate plugin data. Ensures that auto timer is enabled and a list id is configured.
 * Will also check for a match against validateListAgainst & "act-timer-auto-timer-list-id"
 * if provided in the arguments.
 */
function validatePluginData(pluginData, validateListAgainst = null) {
  return (
    pluginData.filter((plugin) => {
      if (plugin.value) {
        const jsonValue = JSON.parse(plugin.value);

        if (jsonValue) {
          return (
            jsonValue['act-timer-auto-timer'] &&
            jsonValue['act-timer-auto-timer-list-id'] &&
            (!validateListAgainst ||
              validateListAgainst === jsonValue['act-timer-auto-timer-list-id'])
          );
        }
      }

      return false;
    }).length > 0
  );
}

/**
 * Didn't fell like including a 3rd party library for a simple GET request.
 * This gets the job done.
 */
function httpRequest(url, queryParams) {
  return new Promise((resolve, reject) => {
    https
      .get(
        `${url}?${new URLSearchParams(queryParams).toString()}`,
        {
          timeout: 5000
        },
        (resp) => {
          let data = '';

          // A chunk of data has been received.
          resp.on('data', (chunk) => {
            data += chunk;
          });

          // The whole response has been received. Print out the result.
          resp.on('end', () => {
            resolve(JSON.parse(data));
          });
        }
      )
      .on('timeout', (err) => {
        reject(err);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

async function main(event) {
  console.log('Incoming request', event);

  try {
    // Trello makes a HEAD request initially to "confirm" connectivity.
    // We need to respond with 200 as a OK signal.
    if (event.requestContext.http.method === 'HEAD') {
      return {
        statusCode: 200
      };
    }

    if (event.requestContext.http.method !== 'POST') {
      throw new ValidationException('Only accepting HEAD / POST');
    }

    const apiKey = event.queryStringParameters.apiKey;
    const token = event.queryStringParameters.token;

    if (!event.body || !apiKey || !token) {
      throw new ValidationException('Missing request');
    }

    const callbackUrl = `https://${event.requestContext.domainName}${event.requestContext.http.path}?token=${token}&apiKey=${apiKey}`;
    const post = JSON.parse(event.body);

    if (!post) {
      throw new ValidationException('Invalid POST');
    }

    if (!event.headers['x-trello-webhook']) {
      throw new ValidationException('Missing x trello webhook header');
    }

    if (!verifyTrelloWebhookRequest(event, callbackUrl)) {
      // Failed to verify signature. De-registering webhook for safety
      console.error(
        'Failed to verify signature. De-registering webhook for safety'
      );

      // 410 will de-register the webhook.
      return {
        statusCode: 410
      };
    }

    const cardId = post?.action?.data?.card?.id;
    const boardId = post?.action?.data?.board?.id;
    const memberId = post?.action?.idMemberCreator;
    const actionType = post?.action?.type;
    const listIdAfter = post?.action?.data?.listAfter?.id;
    const listIdBefore = post?.action?.data?.listBefore?.id;

    if (
      cardId &&
      boardId &&
      memberId &&
      actionType === 'updateCard' &&
      listIdAfter !== listIdBefore
    ) {
      try {
        const cardData = await httpRequest(
          `https://api.trello.com/1/boards/${boardId}`,
          {
            token,
            key: apiKey,
            pluginData: 'true'
          }
        );

        if (cardData.pluginData) {
          // If powerup doesn't have auto timer start enabled. Then we should disable the webhook
          // 410 will de-register the webhook.
          if (!validatePluginData(cardData.pluginData)) {
            console.log(
              'Plugin is either no longer active or auto start timer is no longer active. De-registering webhook for safety'
            );

            return {
              statusCode: 410
            };
          }

          // If user did not move card to list from settings. Ignore it.
          if (!validatePluginData(cardData.pluginData, listIdAfter)) {
            return {
              statusCode: 200
            };
          }

          // Search out websocket connections related with the member who did the card moving.
          const command = new QueryCommand({
            TableName: process.env.ACT_DYNAMODB_TABLE,
            IndexName: 'MemberIdIndex',
            Limit: 1,
            KeyConditionExpression: 'member_id = :m',
            ExpressionAttributeValues: {
              ':m': {
                S: memberId
              }
            }
          });

          const response = await dynamoDbClient.send(command);

          if (response.Items.length > 0) {
            const item = response.Items[0];

            const apiManagementClient = new ApiGatewayManagementApiClient({
              region: process.env.ACT_AWS_REGION,
              endpoint: `https://${item.api_id.S}.execute-api.${item.region.S}.amazonaws.com/${item.stage.S}`
            });

            // Notify the frontend that it should start the time for a specific card.
            const command = new PostToConnectionCommand({
              Data: JSON.stringify({
                type: 'startTimer',
                cardId
              }),
              ConnectionId: item.connection_id.S
            });

            try {
              await apiManagementClient.send(command);
            } catch (e) {
              console.error(
                'Encountered exception when attempting to send Websocket message to connection. Removing connection from DynamoDB...',
                e
              );

              // In case exceptions happen with API Gateway we fall back to removing the
              // connection from DynamoDB so we don't have dead clients around.
              const command = new DeleteItemCommand({
                TableName: process.env.ACT_DYNAMODB_TABLE,
                Key: {
                  connection_id: {
                    S: item.connection_id.S
                  }
                }
              });

              await dynamoDbClient.send(command);
            }
          }
        }
      } catch (e) {
        console.error('Received exception... re-registering weboohk', e);

        // 410 will de-register the webhook.
        return {
          statusCode: 410
        };
      }
    }

    return {
      statusCode: 200
    };
  } catch (e) {
    if (e instanceof ValidationException) {
      return {
        body: JSON.stringify({
          message: e.message
        }),
        statusCode: 500
      };
    }

    throw e;
  }
}

module.exports = { main };
