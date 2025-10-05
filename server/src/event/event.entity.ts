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
import { EventName } from "@server/event/interfaces/event.interfaces";
import UserEntity from "@server/user/user.entity";

@Entity({ name: "events" })
@Index(["userId"])
@Index(["name", "userId"])
export default class EventEntity extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar" })
  name: EventName;

  @Column({
    type: "uuid",
    comment: "actor who performed the event",
  })
  userId: string;

  @Column({ type: "uuid", comment: "event related model, e.g. user, organization, etc., so FK is not set" })
  modelId: string;

  @Column({
    type: "jsonb",
    default: "'{}'::jsonb",
    comment: "additional event metadata",
  })
  metadata: Record<string, any>;

  @CreateDateColumn({ type: "timestamp" })
  createdAt: Date;

  // associations
  @ManyToOne(() => UserEntity, (user) => user.events)
  @JoinColumn({ name: "userId", referencedColumnName: "id" })
  user: UserEntity;
}
