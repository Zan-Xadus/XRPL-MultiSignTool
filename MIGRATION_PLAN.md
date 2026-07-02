# Migrationsplan: Vue 2 / Webpack 4 → Vue 3 + Vite

## Ziel

Dieses Dokument beschreibt einen risikoarmen, schrittweisen Migrationsplan für XRPL MultiSignTool vom aktuellen Vue-2/Vue-CLI/Webpack-4-Stack auf Vue 3 + Vite.

Die Migration soll keine fachlichen Änderungen erzwingen. Ziel ist zuerst technische Stabilisierung, danach Framework-/Bundler-Migration und erst anschließend Modernisierung der Architektur.

## Ausgangslage

Der aktuelle Stand ist eine Vue-2-Single-Page-App ohne Vue Router. Routing erfolgt über den lokalen `route`-State in `App.vue`, globale Laufzeitdaten über `Vue.prototype.$env`, und Komponenten sind Options-API-basiert.

Wesentliche technische Ausgangspunkte:

- Vue `2.6.11`
- `vue-template-compiler` `2.6.11`
- Vue CLI / `vue-cli-service`
- Webpack 4
- `node-sass` + `sass-loader` 7
- Bootstrap 4 liegt vendored unter `public/bootstrap-4.1.3-dist`
- Build-Skripte: `serve`, `build`, `lint`
- Keine dedizierten Unit-/E2E-Testskripte

## Migrationsstrategie

Die Migration sollte nicht als Big Bang erfolgen. Empfohlen ist eine gestufte Migration mit klaren Validierungspunkten:

1. Projekt stabilisieren und lauffähige Legacy-Umgebung herstellen.
2. Tests und Smoke-Checks ergänzen.
3. Sass-/CSS-Tooling modernisieren.
4. Vue-3-Kompatibilität vorbereiten.
5. Vue 3 mit `@vue/compat` einführen.
6. Drittanbieter-Bibliotheken ersetzen.
7. Komponenten schrittweise migrieren.
8. Breaking Changes gezielt beheben.
9. Vite finalisieren und Vue-CLI/Webpack entfernen.
10. Legacy-Abhängigkeiten und Compat-Modus entfernen.

`@vue/compat` ist der offizielle Vue-3-Migration-Build. Er läuft zunächst in einem Vue-2-kompatiblen Modus und gibt Warnungen für geänderte oder entfernte APIs aus. Dadurch eignet er sich als Übergangsphase, darf aber nicht das Endziel bleiben.

Referenzen:

- Vue 3 Migration Guide: https://v3-migration.vuejs.org/
- Vue 3 Breaking Changes: https://v3-migration.vuejs.org/breaking-changes/
- Vue 3 Migration Build: https://v3-migration.vuejs.org/migration-build
- Vite Guide: https://vite.dev/guide/

## Reihenfolge der Migration

### Phase 0: Vorbereitung und Baseline

**Ziel:** Eine reproduzierbare Ausgangsbasis schaffen, bevor Framework und Bundler geändert werden.

Schritte:

1. Aktuelle App mit dokumentierter Legacy-Node-Version installierbar machen.
2. `.nvmrc` oder vergleichbare Dokumentation vorbereiten.
3. Bestehenden Build und Lint auf der Legacy-Umgebung validieren.
4. Manuelle Smoke-Test-Checkliste erstellen:
   - Startseite lädt.
   - LIVE/TEST-Verbindung kann aufgebaut werden.
   - Account-Check in `TxCompose` funktioniert.
   - Dummy-HEX kann erzeugt werden.
   - HEX kann in `TxSign` decodiert werden.
   - Signatur kann erstellt werden.
   - Signaturen können in `TxCombine` importiert werden.
   - `MultiSignSetup` rendert eine `SignerListSet`-Transaktion.
5. Fixture-Daten für Transaktionen und SignerLists sammeln.

Aufwand: klein bis mittel, 1-4 Tage.  
Risiken: alte Dependencies lassen sich auf modernen Systemen nicht installieren; ohne Tests sind Regressionen schwer sichtbar.  
Rückfallstrategie: bestehenden Branch unverändert behalten und Build mit alter Node/npm-Version in Container fixieren.

### Phase 1: Tests und fachliche Sicherheitsnetze

**Ziel:** Migrationen absichern, bevor Framework-Code verändert wird.

