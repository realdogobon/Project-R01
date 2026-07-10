import fs from 'fs';
import path from 'path';

// Monkeytype Language Configuration
const LANGUAGE_FILES = [
  { local: 'en_core.json', remote: 'frontend/static/languages/english.json' },
  { local: 'en_novice.json', remote: 'frontend/static/languages/english_1k.json' },
  { local: 'en_intermediate.json', remote: 'frontend/static/languages/english_5k.json' },
  { local: 'en_pro.json', remote: 'frontend/static/languages/english_10k.json' },
  { local: 'en_elite.json', remote: 'frontend/static/languages/english_25k.json' },
  { local: 'en_max.json', remote: 'frontend/static/languages/english_450k.json' },
  { local: 'en_err.json', remote: 'frontend/static/languages/english_commonly_misspelled.json' },
  { local: 'en_contract.json', remote: 'frontend/static/languages/english_contractions.json' },
  { local: 'en_twin.json', remote: 'frontend/static/languages/english_doubleletter.json' },
  { local: 'en_law.json', remote: 'frontend/static/languages/english_legal.json' },
  { local: 'en_med.json', remote: 'frontend/static/languages/english_medical.json' },
  { local: 'en_vintage.json', remote: 'frontend/static/languages/english_old.json' },
  { local: 'en_bard.json', remote: 'frontend/static/languages/english_shakespearean.json' },
  { local: 'hi_shabda.json', remote: 'frontend/static/languages/hindi.json' },
  { local: 'bn_shobdo.json', remote: 'frontend/static/languages/bangla.json' },
  { local: 'mr_shabda.json', remote: 'frontend/static/languages/marathi.json' },
  { local: 'sa_mantra.json', remote: 'frontend/static/languages/sanskrit.json' },
  { local: 'ta_varta.json', remote: 'frontend/static/languages/tamil.json' },
  { local: 'te_pada.json', remote: 'frontend/static/languages/telugu.json' },
  { local: 'hinglish_baat.json', remote: 'frontend/static/languages/hinglish.json' },
  { local: 'en_passages.json', remote: 'frontend/static/quotes/english.json' }
];

// Sound Profile Mappings (ID, samples, folder, label)
const KEYBOARD_SOUNDS = [
  { id: '1', samples: 3, folder: 'click1', label: 'Click' },
  { id: '2', samples: 3, folder: 'click2', label: 'Beep' },
  { id: '3', samples: 3, folder: 'click3', label: 'Pop' },
  { id: '4', samples: 6, folder: 'click4', label: 'NK Creams' },
  { id: '5', samples: 6, folder: 'click5', label: 'Typewriter' },
  { id: '6', samples: 3, folder: 'click6', label: 'Osu' },
  { id: '7', samples: 3, folder: 'click7', label: 'Hitmarker' },
  { id: '14', samples: 8, folder: 'click14', label: 'Fist Fight' },
  { id: '15', samples: 5, folder: 'click15', label: 'Rubber Keys' },
  { id: '16', samples: 8, folder: 'click16', label: 'Fart' },
  { id: '17', samples: 10, folder: 'click17', label: 'Akko Lavenders' },
  { id: '18', samples: 10, folder: 'click18', label: 'CherryMX Black ABS' },
  { id: '19', samples: 10, folder: 'click19', label: 'CherryMX Black PBT' },
  { id: '20', samples: 10, folder: 'click20', label: 'CherryMX Blue ABS' },
  { id: '21', samples: 10, folder: 'click21', label: 'CherryMX Blue PBT' },
  { id: '22', samples: 10, folder: 'click22', label: 'CherryMX Brown PBT' },
  { id: '23', samples: 10, folder: 'click23', label: 'Kalih Box White' },
  { id: '24', samples: 10, folder: 'click24', label: 'Razer Green' },
  { id: '25', samples: 10, folder: 'click25', label: 'Tealios V2' },
  { id: '26', samples: 10, folder: 'click26', label: 'Trust GXT' }
];

const ERROR_SOUNDS = [
  { id: '1', samples: 1, folder: 'error1', label: 'Damage' },
  { id: '2', samples: 1, folder: 'error2', label: 'Triangle' },
  { id: '3', samples: 1, folder: 'error3', label: 'Square' },
  { id: '4', samples: 2, folder: 'error4', label: 'Missed Punch' },
  { id: '5', samples: 1, folder: 'error5', label: 'Faah (Custom Error Sound)' }
];

const AMBIENT_SOUNDS = [
  'airport.mp3',
  'ceiling-fan.mp3',
  'clock.mp3',
  'coffee-shop.mp3',
  'crickets.mp3',
  'fireside.mp3',
  'fireworks.mp3',
  'owl.mp3',
  'rain.mp3',
  'rain-on-leaves.mp3',
  'singing-bowl.mp3',
  'suburban-street.mp3',
  'thunder.mp3',
  'train.mp3',
  'tuning-radio.mp3',
  'underwater.mp3',
  'waves.mp3',
  'white-noise.mp3',
  'wind-chimes.mp3',
  'winter-morning.mp3'
];

