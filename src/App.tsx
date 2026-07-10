

import { useEffect } from "react";
import Workspace from "./pages/Workspace";
import { AuthProvider } from "./contexts/AuthContext";
import { SettingsProvider } from "./contexts/SettingsContext";

export default function App() {
  useEffect(() => {
    const t = setTimeout(() => {
      const urls: string[] = [
        "/assets/sounds/keyboard/error5/1.wav",
        "/manifest.json",
        "/assets/images/times-up.png",
        "/assets/images/CherryMX2ABlue.png",
        "/assets/images/CherryMX2ABrown.png",
        "/assets/images/CherryMX2ARed.png",
        "/assets/fonts/google_fonts.css",
        "/assets/languages/en_core.json",
        "/assets/languages/en_novice.json",
        "/assets/languages/en_intermediate.json",
        "/assets/languages/en_pro.json",
        "/assets/languages/en_elite.json",
        "/assets/languages/en_max.json",
        "/assets/languages/en_err.json",
        "/assets/languages/en_contract.json",
        "/assets/languages/en_twin.json",
        "/assets/languages/en_law.json",
        "/assets/languages/en_med.json",
        "/assets/languages/en_vintage.json",
        "/assets/languages/en_bard.json",
        "/assets/languages/en_passages.json",
        "/assets/languages/hi_shabda.json",
        "/assets/languages/hinglish_baat.json",
        "/assets/languages/sa_mantra.json",
        "/assets/languages/bn_shobdo.json",
        "/assets/languages/mr_shabda.json",
        "/assets/languages/te_pada.json",
        "/assets/languages/ta_varta.json"
      ];

      const localSoundBase = "/assets/sounds/keyboard";
      const soundConfigs = [
        { id: "1", samples: 3, type: "click" },
        { id: "2", samples: 3, type: "click" },
        { id: "3", samples: 3, type: "click" },
        { id: "4", samples: 6, type: "click" },
        { id: "5", samples: 6, type: "click" },
        { id: "6", samples: 3, type: "click" },
        { id: "7", samples: 3, type: "click" },
        { id: "1", samples: 1, type: "error" },
        { id: "2", samples: 1, type: "error" },
        { id: "3", samples: 1, type: "error" },
        { id: "4", samples: 2, type: "error" },
        { id: "5", samples: 1, type: "error" }
      ];

      soundConfigs.forEach(config => {
        for (let i = 1; i <= config.samples; i++) {
          urls.push(`${localSoundBase}/${config.type}${config.id}/${i}.wav`);
        }
      });

      if ("caches" in window) {
        caches.open("ais-assets-cache").then(cache => {
          urls.forEach(url => {
            fetch(url)
              .then(res => {
                if (res.ok) cache.put(url, res);
              })
              .catch(() => {});
          });
        });
      }
    }, 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <SettingsProvider>
      <AuthProvider>
        <Workspace />
      </AuthProvider>
    </SettingsProvider>
  );
}


