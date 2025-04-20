import axios from "axios";

export interface JobResponse {
  success: boolean;
  message: string;
  jobId: string;
}

interface AsyncToolArgs {
  toolName: string;
  args: Record<string, unknown>;
  agentId: string;
  path: string;
}

export const callAsyncTool = async (
  tool: AsyncToolArgs
): Promise<JobResponse> => {
  const response = await axios.post(
    `${process.env.API_BASE_URL || "http://localhost:3800"}/api/jobs`,
    tool
  );

  return response.data;
};
