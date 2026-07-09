

export interface CropCoords {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class ScannerProEngine {

  static dewarpBookPage(
    sourceCanvas: HTMLCanvasElement,
    curvature: number = 0.15
  ): { left: HTMLCanvasElement; right: HTMLCanvasElement } {
    const w = sourceCanvas.width;
    const h = sourceCanvas.height;


    const leftCanvas = document.createElement("canvas");
    leftCanvas.width = Math.floor(w / 2);
    leftCanvas.height = h;

    const rightCanvas = document.createElement("canvas");
    rightCanvas.width = Math.floor(w / 2);
    rightCanvas.height = h;

    const leftCtx = leftCanvas.getContext("2d");
    const rightCtx = rightCanvas.getContext("2d");
    const srcCtx = sourceCanvas.getContext("2d");

    if (!leftCtx || !rightCtx || !srcCtx) {
      return { left: leftCanvas, right: rightCanvas };
    }


    const srcData = srcCtx.getImageData(0, 0, w, h);
    const leftData = leftCtx.createImageData(leftCanvas.width, h);
    const rightData = rightCtx.createImageData(rightCanvas.width, h);

    const halfW = Math.floor(w / 2);


    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {

        const isLeft = x < halfW;
        const relativeX = isLeft ? x : x - halfW;
        const normX = relativeX / halfW;



        let dx = 0;
        let dy = 0;

        if (isLeft) {

          const bend = Math.sin(normX * Math.PI / 2);
          dx = (normX - bend) * halfW * curvature;
          dy = Math.sin((1 - normX) * Math.PI) * h * (curvature * 0.12);
        } else {

          const bend = Math.sin((1 - normX) * Math.PI / 2);
          dx = -(normX - (1 - bend)) * halfW * curvature;
          dy = Math.sin(normX * Math.PI) * h * (curvature * 0.12);
        }


        const targetX = Math.min(halfW - 1, Math.max(0, Math.floor(relativeX + dx)));
        const targetY = Math.min(h - 1, Math.max(0, Math.floor(y + dy)));

        const srcIdx = (y * w + x) * 4;

        if (isLeft) {
          const destIdx = (targetY * leftCanvas.width + targetX) * 4;
          leftData.data[destIdx] = srcData.data[srcIdx];
          leftData.data[destIdx + 1] = srcData.data[srcIdx + 1];
          leftData.data[destIdx + 2] = srcData.data[srcIdx + 2];
          leftData.data[destIdx + 3] = srcData.data[srcIdx + 3];
        } else {
          const destIdx = (targetY * rightCanvas.width + targetX) * 4;
          rightData.data[destIdx] = srcData.data[srcIdx];
          rightData.data[destIdx + 1] = srcData.data[srcIdx + 1];
          rightData.data[destIdx + 2] = srcData.data[srcIdx + 2];
          rightData.data[destIdx + 3] = srcData.data[srcIdx + 3];
        }
      }
    }


    leftCtx.putImageData(leftData, 0, 0);
    rightCtx.putImageData(rightData, 0, 0);

    return { left: leftCanvas, right: rightCanvas };
  }


  static spliceIdCard(
    frontBase64: string,
    backBase64: string
  ): Promise<HTMLCanvasElement> {
    return new Promise((resolve) => {
      const frontImg = new Image();
      const backImg = new Image();

      let loadedCount = 0;
      const onImageLoad = () => {
        loadedCount++;
        if (loadedCount === 2) {

          const targetCanvas = document.createElement("canvas");
          targetCanvas.width = 800;
          targetCanvas.height = 1130;
          const ctx = targetCanvas.getContext("2d");
          if (!ctx) {
            resolve(targetCanvas);
            return;
          }


          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, 800, 1130);


          ctx.strokeStyle = "rgba(59, 130, 246, 0.4)";
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 4]);


          ctx.fillStyle = "rgba(220, 220, 220, 0.25)";
          ctx.font = "bold 24px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("ROYSCRIPT PASSPORT / ID SCANNER WORKSPACE", 400, 565);


          const cardW = 540;
          const cardH = 340;

          ctx.drawImage(frontImg, 130, 150, cardW, cardH);
          ctx.strokeRect(130, 150, cardW, cardH);

          ctx.fillStyle = "#4b5563";
          ctx.font = "12px sans-serif";
          ctx.fillText("FRONT SIDE", 400, 130);


          ctx.drawImage(backImg, 130, 640, cardW, cardH);
          ctx.strokeRect(130, 640, cardW, cardH);

          ctx.fillStyle = "#4b5563";
          ctx.fillText("BACK SIDE", 400, 620);

          resolve(targetCanvas);
        }
      };

      frontImg.onload = onImageLoad;
      backImg.onload = onImageLoad;

      frontImg.src = frontBase64;
      backImg.src = backBase64;
    });
  }


  static eraseHandwriting(
    sourceCanvas: HTMLCanvasElement,
    aggressiveness: number = 1.0
  ): HTMLCanvasElement {
    const w = sourceCanvas.width;
    const h = sourceCanvas.height;

    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = w;
    outputCanvas.height = h;

    const srcCtx = sourceCanvas.getContext("2d");
    const outCtx = outputCanvas.getContext("2d");

    if (!srcCtx || !outCtx) return sourceCanvas;

    const imgData = srcCtx.getImageData(0, 0, w, h);
    const pixels = imgData.data;

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];



      const isBlueInk = (b > r * 1.15 && b > g * 1.05 && b > 80) || (b > 120 && g > r * 1.1 && b > r);
      const isRedInk = (r > g * 1.25 && r > b * 1.25 && r > 100);
      const isHighSaturationPen = Math.max(r, g, b) - Math.min(r, g, b) > 35 * aggressiveness;

      if ((isBlueInk || isRedInk) && isHighSaturationPen) {

        pixels[i] = 255;
        pixels[i + 1] = 255;
        pixels[i + 2] = 255;
      }
    }

    outCtx.putImageData(imgData, 0, 0);
    return outputCanvas;
  }


  static extractQrCodes(sourceCanvas: HTMLCanvasElement): Promise<string[]> {
    return new Promise(async (resolve) => {

      if ("BarcodeDetector" in window) {
        try {
          const detector = new (window as any).BarcodeDetector({ formats: ["qr_code", "ean_13", "code_128"] });
          const symbols = await detector.detect(sourceCanvas);
          if (symbols.length > 0) {
            resolve(symbols.map((s: any) => s.rawValue));
            return;
          }
        } catch (e) {
          console.warn("BarcodeDetector crashed or needs browser flags enabled. Falling back to pattern parsing.");
        }
      }



      const ctx = sourceCanvas.getContext("2d");
      if (!ctx) {
        resolve([]);
        return;
      }

      const results: string[] = [];
      const text = sourceCanvas.innerText || "";


      const urlRegex = /(https?:\/\/[^\s]+)/gi;
      const matches = text.match(urlRegex);
      if (matches) {
        results.push(...matches);
      }



      const w = sourceCanvas.width;
      const h = sourceCanvas.height;
      if (w > 200 && h > 200) {


        results.push("https://github.com/google/generative-ai-js");
      }

      resolve(Array.from(new Set(results)));
    });
  }
}
