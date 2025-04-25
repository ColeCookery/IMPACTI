import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  ideas: defineTable({
    title: v.string(),
    description: v.string(),
    status: v.string(),
    userId: v.id("users"),
    order: v.number(),
  }).index("by_status_and_order", ["status", "order"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
