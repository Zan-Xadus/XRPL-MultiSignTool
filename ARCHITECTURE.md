# Architektur: XRPL MultiSignTool

## Überblick

XRPL MultiSignTool ist eine clientseitige Vue-2-Anwendung zum Erstellen, Prüfen, Signieren, Kombinieren und Einreichen von XRPL-Transaktionen mit besonderem Fokus auf MultiSign-Workflows. Die Anwendung läuft im Browser, hält den Großteil des Zustands in Vue-Komponenten und kommuniziert direkt per WebSocket mit einem `rippled`-Server. Signaturen werden lokal im Browser erzeugt; private Schlüssel, Family Seeds oder Mnemonics werden nicht an den Server gesendet, verbleiben aber während des Signierens im Browser-Speicher.

Der fachliche Ablauf ist dreigeteilt:

1. Transaktion vorbereiten und als HEX-Blob verteilen.
2. Einzelne Signierer prüfen die Transaktion und fügen ihre MultiSign-Signatur hinzu.
3. Signaturen werden gesammelt, kombiniert und an das XRPL-Netzwerk submitted.

Zusätzlich gibt es einen Assistenten zum Einrichten einer `SignerListSet`-Transaktion und optionale Hinweise zum Deaktivieren von Regular Key oder Master Key.

## Projektstruktur

```text
.
├── README.md                         # Kurzbeschreibung, Setup und Build-Hinweise
├── package.json                      # npm-Skripte und Laufzeit-/Build-Abhängigkeiten
├── package-lock.json                 # exakte Dependency-Auflösung
├── build.sh                          # Produktionsbuild, ZIP-Erstellung und lokales Öffnen
├── vue.config.js                     # Vue CLI Public Path
├── babel.config.js                   # Babel/Vue-CLI-Konfiguration
├── public/
│   ├── index.html                    # HTML-Einstiegspunkt
│   ├── bootstrap-4.1.3-dist/         # vendored Bootstrap CSS/JS
│   └── icons/                        # Favicons und PWA-Metadaten
└── src/
    ├── main.js                       # Vue-Bootstrap, Clipboard-Plugin, globales $env
    ├── App.vue                       # Root-Komponente und einfache interne Navigation
    ├── env.js                        # globaler Runtime-/XRPL-Verbindungszustand
    └── components/
        ├── Header.vue                # Navigation und Netzwerk-Auswahl LIVE/TEST
        ├── Home.vue                  # Startseite / Erklärung
        ├── TxCompose.vue             # Transaktion erstellen und Dummy-Signatur erzeugen
        ├── TxSign.vue                # vorhandene Transaktion decodieren und multi-signieren
        ├── TxCombine.vue             # Signaturen sammeln, kombinieren und submitten
        ├── MultiSignSetup.vue        # SignerListSet-Assistent
        └── Sign.vue                  # wiederverwendbare Signier-Komponente
```

## Hauptkomponenten

### `src/main.js`

- Initialisiert Vue.
- Registriert `vue-clipboard2` für Copy-to-Clipboard-Funktionen.
- Hängt die globale Runtime-Instanz aus `src/env.js` als `Vue.prototype.$env` an alle Komponenten.
- Mountet `App.vue` auf `#app`.

### `src/env.js`

`env.js` ist ein globaler, reaktiver Vue-Zustandscontainer. Er verwaltet:

- Online-/Offline-Status über `window.ononline` und `window.onoffline`.
- Erkennung, ob die App lokal per Datei oder über HTTP(S) läuft.
- Vordefinierte XRPL-Endpunkte:
  - Testnet: `wss://testnet.xrpl-labs.com`
  - Mainnet: `wss://xrpl.ws`
- WebSocket-Verbindung über `rippled-ws-client`.
- Aktuellen Ledger-Status.
- Gemeinsame CodeMirror-Editoroptionen.
- Explorer-Link-Auswahl abhängig von Mainnet/Testnet.

Die Methode `connectTo(endpoint)` schließt eine bestehende Verbindung, setzt den Verbindungszustand zurück, öffnet eine neue `RippledWsClient`-Verbindung und registriert Listener für `state` und `ledger`.

### `src/App.vue`

`App.vue` ist der Root-Container und implementiert eine sehr einfache In-Memory-Navigation statt Vue Router. Die aktuelle Seite steht in `route`; zusätzliche Übergabedaten stehen in `routeData`. Mit `<keep-alive>` bleiben Komponenteninstanzen beim Wechseln erhalten.

