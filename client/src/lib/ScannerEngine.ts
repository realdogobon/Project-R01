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

      return outputCanvas;
    } catch (e) {
      console.error("OpenCV WASM execution failed:", e);
      return sourceCanvas;
    }
  }

}
