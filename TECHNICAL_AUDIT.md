# Technical Audit: XRPL MultiSignTool

Datum der Prüfung: 2026-07-01  
Branch der Prüfung: `docs/technical-audit-20260701`  
Geprüfter Basisstand: lokaler Branch `work`

## Kurzfazit

Das Projekt ist technisch ein älterer Vue-2/Vue-CLI/Webpack-4-Stack mit sehr alten Build- und Runtime-Abhängigkeiten. Der aktuelle lokale Prüf-Host nutzt Node.js `v24.15.0` und npm `11.4.2`; mit dieser Umgebung ist das Projekt nicht reproduzierbar installier- oder buildbar.

Die größten technischen Risiken sind:

1. **Vue 2 ist End-of-Life** und erhält upstream keine regulären Sicherheitsfixes mehr.
2. **`node-sass@4.13.1` ist End-of-Life und nicht mit modernen Node-Versionen kompatibel**.
3. **`package-lock.json` ist Lockfile-Version 1** und erzwingt mit modernen npm-Versionen alte Metadaten-Fetches.
4. **`npm ci` konnte in der Prüf-Umgebung nicht erfolgreich abgeschlossen werden**, weil npm für sehr viele Pakete Metadaten aus der Registry nachladen wollte und die Registry-Zugriffe mit `403 Forbidden` blockiert wurden.
5. **Build und Lint laufen nicht**, weil `vue-cli-service` nach dem fehlgeschlagenen Installationsversuch nicht verfügbar ist.
6. **Die Dependency-Basis ist sicherheitskritisch veraltet**, insbesondere Vue 2, Vue CLI 3/4, Webpack 4, webpack-dev-server 3, ESLint 5, Babel ESLint, Node Sass und alte XRPL-/Ripple-Bibliotheken.

## Prüfumfang und ausgeführte Befehle

### Analysierte Dateien

- `package.json`
- `package-lock.json`
- Build-Konfiguration über npm-Skripte
- indirekt relevante Versionen aus dem Lockfile

### Ausgeführte Befehle

```bash
git status --short --branch
git checkout work
git checkout -b docs/technical-audit-20260701
node --version
npm --version
sed -n '1,220p' package.json
node -e "const p=require('./package-lock.json'); console.log('lockfileVersion', p.lockfileVersion); console.log('name', p.name); console.log('deps', Object.keys(p.dependencies||{}).length)"
npm ci
npm audit --json
npm run build
npm run lint
node <lockfile-version-inspection-script>
rg -n '"node-sass"|"webpack"|"webpack-dev-server"|"vue"|"@vue/cli-service"|"lockfileVersion"|"scripts"|"dependencies"|"devDependencies"|"node"' package.json package-lock.json
```

Hinweis: `npm ci` wurde nach längerer Laufzeit abgebrochen, weil der Prozess fortlaufend Registry-Metadaten abrief, wiederholt `403 Forbidden` erhielt und nicht zu einem verwertbaren Abschluss kam.

## package.json

### Projektmetadaten

- Paketname: `xrpl-multisigntool`
- Version: `0.3.1`
- `private: true`
- Repository: `https://github.com/WietseWind/XRPL-MultiSignTool.git`
- Lizenz: MIT

### npm-Skripte

```json
{
  "serve": "vue-cli-service serve",
  "build": "vue-cli-service build",
  "lint": "vue-cli-service lint"
}
```

Es gibt keine dedizierten Testskripte wie `test`, `unit`, `e2e`, `typecheck` oder `audit`. Die Qualitätssicherung ist damit im aktuellen Stand auf `lint` und manuelle Build-Prüfung beschränkt.

### Runtime Dependencies

| Dependency | deklarierte Version | Bewertung |
| --- | ---: | --- |
| `ripple-binary-codec` | `^0.2.6` | sehr alt; Ripple-era Paketname; Migration auf aktuelle XRPL-Bibliotheken prüfen |
| `ripple-hashes` | `^0.3.4` | sehr alt; im aktuellen Source scheinbar nicht direkt genutzt |
| `rippled-ws-client` | `^1.2.2` | älterer XRPL-WebSocket-Client; Wartungsstatus prüfen |
| `sweetalert` | `^2.1.2` | älteres UI-Paket; aktuell im Source auskommentiert/nicht produktiv genutzt |
| `vue` | `^2.6.11` | Vue 2; offiziell End-of-Life seit 2023-12-31 |
| `vue-clipboard2` | `^0.3.1` | altes Clipboard-Plugin |
| `vue-codemirror` | `^4.0.6` | Wrapper für ältere Vue-/CodeMirror-Integration |
| `vue-json-pretty` | `^1.6.3` | älteres Vue-2-kompatibles Anzeige-Paket |
| `xrpl-accountlib` | `^0.3.6` | alte XRPL-Signing-Bibliothek; Wartung und Kompatibilität prüfen |