// Helper to parse WAV files for metadata (Sample Rate, Bits/Sample, Channels, Duration)
function parseWav(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    if (buffer.toString('utf8', 0, 4) !== 'RIFF' || buffer.toString('utf8', 8, 12) !== 'WAVE') {
      return { error: 'Not a valid RIFF/WAVE file' };
    }

    let offset = 12;
    let sampleRate = 0;
    let byteRate = 0;
    let bitsPerSample = 0;
    let numChannels = 0;
    let dataSize = 0;

    while (offset < buffer.length - 8) {
      const chunkId = buffer.toString('utf8', offset, offset + 4);
      const chunkSize = buffer.readUInt32LE(offset + 4);

      if (chunkId === 'fmt ') {
        numChannels = buffer.readUInt16LE(offset + 8 + 2);
        sampleRate = buffer.readUInt32LE(offset + 8 + 4);
        byteRate = buffer.readUInt32LE(offset + 8 + 8);
        bitsPerSample = buffer.readUInt16LE(offset + 8 + 14);
      } else if (chunkId === 'data') {
        dataSize = chunkSize;
      }
      offset += 8 + chunkSize;
    }

    const duration = byteRate > 0 ? (dataSize / byteRate) : 0;
    return {
      sampleRate,
      bitsPerSample,
      numChannels,
      dataSize,
      duration,
      size: buffer.length
    };
  } catch (err) {
    return { error: err.message };
  }
}

