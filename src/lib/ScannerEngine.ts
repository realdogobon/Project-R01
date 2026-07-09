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

  public autoDetectCrops(sourceCanvas: HTMLCanvasElement): Array<{ x: number, y: number, width: number, height: number, unitX: number, unitY: number, unitWidth: number, unitHeight: number }> {
    if (!this.isLoaded()) return [];
    try {
      const src = this.cv.imread(sourceCanvas);
      const gray = new this.cv.Mat();
      const blurred = new this.cv.Mat();
      const edges = new this.cv.Mat();
      const contours = new this.cv.MatVector();
      const hierarchy = new this.cv.Mat();

      this.cv.cvtColor(src, gray, this.cv.COLOR_RGBA2GRAY, 0);
      this.cv.GaussianBlur(gray, blurred, new this.cv.Size(5, 5), 0, 0, this.cv.BORDER_DEFAULT);
      this.cv.Canny(blurred, edges, 75, 200, 3, false);

      this.cv.findContours(edges, contours, hierarchy, this.cv.RETR_EXTERNAL, this.cv.CHAIN_APPROX_SIMPLE);

      const crops = [];
      const imageArea = src.rows * src.cols;

      for (let i = 0; i < contours.size(); ++i) {
        const contour = contours.get(i);
        const rect = this.cv.boundingRect(contour);
        const area = rect.width * rect.height;


        if (area > imageArea * 0.02 && area < imageArea * 0.90) {

          crops.push({
             x: rect.x, y: rect.y, width: rect.width, height: rect.height,
             unitX: (rect.x / src.cols) * 100,
             unitY: (rect.y / src.rows) * 100,
             unitWidth: (rect.width / src.cols) * 100,
             unitHeight: (rect.height / src.rows) * 100
          });
        }
        contour.delete();
      }

      src.delete(); gray.delete(); blurred.delete(); edges.delete(); contours.delete(); hierarchy.delete();
      return crops;
    } catch(e) {
      console.error("Auto Detect Crops failed:", e);
      return [];
    }
  }
}
