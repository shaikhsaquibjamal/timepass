// lib/actions/general.action.ts
"use server";

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";

import { db } from "@/firebase/admin";              // Admin SDK Firestore instance
import { feedbackSchema } from "@/constants";
import { getCurrentUser } from "@/lib/actions/auth.action"; // <-- use your existing auth action

// ---- Types (adjust if you have central defs) ----
interface CreateFeedbackParams {
  interviewId: string;
  userId: string;
  transcript: { role: string; content: string }[];
  feedbackId?: string;
}
interface GetFeedbackByInterviewIdParams {
  interviewId: string;
  userId: string;
}
interface GetLatestInterviewsParams {
  userId: string;
  limit?: number;
}
interface Interview {
  id?: string;
  role: string;
  type: string;
  level: string;
  techstack: string[];
  questions: string[];
  userId: string;
  finalized: boolean;
  createdAt: string;
  coverImage?: string;
}
interface Feedback {
  id?: string;
  interviewId: string;
  userId: string;
  totalScore: number;
  categoryScores: any; // or your precise zod-inferred type
  strengths: string[];
  areasForImprovement: string[];
  finalAssessment: string;
  createdAt: string;
}

// ----------------- CREATE INTERVIEW (Admin SDK) -----------------
export async function createInterview(interviewData: Partial<Interview>) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) throw new Error("User not authenticated");

    const payload = {
      ...interviewData,
      userId: user.id,
      // Admin SDK doesn't have serverTimestamp() helper imported here,
      // so just store ISO string or use admin.firestore.FieldValue.serverTimestamp()
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection("interviews").add(payload);
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Error creating interview:", error);
    return { success: false, error: error?.message ?? "Unknown error" };
  }
}

// ----------------- CREATE FEEDBACK -----------------
export async function createFeedback(params: CreateFeedbackParams) {
  const { interviewId, userId, transcript, feedbackId } = params;

  try {
    const formattedTranscript = transcript
      .map((s) => `- ${s.role}: ${s.content}\n`)
      .join("");

    const { object } = await generateObject({
      model: google("gemini-2.0-flash-001"), // schema provided => structured output on
      schema: feedbackSchema,
      prompt: `
        You are an AI interviewer analyzing a mock interview.
        Evaluate the candidate in detail without leniency.

        Transcript:
        ${formattedTranscript}
      `,
      system: "You are a professional interviewer analyzing a mock interview.",
    });

    const feedback = {
  interviewId,
  userId,
  totalScore: object.totalScore,
  categoryScores: object.categoryScores,
  strengths: Array.isArray(object.strengths)
    ? object.strengths
    : object.strengths.split("\n").filter(Boolean), // split string into array
  areasForImprovement: Array.isArray(object.areasForImprovement)
    ? object.areasForImprovement
    : object.areasForImprovement.split("\n").filter(Boolean),
  finalAssessment: object.finalAssessment,
  createdAt: new Date().toISOString(),
};


    const ref = feedbackId
      ? db.collection("feedback").doc(feedbackId)
      : db.collection("feedback").doc();

    await ref.set(feedback);

    return { success: true, feedbackId: ref.id };
  } catch (error: any) {
    console.error("Error saving feedback:", error);
    return { success: false, error: error?.message ?? "Unknown error" };
  }
}

// ----------------- GETTERS -----------------
export async function getInterviewById(id: string): Promise<Interview | null> {
  const snap = await db.collection("interviews").doc(id).get();
  return snap.exists ? ({ id: snap.id, ...snap.data() } as Interview) : null;
}

export async function getFeedbackByInterviewId(
  params: GetFeedbackByInterviewIdParams
): Promise<Feedback | null> {
  const { interviewId, userId } = params;

  const qs = await db
    .collection("feedback")
    .where("interviewId", "==", interviewId)
    .where("userId", "==", userId)
    .limit(1)
    .get();

  if (qs.empty) return null;

  const doc = qs.docs[0];
  return { id: doc.id, ...doc.data() } as Feedback;
}

export async function getLatestInterviews(
  params: GetLatestInterviewsParams
): Promise<Interview[] | null> {
  const { userId, limit = 20 } = params;

  const qs = await db
    .collection("interviews")
    .orderBy("createdAt", "desc")
    .where("finalized", "==", true)
    .where("userId", "!=", userId)
    .limit(limit)
    .get();

  return qs.docs.map((d) => ({ id: d.id, ...d.data() } as Interview));
}

export async function getInterviewsByUserId(
  userId: string
): Promise<Interview[] | null> {
  if (!userId) {
    console.warn("getInterviewsByUserId called with undefined userId");
    return [];
  }

  const qs = await db
    .collection("interviews")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();

  console.log(`Found ${qs.size} interviews for userId: ${userId}`);

  return qs.docs.map((d) => ({ id: d.id, ...d.data() } as Interview));
}