### `src/components/Header.vue`

Der Header enthält:

- Branding und Navigation zu `Home`, `TxCompose`, `TxSign` und `TxCombine`.
- Netzwerkbuttons für LIVE und TEST.
- Anzeige des aktuellen Ledger-Index, sobald eine Verbindung aktiv ist.

### `src/components/TxCompose.vue`

Diese Komponente ist für das Vorbereiten von Transaktionen zuständig:

- Prüft ein eingegebenes Account per `account_info` inklusive `signer_lists`.
- Leitet Benutzer bei fehlender SignerList in den MultiSign-Setup-Assistenten.
- Erkennt vorhandene Regular Keys und nicht deaktivierte Master Keys und zeigt Warnungen bzw. Spezialtransaktionen an.
- Befüllt Standardfelder wie `Account`, `Sequence`, `LastLedgerSequence` und `Fee` aus Ledger-Daten.
- Wandelt Memo-Felder von UTF-8 nach HEX um.
- Rendert eine Transaktion durch Signieren mit der bekannten Test-Passphrase `masterpassphrase`; diese Signatur dient als Dummy-Blob zum Verteilen der Transaktion, nicht als echte Autorisierung für das Zielkonto.
- Kann bestimmte Spezialtransaktionen wie `SetRegularKey` oder `AccountSet` zum Deaktivieren des Master Keys erzeugen.

### `src/components/Sign.vue`

`Sign.vue` ist die wiederverwendbare Signier-Komponente:

- Nimmt `rawTxData`, `transaction`, optional `signAs` und optional `noSignAs` entgegen.
- Erlaubt Family Seed, Mnemonic mit optionaler Passphrase und hex-artige Secret-Erkennung.
- Leitet Accountdaten über `xrpl-accountlib` ab.
- Setzt bei MultiSign `account.signAs(signAs)`.
- Signiert die Transaktionsdaten mit `XRPLAccountLib.sign`.
- Schreibt Ergebnis-ID und signierten HEX-Blob direkt in das übergebene `transaction`-Objekt.
- Zeigt Sicherheitswarnungen an, wenn der Benutzer noch online ist oder die App von einem Webserver statt lokal läuft.

### `src/components/TxSign.vue`

Diese Komponente ist für das Hinzufügen einer MultiSign-Signatur zuständig:

- Nimmt einen Transaktions-HEX-Blob entgegen.
- Decodiert ihn mit `ripple-binary-codec`.
- Entfernt `SigningPubKey` und `TxnSignature` für die angezeigten/weiterzugebenden Rohdaten.
- Erkennt bereits vorhandene Signierer aus `Signers`.
- Fragt per `account_info` die SignerList des Transaktions-Accounts ab.
- Prüft Sequenz und `LastLedgerSequence` grob gegen aktuelle Ledger-Daten.
- Berechnet, ob Quorum erreicht ist oder alle Signierer vorhanden sind.
- Bindet `Sign.vue` ein, damit ein ausgewählter Signierer die Transaktion ergänzt.

### `src/components/TxCombine.vue`

Diese Komponente sammelt signierte Transaktions-HEX-Blobs:

- Decodiert jeden Blob mit `ripple-binary-codec`.
- Validiert, dass Signaturen vorhanden sind.
- Verhindert doppelte Signierer und doppelte Blobs.
- Prüft, ob alle hinzugefügten Signaturen zu derselben Transaktion gehören.
- Fragt beim ersten Blob die SignerList per `account_info` ab.
- Berechnet vorhandene Signierer, Quorum und einen heuristisch minimalen Satz zu kombinierender Signaturen.
- Kombiniert ausgewählte signierte Transaktionen über `XRPLAccountLib.sign([{ signedTransaction }...])`.
- Submitted den kombinierten HEX-Blob per `submit` an den verbundenen `rippled`-Server.

### `src/components/MultiSignSetup.vue`

Diese Komponente erstellt eine `SignerListSet`-Transaktion:

- Verwaltet Quorum und bis zu acht Signer-Einträge.
- Prüft Duplikate, Eigentümerkonto als Signierer, Gewichte größer als Quorum und problematische Redundanzfälle.
- Erzeugt das XRPL-JSON für `SignerListSet` inklusive `SignerQuorum` und `SignerEntries`.
- Nutzt `Sign.vue`, um die Setup-Transaktion mit dem Hauptkonto zu signieren.
- Submitted den signierten Blob per `submit`.

