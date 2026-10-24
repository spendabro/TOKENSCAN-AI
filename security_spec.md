# TokenLens AI — Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants

1. **Default-Deny Catch-All**: Every path not explicitly matched is denied (`allow read, write: if false;`).
2. **Verified Identity Gate**: All writes require an authenticated user (`request.auth != null`) with a verified email (`request.auth.token.email_verified == true`) and valid path ID (`isValidId`).
3. **Owner Isolation & PII Separation**:
   - `/users/{userId}` can only be read, created, or updated by `request.auth.uid == userId`.
   - PII (`email`) is strictly isolated inside `/users/{userId}/private/{docId}` and restricted strictly to the owner (`request.auth.uid == userId`).
4. **Master Gate Relational Sync**:
   - Subcollections `/users/{userId}/private/{docId}` and `/users/{userId}/bookmarks/{bookmarkId}` require the parent `/users/{userId}` document to exist (`exists(/databases/$(database)/documents/users/$(userId))`) and belong to `request.auth.uid`.
5. **Strict Key & Timestamp Enforcement**:
   - Every `create` checks `hasAll` and `hasOnly` on allowed keys and enforces `incoming().createdAt == request.time`.
   - Every `update` wraps logic in `isValid[Entity](incoming())`, uses action-based `affectedKeys().hasOnly(...)`, preserves immutable fields (`uid`, `createdAt`), and enforces `incoming().updatedAt == request.time`.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 1 (Unauthenticated Write)**: `auth = null` attempting `create` on `/users/user_1`. -> `PERMISSION_DENIED`
2. **Payload 2 (Unverified Email Spoof)**: `auth = { uid: 'user_1', token: { email_verified: false } }` attempting `create` on `/users/user_1`. -> `PERMISSION_DENIED`
3. **Payload 3 (Cross-User Identity Spoofing)**: `auth.uid = 'attacker'` attempting `create` on `/users/victim` with `uid: 'victim'`. -> `PERMISSION_DENIED`
4. **Payload 4 (Shadow Field Injection)**: `create` on `/users/user_1` including undeclared field `isAdmin: true`. -> `PERMISSION_DENIED`
5. **Payload 5 (Timestamp Forgery)**: `create` on `/users/user_1` passing a forged past/future timestamp instead of `request.time`. -> `PERMISSION_DENIED`
6. **Payload 6 (Immutable Field Mutation)**: `update` on `/users/user_1` attempting to modify `createdAt` or `uid`. -> `PERMISSION_DENIED`
7. **Payload 7 (Value Poisoning on Update)**: `update` on `/users/user_1` setting `displayName` to a 5,000-character string or boolean. -> `PERMISSION_DENIED`
8. **Payload 8 (PII Blanket Read Attack)**: `auth.uid = 'other_user'` attempting `get` on `/users/victim/private/info`. -> `PERMISSION_DENIED`
9. **Payload 9 (Orphaned Subcollection Write)**: `create` on `/users/user_1/bookmarks/bm_1` when parent `/users/user_1` does not exist. -> `PERMISSION_DENIED`
10. **Payload 10 (Invalid Enum Network Injection)**: `create` on `/users/user_1/bookmarks/bm_1` with `networkId: 'fake_chain'`. -> `PERMISSION_DENIED`
11. **Payload 11 (Path ID Poisoning)**: `create` on `/users/user_1/bookmarks/bad$id!` with invalid characters. -> `PERMISSION_DENIED`
12. **Payload 12 (Unauthorized Query Scraping)**: `list` on `/users/victim/bookmarks` by `auth.uid = 'attacker'`. -> `PERMISSION_DENIED`
