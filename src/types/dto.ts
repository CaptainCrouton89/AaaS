export type AsyncToolResponse = {
  success: boolean;
  toolName: string;
  toolCallId: string;
  error?: any;
  data?: any;
};
