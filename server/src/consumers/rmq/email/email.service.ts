import { Injectable, Logger, LoggerService } from "@nestjs/common";
import { AuthCreatedLocalEventClass } from "@server/event/event.events";

@Injectable()
export class RmqEmailService {
  private readonly logger: LoggerService;
  constructor() {
    this.logger = new Logger(RmqEmailService.name);
  }

  async sendWelcomeVerificationEmail(payload: AuthCreatedLocalEventClass): Promise<void> {}
}
