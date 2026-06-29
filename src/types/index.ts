// ─── 消息协议 ───

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

// ─── 工具执行 ───

export interface ToolResult {
  ok: boolean;
  name: string;
  risk: string;
  result?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
    error_type: string;
  };
  retryable: boolean;
  duration_ms: number;
}

// ─── 策略 ───

export type PolicyOutcome = 'allow' | 'ask' | 'deny';

export interface PolicyDecision {
  outcome: PolicyOutcome;
  code: string;
  reason: string;
  risk: string;
}

// ─── 上下文 ───

export interface ContextManifest {
  input_tokens: number;
  output_tokens: number;
  usable_tokens: number;
  compacted: boolean;
  omitted_groups: number;
}

// ─── 预算 ───

export interface BudgetSnapshot {
  steps: number;
  max_steps: number;
  model_calls: number;
  max_model_calls: number;
  tool_calls: number;
  max_tool_calls: number;
  input_tokens: number;
  output_tokens: number;
}

// ─── 管道节点 ───

export interface PipelineNodeData {
  id: string;
  label: string;
  type: 'model' | 'harness';
  status: 'idle' | 'active' | 'done' | 'error';
}

// ─── Step Trace ───

export interface StepTrace {
  step: number;
  phase: 'context' | 'model' | 'tool' | 'policy' | 'final';
  pipeline: PipelineNodeData[];
  messagesBefore?: Message[];
  requestBody?: Record<string, unknown>;
  responseContent?: string;
  responseToolCalls?: ToolCall[];
  finishReason?: string;
  usageInput?: number;
  usageOutput?: number;
  policyDecision?: PolicyDecision;
  toolResult?: ToolResult;
  observationContent?: string;
  finalCheck?: {
    status: string;
    reasonCode: string;
    message: string;
  };
  timing: Record<string, number>;
  budget: BudgetSnapshot;
}