### Dev Dependencies

| Dependency | deklarierte Version | Bewertung |
| --- | ---: | --- |
| `@vue/cli-plugin-babel` | `^3.12.1` | Vue CLI 3; sehr alt |
| `@vue/cli-plugin-eslint` | `^3.12.1` | Vue CLI 3; sehr alt |
| `@vue/cli-service` | `^4.2.3` | Vue CLI 4.2; Webpack 4; veraltet |
| `@vue/eslint-config-standard` | `^4.0.0` | alte ESLint-Konfiguration |
| `babel-eslint` | `^10.1.0` | deprecated; ersetzt durch `@babel/eslint-parser` |
| `eslint` | `^5.16.0` | sehr alt |
| `eslint-plugin-vue` | `^5.2.3` | sehr alt; für Vue 2 nutzbar, aber weit hinter aktuellem Stand |
| `fsevents` | `^2.1.2` | optional/macOS-spezifisch; auf Linux normalerweise irrelevant |
| `node-sass` | `^4.13.1` | End-of-Life; inkompatibel mit modernen Node-Versionen |
| `sass-loader` | `^7.3.1` | alt; eng mit Webpack-4-/Node-Sass-Stack verbunden |
| `vue-template-compiler` | `^2.6.11` | muss exakt zu Vue 2 passen; ebenfalls Vue-2-EOL-Kontext |

## package-lock.json

### Lockfile-Status

- `lockfileVersion`: `1`
- Anzahl gelockter Dependencies: `1056`
- Lockfile stammt aus npm-6-Zeit.

Mit npm 7+ und insbesondere npm 11 erzeugt ein Lockfile v1 Warnungen und führt dazu, dass npm zusätzliche Paketmetadaten aus der Registry nachladen möchte. In der geprüften Umgebung führte das zu massiven `403 Forbidden`-Warnungen.

### Relevante gelockte Versionen

| Paket | gelockte Version |
| --- | ---: |
| `vue` | `2.6.11` |
| `vue-template-compiler` | `2.6.11` |
| `@vue/cli-service` | `4.2.3` |
| `@vue/cli-plugin-babel` | `3.12.1` |
| `@vue/cli-plugin-eslint` | `3.12.1` |
| `webpack` | `4.41.6` |
| `webpack-dev-server` | `3.10.3` |
| `node-sass` | `4.13.1` |
| `sass-loader` | `7.3.1` |
| `eslint` | `5.16.0` |
| `babel-eslint` | `10.1.0` |
| `ripple-binary-codec` | `0.2.6` |
| `ripple-hashes` | `0.3.4` |
| `rippled-ws-client` | `1.2.2` |
| `xrpl-accountlib` | `0.3.6` |

## Vue/Webpack-Versionen

### Vue

Das Projekt nutzt Vue `2.6.11` zusammen mit `vue-template-compiler` `2.6.11`.

Bewertung:

- Vue 2 ist offiziell End-of-Life seit 2023-12-31.
- Die letzte Vue-2-Version ist 2.7.16; das Projekt liegt darunter.
- Für ein Wallet-/Signing-Tool ist der Betrieb auf einem EOL-Frontend-Framework ein relevantes Sicherheits- und Wartungsrisiko.

Referenz: https://v2.vuejs.org/eol/

### Vue CLI

Das Projekt mischt Vue-CLI-Plugin-Versionen:

- `@vue/cli-service`: `4.2.3`
- `@vue/cli-plugin-babel`: `3.12.1`
- `@vue/cli-plugin-eslint`: `3.12.1`

Bewertung:

- Vue CLI 3/4 ist historisch und Webpack-4-basiert.
- Der Versionsmix ist technisch nicht ideal, weil Service und Plugins aus unterschiedlichen Major-Linien stammen.
- Moderne Vue-Projekte nutzen typischerweise Vite oder aktuellere CLI-/Bundler-Stacks.

