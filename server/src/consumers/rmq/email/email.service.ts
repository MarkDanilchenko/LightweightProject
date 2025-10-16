import { Injectable, Logger, LoggerService } from "@nestjs/common";
import { AuthLocalCreatedEvent } from "@server/event/interfaces/event.interfaces";

@Injectable()
export class RmqEmailService {
  private readonly logger: LoggerService;
  constructor() {
    this.logger = new Logger(RmqEmailService.name);
  }

  async sendWelcomeVerificationEmail(payload: AuthLocalCreatedEvent): Promise<void> {}
}
