Deliberately insecure fixture for `security-audit`: unauthenticated DELETE route and server action, open redirect from `?next=`, token in localStorage, client-only admin guard with no middleware, unsanitised HTML and uploaded SVG rendered as markup, `eval`, a service-role key behind `NEXT_PUBLIC_`, public production source maps, no security headers, no lockfile.

It contains **no real or realistic secrets**. The test suite writes fake keys and a committed `.env` into a temporary copy, so secret scanners never see them in this repo.