### Webpack

Gelockte Kernversionen:

- `webpack`: `4.41.6`
- `webpack-dev-server`: `3.10.3`

Bewertung:

- Webpack 4 und webpack-dev-server 3 sind veraltet.
- Dev-Server-Pakete sind zwar primär Entwicklungsabhängigkeiten, können aber trotzdem relevante Supply-Chain- und CI-Risiken darstellen.
- Ein Upgrade auf Webpack 5 oder ein Wechsel auf Vite sollte in einer Modernisierung priorisiert werden.

## Node.js-Kompatibilität

### Geprüfte lokale Versionen

- Node.js: `v24.15.0`
- npm: `11.4.2`

### Bewertung

Mit Node.js 24 ist der aktuelle Projektstand nicht kompatibel. Hauptgrund ist `node-sass@4.13.1`. Laut Support-Matrix von `node-sass` passt Version 4.13.x nur in den Bereich alter Node-Versionen, insbesondere Node 13 und teilweise Node 12; moderne Node-Versionen benötigen wesentlich neuere `node-sass`-Versionen, wobei `node-sass` insgesamt End-of-Life ist.

Referenzen:

- Node Sass EOL: https://sass-lang.com/blog/node-sass-is-end-of-life/
- Node Sass Support-Matrix: https://github.com/sass/node-sass

### Praktische Konsequenz

Wahrscheinliche lauffähige Legacy-Umgebung:

- Node.js 12.x oder 13.x
- npm 6.x

Diese Umgebung ist selbst veraltet und sollte nicht als langfristige Lösung betrachtet werden. Für eine sichere Modernisierung sollte `node-sass` durch `sass` beziehungsweise Dart Sass ersetzt und der Build-Stack aktualisiert werden.

## npm install / npm ci Probleme

### Beobachtung bei `npm ci`

`npm ci` erzeugte zunächst:

```text
npm warn old lockfile
npm warn old lockfile The package-lock.json file was created with an old version of npm,
npm warn old lockfile so supplemental metadata must be fetched from the registry.
```

Danach folgten sehr viele Fehler nach folgendem Muster:

```text
403 Forbidden - GET https://registry.npmjs.org/<package>
```

Beispiele aus der Ausgabe:

- `@babel/code-frame`
- `@babel/core`
- `@babel/generator`
- `@babel/parser`
- `webpack`-nahe und Babel-nahe Transitivpakete
- diverse Utility-Pakete

Zusätzlich trat auf:

```text
MaxListenersExceededWarning: Possible EventEmitter memory leak detected.
```

Der Prozess wurde abgebrochen, nachdem keine erfolgreiche Installation absehbar war.

### Ursachenbewertung

Die beobachteten Installationsprobleme haben zwei Ebenen:

1. **Umgebungs-/Netzwerkproblem**: Registry-Zugriffe wurden mit `403 Forbidden` blockiert. Das verhindert eine vollständige Live-Installation und auch `npm audit`.
2. **Projektproblem**: Das alte Lockfile v1 zwingt moderne npm-Versionen zum Nachladen von Metadaten. Dadurch wird das Projekt anfälliger für Registry-/Proxy-Probleme und weniger reproduzierbar.

### Empfehlung

- Kurzfristig eine dokumentierte Legacy-Installationsumgebung bereitstellen, z. B. `.nvmrc` und README-Hinweis.
- Mittelfristig Lockfile mit einer kontrollierten npm-Version erneuern.
- Langfristig Build-Stack aktualisieren und `node-sass` entfernen.

## Build- und Testbefehle

### `npm run build`

Ergebnis in der geprüften Umgebung:

```text
> xrpl-multisigntool@0.3.1 build
> vue-cli-service build

sh: 1: vue-cli-service: not found
```

Bewertung:

- Der Build konnte nicht ausgeführt werden.
- Ursache ist die fehlgeschlagene/inkomplette Dependency-Installation.
- Zusätzlich ist davon auszugehen, dass der Build mit Node.js 24 auch nach vollständiger Installation wegen `node-sass` scheitern würde.

### `npm run lint`

Ergebnis in der geprüften Umgebung:

