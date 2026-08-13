declare global {
  interface Window {
    cv: any;
  }
}

export class ScannerEngine {
  private get cv(): any {
    return window.cv;
  }

  public isLoaded(): boolean {
    return typeof window.cv !== "undefined" && typeof window.cv.Mat !== "undefined";
  }

  private hasVisibleContent(canvas: HTMLCanvasElement): boolean {
    if (!canvas.width || !canvas.height) return false;

    const sample = document.createElement("canvas");
    sample.width = 96;
    sample.height = 96;
    const context = sample.getContext("2d", { willReadFrequently: true });
    if (!context) return true;

    context.fillStyle = "#fff";
    context.fillRect(0, 0, sample.width, sample.height);
    context.drawImage(canvas, 0, 0, sample.width, sample.height);

    const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
    let visiblePixels = 0;
    let darkest = 255;
    let lightest = 0;

    for (let index = 0; index < pixels.length; index += 4) {
      const luminance = (pixels[index] * 0.2126)
        + (pixels[index + 1] * 0.7152)
        + (pixels[index + 2] * 0.0722);
      darkest = Math.min(darkest, luminance);
      lightest = Math.max(lightest, luminance);
      if (pixels[index + 3] > 4 && luminance < 247) visiblePixels += 1;
    }

    return visiblePixels >= 4 || lightest - darkest > 8;
  }


  public purifyCanvas(sourceCanvas: HTMLCanvasElement, colourMode: string = "Black and white"): HTMLCanvasElement {
    if (!this.isLoaded()) {
      console.warn("OpenCV WASM is not fully loaded yet. Using high-fidelity Canvas 2D fallback.");
      const outputCanvas = document.createElement("canvas");
      outputCanvas.width = sourceCanvas.width;
      outputCanvas.height = sourceCanvas.height;
      const ctx = outputCanvas.getContext("2d");
      if (ctx) {
        if (colourMode === "Greyscale" || colourMode === "grayscale") {
          ctx.filter = "grayscale(100%) contrast(125%) brightness(105%)";
        } else if (colourMode === "Black and white" || colourMode === "blackandwhite") {
          ctx.filter = "grayscale(100%) contrast(300%) brightness(110%)";
        } else {

          ctx.filter = "contrast(115%) brightness(102%) saturate(110%)";
        }
        ctx.drawImage(sourceCanvas, 0, 0);
      }
      return outputCanvas;
    }

    try {

      const src = this.cv.imread(sourceCanvas);
      const dst = new this.cv.Mat();

      if (colourMode === "Black and white" || colourMode === "blackandwhite") {

        this.cv.cvtColor(src, src, this.cv.COLOR_RGBA2GRAY, 0);

        this.cv.GaussianBlur(src, src, new this.cv.Size(3, 3), 0, 0, this.cv.BORDER_DEFAULT);

        this.cv.adaptiveThreshold(
          src,
          dst,
          255,
          this.cv.ADAPTIVE_THRESH_GAUSSIAN_C,
          this.cv.THRESH_BINARY,
          15,
          10
        );
      } else if (colourMode === "Greyscale" || colourMode === "grayscale") {

        this.cv.cvtColor(src, src, this.cv.COLOR_RGBA2GRAY, 0);
        this.cv.GaussianBlur(src, src, new this.cv.Size(3, 3), 0, 0, this.cv.BORDER_DEFAULT);
        src.copyTo(dst);
      } else {

        src.copyTo(dst);
      }


      const outputCanvas = document.createElement("canvas");
      outputCanvas.width = sourceCanvas.width;
      outputCanvas.height = sourceCanvas.height;


      const displayMat = new this.cv.Mat();
      if (colourMode === "Black and white" || colourMode === "blackandwhite" || colourMode === "Greyscale" || colourMode === "grayscale") {
        this.cv.cvtColor(dst, displayMat, this.cv.COLOR_GRAY2RGBA);
      } else {
        dst.copyTo(displayMat);
      }
      this.cv.imshow(outputCanvas, displayMat);


      src.delete();
      dst.delete();
      displayMat.delete();

      if (this.hasVisibleContent(sourceCanvas) && !this.hasVisibleContent(outputCanvas)) {
        console.warn("Scanner purification produced a blank canvas; preserving the populated source canvas.");
        return sourceCanvas;
      }

      return outputCanvas;
    } catch (e) {
      console.error("OpenCV WASM execution failed:", e);
      return sourceCanvas;
    }
  }

}
