import axios from "axios";

export interface JobResponse {
  success: boolean;
  message: string;
  jobId: string;
}

interface AsyncToolArgs<T> {
  toolName: string;
  args: T;
  agentId: string;
  path: string;
}

export const callAsyncTool = async <T>(
  tool: AsyncToolArgs<T>
): Promise<JobResponse> => {
  const response = await axios.post(
    `${process.env.API_BASE_URL || "http://localhost:3800"}/api/jobs`,
    tool
  );

  return response.data;
};
