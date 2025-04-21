import { toolRegistry } from "./baseTool";

// Import all tools to make sure they are registered
import "./deepSearchTool";

// Export for external use
export { toolRegistry };

// Log all registered tools on startup
console.log("Registered tools:");
toolRegistry.getAllTools().forEach((tool) => {
  console.log(`- ${tool.name}: ${tool.description}`);
});
