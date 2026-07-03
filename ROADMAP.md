# Roadmap Version 2: XRPL MultiSignTool

## Vision

Version 2 des XRPL MultiSignTool soll aus dem heutigen monolithischen Browser-Werkzeug eine sichere, modulare und erweiterbare Signaturplattform für XRPL-Transaktionen machen. Der Fokus liegt auf klarer Trennung von UI, Ledger-Zugriff, Transaktionslogik und Signaturausführung.

Die neue Version soll drei Ziele gleichzeitig erfüllen:

1. **Sicherheit erhöhen**: Secrets sollen möglichst nicht mehr direkt in der Web-App verarbeitet werden. Hardware-Wallets, Xaman, WalletConnect, QR-/Air-Gap-Flows und Browser-Wallets werden bevorzugte Signierwege.
2. **Benutzbarkeit verbessern**: SingleSign, MultiSign, Offline Signing und SignerList-Management sollen als geführte Workflows mit verständlicher Transaktionsprüfung verfügbar sein.
3. **Erweiterbarkeit schaffen**: Wallets, Transaktionstypen, Validierungsregeln und Export-/Import-Kanäle sollen über Adapter und Plugins ergänzt werden können, ohne Kernkomponenten zu ändern.

## Zielarchitektur

Die Zielarchitektur besteht aus mehreren klar abgegrenzten Schichten:

```text
UI Layer
  ├─ Pages / Workflows
  ├─ Reusable Components
  └─ Design System

Application Layer
  ├─ Workflow Orchestrators
  ├─ Signing Orchestrator
  ├─ Policy Engine
  └─ Plugin Runtime

Domain Layer
  ├─ Transaction Model
  ├─ SignerList / Quorum Logic
  ├─ Validation Rules
  └─ Security Warnings

Infrastructure Layer
  ├─ XRPL Client Adapter
  ├─ Wallet Adapters
  ├─ Storage Adapter
  ├─ QR / File / Clipboard Transport
  └─ Telemetry-free Diagnostics
```

Wichtige Architekturprinzipien:

- **Keine direkte Signierlogik in UI-Komponenten**.
- **Keine direkte `rippled`-Kommunikation in UI-Komponenten**.
- **Explizite Signaturanfragen statt mutierter Transaktionsobjekte**.
- **Deterministische Transaktionsnormalisierung vor Vergleich, Signatur und Export**.
- **Policy-basierte Sicherheitsentscheidungen** statt verstreuter Warnungen.
- **Adapter-first-Design** für Wallets und Transportkanäle.
- **Plugin-first-Design** für optionale Erweiterungen.

## Modularisierung

Version 2 sollte in fachliche Module aufgeteilt werden:

```text
src/
├── app/
│   ├── router/
│   ├── state/
│   └── bootstrap/
├── domain/
│   ├── transactions/
│   ├── signer-lists/
│   ├── validation/
│   └── security/
├── services/
│   ├── xrpl-client/
│   ├── signing/
│   ├── encoding/
│   ├── network/
│   └── storage/
├── adapters/
│   ├── wallets/
│   ├── transports/
│   └── explorers/
├── plugins/
│   ├── runtime/
│   ├── manifests/
│   └── registry/
├── ui/
│   ├── pages/
│   ├── workflows/
│   ├── components/
│   └── design-system/
└── tests/
    ├── fixtures/
    ├── unit/
    ├── integration/
    └── e2e/
```

### Kernmodule

| Modul | Verantwortung |
| --- | --- |
| `xrpl-client` | Verbindung, Ledger-Status, Account- und Fee-Abfragen, Submit |
| `encoding` | HEX/JSON/Binary-Encoding, Memo-Konvertierung, kanonische Normalisierung |
| `transactions` | Transaktionsmodell, Builder, Summary, Vergleich |
| `signer-lists` | Quorum, Gewichte, Signer-Auswahl, Redundanzanalyse |
| `validation` | Schema-, Netzwerk-, Sequenz-, Fee- und Policy-Validierung |
| `signing` | Signaturanfragen, Signaturprüfung, Combine-Operationen |
| `wallets` | Wallet-Adapter-Interface und konkrete Adapter |
| `transports` | QR, Datei, Clipboard, Deep Links, WalletConnect-Transport |
| `plugins` | Registrierung, Berechtigungen und Lifecycle optionaler Erweiterungen |

## Wallet-Adapter-System

