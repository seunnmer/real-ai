export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userMessage, context } = req.body || {};

    if (!userMessage || typeof userMessage !== "string") {
      return res.status(400).json({ error: "userMessage is required" });
    }

    const systemPrompt = `
당신은 삼투와 확산 개념 학습을 돕는 튜터입니다.
학습자에게 정답만 짧게 주기보다, 현재 보고 있는 문제와 관련된 개념을 이해할 수 있도록 설명하세요.
가능하면 한국어로 답하세요.
답변은 간결하지만 이해 가능하게 작성하세요.
현재 문제 맥락:
${JSON.stringify(context || {}, null, 2)}
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: [
          {
            role: "system",
            content: [
              { type: "input_text", text: systemPrompt }
            ]
          },
          {
            role: "user",
            content: [
              { type: "input_text", text: userMessage }
            ]
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || data?.message || "OpenAI request failed",
        raw: data
      });
    }

    const outputText =
      data?.output_text ||
      data?.output?.flatMap(item => item?.content || [])
        ?.filter(c => c?.type === "output_text")
        ?.map(c => c?.text || "")
        ?.join("\n")
        ?.trim() ||
      "응답을 불러오지 못했습니다.";

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