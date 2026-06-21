import type { User, TokenResponse } from "@/types/auth";
import type { Chat, Message, Project } from "@/types/chat.types";
import type { DashboardView, DashboardResponse } from "@/types/results.types";

export const MOCK_USER: User = {
  id: "demo-user-id",
  username: "demo_user",
  phone_number: "+6591234567",
  phone_country_code: "+65",
  phone_verified: true,
  first_name: "Demo",
  last_name: "User",
  gender: null,
  email: "demo@example.com",
  about_me: "AI enthusiast and demo user.",
  profession: "Researcher",
  interest: "research",
  profile_completed: true,
  mfa_enabled: false,
  is_active: true,
  last_login: new Date().toISOString(),
  last_active: new Date().toISOString(),
  created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
  updated_at: new Date().toISOString(),
};

export function createMockTokenResponse(user: User = MOCK_USER): TokenResponse {
  return {
    access_token: "mock-access-token-demo",
    refresh_token: "mock-refresh-token-demo",
    token_type: "bearer",
    expires_in: 3600,
    user,
  };
}

export const MOCK_CHATS: Chat[] = [
  {
    id: "chat-1",
    title: "Research Programs in Singapore",
    status: "active",
    is_starred: true,
    project_id: "proj-1",
    message_count: 12,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "chat-2",
    title: "Scholarship Application Help",
    status: "active",
    is_starred: false,
    project_id: null,
    message_count: 8,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "chat-3",
    title: "Profile Optimization",
    status: "active",
    is_starred: false,
    project_id: "proj-1",
    message_count: 5,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 10800000).toISOString(),
  },
  {
    id: "chat-4",
    title: "Cover Letter Draft",
    status: "active",
    is_starred: true,
    project_id: "proj-2",
    message_count: 15,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: "chat-5",
    title: null,
    status: "active",
    is_starred: false,
    project_id: null,
    message_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export function createMockChat(title: string | null, projectId?: string): Chat {
  return {
    id: `chat-${Date.now()}`,
    title,
    status: "active",
    is_starred: false,
    project_id: projectId ?? null,
    message_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export const MOCK_MESSAGES: Record<string, Message[]> = {
  "chat-1": [
    {
      id: "msg-1",
      chat_id: "chat-1",
      role: "user",
      content: "Can you help me find research programs in Singapore?",
      metadata: null,
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: "msg-2",
      chat_id: "chat-1",
      role: "assistant",
      content:
        "I'd be happy to help! Let me search for research programs available in Singapore.\n\nHere are some top research programs I found:\n\n1. **NUS Research Scholarship** — National University of Singapore\n   - Fields: STEM, Social Sciences\n   - Deadline: Rolling admissions\n\n2. **NTU Research Fellowship** — Nanyang Technological University\n   - Fields: Engineering, Life Sciences\n   - Deadline: Quarterly reviews\n\n3. **A*STAR Graduate Scholarship**\n   - Focus: Biomedical sciences, physical sciences\n   - Deadline: Varies by track\n\nWould you like me to dive deeper into any of these?",
      metadata: {
        agent_name: "Research Agent",
        intent: "search_programs",
        orchestrator_thoughts: {
          intent: "discover_programs",
          reasoning: "User wants research programs. Querying Singapore institution database.",
        },
        routing_decision: {
          selected_agent: "Research Agent",
          routing_reason: "Program discovery matches Research Agent capabilities.",
        },
      },
      created_at: new Date(Date.now() - 86400000 * 3 + 5000).toISOString(),
    },
    {
      id: "msg-3",
      chat_id: "chat-1",
      role: "user",
      content: "Tell me more about the NUS Research Scholarship",
      metadata: null,
      created_at: new Date(Date.now() - 86400000 * 3 + 30000).toISOString(),
    },
    {
      id: "msg-4",
      chat_id: "chat-1",
      role: "assistant",
      content:
        "## NUS Research Scholarship Details\n\n**University:** National University of Singapore\n**Type:** Full-time research\n**Coverage:**\n- Full tuition fee waiver\n- Monthly stipend of SGD 2,200 (master's) / SGD 3,200 (PhD)\n- Book allowance\n- Conference travel support\n\n**Eligibility:**\n- Bachelor's degree with minimum 2nd Upper Honours\n- Strong research proposal\n- English proficiency (IELTS 6.5+ / TOEFL 90+)\n\n**Application Deadline:** Rolling (check specific faculty)\n\nWould you like me to start an application for this program?",
      metadata: {
        agent_name: "Research Agent",
        intent: "program_details",
      },
      created_at: new Date(Date.now() - 86400000 * 3 + 35000).toISOString(),
    },
  ],
  "chat-2": [
    {
      id: "msg-5",
      chat_id: "chat-2",
      role: "user",
      content: "I need help finding scholarships for international students.",
      metadata: null,
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: "msg-6",
      chat_id: "chat-2",
      role: "assistant",
      content:
        "I can help with that! Let me search for available scholarships.\n\nHere are some scholarships you might be eligible for:\n\n🌍 **Singapore International Graduate Award (SINGA)**\n- Covers tuition + stipend of SGD 2,200/month\n- For PhD studies in Singapore\n\n🌍 **Masters Scholarship for International Students**\n- Partial tuition coverage\n- Various universities\n\nWhat's your field of interest and target country?",
      metadata: {
        agent_name: "Scholarship Agent",
        intent: "search_scholarships",
      },
      created_at: new Date(Date.now() - 86400000 * 2 + 5000).toISOString(),
    },
  ],
  "chat-3": [
    {
      id: "msg-7",
      chat_id: "chat-3",
      role: "system",
      content: "System: Profile optimization session started.",
      metadata: null,
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "msg-8",
      chat_id: "chat-3",
      role: "user",
      content: "Can you review my profile and suggest improvements?",
      metadata: null,
      created_at: new Date(Date.now() - 86400000 + 10000).toISOString(),
    },
    {
      id: "msg-9",
      chat_id: "chat-3",
      role: "assistant",
      content:
        "I've reviewed your profile. Here are my suggestions:\n\n✅ **Strengths:**\n- Strong academic background\n- Clear research interests\n\n💡 **Areas for improvement:**\n- Add a professional summary/objective\n- Include relevant project experience\n- List technical skills in detail\n\nWould you like me to help you draft any of these sections?",
      metadata: {
        agent_name: "Profile Agent",
        intent: "profile_review",
        profile_gate: { status: "passed" },
      },
      created_at: new Date(Date.now() - 86400000 + 15000).toISOString(),
    },
  ],
  "chat-4": [
    {
      id: "msg-10",
      chat_id: "chat-4",
      role: "user",
      content: "Help me write a cover letter for the NUS Research Scholarship.",
      metadata: null,
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      id: "msg-11",
      chat_id: "chat-4",
      role: "assistant",
      content:
        "I'd be happy to help draft a cover letter! First, let me gather some information.\n\nCould you tell me:\n1. **Your research area** (e.g., AI, Biotechnology, etc.)\n2. **Any specific professor** you'd like to work with\n3. **Key achievements** you want to highlight\n\nHere's a template to start:\n\n---\n\nDear Admissions Committee,\n\nI am writing to express my strong interest in the NUS Research Scholarship. With a background in [field] and a passion for [research interest], I am excited about the opportunity to contribute to NUS's vibrant research community.\n\n[Your content here...]\n\n---\n\nLet me know your answers and I'll personalize it!",
      metadata: {
        agent_name: "Writing Agent",
        intent: "generate_cover_letter",
      },
      created_at: new Date(Date.now() - 86400000 * 5 + 5000).toISOString(),
    },
  ],
};

export const MOCK_PROJECTS: Project[] = [
  {
    id: "proj-1",
    name: "Singapore Applications",
    description: "All applications and research programs in Singapore",
    color: "blue",
    icon: "graduation-cap",
    chat_count: 2,
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "proj-2",
    name: "Scholarships",
    description: "Scholarship applications and cover letters",
    color: "green",
    icon: "award",
    chat_count: 1,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: "proj-3",
    name: "Profile Building",
    description: "Profile optimization and CV improvements",
    color: "purple",
    icon: "user-pen",
    chat_count: 0,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
  },
];

export function createMockProject(name: string): Project {
  return {
    id: `proj-${Date.now()}`,
    name,
    description: null,
    color: null,
    icon: null,
    chat_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export const MOCK_DASHBOARD: DashboardView = {
  workflow_id: "wf-demo-001",
  status: "success",
  version: 1,
  generated_at: new Date().toISOString(),
  profile: {
    name: "Demo User",
    field: "Computer Science",
    education: "Bachelor's in CS",
  },
  programs: {
    items: [
      {
        id: "prog-1",
        program_name: "PhD in Computer Science",
        institution_name: "National University of Singapore",
        institution_country: "Singapore",
        deadline: "2026-12-15",
        match: { match_score: 92, confidence_level: "high" },
      },
      {
        id: "prog-2",
        program_name: "Master in AI Research",
        institution_name: "Nanyang Technological University",
        institution_country: "Singapore",
        deadline: "2026-11-30",
        match: { match_score: 85, confidence_level: "high" },
      },
      {
        id: "prog-3",
        program_name: "Research Fellowship in Machine Learning",
        institution_name: "A*STAR Research",
        institution_country: "Singapore",
        deadline: "2027-01-15",
        match: { match_score: 78, confidence_level: "medium" },
      },
    ],
    total: 3,
  },
  scholarships: {
    items: [
      {
        id: "schol-1",
        name: "Singapore International Graduate Award (SINGA)",
        provider: "Singapore Government",
        deadline: "2026-12-01",
        funding_amount: 26400,
        currency: "SGD",
        match: { match_score: 95, confidence_level: "high" },
      },
      {
        id: "schol-2",
        name: "NUS Research Scholarship",
        provider: "National University of Singapore",
        deadline: "2027-03-01",
        funding_amount: 38400,
        currency: "SGD",
        match: { match_score: 88, confidence_level: "high" },
      },
    ],
    total: 2,
  },
  matches: {
    items: [
      {
        entity_type: "program",
        entity_id: "prog-1",
        match_result: {
          id: "match-1",
          match_score: 92,
          confidence_level: "high",
          entity_type: "program",
          entity_id: "prog-1",
        },
      },
    ],
    total: 1,
  },
  agents: {
    scheduler: { status: "completed" },
    researcher: { status: "completed", programs_found: 3 },
    matcher: { status: "completed", matches_found: 1 },
  },
};

export const MOCK_DASHBOARD_RESPONSE: DashboardResponse = {
  has_results: true,
  latest_workflow_id: "wf-demo-001",
  dashboard: MOCK_DASHBOARD,
  history: [
    {
      workflow_id: "wf-demo-001",
      status: "success",
      version: 1,
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
  ],
};
