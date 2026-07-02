# Transaction Helpers Analysis

This document prepares the extraction of transaction-related helper logic from the current Vue components without changing application behavior. It focuses on code that prepares, validates, decodes, signs, combines, or submits XRPL transactions.

## Scope and constraints

- Documentation-only preparation.
- No changes to `src/`.
- No build or dependency changes.
- Extraction should preserve current behavior first, then improve structure behind tests.

## 1. Functions suitable for extraction

### Memo encoding and decoding

Current duplicated logic:

- `TxCompose.vue` contains `renderTransactionMemos()`, which converts memo fields from UTF-8 strings to uppercase HEX before rendering/signing a transaction.
- `TxSign.vue` contains `renderTransactionMemos()`, which converts HEX memo fields back to UTF-8 for display after decoding a transaction.

Recommended helpers:

- `encodeMemosToHex(transaction)`
- `decodeMemosFromHex(transaction)`
- `isEvenLengthHex(value)`
- `cloneTransaction(transaction)`

These are good first extraction targets because they are mostly deterministic and can be tested with fixtures.

### Transaction pre-validation

Current logic appears inline in `TxCompose.vue` and `TxSign.vue`:

- `Fee` must be a string representing drops.
- `DestinationTag` must be numeric when present.
- `Sequence` must not be lower than current account sequence.
- `LastLedgerSequence` must not be lower than current ledger index.
- decoded transaction must contain `Account`.
- account must have a signer list for MultiSign flows.

Recommended helpers:

- `validateTransactionShape(transaction)`
- `validateTransactionAgainstAccount(transaction, accountData)`
- `validateTransactionAgainstLedger(transaction, ledger)`
- `validateDecodedTransaction(transaction)`

### Signer list and quorum logic

Current logic appears in `MultiSignSetup.vue`, `TxSign.vue`, and `TxCombine.vue`:

- detect duplicate signers.
- ensure account is not inside its own signer list.
- enforce maximum signer count.
- calculate total signer weight.
- calculate existing signer weight against a SignerList.
- detect fully signed state.
- detect quorum met state.
- warn about unsafe quorum configurations.

Recommended helpers:

- `getSignerEntries(accountData)`
- `getSignerAccounts(signerList)`
- `calculateSignerWeight(signers, signerList)`
- `isFullySigned(existingSigners, signerList)`
- `isQuorumMet(existingSigners, signerList)`
- `validateSignerListDraft(account, quorum, signerEntries)`
- `getSignerListWarnings(account, quorum, signerEntries)`

### Transaction decoding and normalization

Current logic appears in `TxSign.vue` and `TxCombine.vue`:

- decode HEX using `ripple-binary-codec`.
- remove `SigningPubKey` and `TxnSignature` for display or next-signature preparation.
- preserve `Signers` in raw data when needed.
- remove `Signers` for display when appropriate.
- normalize transaction objects before comparison or signing.

Recommended helpers:

- `decodeTransactionHex(hex)`
- `prepareDecodedTransactionForDisplay(decodedTransaction)`
- `prepareDecodedTransactionForSigning(decodedTransaction)`
- `extractExistingSigners(decodedTransaction)`
- `stripSingleSignFields(transaction)`
- `stripSigners(transaction)`

### Signature combination selection

Current logic appears in `TxCombine.vue`:

- collect existing signers from multiple signed transaction blobs.
- calculate the minimum or preferred set of signed blobs that satisfies quorum.
- deduplicate signer accounts.
- combine signatures with `XRPLAccountLib.signer.combine`.

Recommended helpers:

- `extractSignersFromSignedTransactions(signedTransactions)`
- `selectSignerSetForQuorum(signedTransactions, signerList, strategy)`
- `combineSignedTransactions(signedTransactionBlobs)`
- `compareTransactionPayloads(left, right)`

The current selection strategy is heuristic. Extraction should preserve behavior before replacing it with a better algorithm.

### Transaction templates and special transactions

Current logic appears in `TxCompose.vue` and `MultiSignSetup.vue`:

- default Payment transaction template.
- `SetRegularKey` special transaction.
- `AccountSet` with `SetFlag: 4` to disable the master key.
- `SignerListSet` transaction construction.

Recommended helpers:

- `createDefaultPaymentTemplate(accountData, ledger)`
- `createSetRegularKeyTransaction(baseTransaction)`
- `createDisableMasterKeyTransaction(baseTransaction)`
- `createSignerListSetTransaction(account, quorum, signerEntries)`

## 2. Components using these functions

