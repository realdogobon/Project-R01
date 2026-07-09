import englishWordsRaw from '../assets/english_words.json';
import quotesDataRaw from '../assets/quotes.json';

interface Quote {
  text: string;
  from?: string;
  author?: string;
  source?: string;
}

const englishWords = englishWordsRaw as string[];
const quotesData = (quotesDataRaw as any).quotes as any as Quote[];


let easyDictWords: string[] | null = null;
let hardDictWords: string[] | null = null;
let allDictWords: string[] | null = null;


const initDictCache = () => {
    if (allDictWords) return;

    allDictWords = englishWords.map(w => w.toLowerCase().replace(/[^a-z]/g, '')).filter(Boolean);
    easyDictWords = allDictWords.filter(w => w.length > 0 && w.length <= 5);
    hardDictWords = allDictWords.filter(w => w.length > 5);
};

export class WordEngine {

    static generateReferenceText(
        mode: "time" | "words",
        timeVal: number,
        wordsVal: number,
        punct: boolean,
        nums: boolean,
        diff: "easy" | "hard"
    ): string {
        initDictCache();

        let pool = diff === 'easy' ? easyDictWords! : hardDictWords!;
        if (pool.length === 0) pool = allDictWords!;

        const targetCount = mode === "words" ? wordsVal : (timeVal === 15 ? 30 : timeVal === 30 ? 60 : timeVal === 60 ? 120 : 200);

        const chosenWords: string[] = [];
        for (let i = 0; i < targetCount; i++) {
            let word = pool[Math.floor(Math.random() * pool.length)];


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
        initDictCache();

        const normalizedKeys = problemKeys.map(k => k.toLowerCase().trim()).filter(Boolean);
        const titleStr = `Calibration Drill: [${problemKeys.join(", ")}]`;

        let relatedWords: string[] = [];


        quotesData.forEach(q => {
            const textWords = q.text.split(/\s+/);
            textWords.forEach(w => {
                const cleaned = w.replace(/[^a-zA-Z]/g, "").toLowerCase();
                const matches = normalizedKeys.some(keyChar => cleaned.includes(keyChar));
                if (matches && cleaned.length > 2) {
                    relatedWords.push(w);
                }
            });
        });


        if (allDictWords) {
            const dictMatches = allDictWords.filter(w => {
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
            chosen.push(relatedWords[Math.floor(Math.random() * relatedWords.length)]);
        }

        return {
            title: titleStr,
            text: chosen.join(" ")
        };
    }


    static generateRandomQuote(diff: "easy" | "hard" = "hard"): { title: string, text: string } {
        let pool = quotesData;
        if (diff === "easy") {
            pool = pool.filter(q => q.text.length <= 100);
        } else {
            pool = pool.filter(q => q.text.length > 100);
        }

        if (pool.length === 0) pool = quotesData;

        const selected = pool[Math.floor(Math.random() * pool.length)];
        const citation = selected.source || selected.author || selected.from || 'Unknown';
        return {
            title: `Quote from ${citation}`,
            text: selected.text.trim()
        };
    }
}
