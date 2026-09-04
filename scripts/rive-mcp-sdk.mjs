import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const globalNodeModules = execFileSync("npm", ["root", "-g"], {
  encoding: "utf8",
}).trim();
const clientRoot = resolve(
  globalNodeModules,
  "rive-mcp-server/node_modules/@modelcontextprotocol/sdk/dist/esm/client",
);

const clientModule = await import(pathToFileURL(resolve(clientRoot, "index.js")).href);
const stdioModule = await import(pathToFileURL(resolve(clientRoot, "stdio.js")).href);

export const { Client } = clientModule;
export const { StdioClientTransport } = stdioModule;