| Component | Current helper-like logic | Extraction candidates |
| --- | --- | --- |
| `TxCompose.vue` | account checks, transaction templates, memo HEX encoding, preliminary validation, dummy signing for distribution, special transactions | memo helpers, validation helpers, transaction template builders, signing-request preparation |
| `Sign.vue` | secret type detection, account derivation, local signing, MultiSign `signAs` handling | secret classification, local signing adapter, signing result normalization |
| `TxSign.vue` | HEX validation, transaction decoding, removal of single-sign fields, memo decoding, existing signer detection, quorum status | decode helpers, display normalization, signer extraction, quorum helpers |
| `TxCombine.vue` | signed HEX decoding, signer extraction, quorum calculation, fully signed detection, minimal signer selection, signature combination, submit | decode helpers, signer/quorum helpers, signature set selection, combine helper, submit service |
| `MultiSignSetup.vue` | signer list draft validation, quorum warnings, SignerListSet transaction creation, submit | signer-list validation, warning generation, transaction template builder, submit service |
| `env.js` | rippled connection management, ledger state, explorer URL | XRPL network service, network profile helper |

## 3. Dependencies

### XRPL and transaction dependencies

- `ripple-binary-codec`
  - Used for decoding transaction HEX into JSON.
  - Extraction target: codec wrapper module.

- `xrpl-accountlib`
  - Used for local account derivation, signing, MultiSign `signAs`, and signature combining.
  - Extraction target: signing service or wallet adapter layer.

- `rippled-ws-client`
  - Used for network communication with rippled.
  - Extraction target: XRPL network service.

### Browser and UI dependencies

- Vue instance state via component `data`, `computed`, `watch`, and `props`.
- Global `$env` for network state and rippled connection.
- `Buffer` usage for memo encoding/decoding.
- Clipboard and display components are UI-only and should not be part of transaction helpers.

### Data dependencies

- `transaction.json`
- `transaction.text`
- `transaction.signed`
- `accountData`
- `accountData.Sequence`
- `accountData.signer_lists[0].SignerQuorum`
- `accountData.signer_lists[0].SignerEntries`
- `$env.rippled.ledger.ledger_index`
- `$env.rippled.connection`

## 4. Pure functions

The following helpers can be made pure if they receive all required inputs and return new values instead of mutating component state:

- HEX validation: `isHex(value)` / `isEvenLengthHex(value)`.
- Memo encoding: `encodeMemosToHex(transaction)`.
- Memo decoding: `decodeMemosFromHex(transaction)`.
- Fee type validation.
- DestinationTag type validation.
- Sequence validation against supplied account sequence.
- LastLedgerSequence validation against supplied ledger index.
- Extracting signer accounts from SignerList entries.
- Calculating signer weight.
- Checking whether quorum is met.
- Checking whether all configured signers have signed.
- Detecting duplicate signer accounts.
- Validating signer weights and quorum values.
- Building `SignerListSet` JSON from account, quorum, and signer entries.
- Building `SetRegularKey` and disable-master-key transaction JSON.
- Stripping display-only or signing-only fields from decoded transactions.
- Extracting existing signer accounts from decoded `Signers` arrays.

These should be extracted before functions that touch network, account derivation, or Vue state.

## 5. Functions accessing network or Vue state

### Network access

These are not pure and should move to a service layer later:

- `env.js` `connectTo(endpoint)`.
- `TxCompose.vue` account lookup via `this.$env.rippled.connection.send({ command: 'account_info', ... })`.
- `TxCompose.vue` submit via `this.$env.rippled.connection.send({ command: 'submit', ... })`.
- `TxSign.vue` account lookup for signer lists.
- `TxCombine.vue` account lookup and transaction submit.
- `MultiSignSetup.vue` transaction submit.

Recommended service boundary:

- `xrplClient.connect(endpoint)`
- `xrplClient.getAccountInfo(account, { signerLists: true })`
- `xrplClient.submit(txBlob)`
- `xrplClient.getCurrentLedger()`

### Vue state access and mutation

These functions currently read or mutate Vue component state directly:

- `clear()` methods in multiple components.
- `clearSignedTxData()`.
- `setError(message)`.
- `renderTransactionText()`.
- `renderTransaction()` in `TxCompose.vue`.
- `decodeTx()` in `TxSign.vue`.
- `decodeTx()` in `TxCombine.vue`.
- `combineAndSubmit()` in `TxCombine.vue`.
- `sign()` and `reset()` in `Sign.vue`.

Recommended approach:

1. Extract pure transformation logic first.
2. Keep Vue methods as orchestration wrappers.
3. Replace direct mutations gradually with returned result objects.

## 6. Recommended extraction order

### Phase 1 — Safe pure helpers

Extract and test functions that do not require network, wallet secrets, or Vue state:

