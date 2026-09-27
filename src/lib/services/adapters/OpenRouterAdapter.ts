import { convert } from "html-to-text";
import { ModelAdapter, AdapterClassification } from "./ModelAdapter";
import { EmailPayload } from "../email-classifier";

export class OpenRouterAdapter implements ModelAdapter {
  async classify(email: EmailPayload): Promise<AdapterClassification> {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      throw new Error("Missing OpenRouter API Key");
    }

    const subject = email.subject || "";
    const from = email.from || "";
    const bodyText = typeof email.body === "string" ? email.body : JSON.stringify(email.body || {});

    const plainTextBody = convert(bodyText, {
      wordwrap: 130,
      selectors: [
        { selector: "a", options: { ignoreHref: true } },
        { selector: "img", format: "skip" },
      ],
    });

    const state = `
From: ${from}
To: ${email.to || ""}
Subject: ${subject}
Date: ${email.date || ""}

${plainTextBody.substring(0, 5000)}
    `.trim();

    const startTime = Date.now();
    const response = await fetch("https://openrouter.ai/api/v1/systemone", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "~typesafe/jev-latest",
        state: state,
        questions: {
          category: {
            type: "choice",
            instructions: "Classify the email based on its content into one of the following categories.",
            criteria: {
              "spam/phishing": "Malicious spam, phishing attempts, or unwanted promotional junk.",
              social: "Social media notifications, friend requests, or networking updates.",
              newsletter: "Informational newsletters, blog digests, or regular subscription updates.",
              offers: "Promotional offers, marketing campaigns, and store discounts.",
              "billing/invoices": "Billing statements, invoices, payment confirmations.",
              "work/professional": "Internal team communication, project updates, professional outreach.",
              "personal": "Direct personal emails from friends, family, or personal acquaintances.",
              "calendar/events": "Calendar invites, meeting updates, event reminders.",
              "e-commerce": "E-commerce receipts, order confirmations, shipping updates.",
              alerts: "System alerts, security warnings, quota limits, account changes.",
              other: "Any other emails that do not fit into the defined categories.",
            },
          },
          isUrgentReply: {
            type: "noul",
            instructions: "Does this email require an action or a reply from the user within the next 24 hours?",
          },
          urgency: {
            type: "score",
            instructions: "Score the priority of this email. Use Lowest for junk/newsletters, and Critical for urgent action required today.",
            criteria: ["Lowest", "Low", "Medium", "High", "Critical"],
          },
        },
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API Error:", errorText);
      throw new Error(`Failed to classify email: HTTP ${response.status}`);
    }

    const data = await response.json();

    let classificationData = data;
    if (data.choices && data.choices.length > 0 && data.choices[0].message?.content) {
      try {
        classificationData = JSON.parse(data.choices[0].message.content);
      } catch (e) {
        classificationData = data.choices[0].message.content;
      }
    }

    const answers = classificationData.answers || {};

    const categoryValue = answers.category?.choice || "other";
    const needsReply = answers.isUrgentReply?.noul > 0.5;
    const urgencyScoreRaw = answers.urgency?.score != null ? Math.round(answers.urgency?.score) + 1 : 1;
    const cost = data.usage?.cost || 0;
    const inputTok = data.usage?.prompt_tokens || 0;
    const outputTok = data.usage?.completion_tokens || 0;

    return {
      categoryValue,
      needsReply,
      urgencyScoreRaw,
      cost,
      inputTok,
      outputTok,
      latencyMs,
      probabilityCategory: answers.category?.confidence || 1.0,
      probabilityUrgentReply: answers.isUrgentReply?.noul || 1.0,
      probabilityUrgency: answers.urgency?.confidence || 1.0,
    };
  }
}
