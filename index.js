const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
    try {
        const title = core.getInput('title');
        const token = core.getInput('token');

        // Remove spaces and other invalid characters from PR title and create a tag
        const tagName = title.replace(/[\s~^:?*[\]\/@{}\\]/g, '');

        const octokit = github.getOctokit(token);

        // Create a release
        await octokit.rest.repos.createRelease({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            tag_name: tagName,
            name: title,
            generate_release_notes: true,
            draft: false,
            prerelease: false
        });

    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
