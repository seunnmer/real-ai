export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userMessage, context, history } = req.body || {};

    if (!userMessage || typeof userMessage !== "string") {
      return res.status(400).json({ error: "userMessage is required" });
    }

    const systemPrompt = `
당신은 삼투와 확산 개념 학습을 돕는 친절한 AI 튜터입니다.
학습자가 현재 보고 있는 문제 맥락을 바탕으로 자연스럽게 대화하세요.
정답만 단정적으로 주기보다, 왜 그런지 짧고 이해하기 쉽게 설명하세요.
답변은 한국어로 하세요.
답변은 너무 길지 않게, 보통 2~5문장 이내로 하세요.
교과서식 장문 설명보다 ChatGPT처럼 자연스럽고 대화형으로 답하세요.
학습자가 이미 한 말을 고려해서 이어서 답하세요.
현재 문제 맥락:
${JSON.stringify(context || {}, null, 2)}
`;

    const messages = [
      {
        role: "system",
        content: systemPrompt
      },
      ...(Array.isArray(history)
        ? history
            .filter(
              (m) =>
                m &&
                (m.role === "user" || m.role === "assistant") &&
                typeof m.content === "string" &&
                m.content.trim()
            )
            .slice(-10)
        : []),
      {
        role: "user",
        content: userMessage
      }
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: 220
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "OpenAI request failed",
        raw: data
      });
    }

    const outputText =
      data?.choices?.[0]?.message?.content?.trim() ||
      "죄송해요. 지금은 답변을 불러오지 못했어요.";

    return res.status(200).json({
      output_text: outputText,
      model: data?.model || "gpt-4o-mini",
      usage: data?.usage || null
    });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Unknown server error"
    });
  }
}