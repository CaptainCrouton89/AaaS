export const truncateText = (text: string, options: { length: number }) => {
  return text.slice(0, options.length);
};
