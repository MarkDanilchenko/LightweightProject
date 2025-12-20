import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import UserEntity from "@server/users/users.entity";
import { AuthenticationProvider, AuthMetadata } from "@server/auth/interfaces/auth.interfaces";
import { IsDate, IsOptional, IsString, IsUUID } from "class-validator";
import { Type } from "class-transformer";
import CommonEntity from "@server/common/common.entity";

@Entity({ name: "authentications", schema: "public" })
@Index(["userId", "provider"], { unique: true })
export default class AuthenticationEntity extends CommonEntity {
  @PrimaryGeneratedColumn("uuid")
  @IsUUID()
  id: string;

  @Column({ type: "uuid" })
  @IsUUID()
  userId: string;

  @Column({ type: "enum", enum: AuthenticationProvider })
  @IsString()
  provider: AuthenticationProvider;

  @Column({
    type: "varchar",
    nullable: true,
    comment: "app generated refresh token",
  })
  @IsString()
  @IsOptional()
  refreshToken?: string | null;

  @Column({
    type: "jsonb",
    default: {},
    comment: "additional authentication metadata",
  })
  @Type(() => Object)
  metadata: AuthMetadata;

  @CreateDateColumn({ type: "timestamptz" })
  @IsDate()
  createdAt: Date;

  @UpdateDateColumn({
    type: "timestamptz",
    comment: `the last time the authentication was accessed, similar to "updatedAt"`,
  })
  @IsDate()
  lastAccessedAt: Date;

  // associations
  @ManyToOne(() => UserEntity, (user) => user.authentications, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
    nullable: false,
  })
  @JoinColumn({ name: "userId", referencedColumnName: "id" })
  @Type(() => UserEntity)
  user: UserEntity;
}
