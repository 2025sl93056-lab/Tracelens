# Security Scanning with Grype

TraceLens uses [Grype](https://github.com/anchore/grype) for automated vulnerability scanning of all npm dependencies.

## What runs and when

| Trigger | Scan target | Fails build? |
|---|---|---|
| Push / PR touching `sbom.json` or any `package.json` | `sbom.json` (355 transitive deps) | Yes — on `high` or `critical` CVE |
| Push / PR touching `sbom.json` or any `package.json` | Repo directory (live scan) | No — advisory only |
| Every Sunday midnight UTC | Both | Yes — on `high` or `critical` CVE |
| Manual (`workflow_dispatch`) | Both | Configurable severity threshold |

Results are uploaded to GitHub's **Security → Code Scanning** tab as SARIF and saved as a workflow artefact for 30 days.

## Run Grype locally

### Install

```bash
# macOS
brew install anchore/grype/grype

# Linux / CI
curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin
```

### Scan the SBOM (fastest — uses the pre-built `sbom.json`)

```bash
grype sbom:sbom.json
```

### Scan the live repo (re-resolves all deps from `node_modules`)

```bash
grype dir:.
```

### Filter by severity

```bash
# Show only high and critical
grype sbom:sbom.json --fail-on high

# Output as JSON for tooling
grype sbom:sbom.json -o json > grype-report.json

# Output as SARIF for IDE integration
grype sbom:sbom.json -o sarif > grype-results.sarif
```

## Interpreting results

Each finding shows:

| Column | Meaning |
|---|---|
| `NAME` | Package name |
| `INSTALLED` | Version currently in use |
| `FIXED-IN` | Version that resolves the CVE (if available) |
| `TYPE` | Package type (`npm`) |
| `VULNERABILITY` | CVE / GHSA identifier |
| `SEVERITY` | `Negligible` / `Low` / `Medium` / `High` / `Critical` |

## Updating the SBOM after dependency changes

After running `npm install` or bumping a dependency, regenerate `sbom.json`:

```bash
npm list --all --json | node scripts/gen-sbom.js > sbom.json
```

Or re-run the workflow manually via **Actions → Grype Vulnerability Scan → Run workflow**.

## Severity threshold policy

The default policy fails CI on `high` or `critical` findings. To override for a single manual run, use the `fail_on_severity` input in `workflow_dispatch`. To permanently change the threshold, edit the `severity-cutoff` field in `.github/workflows/grype-scan.yml`.

## References

- [Grype GitHub repo](https://github.com/anchore/grype)
- [anchore/scan-action](https://github.com/anchore/scan-action)
- [CycloneDX SBOM spec](https://cyclonedx.org/specification/overview/)
- [GitHub Code Scanning docs](https://docs.github.com/en/code-security/code-scanning)
