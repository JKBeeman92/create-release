/**
 * Tests for create-release action integration with semver-labeling outputs.
 *
 * Mocks @actions/core and @actions/github so no real GitHub API calls are made.
 */

jest.mock('@actions/core');
jest.mock('@actions/github');

const core = require('@actions/core');
const github = require('@actions/github');
const { run } = require('../index');

const mockCreateRelease = jest.fn();

github.getOctokit.mockReturnValue({
    rest: {
        repos: {
            createRelease: mockCreateRelease
        }
    }
});

github.context = {
    repo: { owner: 'jkbeeman92', repo: 'create-release' }
};

// Helper: configure inputs for each test
function setInputs({ title = 'Test PR', token = 'fake-token', semver = '', semver_type = '', tag_prefix = 'v' } = {}) {
    core.getInput.mockImplementation((name) => {
        return { title, token, semver, semver_type, tag_prefix }[name] ?? '';
    });
}

beforeEach(() => {
    jest.clearAllMocks();
    mockCreateRelease.mockResolvedValue({
        data: { html_url: 'https://github.com/jkbeeman92/create-release/releases/tag/v1.0.0', id: 1 }
    });
});

// --- Tests ---

describe('semver input path (integration with semver-labeling)', () => {

    test('minor release: builds tag from semver + prefix, not a prerelease', async () => {
        setInputs({ title: 'v2.3.1 - add new feature', semver: '2.3.1', semver_type: 'minor', tag_prefix: 'v' });
        await run();

        expect(mockCreateRelease).toHaveBeenCalledWith(expect.objectContaining({
            tag_name: 'v2.3.1',
            name: 'v2.3.1 - add new feature',
            prerelease: false,
            draft: false,
            generate_release_notes: true
        }));
        expect(core.setFailed).not.toHaveBeenCalled();
    });

    test('major release: builds tag correctly, not a prerelease', async () => {
        setInputs({ title: 'v3.0.0 - breaking change', semver: '3.0.0', semver_type: 'major', tag_prefix: 'v' });
        await run();

        expect(mockCreateRelease).toHaveBeenCalledWith(expect.objectContaining({
            tag_name: 'v3.0.0',
            prerelease: false
        }));
        expect(core.setFailed).not.toHaveBeenCalled();
    });

    test('patch release: builds tag correctly, not a prerelease', async () => {
        setInputs({ title: 'v2.3.2 - fix bug', semver: '2.3.2', semver_type: 'patch', tag_prefix: 'v' });
        await run();

        expect(mockCreateRelease).toHaveBeenCalledWith(expect.objectContaining({
            tag_name: 'v2.3.2',
            prerelease: false
        }));
        expect(core.setFailed).not.toHaveBeenCalled();
    });

    test('pre-release beta: sets prerelease flag to true', async () => {
        setInputs({ title: 'v2.3.1-beta.1 - beta', semver: '2.3.1-beta.1', semver_type: 'pre-release', tag_prefix: 'v' });
        await run();

        expect(mockCreateRelease).toHaveBeenCalledWith(expect.objectContaining({
            tag_name: 'v2.3.1-beta.1',
            prerelease: true
        }));
        expect(core.setFailed).not.toHaveBeenCalled();
    });

    test('pre-release rc: sets prerelease flag to true', async () => {
        setInputs({ title: 'v2.0.0-rc.2 - release candidate', semver: '2.0.0-rc.2', semver_type: 'pre-release', tag_prefix: 'v' });
        await run();

        expect(mockCreateRelease).toHaveBeenCalledWith(expect.objectContaining({
            tag_name: 'v2.0.0-rc.2',
            prerelease: true
        }));
    });

    test('custom tag_prefix: applied correctly', async () => {
        setInputs({ title: 'release 1.0.0', semver: '1.0.0', semver_type: 'minor', tag_prefix: 'release-' });
        await run();

        expect(mockCreateRelease).toHaveBeenCalledWith(expect.objectContaining({
            tag_name: 'release-1.0.0'
        }));
    });

    test('empty tag_prefix: tag is bare semver', async () => {
        setInputs({ title: '2.3.1', semver: '2.3.1', semver_type: 'patch', tag_prefix: '' });
        await run();

        expect(mockCreateRelease).toHaveBeenCalledWith(expect.objectContaining({
            tag_name: '2.3.1'
        }));
    });

    test('outputs release_url and tag_name on success', async () => {
        mockCreateRelease.mockResolvedValue({
            data: { html_url: 'https://github.com/jkbeeman92/create-release/releases/tag/v2.3.1', id: 42 }
        });
        setInputs({ title: 'v2.3.1', semver: '2.3.1', semver_type: 'minor' });
        await run();

        expect(core.setOutput).toHaveBeenCalledWith('release_url', 'https://github.com/jkbeeman92/create-release/releases/tag/v2.3.1');
        expect(core.setOutput).toHaveBeenCalledWith('tag_name', 'v2.3.1');
    });

});

describe('fallback path (no semver input — standalone use)', () => {

    test('derives tag from PR title by stripping invalid characters', async () => {
        setInputs({ title: 'My Release v1.0.0', semver: '', semver_type: '' });
        await run();

        expect(mockCreateRelease).toHaveBeenCalledWith(expect.objectContaining({
            tag_name: 'MyReleasev1.0.0',
            name: 'My Release v1.0.0'
        }));
    });

    test('strips all invalid git tag characters from title', async () => {
        setInputs({ title: 'feat: my@feature [test] {v1}', semver: '', semver_type: '' });
        await run();

        expect(mockCreateRelease).toHaveBeenCalledWith(expect.objectContaining({
            tag_name: 'featmyfeaturetestv1'
        }));
    });

    test('fallback prerelease is always false', async () => {
        setInputs({ title: 'v1.0.0', semver: '', semver_type: '' });
        await run();

        expect(mockCreateRelease).toHaveBeenCalledWith(expect.objectContaining({
            prerelease: false
        }));
    });

});

describe('error handling', () => {

    test('empty tag after stripping: calls setFailed with clear message, API not called', async () => {
        setInputs({ title: '@@@', semver: '', semver_type: '' });
        await run();

        expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('Tag name is empty'));
        expect(mockCreateRelease).not.toHaveBeenCalled();
    });

    test('API error: calls setFailed with prefixed error message', async () => {
        mockCreateRelease.mockRejectedValue(new Error('Resource not accessible by integration'));
        setInputs({ title: 'v2.3.1', semver: '2.3.1', semver_type: 'minor' });
        await run();

        expect(core.setFailed).toHaveBeenCalledWith(
            expect.stringContaining('Failed to create release: Resource not accessible by integration')
        );
    });

    test('API error: release already exists', async () => {
        mockCreateRelease.mockRejectedValue(new Error('already_exists'));
        setInputs({ title: 'v2.3.1', semver: '2.3.1', semver_type: 'minor' });
        await run();

        expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('Failed to create release'));
        expect(core.setOutput).not.toHaveBeenCalled();
    });

});
