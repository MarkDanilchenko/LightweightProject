import { Controller, Logger, LoggerService } from "@nestjs/common";
import { RmqEmailService } from "@server/consumers/rmq/email/email.service";
import { Ctx, MessagePattern, Payload, RmqContext } from "@nestjs/microservices";
import { AuthLocalCreatedEvent, EventName } from "@server/event/interfaces/event.interfaces";

@Controller()
export class RmqEmailController {
  private readonly logger: LoggerService;
  private readonly rmqEmailService: RmqEmailService;

  constructor(rmqEmailService: RmqEmailService) {
    this.logger = new Logger(RmqEmailController.name);
    this.rmqEmailService = rmqEmailService;
  }

  @MessagePattern(EventName.AUTH_LOCAL_CREATED)
  public async handleAuthCreatedLocal(
    @Payload() payload: AuthLocalCreatedEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      await this.rmqEmailService.sendWelcomeVerificationEmail(payload);

      channel.ack(originalMsg);
    } catch (error) {
      channel.nack(originalMsg);

      this.logger.error("🚀 ~ RmqEmailController ~ handleAuthCreatedLocal ~ error:", error);
    }
  }
}
