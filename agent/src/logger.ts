import chalk from "chalk";

export function banner() {
    console.log();
    console.log(chalk.bold.cyan("Aether"));
    console.log(chalk.gray("Secure terminal sharing"));
    console.log();
  }

 export function printcode(code: string) {
    console.log();
    console.log(
      chalk.bgBlue.white.bold(`  ${code}  `)
    );
    console.log();
  }

export function  divider() {
    console.log(chalk.gray("────────────────────────────────────────"));
  }

export function  info(message: string) {
    console.log(`${chalk.blue("ℹ")}  ${message}`);
  }

  export function success(message: string) {
    console.log(`${chalk.green("✓")}  ${message}`);
  }

  export function warn(message: string) {
    console.log(`${chalk.yellow("⚠")}  ${message}`);
  }

  export function error(message: string) {
    console.log(`${chalk.red("✕")}  ${message}`);
  }

  export function step(title: string, message?: string) {
    console.log();
    console.log(chalk.bold(title));

    if (message) {
      console.log(chalk.gray(message));
    }
  }

  export function peerConnected(peer: string) {
    console.log(
      `${chalk.green("●")} Connected to ${chalk.bold(peer)}`
    );
  }
  export function waiting() {
    console.log(
      `${chalk.yellow("◌")} Waiting for peer connection...`
    );
  }

  export function sessionStarted() {
    console.log(
      `${chalk.green("✓")} Session established`
    );
  }
