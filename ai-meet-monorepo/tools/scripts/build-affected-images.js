const { execSync } = require('child_process');
const fs = require('fs');

function run(cmd) {
  console.log('>', cmd);
  execSync(cmd, { stdio: 'inherit' });
}

console.log('Detecting affected projects...');
const affectedOut = execSync('npx nx print-affected --base=origin/main --select=projects', { encoding: 'utf8' }).trim();
const lines = affectedOut.split('\\n').map(l => l.trim()).filter(Boolean);
const registry = process.env.REGISTRY || 'ghcr.io/ORG_NAME';

for (const project of lines) {
  const dockerfile = `apps/${project}/Dockerfile`;
  if (fs.existsSync(dockerfile)) {
    const tag = process.env.TAG || process.env.GITHUB_SHA || 'local';
    const image = `${registry}/${project}:${tag}`;
    const cacheRef = `${registry}/${project}:cache`;
    run(`docker buildx build --builder aimeet-builder --cache-from=type=registry,ref=${cacheRef} --cache-to=type=registry,ref=${cacheRef},mode=max -t ${image} -f ${dockerfile} --push apps/${project}`);
  } else {
    console.log('Skipping', project, '- no Dockerfile found.');
  }
}