// Package modelgen turns one plant photo into a glTF binary.
//
// Two ways exist: Meshy's hosted API, and TripoSR run locally through
// apps/garden/scripts/photo-to-3d.sh. Both are asynchronous from the caller's
// point of view — start a task, poll it — so they share one interface and the
// HTTP handler cannot tell them apart.
package modelgen

import "errors"

// Status of a task, in the vocabulary the frontend polls for.
type Status string

const (
	StatusPending   Status = "pending"
	StatusRunning   Status = "running"
	StatusSucceeded Status = "succeeded"
	StatusFailed    Status = "failed"
)

// Task is a snapshot of one generation.
type Task struct {
	Status   Status
	Progress int
	// Set once, with StatusSucceeded: the glb bytes. The caller stores them.
	Model []byte
	// Set with StatusFailed: what went wrong, fit to show a person.
	Error string
}

var ErrUnknownTask = errors.New("unknown generation task")

// Generator is one way of making a model from a photo.
type Generator interface {
	// Name, for the startup log and the garden payload.
	Name() string
	// Start a generation from raw image bytes; returns a task id to poll.
	Start(photo []byte, mime string) (string, error)
	// Check where a task stands. A succeeded task carries its model exactly
	// once; asking again after that returns the status without the bytes.
	Check(taskID string) (*Task, error)
}
