import {
  BaseEntity,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import UserEntity from "@/user/user.entity.js";

@Entity({ name: "authentications" })
@Index(["userId", "providerId"], { unique: true })
export default class AuthenticationEntity extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  userId: string;

  @Column({ type: "varchar" })
  provider: string;

  @Column({ type: "varchar" })
  providerId: string;

  @Column({ type: "varchar" })
  accessToken: string;

  @Column({ type: "varchar", nullable: true })
  refreshToken?: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;

  @DeleteDateColumn({ type: "timestamptz", nullable: true })
  deletedAt?: Date | null;

  @ManyToOne(() => UserEntity, (user) => user.authentications)
  user: UserEntity;
}
