declare module "markdown-it" {
  class MarkdownIt {
    constructor(options?: any);
    render(markdown: string): string;
  }
  export = MarkdownIt;
}
