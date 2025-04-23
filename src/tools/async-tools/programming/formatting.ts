export class FullFileContext {
  readonly relativeFilePath: string;
  readonly fileDescription?: string;
  readonly fileType: string;
  readonly fileContent: string;

  constructor(
    relativeFilePath: string,
    fileType: string,
    fileContent: string,
    fileDescription?: string
  ) {
    this.fileDescription = fileDescription;
    this.fileType = fileType;
    this.fileContent = fileContent;
    this.relativeFilePath = relativeFilePath;
  }

  format(withCode: boolean = true, withDescription: boolean = true) {
    return `
<File relativeFilePath=${this.relativeFilePath}>
    ${
      withDescription
        ? `<Description>\n${this.fileDescription}\n</Description>`
        : ""
    }
    ${withCode ? `<Code>\n${this.fileContent}\n</Code>` : ""}
</File>`;
  }
}

export type FunctionContextType = {
  functionName: string;
  functionDescription: string;
  functionParams: Record<string, string> | null;
  functionReturnType: string;
};

export class FunctionContext {
  readonly functionName: string;
  readonly functionParams: Record<string, string> | null;
  readonly functionReturnType: string;
  readonly functionContent: string;
  readonly functionDescription?: string;
  readonly relativeFilePath?: string;

  constructor(
    functionName: string,
    functionParams: Record<string, string> | null,
    functionReturnType: string,
    functionContent: string,
    functionDescription?: string,
    relativeFilePath?: string
  ) {
    this.functionName = functionName;
    this.functionDescription = functionDescription;
    this.functionParams = functionParams;
    this.functionReturnType = functionReturnType;
    this.functionContent = functionContent;
    this.relativeFilePath = relativeFilePath;
  }

  format(withCode: boolean = true, withDescription: boolean = true) {
    return `
<Function name=${this.functionName} fromFile=${this.relativeFilePath}>
    ${
      withDescription
        ? `<Description>\n${this.functionDescription}\n</Description>`
        : ""
    }
    <Params>
        ${Object.entries(this.functionParams || {})
          .map(([key, value]) => `${key}: ${value}`)
          .join("\n")}
    </Params>
    <Returns>
        ${JSON.stringify(this.functionReturnType)}
    </Returns>
    ${withCode ? `<Code>\n${this.functionContent}\n</Code>` : ""}
</Function>`;
  }
}

export class ClassContext {
  readonly className: string;
  readonly classDescription?: string;
  readonly classContent: string;
  readonly classMethods: FunctionContext[];
  constructor(
    className: string,
    classContent: string,
    classDescription?: string,
    classMethods: FunctionContext[] = []
  ) {
    this.className = className;
    this.classDescription = classDescription;
    this.classContent = classContent;
    this.classMethods = classMethods;
  }

  format(withDescription: boolean = true) {
    return `
<Class:${this.className}>
    ${
      withDescription
        ? `<Description>\n${this.classDescription}\n</Description>`
        : ""
    }
    <Code>
        ${this.classContent}
    </Code>
</Class:${this.className}>`;
  }
}

export type CodingContext = FullFileContext | FunctionContext | ClassContext;

export const formatContext = (context: CodingContext[]): string => {
  return context.map((c) => c.format()).join("\n");
};

export const getProgrammingSystemPrompt = (keyInformation: string[]) => `
You are an expert software engineer, who is tasked with writing code for just a single file.

You will be given a description of the overall architecture of the code base, as well as a list of functions and classes that need to be written. Return the code for the file, and nothing else.

Key information:
${keyInformation.map((k) => `- ${k}`).join("\n")}
`;

/*

The goal: Get it so that with one command, you can build an entire code base in 30 seconds

Coding agent tells claude sub-agent to program a file.
1. Passes it extremely detailed instructions
    - Other architecture that's being built
    - The functions from other files that it interacts with
    // - The classes from other files it interacts with // todo: let's deal with this later
    - File name
    - File type
    - Overall description
    - Functions it needs to include
        - Name
        - Description
        - Params
        - Return object

*/