Wallets werden nicht mehr direkt aus einzelnen Komponenten angesprochen. Alle Signaturquellen implementieren ein gemeinsames Adapter-Interface.

```ts
interface WalletAdapter {
  id: string
  name: string
  vendor?: string
  type: 'local' | 'hardware' | 'mobile' | 'browser' | 'remote' | 'offline'
  capabilities: WalletCapabilities

  detect(): Promise<WalletAvailability>
  connect(request: ConnectRequest): Promise<WalletSession>
  disconnect(session: WalletSession): Promise<void>
  listAccounts(session: WalletSession): Promise<WalletAccount[]>
  sign(request: SignRequest, session: WalletSession): Promise<SignResult>
}
```

### Adapter-Capabilities

```ts
interface WalletCapabilities {
  singleSign: boolean
  multiSign: boolean
  offlineSign: boolean
  qrSign: boolean
  walletConnect: boolean
  hardwareBacked: boolean
  supportsTestnet: boolean
  supportsMainnet: boolean
  supportsTransactionPreview: boolean
  supportsSignerListSet: boolean
}
```

### SignRequest

```ts
interface SignRequest {
  network: 'mainnet' | 'testnet' | 'devnet' | 'custom'
  txJson: unknown
  txSummary: HumanReadableTxSummary
  account: string
  signAs?: string
  mode: 'single-sign' | 'multi-sign'
  requiredReview: ReviewRequirement[]
  policyContext: SecurityPolicyContext
}
```

### SignResult

```ts
interface SignResult {
  txId?: string
  signedTransaction: string
  signerAccount?: string
  publicKey?: string
  warnings: string[]
  adapterMetadata?: Record<string, unknown>
}
```

### Adapter-Prioritäten

1. Hardware- oder externe Wallets bevorzugen.
2. Local Secret nur als bewusst aktivierter Expertenmodus.
3. Mainnet-Signing mit Local Secret standardmäßig blockieren oder stark absichern.
4. MultiSign-Signaturen immer mit `signAs` und validierter SignerList erzwingen.
5. Jede Signatur mit einer menschenlesbaren, adapterunabhängigen Transaktionszusammenfassung vorbereiten.

## Plugin-System

Das Plugin-System soll Erweiterbarkeit ermöglichen, ohne den Kern unsicher oder instabil zu machen.

### Plugin-Arten

- **Wallet-Plugins**: neue Wallet-Adapter wie zusätzliche Hardware-Wallets oder Browser-Wallets.
- **Transaction-Plugins**: Builder und Reviewer für bestimmte XRPL-Transaktionstypen.
- **Validation-Plugins**: zusätzliche Regeln, z. B. Unternehmensrichtlinien, Whitelists oder Limits.
- **Transport-Plugins**: QR-Varianten, Dateiformate oder Deep-Link-Mechanismen.
- **Explorer-Plugins**: alternative Explorer-Links für Mainnet, Testnet oder Sidechains.

### Plugin-Manifest

```json
{
  "id": "com.example.wallet",
  "name": "Example Wallet Adapter",
  "version": "1.0.0",
  "type": "wallet",
  "entry": "./plugin.js",
  "permissions": [
    "wallet:connect",
    "wallet:sign",
    "network:read"
  ],
  "networks": ["mainnet", "testnet"]
}
```

### Sicherheitsmodell für Plugins

- Plugins erhalten minimale, deklarierte Berechtigungen.
- Plugins dürfen keine Secrets direkt aus dem Kern-State lesen.
- Signaturanfragen laufen immer durch die zentrale Policy Engine.
- Plugins können Transaktionssummaries ergänzen, aber nicht unbemerkt verändern.
- Kritische Plugin-Aktionen müssen auditierbar und testbar sein.
- Externe Plugins sollten signiert oder über eine vertrauenswürdige Registry bezogen werden.

## SingleSign

SingleSign wird in Version 2 als eigener, geführter Workflow modelliert:

1. Konto oder Wallet verbinden.
2. Transaktion erstellen oder importieren.
3. Ledger-Daten laden: Sequence, Fee, LastLedgerSequence-Vorschlag.
4. Transaktion normalisieren und validieren.
5. Menschenlesbare Zusammenfassung anzeigen.
6. Security Policy prüfen.
7. Wallet-Adapter signiert im Modus `single-sign`.
8. Ergebnis anzeigen, exportieren oder submitten.

### Anforderungen

