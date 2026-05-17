# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| current | ✅ |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it by:

1. **Do NOT** open a public issue
2. Contact the maintainer directly via Telegram: @thedoctormes
3. Include a detailed description and steps to reproduce

## Security Measures

### Secrets Management
- **NEVER** commit secrets, tokens, or passwords to this repository
- All secrets are stored in `.env` files (excluded via `.gitignore`)
- Pre-push hooks scan for common secret patterns

### CI/CD Security
- All GitHub Actions are pinned to specific SHA hashes
- Only GitHub-owned and verified actions are allowed

## Security Checklist for Contributors

- [ ] No secrets in code or config files
- [ ] No hardcoded credentials
- [ ] `.env` files are in `.gitignore`
- [ ] Dependencies are up to date
