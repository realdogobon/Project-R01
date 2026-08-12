RoyScript TSR
=============

A full-stack, AI-powered typing suite and document intelligence platform.

Dedicated to Trinita Sinha Roy — built from the ground up to solve the real problems she faced as a student, every feature in this application exists because of something she needed and could not find in a single place.

---

The Origin
----------

Trinita is a student. Like every serious student, she types — a lot. Practice passages, study notes, scanned handouts, examination transcripts. Over time a pattern of friction emerged: typing tools were generic and shallow, document scanners were locked behind paywalls or produced dirty output, AI text generation was scattered across separate products, and nothing talked to anything else.

RoyScript TSR was built to collapse all of that into one coherent, offline-capable, locally-run workspace. No subscriptions. No accounts on third-party platforms. No data leaving the machine unless the user explicitly calls an AI API. Just a sharp, precise tool that does exactly what a serious student or professional needs.

The name TSR stands for Trinita Sinha Roy. This application is a gift.

---

What RoyScript TSR Does
-----------------------

RoyScript TSR is organized around three interconnected disciplines: typing practice and examination, AI-assisted document scanning and OCR, and rich text document authoring. Each of these areas is deep and fully featured, not bolted on.


Typing Practice Mode

The practice engine is the core of the application. It is built on a custom TypingEngine class that handles all keystroke processing, character-level accuracy tracking, word navigation, animated cursor positioning, and live metrics entirely in memory with zero input lag.

Practice can be configured in four modes:

- Words mode: type a defined number of words drawn from a curated English dictionary, split into easy (five characters or fewer) and hard (six characters or more) pools.
- Time mode: type continuously for a set duration. The engine generates enough words to fill the session comfortably.
- Quote mode: type a randomly selected real quotation from a built-in quotes database, at easy or hard length.
- Zen mode: open-ended, no constraints, no timer.

Every session captures words-per-minute, accuracy, elapsed time, a second-by-second WPM history graph, and a full replay event log so results can be reviewed in detail.

AI Text Generation: When the built-in word pool is not enough, the practice engine connects to the server-side AI pipeline to generate custom domain-specific passages. Supported categories include Legal and Court Matters, Medical and Healthcare, Code and Technical, and General Narrative. Each category can be generated at four difficulty tiers — Beginner, Intermediate, Advanced, and Professional — each with precise instructions to the model about vocabulary complexity, use of numbers, symbols, brackets, and domain terminology. Three length targets are available: short (approximately 150 to 200 words), medium (approximately 350 to 400 words), and long (approximately 750 to 800 words). The server maintains a rotating key pool across Google Gemini, Groq, and OpenAI, attempting each provider in turn and falling back gracefully.

Strict Mode: For users who want to enforce discipline, Strict Mode adds a layer of hard constraints on top of any session:

- Backspace can be disabled entirely, forcing the typist to commit to every keystroke.
- A minimum WPM floor can be set; falling below it terminates the session immediately.
- A minimum accuracy threshold can be set; dropping below it ends the test.
- A maximum error count can be set as an absolute ceiling.
- An inactivity timeout terminates the session if the typist stops typing for more than a configured number of seconds.
- Sudden Death mode allows zero errors. A single typo ends everything.

Calibration Drills: After a practice session, the engine identifies which specific keys produced the most errors. A calibration drill can be launched automatically, generating a passage constructed to maximize repetition of those exact problem keys, drawn from both the quotes database and the dictionary.

Session Recovery: If the browser is closed or the tab crashes mid-session, the engine state is serialized to localStorage continuously. On the next visit, the user is offered a full recovery of the interrupted session — same word index, same elapsed time, same character history, same cursor position — as if the interruption never happened.

Sound Engine: Every keystroke can have a sound. The sound engine ships with over twenty mechanical keyboard switch profiles including Cherry MX Blue, Cherry MX Brown, Cherry MX Black, Akko Lavenders, Kailh Box White, Razer Green, Tealios V2, and many others. Four distinct error sound profiles are available separately. Sounds are loaded from the MonkeyType CDN and played through the Web Audio API with per-sample randomization for realism.

