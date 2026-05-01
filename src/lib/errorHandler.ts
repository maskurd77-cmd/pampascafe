export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo?: {
    userId?: string | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Wrapper to safely execute Firebase calls with toasts
import toast from "react-hot-toast";

export async function safeAwait<T>(
  promise: Promise<T>, 
  successMessage?: string,
  errorMessage: string = "هەڵەیەک ڕوویدا",
  operationType: OperationType = OperationType.WRITE,
  path: string | null = null
): Promise<[T | null, any]> {
  try {
    const data = await promise;
    if (successMessage) toast.success(successMessage);
    return [data, null];
  } catch (error: any) {
    console.error(error);
    toast.error(errorMessage + (error.message ? `: ${error.message}` : ""));
    // We don't throw here to avoid crashing the UI, we return the error
    return [null, error];
  }
}