Schritte:

1. Test-Runner für die spätere Vite-Welt auswählen: Vitest + Vue Test Utils für Vue 3.
2. Frameworkarme Tests für reine Funktionen vorbereiten.
3. Fachlogik testbar kapseln:
   - Memo-Encoding/-Decoding.
   - Quorum-Berechnung.
   - Signer-Gewichte.
   - HEX-Decode-Validierung.
   - Transaktionsvergleich.
4. Smoke-Fixtures für `TxCompose`, `TxSign`, `TxCombine` und `MultiSignSetup` definieren.
5. Snapshot- oder DOM-Smoke-Tests für statische Komponenten vorbereiten.

Aufwand: mittel, 3-7 Tage.  
Risiken: Fachlogik ist aktuell stark in Vue-Komponenten eingebettet.  
Rückfallstrategie: zunächst nur nicht-invasive Tests und Fixtures anlegen.

### Phase 2: Sass- und CSS-Tooling modernisieren

**Ziel:** Den größten Node-Kompatibilitätsblocker entfernen.

Schritte:

1. `node-sass` entfernen.
2. `sass` beziehungsweise Dart Sass hinzufügen.
3. `sass-loader` auf eine kompatible Version aktualisieren oder im Vite-Ziel später entfernen.
4. SCSS in `.vue`-Dateien prüfen.
5. Build unter Legacy-Stack erneut validieren.

Aufwand: klein bis mittel, 1-3 Tage.  
Risiken: Sass-Ausgabe kann sich minimal unterscheiden; alte `sass-loader`-/Webpack-Kombination kann Versionsgrenzen haben.  
Rückfallstrategie: Änderung isoliert halten und visuelle Smoke-Checks für Header, Forms, Tabellen, Alerts und CodeMirror durchführen.

### Phase 3: Vue 2.7 als Zwischenstation prüfen

**Ziel:** Vue-2-Kompatibilität verbessern und späteren Übergang vorbereiten.

Schritte:

1. Vue und `vue-template-compiler` auf die letzte Vue-2-Linie aktualisieren.
2. Prüfen, ob Dependencies weiterhin Vue-2.7-kompatibel sind.
3. Lint und Build ausführen.
4. Smoke-Tests aus Phase 0 wiederholen.

Aufwand: klein bis mittel, 1-3 Tage.  
Risiken: Vue-2-Plugins können implizite Annahmen über Vue 2.6 haben.  
Rückfallstrategie: Vue-2.7-Update als eigener Branch; bei Problemen zurück auf Vue 2.6 oder direkt zu `@vue/compat`.

### Phase 4: Vite-Grundgerüst parallel aufbauen

**Ziel:** Vite einführen, ohne sofort alle Vue-3-Breaking-Changes zu lösen.

Schritte:

1. `vite.config.js` planen.
2. `index.html` von `public/index.html` in Vite-kompatible Root-Struktur überführen.
3. Vite Entry auf `src/main.js` bzw. später `src/main.ts` zeigen lassen.
4. `public/`-Assets prüfen.
5. Pfade prüfen, da Vite andere Asset- und Public-Verzeichnisregeln nutzt als Vue CLI.
6. Environment-Variablen-Konzept prüfen: Vue CLI nutzt `process.env.*`, Vite nutzt `import.meta.env`.
7. Node-Core-Polyfills prüfen, weil Vite Node-Globals im Browser nicht automatisch wie Webpack bereitstellt.

Aufwand: mittel, 3-6 Tage.  
Risiken: XRPL-/Ripple-Pakete können Node-spezifische APIs erwarten; `Buffer` wird im Browser-Code genutzt.  
Rückfallstrategie: Vite zunächst in separatem Branch experimentell aufbauen und Vue CLI Build parallel behalten.

### Phase 5: Vue 3 mit `@vue/compat` einführen

**Ziel:** Die App unter Vue 3 starten, während Vue-2-Verhalten temporär kompatibel bleibt.

Schritte:

1. Vue 3 installieren.
2. `@vue/compat` installieren und Vue-Alias auf Compat-Build setzen.
3. `@vitejs/plugin-vue` konfigurieren.
4. `vue-template-compiler` durch `@vue/compiler-sfc` ersetzen.
5. `main.js` von globaler Vue-2-API auf `createApp` umstellen.
6. Globales `$env` über `app.config.globalProperties.$env` bereitstellen.
7. Compat-Warnungen sammeln und priorisieren.
8. App im Browser starten und Kernflows prüfen.

