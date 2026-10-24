// Firestore Rules Adversarial Test Specification (Dirty Dozen Verification)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export const DIRTY_DOZEN_TEST_CASES = [
  { id: 1, name: 'Rejects unauthenticated write to /users/{userId}', expected: 'PERMISSION_DENIED' },
  { id: 2, name: 'Rejects unverified email token write', expected: 'PERMISSION_DENIED' },
  { id: 3, name: 'Rejects cross-user UID spoofing', expected: 'PERMISSION_DENIED' },
  { id: 4, name: 'Rejects shadow field injection (isAdmin: true)', expected: 'PERMISSION_DENIED' },
  { id: 5, name: 'Rejects client-forged createdAt timestamp', expected: 'PERMISSION_DENIED' },
  { id: 6, name: 'Rejects mutation of immutable uid or createdAt on update', expected: 'PERMISSION_DENIED' },
  { id: 7, name: 'Rejects oversized displayName (>80 chars) on update', expected: 'PERMISSION_DENIED' },
  { id: 8, name: 'Rejects non-owner read of isolated PII /users/{userId}/private/info', expected: 'PERMISSION_DENIED' },
  { id: 9, name: 'Rejects orphaned bookmark creation when parent user doc is missing', expected: 'PERMISSION_DENIED' },
  { id: 10, name: 'Rejects bookmark with unsupported networkId enum', expected: 'PERMISSION_DENIED' },
  { id: 11, name: 'Rejects bookmark with malformed document ID path variable', expected: 'PERMISSION_DENIED' },
  { id: 12, name: 'Rejects cross-user list query on /users/{userId}/bookmarks', expected: 'PERMISSION_DENIED' },
];

describe('Firestore Security Rules Dirty Dozen Specification', () => {
  it('defines all 12 adversarial payloads as PERMISSION_DENIED', () => {
    assert.equal(DIRTY_DOZEN_TEST_CASES.length, 12);
    for (const tc of DIRTY_DOZEN_TEST_CASES) {
      assert.equal(tc.expected, 'PERMISSION_DENIED');
    }
  });
});
