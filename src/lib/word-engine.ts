interface Quote {
  text: string;
  from?: string;
  author?: string;
  source?: string;
}

const FALLBACK_WORDS = ["the", "be", "to", "of", "and", "a", "in", "that", "have", "i", "it", "for", "not", "on", "with", "he", "as", "you", "do", "at", "this", "but", "his", "by", "from", "they", "we", "say", "her", "she", "or", "an", "will", "my", "one", "all", "would", "there", "their", "what", "so", "up", "out", "if", "about", "who", "get", "which", "go", "me"];

const FALLBACK_QUOTES: Quote[] = [
  { text: "The quick brown fox jumps over the lazy dog.", author: "Traditional" },
  { text: "To be or not to be, that is the question.", author: "Shakespeare" },
  { text: "All that glitters is not gold.", author: "Shakespeare" }
];

const FILE_MAPPING: Record<string, string> = {
  english: "en_core",
  english_1k: "en_novice",
  english_5k: "en_intermediate",
  english_10k: "en_pro",
  english_25k: "en_elite",
  english_450k: "en_max",
  english_commonly_misspelled: "en_err",
  english_contractions: "en_contract",
  english_doubleletter: "en_twin",
  english_legal: "en_law",
  english_medical: "en_med",
  english_old: "en_vintage",
  english_shakespearean: "en_bard",
  hindi_shabda: "hi_shabda",
  hinglish_baat: "hinglish_baat",
  sanskrit_mantra: "sa_mantra",
  bengali_shobdo: "bn_shobdo",
  marathi_shabda: "mr_shabda",
  telugu_pada: "te_pada",
  tamil_varta: "ta_varta"
};

const customDictionaries: Record<string, {
    all: string[];
    easy: string[];
    hard: string[];
}> = {};

let customQuotesData: Quote[] | null = null;

export class WordEngine {
    static async loadDictionary(name: string) {
        if (customDictionaries[name]) return;
        try {
            const fileName = FILE_MAPPING[name] || name;
            const res = await fetch(`/assets/languages/${fileName}.json`);
            let words = [];
            if (res.ok) {
                const data = await res.json();
                if (data.words) {
                    words = data.words;
                } else if (Array.isArray(data)) {
                    words = data;
                }
            } else {
                words = FALLBACK_WORDS;
            }
            
            const isEnglish = name.startsWith("english");
            const allDictWords = words.map((w: string) => {
                const cleaned = w.trim().toLowerCase();
                if (isEnglish) {
                    return cleaned.replace(/[^a-z]/g, '');
                }
                return cleaned.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'0-9]/g, "");
            }).filter(Boolean);
            const easyDictWords = allDictWords.filter((w: string) => w.length > 0 && w.length <= 5);
            const hardDictWords = allDictWords.filter((w: string) => w.length > 5);
            
            customDictionaries[name] = {
                all: allDictWords,
                easy: easyDictWords,
                hard: hardDictWords,
            };
        } catch (e) {
            console.error(e);
            customDictionaries[name] = {
                all: FALLBACK_WORDS,
                easy: FALLBACK_WORDS.filter((w: string) => w.length > 0 && w.length <= 5),
                hard: FALLBACK_WORDS.filter((w: string) => w.length > 5),
            };
        }
    }

    static async loadQuotes() {
        if (customQuotesData) return;
        try {
            const res = await fetch(`/assets/languages/en_passages.json`);
            if (res.ok) {
                const data = await res.json();
                customQuotesData = data.quotes || data.groups?.[0] || data || FALLBACK_QUOTES;
            } else {
                customQuotesData = FALLBACK_QUOTES;
            }
        } catch (e) {
            console.error(e);
            customQuotesData = FALLBACK_QUOTES;
        }
    }

    static generateReferenceText(
        mode: "time" | "words",
        timeVal: number,
        wordsVal: number,
        punct: boolean,
        nums: boolean,
        diff: "easy" | "hard",
        lang: string = "english"
    ): string {
        const dict = customDictionaries[lang] || customDictionaries["english"] || { all: FALLBACK_WORDS, easy: FALLBACK_WORDS, hard: FALLBACK_WORDS };
        
        let pool = diff === 'easy' ? dict.easy : dict.hard;
        if (!pool || pool.length === 0) pool = dict.all;
        if (!pool || pool.length === 0) pool = FALLBACK_WORDS;

        const targetCount = mode === "words" ? wordsVal : (timeVal === 15 ? 30 : timeVal === 30 ? 60 : timeVal === 60 ? 120 : 200);
        
        const chosenWords: string[] = [];
        for (let i = 0; i < targetCount; i++) {
            let word = pool[Math.floor(Math.random() * pool.length)];
            if (!word) word = "the";
            if (punct && Math.random() < 0.1) {
                word = word.charAt(0).toUpperCase() + word.slice(1);
            }
            if (punct && Math.random() < 0.15) {
                const puncts = [',', '.', '?', '!', ';'];
                word += puncts[Math.floor(Math.random() * puncts.length)];
            }
            if (nums && Math.random() < 0.1) {
                word = Math.floor(Math.random() * 1000).toString();
                if (punct && Math.random() < 0.1) {
                   word += '.';
                }
            }
            chosenWords.push(word);
        }
        return chosenWords.join(" ");
    }

    static generateCalibrationDrill(problemKeys: string[], count: number = 30): { title: string, text: string } {
        const normalizedKeys = problemKeys.map(k => k.toLowerCase().trim()).filter(Boolean);
        const titleStr = `Calibration Drill: [${problemKeys.join(", ")}]`;
        
        let relatedWords: string[] = [];
        const quotes = customQuotesData || FALLBACK_QUOTES;
        quotes.forEach((q: Quote) => {
            const textWords = q.text.split(/\s+/);
            textWords.forEach(w => {
                const cleaned = w.replace(/[^a-zA-Z]/g, "").toLowerCase();
                const matches = normalizedKeys.some(keyChar => cleaned.includes(keyChar));
                if (matches && cleaned.length > 2) {
                    relatedWords.push(w);
                }
            });
        });
        
        const dict = customDictionaries["english"];
        if (dict?.all) {
            const dictMatches = dict.all.filter(w => { 
                 return normalizedKeys.some(keyChar => w.includes(keyChar));
            }).slice(0, 500);
            relatedWords = relatedWords.concat(dictMatches);
        }

        relatedWords = Array.from(new Set(relatedWords));
        
        if (relatedWords.length < 20) {
            normalizedKeys.forEach(k => {
                relatedWords.push(k + k);
                relatedWords.push(k + "a" + k);
                relatedWords.push(k + "o" + k);
                relatedWords.push("the" + k);
            });
        }

        const chosen: string[] = [];
        for (let i = 0; i < count; i++) {
            const word = relatedWords[Math.floor(Math.random() * relatedWords.length)];
            if (word) {
                chosen.push(word);
            }
        }
        
        return {
            title: titleStr,
            text: chosen.join(" ")
        };
    }

    static generateRandomQuote(diff: "easy" | "hard" = "hard"): { title: string, text: string } {
        let pool = customQuotesData || FALLBACK_QUOTES;
        
        if (diff === "easy") {
            pool = pool.filter((q: Quote) => q.text.length <= 100);
        } else {
            pool = pool.filter((q: Quote) => q.text.length > 100);
        }
        
        if (pool.length === 0) pool = customQuotesData || FALLBACK_QUOTES;
        
        const selected = pool[Math.floor(Math.random() * pool.length)];
        const citation = selected.source || selected.author || selected.from || 'Unknown';
        
        return {
            title: `Quote from ${citation}`,
            text: selected.text.trim()
        };
    }
}
