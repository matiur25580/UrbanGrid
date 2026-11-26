# Contributing

## Workflow

1. Create a focused branch from `main`.
2. Keep changes within the relevant domain module.
3. Add or update tests for behavior and authorization boundaries.
4. Run the relevant workspace checks before opening a pull request.
5. Document API changes and any operational implications.

## Conventions

- Use TypeScript in the client and modern JavaScript modules in the server.
- Prefer small, cohesive components and services.
- Keep business rules out of React components and HTTP controllers.
- Validate all external input at system boundaries.
- Never trust client-supplied organization IDs or permission claims.
- Avoid committing secrets, generated build output, or local database files.

## Pull request checklist

- [ ] Scope and behavior are clearly described.
- [ ] Tests cover expected and failure paths.
- [ ] Tenant and permission boundaries are tested where relevant.
- [ ] Documentation and environment examples are updated.
- [ ] No secrets or personal data are included.
