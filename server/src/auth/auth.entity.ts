import {
  BaseEntity,
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

@Entity({ name: "authentications", schema: "public" })
@Index(["userId", "provider"], { unique: true })
export default class AuthenticationEntity extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  userId: string;

  @Column({ type: "enum", enum: AuthenticationProvider })
  provider: AuthenticationProvider;

  @Column({
    type: "varchar",
    nullable: true,
    comment: "app generated refresh token",
  })
  refreshToken?: string | null;

  @Column({
    type: "jsonb",
    default: {},
    comment: "additional authentication metadata",
  })
  metadata: AuthMetadata;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({
    type: "timestamptz",
    comment: `the last time the authentication was accessed, similar to "updatedAt"`,
  })
  lastAccessedAt: Date;

  // associations
  @ManyToOne(() => UserEntity, (user) => user.authentications, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
    nullable: false,
  })
  @JoinColumn({ name: "userId", referencedColumnName: "id" })
  user: UserEntity;
}
