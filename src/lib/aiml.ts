import OpenAI from "openai";

const AIML_API_KEY = process.env.NEXT_PUBLIC_AIML_API_KEY;

if (!AIML_API_KEY) {
  console.warn("AIML API key is not configured. AI features will not work.");
}

const openai = new OpenAI({
  apiKey: AIML_API_KEY || "dummy-key",
  baseURL: "https://api.aimlapi.com/v1",
  dangerouslyAllowBrowser: true, // Client-side usage
});

const SYSTEM_PROMPT = `You are an expert project manager and technical writer. Your task is to improve task descriptions for a Kanban board application.

When given a task description, you should:

1. **Clarify and expand**: Take the user's informal description and rewrite it in clear, professional language
2. **Add technical detail**: Include relevant technical terms and best practices where appropriate
3. **Structure the content**: Use bullet points or sections to organize information logically
4. **Identify gaps**: Point out any missing information that would be helpful for completing the task, such as:
   - Acceptance criteria
   - Technical requirements
   - Dependencies
   - Edge cases to consider
   - Testing considerations

Guidelines:
- Maintain the original intent and scope of the task
- Keep the tone professional but friendly
- Use markdown formatting for better readability
- If the original description is very brief, ask clarifying questions in the improved version
- Highlight missing critical information with "⚠️ Missing:" prefix
- Keep the improved description concise but comprehensive (aim for 3-5 sentences plus any missing info points)

Output only the improved description without any preamble or explanation.`;

export interface ImproveDescriptionParams {
  title: string;
  description: string;
  projectContext?: string;
}

export interface ImproveDescriptionResult {
  improvedDescription: string;
  error?: string;
}

/**
 * Improves a task description using AIML API
 * @param params - Task information including title and current description
 * @returns Improved description or error message
 */
export async function improveTaskDescription({
  title,
  description,
  projectContext,
}: ImproveDescriptionParams): Promise<ImproveDescriptionResult> {
  if (!AIML_API_KEY || AIML_API_KEY === "dummy-key") {
    return {
      improvedDescription: description,
      error: "AIML API key is not configured. Please add NEXT_PUBLIC_AIML_API_KEY to your .env.local file.",
    };
  }

  if (!description.trim()) {
    return {
      improvedDescription: description,
      error: "Please provide a description to improve.",
    };
  }

  try {
    const userPrompt = `Task Title: ${title}

Current Description:
${description}
${projectContext ? `\n\nProject Context: ${projectContext}` : ""}

Please provide an improved version of this task description.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Fast and cost-effective model
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const improvedDescription = completion.choices[0]?.message?.content?.trim();

    if (!improvedDescription) {
      throw new Error("No response received from AI");
    }

    return { improvedDescription };
  } catch (error) {
    console.error("Error improving task description:", error);

    let errorMessage = "Failed to improve description. Please try again.";

    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        errorMessage = "Invalid AIML API key. Please check your configuration.";
      } else if (error.message.includes("rate limit")) {
        errorMessage = "Rate limit exceeded. Please try again in a moment.";
      } else if (error.message.includes("network")) {
        errorMessage = "Network error. Please check your connection.";
      }
    }

    return {
      improvedDescription: description,
      error: errorMessage,
    };
  }
}