Keyboard Visualizer: An on-screen keyboard renders in real time as the user types, with per-key backlight animation. Two hardware models are available: a Classic layout and a Das Keyboard 4 layout. The keyboard theme automatically pairs with the selected color theme unless manually overridden.

Ambient Sound: A background ambient mix system allows layering of environmental sounds — rain, celestial tones, forest — at individually controlled volumes. Custom mixes can be saved and recalled by name.


Exam Mode

Exam Mode is a formal, controlled typing test designed to mirror real examination conditions. It is a separate environment from Practice Mode with its own strict behavioral rules.

Before the test begins, a configuration wizard allows the user to set the exact duration using hours, minutes, and seconds inputs, with quick presets at fifteen, thirty, forty-five, and sixty minutes. The timer can be adjusted by scrolling the mouse wheel or using the arrow keys on any digit.

A rules carousel then walks the user through five examination rules before the countdown begins. The rules can be permanently dismissed by checking a preference.

Exam rules enforced by the application:

- No pause is possible once the test starts. The clock runs continuously.
- The test stops automatically the instant the timer reaches zero.
- Leaving full screen or navigating away triggers warnings.
- Results are sealed and persisted immediately on completion. They cannot be modified.
- A brief silent countdown precedes the start to allow the user to settle.


Document Scanner

The Document Scanner is a resizable, multi-page modal interface that handles both images and PDFs. It is designed for students and professionals who routinely deal with physical documents — handouts, textbooks, printed notes, identity cards — and need the text extracted cleanly and quickly.

Image processing is performed client-side using OpenCV compiled to WebAssembly. The available image processing modes are:

- Black and White: converts the image to greyscale, applies Gaussian blur to reduce noise, then runs adaptive Gaussian thresholding to produce a high-contrast binary image. This is the most effective mode for printed text.
- Greyscale: converts to greyscale with blur normalization, preserving tonal gradation.
- Color: preserves the original color channels for documents where color carries meaning.

The scanner interface includes zoom, pan, and precision crop using a freehand crop tool. A crop queue allows multiple zones to be queued from a single document before extraction begins.

Specialized scan modes extend the standard pipeline:

- Book Spread mode: applies a dewarping algorithm to correct the page curvature that appears when a physical book is photographed flat. The two resulting pages are processed independently.
- ID Card mode: guides the user through capturing the front and back of an identity card separately, then splices them into a single combined output image.
- Handwriting Eraser mode: uses a configurable tolerance slider to detect and remove handwritten annotations from a printed document, recovering the clean underlying text.
- QR Code detection: automatically detects and decodes any QR codes present in the scanned image.

Once the image is processed, OCR extraction is performed server-side via the AI pipeline. Three extraction methods are available:

- Precise: instructs the model to reproduce every word, letter, punctuation mark, line break, and paragraph structure exactly as it appears in the source document. Shorthand, handwriting, and stenography are translated to their plaintext equivalents.
- Clean: instructs the model to extract only the primary reading content, discarding page numbers, headers, footers, watermarks, stray marks, and broken sentences, then reformats the result into clean readable paragraphs.
- Custom: the user provides their own extraction instructions in plain language, and the model follows them exactly.

Zone-specific extraction allows the user to restrict OCR to a named region of the document: the top half, the bottom half, or the opening paragraphs only, without needing to crop manually.

The OCR pipeline uses the same multi-provider, rotating key pool as the text generation system, attempting Gemini vision models first, then falling back to Groq and OpenAI vision. A dual-brain post-processing step runs a second model pass to refine and clean the initial extraction output before returning it to the interface.


Scanned Document Library and RAG Search

Every extracted document is ingested into a local document library backed by a Fuse.js fuzzy search index. Documents are tagged, titled, and stored in localStorage scoped to the active user account. The search engine indexes document titles, full content, and tags simultaneously with configurable field weighting, allowing retrieval by partial keyword, topic, or tag in milliseconds.

Operations on the library include creation, full-text editing, tag management, deletion, and bulk export.


Export Engine

