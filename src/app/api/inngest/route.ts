import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest-client";
import { generateStoryImages } from "@/lib/inngest-functions";

// Create the Inngest serve handler
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    generateStoryImages,
  ],
});