- Expliziter Unterschied zwischen SingleSign und MultiSign in der UI.
- Kein Dummy-Signing als versteckter Mechanismus.
- Unterstützte Signierquellen: Xaman, Ledger, Tangem, Trust Wallet, Browser Wallets, Local Secret, QR/Air-Gap.
- Optionaler Read-only-Modus zum Erstellen von Transaktionen ohne Signatur.

## MultiSign

MultiSign wird als eigener End-to-End-Prozess umgesetzt:

1. SignerList prüfen oder einrichten.
2. Transaktion erstellen und gegen aktuelle Ledger-Daten validieren.
3. Signaturanfrage für jeden Signierer erzeugen.
4. Signaturen über Wallet-, QR-, Datei- oder Deep-Link-Kanäle sammeln.
5. Signaturen einzeln validieren.
6. Quorum und Signer-Gewichte berechnen.
7. Optimalen Signatursatz bestimmen.
8. Signaturen deterministisch kombinieren.
9. Kombinierte Transaktion final prüfen und submitten.

### MultiSign-spezifische Verbesserungen

- Vollständige Enumeration der Signer-Kombinationen, da XRPL-SignerLists klein sind.
- Validierung, dass jeder Signer in der aktuellen SignerList enthalten ist.
- Warnung bei fehlender Redundanz, Blocker-Signern oder Single-Signer-Quorum.
- Anzeige, welche Signaturen noch fehlen.
- Import-Historie mit Prüfsummen, Signer, Zeit und Quelle.
- Unterstützung für paralleles Sammeln über QR, Datei, WalletConnect und Browser-Wallets.

## Offline Signing

Offline Signing soll als First-Class-Workflow unterstützt werden.

### Ablauf

1. Online-Gerät erstellt eine Signaturanfrage mit Transaktionsdaten und Kontext.
2. Anfrage wird als Datei oder QR-Code exportiert.
3. Offline-Gerät importiert die Anfrage.
4. Offline-Gerät zeigt die Transaktionszusammenfassung und Sicherheitswarnungen.
5. Offline-Wallet signiert.
6. Signierte Antwort wird als Datei oder QR-Code zurückgegeben.
7. Online-Gerät importiert die Signatur, validiert sie und submitted optional.

### Dateiformate

- JSON-basiertes, versioniertes Request-Format.
- JSON-basiertes, versioniertes Response-Format.
- Enthält Netzwerk, erwartetes Konto, optional `signAs`, Transaktionshash, Ablaufzeit und Policy-Hinweise.
- Keine Secrets im Exportformat.

## QR-Code Signing

QR-Code Signing ist ein Spezialfall des Offline- oder Mobile-Signings.

### Anforderungen

- Chunking für große Transaktionen oder viele Signaturen.
- Fehlerkorrektur und Wiederaufnahme bei unterbrochenem Scan.
- Anzeige eines Request-Fingerprints zur manuellen Kontrolle.
- QR-Import für signierte Antworten.
- Kompatibilität mit mobilen Wallets, soweit deren Formate öffentlich und sicher nutzbar sind.

### QR-Formate

Priorität:

1. Eigenes versioniertes XRPL-MultiSignTool-v2-Format für vollständige Kontrolle.
2. Wallet-spezifische Deep-Link- oder QR-Formate als Adapter.
3. Generische URIs nur, wenn sie alle sicherheitsrelevanten Felder abbilden können.

## WalletConnect

WalletConnect soll als Transport- und Session-Layer für kompatible Wallets integriert werden.

### Ziele

- Verbindungsaufbau über QR-Code oder Deep Link.
- Session-Verwaltung getrennt vom Wallet-Adapter.
- Signaturanfragen über standardisierte WalletConnect-Methoden, sofern XRPL-Unterstützung verfügbar ist.
- Netzwerk- und Kontoabgleich vor jeder Signatur.
- Klare Fehlerbehandlung bei abgelehnten oder abgelaufenen Requests.

### Risiken

- WalletConnect-XRPL-Unterstützung kann je nach Wallet variieren.
- Methodennamen und Payload-Formate müssen adapterseitig versioniert und getestet werden.
- Session-Persistenz darf keine falsche Sicherheit suggerieren; jede Signatur braucht Review.

## Xaman

Xaman sollte als priorisierter Mobile-Wallet-Adapter umgesetzt werden, da es im XRPL-Ökosystem weit verbreitet ist.

### Ziele