Extracted and edited documents can be exported in four formats:

- PDF: generates a properly paginated PDF document with configurable watermark support, rendered using pdf-lib.
- DOCX: produces a Microsoft Word compatible document using the docx library, preserving title and body structure.
- CSV: parses table-formatted content delimited by pipe characters and exports a properly quoted CSV file compatible with Microsoft Excel and Google Sheets.
- ZIP Archive: bundles the full document library into a ZIP file containing all raw text files and a single unified PDF report, packaged with JSZip.


Workspace and Rich Text Editor

The Workspace is a full document authoring environment built on Lexical, a high-performance rich text engine developed by Meta. The implementation uses the lexkit layer, which extends Lexical with a command palette, custom toolbar components, and a default document template.

Documents authored in the Workspace are saved to the user account's file library and can be reopened, edited, renamed, and deleted. The LibraryHub panel provides a visual browser for the file collection. Any document open in the editor can be sent directly to Practice Mode as the typing passage, allowing the user to practice on their own notes.


Translation

The server exposes a translation endpoint that accepts any text and a target language, routes the request through the AI provider pool, and returns a translated result. The translation feature is available directly from the document viewer.

---

Who Benefits Most
-----------------

RoyScript TSR was designed with a specific user in mind, but the problems it solves are shared by a broad population.

Students preparing for competitive examinations, civil services tests, or professional certification exams that include typing components will find the Exam Mode, Strict Mode, and calibration drill system directly applicable to their preparation regimen.

Students in fields that involve dense reading material — law, medicine, engineering, the sciences — benefit from the AI-powered passage generation in their domain. Practicing on legal briefs, medical case notes, and technical documentation builds not only speed but domain-specific muscle memory.

Students who work from physical handouts, printed lecture notes, or textbooks will find the Document Scanner and OCR pipeline saves significant time compared to manual transcription. The handwriting eraser mode is particularly useful for annotated course materials.

Court reporters, legal transcriptionists, medical transcriptionists, and data entry professionals who rely on high sustained WPM with strict accuracy tolerances will find the configurable Strict Mode constraints map closely to their professional requirements.

Writers, researchers, and knowledge workers who accumulate documents over time benefit from the scanned document library and its fuzzy search — a lightweight personal knowledge base that surfaces information by keyword without external infrastructure.

Educators and trainers who conduct typing assessments can use Exam Mode to administer controlled, time-bound tests with sealed, tamper-proof results.

---

Technical Architecture
----------------------

RoyScript TSR is a full-stack TypeScript application with a clear separation between the React frontend and the Express backend.

The frontend is built with React 19 and compiled by Vite with Tailwind CSS version 4 for styling. Animation is handled by Motion (Framer Motion version 12). Data visualization uses Recharts for the WPM history graph. The rich text editor is built on Lexical through the lexkit abstraction layer. Image manipulation uses OpenCV compiled to WebAssembly via a CDN-hosted script. PDF rendering in the scanner uses pdfjs-dist.

The backend is an Express server running under tsx for TypeScript execution without a compilation step in development. It manages three API endpoints: AI text generation, OCR extraction, and translation. Each endpoint routes through a KeyPool class that manages multiple API keys per provider — Gemini, Groq, and OpenAI — with round-robin rotation and sequential retry on failure. The server also serves the compiled frontend in production.

All user data — accounts, sessions, files, scanned documents, settings — is stored in the browser's localStorage. There is no database and no remote user data storage. The application runs entirely locally once started. The only outbound network calls are to the AI provider APIs when generation, OCR, or translation features are used.

The application ships as a Progressive Web App with a service worker and a web manifest, allowing it to be installed to the desktop or home screen and used offline for all features that do not require AI API calls.

---

Running the Application Locally
--------------------------------

Prerequisites

- Node.js version 18 or later
- npm version 9 or later
- At least one AI provider API key: Google Gemini, Groq, or OpenAI. Gemini is recommended and has a free tier sufficient for typical usage.

Obtaining a Gemini API key: visit https://aistudio.google.com/app/apikey, sign in with a Google account, and generate a new key. The free tier allows a generous number of requests per day with no billing setup required.

