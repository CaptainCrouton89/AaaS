import { Import } from "./types";

export class PathRegistry {
  private registry: Registry = {};

  constructor(registry: Registry) {
    this.registry = registry;
  }

  public getRegistry() {
    return this.registry;
  }

  public registerPath(path: string, data: any) {
    this.registry[path] = data;
  }

  public getPath(path: string) {
    return this.registry[path];
  }

  public formatContextFromImports(imports: Import[]): {
    path: string;
    data: string;
  }[] {
    const context = imports.map((importItem) => {
      const path = importItem.filePathFromRoot;
      const data = this.getPath(path);
      return {
        path,
        data: JSON.stringify(data),
      };
    });
    return context;
  }
}

export type Registry = Record<string, any>;