- Sign-in bzw. Account-Auswahl über Xaman-spezifischen Flow.
- SingleSign-Unterstützung.
- MultiSign-Unterstützung, sofern Xaman den konkreten `signAs`-Flow und Payload unterstützt.
- Payload-Status-Polling und klare UI für Pending/Rejected/Signed.
- Testnet-/Mainnet-Trennung.

### Adapter-Verantwortung

- Xaman-Payload erzeugen.
- Deep Link oder QR anzeigen.
- Status abrufen.
- Signiertes Ergebnis extrahieren.
- Ergebnis gegen ursprüngliche SignRequest validieren.

## Ledger

Ledger-Integration soll Secrets konsequent außerhalb der Web-App halten.

### Ziele

- Verbindung über WebHID/WebUSB, abhängig von Browser-Unterstützung und Ledger-App-Fähigkeiten.
- Kontoableitung und Account-Auswahl.
- SingleSign für unterstützte XRPL-Transaktionstypen.
- MultiSign-Unterstützung prüfen und ggf. gestuft einführen.
- Klare Anzeige, welche Transaktionsdetails auf dem Gerät bestätigt werden können.

### Sicherheitsanforderungen

- Fallback verhindern, bei dem Benutzer unbemerkt zum Local-Secret-Modus wechseln.
- Nicht unterstützte Transaktionstypen deutlich blockieren.
- Firmware-/App-Kompatibilität dokumentieren.

## Tangem

Tangem sollte als Hardware-/NFC-orientierter Wallet-Adapter betrachtet werden.

### Ziele

- Prüfen, ob eine Web-Integration realistisch und sicher möglich ist.
- Wenn keine direkte Web-Integration möglich ist: Deep-Link- oder Mobile-Bridge-Flow über Tangem-App evaluieren.
- SingleSign priorisieren.
- MultiSign nur freigeben, wenn `signAs` und Payload-Prüfung eindeutig unterstützt werden.

### Meilenstein-Entscheidung

Tangem wird zunächst als Research-Adapter geplant. Eine produktive Implementierung erfolgt erst nach technischer Machbarkeitsprüfung und Sicherheitsreview.

## Trust Wallet

Trust Wallet soll vor allem über WalletConnect oder Deep-Link-Flows unterstützt werden.

### Ziele

- XRPL-Kontoerkennung über WalletConnect, falls verfügbar.
- SingleSign über unterstützte WalletConnect-Methoden prüfen.
- MultiSign-Fähigkeit gesondert validieren.
- Klare Fehlermeldung, wenn Trust Wallet XRPL-Signaturen in der benötigten Form nicht unterstützt.

### Priorität

Trust Wallet ist wichtig für Reichweite, sollte aber hinter Xaman und Ledger priorisiert werden, falls XRPL-spezifische Signierfunktionen eingeschränkt sind.

## Browser Wallets

Browser Wallets werden über ein generisches Browser-Wallet-Adapter-Modell unterstützt.

### Ziele

- Provider Detection ohne harte Kopplung an einzelne Extensions.
- Account-Auswahl und Netzwerkprüfung.
- SingleSign und MultiSign über Capability-Erkennung.
- Event-Handling für Account-Wechsel, Netzwerk-Wechsel und Disconnects.
- Strenge Origin- und Permission-Prüfung.

### Anforderungen

- Kein automatisches Signieren ohne Benutzerinteraktion.
- Jede Extension muss eine explizite Capability-Matrix liefern.
- Fehlende oder unbekannte Capabilities führen zu Blockieren statt zu riskanten Fallbacks.

## Sicherheitskonzept

Das Sicherheitskonzept von Version 2 basiert auf Defense in Depth.

### Zentrale Security Policy Engine

Die Policy Engine entscheidet vor jeder kritischen Aktion:

- Ist das Netzwerk korrekt?
- Passt das Konto zur Signaturanfrage?
- Ist `signAs` gesetzt, wenn MultiSign verlangt ist?
- Ist der Signierer in der aktuellen SignerList?
- Ist die SignerList aktuell genug?
- Ist `LastLedgerSequence` plausibel?
- Ist die Fee plausibel?
- Enthält die Transaktion riskante Felder?
- Handelt es sich um irreversible Account-Konfiguration?
- Darf der gewählte Adapter diese Aktion ausführen?

### Sicherheitsstufen

