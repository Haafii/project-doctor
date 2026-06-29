import type { Command } from 'commander';

export function registerPluginCommands(program: Command): void {
  const plugin = program.command('plugin').description('Manage Project Doctor plugins.');

  plugin
    .command('list')
    .description('List installed plugins.')
    .action(() => {
      console.log('No external plugins are installed. Core analyzers are active by default.');
    });

  plugin
    .command('install')
    .description('Show plugin install guidance.')
    .argument('<plugin-name>', 'Plugin package name')
    .action((pluginName: string) => {
      console.log(`Install ${pluginName} with your package manager, then enable it in project-doctor.config.mjs.`);
    });
}
