

import { useEffect } from "react";
import Workspace from "./pages/Workspace";
import { AuthProvider } from "./contexts/AuthContext";
import { SettingsProvider } from "./contexts/SettingsContext";

export default function App() {
  useEffect(() => {
    const t = setTimeout(() => {
      const urls: string[] = [
        "/sound.ogg",
        "/fahhhhh.mp3",
        "/manifest.json",
        "/times-up.png",
        "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap",
        "https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;700&display=swap",
        "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap",
        "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&display=swap",
        "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;700&display=swap",
        "https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;700&display=swap",
        "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap"
      ];

      const cdnBase = "https://cdn.jsdelivr.net/gh/monkeytypegame/monkeytype@master/frontend/static/sounds";
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
        { id: "4", samples: 2, type: "error" }
      ];

      soundConfigs.forEach(config => {
        for (let i = 1; i <= config.samples; i++) {
          urls.push(`${cdnBase}/${config.type}${config.id}/${i}.wav`);
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