Aufwand: mittel bis groß, 4-10 Tage.  
Risiken: globale API hat sich geändert; Plugins müssen Vue-3-kompatibel sein; mutierende Props können Warnungen oder Fehler erzeugen.  
Rückfallstrategie: Compat-Konfiguration pro Komponente nutzen und bei Plugin-Blockern zuerst Bibliotheken ersetzen.

### Phase 6: Drittanbieter-Bibliotheken ersetzen

**Ziel:** Vue-2-gebundene oder veraltete Bibliotheken durch Vue-3-/Vite-kompatible Alternativen ersetzen.

| Aktuell | Grund | Ziel / mögliche Alternative |
| --- | --- | --- |
| `vue` 2.x | Vue 2 EOL | `vue` 3.x |
| `vue-template-compiler` | Vue-2-only | `@vue/compiler-sfc` |
| `@vue/cli-service` | Vue CLI / Webpack 4 | `vite` |
| `@vue/cli-plugin-babel` | Vue CLI | entfernen oder gezielte Babel-Konfig nur bei Bedarf |
| `@vue/cli-plugin-eslint` | Vue CLI | ESLint direkt oder Vite-Plugin nur bei Bedarf |
| `babel.config.js` | Vue-CLI/Babel-Preset | meist entfernen oder minimalisieren |
| `vue.config.js` | Vue CLI | `vite.config.js` |
| `node-sass` | EOL | `sass` |
| `sass-loader` | Webpack Loader | nicht nötig bei Vite oder Vite-kompatible Sass-Konfiguration |
| `babel-eslint` | deprecated | `@babel/eslint-parser` oder Standard-ESLint-Parser |
| `eslint` 5 | alt | aktuelle ESLint-Version |
| `eslint-plugin-vue` 5 | alt | aktuelle Vue-3-kompatible Version |
| `vue-clipboard2` | Vue-2-Plugin | native Clipboard API oder Vue-3-kompatibles Clipboard-Composable |
| `vue-codemirror` 4 | Vue-2-Wrapper | Vue-3-kompatible CodeMirror-Integration oder CodeMirror 6 |
| `vue-json-pretty` 1.x | Vue-2-orientiert | Vue-3-kompatible Version oder eigene JSON-Viewer-Komponente |
| `sweetalert` | im Source nicht aktiv genutzt | entfernen oder moderne Dialog-Komponente verwenden |
| vendored Bootstrap JS | Bootstrap-4-era Risiko | Bootstrap 5 CSS/JS oder rein CSS-basierte Komponenten |

Zusätzlich prüfen:

- `ripple-binary-codec` auf Vite-/Browser-Polyfills.
- `ripple-hashes` auf tatsächliche Nutzung.
- `rippled-ws-client` auf Vite-Kompatibilität.
- `xrpl-accountlib` auf `Buffer`-/Browser-Kompatibilität.

Aufwand: mittel bis groß, 5-12 Tage.  
Rückfallstrategie: Bibliotheken einzeln ersetzen und bei Bedarf temporäre Wrapper-Komponenten bauen.

### Phase 7: Komponenten schrittweise migrieren

Empfohlene Reihenfolge:

1. `Home.vue`
2. `Header.vue`
3. `App.vue`
4. `Sign.vue`
5. `MultiSignSetup.vue`
6. `TxSign.vue`
7. `TxCombine.vue`
8. `TxCompose.vue`
9. `env.js` beziehungsweise neuer App-State

Begründung:

| Komponente | Priorität | Begründung |
| --- | --- | --- |
| `Home.vue` | 1 | statisch, geringes Risiko, guter erster Migrationstest |
| `Header.vue` | 2 | überschaubare Props/Computed-Logik, wichtig für Navigation und Netzwerkumschaltung |
| `App.vue` | 3 | Root-Komponente; Umstellung auf Vue-3-App-Konzept und dynamische Komponenten prüfen |
| `Sign.vue` | 4 | klein, aber sicherheitskritisch; Prop-Mutation und Signierfluss früh absichern |
| `MultiSignSetup.vue` | 5 | mittlere Komplexität, nutzt `Sign.vue`; gute Validierung für Props/Events |
| `TxSign.vue` | 6 | Decode-, AccountInfo- und Signierflow; abhängig von `Sign.vue` |
| `TxCombine.vue` | 7 | komplexe Computed-Logik für Signer/Quorum; nach Testaufbau migrieren |
| `TxCompose.vue` | 8 | größte und komplexeste Komponente; viele UI-Zustände und XRPL-Aufrufe |
| `env.js` | 9 | globaler Zustand; kann zunächst kompatibel bleiben und später in Store/Composable überführt werden |

