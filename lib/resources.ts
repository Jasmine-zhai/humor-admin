// Every admin section is described here. One shared page and set of server actions
// (app/(admin)/[resource]) reads this to list, create, edit and delete rows.

export type FieldType = "text" | "longtext" | "number" | "boolean" | "datetime" | "image" | "json";

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
  idKey?: string;
  orderBy?: string;
  fields: Field[];
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  searchKey?: string; // text column to search on
  upload?: boolean; // images: allow uploading a file
};

const created: Field = { key: "created_datetime_utc", label: "Created", type: "datetime" };

export const RESOURCES: Resource[] = [
  {
    slug: "users",
    title: "Users",
    group: "People",
    description: "Every profile in the database. Read only.",
    table: "profiles",
    select: "id, first_name, last_name, email, is_superadmin, is_matrix_admin, is_in_study, created_datetime_utc",
    searchKey: "email",
    fields: [
      { key: "first_name", label: "First name" },
      { key: "last_name", label: "Last name" },
      { key: "email", label: "Email" },
      { key: "is_superadmin", label: "Superadmin", type: "boolean" },
      { key: "is_matrix_admin", label: "Matrix admin", type: "boolean" },
      { key: "is_in_study", label: "In study", type: "boolean" },
      created,
    ],
  },
  {
    slug: "allowed-domains",
    title: "Allowed signup domains",
    group: "People",
    description: "Email domains that are allowed to sign up.",
    table: "allowed_signup_domains",
    select: "id, apex_domain, created_datetime_utc",
    searchKey: "apex_domain",
    canCreate: true, canUpdate: true, canDelete: true,
    fields: [{ key: "apex_domain", label: "Domain", editable: true, required: true }, created],
  },
  {
    slug: "whitelist",
    title: "Whitelisted emails",
    group: "People",
    description: "Individual email addresses allowed to sign up, even outside the allowed domains.",
    table: "whitelist_email_addresses",
    select: "id, email_address, created_datetime_utc",
    searchKey: "email_address",
    canCreate: true, canUpdate: true, canDelete: true,
    fields: [{ key: "email_address", label: "Email address", editable: true, required: true }, created],
  },
  {
    slug: "prompt-chains",
    title: "Prompt chains",
    group: "Prompt chains",
    description: "Humor flavors: the multi-step prompt chains that write captions. Read only.",
    table: "humor_flavors",
    select: "id, slug, description, is_pinned, created_datetime_utc",
    searchKey: "slug",
    fields: [
      { key: "id", label: "ID", type: "number" },
      { key: "slug", label: "Name" },
      { key: "description", label: "Description", type: "longtext" },
      { key: "is_pinned", label: "Pinned", type: "boolean" },
      created,
    ],
  },
  {
    slug: "prompt-chain-steps",
    title: "Prompt chain steps",
    group: "Prompt chains",
    description: "The individual LLM calls inside each prompt chain, in order. Read only.",
    table: "humor_flavor_steps",
    select: "id, humor_flavor_id, order_by, description, llm_model_id, llm_temperature, llm_system_prompt, llm_user_prompt, humor_flavors(slug), llm_models(name)",
    orderBy: "humor_flavor_id",
    searchKey: "description",
    fields: [
      { key: "humor_flavors.slug", label: "Prompt chain" },
      { key: "order_by", label: "Step", type: "number" },
      { key: "description", label: "Description" },
      { key: "llm_models.name", label: "Model" },
      { key: "llm_temperature", label: "Temperature", type: "number" },
      { key: "llm_system_prompt", label: "System prompt", type: "longtext" },
      { key: "llm_user_prompt", label: "User prompt", type: "longtext" },
    ],
  },
  {
    slug: "prompt-chain-mix",
    title: "Prompt chain mix",
    group: "Prompt chains",
    description: "How many captions each prompt chain contributes when captions are generated. Edit the counts.",
    table: "humor_flavor_mix",
    select: "id, humor_flavor_id, caption_count, humor_flavors(slug), modified_datetime_utc",
    orderBy: "humor_flavor_id",
    canUpdate: true,
    fields: [
      { key: "humor_flavors.slug", label: "Prompt chain" },
      { key: "caption_count", label: "Caption count", type: "number", editable: true, required: true },
      { key: "modified_datetime_utc", label: "Last changed", type: "datetime" },
    ],
  },
  {
    slug: "prompt-chain-runs",
    title: "Prompt chain runs",
    group: "Prompt chains",
    description: "Each time a prompt chain ran for a caption request. Read only.",
    table: "llm_prompt_chains",
    select: "id, caption_request_id, created_datetime_utc",
    fields: [
      { key: "id", label: "Run ID", type: "number" },
      { key: "caption_request_id", label: "Caption request", type: "number" },
      created,
    ],
  },
  {
    slug: "captions",
    title: "AI captions",
    group: "Generated media",
    description: "Captions the AI generated, with their images. Read only.",
    table: "captions",
    select: "id, content, like_count, is_public, humor_flavor_id, created_datetime_utc, images(url), humor_flavors(slug)",
    searchKey: "content",
    fields: [
      { key: "images.url", label: "Image", type: "image" },
      { key: "content", label: "Caption", type: "longtext" },
      { key: "humor_flavors.slug", label: "Prompt chain" },
      { key: "like_count", label: "Likes", type: "number" },
      { key: "is_public", label: "Public", type: "boolean" },
      created,
    ],
  },
  {
    slug: "images",
    title: "Images",
    group: "Generated media",
    description: "Images captions are written for. Upload new ones, edit details, or delete.",
    table: "images",
    select: "id, url, image_description, additional_context, is_public, is_common_use, created_datetime_utc",
    searchKey: "image_description",
    canCreate: true, canUpdate: true, canDelete: true, upload: true,
    fields: [
      { key: "url", label: "Image", type: "image", editable: true, required: true },
      { key: "image_description", label: "Description", type: "longtext", editable: true },
      { key: "additional_context", label: "Extra context", editable: true },
      { key: "is_public", label: "Public", type: "boolean", editable: true },
      { key: "is_common_use", label: "Common use", type: "boolean", editable: true },
      created,
    ],
  },
  {
    slug: "caption-requests",
    title: "Generation requests",
    group: "Generated media",
    description: "Every request to generate captions for an image. Read only.",
    table: "caption_requests",
    select: "id, image_id, profile_id, created_datetime_utc, images(url)",
    fields: [
      { key: "id", label: "Request ID", type: "number" },
      { key: "images.url", label: "Image", type: "image" },
      { key: "profile_id", label: "Requested by" },
      created,
    ],
  },
  {
    slug: "llm-responses",
    title: "LLM responses",
    group: "Generated media",
    description: "Raw responses from each LLM call, with timing. Read only.",
    table: "llm_model_responses",
    select: "id, caption_request_id, processing_time_seconds, llm_temperature, llm_model_response, llm_user_prompt, created_datetime_utc, llm_models(name), humor_flavors(slug)",
    fields: [
      { key: "llm_models.name", label: "Model" },
      { key: "humor_flavors.slug", label: "Prompt chain" },
      { key: "caption_request_id", label: "Request", type: "number" },
      { key: "processing_time_seconds", label: "Seconds", type: "number" },
      { key: "llm_model_response", label: "Response", type: "longtext" },
      { key: "llm_user_prompt", label: "Prompt", type: "longtext", hideInList: true },
      created,
    ],
  },
  {
    slug: "caption-examples",
    title: "Generation examples",
    group: "AI setup",
    description: "Example captions given to the AI to show what good looks like.",
    table: "caption_examples",
    select: "id, image_description, caption, explanation, priority, image_id, created_datetime_utc",
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
    slug: "terms",
    title: "Terms",
    group: "AI setup",
    description: "Slang and campus terms the AI can use, with definitions and examples.",
    table: "terms",
    select: "id, term, definition, example, priority, term_type_id, created_datetime_utc",
    searchKey: "term",
    canCreate: true, canUpdate: true, canDelete: true,
    fields: [
      { key: "term", label: "Term", editable: true, required: true },
      { key: "definition", label: "Definition", type: "longtext", editable: true, required: true },
      { key: "example", label: "Example", type: "longtext", editable: true, required: true },
      { key: "priority", label: "Priority", type: "number", editable: true },
      { key: "term_type_id", label: "Type ID", type: "number", editable: true },
    ],
  },
  {
    slug: "llm-models",
    title: "LLM models",
    group: "AI setup",
    description: "Models the prompt chains can call.",
    table: "llm_models",
    select: "id, name, provider_model_id, llm_provider_id, is_temperature_supported, llm_providers(name), created_datetime_utc",
    orderBy: "id",
    searchKey: "name",
    canCreate: true, canUpdate: true, canDelete: true,
    fields: [
      { key: "name", label: "Name", editable: true, required: true },
      { key: "provider_model_id", label: "Provider model ID", editable: true, required: true },
      { key: "llm_provider_id", label: "Provider ID", type: "number", editable: true, required: true },
      { key: "llm_providers.name", label: "Provider" },
      { key: "is_temperature_supported", label: "Supports temperature", type: "boolean", editable: true },
    ],
  },
  {
    slug: "llm-providers",
    title: "LLM providers",
    group: "AI setup",
    description: "Companies the models come from.",
    table: "llm_providers",
    select: "id, name, created_datetime_utc",
    orderBy: "id",
    canCreate: true, canUpdate: true, canDelete: true,
    fields: [
      { key: "id", label: "ID", type: "number" },
      { key: "name", label: "Name", editable: true, required: true },
      created,
    ],
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
