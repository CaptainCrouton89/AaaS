// Deep specs

// Let's hash paths to make a lookup table of file path and what it does, so that when dependencies are generated, the model can fetch all the related deeper content

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
      "name": "fileName.extension",
      "description": "string",
      "imports": [
        { "filePathFromRoot": "string" }
      ],
      "exports": [
        {
          "name": "string",
          "type": "function | type | component | class",
          "description": "string",
          "params": { "paramName": "type", ...more params },
          "properties": { "propName": "type", ...more props }, // props for components, classes, and types
          "returnType": "string | number | boolean | object | array | null | { "propName": "type", ...returnTypeProps} "
        },
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
