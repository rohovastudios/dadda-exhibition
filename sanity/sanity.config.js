import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "./schemas";

export default defineConfig({
  name: "dadda",
  title: "dadda? Exhibition",
  projectId: process.env.SANITY_STUDIO_PROJECT_ID || "YOUR_PROJECT_ID",
  dataset: process.env.SANITY_STUDIO_DATASET || "production",
  plugins: [structureTool()],
  schema: {
    types: schemaTypes,
  },
});