## Ablauf SingleSign

Im Code gibt es keinen eigenständigen, als Produktfunktion benannten SingleSign-Modus. SingleSign ist jedoch implizit in zwei Bereichen vorhanden:

1. Beim Signieren von Setup- oder Spezialtransaktionen mit `noSignAs=true`.
2. Beim Dummy-Signieren einer vorbereiteten Transaktion in `TxCompose.vue`.

### Setup-/Spezialtransaktionen

1. Der Benutzer ruft in `TxCompose.vue` ein Konto ab.
2. Falls eine SignerList fehlt, wird zu `MultiSignSetup.vue` navigiert.
3. `MultiSignSetup.vue` erstellt eine `SignerListSet`-Transaktion.
4. `Sign.vue` wird mit `noSignAs=true` eingebunden.
5. Der Benutzer gibt ein Secret ein.
6. `Sign.vue` leitet mit `xrpl-accountlib` das Konto ab.
7. Weil `noSignAs=true` gesetzt ist, wird kein `signAs` gesetzt.
8. `XRPLAccountLib.sign(rawTxData, account)` erzeugt eine normale SingleSign-Signatur.
9. Der resultierende Blob wird über `rippled.submit` eingereicht.

### Dummy-Signatur beim Komponieren

1. `TxCompose.vue` validiert die JSON-Transaktion und konvertiert Memos.
2. Die Komponente leitet ein Konto aus der bekannten Passphrase `masterpassphrase` ab.
3. Die Transaktion wird mit diesem Dummy-Konto signiert.
4. Der daraus resultierende HEX-Blob dient als transportfähige, decodierbare Vorlage für spätere MultiSign-Signaturen.
5. Diese Signatur sollte nicht als Sicherheitssignal verstanden werden, sondern als technisches Hilfsmittel zum Verteilen serialisierter Transaktionsdaten.

## Ablauf MultiSign

### 1. Komposition

1. Benutzer verbindet die App über den Header mit LIVE oder TEST.
2. `TxCompose.vue` ruft `account_info` mit `signer_lists=true` ab.
3. Die Komponente liest `Sequence`, `SignerEntries`, `SignerQuorum` und Account-Flags.
4. Der Benutzer bearbeitet die Transaktion im CodeMirror-JSON-Editor.
5. Memo-Werte werden bei Bedarf von UTF-8 in HEX gewandelt.
6. Die Transaktion wird mit einer Dummy-Signatur in einen HEX-Blob serialisiert.
7. Der Blob wird an die tatsächlichen MultiSign-Unterzeichner verteilt.

### 2. Signieren durch Signierer

1. Ein Signierer öffnet `TxSign.vue` und fügt den HEX-Blob ein.
2. `ripple-binary-codec.decode` wandelt den Blob in JSON.
3. Nicht relevante SingleSign-Felder werden entfernt.
4. Bereits vorhandene MultiSign-Einträge werden erkannt.
5. `account_info` lädt die aktuelle SignerList des betroffenen Accounts.
6. Die UI zeigt Quorum, Signer-Gewichte und bereits vorhandene Signaturen.
7. Der Benutzer wählt sein `signAs`-Konto aus.
8. `Sign.vue` leitet den Schlüssel ab, setzt `account.signAs(signAs)` und signiert die Rohtransaktion.
9. Der neu signierte Blob wird kopiert und an den Sammler zurückgegeben.

### 3. Kombinieren und Einreichen

1. Der Sammler öffnet `TxCombine.vue`.
2. Jeder signierte Blob wird decodiert.
3. Die Komponente prüft doppelte Signierer, doppelte Blobs und Transaktionsgleichheit.
4. Beim ersten Blob wird die aktuelle SignerList geladen.
5. `existingSigners` und `quorumMet` berechnen den aktuellen Status.
6. `minimalSignerList` wählt heuristisch einen ausreichenden Satz signierter Blobs aus.
7. `XRPLAccountLib.sign([{ signedTransaction }...])` kombiniert die Signaturen.
8. Das Ergebnis wird per `submit` an den verbundenen `rippled`-Server geschickt.
9. Bei Erfolg verlinkt die UI zum passenden Bithomp-Explorer.

