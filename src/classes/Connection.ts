import { Line } from "konva/lib/shapes/Line";
import { Entity } from "./Entity";

export class Connection {
  public line: Line;
  public e1: Entity;
  public e2: Entity;

  constructor(line: Line, e1: Entity, e2: Entity) {
    this.line = line;
    this.e1 = e1;
    this.e2 = e2;
    this.update();
  }

  public update(): void {
    const { x: x1, y: y1 } = this.e1.position();
    const { x: x2, y: y2 } = this.e2.position();
    const bezierFactor = 1.5;
    this.line.points([
      x1,
      y1,
      x1,
      y1 + (y2 - y1) / bezierFactor,
      x2,
      y2 + (y1 - y2) / bezierFactor,
      x2,
      y2,
    ]);
  }
}
