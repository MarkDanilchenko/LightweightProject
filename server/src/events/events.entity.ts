import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { EventName } from "@server/events/interfaces/events.interfaces";
import UserEntity from "@server/users/users.entity";

@Entity({ name: "events", schema: "public" })
@Index(["userId"])
@Index(["name", "userId"])
export default class EventEntity extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar" })
  name: EventName;

  @Column({
    type: "uuid",
    comment: "actor who performed the events",
  })
  userId: string;

  @Column({ type: "uuid", comment: "events related model, e.g. users, organization, etc., so FK is not set" })
  modelId: string;

  @Column({
    type: "jsonb",
    default: "'{}'::jsonb",
    comment: "additional events metadata",
  })
  metadata: Record<string, any>;

  @CreateDateColumn({ type: "timestamp" })
  createdAt: Date;

  // Associations;
  @ManyToOne(() => UserEntity, (user) => user.events)
  @JoinColumn({ name: "userId", referencedColumnName: "id" })
  user: UserEntity;
}
