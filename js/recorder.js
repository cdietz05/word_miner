// A parent's own recordings of the letter sounds: recorded in the Parent
// Corner and kept on this iPad (IndexedDB), played instead of the bundled
// ones. Needed for "b", which the free recordings don't have, and there for
// any sound a parent would rather say themselves.

const DATABASE = 'word_miner';
const STORE = 'recordings';

function open()
{
  return new Promise((resolve, reject) =>
  {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transaction(mode, work)
{
  return open().then((db) => new Promise((resolve, reject) =>
  {
    const tx = db.transaction(STORE, mode);
    const result = work(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(result.result ?? result);
    tx.onerror = () => reject(tx.error);
  }));
}

// Every saved recording, as [key, Blob] pairs.
export async function loadRecordings()
{
  try
  {
    const db = await open();
    return await new Promise((resolve, reject) =>
    {
      const found = [];
      const request = db.transaction(STORE).objectStore(STORE).openCursor();
      request.onsuccess = () =>
      {
        const cursor = request.result;
        if (cursor)
        {
          found.push([cursor.key, cursor.value]);
          cursor.continue();
        }
        else
        {
          resolve(found);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
  catch (error)
  {
    return [];
  }
}

export function saveRecording(key, blob)
{
  return transaction('readwrite', (store) => store.put(blob, key));
}

export function deleteRecording(key)
{
  return transaction('readwrite', (store) => store.delete(key));
}

// Records from the microphone until stop() is called (or [maxMs] passes).
// Returns { stop } straight away; stop() resolves with the recording.
export async function startRecording(maxMs = 3000)
{
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks = [];
  recorder.ondataavailable = (event) =>
  {
    if (event.data.size > 0)
    {
      chunks.push(event.data);
    }
  };
  const finished = new Promise((resolve) =>
  {
    recorder.onstop = () =>
    {
      stream.getTracks().forEach((track) => track.stop());
      resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/mp4' }));
    };
  });
  recorder.start();
  const timer = setTimeout(() =>
  {
    if (recorder.state === 'recording')
    {
      recorder.stop();
    }
  }, maxMs);
  return {
    stop()
    {
      clearTimeout(timer);
      if (recorder.state === 'recording')
      {
        recorder.stop();
      }
      return finished;
    },
    finished,
  };
}
