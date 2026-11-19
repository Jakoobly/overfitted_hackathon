import OpenAI from "openai";
import { z } from "zod";

const DEFAULT_BASE_URL = "https://api.langdock.com/openai/eu/v1";
const DEFAULT_MODEL = "gpt-5.1";

let client: OpenAI | undefined;

function getClient(): OpenAI {
  const apiKey = process.env.LANGDOCK_API_KEY;
  if (!apiKey) throw new LangdockConfigError("LANGDOCK_API_KEY fehlt in .env.local");
  client ??= new OpenAI({
    apiKey,
    baseURL: process.env.LANGDOCK_BASE_URL || DEFAULT_BASE_URL,
    timeout: 45_000,
    maxRetries: 1,
  });
  return client;
}

export class LangdockConfigError extends Error {}

type InputMessage = { role: "user" | "assistant"; content: string };

/**
 * Ruft die Langdock Responses API mit strukturierter Ausgabe auf und prüft das Ergebnis mit Zod.
 * Der Gesprächskontext wird bei jedem Aufruf vollständig übergeben (store: false).
 */
export async function generateStructured<T extends z.ZodType>(options: {
  name: string;
  schema: T;
  instructions: string;
  input: InputMessage[];
}): Promise<z.infer<T>> {
  const jsonSchema = z.toJSONSchema(options.schema) as Record<string, unknown>;
  delete jsonSchema.$schema;
  const response = await getClient().responses.create({
    model: process.env.LANGDOCK_MODEL || DEFAULT_MODEL,
    store: false,
    instructions: options.instructions,
    input: options.input,
    text: { format: { type: "json_schema", name: options.name, strict: true, schema: jsonSchema } },
  });
  return options.schema.parse(JSON.parse(response.output_text));
}