1. HEX utilities.
2. Memo encoding/decoding.
3. transaction field validators.
4. signer-list account extraction.
5. signer weight and quorum calculations.
6. duplicate signer validation.

### Phase 2 — Transaction normalization helpers

1. Decode wrapper around `ripple-binary-codec`.
2. Strip `SigningPubKey` and `TxnSignature`.
3. Preserve/remove `Signers` depending on display or signing context.
4. Extract existing signers.
5. Compare decoded signed transactions for compatibility.

### Phase 3 — Transaction builders

1. Default Payment template.
2. `SignerListSet` builder.
3. `SetRegularKey` builder.
4. Disable master key `AccountSet` builder.

### Phase 4 — Signing and combine wrappers

1. Wrap `xrpl-accountlib` signing without changing behavior.
2. Wrap MultiSign `signAs` behavior.
3. Wrap `XRPLAccountLib.signer.combine`.
4. Preserve existing errors and result structure.

### Phase 5 — XRPL network service

1. Move `account_info` calls into a service.
2. Move `submit` calls into a service.
3. Move network profile and explorer URL handling into a network module.
4. Keep component UI state and alerts unchanged until tests cover the service.

### Phase 6 — Vue orchestration cleanup

1. Convert component methods into thin orchestration layers.
2. Replace direct mutation of shared objects with explicit result assignments.
3. Add typed result objects if TypeScript is introduced later.

## 7. Functions that should receive Unit Tests first

Priority 1 tests:

- `isEvenLengthHex(value)`.
- `encodeMemosToHex(transaction)`.
- `decodeMemosFromHex(transaction)`.
- `validateFeeField(transaction)`.
- `validateDestinationTag(transaction)`.
- `validateSequence(transaction, accountData)`.
- `validateLastLedgerSequence(transaction, ledger)`.
- `extractExistingSigners(transaction)`.
- `calculateSignerWeight(existingSigners, signerList)`.
- `isQuorumMet(existingSigners, signerList)`.
- `isFullySigned(existingSigners, signerList)`.
- `validateSignerListDraft(account, quorum, signerEntries)`.

Priority 2 tests:

- `prepareDecodedTransactionForDisplay(decodedTransaction)`.
- `prepareDecodedTransactionForSigning(decodedTransaction)`.
- `selectSignerSetForQuorum(signedTransactions, signerList, strategy)`.
- `createSignerListSetTransaction(account, quorum, signerEntries)`.
- `createDisableMasterKeyTransaction(baseTransaction)`.

Priority 3 tests:

- signing wrapper around `xrpl-accountlib`.
- signer combine wrapper.
- XRPL network service with mocked rippled client.

## 8. Risks and recommended refactoring strategy

### Main risks

1. **Behavior changes during extraction**
   - Existing flows rely on object mutation and UI side effects.
   - Memo conversion currently mutates nested memo fields.

2. **MultiSign compatibility regressions**
   - Removing or preserving `Signers`, `SigningPubKey`, and `TxnSignature` differs by context.
   - A helper used in the wrong context could break subsequent signing.

3. **Quorum selection changes**
   - `TxCombine.vue` currently uses heuristic signer selection.
   - Improving it during extraction may unintentionally change behavior.

4. **Error message changes**
   - UI may depend on current error strings.
   - Tests should preserve existing user-visible messages at first.

5. **Network timing and ledger-state assumptions**
   - `LastLedgerSequence` checks depend on current ledger index.
   - Service extraction must not alter when ledger values are read.

6. **Secret-handling risk**
   - Signing helpers touch sensitive input.
   - Extraction should not introduce logging, persistence, or broader state exposure.

### Recommended strategy

1. **Characterization tests first**
   - Add tests for current behavior before changing internals.
   - Use fixtures from known transaction JSON and HEX examples.

2. **Pure helpers first**
   - Extract deterministic logic before network and signing logic.
   - Avoid refactoring UI and service boundaries at the same time.

3. **Preserve mutation behavior initially**
   - If a current function mutates an object, the first extracted version may keep that behavior.
   - After tests exist, introduce immutable variants and migrate callers.

4. **One component at a time**
   - Start with memo helpers in `TxCompose.vue` and `TxSign.vue`.
   - Then move to signer/quorum helpers shared by `TxSign.vue` and `TxCombine.vue`.
   - Leave `Sign.vue` and network submit flows for later.

5. **Introduce adapter wrappers last**
   - Signing and network wrappers should come after pure helpers are stable.
   - This reduces the risk of mixing architectural changes with functional changes.

6. **Keep public UI behavior stable**
   - Same buttons.
   - Same alerts.
   - Same copy/paste behavior.
   - Same signed blob output.

7. **Document every extraction step**
   - For each helper, record source component, original method, dependencies, and test coverage.
