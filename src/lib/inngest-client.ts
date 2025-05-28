import { Inngest } from "inngest";

// Create an Inngest client
export const inngest = new Inngest({ 
  id: "magic-story-app",
  // Use a non-breaking configuration in development
  isDev: process.env.NODE_ENV === "development",
});
