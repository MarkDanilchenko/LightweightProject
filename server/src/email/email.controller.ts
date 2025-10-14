import { Controller, Logger, LoggerService } from "@nestjs/common";
import { RmqEmailService } from "@server/email/email.service";
import { Ctx, MessagePattern, Payload, RmqContext } from "@nestjs/microservices";
import { EventName } from "@server/event/interfaces/event.interfaces";
import { AuthCreatedLocalEventClass } from "@server/event/event.events";

@Controller()
export class RmqEmailController {
  private readonly logger: LoggerService;
  private readonly rmqEmailService: RmqEmailService;

  constructor(rmqEmailService: RmqEmailService) {
    this.logger = new Logger(RmqEmailController.name);
    this.rmqEmailService = rmqEmailService;
  }

  @MessagePattern(EventName.AUTH_CREATED_LOCAL)
  public async handleAuthCreatedLocal(
    @Payload() payload: AuthCreatedLocalEventClass,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      channel.ack(originalMsg);
    } catch (error) {
      channel.nack(originalMsg);

      this.logger.error("🚀 ~ RmqEmailController ~ handleAuthCreatedLocal ~ error:", error);
    }
  }
}
