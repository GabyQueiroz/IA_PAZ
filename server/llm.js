// Cliente de LLM com saída JSON e cadeia de modelos de reserva.
// Funciona com qualquer API compatível com OpenAI (Groq gratuita por padrão).
import OpenAI from "openai";
import { config } from "./config.js";

// Modelos que aceitam json_schema estrito. Os demais usam json_object + o formato descrito no prompt.
const STRICT_SCHEMA = [/^openai\/gpt-oss/, /^qwen\//, /^gpt-4/, /^gpt-5/, /^o\d/];
const REASONING = [/gpt-oss/];

export function createLLM() {
  if (!config.llmApiKey) return null;
  const client = new OpenAI({ apiKey: config.llmApiKey, baseURL: config.llmBaseUrl, maxRetries: 0, timeout: 45_000 });
  const cooldownUntil = new Map(); // modelo -> timestamp até quando evitar (limite atingido)

  function exampleFromSchema(schema) {
    if (schema.enum) return schema.enum.join("|");
    if (schema.type === "object") {
      return Object.fromEntries(Object.entries(schema.properties).map(([key, value]) => [key, exampleFromSchema(value)]));
    }
    if (schema.type === "array") return [exampleFromSchema(schema.items)];
    if (schema.type === "integer" || schema.type === "number") return 0;
    if (schema.type === "boolean") return true;
    return schema.description ? `<${schema.description}>` : "...";
  }

  async function callModel(model, { messages, schema, temperature }) {
    const strict = STRICT_SCHEMA.some((pattern) => pattern.test(model));
    const request = { model, temperature, messages };

    if (strict) {
      request.response_format = { type: "json_schema", json_schema: schema };
    } else {
      request.response_format = { type: "json_object" };
      request.messages = [
        ...messages.slice(0, -1),
        {
          ...messages.at(-1),
          content: `${messages.at(-1).content}\n\nResponda SOMENTE com um objeto JSON válido, exatamente com estes campos:\n${JSON.stringify(exampleFromSchema(schema.schema), null, 1)}`
        }
      ];
    }
    if (REASONING.some((pattern) => pattern.test(model)) && config.llmProvider === "groq") {
      request.reasoning_effort = "low";
    }

    const completion = await client.chat.completions.create(request);
    const text = (completion.choices[0]?.message?.content || "").replace(/<think>[\s\S]*?<\/think>/g, "");
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    return json;
  }

  /** Tenta cada modelo em ordem; pula os que estão sem cota. Lança erro se todos falharem. */
  async function json({ messages, schema, temperature = config.temperature, models = config.llmModels }) {
    try {
      return await tryModels({ messages, schema, temperature, models });
    } catch (error) {
      // Cota por minuto: se algum modelo libera em poucos segundos, espera e tenta mais uma vez.
      const soonest = Math.min(...models.map((model) => cooldownUntil.get(model) || 0)) - Date.now();
      if (soonest > 0 && soonest <= 8000) {
        await new Promise((resolve) => setTimeout(resolve, soonest + 250));
        return tryModels({ messages, schema, temperature, models });
      }
      throw error;
    }
  }

  async function tryModels({ messages, schema, temperature, models }) {
    const errors = [];
    for (const model of models) {
      if ((cooldownUntil.get(model) || 0) > Date.now()) {
        errors.push(`${model}: aguardando cota`);
        continue;
      }
      try {
        const data = await callModel(model, { messages, schema, temperature });
        return { data, model };
      } catch (error) {
        const status = error?.status;
        errors.push(`${model}: ${status || ""} ${error.message}`.slice(0, 200));
        if (status === 429) {
          const header = error?.headers?.get?.("retry-after") ?? error?.headers?.["retry-after"];
          const hinted = Number(String(error.message).match(/try again in ([\d.]+)s/)?.[1]);
          const retryAfter = Number(header) || hinted || 20;
          cooldownUntil.set(model, Date.now() + Math.min(retryAfter, 3600) * 1000);
        } else if (status === 401 || status === 403) {
          break; // chave inválida: não adianta tentar outros modelos
        } else if (status === 404) {
          cooldownUntil.set(model, Date.now() + 6 * 3600 * 1000); // modelo descontinuado
        }
      }
    }
    throw new Error(`Nenhum modelo respondeu. ${errors.join(" || ")}`);
  }

  return { json, models: config.llmModels, provider: config.llmProvider };
}