```text
> xrpl-multisigntool@0.3.1 lint
> vue-cli-service lint

sh: 1: vue-cli-service: not found
```

Bewertung:

- Lint konnte nicht ausgeführt werden.
- Es gibt keine weiteren Testskripte.

### Fehlende Tests

Nicht vorhanden:

- Unit-Tests
- Integrationstests
- E2E-Tests
- Snapshot-Tests für Transaktionsdarstellung
- Security-/Dependency-Checks als npm-Skript
- Typechecking

Für ein Tool, das Signaturen und Transaktionsdaten verarbeitet, ist das ein wesentliches Qualitätsrisiko.

## Bekannte veraltete Dependencies

### Kritisch veraltet

| Paket | Risiko |
| --- | --- |
| `vue@2.6.11` | Vue 2 EOL, Version unter finalem Vue 2 Release |
| `vue-template-compiler@2.6.11` | Vue-2-EOL-Kontext; gekoppelt an Vue-Version |
| `node-sass@4.13.1` | EOL, native Bindings, moderne Node-Inkompatibilität |
| `@vue/cli-service@4.2.3` | alter Webpack-4-Build-Stack |
| `webpack@4.41.6` | veralteter Bundler-Major |
| `webpack-dev-server@3.10.3` | veralteter Dev-Server-Major |
| `babel-eslint@10.1.0` | deprecated, keine Updates; Ersatz ist `@babel/eslint-parser` |
| `eslint@5.16.0` | sehr alt; moderner Regel-/Parser-Support fehlt |

Referenzen:

- Vue 2 EOL: https://v2.vuejs.org/eol/
- Node Sass EOL: https://sass-lang.com/blog/node-sass-is-end-of-life/
- `babel-eslint` deprecated: https://www.npmjs.com/package/babel-eslint

### XRPL-/Ripple-spezifisch zu prüfen

| Paket | Risiko |
| --- | --- |
| `xrpl-accountlib@0.3.6` | altes Signing-Paket; Wartungsstatus und Kompatibilität mit aktuellen XRPL-Konventionen prüfen |
| `ripple-binary-codec@0.2.6` | altes Ripple-Namensschema; aktuelle XRPL-Bibliotheken prüfen |
| `ripple-hashes@0.3.4` | altes Ripple-Namensschema; im Code offenbar ungenutzt |
| `rippled-ws-client@1.2.2` | älterer WebSocket-Client; aktuelle Alternativen prüfen |

Diese Pakete sind fachlich besonders kritisch, weil sie Encoding, Signing und Ledger-Kommunikation betreffen.

## Sicherheitsrisiken in Dependencies

### Direkt bestätigte Risiken aus Stack-Zustand

1. **EOL-Framework im Browser**  
   Vue 2 ist nicht mehr regulär maintained. Für eine Web-App, in der Nutzer Secrets eingeben können, ist das ein hohes strukturelles Risiko.

2. **EOL-Sass-Compiler mit nativen Bindings**  
   `node-sass` ist End-of-Life, das Repository ist archiviert und die Empfehlung ist Migration zu Dart Sass. Native Bindings erhöhen zusätzlich Installations- und Plattformrisiken.

3. **Veralteter Dev-Server und Bundler**  
   `webpack-dev-server@3.10.3` und `webpack@4.41.6` sind nicht mehr zeitgemäß. Auch wenn Dev-Dependencies nicht in das Produktionsbundle müssen, betreffen sie Entwickler-Workstations, CI und Supply Chain.

4. **Deprecated Parser**  
   `babel-eslint` ist deprecated und erhält keine Updates. Das betrifft Linting-Qualität und Kompatibilität mit modernen Babel-/ESLint-Versionen.

5. **Alte Lockfile-Generation**  
   Lockfile v1 erschwert reproduzierbare Builds mit aktuellen npm-Versionen und kann dazu führen, dass Builds von Registry-Metadaten abhängig werden, obwohl ein Lockfile existiert.

### Nicht abschließend prüfbar wegen Registry-Blockade

`npm audit --json` konnte nicht ausgeführt werden, weil der Audit-Endpunkt blockiert wurde:

```text
403 Forbidden - POST https://registry.npmjs.org/-/npm/v1/security/advisories/bulk
```

