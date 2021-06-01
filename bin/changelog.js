require('dotenv').config();
const exec = require('shelljs').exec;

exec('docker pull ferrarimarco/github-changelog-generator', { silent: false });
exec(
	`docker run --rm -v "$(pwd)":/usr/local/src/your-app ferrarimarco/github-changelog-generator --user=cvara --project=rxdb-hooks --token=${process.env.GH_ACCESS_TOKEN} --since-tag=1.0.0 --no-issues`,
	{ silent: false }
);
