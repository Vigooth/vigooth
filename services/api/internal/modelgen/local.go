package modelgen

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

// Local runs TripoSR on this machine through apps/garden/scripts/photo-to-3d.sh.
//
// Only sensible where the API and a capable machine are the same box — the
// developer's laptop. The script installs TripoSR on first use, so the first
// generation after a fresh checkout takes minutes; later ones about half a
// minute on an M-series chip. Tasks live in memory: a restart forgets them,
// which is fine for something that only exists in dev.
type Local struct {
	script string
	mu     sync.Mutex
	tasks  map[string]*Task
}

// NewLocal points at the script. It does not check that TripoSR is installed;
// the script does that itself on the first run.
func NewLocal(script string) *Local {
	return &Local{script: script, tasks: map[string]*Task{}}
}

func (l *Local) Name() string { return "TripoSR (local)" }

// Progress the script's milestone lines map to. Real progress is opaque inside
// TripoSR, so the bar moves in steps; better than a spinner for a minute-long wait.
var localMilestones = []struct {
	marker   string
	progress int
}{
	{"Installing", 5},
	{"Install complete", 20},
	{"Reconstructing", 30},
	{"Packing", 85},
	{"Model written", 95},
}

func (l *Local) Start(photo []byte, mime string) (string, error) {
	if _, err := os.Stat(l.script); err != nil {
		return "", fmt.Errorf("script not found at %s", l.script)
	}

	dir, err := os.MkdirTemp("", "garden-model-")
	if err != nil {
		return "", err
	}
	ext := ".jpg"
	if strings.Contains(mime, "png") {
		ext = ".png"
	} else if strings.Contains(mime, "webp") {
		ext = ".webp"
	}
	photoPath := filepath.Join(dir, "photo"+ext)
	if err := os.WriteFile(photoPath, photo, 0o600); err != nil {
		os.RemoveAll(dir)
		return "", err
	}

	id := uuid.New().String()
	task := &Task{Status: StatusPending}
	l.mu.Lock()
	l.tasks[id] = task
	l.mu.Unlock()

	go l.run(task, dir, photoPath, filepath.Join(dir, "model.glb"))
	return id, nil
}

func (l *Local) run(task *Task, dir, photoPath, outPath string) {
	defer os.RemoveAll(dir)

	cmd := exec.Command("bash", l.script, photoPath, "--out", outPath, "--resolution", "200")
	// The script sources a venv and calls python; a bare environment would hide
	// Homebrew's python3.13 from it.
	cmd.Env = os.Environ()
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		l.fail(task, err.Error())
		return
	}
	cmd.Stderr = cmd.Stdout
	if err := cmd.Start(); err != nil {
		l.fail(task, err.Error())
		return
	}

	l.set(task, StatusRunning, 2)
	var lastLines []string
	scanner := bufio.NewScanner(stdout)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	for scanner.Scan() {
		line := scanner.Text()
		lastLines = append(lastLines, line)
		if len(lastLines) > 8 {
			lastLines = lastLines[1:]
		}
		for _, milestone := range localMilestones {
			if strings.Contains(line, milestone.marker) {
				l.set(task, StatusRunning, milestone.progress)
			}
		}
	}
	// Drain anything the scanner gave up on, so the process can exit.
	_, _ = io.Copy(io.Discard, stdout)

	if err := cmd.Wait(); err != nil {
		l.fail(task, "TripoSR a échoué : "+tail(lastLines))
		return
	}
	data, err := os.ReadFile(outPath)
	if err != nil {
		l.fail(task, "aucun modèle produit")
		return
	}

	l.mu.Lock()
	task.Status = StatusSucceeded
	task.Progress = 100
	task.Model = data
	l.mu.Unlock()
}

func tail(lines []string) string {
	for i := len(lines) - 1; i >= 0; i-- {
		if trimmed := strings.TrimSpace(lines[i]); trimmed != "" {
			return trimmed
		}
	}
	return "voir les logs de l'API"
}

func (l *Local) set(task *Task, status Status, progress int) {
	l.mu.Lock()
	defer l.mu.Unlock()
	task.Status = status
	if progress > task.Progress {
		task.Progress = progress
	}
}

func (l *Local) fail(task *Task, message string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	task.Status = StatusFailed
	task.Error = message
}

func (l *Local) Check(taskID string) (*Task, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	task, ok := l.tasks[taskID]
	if !ok {
		return nil, ErrUnknownTask
	}
	snapshot := *task
	if task.Status == StatusSucceeded && task.Model != nil {
		// Hand the bytes over once; the handler stores them. Forget the task a
		// little later so a retried poll still gets a clean "succeeded".
		task.Model = nil
		go func() {
			time.Sleep(time.Minute)
			l.mu.Lock()
			delete(l.tasks, taskID)
			l.mu.Unlock()
		}()
	}
	return &snapshot, nil
}