Aufwand:

- `Home`: < 0,5 Tage.
- `Header`/`App`: 1-2 Tage.
- `Sign`/`MultiSignSetup`: 2-4 Tage.
- `TxSign`/`TxCombine`: 3-6 Tage.
- `TxCompose`: 5-10 Tage.

Rückfallstrategie: Options API zunächst beibehalten; Composition API ist kein Muss für die Migration.

### Phase 8: Breaking Changes gezielt beheben

Erwartete Breaking Changes:

1. **Global API**: `Vue.use`, `Vue.prototype` und `new Vue()` müssen auf `createApp`, `app.use` und `app.config.globalProperties` umgestellt werden.
2. **Plugin-Kompatibilität**: Vue-2-Plugins wie `vue-clipboard2` können nicht unverändert funktionieren.
3. **`v-model` auf Custom Components**: Bei Custom Components gelten in Vue 3 neue Prop-/Event-Namen (`modelValue`, `update:modelValue`).
4. **Event- und Attr-Fallthrough**: Komponenten mit mehreren Root-Elementen oder implizitem Attribut-Fallthrough müssen geprüft werden.
5. **Compiler und SFC-Verarbeitung**: `vue-template-compiler` wird durch `@vue/compiler-sfc` ersetzt.
6. **Browser-/Node-Globals**: `Buffer` wird im Browser-Code genutzt. Vite polyfillt Node-Globals nicht automatisch.
7. **`keep-alive` / dynamische Komponenten**: Verhalten in `App.vue` muss im Vue-3-Build geprüft werden.

Aufwand: mittel bis groß, 5-15 Tage.  
Rückfallstrategie: `@vue/compat` mit komponentenweiser Konfiguration nutzen; Compat erst entfernen, wenn Build, Lint und Smoke-Flows sauber laufen.

### Phase 9: Vite finalisieren

Schritte:

1. `package.json`-Skripte ersetzen:
   - `serve` → `dev` oder Alias auf `vite`
   - `build` → `vite build`
   - `preview` → `vite preview`
   - `lint` separat über ESLint CLI
2. `vue.config.js` entfernen.
3. `babel.config.js` entfernen oder auf Sonderfälle reduzieren.
4. `public/index.html` nach Vite-Konvention in Root-`index.html` überführen.
5. `build.sh` aktualisieren.
6. Asset-Pfade prüfen, insbesondere `icons/bg-000000-icon.png`.
7. Browser-Ziel definieren.
8. Optional `@vitejs/plugin-legacy` prüfen.

Aufwand: mittel, 3-7 Tage.  
Risiken: Vite verwendet native ESM und andere Import-/Asset-Regeln; `publicPath: ''` aus Vue CLI muss als Vite-`base` abgebildet werden.  
Rückfallstrategie: Vue CLI Build bis zum finalen Cut parallel lauffähig halten und bei Pfadproblemen `base: './'` testen.

### Phase 10: Nachmigration und Cleanup

Schritte:

1. `@vue/compat` entfernen.
2. Alle Compat-Warnungen geschlossen dokumentieren.
3. Lockfile neu erzeugen.
4. CI auf aktuelle Node-LTS-Version setzen.
5. Security Audit mit aktuellem npm ausführen.
6. Bundle analysieren.
7. Manuelle und automatisierte Regressionstests durchführen.

Aufwand: mittel, 3-6 Tage.  
Rückfallstrategie: letzter Compat-Build bleibt als Tag/Branch verfügbar; Lockfile-Änderung separat reviewen.

## Risiken

