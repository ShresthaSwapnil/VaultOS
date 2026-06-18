import os
import asyncio
from queue import Queue
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Thread-safe event queue
event_queue = Queue()
observer = None

class VaultEventHandler(FileSystemEventHandler):
    def __init__(self, loop):
        super().__init__()
        self.loop = loop

    def on_any_event(self, event):
        # Ignore directory events, system hidden files, and internal DB files
        if event.is_directory:
            return
        
        # We only care about file modifications, creations, deletions inside the vault
        path = event.src_path
        filename = os.path.basename(path)
        
        # Ignore temp files, hidden files, modules registry modifications
        if filename.startswith(".") or "~" in filename or filename.endswith(".tmp"):
            return
            
        # Get relative path for cleaner frontend display
        rel_path = path
        vault_idx = path.find("vault")
        if vault_idx != -1:
            rel_path = path[vault_idx:]

        event_type = event.event_type
        print(f"Watcher detected filesystem change: {event_type} - {rel_path}")
        
        # Put event into queue
        event_data = {
            "event": event_type,
            "path": rel_path,
            "filename": filename,
            "abs_path": path
        }
        
        # Push thread-safely
        self.loop.call_soon_threadsafe(event_queue.put, event_data)

def start_watcher(vault_path: str):
    global observer
    if observer is not None:
        print("Watcher already running.")
        return False
        
    print(f"Starting watchdog observer for: {vault_path}")
    loop = asyncio.get_event_loop()
    
    event_handler = VaultEventHandler(loop)
    observer = Observer()
    observer.schedule(event_handler, vault_path, recursive=True)
    observer.start()
    return True

def stop_watcher():
    global observer
    if observer:
        observer.stop()
        observer.join()
        observer = None
        return True
    return False

async def event_generator():
    """
    Asynchronous generator yielding file events as SSE format.
    """
    while True:
        # Check if we have events in the queue
        if not event_queue.empty():
            event_data = event_queue.get()
            # Yield as SSE format
            yield f"data: {asyncio.sys.modules['json'].dumps(event_data)}\n\n"
        await asyncio.sleep(0.5)
