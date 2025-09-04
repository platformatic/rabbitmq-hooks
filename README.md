# @platformatic/rabbitmq-hooks

Wrap RabbitMQ inside your application easily.
This assumes that you have a RabbitMQ server running, and the exchanges are already setup.

Then you can:
- Export the messages published on an exchange to a HTTP endpoint with `POST` method.
- Publish messages to an exchange from a HTTP endpoint with a `POST` on `/publish` endpoint


## Getting Started

Create a new Platformatic application with the RabbitMQ Hooks package using [Wattpm](https://platformatic.io/docs/wattpm):

```bash
npx wattpm@latest create
```

And select `@platformatic/rabbitmq-hooks` from the list of available packages.

This application assumes that you have a RabbitMQ server running at `amqp://localhost`. A `my-exchange` exchange is created if not present.
Now start a RabbitMQ server if not already running, for instance with docker:

```bash
docker run -d --hostname my-rabbit --name plt-rabbit rabbitmq:3
```

Then you can run the application with `wattpm start`:

```bash
➜ wattpm start

[14:10:25.128] INFO (main/91344): Starting rabbitmq-hooks plugin
[14:10:25.197] INFO (main/91344): Connected to RabbitMQ
[14:10:25.198] INFO (main/91344): Listening to exchange my-exchange
[14:10:25.199] INFO (main/91344): No routing key specified
exchange my-exchange true
[14:10:25.213] INFO (main/91344): Registered message consumer
[14:10:25.255] INFO (main/91344): Server listening at http://0.0.0.0:3042
```

To test this, you can add a `out` endpoint to the app, e.g. in `routes/root` add:

```javascript
fastify.post('/out', async (request, reply) => {
  const message = await request.body.message
  console.log('RECEIVED MESSAGE FROM RABBITMQ')
  console.log(message)
})
```

Then change `.env` to use it:

```bash
PLT_SERVER_HOSTNAME=0.0.0.0
PLT_SERVER_LOGGER_LEVEL=info
PORT=3042
PLT_TYPESCRIPT=false
PLT_RABBITMQ_CONNECTION_URL=amqp://localhost
PLT_RABBITMQ_GENERATE_EXCHANGE=true
PLT_RABBITMQ_EXCHANGE_NAME_0=my-exchange
PLT_RABBITMQ_TARGET_URL_0=http://localhost:3042/out
PLT_RABBITMQ_TARGET_QUEUE_0=test-queue
```

And restart the application. Now you can test the application with:

```bash
curl -X POST -H "Content-Type: application/json" -d '{"message": "Hello World"}' http://localhost:3042/publish/my-exchange
```

The message is first posted on the exchange, and then the application will post it to the `out` endpoint:

```bash
[12:35:06.204] INFO (main/321646): incoming request
    reqId: "52a6d8d9-8ef6-44d7-914d-a0b45a8087e5"
    req: {
      "method": "POST",
      "url": "/publish/my-exchange",
      "hostname": "localhost:3042",
      "remoteAddress": "127.0.0.1",
      "remotePort": 59672
    }
[12:35:06.209] INFO (main/321646): Publishing to exchange my-exchange with routing key undefined
[12:35:06.218] INFO (main/321646): request completed
    reqId: "52a6d8d9-8ef6-44d7-914d-a0b45a8087e5"
    res: {
      "statusCode": 200
    }
    responseTime: 10.358657002449036
[12:35:06.232] INFO (main/321646): incoming request
    reqId: "0dd754ea-38ad-47d6-ba8b-5e70f3df4732"
    req: {
      "method": "POST",
      "url": "/out",
      "hostname": "localhost:3042",
      "remoteAddress": "127.0.0.1",
      "remotePort": 59680
    }
RECEIVED MESSAGE FROM RABBITMQ
[12:35:06.235] INFO (main/321646): request completed
    reqId: "0dd754ea-38ad-47d6-ba8b-5e70f3df4732"
    res: {
      "statusCode": 200
    }
    responseTime: 1.6560759991407394
{"message":"Hello World"}
```

## Configuration

The plugin has a `rabbitmq` configuration object with the following, e.g.:

```json
  "rabbitmq": {
    "url": "{PLT_RABBITMQ_CONNECTION_URL}",
    "generateExchange": "{PLT_RABBITMQ_GENERATE_EXCHANGE}",
    "exchanges": [
      {
        "name": "{PLT_RABBITMQ_EXCHANGE_NAME_0}",
        "targetUrl": "{PLT_RABBITMQ_TARGET_URL_0}",
        "queue": "{PLT_RABBITMQ_TARGET_QUEUE_0}"
      }
    ]
  }
```
With `.env`:

```bash
PLT_RABBITMQ_CONNECTION_URL=amqp://localhost
PLT_RABBITMQ_GENERATE_EXCHANGE=true
PLT_RABBITMQ_EXCHANGE_NAME_0=my-exchange
PLT_RABBITMQ_TARGET_URL_0=http://localhost:3042/out
PLT_RABBITMQ_TARGET_QUEUE_0=test-queue
```

Where:
- url: It's the RabbitMQ connection URL
- generateExchange: If true, the exchange is created if not present. This is useful for testing/developing. The exchange is created as `fanout` non-durable.
- exchanges: An array of exchanges to listen to:
    - name: The exchange name
    - targetUrl: The URL to post the message to. This can be a local URL, or a remote one.
    - routingKey: [OPTIONAL} The routing key to listen to. If not specified, all messages are listened to.
    - queue: [OPTIONAL] The queue name to listen to. If not specified, a random queue is created.
    - durableQueue: [OPTIONAL] If true, the queue is durable. Default is false.
    - exclusiveQueue: [OPTIONAL] If true, the queue is exclusive. Default is false.


