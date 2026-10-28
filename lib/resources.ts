// The Week 7 admin sections. One shared page and set of server actions (app/(admin)/[resource])
// reads this to list, create, edit and delete rows. The Week 6 pages (Overview, Users, AI captions,
// Likes & votes) have their own pages.

export type FieldType = "text" | "longtext" | "number" | "boolean" | "datetime" | "image";

export type Field = {
  key: string; // column name, or "table.column" for a joined column (read only)
  label: string;
  type?: FieldType;
  editable?: boolean; // can be set when creating or editing
  required?: boolean;
  hideInList?: boolean;
};

export type Resource = {
  slug: string;
  title: string;
  group: string;
  description: string;
  table: string;
  select: string;
  orderBy?: string; // ascending sort column; default is newest first by created_at
  fields: Field[];
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  searchKey?: string;
  upload?: boolean; // allow uploading an image file
  ownerColumn?: string; // filled with the admin's user id on create
};

const created: Field = { key: "created_at", label: "Created", type: "datetime" };

export const RESOURCES: Resource[] = [
  {
    slug: "prompt-chains",
    title: "Prompt chains",
    group: "Caption pipeline",
    description: "The prompt chain the caption generator uses. The active one runs when someone cooks up captions.",
    table: "prompt_chains",
    select: "id, name, description, is_active, created_at",
    orderBy: "id",
    fields: [
      { key: "id", label: "ID", type: "number" },
      { key: "name", label: "Name" },
      { key: "description", label: "Description", type: "longtext" },
      { key: "is_active", label: "Active", type: "boolean" },
      created,
    ],
  },
  {
    slug: "prompt-chain-steps",
    title: "Prompt chain steps",
    group: "Caption pipeline",
    description: "The prompts inside each chain. Placeholders {topic}, {idea}, {terms}, {examples} and {count} get filled in for each meme.",
    table: "prompt_chain_steps",
    select: "id, prompt_chain_id, step_order, description, system_prompt, user_prompt, temperature, prompt_chains(name)",
    orderBy: "prompt_chain_id",
    fields: [
      { key: "prompt_chains.name", label: "Prompt chain" },
      { key: "step_order", label: "Step", type: "number" },
      { key: "description", label: "Description" },
      { key: "temperature", label: "Temperature", type: "number" },
      { key: "system_prompt", label: "System prompt", type: "longtext" },
      { key: "user_prompt", label: "User prompt", type: "longtext" },
    ],
  },
  {
    slug: "prompt-chain-mix",
    title: "Prompt chain mix",
    group: "Caption pipeline",
    description: "How many captions each prompt chain writes per meme (1 to 6).",
    table: "prompt_chain_mix",
    select: "id, prompt_chain_id, caption_count, updated_at, prompt_chains(name)",
    orderBy: "prompt_chain_id",
    canUpdate: true,
    fields: [
      { key: "prompt_chains.name", label: "Prompt chain" },
      { key: "caption_count", label: "Captions per meme", type: "number", editable: true, required: true },
      { key: "updated_at", label: "Last changed", type: "datetime" },
    ],
  },
  {
    slug: "generation-requests",
    title: "Generation requests",
    group: "Caption pipeline",
    description: "Every time someone asked the AI for captions, whether it worked, which model answered and how long it took.",
    table: "generation_requests",
    select: "id, post_id, status, model, duration_ms, idea, error, created_at, topics(name), posts(image_url)",
    fields: [
      { key: "posts.image_url", label: "Meme", type: "image" },
      { key: "topics.name", label: "Chat" },
      { key: "status", label: "Status" },
      { key: "model", label: "Model" },
      { key: "duration_ms", label: "Time (ms)", type: "number" },
      { key: "idea", label: "Hint" },
      { key: "error", label: "Error", type: "longtext", hideInList: true },
      created,
    ],
  },
  {
    slug: "llm-responses",
    title: "LLM responses",
    group: "Caption pipeline",
    description: "Every individual call to an AI model, including failed and slower ones that lost the race.",
    table: "llm_responses",
    select: "id, generation_request_id, model, status_code, duration_ms, response, prompt, created_at",
    fields: [
      { key: "generation_request_id", label: "Request", type: "number" },
      { key: "model", label: "Model" },
      { key: "status_code", label: "HTTP status", type: "number" },
      { key: "duration_ms", label: "Time (ms)", type: "number" },
      { key: "response", label: "Response", type: "longtext" },
      { key: "prompt", label: "Prompt", type: "longtext", hideInList: true },
      created,
    ],
  },
  {
    slug: "terms",
    title: "Terms",
    group: "AI setup",
    description: "Columbia terms and slang that get added to the caption prompt. Higher priority terms go first.",
    table: "terms",
    select: "id, term, definition, example, priority, created_at",
    orderBy: "term",
    searchKey: "term",
    canCreate: true, canUpdate: true, canDelete: true,
    fields: [
      { key: "term", label: "Term", editable: true, required: true },
      { key: "definition", label: "Definition", type: "longtext", editable: true, required: true },
      { key: "example", label: "Example", type: "longtext", editable: true, required: true },
      { key: "priority", label: "Priority", type: "number", editable: true },
    ],
  },
  {
    slug: "generation-examples",
    title: "Generation examples",
    group: "AI setup",
    description: "Example captions shown to the AI so it knows the style we like.",
    table: "generation_examples",
    select: "id, image_description, caption, explanation, priority, created_at",
    searchKey: "caption",
    canCreate: true, canUpdate: true, canDelete: true,
    fields: [
      { key: "caption", label: "Caption", type: "longtext", editable: true, required: true },
      { key: "image_description", label: "Image description", type: "longtext", editable: true, required: true },
      { key: "explanation", label: "Why it works", type: "longtext", editable: true, required: true },
      { key: "priority", label: "Priority", type: "number", editable: true },
      created,
    ],
  },
  {
    slug: "llm-models",
    title: "LLM models",
    group: "AI setup",
    description: "Models the caption generator asks at the same time. Turn one off to stop using it.",
    table: "llm_models",
    select: "id, name, provider_model_id, llm_provider_id, is_active, priority, llm_providers(name)",
    orderBy: "priority",
    searchKey: "name",
    canCreate: true, canUpdate: true, canDelete: true,
    fields: [
      { key: "name", label: "Name", editable: true, required: true },
      { key: "provider_model_id", label: "Model ID (as the API calls it)", editable: true, required: true },
      { key: "llm_provider_id", label: "Provider ID", type: "number", editable: true, required: true },
      { key: "llm_providers.name", label: "Provider" },
      { key: "is_active", label: "Active", type: "boolean", editable: true },
      { key: "priority", label: "Priority", type: "number", editable: true },
    ],
  },
  {
    slug: "llm-providers",
    title: "LLM providers",
    group: "AI setup",
    description: "Companies the models come from.",
    table: "llm_providers",
    select: "id, name, created_at",
    orderBy: "id",
    canCreate: true, canUpdate: true, canDelete: true,
    fields: [
      { key: "id", label: "ID", type: "number" },
      { key: "name", label: "Name", editable: true, required: true },
      created,
    ],
  },
  {
    slug: "images",
    title: "Images",
    group: "Content",
    description: "Meme images people posted. Upload a new one, swap an image, or delete a meme.",
    table: "posts",
    select: "id, image_url, topic_id, idea, published, created_at, topics(name)",
    canCreate: true, canUpdate: true, canDelete: true, upload: true,
    ownerColumn: "user_id",
    fields: [
      { key: "image_url", label: "Image", type: "image", editable: true, required: true },
      { key: "topics.name", label: "Chat" },
      { key: "topic_id", label: "Chat ID", type: "number", editable: true, required: true, hideInList: true },
      { key: "idea", label: "Hint", editable: true },
      { key: "published", label: "In feed", type: "boolean" },
      created,
    ],
  },
  {
    slug: "allowed-domains",
    title: "Allowed signup domains",
    group: "Signup rules",
    description: "If you add any domains, only emails from them (or whitelisted emails) can sign in. Leave empty to allow everyone.",
    table: "allowed_signup_domains",
    select: "id, apex_domain, created_at",
    searchKey: "apex_domain",
    canCreate: true, canUpdate: true, canDelete: true,
    fields: [{ key: "apex_domain", label: "Domain (like columbia.edu)", editable: true, required: true }, created],
  },
  {
    slug: "whitelist",
    title: "Whitelisted emails",
    group: "Signup rules",
    description: "Individual emails that can always sign in, even outside the allowed domains.",
    table: "whitelisted_emails",
    select: "id, email, created_at",
    searchKey: "email",
    canCreate: true, canUpdate: true, canDelete: true,
    fields: [{ key: "email", label: "Email", editable: true, required: true }, created],
  },
];

export function getResource(slug: string) {
  return RESOURCES.find((r) => r.slug === slug);
}

// Read "a.b" from a row whose joined tables come back as nested objects
export function readValue(row: Record<string, unknown>, key: string): unknown {
  return key.split(".").reduce<unknown>((value, part) => {
    if (value && typeof value === "object") return (value as Record<string, unknown>)[part];
    return undefined;
  }, row);
}
