# Healthy TypeScript Fixture

This fixture exists to verify that Project Doctor recognizes a well-maintained JavaScript or TypeScript package. It includes package metadata, a lockfile, documentation, a strict TypeScript configuration, a test file, CI automation, dependency update automation, and formatting/editor configuration. The source code is intentionally small, but the surrounding project files mirror the baseline expected from a real open-source package.

Developers can install dependencies, run the test suite, execute type checking, and build the package using the scripts declared in `package.json`. The fixture is also used to confirm that quality checks do not over-report issues when the common project health signals are already present.
