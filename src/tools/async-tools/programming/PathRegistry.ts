import { Directory, File, Import } from "./types";

type RegisteredItem = (File | Directory) & { itemType: "file" | "directory" };

export type Registry = Record<string, RegisteredItem>;

export class PathRegistry {
  private registry: Registry = {};

  constructor(registry: Registry) {
    this.registry = registry;
  }

  public getRegistry(): Registry {
    return this.registry;
  }

  public registerPath(
    path: string,
    data: File | Directory,
    itemType: "file" | "directory"
  ): RegisteredItem {
    // remove extension
    const newPath = path.replace(/\.[^.]+$/, "");
    this.registry[newPath] = { ...data, itemType };
    return this.registry[newPath];
  }

  public getPath(path: string): RegisteredItem {
    try {
      const newPath = path.replace(/\.[^.]+$/, "");
      return this.registry[newPath];
    } catch (error) {
      console.error(`[PathRegistry] Error getting path: ${path}`, error);
      throw new Error(`[PathRegistry] Error getting path: ${path}`);
    }
  }

  public formatContextFromImports(
    imports: Import[],
    rootPath: string
  ): {
    path: string;
    context: string;
  }[] {
    const context = imports.map((importItem) => {
      const path = `${rootPath}/${importItem.filePathFromRoot}`;
      const item = this.getPath(path);
      if (!item) {
        console.error(
          `[PathRegistry] Error getting path: ${path} for import: ${importItem.filePathFromRoot} and rootPath: ${rootPath}`
        );
        return {
          path,
          context: "",
        };
      }
      if (item.itemType === "file") {
        const fileItem = item as File;
        return {
          path,
          context: `File: ${fileItem.name}\nDescription: ${
            fileItem.description
          }\nExports: ${JSON.stringify(fileItem.exports, null, 2)}`,
        };
      } else if (item.itemType === "directory") {
        const directoryItem = item as Directory;
        return {
          path,
          context: `Directory: ${directoryItem.name}\nSubDirectories: ${
            directoryItem.subDirectories
          }\nFiles: ${JSON.stringify(directoryItem.files, null, 2)}`,
        };
      } else {
        throw new Error(
          `[PathRegistry] Registered item is not a file or directory: ${path} for import: ${importItem.filePathFromRoot} and rootPath: ${rootPath}`
        );
      }
    });
    return context;
  }
}

// Register all directories in the architecture to the registry
export const registerDirectories = (
  dir: Directory,
  pathRegistry: PathRegistry,
  path = ""
): void => {
  const currentPath = path ? `${path}/${dir.name}` : dir.name;
  pathRegistry.registerPath(currentPath, dir, "directory");

  if (dir.files) {
    for (const file of dir.files) {
      pathRegistry.registerPath(`${currentPath}/${file.name}`, file, "file");
    }
  }

  if (dir.subDirectories) {
    for (const subDir of dir.subDirectories) {
      registerDirectories(subDir, pathRegistry, currentPath);
    }
  }
};
