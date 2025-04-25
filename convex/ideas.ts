import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const ideas = await ctx.db
      .query("ideas")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    return ideas;
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get the highest order in the target status
    const existingIdeas = await ctx.db
      .query("ideas")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), userId),
          q.eq(q.field("status"), args.status)
        )
      )
      .collect();
    const maxOrder = Math.max(-1, ...existingIdeas.map((idea) => idea.order));

    await ctx.db.insert("ideas", {
      title: args.title,
      description: args.description,
      status: args.status,
      userId,
      order: maxOrder + 1,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("ideas"),
    title: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const idea = await ctx.db.get(args.id);
    if (!idea || idea.userId !== userId) {
      throw new Error("Not found");
    }

    await ctx.db.patch(args.id, {
      title: args.title,
      description: args.description,
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("ideas"),
    status: v.string(),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const idea = await ctx.db.get(args.id);
    if (!idea || idea.userId !== userId) {
      throw new Error("Not found");
    }

    // Shift all ideas in the target status with order >= target order
    const ideasToShift = await ctx.db
      .query("ideas")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), userId),
          q.eq(q.field("status"), args.status),
          q.gte(q.field("order"), args.order)
        )
      )
      .collect();

    for (const ideaToShift of ideasToShift) {
      await ctx.db.patch(ideaToShift._id, {
        order: ideaToShift.order + 1,
      });
    }

    await ctx.db.patch(args.id, {
      status: args.status,
      order: args.order,
    });
  },
});

export const reorder = mutation({
  args: {
    id: v.id("ideas"),
    newOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const idea = await ctx.db.get(args.id);
    if (!idea || idea.userId !== userId) {
      throw new Error("Not found");
    }

    if (idea.order === args.newOrder) {
      return;
    }

    // Get all ideas in the same status
    const ideasInStatus = await ctx.db
      .query("ideas")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), userId),
          q.eq(q.field("status"), idea.status)
        )
      )
      .collect();

    // Update orders
    for (const otherIdea of ideasInStatus) {
      if (otherIdea._id === idea._id) continue;

      let newOrder = otherIdea.order;
      if (idea.order < args.newOrder) {
        // Moving down
        if (otherIdea.order > idea.order && otherIdea.order <= args.newOrder) {
          newOrder = otherIdea.order - 1;
        }
      } else {
        // Moving up
        if (otherIdea.order >= args.newOrder && otherIdea.order < idea.order) {
          newOrder = otherIdea.order + 1;
        }
      }

      if (newOrder !== otherIdea.order) {
        await ctx.db.patch(otherIdea._id, { order: newOrder });
      }
    }

    await ctx.db.patch(args.id, { order: args.newOrder });
  },
});

export const deleteIdea = mutation({
  args: {
    id: v.id("ideas"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const idea = await ctx.db.get(args.id);
    if (!idea || idea.userId !== userId) {
      throw new Error("Not found");
    }

    await ctx.db.delete(args.id);
  },
});