| Risiko | Schwere | Wahrscheinlichkeit | Gegenmaßnahme |
| --- | --- | --- | --- |
| XRPL-/Ripple-Pakete benötigen Node-Polyfills | Hoch | Mittel | früh in Vite-Prototyp testen |
| `node-sass` blockiert Installation | Hoch | Hoch | zuerst durch `sass` ersetzen |
| Vue-2-Plugins nicht kompatibel | Hoch | Hoch | Plugins durch Vue-3-kompatible Wrapper ersetzen |
| Signing-Flow regressiert | Sehr hoch | Mittel | Fixtures und manuelle Smoke-Tests vor Migration |
| `Buffer` fehlt im Browser | Hoch | Hoch | browsernative Encoding-Utilities oder Polyfill |
| Build-Output funktioniert nicht lokal als ZIP | Hoch | Mittel | `base: './'` und File-/HTTP-Smoke-Test |
| CodeMirror-Migration verändert Editorverhalten | Mittel | Mittel | Editor-Wrapper und manuelle Tests |
| JSON-Viewer zeigt Daten anders an | Mittel | Mittel | Snapshot-/DOM-Tests |
| Bootstrap-Update verursacht Layout-Regressions | Mittel | Mittel | Bootstrap zunächst nicht migrieren |
| Big-Bang-PR zu groß | Hoch | Hoch | Phasen als getrennte PRs durchführen |

## Aufwandsschätzung gesamt

| Phase | Aufwand |
| --- | ---: |
| Phase 0: Baseline | 1-4 Tage |
| Phase 1: Tests | 3-7 Tage |
| Phase 2: Sass-Tooling | 1-3 Tage |
| Phase 3: Vue 2.7 Zwischenstation | 1-3 Tage |
| Phase 4: Vite-Grundgerüst | 3-6 Tage |
| Phase 5: Vue 3 Compat | 4-10 Tage |
| Phase 6: Bibliotheken ersetzen | 5-12 Tage |
| Phase 7: Komponentenmigration | 12-30 Tage |
| Phase 8: Breaking Changes | 5-15 Tage |
| Phase 9: Vite finalisieren | 3-7 Tage |
| Phase 10: Cleanup | 3-6 Tage |

Realistische Gesamtschätzung: **6-12 Wochen** bei einer Person, abhängig von XRPL-Bibliothekskompatibilität, Testtiefe und UI-Bibliotheksersatz.

## Rückfallstrategie

1. **Baseline Tag**: Vor Start der Migration einen Tag auf dem unveränderten Vue-2-Stand setzen.
2. **Phasen-Branches**: Jede Phase als eigener Branch/PR.
3. **Dual Build Window**: Vue CLI und Vite kurzzeitig parallel halten, bis Vite alle Smoke-Tests besteht.
4. **Compat Window**: `@vue/compat` nutzen, aber mit Zieltermin für Entfernung.
5. **Feature Freeze für Signing-Logik**: Während der Migration keine fachlichen Änderungen an Signatur- und Combine-Logik.
6. **Release-Rollback**: Letztes Vue-2-Release als Download verfügbar halten.

## Empfohlene PR-Aufteilung

1. Baseline und Dokumentation.
2. Test-Fixtures.
3. Sass-Migration.
4. Vue 2.7 / Dependency Cleanup.
5. Vite-Prototyp.
6. Vue 3 Compat.
7. Plugin-/UI-Bibliotheken ersetzen.
8. Komponentenmigration niedriges Risiko: `Home`, `Header`, `App`.
9. Signierkomponenten: `Sign`, `MultiSignSetup`.
10. Transaktionsflows: `TxSign`, `TxCombine`, `TxCompose`.
11. Compat entfernen.
12. Vite finalisieren.

## Definition of Done

Die Migration gilt als abgeschlossen, wenn:

- Die App mit Vue 3 ohne `@vue/compat` läuft.
- Der Build über Vite erfolgt.
- Vue CLI, Webpack-spezifische Konfiguration, `node-sass`, `sass-loader`, `vue-template-compiler` und `babel-eslint` entfernt sind.
- Build, Lint und Tests in CI erfolgreich laufen.
- Die ZIP-/Local-Distribution funktioniert.
- LIVE/TEST-Verbindung funktioniert.
- Compose-, Sign-, Combine- und MultiSignSetup-Flows bestehen Smoke-Tests.
- Keine bekannten Vue-3-Compat-Warnungen verbleiben.
- XRPL-Encoding, Signing und Combine sind durch Fixtures abgesichert.
