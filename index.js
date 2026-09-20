import * as core from '@actions/core';
import * as github from '@actions/github';
import { deriveRelease } from './src/deriveRelease.js';

async function run() {
    try {
        const title = core.getInput('title');
        const token = core.getInput('token');
        const semver = core.getInput('semver');
        const semverType = core.getInput('semver_type');
        const tagPrefix = core.getInput('tag_prefix');
        const skipExisting = core.getBooleanInput('skip_existing');

        let tagName, isPreRelease;
        try {
            ({ tagName, isPreRelease } = deriveRelease({ title, semver, semverType, tagPrefix }));
        } catch (validationError) {
            core.setFailed(validationError.message);
            return;
        }

        if (!tagName) {
            core.setFailed('Tag name is empty. Ensure the PR title or semver input contains valid characters.');
            return;
        }

        core.info(`Creating release with tag: ${tagName} (pre-release: ${isPreRelease})`);

        const octokit = github.getOctokit(token);
        const { owner, repo } = github.context.repo;

        const existing = await octokit.rest.repos.getReleaseByTag({ owner, repo, tag: tagName }).catch((error) => {
            if (error.status === 404) return null;
            throw error;
        });

        if (existing) {
            if (skipExisting) {
                core.info(`Release for tag ${tagName} already exists, skipping (skip_existing: true).`);
                core.setOutput('release_url', existing.data.html_url);
                core.setOutput('tag_name', tagName);
                return;
            }
            core.setFailed(
                `A release for tag "${tagName}" already exists: ${existing.data.html_url}. ` +
                `Set skip_existing: true to skip instead of failing, or delete the existing release/tag first.`
            );
            return;
        }

        const response = await octokit.rest.repos.createRelease({
            owner,
            repo,
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

run();
