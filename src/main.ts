import ELK, { ElkNode } from "elkjs/lib/elk.bundled";
import Konva from "konva/lib/Core";
import { Layer } from "konva/lib/Layer";
import { KonvaEventObject } from "konva/lib/Node";
import { Tween } from "konva/lib/Tween";
import { Line } from "konva/lib/shapes/Line";
import { read, utils } from "xlsx";
import { Entity } from "./classes/Entity";
import "./style.css";

const entities: Entity[] = [];
let width = window.innerWidth;
let height = window.innerHeight;
const scaleBy = 1.05;
const gridSize = 70;
const zoomMin = 0.3;
const zoomMax = 4;

window.addEventListener("load", async () => {
  const stage = new Konva.Stage({
    container: document.querySelector(".canvas-container") as HTMLDivElement,
    width,
    height,
    draggable: true,
  });

  stage.on("wheel", (e) => zoom(e, stage));
  stage.on("dragmove", () => drawGrid(gridLayer, stage));
  window.addEventListener("resize", (e) => resize(stage));
  const layer = new Layer();
  const gridLayer = new Layer({ id: "grid" });
  stage.add(gridLayer, layer);

  drawGrid(gridLayer, stage);

  const url = "./public/esg.xlsx";
  const file = await (await fetch(url)).arrayBuffer();

  const workbook = read(file);
  const jsonESG = utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

  // const root = new Entity("ESRS", { isRoot: true });
  // entities.push(root);
  let lastTopic;
  let topicCounter = 0;
  let subCounter = 0;
  let subsubCounter = 0;
  jsonESG.forEach((row: any) => {
    if (row.Topic) {
      const tag = row.Number.substring(4);
      lastTopic = new Entity(row.Topic, {
        // connections: [root],
        color: tag.includes("E")
          ? "oklch(80% 0.13 147)"
          : tag.includes("S")
          ? "oklch(80% 0.13 237)"
          : "oklch(80% 0.13 95)",
      });
      topicCounter++;
      entities.push(lastTopic);
      if (row.Subtopic) {
        row.Subtopic.split(",")
          .map((s) => s.trim())
          .filter((s) => s.length)
          .forEach((s) => {
            const sub = new Entity(s, {
              connections: [lastTopic],
            });
            subCounter++;
            entities.push(sub);
            if (row.Subsubtopic) {
              row.Subsubtopic.split(",")
                .map((s) => s.trim())
                .filter((s) => s.length)
                .forEach((s) => {
                  const subsub = new Entity(s, {
                    connections: [sub],
                  });
                  subsubCounter++;
                  entities.push(subsub);
                });
            }
          });
      }
    } else {
      if (lastTopic && row.Subtopic) {
        row.Subtopic.split(",")
          .map((s) => s.trim())
          .filter((s) => s.length)
          .forEach((s) => {
            const sub = new Entity(s, {
              connections: [lastTopic],
            });
            subCounter++;
            entities.push(sub);
            if (row.Subsubtopic) {
              row.Subsubtopic.split(",")
                .map((s) => s.trim())
                .filter((s) => s.length)
                .forEach((s) => {
                  const subsub = new Entity(s, {
                    connections: [sub],
                  });
                  subsubCounter++;
                  entities.push(subsub);
                });
            }
          });
      }
    }
  });
  console.log({ topicCounter, subCounter, subsubCounter });

  layoutElk();

  layer.add(...entities.flatMap((e) => e.getConnections()).map((e) => e.line));
  layer.add(...entities);

  layer.draw();
  gridLayer.draw();
});