## Datenfluss

```text
Benutzer/UI
  │
  ├─ Header.vue ──► env.connectTo(endpoint)
  │                  │
  │                  └─► rippled-ws-client ──► XRPL WebSocket Server
  │
  ├─ TxCompose.vue
  │    ├─ account_info(account, signer_lists=true)
  │    ├─ JSON-Transaktion + Ledgerdaten
  │    ├─ Memo UTF-8 → HEX
  │    └─ XRPLAccountLib.sign(dummy) → HEX-Vorlage
  │
  ├─ TxSign.vue
  │    ├─ HEX → ripple-binary-codec.decode → JSON
  │    ├─ account_info(tx.Account, signer_lists=true)
  │    ├─ Auswahl signAs
  │    └─ Sign.vue → XRPLAccountLib.derive + signAs + sign → signierter HEX-Blob
  │
  └─ TxCombine.vue
       ├─ mehrere HEX-Blobs → decode
       ├─ Signer-/Quorum-Prüfung
       ├─ XRPLAccountLib.sign([...signedTransaction]) → kombinierter Blob
       └─ rippled submit(tx_blob) → XRPL
```

Der Zustand ist überwiegend komponentenlokal. Gemeinsamer globaler Zustand ist `$env`, insbesondere Netzwerk, Ledger und Editor-Konfiguration. Routing-Daten werden in `App.vue` als `routeData` übergeben. Signierergebnisse werden über mutierte Prop-Objekte (`transaction.signed`) von `Sign.vue` zurück in Elternkomponenten geschrieben.

## Verwendete XRPL-Bibliotheken

### `rippled-ws-client`

- Stellt die WebSocket-Verbindung zum XRPL-Server her.
- Wird in `src/env.js` importiert und in `connectTo(endpoint)` verwendet.
- Liefert `send(...)` für Befehle wie `account_info` und `submit`.
- Liefert Events wie `state` und `ledger`.

### `xrpl-accountlib`

- Wird für Schlüsselableitung und Signaturen verwendet.
- Genutzte Ableitungen:
  - `derive.familySeed(...)`
  - `derive.mnemonic(...)`
  - `derive.privatekey(...)`
  - `derive.passphrase('masterpassphrase')` für Dummy-Signaturen.
- Signiert SingleSign- und MultiSign-Transaktionen.
- Kombiniert MultiSign-Blobs über die Signierfunktion mit einer Liste von `signedTransaction`-Objekten.

### `ripple-binary-codec`

- Decodiert Transaktions-HEX in JSON in `TxSign.vue` und `TxCombine.vue`.
- Wird nicht direkt zum Encodieren genutzt; das Encodieren übernimmt indirekt `xrpl-accountlib` beim Signieren.

### `ripple-hashes`

- Ist in `package.json` als Dependency enthalten.
- Im aktuellen Quellcode wird es nicht direkt importiert.

## UI-Struktur

Die UI ist eine klassische Vue-2-Komponentenstruktur ohne Vue Router:

- `App.vue` enthält den Layout-Rahmen, Header, dynamische Seitenkomponente und Footer-Info.
- `Header.vue` steuert Navigation und Netzwerk-Auswahl.
- Hauptseiten:
  - `Home`: Erklärung des Workflows.
  - `TxCompose`: Schritt 1, Transaktion vorbereiten.
  - `TxSign`: Schritt 2, MultiSign-Signatur hinzufügen.
  - `TxCombine`: Schritt 3, Signaturen kombinieren und submitten.
  - `MultiSignSetup`: Assistent außerhalb der Header-Navigation, wird aus `TxCompose` aufgerufen.
- Wiederverwendbare Unterkomponente:
  - `Sign`: Secret-Eingabe, Key-Derivation und Signaturerzeugung.
- Darstellung:
  - Bootstrap 4 aus `public/bootstrap-4.1.3-dist`.
  - CodeMirror für JSON-Bearbeitung.
  - `vue-json-pretty` für JSON-Ausgabe.
  - `vue-clipboard2` für Kopieren von signierten HEX-Blobs.

## Schwachstellen

1. **Starke Kopplung von UI, XRPL-Zugriff und Kryptografie**  
   Komponenten führen Netzwerkzugriffe, Transaktionsvalidierung, Serialisierung, Signaturerzeugung und UI-Logik direkt gemischt aus. Dadurch sind Tests, Austausch von Bibliotheken und Sicherheitsreviews erschwert.

