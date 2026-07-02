# Legacy Build Notes

Datum: 2026-07-01  
Ziel: reproduzierbare Legacy-Build-Umgebung für den bestehenden Vue-2/Webpack-4-Stand finden, ohne Modernisierung oder Codeänderungen vorzunehmen.

## Kurzfazit

Für den aktuellen Projektstand ist eine moderne Node.js/npm-Umgebung nicht geeignet. Das Projekt hängt an einem alten Vue-CLI/Webpack-4-Stack und insbesondere an `node-sass@4.13.1`. Diese Kombination ist für heutige Node-Versionen nicht zuverlässig installier- oder buildbar.

**Empfohlene `.nvmrc`:**

```text
12.22.12
```

**Empfohlene npm-Version in dieser Legacy-Umgebung:**

```text
6.14.16
```

Diese Empfehlung ist bewusst eine Legacy-Empfehlung, keine Modernisierung. Sie passt zum alten `package-lock.json` mit `lockfileVersion: 1` und zur `node-sass@4.13.1`-Generation. Node.js 12 ist selbst End-of-Life und sollte nur zur Reproduktion historischer Builds genutzt werden.

## Warum Node.js 12.22.12?

Die relevante technische Blockade ist `node-sass@4.13.1`.

Aus dem Lockfile ergeben sich diese Kernversionen:

| Paket | Version |
| --- | ---: |
| `vue` | `2.6.11` |
| `vue-template-compiler` | `2.6.11` |
| `@vue/cli-service` | `4.2.3` |
| `webpack` | `4.41.6` |
| `webpack-dev-server` | `3.10.3` |
| `node-sass` | `4.13.1` |
| `sass-loader` | `7.3.1` |

`node-sass` verwendet native Bindings. Diese Bindings sind an Node-ABI-Versionen gekoppelt. Moderne Node-Versionen wie 18, 20, 22 oder 24 passen nicht zum historischen `node-sass@4.13.1`-Setup. Node.js 12 ist die konservativste LTS-Zielversion, die zur `node-sass@4.x`-Generation und npm-6-Lockfile-Generation passt.

## Warum npm 6.14.16?

`package-lock.json` ist im Format `lockfileVersion: 1`. Dieses Format stammt aus npm 5/6. Moderne npm-Versionen können v1-Lockfiles lesen, versuchen aber zusätzliche Paketmetadaten aus der Registry nachzuladen.

In der geprüften Umgebung führte das zu wiederholten Meldungen wie:

```text
npm warn old lockfile The package-lock.json file was created with an old version of npm,
npm warn old lockfile so supplemental metadata must be fetched from the registry.
```

Danach folgten viele `403 Forbidden`-Fehler beim Abrufen von Registry-Metadaten. Für eine reproduzierbare Legacy-Installation ist deshalb npm 6 vorzuziehen, weil es dem Lockfile-Format entspricht und weniger moderne Metadaten-Nachladung erzwingt.

## Geprüfte lokale Umgebung

Auf dem Prüf-Host waren diese Node-Versionen über nvm lokal verfügbar:

| Node-Version | npm-Version | Ergebnis |
| --- | --- | --- |
| `v18.20.8` | `10.9.8` | nicht geeignet; altes Lockfile triggert Metadaten-Fetches, Registry blockiert mit `403`; `node-sass@4.13.1` wäre zusätzlich inkompatibel |
| `v20.20.2` | `11.4.2` | nicht geeignet; moderne npm-/Node-Generation für diesen Stack |
| `v22.22.2` | `11.4.2` | nicht geeignet; moderne npm-/Node-Generation für diesen Stack |
| `v24.15.0` | `11.4.2` | nicht geeignet; aktuelle Prüf-Default-Version, Build/Lint ohne vollständige Installation nicht möglich |

Ein direkter Test mit Node.js 12 war in dieser Umgebung nicht möglich, weil `nvm ls-remote 'v12.*'` keine Remote-Versionen liefern konnte und `nvm install 12.22.12` mit `Version '12.22.12' not found` endete. Die Empfehlung für Node 12.22.12 basiert daher auf der Dependency-Matrix des vorhandenen Stacks, nicht auf einem in dieser Umgebung erfolgreich abgeschlossenen Build.

## Beobachtete Installationsprobleme mit modernen Node/npm-Versionen

Ein Test in einer temporären Arbeitskopie mit Node.js 18.20.8 und npm 10.9.8 wurde ausgeführt, um das Repository nicht zu verändern. Der Installationsversuch verwendete:

```bash
npm ci --ignore-scripts --no-audit --no-fund
```

Selbst mit `--ignore-scripts` scheiterte der Versuch bereits vor nativen Build-Schritten, weil npm aufgrund des alten Lockfiles zusätzliche Registry-Metadaten abrufen wollte. Die Umgebung lieferte wiederholt:

```text
403 Forbidden - GET https://registry.npmjs.org/<package>
```

Beispiele aus der Ausgabe:

- `@babel/code-frame`
- `@babel/core`
- `@babel/generator`
- `@babel/parser`
- `normalize-path`
- `lru-cache`
- `yallist`

Zusätzlich trat auf:

```text
MaxListenersExceededWarning: Possible EventEmitter memory leak detected.
```

Der Prozess musste abgebrochen werden. Da bereits die Metadatenphase scheiterte, konnte in dieser Umgebung nicht bis zu einem tatsächlichen `node-sass`-Buildfehler oder erfolgreichen Build vorgedrungen werden.