| Stufe | Beschreibung | Beispiel |
| --- | --- | --- |
| Info | Harmloser Hinweis | Testnet aktiv |
| Warnung | Benutzer darf fortfahren | Hohe Fee innerhalb Limit |
| Starke Warnung | Zusätzliche Bestätigung nötig | Master Key deaktivieren |
| Blocker | Aktion wird verhindert | Mainnet Local Secret im Online-Webmodus |

### Secret-Handling

- Local Secret ist nicht der Standardpfad.
- Secrets werden nie gespeichert.
- Secrets werden nach Signaturversuch aus UI-State entfernt, soweit technisch möglich.
- Mainnet + Local Secret + gehostete Web-App wird blockiert oder hinter einem expliziten Expert-Mode versteckt.
- Dokumentation warnt vor Browser-Erweiterungen, kompromittierten Builds und Clipboard-Risiken.

### Integrität

- Release-Artefakte sollten Prüfsummen und Signaturen erhalten.
- Build-Prozess reproduzierbar machen.
- Dependency-Audit in CI.
- Content Security Policy definieren.
- Keine externen Skripte zur Laufzeit nachladen.

## Teststrategie

### Unit-Tests

- Transaktionsnormalisierung.
- Memo-Encoding und -Decoding.
- Quorum-Berechnung.
- Optimale Signer-Kombination.
- Policy-Entscheidungen.
- Adapter-Capability-Matching.

### Integrationstests

- XRPL-Client gegen Mock-Server.
- SignRequest → WalletAdapter → SignResult.
- MultiSign: mehrere Signaturen importieren, Quorum erreichen, kombinieren.
- Plugin-Manifest laden und Berechtigungen prüfen.
- QR-Chunking und Reassembly.

### E2E-Tests

- SingleSign mit Mock-Wallet.
- MultiSign mit mehreren Mock-Signern.
- Offline-Datei-Export und Import.
- QR-Code-Request und Response.
- WalletConnect-Session mit Mock-Provider.

### Sicherheits- und Qualitätschecks

- Dependency-Audit.
- Static Application Security Testing.
- CSP-Test.
- Secret-Leak-Tests in Logs, State und Exporten.
- Snapshot-Tests für Transaktionssummaries.
- Regressionstests mit XRPL-Fixtures.

## UI/UX-Konzept

### Grundprinzipien

- Benutzer wählen zuerst den Workflow: SingleSign, MultiSign, Setup, Offline, Combine.
- Jede Transaktion erhält eine menschenlesbare Summary.
- Risikoentscheidungen werden kontextbezogen und verständlich angezeigt.
- Expertenfunktionen sind verfügbar, aber nicht der Standardpfad.
- Fortschritt und Status sind in Multi-Step-Flows jederzeit sichtbar.

### Hauptbereiche

1. **Dashboard**
   - Netzwerkstatus.
   - Verbundene Wallets.
   - Letzte lokale Sessions ohne sensitive Daten.
   - Schnellstart für SingleSign und MultiSign.

2. **Transaction Builder**
   - Formularbasierte Builder für häufige Transaktionstypen.
   - JSON-Editor als Expertenmodus.
   - Live-Validierung und Summary.

3. **Wallet Selector**
   - Capabilities anzeigen.
   - Sicherheitsniveau anzeigen.
   - Netzwerk- und Account-Kompatibilität prüfen.

4. **Review Screen**
   - Menschliche Beschreibung.
   - Raw JSON optional einklappbar.
   - Fee, Sequence, LastLedgerSequence, Account, Destination, Amount und Memos prominent anzeigen.

5. **MultiSign Workspace**
   - SignerList visualisieren.
   - Quorum-Fortschritt anzeigen.
   - Fehlende Signierer markieren.
   - Import- und Exportkanäle zentral anbieten.

6. **Offline/QR Workspace**
   - Request erzeugen.
   - QR oder Datei exportieren.
   - Response importieren.
   - Fingerprint vergleichen.

## Migrationsplan

### Phase 1: Stabilisierung des bestehenden Funktionsumfangs

- Tests für bestehende Compose-, Sign- und Combine-Flows ergänzen.
- Fachlogik aus Komponenten extrahieren.
- Transaktionsnormalisierung und Quorum-Berechnung isolieren.
- Dokumentierte Security Policies einführen.

### Phase 2: Adapter-Schicht einführen

- `WalletAdapter`-Interface definieren.
- LocalSecretAdapter als Kompatibilitätsadapter bauen.
- MockWalletAdapter für Tests einführen.
- UI von direkter Signierlogik entkoppeln.

