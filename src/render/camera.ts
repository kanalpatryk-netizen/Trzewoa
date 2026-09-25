/** Kamera w kaflach; zoom to liczba pikseli na kafel. */
export class Camera {
  x = 0; y = 0; zoom = 6;
  minZoom = 2.5; maxZoom = 26;
  constructor(public vw: number, public vh: number) {}

  /** Miękkie dojście do celu — kamera ma iść za tym, co się dzieje, nie stać w miejscu. */
  drift(tx: number, ty: number, k: number): void {
    this.x += (tx - this.x) * k;
    this.y += (ty - this.y) * k;
  }

  clamp(worldW: number, worldH: number): void {
    this.zoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom));
    const halfW = this.vw / this.zoom / 2, halfH = this.vh / this.zoom / 2;
    this.x = Math.min(Math.max(this.x, halfW), Math.max(halfW, worldW - halfW));
    this.y = Math.min(Math.max(this.y, halfH - 6), Math.max(halfH, worldH - halfH));
  }

  toScreenX(wx: number): number { return (wx - this.x) * this.zoom + this.vw / 2; }
  toScreenY(wy: number): number { return (wy - this.y) * this.zoom + this.vh / 2; }
  toWorldX(sx: number): number { return (sx - this.vw / 2) / this.zoom + this.x; }
  toWorldY(sy: number): number { return (sy - this.vh / 2) / this.zoom + this.y; }
}
