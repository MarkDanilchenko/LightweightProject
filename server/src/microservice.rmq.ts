import { NestFactory } from "@nestjs/core";
import { INestMicroservice } from "@nestjs/common";
import { RmqOptions, Transport } from "@nestjs/microservices";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import AppModule from "@server/app.module";

async function bootstrap(): Promise<void> {
  // Can not use ConfigService here, so use process.env to get configuration variables for RabbitMQ;
  const app: INestMicroservice = await NestFactory.createMicroservice<RmqOptions>(AppModule, {
    transport: Transport.RMQ,
    options: {
      urls: [
        `amqp://${process.env.RABBITMQ_DEFAULT_USER}:${process.env.RABBITMQ_DEFAULT_PASS}` +
          `@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}`,
      ],
      queue: process.env.RABBITMQ_MAIN_QUEUE,
      prefetchCount: parseInt(process.env.RABBITMQ_PREFETCH_COUNT!) || 1,
      persistent: process.env.RABBITMQ_PERSISTENT === "true",
      noAck: process.env.RABBITMQ_NO_ACK === "true",
      socketOptions: {
        heartbeatIntervalInSeconds: parseInt(process.env.RABBITMQ_HEARTBEAT_INTERVAL!) || 60,
        reconnectTimeInSeconds: parseInt(process.env.RABBITMQ_RECONNECT_TIME!) || 10,
      },
      queueOptions: {
        durable: process.env.RABBITMQ_DURABLE === "true",
      },
    },
  });

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  await app.listen().then((): void => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    app.get(WINSTON_MODULE_NEST_PROVIDER).log("RabbitMQ microservice (email) is running", "LightweightProject");
  });
}

void bootstrap();
