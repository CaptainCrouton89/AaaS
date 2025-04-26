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
  componentProps: Record<string, string>;
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
  componentProps: z
    .record(z.string(), z.string())
    .describe("The prop names and types of the component"),
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
