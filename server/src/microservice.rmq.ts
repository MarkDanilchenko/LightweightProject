import * as amqp from "amqplib";
import { NestFactory } from "@nestjs/core";
import { INestMicroservice, LoggerService } from "@nestjs/common";
import { RmqOptions, Transport } from "@nestjs/microservices";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import AppModule from "@server/app.module";

interface RabbitMQConnectionOptions {
  defaultUser: string;
  defaultPassword: string;
  host: string;
  port: number;
  mainQueue: string;
  queueDurability: boolean;
}

/**
 * Sets up RabbitMQ topology with dead-letter and retry queues for the main queue.
 *
 * Creates two supportive queues:
 * - Dead-letter queue: For failed messages after all retry attempts;
 * - Retry queue: For temporary storage of failed messages before retry in main queue;
 *
 * @param {RabbitMQConnectionOptions} options - RabbitMQ connection and queue configuration options;
 *
 * @returns {Promise<void>} Resolves when topology is set up;
 */
async function setupRmqTopology(options: RabbitMQConnectionOptions): Promise<void> {
  const { defaultUser, defaultPassword, host, port, mainQueue, queueDurability } = options;

  const connection = await amqp.connect(`amqp://${defaultUser}:${defaultPassword}@${host}:${port}`);
  const channel = await connection.createChannel();

  const deadQueue = `${mainQueue}-dead`;
  const retryQueue = `${mainQueue}-retry`;
  await channel.assertQueue(deadQueue, { durable: queueDurability });
  await channel.assertQueue(retryQueue, {
    durable: queueDurability,
    arguments: {
      "x-dead-letter-exchange": "", // When job's ttl is out, send to default exchange;
      "x-dead-letter-routing-key": mainQueue, // Send to main queue;
    },
  });

  await channel.close();
  await connection.close();
}

/**
 * Bootstraps the RabbitMQ microservice.
 *
 * @returns {Promise<void>} A promise, that resolves, when the microservice is ready.
 */
async function bootstrap(): Promise<void> {
  // Can not use ConfigService here, so use process.env to get configuration variables for RabbitMQ;
  const {
    RABBITMQ_DEFAULT_USER,
    RABBITMQ_DEFAULT_PASS,
    RABBITMQ_HOST,
    RABBITMQ_PORT,
    RABBITMQ_MAIN_QUEUE,
    RABBITMQ_PREFETCH_COUNT,
    RABBITMQ_PERSISTENT,
    RABBITMQ_NO_ACK,
    RABBITMQ_HEARTBEAT_INTERVAL,
    RABBITMQ_RECONNECT_TIME,
    RABBITMQ_DURABLE,
  } = process.env as Record<string, string>;

  await setupRmqTopology({
    defaultUser: RABBITMQ_DEFAULT_USER,
    defaultPassword: RABBITMQ_DEFAULT_PASS,
    host: RABBITMQ_HOST,
    port: parseInt(RABBITMQ_PORT),
    mainQueue: RABBITMQ_MAIN_QUEUE,
    queueDurability: RABBITMQ_DURABLE === "true",
  });

  const microserviceRmq: INestMicroservice = await NestFactory.createMicroservice<RmqOptions>(AppModule, {
    transport: Transport.RMQ,
    options: {
      urls: [`amqp://${RABBITMQ_DEFAULT_USER}:${RABBITMQ_DEFAULT_PASS}@${RABBITMQ_HOST}:${RABBITMQ_PORT}`],
      queue: RABBITMQ_MAIN_QUEUE,
      prefetchCount: parseInt(RABBITMQ_PREFETCH_COUNT) || 1,
      persistent: RABBITMQ_PERSISTENT === "true",
      noAck: RABBITMQ_NO_ACK === "true",
      socketOptions: {
        heartbeatIntervalInSeconds: parseInt(RABBITMQ_HEARTBEAT_INTERVAL) || 60,
        reconnectTimeInSeconds: parseInt(RABBITMQ_RECONNECT_TIME) || 10,
      },
      queueOptions: {
        durable: RABBITMQ_DURABLE === "true",
      },
    },
  });

  const logger = microserviceRmq.get(WINSTON_MODULE_NEST_PROVIDER) as LoggerService;
  microserviceRmq.useLogger(logger);

  await microserviceRmq.listen().then((): void => logger.log("RabbitMQ microservice is running", "NestMicroservice"));
}

void bootstrap();
