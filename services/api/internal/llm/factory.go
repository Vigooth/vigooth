package llm

import (
	"fmt"
	"os"
)

func NewProviderFromEnv() (Provider, error) {
	provider := os.Getenv("LLM_PROVIDER")
	if provider == "" {
		provider = "anthropic"
	}

	apiKey := os.Getenv("LLM_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("LLM_API_KEY environment variable is required")
	}

	model := os.Getenv("LLM_MODEL")

	switch provider {
	case "anthropic":
		return NewAnthropicProvider(apiKey, model), nil
	case "openai":
		baseURL := os.Getenv("LLM_BASE_URL")
		return NewOpenAIProvider(apiKey, model, baseURL), nil
	default:
		return nil, fmt.Errorf("unknown LLM provider: %s (supported: anthropic, openai)", provider)
	}
}
