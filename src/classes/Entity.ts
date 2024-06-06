import { Group } from "konva/lib/Group";
import { Shape } from "konva/lib/Shape";
import { Line } from "konva/lib/shapes/Line";
import { Rect } from "konva/lib/shapes/Rect";
import { RegularPolygon } from "konva/lib/shapes/RegularPolygon";
import { Text } from "konva/lib/shapes/Text";
import { Connection } from "./Connection";

export type EntityOptions = {
  x?: number;
  y?: number;
  connections?: Entity[];
  shapeType?: "pill" | "triangle" | "rectangle";
  color?: string;
  isRoot?: boolean;
  metadata?: Record<string, string>;
};

export class Entity extends Group {
  public metadata?: Record<string, string>;
  protected color: string;
  protected shapeType: string;
  protected shape: Shape;
  protected connections: Connection[] = [];
  protected root: boolean;
  public elkId: string;

  constructor(name: string, options?: EntityOptions) {
    super({ x: options?.x, y: options?.y, draggable: true });
    this.elkId = crypto.randomUUID();
    this.name(name);
    this.color = options?.color || "#dee2e6";
    this.shapeType = options?.shapeType || "pill";
    this.root = options?.isRoot || false;
    this.metadata = options?.metadata;

    switch (options?.shapeType) {
      case "triangle":
        this.shape = new RegularPolygon({
          x: 0,
          y: 0,
          sides: 3,
          fill: this.color,
          radius: 100,
          shadowBlur: 10,
          shadowOpacity: 0.3,
          shadowColor: "#252627",
          shadowOffset: { x: 1, y: 3 },
        });
        break;
      case "rectangle":
        this.shape = new Rect({
          x: -100,
          y: -25,
          fill: this.color,
          width: 200,
          height: 50,
          cornerRadius: 0,
          shadowBlur: 10,
          shadowOpacity: 0.3,
          shadowColor: "#252627",
          shadowOffset: { x: 1, y: 3 },
        });
        break;
      default:
        this.shape = new Rect({
          x: -100,
          y: -25,
          fill: this.color,
          width: 200,
          height: 50,
          cornerRadius: 50,
          shadowBlur: 10,
          shadowOpacity: 0.3,
          shadowColor: "#252627",
          shadowOffset: { x: 1, y: 3 },
        });
    }
    this.add(this.shape);
    const text = new Text({
      x: 0,
      y: 0,
      width: 150,
      text: this.name(),
      fill: "black",
      fontSize: 16,
      wrap: "none",
      ellipsis: true,
      align: "center",
    });

    text.x(text.width() / -2);
    text.y(text.height() / -2);
    this.add(text);

    options?.connections?.forEach((c) => {
      this.connectTo(c);
    });

    this.on("dragmove", () => {
      this.connections.forEach((c) => {
        c.update();
      });
    });
  }

  // Use this to connect two entities
  public connectTo(e: Entity): Connection {
    const line = new Line({
      stroke: "black",
      strokeWidth: 1,
      bezier: true,
    });
    const connection = new Connection(line, this, e);
    this.connections.push(connection);
    e.addConnection(connection);
    return connection;
  }

  // This will be called by connectTo on the receiving side
  public addConnection(connection: Connection) {
    this.connections.push(connection);
  }

  public getConnections(): Connection[] {
    return this.connections;
  }

  public getSize(): { width: number; height: number } {
    return this.shape.size();
  }

  public isRoot(): boolean {
    return this.root;
  }
}