2. **Globaler `$env`-Singleton**  
   Netzwerkzustand, Ledgerdaten und Konfiguration hängen an einem globalen Vue-Objekt. Das ist einfach, erschwert aber isolierte Tests und kontrolliertes Fehlerhandling.

3. **Kein formaler Router**  
   Die Navigation basiert auf String-Komponentennamen und lokalem State. Deep Links, Browser-Historie und klare Routen-Guards fehlen.

4. **Mutierende Props in `Sign.vue`**  
   `Sign.vue` schreibt direkt in das vom Parent übergebene `transaction`-Objekt. Das verletzt den üblichen Vue-Datenfluss und macht Seiteneffekte schwer nachvollziehbar.

5. **Heuristische Auswahl minimaler Signaturen**  
   `TxCombine.vue` versucht, eine minimale Signaturliste über Sortierung und Reduktion zu bestimmen. Das ist kein vollständiger Optimierungsalgorithmus und kann in ungleich gewichteten SignerLists suboptimale Mengen auswählen.

6. **Transaktionsgleichheit über Base64 von JSON**  
   `TxCombine.vue` vergleicht Transaktionen über `Buffer.from(JSON.stringify(this.txData)).toString('base64')`. JSON-Key-Reihenfolge und vorherige Mutationen können solche Vergleiche fragil machen.

7. **Leere Catch-Blöcke**  
   Mehrere Memo-Konvertierungen verschlucken Fehler vollständig. Das erschwert Diagnose und kann fehlerhafte Memo-Darstellung verdecken.

8. **Veralteter Dependency-Stack**  
   Vue 2, Vue CLI 3/4, alte Ripple-Bibliotheken und alte Build-Dependencies erhöhen Wartungs- und Supply-Chain-Risiken.

9. **Validierung ist überwiegend UI-/Regex-basiert**  
   Account- und Secret-Erkennung nutzt einfache Regex-Prüfungen und keine zentrale XRPL-validierte Schema-/Address-Validierung.

10. **Fehlende automatisierte Tests**  
    Es sind keine dedizierten Unit-, Integrations- oder E2E-Tests sichtbar. Kritische Flows wie Signieren, Kombinieren und Quorum-Berechnung sind dadurch regressionsanfällig.

## Refactoring-Empfehlungen

1. **Domain-Services extrahieren**

   Neue Module unter `src/services/` oder `src/domain/`:

   - `xrplClient.js`: Verbindung, `account_info`, `submit`, Ledger-Status.
   - `transactionCodec.js`: Decode, Memo-Konvertierung, kanonische Transaktionsnormalisierung.
   - `signingService.js`: Key-Derivation, SingleSign, MultiSign, Combine.
   - `signerListService.js`: Quorum-, Gewichtungs- und Redundanzberechnung.
   - `securityWarnings.js`: Master-Key-/Regular-Key-/Offline-Warnungen.

2. **Vuex/Pinia oder Composition-State einführen**

   Der globale `$env`-Singleton sollte durch expliziten, testbaren Application State ersetzt werden. Bei Vue 2 wäre Vuex naheliegend; bei einer Migration auf Vue 3 Pinia.

3. **Vue Router verwenden**

   Routen wie `/compose`, `/sign`, `/combine`, `/setup` würden Deep Links, History und bessere Guards ermöglichen.

4. **Props-down/events-up in `Sign.vue`**

   `Sign.vue` sollte ein Event wie `signed` oder `sign-error` emittieren, statt Parent-Objekte direkt zu mutieren.

5. **Kanonische Transaktionsvergleiche**

   Statt JSON-String-Vergleich sollten relevante Felder normalisiert und deterministisch verglichen werden. Alternativ kann der Signing-Hash bzw. eine kanonische binäre Repräsentation verwendet werden.

6. **Optimale Quorum-Auswahl implementieren**

   Für die Auswahl minimaler Signaturen bietet sich ein kleiner Subset-Sum-/Knapsack-Algorithmus an. Da XRPL maximal acht Signer in einer SignerList erlaubt, ist vollständige Enumeration praktisch unproblematisch.

7. **Zentrale Fehlerbehandlung**

   Leere Catch-Blöcke sollten durch kontrollierte Fehlerobjekte, UI-Meldungen und optionales Debug-Logging ersetzt werden.

