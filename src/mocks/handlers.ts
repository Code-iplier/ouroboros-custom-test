import { http, HttpResponse, delay } from "msw";
import { env } from "@/config/env";
import type { Chat, Message, Project } from "@/types/chat.types";
import {
  MOCK_USER,
  MOCK_CHATS,
  MOCK_PROJECTS,
  MOCK_MESSAGES,
  MOCK_DASHBOARD,
  MOCK_DASHBOARD_RESPONSE,
  createMockTokenResponse,
  createMockChat,
  createMockProject,
} from "./data";

const API = env.API_BASE_URL;
const CHAT_STORE = [...MOCK_CHATS];
const PROJECT_STORE = [...MOCK_PROJECTS];
const MESSAGE_STORE: Record<string, Message[]> = {};
for (const [chatId, msgs] of Object.entries(MOCK_MESSAGES)) {
  MESSAGE_STORE[chatId] = [...msgs];
}

// When VITE_USE_MOCK_AUTH is "false", auth requests bypass MSW and hit
// the real backend server.  On GitHub Pages (or when the flag is absent)
// we include mock auth handlers so the demo works standalone.
const useMockAuth = import.meta.env.VITE_USE_MOCK_AUTH !== "false";

const authHandlers = useMockAuth
  ? [
      // ─── Auth ───────────────────────────────────────────────────────

      http.post(`${API}/auth/login`, async ({ request }) => {
        const body = (await request.json()) as { username?: string; password?: string };
        if (!body?.username || !body?.password) {
          return HttpResponse.json({ detail: "Invalid credentials" }, { status: 401 });
        }
        await delay(600);
        return HttpResponse.json(createMockTokenResponse(), { status: 200 });
      }),

      http.post(`${API}/auth/signup`, async () => {
        await delay(400);
        return HttpResponse.json(
          {
            user_id: "demo-user-id",
            username: "demo_user",
            phone_number: "+6591234567",
            message: "User created. Please verify your phone number.",
          },
          { status: 201 }
        );
      }),

      http.post(`${API}/auth/verify-otp`, async () => {
        await delay(400);
        return HttpResponse.json(createMockTokenResponse(), { status: 200 });
      }),

      http.post(`${API}/auth/resend-otp`, async () => {
        await delay(200);
        return HttpResponse.json(
          { message: "OTP resent", phone_number: "+6591234567" },
          { status: 200 }
        );
      }),

      http.post(`${API}/auth/refresh`, async () => {
        await delay(200);
        return HttpResponse.json(createMockTokenResponse(), { status: 200 });
      }),

      http.get(`${API}/auth/me`, async () => {
        await delay(300);
        return HttpResponse.json(MOCK_USER, { status: 200 });
      }),

      http.patch(`${API}/auth/profile`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        await delay(400);
        return HttpResponse.json(
          { ...MOCK_USER, ...body, profile_completed: true },
          { status: 200 }
        );
      }),

      http.get(`${API}/auth/profile-status`, async () => {
        await delay(200);
        return HttpResponse.json(
          { profile_completed: true, phone_verified: true },
          { status: 200 }
        );
      }),

      http.post(`${API}/auth/logout`, async () => {
        await delay(200);
        return HttpResponse.json({ message: "Logged out" }, { status: 200 });
      }),

      http.post(`${API}/auth/mfa/verify`, async () => {
        await delay(400);
        return HttpResponse.json(createMockTokenResponse(), { status: 200 });
      }),
    ]
  : [];

