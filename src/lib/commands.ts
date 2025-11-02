export type Command = {
  id: string;
  title: string;
  group?: string;
  shortcut?: string;
  run: () => void | Promise<void>;
};

const registry = new Map<string, Command>();
const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((fn) => fn());
}

export function registerCommands(cmds: Command[]): () => void {
  cmds.forEach((c) => registry.set(c.id, c));
  notify();
  return () => {
    cmds.forEach((c) => registry.delete(c.id));
    notify();
  };
}

export function getCommands(): Command[] {
  return Array.from(registry.values());
}

export function subscribe(fn: () => void): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}