8. **Dependency-Modernisierung**

   Mittelfristig sollte geprüft werden:

   - Migration von Vue 2 auf Vue 3.
   - Wechsel auf die aktuelle offizielle `xrpl`-JavaScript-Bibliothek, sofern sie alle benötigten Signier- und MultiSign-Flows abdeckt.
   - Entfernen ungenutzter Dependencies wie `ripple-hashes`, falls weiterhin ungenutzt.

9. **Testabdeckung einführen**

   Priorität:

   - Unit-Tests für Memo-Konvertierung.
   - Unit-Tests für Quorum- und SignerList-Logik.
   - Fixture-basierte Tests für Decode/Sign/Combine.
   - E2E-Tests für Compose → Sign → Combine mit Testnet- oder Mock-Client.

## Sicherheitsrisiken

1. **Secret-Eingabe im Browser**  
   Family Seeds, Mnemonics und private Schlüssel werden in einer Web-App eingegeben. Auch wenn die App Offline-Warnungen zeigt, besteht Risiko durch kompromittierte Builds, Browser-Erweiterungen, XSS, Clipboard-Hijacking, Keylogger oder manipulierte Hosting-Infrastruktur.

2. **Webserver-Betrieb trotz lokaler Empfehlung**  
   Die App warnt, wenn sie über einen Webserver läuft, verhindert aber die Secret-Eingabe nur abhängig von Online-/Devmode-Logik. Benutzer können gefährliche Betriebsarten dennoch nutzen.

3. **Supply-Chain-Risiko**  
   Viele alte npm-Abhängigkeiten und vendored Frontend-Dateien erhöhen die Angriffsfläche. Ein kompromittiertes Paket oder Build-Prozess könnte Secret-Daten exfiltrieren.

4. **Keine Content-Security-Policy im Projekt sichtbar**  
   Ohne starke CSP ist XSS-Folgeschaden besonders kritisch, weil private Schlüssel in der Seite verarbeitet werden.

5. **Keine Hardware-Wallet- oder WalletConnect-ähnliche Isolation**  
   Secrets werden direkt in der App verarbeitet. Es gibt keine Adapter-Abstraktion für externe Signer, Hardware Wallets oder isolierte Signing-Backends.

6. **Trust in konfigurierte XRPL-Endpunkte**  
   Ledgerdaten wie Sequence, LastLedgerSequence und SignerList werden vom verbundenen Server bezogen. Ein bösartiger oder kompromittierter Server kann Benutzer täuschen oder veraltete/falsche Daten liefern. Signaturen schützen zwar die Transaktion selbst, aber UX-Entscheidungen hängen am Server.

7. **Unklare Validierung von `signAs`**  
   Die UI bietet Signer aus der SignerList an, aber die finale Sicherheit hängt an Bibliothek und Ledger ab. Eine zentrale Validierung sollte sicherstellen, dass `signAs` zum abgeleiteten Konto passt und in der aktuellen SignerList enthalten ist.

8. **Master-Key-/Regular-Key-Risiken**  
   Die App zeigt Warnungen, wenn Master Key oder Regular Key MultiSign umgehen könnten. Das ist hilfreich, aber sicherheitskritische Entscheidungen liegen beim Benutzer und sollten deutlicher als irreversible bzw. bypass-relevante Zustände modelliert werden.

9. **Clipboard-Risiken**  
   Signierte Blobs werden per Click-to-Copy verteilt. Clipboard-Inhalte können von anderer Software gelesen oder ersetzt werden.

10. **Fehlende Integritätsprüfung der lokalen Releases**  
    Der README-Workflow empfiehlt Releases oder lokale Builds, beschreibt aber keine Signatur-/Checksum-Prüfung für Release-Artefakte.

## Vorschlag für eine modulare Wallet-Adapter-Architektur

Ziel ist, die Anwendung von direkter Secret-Verarbeitung zu entkoppeln und verschiedene Signierquellen austauschbar zu machen.

### Grundidee

Die UI spricht nicht mehr direkt mit `xrpl-accountlib`. Stattdessen verwendet sie ein einheitliches `WalletAdapter`-Interface. Adapter können lokal, hardwarebasiert, browserbasiert oder remote sein. Die Transaktionslogik erzeugt nur Signaturanforderungen; der Adapter entscheidet, wie signiert wird.

