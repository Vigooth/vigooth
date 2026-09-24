package modelgen

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Meshy's image-to-3D API. A task is created, then polled until it lands; the
// model is downloaded from their CDN when it does.
const meshyEndpoint = "https://api.meshy.ai/openapi/v1/image-to-3d"

// meshyPolycount keeps the mesh light enough to stand a dozen times in a phone's
// walk: an image-to-3D default is several hundred thousand triangles.
const meshyPolycount = 15000

type Meshy struct {
	apiKey   string
	client   *http.Client
	maxBytes int64
}

// NewMeshy builds a generator against Meshy. maxBytes caps the downloaded
// model, one byte past the ceiling so the caller can reject on size.
func NewMeshy(apiKey string, maxBytes int64) *Meshy {
	return &Meshy{
		apiKey:   apiKey,
		maxBytes: maxBytes,
		// The generous timeout is for the model download at the end, which can
		// be a few megabytes from a CDN; the API calls themselves are quick.
		client: &http.Client{Timeout: 60 * time.Second},
	}
}

func (m *Meshy) Name() string { return "Meshy" }

type meshyCreateResponse struct {
	Result string `json:"result"`
}

type meshyTaskResponse struct {
	Status    string `json:"status"`
	Progress  int    `json:"progress"`
	ModelURLs struct {
		GLB string `json:"glb"`
	} `json:"model_urls"`
	TaskError struct {
		Message string `json:"message"`
	} `json:"task_error"`
}

func (m *Meshy) call(method, url string, body any, out any) error {
	var payload io.Reader
	if body != nil {
		encoded, err := json.Marshal(body)
		if err != nil {
			return err
		}
		payload = bytes.NewReader(encoded)
	}
	request, err := http.NewRequest(method, url, payload)
	if err != nil {
		return err
	}
	request.Header.Set("Authorization", "Bearer "+m.apiKey)
	if body != nil {
		request.Header.Set("Content-Type", "application/json")
	}

	response, err := m.client.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()

	raw, err := io.ReadAll(io.LimitReader(response.Body, 1<<20))
	if err != nil {
		return err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return fmt.Errorf("meshy answered %d: %s", response.StatusCode, bytes.TrimSpace(raw))
	}
	return json.Unmarshal(raw, out)
}

func (m *Meshy) Start(photo []byte, mime string) (string, error) {
	if mime == "" {
		mime = "image/jpeg"
	}
	// The photo travels inline: the API is the only thing that can read it, so
	// there is no public URL to hand over instead.
	body := map[string]any{
		"image_url":        "data:" + mime + ";base64," + base64.StdEncoding.EncodeToString(photo),
		"ai_model":         "latest",
		"should_texture":   true,
		"enable_pbr":       false,
		"should_remesh":    true,
		"target_polycount": meshyPolycount,
		"target_formats":   []string{"glb"},
	}
	var created meshyCreateResponse
	if err := m.call(http.MethodPost, meshyEndpoint, body, &created); err != nil {
		return "", err
	}
	if created.Result == "" {
		return "", fmt.Errorf("meshy returned no task id")
	}
	return created.Result, nil
}

func (m *Meshy) Check(taskID string) (*Task, error) {
	var remote meshyTaskResponse
	if err := m.call(http.MethodGet, meshyEndpoint+"/"+taskID, nil, &remote); err != nil {
		return nil, err
	}

	switch remote.Status {
	case "SUCCEEDED":
		if remote.ModelURLs.GLB == "" {
			return &Task{Status: StatusFailed, Progress: 100, Error: "aucun fichier glb dans le résultat"}, nil
		}
		data, err := m.download(remote.ModelURLs.GLB)
		if err != nil {
			return nil, fmt.Errorf("download: %w", err)
		}
		return &Task{Status: StatusSucceeded, Progress: 100, Model: data}, nil
	case "FAILED", "CANCELED":
		message := remote.TaskError.Message
		if message == "" {
			message = "la génération a échoué"
		}
		return &Task{Status: StatusFailed, Progress: remote.Progress, Error: message}, nil
	case "IN_PROGRESS":
		return &Task{Status: StatusRunning, Progress: remote.Progress}, nil
	default:
		return &Task{Status: StatusPending, Progress: remote.Progress}, nil
	}
}

func (m *Meshy) download(url string) ([]byte, error) {
	response, err := m.client.Get(url)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("status %d", response.StatusCode)
	}
	return io.ReadAll(io.LimitReader(response.Body, m.maxBytes))
}
