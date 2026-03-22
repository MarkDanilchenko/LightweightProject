import { Injectable, Logger, LoggerService } from "@nestjs/common";

@Injectable()
export default class RmqRetryService {
  private readonly logger: LoggerService;

  constructor() {
    this.logger = new Logger(RmqRetryService.name);
  }

  async processFailedMessage() {}

  async sendToRetryQueue() {}

  async sendToDeadQueue() {}
}