### Interface-Skizze

```ts
interface WalletAdapter {
  id: string
  label: string
  capabilities: {
    singleSign: boolean
    multiSign: boolean
    deriveAddress: boolean
    offline: boolean
    hardwareBacked: boolean
  }

  connect(): Promise<WalletSession>
  disconnect(): Promise<void>
  getAccounts(): Promise<WalletAccount[]>
  signTransaction(request: SignRequest): Promise<SignResult>
}

interface SignRequest {
  txJson: object
  network: 'mainnet' | 'testnet' | 'custom'
  account: string
  signAs?: string
  multiSign: boolean
  metadata?: {
    originComponent: 'compose' | 'sign' | 'setup'
    humanReadableSummary?: string
  }
}

interface SignResult {
  txId: string
  signedTransaction: string
  signer?: string
  warnings?: string[]
}
```

### Adapter-Typen

1. **LocalSecretAdapter**

   - Entspricht dem heutigen Verhalten.
   - Akzeptiert Family Seed, Mnemonic oder Private Key.
   - Sollte nur in Offline-/lokalem Modus aktiviert sein.
   - Kann optional nach jedem Signieren Secret-State aktiv löschen.

2. **ReadOnlyAdapter**

   - Kann Adressen und Public Keys anzeigen, aber nicht signieren.
   - Nützlich für Validierung und UI-Preview.

3. **HardwareWalletAdapter**

   - Signiert über Hardware-Geräte.
   - Private Keys verlassen das Gerät nicht.
   - Benötigt klare Anzeige der Transaktionsdetails auf Gerät oder in vertrauenswürdiger UI.

4. **BrowserExtensionAdapter**

   - Delegiert Signatur an eine Wallet-Browsererweiterung.
   - Die App erhält nur Ergebnis oder Ablehnung.

5. **OfflineFileAdapter / QRAdapter**

   - Exportiert Signaturanfragen als Datei oder QR-Code.
   - Importiert signierte Antworten.
   - Geeignet für Air-Gap-Workflows.

6. **MockWalletAdapter**

   - Deterministische Testsignaturen oder Fixture-basierte Antworten.
   - Für Unit- und E2E-Tests.

### Modulstruktur

```text
src/
├── adapters/
│   ├── WalletAdapter.ts
│   ├── LocalSecretAdapter.ts
│   ├── HardwareWalletAdapter.ts
│   ├── BrowserExtensionAdapter.ts
│   ├── OfflineFileAdapter.ts
│   └── MockWalletAdapter.ts
├── services/
│   ├── xrplClient.ts
│   ├── transactionCodec.ts
│   ├── signerListService.ts
│   ├── signingOrchestrator.ts
│   └── securityPolicy.ts
└── components/
    ├── WalletSelector.vue
    ├── SignRequestReview.vue
    └── ...
```

### Signing-Orchestrator

Ein `signingOrchestrator` koordiniert:

1. Transaktionsnormalisierung.
2. Sicherheitsprüfung.
3. Auswahl des Adapters.
4. Erstellung einer `SignRequest`.
5. Anzeige einer menschenlesbaren Zusammenfassung.
6. Adapter-Signatur.
7. Validierung des Ergebnisses.
8. Rückgabe des `SignResult` an Compose/Sign/Setup/Combine.

### Sicherheitsrichtlinien

Eine zentrale `securityPolicy` sollte entscheiden:

- Ob Secret-Eingabe im aktuellen Modus erlaubt ist.
- Ob Online-Signing blockiert oder nur gewarnt wird.
- Welche Adapter für Mainnet/Testnet zugelassen sind.
- Ob Transaktionsdetails vollständig angezeigt wurden.
- Ob `signAs` zu Konto und SignerList passt.
- Ob der Benutzer irreversible Aktionen wie `asfDisableMaster` besonders bestätigen muss.

### Vorteile

- Austauschbare Wallet-Implementierungen ohne Änderung der Fachkomponenten.
- Bessere Testbarkeit durch Mock-Adapter.
- Reduzierte Secret-Exposition durch Hardware-/Extension-/Air-Gap-Optionen.
- Klarere Trennung zwischen UI, Ledger-Zugriff, Transaktionslogik und Signaturausführung.
- Zukunftsfähige Basis für neue XRPL-Bibliotheken und Wallet-Standards.
