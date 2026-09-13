/** Only domain errors are suitable for display; never expose storage or validation internals. */
export function userMessage(error: unknown): string {
  if (
    !(error instanceof Error) ||
    error.name !== "Error" ||
    /quota|indexed|transaction|constraint|database/i.test(error.message)
  )
    return "Something went wrong. Check your input and try again.";
  return error.message;
}