Step one: Clone the repository.

    git clone https://github.com/jasonatreplit04/royscript-tsr.git
    cd royscript-tsr

Step two: Install dependencies.

    npm install

Step three: Configure environment variables. Create a file named .env in the project root with the following content, replacing the placeholder with your actual key:

    GEMINI_API_KEY=your_gemini_api_key_here

If you have keys for multiple providers, they can all be specified:

    GEMINI_API_KEY=your_gemini_key
    GROQ_API_KEY=your_groq_key
    OPENAI_API_KEY=your_openai_key

Multiple keys for the same provider can be supplied as a comma-separated list using the plural variable name:

    GEMINI_API_KEYS=key_one,key_two,key_three

The application will rotate through all supplied keys automatically. If no keys are configured, all local features — typing practice with the built-in word engine, the document editor, and all export functions — remain fully available. Only AI text generation, OCR, and translation require a key.

Step four: Start the development server.

    npm run dev

The application will be available at http://localhost:5000.

The server serves both the Express API and the Vite-compiled frontend from the same port. In development, Vite runs in middleware mode and handles hot module replacement automatically.

Step five: Create an account. On first visit, click the account icon and register with an email address and password. All credentials are stored locally and never transmitted anywhere. Alternatively, use the application without an account — guest sessions support most features except file and session persistence tied to a named profile.

---

Environment Variable Reference
--------------------------------

    GEMINI_API_KEY         Single Google Gemini API key
    GEMINI_API_KEYS        Comma-separated list of Gemini keys for rotation
    GROQ_API_KEY           Single Groq API key
    GROQ_API_KEYS          Comma-separated list of Groq keys for rotation
    OPENAI_API_KEY         Single OpenAI API key
    OPENAI_API_KEYS        Comma-separated list of OpenAI keys for rotation
    SESSION_SECRET         Secret used for session signing (set automatically on Replit)

---

Building for Production
------------------------

To compile the frontend and bundle the backend for production deployment:

    npm run build

This runs Vite to compile and chunk the React application into the dist directory, then uses esbuild to bundle server.ts into a CommonJS module at dist/server.cjs.

To start the production build:

    npm start

The production server runs on port 5000 by default and serves the compiled frontend statically.

---

Project Structure
-----------------

    server.ts                  Express server, API endpoints, key pool management
    src/
      main.tsx                 Application entry point
      App.tsx                  Root component and routing
      pages/
        PracticeMode.tsx       Typing practice and results interface
        ExamMode.tsx           Timed examination mode and wizard
        Workspace.tsx          Document editor and file library
      components/
        DocumentScannerModal   Multi-page scanner, crop, and OCR interface
        keyboard/              Classic and Das Keyboard 4 visualizer components
        lexkit/                Lexical editor integration and command palette
        typing/                TypingScreen and SessionRecoveryOverlay
        modals/                Auth and Settings modals
      contexts/
        AuthContext.tsx         User accounts, sessions, files — all auth state
        SettingsContext.tsx     Themes, fonts, sound, ambient, keyboard preferences
      lib/
        typing-engine.ts        Core keystroke engine, metrics, cursor, scroll
        word-engine.ts          Word pool, quote selection, calibration drill generation
        ScannerEngine.ts        OpenCV WASM image processing pipeline
        ScannerProEngine.ts     Book dewarp, ID card splice, handwriting eraser
        ExportEngine.ts         PDF, DOCX, CSV, and ZIP export
        rag-search.ts           Fuse.js document indexing and fuzzy search
      hooks/
        useSoundEngine.ts       Web Audio API keyboard sound playback
        useAmbientEngine.ts     Background ambient mix system
        useResizable.ts         Resizable panel utility
      constants/
        themes.ts               MonkeyType theme and font definitions
      assets/
        english_words.json      Curated English word dictionary
        quotes.json             Quotation database for quote mode
    public/
      sw.js                    Service worker for PWA offline support
      manifest.json            Web app manifest for installability

---

License
-------

This project is private and personal. It was built as a gift. Please respect that.
