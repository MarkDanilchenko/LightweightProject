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

@Entity({ name: "users", schema: "public" })
export default class UserEntity extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", unique: true, nullable: true, default: null })
  username: string | null;

  @Column({ type: "varchar", nullable: true, default: null })
  firstName: string | null;

  @Column({ type: "varchar", nullable: true, default: null })
  lastName: string | null;

  @Column({ type: "varchar", unique: true })
  email: string;

  @Column({ type: "varchar", nullable: true, default: null })
  avatarUrl: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;

  @DeleteDateColumn({ type: "timestamptz", nullable: true, default: null })
  deletedAt: Date | null;

  // Associations;
  @OneToMany(() => AuthenticationEntity, (authentication: AuthenticationEntity): UserEntity => authentication.user)
  authentications: AuthenticationEntity[];

  @OneToMany(() => EventEntity, (event: EventEntity): UserEntity => event.user)
  events: EventEntity[];
}