export const handlers = [
  ...authHandlers,

  // ─── Chats ──────────────────────────────────────────────────────

  http.get(`${API}/api/v1/chats`, async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const starred = url.searchParams.get("starred");
    const projectId = url.searchParams.get("project_id");
    const noProject = url.searchParams.get("no_project");
    let filtered = [...CHAT_STORE];
    if (starred === "true") filtered = filtered.filter((c) => c.is_starred);
    if (projectId) filtered = filtered.filter((c) => c.project_id === projectId);
    if (noProject === "true") filtered = filtered.filter((c) => !c.project_id);
    return HttpResponse.json(
      {
        chats: filtered,
        next_cursor: null,
        total_count: filtered.length,
      },
      { status: 200 }
    );
  }),

  http.post(`${API}/api/v1/chats`, async ({ request }) => {
    const body = (await request.json()) as {
      message?: string;
      project_id?: string;
    };
    await delay(400);
    const chat = createMockChat(body?.message ? "New Chat" : null, body?.project_id);
    CHAT_STORE.unshift(chat);
    MESSAGE_STORE[chat.id] = [];
    return HttpResponse.json(chat, { status: 201 });
  }),

  http.get(`${API}/api/v1/chats/:chatId`, async ({ params }) => {
    const chat = CHAT_STORE.find((c) => c.id === params.chatId);
    if (!chat) return HttpResponse.json(null, { status: 404 });
    await delay(200);
    return HttpResponse.json(chat, { status: 200 });
  }),

  http.patch(`${API}/api/v1/chats/:chatId`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const idx = CHAT_STORE.findIndex((c) => c.id === params.chatId);
    if (idx === -1) return HttpResponse.json(null, { status: 404 });
    await delay(200);
    CHAT_STORE[idx] = { ...CHAT_STORE[idx], ...body } as Chat;
    return HttpResponse.json(CHAT_STORE[idx], { status: 200 });
  }),

  http.delete(`${API}/api/v1/chats/:chatId`, async ({ params }) => {
    const idx = CHAT_STORE.findIndex((c) => c.id === params.chatId);
    if (idx > -1) CHAT_STORE.splice(idx, 1);
    await delay(200);
    return new HttpResponse(null, { status: 204 });
  }),

  // ─── Messages ───────────────────────────────────────────────────

  http.get(`${API}/api/v1/chats/:chatId/messages`, async ({ params }) => {
    await delay(400);
    const messages = MESSAGE_STORE[params.chatId as string] || [];
    return HttpResponse.json({ messages, next_cursor: null }, { status: 200 });
  }),

  http.post(`${API}/api/v1/chats/:chatId/messages`, async ({ params, request }) => {
    const body = (await request.json()) as { content: string };
    if (!body?.content) {
      return HttpResponse.json({ detail: "Message content is required" }, { status: 400 });
    }
    await delay(1200);
    const now = new Date().toISOString();
    const userMsg = {
      id: `msg-user-${Date.now()}`,
      chat_id: params.chatId as string,
      role: "user" as const,
      content: body.content,
      metadata: null,
      created_at: now,
    };
    const assistantMsg = {
      id: `msg-assist-${Date.now()}`,
      chat_id: params.chatId as string,
      role: "assistant" as const,
      content: `Thank you for your message! This is a simulated response from the Ouroboros AI assistant running in demo mode.\n\nYou said: "${body.content}"\n\nIn production, this would be processed by the agent orchestrator and routed to the appropriate AI agent.`,
      metadata: {
        agent_name: "Demo Agent",
        intent: "demo_response",
        orchestrator_thoughts: {
          intent: "respond_demo",
          reasoning: "Demo mode: returning mock response.",
        },
        routing_decision: {
          selected_agent: "Demo Agent",
          routing_reason: "Demo mode: using fallback agent.",
        },
      },
      created_at: new Date(Date.now() + 1000).toISOString(),
    };
    if (!MESSAGE_STORE[params.chatId as string]) {
      MESSAGE_STORE[params.chatId as string] = [];
    }
    MESSAGE_STORE[params.chatId as string].push(userMsg, assistantMsg);
    const chatIdx = CHAT_STORE.findIndex((c) => c.id === params.chatId);
    if (chatIdx > -1) {
      CHAT_STORE[chatIdx] = {
        ...CHAT_STORE[chatIdx],
        message_count: (CHAT_STORE[chatIdx].message_count || 0) + 2,
        updated_at: now,
      };
    }
    return HttpResponse.json(
      { user_message: userMsg, assistant_message: assistantMsg, chat: CHAT_STORE[chatIdx] || null },
      { status: 200 }
    );
  }),

  http.post(`${API}/api/v1/chats/:chatId/assistant-notice`, async ({ params, request }) => {
    const body = (await request.json()) as { content: string; metadata?: Record<string, unknown> };
    await delay(300);
    const assistantMsg = {
      id: `msg-notice-${Date.now()}`,
      chat_id: params.chatId as string,
      role: "assistant" as const,
      content: body.content,
      metadata: body.metadata || null,
      created_at: new Date().toISOString(),
    };
    if (!MESSAGE_STORE[params.chatId as string]) {
      MESSAGE_STORE[params.chatId as string] = [];
    }
    MESSAGE_STORE[params.chatId as string].push(assistantMsg);
    return HttpResponse.json(
      { assistant_message: assistantMsg, chat: CHAT_STORE.find((c) => c.id === params.chatId) },
      { status: 200 }
    );
  }),

  // ─── Projects ───────────────────────────────────────────────────

  http.get(`${API}/api/v1/projects`, async () => {
    await delay(300);
    return HttpResponse.json(
      { projects: PROJECT_STORE, next_cursor: null, total_count: PROJECT_STORE.length },
      { status: 200 }
    );
  }),

  http.post(`${API}/api/v1/projects`, async ({ request }) => {
    const body = (await request.json()) as { name: string };
    await delay(400);
    const project = createMockProject(body.name);
    PROJECT_STORE.unshift(project);
    return HttpResponse.json(project, { status: 201 });
  }),

  http.get(`${API}/api/v1/projects/:projectId`, async ({ params }) => {
    const project = PROJECT_STORE.find((p) => p.id === params.projectId);
    if (!project) return HttpResponse.json(null, { status: 404 });
    await delay(200);
    return HttpResponse.json(project, { status: 200 });
  }),

  http.patch(`${API}/api/v1/projects/:projectId`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const idx = PROJECT_STORE.findIndex((p) => p.id === params.projectId);
    if (idx === -1) return HttpResponse.json(null, { status: 404 });
    await delay(200);
    PROJECT_STORE[idx] = { ...PROJECT_STORE[idx], ...body } as Project;
    return HttpResponse.json(PROJECT_STORE[idx], { status: 200 });
  }),

  http.delete(`${API}/api/v1/projects/:projectId`, async ({ params }) => {
    const idx = PROJECT_STORE.findIndex((p) => p.id === params.projectId);
    if (idx > -1) PROJECT_STORE.splice(idx, 1);
    await delay(200);
    return new HttpResponse(null, { status: 204 });
  }),

  // ─── Discovery / Dashboard ──────────────────────────────────────

  http.get(`${API}/api/v1/discover/dashboard`, async () => {
    await delay(500);
    return HttpResponse.json(MOCK_DASHBOARD_RESPONSE, { status: 200 });
  }),

  http.post(`${API}/api/v1/discover`, async () => {
    await delay(2000);
    return HttpResponse.json(
      {
        workflow_id: `wf-demo-${Date.now()}`,
        status: "completed",
        version: 1,
        dashboard: MOCK_DASHBOARD,
      },
      { status: 201 }
    );
  }),

  http.get(`${API}/api/v1/discover/result/:workflowId`, async () => {
    await delay(300);
    return HttpResponse.json(
      {
        workflow_id: "wf-demo-001",
        user_id: "demo-user-id",
        status: "success",
        version: 1,
        is_latest: true,
        dashboard: MOCK_DASHBOARD,
        raw_outputs: {},
      },
      { status: 200 }
    );
  }),

  // ─── Applications ───────────────────────────────────────────────

  http.get(`${API}/api/v1/applications`, async () => {
    await delay(300);
    return HttpResponse.json({ items: [], total: 0 }, { status: 200 });
  }),

  http.post(`${API}/api/v1/applications/start`, async () => {
    await delay(400);
    return HttpResponse.json(
      { id: "app-demo-1", status: "draft", message: "Application started" },
      { status: 201 }
    );
  }),

  http.post(`${API}/api/v1/applications/:id/generate-sop`, async () => {
    await delay(1500);
    return HttpResponse.json(
      {
        content:
          "# Statement of Purpose\n\nThis is a demo SOP generated by the AI assistant.\n\n[Full content would be generated in production...]",
      },
      { status: 200 }
    );
  }),

  http.post(`${API}/api/v1/applications/:id/generate-cover-letter`, async () => {
    await delay(1500);
    return HttpResponse.json(
      {
        content:
          "# Cover Letter\n\nThis is a demo cover letter generated by the AI assistant.\n\n[Full content would be generated in production...]",
      },
      { status: 200 }
    );
  }),

  // ─── Workflows (profile upload) ─────────────────────────────────

  http.post(`${API}/api/v1/workflows/profile-document`, async () => {
    await delay(800);
    return HttpResponse.json(
      { workflow_id: `wf-upload-${Date.now()}`, status: "completed" },
      { status: 201 }
    );
  }),

  // ─── Health ─────────────────────────────────────────────────────

  http.get(`${API}/health`, async () => {
    return HttpResponse.json({ status: "ok" }, { status: 200 });
  }),
];
