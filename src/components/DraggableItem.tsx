import { useRef, useState, type Ref } from 'react';
import { Reorder, useDragControls } from 'motion/react';
import { TodoRow } from './TodoRow';
import { listItem } from '../motion';
import type { Todo, TodoPatch } from '../types';

interface Props {
  todo: Todo;
  onUpdate: (id: string, patch: TodoPatch) => void;
  onDelete: (id: string) => void;
  /** Called once when the item is dropped. */
  onDrop: () => void;
  ref?: Ref<HTMLLIElement>;
}

/** An open item that can be dragged (from anywhere on its row) to a new spot in its list. */
export function DraggableItem({ todo, onUpdate, onDelete, onDrop, ref }: Props) {
  const controls = useDragControls();
  const [dragging, setDragging] = useState(false);
  // Swallows the click that fires when the pointer is released over the row after a drag.
  const justDragged = useRef(false);

  return (
    <Reorder.Item
      ref={ref}
      as="li"
      value={todo.id}
      className={`item ${dragging ? 'is-dragging' : ''}`}
      dragListener={false}
      dragControls={controls}
      {...listItem}
      whileDrag={{ scale: 1.025 }}
      onDragStart={() => {
        justDragged.current = true;
        setDragging(true);
      }}
      onDragEnd={() => {
        setDragging(false);
        onDrop();
        window.setTimeout(() => {
          justDragged.current = false;
        });
      }}
    >
      <TodoRow
        todo={todo}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onGrab={(e) => controls.start(e)}
        wasDragged={() => justDragged.current}
      />
    </Reorder.Item>
  );
}
