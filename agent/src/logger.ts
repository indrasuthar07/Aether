import chalk from 'chalk';

// CLI display functions 
export function banner(): void {
  console.log();
  console.log(chalk.bold.cyan('Aether'));
  console.log(chalk.gray('Secure terminal sharing'));
  console.log();
}

export function printcode(code: string): void {
  console.log();
  console.log(chalk.bgBlue.white.bold(`  ${code}  `));
  console.log();
}

export function info(message: string): void {
  console.log(`${chalk.blue('ℹ')}  ${message}`);
}

export function success(message: string): void {
  console.log(`${chalk.green('✓')}  ${message}`);
}

export function warn(message: string): void {
  console.log(`${chalk.yellow('⚠')}  ${message}`);
}

export function error(message: string): void {
  console.log(`${chalk.red('✕')}  ${message}`);
}
