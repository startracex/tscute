import { fileURLToPath, pathToFileURL, URL } from "node:url";

export const isFileProto = (path: URL | string): boolean => (path + "").startsWith("file:");

export const toFileURLPath = (path: URL | string): string => {
  return toFileURL(path) + "";
};

export const toFileURL = (path: URL | string): URL => {
  if (typeof path === "string") {
    if (isFileProto(path)) {
      return new URL(path);
    }
    return pathToFileURL(path);
  }
  return path;
};

export const toPath = (path: URL | string): string => {
  if (typeof path === "string") {
    if (isFileProto(path)) {
      return fileURLToPath(path);
    }
    return path;
  }
  return fileURLToPath(path);
};
