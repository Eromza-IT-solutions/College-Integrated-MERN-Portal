# Pull Request

## Summary

<!-- What changed and why? Link the issue/task if there is one. -->

## Type of change

- [ ] Bug fix
- [ ] Feature
- [ ] Refactor
- [ ] Tests
- [ ] Documentation / release artifact
- [ ] Database seed or migration
- [ ] Security / permissions

## Verification

- [ ] `cd client && npm run lint`
- [ ] `cd client && npm test`
- [ ] `cd client && npm run build`
- [ ] `cd server && npm run lint`
- [ ] `cd server && npm run openapi:check`
- [ ] `cd server && npm test`
- [ ] Manual flow verified in browser or API client

## API and data impact

- [ ] No API change
- [ ] `docs/openapi.yaml` updated
- [ ] No schema/model change
- [ ] `docs/db-model-map.md` updated
- [ ] Seed data updated
- [ ] New environment variables documented in `server/.env.example`

## Authorization and privacy

- [ ] Permission matrix changes are documented
- [ ] Scope (`own` / `department` / `all`) verified
- [ ] Sensitive fields are not exposed in list responses
- [ ] Audit logging added where required

## Rollout

- [ ] Backward compatible with current production data
- [ ] Reindex/reseed steps documented if needed
- [ ] No manual production DB operation required, or steps listed below

## Notes for reviewers

<!-- Screenshots, API responses, known follow-ups, or deployment notes. -->
