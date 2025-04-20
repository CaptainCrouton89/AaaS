import { BaseAsyncJobTool, ToolResult, toolRegistry } from "./baseTool";

export class FetchWeatherTool extends BaseAsyncJobTool {
  readonly name = "fetchWeather";
  readonly description =
    "Fetches current weather information for a given location";
  readonly callback = "fetchWeather";
  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const location = args.location as string;

      if (!location) {
        return {
          success: false,
          data: null,
          error: "Location parameter is required",
        };
      }

      // This is a mock implementation - in a real scenario, you'd call an actual weather API
      // const response = await axios.get(`https://api.weather.com?location=${encodeURIComponent(location)}`);

      // Mock weather data
      const mockWeatherData = {
        location,
        temperature: Math.floor(Math.random() * 30) + 10, // Random temperature between 10-40°C
        condition: ["Sunny", "Cloudy", "Rainy", "Stormy"][
          Math.floor(Math.random() * 4)
        ],
        humidity: Math.floor(Math.random() * 60) + 30, // Random humidity between 30-90%
        timestamp: new Date().toISOString(),
      };

      return {
        success: true,
        data: {
          type: "weather",
          ...mockWeatherData,
        },
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// Register the tool
const fetchWeatherTool = new FetchWeatherTool();
toolRegistry.registerTool(fetchWeatherTool);