### Phase 3: Neue Workflows bauen

- SingleSign-Workflow als eigenständiger Flow.
- MultiSign-Workspace mit Signaturimport und Quorum-Anzeige.
- Offline-Datei-Signing.
- QR-Code-Request/Response.

### Phase 4: Externe Wallets integrieren

- Xaman Adapter.
- Ledger Research und Implementierung.
- WalletConnect Transport.
- Browser-Wallet-Adapter.
- Trust Wallet über WalletConnect prüfen.
- Tangem Machbarkeitsstudie.

### Phase 5: Plugin-System und Hardening

- Plugin-Manifest und Registry.
- Berechtigungsmodell.
- Signierte Plugins oder vertrauenswürdige Quellen.
- CSP, Release-Signaturen und Audit-Prozess.

## Prioritäten

### P0: Grundlage und Sicherheit

- Domain-Services extrahieren.
- Transaktionsnormalisierung.
- Policy Engine.
- Test-Fixtures.
- MockWalletAdapter.
- LocalSecretAdapter mit klaren Sicherheitsgrenzen.

### P1: Kern-Workflows

- Neuer SingleSign-Flow.
- Neuer MultiSign-Workspace.
- SignerList-Analyse.
- Deterministisches Combine.
- Offline-Datei-Signing.

### P2: Wallet-Ökosystem

- Xaman.
- Ledger.
- WalletConnect.
- Browser Wallets.
- QR-Code-Signing.

### P3: Erweiterungen

- Plugin-System.
- Trust Wallet.
- Tangem.
- Zusätzliche Transaction-Builder.
- Organisationale Policy-Plugins.

## Meilensteine

### M1: Architektur-Fundament

**Ziel:** Bestehende Funktionalität testbar und modular machen.

Lieferumfang:

- Domain-Module für Transaktionen, SignerLists und Validierung.
- XRPL-Client-Service.
- MockWalletAdapter.
- Erste Unit-Tests für Quorum und Normalisierung.
- Dokumentierte Security Policy Decisions.

### M2: Adapter-basierte Signatur

**Ziel:** UI signiert nicht mehr direkt.

Lieferumfang:

- WalletAdapter-Interface.
- LocalSecretAdapter.
- Signing Orchestrator.
- Neuer Review Screen.
- SingleSign mit Adapterpfad.

### M3: MultiSign v2

**Ziel:** Robuster, transparenter MultiSign-Workspace.

Lieferumfang:

- SignerList-Visualisierung.
- Signaturanfragen pro Signierer.
- Import von Signaturen.
- Optimale Signer-Kombination.
- Deterministisches Combine und Submit.

### M4: Offline und QR

**Ziel:** Air-Gap-fähige Signaturen.

Lieferumfang:

- Versioniertes Request-/Response-Dateiformat.
- QR-Chunking.
- QR-Import.
- Fingerprint-Prüfung.
- E2E-Tests mit Mock-Wallet.

### M5: Wallet-Integrationen

**Ziel:** Secrets aus der Web-App herausbewegen.

Lieferumfang:

- Xaman Adapter.
- Ledger Adapter oder dokumentierter Support-Status.
- WalletConnect Transport.
- Browser-Wallet-Adapter-Grundlage.
- Trust-Wallet-Kompatibilitätsprüfung.
- Tangem Research-Ergebnis.

### M6: Plugin-System und Release-Hardening

**Ziel:** Erweiterbarkeit und Produktionsreife.

Lieferumfang:

- Plugin-Manifest.
- Plugin-Permission-System.
- Plugin-Registry-Konzept.
- CSP-Konfiguration.
- Dependency-Audit in CI.
- Release-Checksums und Signaturen.

## Definition of Done für Version 2

Version 2 gilt als abgeschlossen, wenn:

- SingleSign und MultiSign vollständig über den Signing Orchestrator laufen.
- Mindestens LocalSecret, MockWallet, Xaman und ein Hardware- oder WalletConnect-basierter Adapter verfügbar sind.
- Offline-Datei- und QR-Signing funktionieren.
- Quorum, Transaktionsvergleich und Combine deterministisch getestet sind.
- Security Policy Engine kritische Fälle blockiert oder sichtbar eskaliert.
- Dokumentierte Migrationspfade für Nutzer des bestehenden Tools vorhanden sind.
- CI Unit-, Integrations-, E2E-, Dependency- und Security-Checks ausführt.