## Erwartete reproduzierbare Legacy-Umgebung

### `.nvmrc`-Vorschlag

```text
12.22.12
```

### Setup-Befehle

```bash
nvm install 12.22.12
nvm use 12.22.12
npm install -g npm@6.14.16
node --version
npm --version
npm ci
npm run build
npm run lint
```

Erwartete Versionen:

```text
node v12.22.12
npm 6.14.16
```

### Alternative mit Docker

Falls lokale nvm-Installation nicht möglich ist, sollte ein temporärer Legacy-Container genutzt werden:

```bash
docker run --rm -it \
  -v "$PWD":/app \
  -w /app \
  node:12.22.12-buster \
  bash -lc 'npm install -g npm@6.14.16 && npm ci && npm run build && npm run lint'
```

Hinweis: Diese Docker-Variante ist nur zur Reproduktion des historischen Builds gedacht. Sie ist keine Empfehlung für langfristige Entwicklung oder Deployment.

## Erwarteter Build-Ablauf

Nach erfolgreicher Installation sollten diese vorhandenen Skripte genutzt werden:

```bash
npm run build
npm run lint
```

Für lokale Entwicklung:

```bash
npm run serve
```

Für den bestehenden Release-Workflow:

```bash
./build.sh
```

`build.sh` führt intern `npm run build` aus, erstellt `dist.zip` und versucht anschließend `dist/index.html` lokal zu öffnen. In CI- oder Headless-Umgebungen kann der `open`-Schritt scheitern, obwohl der Build erfolgreich war.

## Wichtige Einschränkungen der Legacy-Umgebung

1. **Node.js 12 ist End-of-Life**  
   Diese Umgebung ist nur zur Reproduktion gedacht und sollte nicht als zukünftiger Entwicklungsstandard betrachtet werden.

2. **npm 6 ist veraltet**  
   npm 6 passt zum Lockfile v1, erhält aber nicht die gleichen Sicherheits- und Audit-Verbesserungen wie moderne npm-Versionen.

3. **`node-sass` ist End-of-Life**  
   Die Build-Reproduktion hängt an einem nativen, archivierten Sass-Paket.

4. **Registry-Zugriff ist kritisch**  
   Ohne Zugriff auf npm Registry oder einen vollständigen internen Mirror kann `npm ci` wegen Metadaten- oder Paketabrufen fehlschlagen.

5. **Native Build-Tools können erforderlich sein**  
   Falls für `node-sass` kein passendes Binary verfügbar ist, versucht npm einen nativen Build. Dafür können Python 2/3, `make`, `g++` und passende Systembibliotheken erforderlich sein. Mit Node 12 ist die Chance auf verfügbare historische Binaries höher als mit modernen Node-Versionen.

## Keine Modernisierung in diesem Schritt

Diese Notizen schlagen ausdrücklich keine Dependency-Modernisierung vor. Für die Legacy-Reproduktion sollen keine bestehenden Projektdateien geändert werden, außer optional in einem separaten Folge-PR eine `.nvmrc` mit `12.22.12` hinzuzufügen.

Nicht Teil dieses Schritts:

- kein Wechsel von `node-sass` zu `sass`
- kein Wechsel von Vue 2 zu Vue 3
- kein Wechsel von Webpack/Vue CLI zu Vite
- kein Lockfile-Upgrade
- keine Codeänderungen
- keine Anpassung von `build.sh`

## Validierungscheckliste für die Legacy-Umgebung

Eine Legacy-Umgebung gilt als erfolgreich reproduziert, wenn folgende Befehle erfolgreich durchlaufen:

```bash
node --version
npm --version
npm ci
npm run lint
npm run build
```

Zusätzlich sollte nach dem Build geprüft werden:

```bash
test -d dist
test -f dist/index.html
test -f dist.zip || true
```

`dist.zip` entsteht nur über `./build.sh`, nicht zwingend über `npm run build` allein.

## Ergebnisbewertung

### Sicher festgestellt

- Das Projekt nutzt ein Lockfile v1.
- Der Stack enthält `node-sass@4.13.1`, Vue 2.6, Vue CLI 4.2 und Webpack 4.
- Moderne lokal verfügbare Node/npm-Versionen sind für diesen Stand nicht geeignet.
- npm 10/11 versuchen beim v1-Lockfile zusätzliche Metadaten abzurufen.
- Registry-Zugriffe waren in der Prüf-Umgebung mit `403 Forbidden` blockiert.

### Nicht abschließend verifiziert

- Ein vollständiger erfolgreicher Build mit Node 12.22.12 konnte in dieser Umgebung nicht ausgeführt werden, weil Node 12 nicht per nvm installierbar war und npm Registry-Zugriffe blockiert wurden.

### Praktische Empfehlung

Für die nächste praktische Verifikation sollte eine Umgebung mit funktionierendem npm-Registry-Zugriff und Node.js `12.22.12` bereitgestellt werden. Dort sollte exakt diese Sequenz getestet werden:

```bash
nvm install 12.22.12
nvm use 12.22.12
npm install -g npm@6.14.16
npm ci
npm run lint
npm run build
./build.sh
```

Wenn diese Sequenz erfolgreich ist, kann in einem separaten PR eine `.nvmrc` mit folgendem Inhalt ergänzt werden:

```text
12.22.12
```