function drawGrid(layer: Layer, stage: Stage) {
  const scale = stage.scaleX();

  const viewRect = {
    x1: -stage.position().x / scale,
    y1: -stage.position().y / scale,
    x2: stage.width() / scale - stage.position().x / scale,
    y2: stage.height() / scale - stage.position().y / scale,
  };

  layer.clip({
    x: viewRect.x1,
    y: viewRect.y1,
    width: viewRect.x2 - viewRect.x1,
    height: viewRect.y2 - viewRect.y1,
  });

  const gridRect = {
    x1: Math.ceil(viewRect.x1 / gridSize) * gridSize - gridSize,
    y1: Math.ceil(viewRect.y1 / gridSize) * gridSize - gridSize,
    x2: Math.ceil(viewRect.x2 / gridSize) * gridSize,
    y2: Math.ceil(viewRect.y2 / gridSize) * gridSize,
  };

  layer.clear();
  layer.destroyChildren();

  const gridWidth = gridRect.x2 - gridRect.x1;
  const gridHeight = gridRect.y2 - gridRect.y1;
  for (let i = 0; i <= Math.round(gridWidth / gridSize); i++) {
    layer.add(
      new Line({
        x: gridRect.x1 + i * gridSize,
        y: gridRect.y1,
        points: [0, 0, 0, gridHeight],
        stroke: "#adb5bd",
        strokeWidth: 1,
      })
    );
  }

  for (let i = 0; i <= Math.round(gridHeight / gridSize); i++) {
    layer.add(
      new Line({
        x: gridRect.x1,
        y: gridRect.y1 + i * gridSize - gridSize / 3,
        points: [0, 0, gridWidth, 0],
        stroke: "#adb5bd",
        strokeWidth: 1,
      })
    );
  }
}
async function layoutElk(ease = false) {
  const elk = new ELK();

  const graph: ElkNode = {
    id: "root",
    layoutOptions: {
      // "elk.direction": "DOWN",
      "elk.layered.spacing.nodeNodeBetweenLayers": 100,
    },
    children: [],
    edges: [],
  };

  const entityMap = new Map();
  entities.forEach((entity) => {
    // const id = toSnakeCase(entity.name());
    const id = entity.elkId;
    entityMap.set(id, entity);
    graph.children?.push({
      id,
      ...entity.getSize(),
      layoutOptions: { layerConstraint: entity.isRoot() ? "FIRST" : "NONE" },
    });
  });
  entities
    .flatMap((e) => e.getConnections())
    .forEach((connection) => {
      const id = `${connection.e2.elkId} - ${connection.e1.elkId}}`;
      graph.edges?.push({
        id: id,
        sources: [connection.e2.elkId],
        targets: [connection.e1.elkId],
      });
    });

  await elk.layout(graph);
  graph.children?.forEach((node) => {
    const entity = entityMap.get(node.id) as Entity;
    const x = (node.x ?? 0) + (window.innerWidth - (graph.width ?? 0)) / 2;
    const y = (node.y ?? 0) + (window.innerHeight - (graph.height ?? 0)) / 2;

    if (ease) {
      const tween = new Tween({
        node: entity,
        duration: 0.3,
        x,
        y,
        onUpdate: () => {
          entity.getConnections().forEach((c) => c.update());
        },
      });
      tween.play();
    } else {
      entity.position({ x, y });
    }
  });

  entities
    .flatMap((e) => e.getConnections())
    .forEach((connection) => connection.update());
}

function zoom(e: KonvaEventObject<WheelEvent>, stage: Stage): void {
  // stop default scrolling
  e.evt.preventDefault();

  const oldScale = stage.scaleX();
  const pointer = stage.getPointerPosition()!;
  const gridLayer = stage.findOne("#grid")! as Layer;

  var mousePointTo = {
    x: (pointer.x - stage.x()) / oldScale,
    y: (pointer.y - stage.y()) / oldScale,
  };

  // how to scale? Zoom in? Or zoom out?
  let direction = e.evt.deltaY < 0 ? 1 : -1;

  // when we zoom on trackpad, e.evt.ctrlKey is true
  // in that case lets revert direction
  if (e.evt.ctrlKey) {
    direction = -direction;
  }

  const rawScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

  const newScale = Math.min(Math.max(rawScale, zoomMin), zoomMax);

  stage.scale({ x: newScale, y: newScale });

  const newPos = {
    x: pointer.x - mousePointTo.x * newScale,
    y: pointer.y - mousePointTo.y * newScale,
  };
  stage.position(newPos);
  drawGrid(gridLayer, stage);
}

function resize(stage: Stage) {
  stage.size({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  drawGrid(stage.findOne("#grid")!, stage);
}
