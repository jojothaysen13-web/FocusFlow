# Security Specification - FocusFlow

## Data Invariants
1. A user can only read and write their own profile document (`/users/{userId}`).
2. High scores must be non-negative numbers.
3. Streak counts must be non-negative numbers.
4. `updatedAt` must be set to the server timestamp.
5. All IDs must be valid.

## The Dirty Dozen Payloads (Target: `/users/{userId}`)

1. **Identity Theft**: User A tries to write to User B's profile.
2. **Malicious Score**: Setting a score to a string instead of a number.
3. **Negative Score**: Setting a score to -100.
4. **Massive Payload**: Sending a 1MB string in a score field.
5. **Unauthorized Field**: Adding `isAdmin: true` to the user profile.
6. **Future Timestamp**: Setting `updatedAt` to a date in 2030.
7. **Negative Streak**: Setting streak count to -5.
8. **Invalid ID**: Using a document ID with special characters like `/` or `..`.
9. **Missing Fields**: Creating a profile without the required `streak` field.
10. **Shadow Update**: Attempting to update a field that doesn't exist in the schema.
11. **Type Mismatch**: Setting `streak` to a number instead of an object.
12. **Bypassing Verification**: Writing to the database without a verified email (if strictly required).

## Test Runner Plan
Use `firestore.rules.test.ts` to simulate these attacks using the `@firebase/testing` SDK (though I'll focus on the rules logic first).