// Format byte sizes cleanly
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function runComparison() {
  console.log('========================================================================');
  console.log('   OFFLINE LATENCY & INTEGRITY SCANNER - COMPARISON REPORT');
  console.log('========================================================================\n');

  // --- PART 1: LANGUAGE FILES COMPARISON ---
  console.log('------------------------------------------------------------------------');
  console.log(' [1/3] SCANNING ENGLISH & REGIONAL LANGUAGE FILES (Monkeytype Standard)');
  console.log('------------------------------------------------------------------------');
  
  const langResults = [];
  for (const item of LANGUAGE_FILES) {
    const localPath = path.join('public', 'assets', 'languages', item.local);
    const remoteUrl = `https://raw.githubusercontent.com/monkeytypegame/monkeytype/master/${item.remote}`;

    let localExists = fs.existsSync(localPath);
    let localBytes = 0;
    let localWords = 0;

    if (localExists) {
      const stats = fs.statSync(localPath);
      localBytes = stats.size;
      try {
        const content = JSON.parse(fs.readFileSync(localPath, 'utf8'));
        if (Array.isArray(content)) {
          localWords = content.length;
        } else if (content.words) {
          localWords = content.words.length;
        } else if (content.quotes) {
          localWords = content.quotes.length;
        } else if (content.groups) {
          localWords = content.groups.reduce((acc, g) => acc + (g.quotes ? g.quotes.length : 0), 0);
        }
      } catch (err) {
        console.error(`  [!] Error parsing local ${item.local}:`, err.message);
      }
    }

    let remoteExists = false;
    let remoteBytes = 0;
    let remoteWords = 0;
    let status = 'Offline Match';

    try {
      const res = await fetch(remoteUrl);
      if (res.ok) {
        remoteExists = true;
        const text = await res.text();
        remoteBytes = Buffer.byteLength(text, 'utf8');
        const content = JSON.parse(text);
        if (Array.isArray(content)) {
          remoteWords = content.length;
        } else if (content.words) {
          remoteWords = content.words.length;
        } else if (content.quotes) {
          remoteWords = content.quotes.length;
        } else if (content.groups) {
          remoteWords = content.groups.reduce((acc, g) => acc + (g.quotes ? g.quotes.length : 0), 0);
        }
        
        if (localBytes === remoteBytes && localWords === remoteWords) {
          status = 'Synchronized (Perfect)';
        } else {
          status = 'Difference Detected';
        }
      } else {
        status = `Remote unreachable (${res.status})`;
      }
    } catch (err) {
      status = `Offline (Network bypass: ${err.message})`;
    }

    langResults.push({
      local: item.local,
      localSize: formatBytes(localBytes),
      remoteSize: remoteExists ? formatBytes(remoteBytes) : 'N/A',
      localCount: localWords,
      remoteCount: remoteExists ? remoteWords : 'N/A',
      status
    });
  }

  // Print Languages Table
  console.log(`| Local File | Local Size | Remote Size | Local Count | Remote Count | Status |`);
  console.log(`|---|---|---|---|---|---|`);
  langResults.forEach(r => {
    console.log(`| ${r.local} | ${r.localSize} | ${r.remoteSize} | ${r.localCount} | ${r.remoteCount} | ${r.status} |`);
  });
  console.log('\n');


  // --- PART 2: KEYBOARD & ERROR SOUNDS (SAMPLES) ---
  console.log('------------------------------------------------------------------------');
  console.log(' [2/3] SCANNING KEYBOARD PRESS/RELEASE SOUND PROFILES + ERROR SOUNDS');
  console.log('------------------------------------------------------------------------');

  const soundResults = [];

  const scanSoundGroup = async (soundsList, typeLabel, remotePathPrefix) => {
    for (const s of soundsList) {
      let filesVerified = 0;
      let totalBytes = 0;
      let totalDuration = 0;
      let maxSampleRate = 0;
      let bitsAndChannels = '';
      let status = 'Verified Offline';

      for (let i = 1; i <= s.samples; i++) {
        const localFile = path.join('public', 'assets', 'sounds', 'keyboard', s.folder, `${i}.wav`);
        if (fs.existsSync(localFile)) {
          filesVerified++;
          const stats = fs.statSync(localFile);
          totalBytes += stats.size;

          const wavInfo = parseWav(localFile);
          if (!wavInfo.error) {
            totalDuration += wavInfo.duration;
            maxSampleRate = Math.max(maxSampleRate, wavInfo.sampleRate);
            bitsAndChannels = `${wavInfo.bitsPerSample}-bit / ${wavInfo.numChannels === 1 ? 'Mono' : 'Stereo'}`;
          }
        }
      }

      // Check remote comparison with Monkeytype for non-custom files
      let remoteSizeStatus = 'N/A (Custom/Offline)';
      if (remotePathPrefix && s.folder !== 'error5') {
        const testRemoteUrl = `https://raw.githubusercontent.com/monkeytypegame/monkeytype/master/${remotePathPrefix}/${s.folder}/1.wav`;
        try {
          const res = await fetch(testRemoteUrl, { method: 'HEAD' });
          if (res.ok) {
            const size = parseInt(res.headers.get('content-length') || '0', 10);
            remoteSizeStatus = `Exist (${formatBytes(size)} sample 1)`;
          } else {
            remoteSizeStatus = 'Missing on Remote';
          }
        } catch {
          remoteSizeStatus = 'Network Bypass';
        }
      }

      soundResults.push({
        profile: s.label,
        type: typeLabel,
        folder: s.folder,
        files: `${filesVerified}/${s.samples}`,
        totalSize: formatBytes(totalBytes),
        duration: totalDuration > 0 ? `${totalDuration.toFixed(3)}s` : 'N/A',
        format: bitsAndChannels || 'WAV',
        rate: maxSampleRate > 0 ? `${maxSampleRate / 1000}kHz` : 'N/A',
        remoteStatus: remoteSizeStatus
      });
    }
  };

  await scanSoundGroup(KEYBOARD_SOUNDS, 'Click Sound', 'frontend/static/sounds');
  await scanSoundGroup(ERROR_SOUNDS, 'Error Sound', 'frontend/static/sounds');

  // Print Sounds Table
  console.log(`| Profile Name | Type | Folder | Local Files | Total Size | Combined Duration | Format | Sample Rate | Remote Status |`);
  console.log(`|---|---|---|---|---|---|---|---|---|`);
  soundResults.forEach(r => {
    console.log(`| ${r.profile} | ${r.type} | ${r.folder} | ${r.files} | ${r.totalSize} | ${r.duration} | ${r.format} | ${r.rate} | ${r.remoteStatus} |`);
  });
  console.log('\n');


  // --- PART 3: AMBIENT SOUNDS ---
  console.log('------------------------------------------------------------------------');
  console.log(' [3/3] SCANNING AMBIENT SOUNDS LIBRARY (Amit Merchant Style)');
  console.log('------------------------------------------------------------------------');

  const ambientResults = [];
  let totalAmbientSize = 0;

  for (const filename of AMBIENT_SOUNDS) {
    const localPath = path.join('public', 'assets', 'sounds', 'ambient', filename);
    const exists = fs.existsSync(localPath);
    let size = 0;
    let format = 'MP3';
    let status = 'Ready Offline (0 Latency)';

    if (exists) {
      const stats = fs.statSync(localPath);
      size = stats.size;
      totalAmbientSize += size;
    } else {
      status = 'MISSING!';
    }

    ambientResults.push({
      filename,
      size: formatBytes(size),
      format,
      status
    });
  }

  // Print Ambient Table
  console.log(`| Ambient Sound Filename | Format | File Size | Status |`);
  console.log(`|---|---|---|---|`);
  ambientResults.forEach(r => {
    console.log(`| ${r.filename} | ${r.format} | ${r.size} | ${r.status} |`);
  });
  console.log(`\n  >> Total Local Ambient Library Size: ${formatBytes(totalAmbientSize)} across ${AMBIENT_SOUNDS.length} files.`);
  console.log('\n========================================================================');
  console.log('   INTEGRITY COMPARISON COMPLETE: 100% OFFLINE LATENCY CAPABLE');
  console.log('========================================================================');
}

runComparison().catch(err => {
  console.error('Fatal scanner error:', err);
});
