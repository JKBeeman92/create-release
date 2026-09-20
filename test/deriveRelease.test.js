import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveRelease, validateSemverType } from '../src/deriveRelease.js';

test('semver path: builds prefixed tag and marks pre-release', () => {
    const result = deriveRelease({
        title: 'v2.3.1-beta.1 - beta release',
        semver: '2.3.1-beta.1',
        semverType: 'pre-release',
        tagPrefix: 'v',
    });
    assert.deepEqual(result, { tagName: 'v2.3.1-beta.1', isPreRelease: true });
});

test('semver path: full release is not marked pre-release', () => {
    const result = deriveRelease({
        title: 'v2.3.1 - new features',
        semver: '2.3.1',
        semverType: 'minor',
        tagPrefix: 'v',
    });
    assert.deepEqual(result, { tagName: 'v2.3.1', isPreRelease: false });
});

test('semver path: respects a custom tag_prefix', () => {
    const result = deriveRelease({
        title: 'irrelevant',
        semver: '1.0.0',
        semverType: '',
        tagPrefix: 'release-',
    });
    assert.deepEqual(result, { tagName: 'release-1.0.0', isPreRelease: false });
});

test('fallback path: strips characters invalid in git tags', () => {
    const result = deriveRelease({
        title: 'Release: v2.0.0 [hotfix]/patch',
        semver: '',
        semverType: '',
        tagPrefix: 'v',
    });
    assert.deepEqual(result, { tagName: 'Releasev2.0.0hotfixpatch', isPreRelease: false });
});

test('fallback path: strips all documented invalid characters', () => {
    const result = deriveRelease({
        title: 'a b~c^d:e?f*g[h]i/j@k{l}m\\n',
        semver: '',
        semverType: '',
        tagPrefix: 'v',
    });
    assert.deepEqual(result, { tagName: 'abcdefghijklmn', isPreRelease: false });
});

test('validateSemverType accepts the known enum values', () => {
    for (const value of ['major', 'minor', 'patch', 'pre-release', '']) {
        assert.doesNotThrow(() => validateSemverType(value));
    }
});

test('validateSemverType rejects an unknown value instead of silently defaulting', () => {
    assert.throws(() => validateSemverType('mahor'), /Invalid semver_type/);
});
