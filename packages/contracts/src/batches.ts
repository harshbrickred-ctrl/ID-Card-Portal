import { z } from "zod";
import { CARD_TEMPLATE_PRESETS } from "./integration";

export const CreateBatchSchema = z.object({
  name: z.string().min(1).max(120),
  templatePreset: z.enum(CARD_TEMPLATE_PRESETS),
  employeeSnapshotIds: z.array(z.string().uuid()).min(1),
});

export type CreateBatchDto = z.infer<typeof CreateBatchSchema>;
