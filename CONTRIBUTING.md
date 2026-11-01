# Contributing Guidelines

## 1. Commits

- Commit messages must be written in **English**.
- Commits should be **atomic**, meaning each commit should represent a single logical change (except when changes are interdependent).

## 2. Branching

- All branches must be created from the `develop` branch.
- Follow this naming convention:

```text
accevedo/routes/(fix|feat|issue|task)/description-(GHI-#issue)
```

**Example:**

```text
accevedo/routes/feat/add-new-file-routes-GHI-123
```

To generate a branch name, you can use the following tool:

[Branch Name Generator](https://namebranch-66f26.web.app/)

## 3. Merge Requests (MRs)

All changes must be submitted through a **Merge Request (MR)**.

Once the MR has been created:

1. **Request a review:** Assign or request a review from the appropriate team member.
2. **Address review comments:**
   - Evaluate each comment and suggestion.
   - Apply the requested changes when applicable.
   - If a comment or suggestion does not apply, provide a clear justification in the MR discussion.

Ensure all review comments are addressed before merging.

## 4. Getting Started

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the project root with the Firebase
   configuration (variables `VITE_FIREBASE_*`: `API_KEY`,
   `AUTH_DOMAIN`, `DATABASE_URL`, `PROJECT_ID`, `STORAGE_BUCKET`,
   `MESSAGING_SENDER_ID`, `APP_ID`). The same variables must be
   set in Vercel for deployments. The `.env` file is gitignored:
   never commit real credentials.

3. Start the development server:

```bash
npm run dev
```

## 5. Code Conventions

- Folders, files, components and hooks are named in **English**.
  URL routes are the exception: they may be in Spanish
  (e.g. `/vendedor/clientes`, `/vendedor/solicitudes`).
- Every newly separated component gets **its own test file**.
- In parent tests, **child components are mocked**; each child is
  tested in isolation in its own file.
- UI texts and placeholders must stay identical during refactors:
  tests query by exact text.

## 6. Before Pushing

Work is integrated into `develop`; never work directly on `main`.
Before pushing, the full gate must be green:

```bash
npm run build
npm test
```

Note: Jest (babel-jest) does **not** type-check, so `npm run build`
(tsc) is required even when all tests pass.

## 7. Related Documentation

- [Architecture](docs/ARQUITECTURA.md): layers, hooks, data
  repositories and the rules they follow.
- [Auth setup](SETUP_AUTH.md): Firebase Auth configuration,
  approval gate and the single recovery inbox.
