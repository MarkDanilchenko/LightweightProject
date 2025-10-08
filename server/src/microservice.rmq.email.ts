import { NestFactory } from "@nestjs/core";
import { INestMicroservice } from "@nestjs/common";
import { RmqOptions, Transport } from "@nestjs/microservices";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import AppModule from "@server/app.module";

async function bootstrap(): Promise<void> {
  const app: INestMicroservice = await NestFactory.createMicroservice<RmqOptions>(AppModule, {
    transport: Transport.RMQ,
    options: {
      urls: [
        `amqp://${process.env.RABBITMQ_DEFAULT_USER}:${process.env.RABBITMQ_DEFAULT_PASS}` +
          `@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}`,
      ],
      queue: process.env.RABBITMQ_EMAIL_QUEUE,
      prefetchCount: parseInt(process.env.RABBITMQ_PREFETCH_COUNT!) || 1,
      socketOptions: {
        heartbeatIntervalInSeconds: parseInt(process.env.RABBITMQ_HEARTBEAT_INTERVAL!) || 60,
        reconnectTimeInSeconds: parseInt(process.env.RABBITMQ_RECONNECT_TIME!) || 10,
      },
      noAck: process.env.RABBITMQ_NO_ACK === "true",
      persistent: process.env.RABBITMQ_PERSISTENT === "true",
    },
  });

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  await app.listen().then((): void => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    app.get(WINSTON_MODULE_NEST_PROVIDER).log("RabbitMQ email microservice is running", "LightweightProject");
  });
}

void bootstrap();
