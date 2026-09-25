package handler

import (
	"errors"
	"net/http"

	"github.com/Vigooth/vigooth/services/api/internal/modelgen"
	"github.com/Vigooth/vigooth/services/api/internal/service"
	"github.com/gin-gonic/gin"
)

// PlantModelGenHandler turns a plant's stored photo into its 3D model through
// whichever generator the server was started with — Meshy's API or a local
// TripoSR. Generation is asynchronous: Start returns a task id, Check reports
// progress and, on success, stores the model in the same call. A browser tab
// closed mid-way loses nothing: the next Check for that task still stores it.
type PlantModelGenHandler struct {
	generator     modelgen.Generator
	gardenService *service.GardenService
}

func NewPlantModelGenHandler(generator modelgen.Generator, gardenService *service.GardenService) *PlantModelGenHandler {
	return &PlantModelGenHandler{generator: generator, gardenService: gardenService}
}

// Start creates the generation task from the plant's stored photo.
//
// POST /api/garden/plants/:id/model/generate → { "task_id": "..." }
func (h *PlantModelGenHandler) Start(c *gin.Context) {
	photo, mime, err := h.gardenService.GetPlantPhoto(c.GetString("userID"), c.Param("id"))
	if err != nil {
		respondGardenError(c, err, "failed to load photo")
		return
	}

	taskID, err := h.generator.Start(photo, mime)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "la génération 3D n'a pas pu démarrer : " + err.Error()})
		return
	}
	c.JSON(http.StatusAccepted, gin.H{"task_id": taskID})
}

// Check reports where a task stands and stores the model once it has succeeded.
//
// GET /api/garden/plants/:id/model/generate/:taskId
//
//	→ { "status": "pending" | "running" | "succeeded" | "failed", "progress": 0-100, "error"?: "..." }
func (h *PlantModelGenHandler) Check(c *gin.Context) {
	task, err := h.generator.Check(c.Param("taskId"))
	if errors.Is(err, modelgen.ErrUnknownTask) {
		c.JSON(http.StatusNotFound, gin.H{"error": "tâche de génération inconnue"})
		return
	}
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "impossible de suivre la génération : " + err.Error()})
		return
	}

	if task.Status == modelgen.StatusSucceeded && task.Model != nil {
		if err := h.gardenService.SetPlantModel(c.GetString("userID"), c.Param("id"), task.Model); err != nil {
			respondGardenError(c, err, "failed to store 3D model")
			return
		}
	}

	response := gin.H{"status": task.Status, "progress": task.Progress}
	if task.Error != "" {
		response["error"] = task.Error
	}
	c.JSON(http.StatusOK, response)
}
