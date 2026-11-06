const path = require('path');
const { execFileSync } = require('child_process');

module.exports = async context => {
  if (context.packager.platform.name !== 'win32') return;

  const exe = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  const icon = path.join(context.packager.projectDir, 'assets', 'icon.ico');
  const appBuilder = path.join(context.packager.projectDir, 'node_modules', 'app-builder-bin', 'win', 'x64', 'app-builder.exe');

  execFileSync(appBuilder, [
    'rcedit',
    '--args',
    JSON.stringify([exe, '--set-icon', icon])
  ], { stdio: 'inherit' });
};
