import {
  BaseEntity,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import AuthenticationEntity from "@server/auth/auth.entity";
import EventEntity from "@server/events/events.entity";
import { IsArray, IsDate, IsEmail, IsOptional, IsString, IsUUID, validate, ValidationError } from "class-validator";
import { Type } from "class-transformer";

@Entity({ name: "users", schema: "public" })
export default class UserEntity extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  @IsUUID()
  id: string;

  @Column({ type: "varchar", unique: true, nullable: true })
  @IsString()
  @IsOptional()
  username?: string | null;

  @Column({ type: "varchar", nullable: true })
  @IsString()
  @IsOptional()
  firstName?: string | null;

  @Column({ type: "varchar", nullable: true })
  @IsString()
  @IsOptional()
  lastName?: string | null;

  @Column({ type: "varchar", unique: true })
  @IsEmail()
  email: string;

  @Column({ type: "varchar", nullable: true })
  @IsString()
  @IsOptional()
  avatarUrl?: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  @IsDate()
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  @IsDate()
  updatedAt: Date;

  @DeleteDateColumn({ type: "timestamptz", nullable: true })
  @IsDate()
  @IsOptional()
  deletedAt?: Date | null;

  // Associations;
  @OneToMany(() => AuthenticationEntity, (authentication: AuthenticationEntity): UserEntity => authentication.user)
  @IsArray()
  @IsOptional()
  @Type(() => AuthenticationEntity)
  authentications: AuthenticationEntity[];

  @OneToMany(() => EventEntity, (event: EventEntity): UserEntity => event.user)
  @IsArray()
  @IsOptional()
  @Type(() => EventEntity)
  events: EventEntity[];

  // Validation;
  /**
   * Validates the user entity instance.
   *
   * @returns {Promise<void>}
   * @throws {Error} If the user entity is invalid.
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

  /**
   * Validates the user entity instance (static method).
   *
   * @param user - The user entity to validate.
   *
   * @returns {Promise<void>}
   * @throws {Error} If the user entity is invalid.
   */
  static async validateUser(user: UserEntity): Promise<void> {
    const userEntity = new UserEntity();

    Object.assign(userEntity, user);

    await userEntity.validate();
  }
}
