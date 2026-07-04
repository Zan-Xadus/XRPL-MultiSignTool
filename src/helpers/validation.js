export function isHex (value) {
  return value.trim().toUpperCase().match(/^[A-F0-9]+$/)
}

export function validateFee (transaction) {
  if (typeof transaction.Fee !== 'undefined' && typeof transaction.Fee !== 'string') {
    return '"Fee" field should be string, representing a value in Drops'
  }
  return false
}

export function validateDestinationTag (transaction) {
  if (typeof transaction.DestinationTag !== 'undefined' && typeof transaction.DestinationTag !== 'number') {
    return '"DestinationTag" field should be integer or left out'
  }
  return false
}

export function validateSequence (transaction, accountData, message) {
  if (typeof transaction.Sequence !== 'undefined' && typeof accountData.Sequence !== 'undefined' && transaction.Sequence < accountData.Sequence) {
    return message
  }
  return false
}

export function validateLastLedgerSequence (transaction, ledgerIndex, message) {
  if (typeof transaction.LastLedgerSequence !== 'undefined' && ledgerIndex && transaction.LastLedgerSequence < ledgerIndex) {
    return typeof message === 'function' ? message(transaction.LastLedgerSequence, ledgerIndex) : message
  }
  return false
}
