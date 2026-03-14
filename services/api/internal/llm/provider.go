package llm

import (
	"context"
	"encoding/json"
)

type Message struct {
	Role       string       `json:"role"` // "system", "user", "assistant", "tool"
	Content    string       `json:"content"`
	ToolCalls  []ToolCall   `json:"tool_calls,omitempty"`
	ToolResult *ToolResult  `json:"tool_result,omitempty"`
}

type ToolCall struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Arguments string `json:"arguments"`
}

type ToolResult struct {
	ToolCallID string `json:"tool_call_id"`
	Content    string `json:"content"`
}

type Tool struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Parameters  json.RawMessage `json:"parameters"`
}

type Usage struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
}

type Response struct {
	Content    string     `json:"content"`
	ToolCalls  []ToolCall `json:"tool_calls,omitempty"`
	StopReason string     `json:"stop_reason"`
	Usage      Usage      `json:"usage"`
}

type Provider interface {
	Chat(ctx context.Context, messages []Message, tools []Tool) (*Response, error)
}
