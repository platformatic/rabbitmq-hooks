# @platformatic/rabbitmq-hooks

Wrap RabbitMQ inside your application easily.
This assumes that you have a RabbitMQ server running, and the exchanges are already setup.

Then you can:
- Export the messages published on an exchange to a HTTP endpoint with `POST` method.
- Publish messages to an exchange from a HTTP endpoint with a `POST` on `/publish` endpoint


## Standalone Install & Test

You can generate a standalone application with: 

```bash
npx --package @platformatic/rabbitmq-hooks -c create-platformatic-rabbitmq-hooks
cd rabbitmq-hooks-app
```

This application assumes that you have a RabbitMQ server running at `amqp://localhost`. A `my-exchange` exchange is created if not present.
Now start a RabbitMQ server if not already running, for instance with docker:

```bash
docker run -d --hostname my-rabbit --name plt-rabbit rabbitmq:3

```

Then you can run the application with `npm start`:

```bash
➜ npm start

> start
> platformatic start

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
```

And restart the application. Now you can test the application with:

```bash
curl -X POST -H "Content-Type: application/json" -d '{"exchange": "my-exchange","message": "Hello World"}' http://localhost:3042/publish
```

The message is first posted on the exchange, and then the application will post it to the `out` endpoint:

```bash
[14:12:58.995] INFO (main/92213): Publishing to exchange my-exchange with routing key undefined
[14:12:58.997] INFO (main/92213): Hello World
[14:12:59.004] INFO (main/92213): request completed
    reqId: "f67629b9-1bd5-493c-8aee-7a48a5df71d2"
    res: {
      "statusCode": 200
    }
    responseTime: 10.371099999174476
[14:12:59.017] INFO (main/92213): incoming request
    reqId: "6e1d5a63-1a38-4e98-9e3d-ea8e98e8fc03"
    req: {
      "method": "POST",
      "url": "/out",
      "hostname": "localhost:3042",
      "remoteAddress": "127.0.0.1",
      "remotePort": 48896
    }
RECEIVED MESSAGE FROM RABBITMQ
[14:12:59.019] INFO (main/92213): request completed
    reqId: "6e1d5a63-1a38-4e98-9e3d-ea8e98e8fc03"
    res: {
      "statusCode": 200
    }
    responseTime: 0.9698329996317625

```


## Configuration

