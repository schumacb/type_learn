# Tastatur-Tiere - Lerne Tippen!

"Tastatur-Tiere" ist eine webbasierte Tipp-Lernanwendung, die speziell für die deutsche Tastatur entwickelt wurde. Sie hilft Benutzern, das Zehnfingersystem auf eine unterhaltsame und interaktive Weise zu erlernen und zu üben.

## Features

- **Verschiedene Schwierigkeitsgrade:** Beginne mit einzelnen Buchstaben und arbeite dich bis zu ganzen Sätzen hoch.
  - Level 0: Einzelne Buchstaben
  - Level 1: Kurze Wörter
  - Level 2: Mittlere Wörter
  - Level 3: Lange Wörter
  - Level 4: Kurze Sätze
  - Level 5: Mittlere Sätze
- **Visuelle Hilfen:** Eine virtuelle Tastatur auf dem Bildschirm zeigt dir genau, welche Taste du als Nächstes drücken musst.
- **Fingerführung:** Eine Legende zeigt an, welcher Finger für welche Tastengruppe zuständig ist, um das korrekte Zehnfingersystem zu fördern.
- **Fortschrittsanzeige:** Verfolge deinen Fortschritt innerhalb eines Levels mit einer visuellen Fortschrittsleiste.
- **Statistiken:** Behalte deine Leistung im Auge mit Zählern für richtige und falsche Anschläge sowie der aktuellen Level-Anzeige.
- **Einfache Bedienung:** Wechsle einfach zwischen den Levels mit den Vor- und Zurück-Buttons oder über ein Dropdown-Menü.

## Spielanleitung

1.  Öffne die Datei `src/index.html` in deinem Webbrowser.
2.  Wähle ein Level aus, mit dem du beginnen möchtest.
3.  Schau auf den Buchstaben oder das Wort, das im Anzeigebereich erscheint.
4.  Drücke die entsprechende Taste auf deiner Tastatur. Die virtuelle Tastatur auf dem Bildschirm hilft dir dabei, die richtige Taste und den richtigen Finger zu finden.
5.  Versuche, so genau und schnell wie möglich zu tippen, um zum nächsten Level zu gelangen!

## Linux Bundles (rpm, deb)

Um eine Linux-Desktop-Anwendung als RPM- oder DEB-Paket zu bauen, verwende den folgenden Befehl im Projektverzeichnis:

```bash
npm run tauri build -- --bundles rpm,deb
```

