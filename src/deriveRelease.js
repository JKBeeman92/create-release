const VALID_SEMVER_TYPES = new Set(['major', 'minor', 'patch', 'pre-release']);

/**
 * Validates the semver_type input. Throws if it's a non-empty value outside
 * the known enum, rather than silently treating a typo as "not prerelease".
 */
export function validateSemverType(semverType) {
    if (semverType && !VALID_SEMVER_TYPES.has(semverType)) {
        throw new Error(
            `Invalid semver_type "${semverType}". Must be one of: ${[...VALID_SEMVER_TYPES].join(', ')} (or empty).`
        );
    }
}

/**
 * Derives the release tag name and prerelease flag from the action inputs.
 * When semver is provided, it's used directly (prefixed) as the tag.
 * Otherwise the tag is derived from the PR title by stripping characters
 * that are invalid in git tags.
 */
export function deriveRelease({ title, semver, semverType, tagPrefix }) {
    validateSemverType(semverType);

    let tagName;
    let isPreRelease = false;

    if (semver) {
        tagName = `${tagPrefix}${semver}`;
        isPreRelease = semverType === 'pre-release';
    } else {
        tagName = title.replace(/[\s~^:?*[\]\/@{}\\]/g, '');
    }

    return { tagName, isPreRelease };
}
