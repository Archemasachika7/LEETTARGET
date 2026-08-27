export interface StudyAttachmentMeta {
  id: string;
  name: string;
  type: string;
  size: number;
}

interface StoredAttachment extends StudyAttachmentMeta {
  itemId: string;
  blob: Blob;
}

export interface StudyDeskBackupAttachment extends StudyAttachmentMeta {
  itemId: string;
  dataUrl: string;
}

const DB_NAME = "leettarget-study-desk";
const DB_VERSION = 1;
const STORE_NAME = "attachments";
const MAX_FILE_SIZE = 12 * 1024 * 1024;
const MAX_FILES_PER_ITEM = 8;

export function validateAttachmentFiles(files: File[]): string | undefined {
  if (files.length > MAX_FILES_PER_ITEM) return `Add up to ${MAX_FILES_PER_ITEM} files at a time.`;
  const tooLarge = files.find((file) => file.size > MAX_FILE_SIZE);
  if (tooLarge) return `${tooLarge.name} is larger than the 12 MB local attachment limit.`;
  return undefined;
}

export async function saveStudyAttachments(itemId: string, files: File[]): Promise<StudyAttachmentMeta[]> {
  const validationError = validateAttachmentFiles(files);
  if (validationError) throw new Error(validationError);
  if (files.length === 0) return [];

  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  const attachments = files.map((file) => ({
    id: createId(),
    itemId,
    name: file.name.slice(0, 180),
    type: file.type || "application/octet-stream",
    size: file.size,
    blob: file,
  } satisfies StoredAttachment));

  attachments.forEach((attachment) => store.put(attachment));
  await transactionDone(transaction);
  return attachments.map(({ id, name, type, size }) => ({ id, name, type, size }));
}

export async function deleteStudyAttachment(id: string): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAME, "readwrite");
  transaction.objectStore(STORE_NAME).delete(id);
  await transactionDone(transaction);
}

export async function openStudyAttachment(id: string): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAME, "readonly");
  const stored = await requestToPromise<StoredAttachment | undefined>(transaction.objectStore(STORE_NAME).get(id));
  await transactionDone(transaction);
  if (!stored) throw new Error("This attachment is no longer available on this device.");

  const url = URL.createObjectURL(stored.blob);
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function exportStudyAttachments(itemIds: string[]): Promise<StudyDeskBackupAttachment[]> {
  if (itemIds.length === 0) return [];
  const idSet = new Set(itemIds);
  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAME, "readonly");
  const all = await requestToPromise<StoredAttachment[]>(transaction.objectStore(STORE_NAME).getAll());
  await transactionDone(transaction);

  return Promise.all(
    all
      .filter((attachment) => idSet.has(attachment.itemId))
      .map(async ({ id, itemId, name, type, size, blob }) => ({
        id,
        itemId,
        name,
        type,
        size,
        dataUrl: await blobToDataUrl(blob),
      }))
  );
}

export async function restoreStudyAttachments(attachments: StudyDeskBackupAttachment[], allowedItemIds: Set<string>): Promise<number> {
  if (attachments.length === 0) return 0;
  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  let restored = 0;

  for (const attachment of attachments) {
    if (!allowedItemIds.has(attachment.itemId)) continue;
    const existing = await requestToPromise<StoredAttachment | undefined>(store.get(attachment.id));
    if (existing) continue;
    store.put({
      id: attachment.id,
      itemId: attachment.itemId,
      name: attachment.name,
      type: attachment.type,
      size: attachment.size,
      blob: dataUrlToBlob(attachment.dataUrl, attachment.type),
    } satisfies StoredAttachment);
    restored++;
  }

  await transactionDone(transaction);
  return restored;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("itemId", "itemId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Couldn't open local attachment storage."));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("The attachment operation failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("The attachment operation was cancelled."));
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("The attachment operation failed."));
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Couldn't include an attachment in the backup."));
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string, type: string): Blob {
  const base64 = dataUrl.split(",")[1];
  if (!base64) throw new Error("An attachment in this backup is malformed.");
  const bytes = atob(base64);
  const array = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) array[i] = bytes.charCodeAt(i);
  return new Blob([array], { type });
}

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
