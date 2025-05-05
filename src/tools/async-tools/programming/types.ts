import { z } from "zod";

// Deep specs

// Let's hash paths to make a lookup table of file path and what it does, so that when dependencies are generated, the model can fetch all the related deeper content

export type Import = {
  filePathFromRoot: string;
};

export type ExportedCode = {
  name: string;
  type: "function" | "type" | "component" | "class";
  description: string;
  returnType?: string;
  properties?: Record<string, string>;
  params?: Record<string, string>;
};

export type Directory = {
  name: string;
  files: File[] | null;
  subDirectories: Directory[] | null;
};

export type File = {
  name: string;
  description: string;
  imports: Import[] | null; // relative paths will be used to get all the contents of the referenced files
  exports: ExportedCode[] | null; // detailed export data
};

const ImportSchema = z.object({
  filePathFromRoot: z.string(),
});

const ExportSchema: z.ZodType<ExportedCode> = z.lazy(() =>
  z.object({
    name: z.string(),
    type: z.enum(["function", "type", "component", "class"]),
    description: z
      .string()
      .describe("A brief description of the exported code"),
    properties: z
      .record(z.string(), z.string())
      .optional()
      .describe("The properties of the exported component, class, or type"),
    params: z
      .record(z.string(), z.string())
      .optional()
      .describe("The parameters of the exported function"),
    returnType: z
      .string()
      .optional()
      .describe("The return type of the exported code"),
  })
);

export const FileSchema: z.ZodType<File> = z.lazy(() =>
  z.object({
    name: z.string(),
    description: z.string(),
    imports: z
      .array(ImportSchema)
      .nullable()
      .describe("Imports from other files in the project"),
    exports: z
      .array(ExportSchema)
      .nullable()
      .describe(
        "Every export from the file, including functions, components, types, and classes, in detail"
      ),
  })
);

export const DirectorySchema: z.ZodType<Directory> = z.lazy(() =>
  z.object({
    name: z.string(),
    files: z
      .array(FileSchema)
      .nullable()
      .describe("All files in the directory"),
    subDirectories: z
      .array(DirectorySchema)
      .nullable()
      .describe("All subdirectories in the directory"),
  })
);
