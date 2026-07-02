# Test Fixtures und Smoke-Test-Checkliste

Dieses Dokument definiert manuelle Smoke-Tests und wiederverwendbare Testdaten für die bestehenden Workflows `TxCompose`, `TxSign`, `TxCombine` und `MultiSignSetup`. Die Fixtures sind bewusst dokumentationsbasiert und verändern keine Laufzeitlogik.

## Smoke-Test-Checkliste

### Allgemeine Vorbereitung

- App mit der dokumentierten Legacy-Umgebung installieren.
- App lokal starten.
- Browser-Konsole öffnen und auf Fehler prüfen.
- Testnet über den Header auswählen.
- Warten, bis ein Ledger-Index angezeigt wird.
- Während Signier-Schritten Offline-Hinweise beachten.

### Basisnavigation

- Startseite öffnen.
- Zu `1. Compose tx` wechseln.
- Zu `2. Sign tx` wechseln.
- Zu `3. Combine & submit` wechseln.
- Zur Startseite zurückkehren.

**Definition of Done**

- Jede Seite rendert ohne sichtbaren JavaScript-Fehler.
- Header-Navigation markiert die aktive Seite korrekt.
- LIVE/TEST-Buttons bleiben bedienbar.
- Netzwerkstatus und Ledger-Status werden nachvollziehbar angezeigt.

## Testdaten für Compose

### Compose Fixture: einfache Testnet-Zahlung

```json
{
  "TransactionType": "Payment",
  "Account": "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
  "Destination": "rPdvC6ccq8hCdPKSPJkPmyZ4Mi1oG2FFkT",
  "Amount": "1",
  "Fee": "10",
  "Sequence": 1,
  "LastLedgerSequence": 99999999,
  "Memos": [
    {
      "Memo": {
        "MemoType": "SmokeTest",
        "MemoData": "ComposeFixture"
      }
    }
  ]
}
```

### Compose Smoke-Test

1. Testnet verbinden.
2. `TxCompose` öffnen.
3. Account prüfen oder Transaktions-JSON im Editor vorbereiten.
4. Memo-Felder mit Klartext eintragen.
5. Transaktion rendern.
6. Ergebnis-HEX kopieren.

**Definition of Done**

- JSON wird akzeptiert.
- Memo-Werte werden vor dem Signieren in HEX gewandelt.
- Eine signierte HEX-Ausgabe wird angezeigt.
- Fehlerfälle bei ungültigem JSON werden sichtbar angezeigt.
- Kein Submit erfolgt unbeabsichtigt.

## Testdaten für Sign

### Sign Fixture: Signer-Auswahl

```json
{
  "signAs": "r3kmLJN5D28dHuH8vZNUZpMC43pEHpaocV",
  "secretType": "familySeed",
  "network": "testnet",
  "expectedMode": "multi-sign"
}
```

### Sign Smoke-Test

1. `TxSign` öffnen.
2. Eine vorbereitete Transaktions-HEX einfügen.
3. Transaktion decodieren.
4. Prüfen, ob `Account`, `Destination`, `Amount`, `Fee`, `Sequence` und Memos verständlich angezeigt werden.
5. Signer aus der SignerList auswählen.
6. Test-Secret nur in einer lokalen/offline Testumgebung eingeben.
7. Signatur erzeugen.
8. Signierte HEX-Ausgabe kopieren.

**Definition of Done**

- HEX wird decodiert oder mit klarer Fehlermeldung abgelehnt.
- Bereits vorhandene Signer werden erkannt.
- SignerList und Quorum werden angezeigt.
- Signaturergebnis enthält eine kopierbare HEX-Ausgabe.
- Online-/Offline-Warnungen werden korrekt angezeigt.

## Testdaten für Combine

### Combine Fixture: Signatur-Sammlung

```json
{
  "account": "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
  "signerQuorum": 2,
  "signers": [
    {
      "account": "r3kmLJN5D28dHuH8vZNUZpMC43pEHpaocV",
      "weight": 1,
      "signedTransaction": "<SIGNED_TX_HEX_SIGNER_1>"
    },
    {
      "account": "rEExampleSignerTwoxxxxxxxxxxxxxx",
      "weight": 1,
      "signedTransaction": "<SIGNED_TX_HEX_SIGNER_2>"
    }
  ]
}
```

### Combine Smoke-Test

1. `TxCombine` öffnen.
2. Signierte HEX von Signer 1 einfügen und hinzufügen.
3. Signierte HEX von Signer 2 einfügen und hinzufügen.
4. Prüfen, ob doppelte Signer abgelehnt werden.
5. Prüfen, ob abweichende Transaktionen abgelehnt werden.
6. Quorum-Anzeige prüfen.
7. Kombinieren ausführen.
8. Submit nur auf Testnet und nur bewusst ausführen.

**Definition of Done**

- Jede gültige Signatur wird einzeln erkannt.
- Doppelte Signaturen werden nicht doppelt gezählt.
- Doppelte Signer werden abgelehnt.
- Abweichende Transaktionsinhalte werden abgelehnt.
- Quorum-Berechnung ist nachvollziehbar.
- Kombinierter Blob wird erst nach ausreichendem Quorum erzeugt.

## Testdaten für MultiSignSetup

### MultiSignSetup Fixture: 2-von-3 SignerList

```json
{
  "TransactionType": "SignerListSet",
  "Account": "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
  "SignerQuorum": 2,
  "SignerEntries": [
    {
      "SignerEntry": {
        "Account": "r3kmLJN5D28dHuH8vZNUZpMC43pEHpaocV",
        "SignerWeight": 1
      }
    },
    {
      "SignerEntry": {
        "Account": "rEExampleSignerTwoxxxxxxxxxxxxxx",
        "SignerWeight": 1
      }
    },
    {
      "SignerEntry": {
        "Account": "rEExampleSignerTreexxxxxxxxxxxxx",
        "SignerWeight": 1
      }
    }
  ]
}
```

### MultiSignSetup Smoke-Test

1. `TxCompose` mit einem Account ohne SignerList starten.
2. In den MultiSign-Setup-Flow wechseln.
3. Quorum `2` eintragen.
4. Drei Signer mit Gewicht `1` eintragen.
5. Prüfen, ob Gesamtgewicht und Quorum korrekt angezeigt werden.
6. Warnungen für riskante Konfigurationen testen:
   - doppelter Signer,
   - Account selbst als Signer,
   - Gewicht größer als Quorum,
   - Gesamtgewicht gleich Quorum.
7. `SignerListSet`-Transaktion anzeigen.
8. Signieren und Submit nur auf Testnet ausführen.

**Definition of Done**

- Gültige 2-von-3-Konfiguration wird akzeptiert.
- Ungültige Signer-Adressen werden markiert.
- Doppelte Signer werden abgelehnt.
- Account selbst als Signer wird abgelehnt.
- Riskante Quorum-/Gewichtskonfigurationen erzeugen Warnungen.
- `SignerListSet`-JSON enthält `SignerQuorum` und alle erwarteten `SignerEntries`.

## Gesamt-Definition of Done

- Alle Smoke-Tests wurden mindestens einmal auf Testnet oder mit dokumentierten Fixtures durchgespielt.
- Jeder Fehlerfall erzeugt eine sichtbare und verständliche Meldung.
- Keine Tests erfordern Mainnet-Secrets.
- Keine Tests erfordern echte produktive Konten.
- Alle Signieraktionen sind als Test-/Offline-Aktionen dokumentiert.
- Submit-Aktionen werden nur bewusst und bevorzugt auf Testnet ausgeführt.
