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

1.  Öffne die `index.html`-Datei in deinem Webbrowser.
2.  Wähle ein Level aus, mit dem du beginnen möchtest.
3.  Schau auf den Buchstaben oder das Wort, das im Anzeigebereich erscheint.
4.  Drücke die entsprechende Taste auf deiner Tastatur. Die virtuelle Tastatur auf dem Bildschirm hilft dir dabei, die richtige Taste und den richtigen Finger zu finden.
5.  Versuche, so genau und schnell wie möglich zu tippen, um zum nächsten Level zu gelangen!

## Installation

Es ist keine Installation erforderlich. Lade einfach die Projektdateien herunter und öffne die `index.html` in einem modernen Webbrowser, um loszulegen.

---

## Running a Simple Python Webserver for Local Testing

To serve this project locally (for example, to test in your browser), you can use Python's built-in HTTP server. Run the following command in your project directory:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000) in your browser.

## Audio-Generierung: Konfiguration & Ausführung

Mit dem Skript [`generate-audio.js`](generate-audio.js:1) kannst du automatisch Audiodateien für alle Wörter in den JSON-Daten generieren lassen. Folge diesen Schritten, um die Audio-Generierung korrekt einzurichten und auszuführen:

### 1. Voraussetzungen

- **Node.js**: Version 18 oder höher wird empfohlen.
- **Abhängigkeiten installieren**: Führe im Projektverzeichnis `npm install` aus, um alle benötigten Pakete zu installieren.

### 2. TTS-Anbieter & Stimme konfigurieren

Das Projekt unterstützt verschiedene Text-to-Speech-Anbieter (TTS) für die Audioausgabe. Die Auswahl und Konfiguration erfolgt über Umgebungsvariablen oder eine optionale `config.json`.

#### Anbieter wählen

Setze die Umgebungsvariable `TTS_PROVIDER` auf einen der folgenden Werte:

- `elevenlabs`
- `openai`

#### Stimme (Voice) wählen

Du kannst die gewünschte Stimme für beide Anbieter konfigurieren:

- **Für OpenAI:** Setze `OPENAI_VOICE` (z.B. `"shimmer"` für Deutsch, `"alloy"` für Englisch).
- **Für ElevenLabs:** Setze `ELEVENLABS_VOICE` (Voice-ID, z.B. `"NBqeXKdZHweef6y0B67V"`).

Die Variablen können in einer `.env`-Datei **oder** in einer `config.json` gesetzt werden. Werte aus `config.json` überschreiben die `.env`, falls beide vorhanden sind.

##### Beispiel `.env`:

```
TTS_PROVIDER=elevenlabs
XI_API_KEY=dein-elevenlabs-api-key
OPENAI_API_KEY=dein-openai-api-key
OPENAI_VOICE=shimmer
ELEVENLABS_VOICE=NBqeXKdZHweef6y0B67V
```

##### Beispiel `config.json`:

```json
{
  "TTS_PROVIDER": "openai",
  "XI_API_KEY": "dein-elevenlabs-api-key",
  "OPENAI_API_KEY": "dein-openai-api-key",
  "OPENAI_VOICE": "shimmer",
  "ELEVENLABS_VOICE": "NBqeXKdZHweef6y0B67V"
}
```

> **Hinweis:**
> - Für **OpenAI**: Stimmen wie `"shimmer"` oder `"onyx"` unterstützen Deutsch. Siehe die [OpenAI TTS-Dokumentation](https://platform.openai.com/docs/guides/text-to-speech/voice-options) für eine vollständige Liste.
> - Für **ElevenLabs**: Die Voice-ID bestimmt die Stimme und Sprache. Siehe das ElevenLabs-Dashboard für verfügbare Stimmen und deren IDs.

#### Benötigte Umgebungsvariablen

- **ElevenLabs:** `XI_API_KEY`, `ELEVENLABS_VOICE` (optional, sonst Standard)
- **OpenAI:** `OPENAI_API_KEY`, `OPENAI_VOICE` (optional, sonst Standard)
- Immer: `TTS_PROVIDER` (entweder `elevenlabs` oder `openai`)

Stimmen-Variablen sind optional. Wird keine gesetzt, wird eine Standardstimme verwendet.

### 3. Skript ausführen

Führe im Projektverzeichnis folgenden Befehl aus:

```
node generate-audio.js
```

### 4. Was macht das Skript?

- Liest alle JSON-Dateien im Verzeichnis `data/` aus.
- Extrahiert alle Wörter und generiert für jedes Wort eine Audiodatei (`.mp3`) im Verzeichnis `audio/`.
- Verwendet den gewählten TTS-Anbieter (ElevenLabs oder OpenAI) und die konfigurierte Stimme zur Sprachausgabe.
- Überspringt Wörter, für die bereits eine Audiodatei existiert.

### 5. Hinweise & Fehlerbehebung

- Stelle sicher, dass die API-Schlüssel und ggf. Voice-IDs korrekt gesetzt und gültig sind.
- Das Skript bricht ab, wenn keine Verbindung zum TTS-Anbieter hergestellt werden kann oder die Datenverzeichnisse fehlen.
- Bei Problemen prüfe die Konsolenausgabe auf Fehlermeldungen (z.B. fehlende API-Keys, ungültige JSON-Dateien, fehlende Verzeichnisse).
- Die Generierung kann je nach Anzahl der Wörter und Geschwindigkeit des TTS-Anbieters einige Zeit dauern.

---

Viel Spaß beim Tippen lernen! 🐘