import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { EventName } from "@server/events/interfaces/events.interfaces";
import UserEntity from "@server/users/users.entity";
import { IsDate, IsString, IsUUID } from "class-validator";
import { Type } from "class-transformer";
import CommonEntity from "@server/common/common.entity";

@Entity({ name: "events", schema: "public" })
@Index(["userId"])
@Index(["name", "userId"])
export default class EventEntity extends CommonEntity {
  @PrimaryGeneratedColumn("uuid")
  @IsUUID()
  id: string;

  @Column({ type: "varchar" })
  @IsString()
  name: EventName;

  @Column({
    type: "uuid",
    comment: "actor who performed the events",
  })
  @IsUUID()
  userId: string;

  @Column({ type: "uuid", comment: "events related model, e.g. users, organization, etc., so FK is not set" })
  @IsUUID()
  modelId: string;

  @Column({
    type: "jsonb",
    default: {},
    comment: "additional events metadata",
  })
  @Type(() => Object)
  metadata: Record<string, any>;

  @CreateDateColumn({ type: "timestamptz" })
  @IsDate()
  createdAt: Date;

  // Associations;
  @ManyToOne(() => UserEntity, (user) => user.events, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
    nullable: false,
  })
  @JoinColumn({ name: "userId", referencedColumnName: "id" })
  @Type(() => UserEntity)
  user: UserEntity;
}