Das erzeugt die Installationspakete im `src-tauri/target/release/bundle/`-Verzeichnis. Stelle sicher, dass alle Abhängigkeiten für Tauri und das Bauen von nativen Paketen installiert sind (siehe [Tauri Dokumentation](https://tauri.app/v1/guides/getting-started/prerequisites/)).

## Running a Simple Python Webserver for Local Testing

Um das Projekt lokal zu testen, kannst du einen einfachen HTTP-Server mit Python direkt im `src`-Verzeichnis starten. Führe dazu folgende Befehle aus:

```bash
cd src
python3 -m http.server 8000
```

Öffne dann [http://localhost:8000/](http://localhost:8000/) in deinem Browser.

## Audio-Generierung: Konfiguration & Ausführung

Mit dem Skript [`scripts/generate-audio.js`](scripts/generate-audio.js:1) kannst du automatisch Audiodateien für alle Wörter in den JSON-Daten generieren lassen. Folge diesen Schritten, um die Audio-Generierung korrekt einzurichten und auszuführen:

### 1. Voraussetzungen

- **Node.js**: Version 18 oder höher wird empfohlen.
- **Abhängigkeiten installieren**: Führe im Projektverzeichnis `npm install` aus, um alle benötigten Pakete zu installieren.

### 2. TTS-Anbieter & Stimme konfigurieren

Das Projekt unterstützt verschiedene Text-to-Speech-Anbieter (TTS) für die Audioausgabe. Die gesamte Konfiguration erfolgt über eine `.env`-Datei im Projektverzeichnis.

Lege dazu eine Datei mit dem Namen `.env` im Hauptverzeichnis des Projekts an.

##### Beispiel `.env`:

```
# Der gewünschte TTS-Anbieter ("openai" oder "elevenlabs"). Standard ist "elevenlabs".
TTS_PROVIDER=openai

# API-Schlüssel für den gewählten Anbieter
OPENAI_API_KEY=dein-openai-api-key
XI_API_KEY=dein-elevenlabs-api-key

# Die gewünschte Stimme für den jeweiligen Anbieter (optional)
OPENAI_VOICE=shimmer
ELEVENLABS_VOICE=NBqeXKdZHweef6y0B67V
```

> **Hinweis:**
> - Du musst nur den API-Key für den Anbieter angeben, den du in `TTS_PROVIDER` ausgewählt hast.
> - Für **OpenAI**: Eine Liste der verfügbaren Stimmen findest du in der [OpenAI TTS-Dokumentation](https://platform.openai.com/docs/guides/text-to-speech/voice-options).
> - Für **ElevenLabs**: Die Voice-ID bestimmt die Stimme und Sprache. Du findest sie in deinem ElevenLabs-Dashboard.
> - Wenn keine Stimme (`OPENAI_VOICE` oder `ELEVENLABS_VOICE`) angegeben wird, verwendet das Skript eine Standardstimme.

### 3. Skript ausführen

#### Verfügbare Optionen

- `--list-missing-unused` (`-l`): Liste fehlende und unbenutzte Audiodateien.
- `--force` (`-f`): Überschreibe vorhandene Dateien.
- `--help` (`-h`): Zeige diese Hilfe an.

#### Generiere alle Audiodateien

```bash
node scripts/generate-audio.js
```

Standardmäßig werden:
- Unbenutzte Audio-Dateien im Verzeichnis `src/audio/` entfernt.
- Fehlende Audiodateien generiert.
- Dateien übersprungen, wenn sie bereits vorhanden sind.
- Eine maximale Gleichzeitigkeit von 2 verwendet (konfigurierbar über `AUDIO_GEN_CONCURRENCY`).

Du kannst die maximale Gleichzeitigkeit ändern:

```bash
export AUDIO_GEN_CONCURRENCY=5
```

#### Liste fehlende und unbenutzte Audiodateien

```bash
node scripts/generate-audio.js --list-missing-unused
```

oder

```bash
node scripts/generate-audio.js -l
```

#### Einzelne Audio-Datei generieren

```bash
node scripts/generate-audio.js "Dein Text"
```

oder mit benutzerdefiniertem Dateinamen:

```bash
node scripts/generate-audio.js "Dein Text" "custom_name"
```

Mit `--force` oder `-f` wird eine bereits vorhandene Datei überschrieben:

```bash
node scripts/generate-audio.js "Dein Text" --force
node scripts/generate-audio.js "Dein Text" -f
```

#### Hilfe anzeigen

```bash
node scripts/generate-audio.js --help
node scripts/generate-audio.js -h
```
### 4. Was macht das Skript?

- Entfernt unbenutzte Audiodateien im Verzeichnis `src/audio/`.
- Liest alle JSON-Dateien im Verzeichnis `src/data/` aus und sammelt alle Wörter.
- Generiert fehlende Audiodateien (`.mp3`) im Verzeichnis `src/audio/`.
- Verwendet den gewählten TTS-Anbieter (ElevenLabs oder OpenAI) und die konfigurierte Stimme zur Sprachausgabe.
- Überspringt vorhandene Dateien, sofern nicht `--force` gesetzt ist.

### 5. Hinweise & Fehlerbehebung

- Stelle sicher, dass die API-Schlüssel (`OPENAI_API_KEY` oder `XI_API_KEY`) und ggf. Voice-IDs korrekt gesetzt und gültig sind.
- Das Skript bricht ab, wenn keine Verbindung zum TTS-Anbieter hergestellt werden kann oder die erforderlichen Verzeichnisse fehlen.
- Prüfe bei Problemen die Konsolenausgabe auf Fehlermeldungen.
- Die Generierung kann je nach Anzahl der Wörter und Geschwindigkeit des TTS-Anbieters einige Zeit dauern.

---

Viel Spaß beim Tippen lernen! 🐘