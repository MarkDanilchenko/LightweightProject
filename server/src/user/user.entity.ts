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

@Entity({ name: "users" })
export default class UserEntity extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", unique: true })
  username: string;

  @Column({ type: "varchar", nullable: true })
  firstName?: string | null;

  @Column({ type: "varchar", nullable: true })
  lastName?: string | null;

  @Column({ type: "varchar", unique: true })
  email: string;

  @Column({ type: "varchar", nullable: true })
  avatarUrl?: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;

  @DeleteDateColumn({ type: "timestamptz", nullable: true })
  deletedAt?: Date | null;

  // associations
  @OneToMany(() => AuthenticationEntity, (authentication) => authentication.user)
  authentications: AuthenticationEntity[];
}
