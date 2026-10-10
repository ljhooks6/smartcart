import OpenAI from "openai";

// One initial request and at most one correction. Never return a rejected result.
export async function generateValidatedFood<T>(client: OpenAI, options: { model: string; system: string; user: string; parse: (value: unknown) => T; validate: (value: T) => string[] }) {
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: options.system }, { role: "user", content: options.user },
  ];
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await client.chat.completions.create({ model: options.model, reasoning_effort: "low", response_format: { type: "json_object" }, max_completion_tokens: 3500, messages });
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty provider response");
    let errors: string[];
    try {
      const parsed = options.parse(JSON.parse(content));
      errors = options.validate(parsed);
      if (!errors.length) return parsed;
    } catch { errors = ["Return complete JSON matching the required schema, with positive ingredient prices where requested."]; }
    messages.push({ role: "assistant", content }, { role: "user", content: `Correct this response without relaxing any original constraints: ${errors.join("; ")}. Return only corrected JSON.` });
  }
  throw new Error("Food constraints failed after correction");
}
