const { DynamoDB, PutItemCommand, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDB({ region: process.env.ACT_AWS_REGION });

async function main (event, context) {
  const {
    requestContext: { connectionId, routeKey, apiId, stage }
  } = event;

  if (routeKey === '$connect') {
    // handle new connection
    return {
      statusCode: 200
    };
  }

  if (routeKey === '$disconnect') {
    // handle disconnection
    const command = new DeleteItemCommand({
      TableName: process.env.ACT_DYNAMODB_TABLE,
      Key: {
        connection_id: {
          S: connectionId
        }
      }
    });

    await client.send(command);

    return {
      statusCode: 200
    };
  }

  const body = JSON.parse(event.body);

  if (!body || !body.listen_member_id) {
    return {
      statusCode: 500
    };
  }

  const command = new PutItemCommand({
    TableName: process.env.ACT_DYNAMODB_TABLE,
    Item: {
      connection_id: {
        S: connectionId
      },
      member_id: {
        S: body.listen_member_id
      },
      api_id: {
        S: apiId
      },
      region: {
        S: process.env.ACT_AWS_REGION
      },
      stage: {
        S: stage
      }
    }
  });

  await client.send(command);

  // $default handler
  return {
    statusCode: 200
  };
}

module.exports = { main };