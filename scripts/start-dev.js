const { spawn } = require("child_process");

const rawArgs = process.argv.slice(2);
let defaultPort = null;

const forwardedArgs = [];
for (let index = 0; index < rawArgs.length; index += 1) {
  const arg = rawArgs[index];
  if (arg === "--default-port") {
    defaultPort = rawArgs[index + 1] || null;
    index += 1;
    continue;
  }
  forwardedArgs.push(arg);
}

// `pnpm start -- --host 127.0.0.1` forwards a literal `--` to the script.
// Strip only the leading delimiter so webpack-cli still receives real flags.
const sanitizedArgs =
  forwardedArgs[0] === "--" ? forwardedArgs.slice(1) : forwardedArgs;

const hasPortArg = sanitizedArgs.some(
  (arg) => arg === "--port" || arg.startsWith("--port=")
);

const webpackArgs = ["serve", "--env", "standalone"];

if (defaultPort && !hasPortArg) {
  webpackArgs.push("--port", defaultPort);
}

webpackArgs.push(...sanitizedArgs);

const child = spawn(
  process.platform === "win32" ? "webpack.cmd" : "webpack",
  webpackArgs,
  {
    stdio: "inherit",
    env: process.env,
  }
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
