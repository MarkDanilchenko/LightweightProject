import { BaseEntity } from "typeorm";
import { validate, ValidationError } from "class-validator";

export default class CommonEntity extends BaseEntity {
  /**
   * Validates the entity instance.
   *
   * @returns {Promise<void>}
   */
  async validate(): Promise<void> {
    const errors: ValidationError[] = await validate(this);

    if (errors.length > 0) {
      const errorMessages: string = errors
        .map((error: ValidationError): string[] => Object.values(error.constraints || {}))
        .flat()
        .join(", ");

      throw new Error(`${this.constructor.name} validation failed: ` + errorMessages);
    }
  }
}
