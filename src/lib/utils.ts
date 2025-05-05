export const truncateText = (text: string, options: { length: number }) => {
  return text.slice(0, options.length);
};

export const functionWithExponentialBackoff = async <T>(
  fn: () => Promise<T>,
  retries: number = 5,
  startDelay: number = 5000
) => {
  let delay = startDelay;
  for (let i = 0; i < retries; i++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      if (i === retries - 1) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
      console.log(`Retrying in ${delay}ms`);
    }
  }
  throw new Error("Failed to execute function");
};
