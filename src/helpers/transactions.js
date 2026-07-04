const rippleCodec = require('ripple-binary-codec')

export function decodeTransactionHex (hex) {
  return rippleCodec.decode(hex)
}

export function removeSingleSignFields (transaction) {
  if (typeof transaction.SigningPubKey !== 'undefined') delete transaction.SigningPubKey
  if (typeof transaction.TxnSignature !== 'undefined') delete transaction.TxnSignature
}

export function cloneTransaction (transaction) {
  return JSON.parse(JSON.stringify(transaction))
}

export function prepareRawTxData (transaction) {
  return cloneTransaction(transaction)
}

export function removeSignersForDisplay (transaction) {
  if (typeof transaction.Signers !== 'undefined') delete transaction.Signers
}

export function extractExistingSigners (transaction) {
  if (typeof transaction.Signers !== 'undefined') {
    return transaction.Signers.map(s => { return s.Signer.Account }).sort()
  }
  return []
}