Damit konnte keine vollständige, aktuelle npm-Advisory-Liste erzeugt werden. Die obigen Risiken ergeben sich daher aus den festgestellten Versionen, dem bekannten EOL-/Deprecation-Status und der lokalen Build-/Installationsprüfung, nicht aus einem erfolgreichen Live-`npm audit`.

## Empfohlene Maßnahmen

### Sofortmaßnahmen

1. `.nvmrc` oder dokumentierte Node/npm-Version ergänzen.
2. Reproduzierbaren Installationspfad definieren, z. B. Node 12/13 + npm 6 als temporäre Legacy-Umgebung.
3. `npm audit` in einer Umgebung mit Registry-Zugriff ausführen.
4. Prüfen, ob `ripple-hashes` und `sweetalert` tatsächlich noch benötigt werden.
5. CI einführen oder reaktivieren, mindestens für Install, Build und Lint.

### Kurzfristige Modernisierung

1. `node-sass` durch `sass` ersetzen.
2. `sass-loader` kompatibel aktualisieren.
3. Vue 2 mindestens auf 2.7.16 heben, falls eine direkte Vue-3-Migration nicht sofort möglich ist.
4. `babel-eslint` durch `@babel/eslint-parser` ersetzen.
5. ESLint und `eslint-plugin-vue` aktualisieren.
6. Lockfile auf ein modernes Format kontrolliert migrieren.

### Mittelfristige Modernisierung

1. Migration von Vue CLI/Webpack 4 auf Vite oder einen modernen Webpack-5-Stack.
2. Migration auf Vue 3.
3. XRPL-Bibliotheken konsolidieren und auf aktuelle, aktiv gepflegte Pakete umstellen.
4. Teststrategie für Signing-, Encoding-, Decode-, Combine- und Quorum-Logik etablieren.
5. Security-Checks in CI integrieren.

### Langfristige Zielrichtung

1. Secret-Verarbeitung aus der Web-App reduzieren.
2. Wallet-Adapter-Architektur mit Hardware-/Mobile-/Browser-Wallets einführen.
3. Build reproduzierbar machen und Release-Artefakte signieren.
4. Content Security Policy und Dependency-Governance etablieren.

## Risikomatrix

| Bereich | Risiko | Schwere | Wahrscheinlichkeit | Empfehlung |
| --- | --- | --- | --- | --- |
| Vue 2 EOL | Sicherheitsfixes fehlen | Hoch | Hoch | Migration auf Vue 3 oder Vue 2 NES/2.7.16 als Zwischenlösung |
| Node Sass | Install bricht auf modernen Nodes | Hoch | Hoch | Migration zu Dart Sass |
| Lockfile v1 | nicht robuste Installation mit npm 11 | Mittel | Hoch | Lockfile kontrolliert erneuern |
| fehlende Tests | Regressionen in Signing-Flows | Hoch | Mittel | Unit-/Integration-/E2E-Tests ergänzen |
| alte XRPL-Pakete | Encoding-/Signing-Kompatibilitätsrisiko | Hoch | Mittel | aktuelle XRPL-Bibliotheken evaluieren |
| Webpack Dev Server 3 | Dev-/CI-Supply-Chain-Risiko | Mittel | Mittel | Build-Stack aktualisieren |
| npm audit blockiert | unbekannte Advisory-Lage | Mittel | Hoch in dieser Umgebung | Audit in freier Registry-Umgebung ausführen |

## Gesamtbewertung

Der aktuelle technische Stand ist funktional historisch nachvollziehbar, aber für aktive Weiterentwicklung und insbesondere für ein sicherheitskritisches Signing-Tool nicht mehr zeitgemäß. Die wichtigste technische Blockade ist der alte Node-Sass/Vue-CLI/Webpack-4-Stack. Die wichtigste Sicherheitsblockade ist die Kombination aus Vue 2 EOL, alten Build-Dependencies und fehlender automatisierter Test-/Audit-Infrastruktur.

Die empfohlene Reihenfolge ist:

1. Reproduzierbare Legacy-Umgebung dokumentieren.
2. `npm audit` mit funktionierendem Registry-Zugriff nachholen.
3. `node-sass` entfernen.
4. Vue-/Build-Stack modernisieren.
5. Tests für XRPL-Transaktionslogik ergänzen.
6. XRPL-Bibliotheken und Wallet-/Signing-Architektur modernisieren.
