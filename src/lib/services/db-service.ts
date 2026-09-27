import { prisma } from "@/lib/prisma";

export async function upsertEmailRecord(
  emailId: string,
  subject: string,
  from: string,
  contentHash: string
) {
  return await prisma.email.upsert({
    where: { email_id: emailId },
    update: {
      subject,
      from,
      content_hash: contentHash,
    },
    create: {
      email_id: emailId,
      subject,
      from,
      content_hash: contentHash,
    },
  });
}

export async function getExistingClassification(emailId: string, modelId: string) {
  return await prisma.classification.findUnique({
    where: {
      email_id_model_id: {
        email_id: emailId,
        model_id: modelId,
      },
    },
  });
}

export async function saveClassificationRecord(data: {
  emailId: string;
  modelId: string;
  category: string;
  urgency: number;
  needsReply: boolean;
  cost: number;
  inputTok: number;
  outputTok: number;
  speed: number;
}) {
  return await prisma.classification.upsert({
    where: {
      email_id_model_id: {
        email_id: data.emailId,
        model_id: data.modelId,
      },
    },
    update: {
      category: data.category,
      urgency: data.urgency,
      needs_reply: data.needsReply,
      cost: data.cost,
      input_tok: data.inputTok,
      output_tok: data.outputTok,
      speed: data.speed,
    },
    create: {
      email_id: data.emailId,
      model_id: data.modelId,
      category: data.category,
      urgency: data.urgency,
      needs_reply: data.needsReply,
      cost: data.cost,
      input_tok: data.inputTok,
      output_tok: data.outputTok,
      speed: data.speed,
    },
  });
}

export async function getAccountByUserId(userId: string) {
  return await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });
}

export async function updateAccountTokens(
  accountId: string,
  accessToken: string,
  expiresAt: number,
  refreshToken?: string
) {
  return await prisma.account.update({
    where: { id: accountId },
    data: {
      access_token: accessToken,
      expires_at: expiresAt,
      ...(refreshToken && { refresh_token: refreshToken }),
    },
  });
}
