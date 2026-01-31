/**
 * Function type for sending events to the client via SSE
 */
export type SendEventFn = (type: string, data: unknown) => void;
