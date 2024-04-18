# @platformatic/rabbitmq-hooks

Wrap RabbitMQ inside your application easily.
This assumes that you have a RabbitMQ server running, and the exchanges are already setup.

Then you can:
- Export the messages published on an exchange to a HTTP endpoint with `POST` method.
- Publish messages to an exchange from a HTTP endpoint with a `POST` on `/publish` endpoint


## Standalone Install & Setup

You can generate a standalone application with: 

```
npx --package @platformatic/pg-hooks -c create-platformatic-rabbitmq-hooks-app
cd rabbitmq-hooks-app
```

Then if a rabbitmq is running you can run the application with:

```
npm start
```

## Configuration
[TODO]
