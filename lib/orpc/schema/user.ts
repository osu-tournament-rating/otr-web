import { users } from "@/lib/db/schema";
import { createSelectSchema } from 'drizzle-zod';
import { CreatedUpdatedOmit } from "./common";

export const UserSchema = createSelectSchema(users).omit(CreatedUpdatedOmit)