import * as fs from "node:fs";
import path from "node:path";
import ejs from "ejs";
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
