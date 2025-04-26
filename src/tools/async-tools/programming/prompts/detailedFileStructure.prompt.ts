import { z } from "zod";

// Deep specs

// Let's hash paths to make a lookup table of file path and what it does, so that when dependencies are generated, the model can fetch all the related deeper content

export type Import = {
  filePathFromRoot: string;
};

export type FunctionExport = {
  functionName: string;
  functionDescription: string;
  functionParams: Record<string, string>;
  functionReturnType: string;
};

export type TypeExport = {
  typeName: string;
  typeDescription: string;
  typeJsonSchema: Record<string, string>;
};

export type TSXExport = {
  componentName: string;
  componentDescription: string;
};

export type ClassExport = {
  className: string;
  classMethods: FunctionExport[];
};

export type Export = FunctionExport | TypeExport | TSXExport | ClassExport;

export type Directory = {
  name: string;
  files: File[];
  subDirectories: Directory[];
};

export type File = {
  name: string;
  description: string;
  imports: Import[]; // relative paths will be used to get all the contents of the referenced files
  exports: Export[]; // detailed export data
};

const ImportSchema = z.object({
  filePathFromRoot: z.string(),
});

const FunctionExportSchema = z.object({
  functionName: z.string(),
  functionDescription: z
    .string()
    .describe("A brief description of the function"),
  functionParams: z
    .record(z.string(), z.string())
    .describe("Parameter names and types"),
  functionReturnType: z.string(),
});

const TypeExportSchema = z.object({
  typeName: z.string(),
  typeDescription: z.string(),
  typeJsonSchema: z
    .record(z.string(), z.string())
    .describe("The JSON schema of the type"),
});

const TSXExportSchema = z.object({
  componentName: z.string().describe("The name of the component"),
  componentDescription: z.string(),
});

const ClassExportSchema = z.object({
  className: z.string(),
  classMethods: z.array(FunctionExportSchema),
});

const ExportSchema = z.lazy(() =>
  z.union([
    FunctionExportSchema,
    TypeExportSchema,
    TSXExportSchema,
    ClassExportSchema,
  ])
);

export const FileSchema: z.ZodType<File> = z.lazy(() =>
  z.object({
    name: z.string(),
    description: z.string(),
    imports: z
      .array(ImportSchema)
      .describe("Imports from other files in the project"),
    exports: z
      .array(ExportSchema)
      .describe(
        "Every export from the file, including functions, types, and classes"
      ),
  })
);

export const DirectorySchema: z.ZodType<Directory> = z.lazy(() =>
  z.object({
    name: z.string(),
    files: z.array(FileSchema).describe("All files in the directory"),
    subDirectories: z.array(DirectorySchema),
  })
);

export const getDetailedFileStructureSystemPrompt = () => `
You are an expert software engineer, who must write the detailed inputs and outputs for every single file in the code base.

For each file, you must write the following:
- The name of the file
- The path of the file
- A description of the file
- The imports of the file
- The exports of the file

You will be given a description of the code base and a directory structure of the code base. Use this information to write the detailed inputs and outputs for every single file in the code base.

At a high level, the output should look like this:

{
  "name": "string",
  "files": [
    {
      "name": "string",
      "description": "string",
      "imports": [
        { "filePathFromRoot": "string" }
      ],
      "exports": [
        {
          "functionName": "string",
          "functionDescription": "string",
          "functionParams": [{ "paramName": "type" }],
          "functionReturnType": "string | number | boolean | object | array | null" // If the return type is an object, use the JSON schema.
        },
        {
          "typeName": "string",
          "typeDescription": "string",
          "typeJsonSchema": json schema
        },
        {
          "componentName": "string",
          "componentDescription": "string"
        },
        {
          "className": "string",
          "classMethods": [
            {
              "functionName": "string",
              "functionDescription": "string",
              "functionParams": [{ "paramName": "type" }],
              "functionReturnType": "string | number | boolean | object | array | null" // If the return type is an object, use the JSON schema.
            }
          ]
        }
      ]
  ],
  "subDirectories": [
    {
      "name": "string",
      "files": [...more files],
      "subDirectories": [...more subdirectories]
    }
  ]
}

<Guidelines>

  <FilesGuidelines>    
    <ImportsGuidelines>
      - List only the imports from other files in the codebase.
      - Do not list imports from outside the codebase.
      - Do not list imports from the same file.
    </ImportsGuidelines>
    <ExportsGuidelines>
      - List all the exports from the file.
      - For functions, list the function name, description, parameters, and return type (Use JSON schema for the return type).
      - For types, list the type name, description, and JSON schema.
      - For components, list the component name and description.
      - For classes, list the class name and methods.
    </ExportsGuidelines>
    <SubDirectoriesGuidelines>
      - List all the subdirectories in the directory.
      - For each subdirectory, list the name, files, and subdirectories.
    </SubDirectoriesGuidelines>
  </FilesGuidelines>
</Guidelines>`;

export const getDetailedFileStructureUserPrompt = (
  executiveSummary: string
) => `
${executiveSummary}

With this information, please write the detailed inputs and outputs for every single file in the code base. 
`;
