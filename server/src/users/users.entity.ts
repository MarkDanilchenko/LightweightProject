import {
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
import { IsArray, IsDate, IsEmail, IsOptional, IsString, IsUUID } from "class-validator";
import { Type } from "class-transformer";
import CommonEntity from "@server/common/common.entity";

@Entity({ name: "users", schema: "public" })
export default class UserEntity extends CommonEntity {
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
}
