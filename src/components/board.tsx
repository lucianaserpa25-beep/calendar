"use client";
import {
  DndContext,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { GripVertical, ArrowUpRight } from "lucide-react";
import { statuses, dateLabel, type Content, progress } from "@/lib/model";
export function ContentCard({
  item,
  onOpen,
}: {
  item: Content;
  onOpen: (c: Content) => void;
}) {
  return (
    <button className="content-card" onClick={() => onOpen(item)}>
      <div className="between">
        <span className={`tag format-${item.format}`}>{item.format}</span>
        <ArrowUpRight size={15} />
      </div>
      <h3>{item.title}</h3>
      <div className="card-meta">
        <span>{dateLabel(item.date)}</span>
        <span>{item.objective}</span>
      </div>
      <div className="card-progress">
        <progress max={100} value={progress([item])} />
        <span>{progress([item])}%</span>
      </div>
      {item.publicationConfirmed && (
        <span className="small success">Publicação confirmada</span>
      )}
    </button>
  );
}
function Draggable({
  item,
  onOpen,
  onMove,
  disabled,
}: {
  item: Content;
  onOpen: (c: Content) => void;
  onMove: (id: string, status: Content["status"]) => void;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: item.id, disabled });
  return (
    <div
      ref={setNodeRef}
      className={`board-card ${isDragging ? "dragging" : ""}`}
      style={
        transform
          ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)` }
          : undefined
      }
    >
      <button
        className="drag-handle"
        aria-label={`Mover ${item.title}`}
        {...listeners}
        {...attributes}
      >
        <GripVertical size={16} />
      </button>
      <ContentCard item={item} onOpen={onOpen} />
      <label className="move-label">
        Mover para
        <select
          aria-label={`Status de ${item.title}`}
          value={item.status}
          disabled={disabled}
          onChange={(e) => onMove(item.id, e.target.value as Content["status"])}
        >
          {statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
function Column({
  status,
  items,
  onOpen,
  onMove,
  disabled,
}: {
  status: Content["status"];
  items: Content[];
  onOpen: (c: Content) => void;
  onMove: (id: string, status: Content["status"]) => void;
  disabled: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      className={`board-column ${isOver ? "over" : ""}`}
      ref={setNodeRef}
    >
      <h3>
        <span className={`status-dot status-${statuses.indexOf(status)}`} />
        {status}
        <span className="count">{items.length}</span>
      </h3>
      <div className="column-body">
        {items.map((item) => (
          <Draggable key={item.id} {...{ item, onOpen, onMove, disabled }} />
        ))}
        {!items.length && <p className="drop-hint">Solte um conteúdo aqui</p>}
      </div>
    </section>
  );
}
export function Board({
  items,
  onOpen,
  onMove,
  disabled,
}: {
  items: Content[];
  onOpen: (c: Content) => void;
  onMove: (id: string, status: Content["status"]) => void;
  disabled: boolean;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    }),
    useSensor(KeyboardSensor),
  );
  function end(e: DragEndEvent) {
    if (e.over && statuses.includes(e.over.id as Content["status"]))
      onMove(String(e.active.id), e.over.id as Content["status"]);
  }
  return (
    <>
      <p className="muted small">
        Arraste pela alça ou use “Mover para”. O quadro não publica no
        Instagram.
      </p>
      <DndContext
        sensors={sensors}
        onDragEnd={end}
        collisionDetection={(args) => {
          const hits = pointerWithin(args);
          return hits.length ? hits : rectIntersection(args);
        }}
        accessibility={{
          screenReaderInstructions: {
            draggable:
              "Pressione espaço para pegar o conteúdo, use as setas para mover e espaço para soltar. Escape cancela. Você também pode usar o menu Mover para.",
          },
          announcements: {
            onDragStart: () => "Conteúdo selecionado para mover.",
            onDragOver: ({ over }) =>
              over ? `Coluna ${over.id}.` : "Fora de uma coluna.",
            onDragEnd: ({ over }) =>
              over
                ? `Conteúdo movido para ${over.id}.`
                : "Movimentação encerrada.",
            onDragCancel: () => "Movimentação cancelada.",
          },
        }}
      >
        <div className="board">
          {statuses.map((status) => (
            <Column
              key={status}
              status={status}
              items={items.filter((c) => c.status === status)}
              {...{ onOpen, onMove, disabled }}
            />
          ))}
        </div>
      </DndContext>
    </>
  );
}
