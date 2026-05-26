const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
    try {
        const title = core.getInput('title');
        const token = core.getInput('token');
        const semver = core.getInput('semver');
        const semverType = core.getInput('semver_type');
        const tagPrefix = core.getInput('tag_prefix');

        let tagName;
        let isPreRelease = false;

        if (semver) {
            // Use the clean semver output from the semver-labeling action
            tagName = `${tagPrefix}${semver}`;
            isPreRelease = semverType === 'pre-release';
        } else {
            // Fallback: derive tag from PR title by stripping invalid git tag characters
            tagName = title.replace(/[\s~^:?*[\]\/@{}\\]/g, '');
        }

        if (!tagName) {
            core.setFailed('Tag name is empty. Ensure the PR title or semver input contains valid characters.');
            return;
        }

        core.info(`Creating release with tag: ${tagName} (pre-release: ${isPreRelease})`);

        const octokit = github.getOctokit(token);

        const response = await octokit.rest.repos.createRelease({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            tag_name: tagName,
            name: title,
            generate_release_notes: true,
            draft: false,
            prerelease: isPreRelease
        });

        core.setOutput('release_url', response.data.html_url);
        core.setOutput('tag_name', tagName);
        core.info(`Release created: ${response.data.html_url}`);

    } catch (error) {
        core.setFailed(`Failed to create release: ${error.message}`);
    }
}

module.exports = { run };

// Only execute when run directly as an action (not during tests)
if (require.main === module) {
    run();
}
