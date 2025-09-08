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
import UserEntity from "@server/user/user.entity";
import { AuthMetadata } from "@server/auth/interfaces/auth.interfaces";

@Entity({ name: "authentications" })
@Index(["userId", "provider"], { unique: true })
export default class AuthenticationEntity extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  userId: string;

  @Column({ type: "varchar" })
  provider: string;

  @Column({
    type: "varchar",
    nullable: true,
    default: null,
    comment: "app generated refresh token",
  })
  refreshToken: string | null;

  @Column({
    type: "jsonb",
    default: "'{}'::jsonb",
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
  @ManyToOne(() => UserEntity, (user) => user.authentications)
  @JoinColumn({ name: "userId", referencedColumnName: "id" })
  user: UserEntity;
}
