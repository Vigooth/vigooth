package handler

import (
	"errors"
	"io"
	"net/http"

	"github.com/Vigooth/vigooth/services/api/internal/model"
	"github.com/Vigooth/vigooth/services/api/internal/repository"
	"github.com/Vigooth/vigooth/services/api/internal/service"
	"github.com/gin-gonic/gin"
)

type GardenHandler struct {
	gardenService *service.GardenService
}

func NewGardenHandler(gardenService *service.GardenService) *GardenHandler {
	return &GardenHandler{gardenService: gardenService}
}

// respondGardenError maps the service and repository sentinels onto status
// codes, so each handler below stays a straight line.
func respondGardenError(c *gin.Context, err error, fallback string) {
	switch {
	case errors.Is(err, repository.ErrGardenNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
	case errors.Is(err, repository.ErrGardenNoPhoto):
		c.JSON(http.StatusNotFound, gin.H{"error": "no photo for this plant"})
	case errors.Is(err, service.ErrInvalidDate), errors.Is(err, service.ErrDatesReversed):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	case errors.Is(err, service.ErrPhotoTooLarge):
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": err.Error()})
	case errors.Is(err, service.ErrPhotoUnsupported):
		c.JSON(http.StatusUnsupportedMediaType, gin.H{"error": err.Error()})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": fallback})
	}
}

// GetGarden returns beds, plants, occupations and computed conflicts together.
func (h *GardenHandler) GetGarden(c *gin.Context) {
	garden, err := h.gardenService.GetGarden(c.GetString("userID"))
	if err != nil {
		respondGardenError(c, err, "failed to load garden")
		return
	}
	c.JSON(http.StatusOK, garden)
}

// GetPublicGarden serves someone's garden to an unauthenticated visitor.
//
// The user id comes from the path instead of a token, which is the whole
// difference from GetGarden — the service is already parameterised by user, so
// there is no second read path to keep in step. Knowing the id is the only thing
// gating access, so this exposes a garden to anyone who has the link.
func (h *GardenHandler) GetPublicGarden(c *gin.Context) {
	garden, err := h.gardenService.GetGarden(c.Param("userId"))
	if err != nil {
		respondGardenError(c, err, "failed to load garden")
		return
	}
	c.JSON(http.StatusOK, garden)
}

// GetPublicPlantPhoto serves a plant photo without a session.
//
// Public read would be pointless without this: the plant cards are traced
// photographs, and an anonymous visitor with no photos sees empty frames. Note
// the consequence — these bytes are readable by anyone holding the garden link.
func (h *GardenHandler) GetPublicPlantPhoto(c *gin.Context) {
	data, mime, err := h.gardenService.GetPlantPhoto(c.Param("userId"), c.Param("id"))
	if err != nil {
		respondGardenError(c, err, "failed to load photo")
		return
	}
	if mime == "" {
		mime = "application/octet-stream"
	}
	// Public, so a shared cache may hold it — unlike the authenticated route.
	c.Header("Cache-Control", "public, max-age=300")
	c.Data(http.StatusOK, mime, data)
}

// --- Beds

func (h *GardenHandler) CreateBed(c *gin.Context) {
	var req model.SaveBedRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	bed, err := h.gardenService.CreateBed(c.GetString("userID"), &req)
	if err != nil {
		respondGardenError(c, err, "failed to create bed")
		return
	}
	c.JSON(http.StatusCreated, bed)
}

func (h *GardenHandler) UpdateBed(c *gin.Context) {
	var req model.SaveBedRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	bed, err := h.gardenService.UpdateBed(c.GetString("userID"), c.Param("id"), &req)
	if err != nil {
		respondGardenError(c, err, "failed to update bed")
		return
	}
	c.JSON(http.StatusOK, bed)
}

func (h *GardenHandler) DeleteBed(c *gin.Context) {
	if err := h.gardenService.DeleteBed(c.GetString("userID"), c.Param("id")); err != nil {
		respondGardenError(c, err, "failed to delete bed")
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "bed deleted"})
}

// --- Plants

func (h *GardenHandler) CreatePlant(c *gin.Context) {
	var req model.SavePlantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	plant, err := h.gardenService.CreatePlant(c.GetString("userID"), &req)
	if err != nil {
		respondGardenError(c, err, "failed to create plant")
		return
	}
	c.JSON(http.StatusCreated, plant)
}

func (h *GardenHandler) UpdatePlant(c *gin.Context) {
	var req model.SavePlantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	plant, err := h.gardenService.UpdatePlant(c.GetString("userID"), c.Param("id"), &req)
	if err != nil {
		respondGardenError(c, err, "failed to update plant")
		return
	}
	c.JSON(http.StatusOK, plant)
}

func (h *GardenHandler) DeletePlant(c *gin.Context) {
	if err := h.gardenService.DeletePlant(c.GetString("userID"), c.Param("id")); err != nil {
		respondGardenError(c, err, "failed to delete plant")
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "plant deleted"})
}

// UploadPlantPhoto takes raw image bytes with the type in Content-Type, rather
// than a multipart form: the client already has a Blob in hand after downscaling
// on a canvas, so a plain body avoids wrapping and unwrapping it for nothing.
func (h *GardenHandler) UploadPlantPhoto(c *gin.Context) {
	// Read one byte past the ceiling so an oversized body is rejected on its
	// size rather than silently truncated to the limit.
	body := http.MaxBytesReader(c.Writer, c.Request.Body, service.MaxPhotoBytes+1)
	data, err := io.ReadAll(body)
	if err != nil {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "photo exceeds the maximum size"})
		return
	}

	mime := c.ContentType()
	if err := h.gardenService.SetPlantPhoto(c.GetString("userID"), c.Param("id"), data, mime); err != nil {
		respondGardenError(c, err, "failed to store photo")
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "photo stored"})
}

// GetPlantPhoto streams the stored bytes.
//
// The client fetches this with credentials and turns the response into a blob
// URL before handing it to the tracer. That matters: a cross-origin <img> would
// taint the canvas and make the pixels unreadable, and it could not carry the
// auth cookie either.
func (h *GardenHandler) GetPlantPhoto(c *gin.Context) {
	data, mime, err := h.gardenService.GetPlantPhoto(c.GetString("userID"), c.Param("id"))
	if err != nil {
		respondGardenError(c, err, "failed to load photo")
		return
	}
	if mime == "" {
		mime = "application/octet-stream"
	}
	// Private: this is one user's photo behind an auth cookie, so no shared cache
	// may keep a copy.
	c.Header("Cache-Control", "private, max-age=300")
	c.Data(http.StatusOK, mime, data)
}

// --- Plan photo

// servePhoto writes image bytes with the right caching for its audience.
func servePhoto(c *gin.Context, data []byte, mime string, public bool) {
	if mime == "" {
		mime = "application/octet-stream"
	}
	if public {
		c.Header("Cache-Control", "public, max-age=300")
	} else {
		// One user's image behind an auth cookie: no shared cache may keep it.
		c.Header("Cache-Control", "private, max-age=300")
	}
	c.Data(http.StatusOK, mime, data)
}

func (h *GardenHandler) UploadPlanPhoto(c *gin.Context) {
	body := http.MaxBytesReader(c.Writer, c.Request.Body, service.MaxPhotoBytes+1)
	data, err := io.ReadAll(body)
	if err != nil {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "photo exceeds the maximum size"})
		return
	}

	if err := h.gardenService.SetPlanPhoto(c.GetString("userID"), data, c.ContentType()); err != nil {
		respondGardenError(c, err, "failed to store the plan photo")
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "plan photo stored"})
}

func (h *GardenHandler) GetPlanPhoto(c *gin.Context) {
	data, mime, err := h.gardenService.GetPlanPhoto(c.GetString("userID"))
	if err != nil {
		respondGardenError(c, err, "failed to load the plan photo")
		return
	}
	servePhoto(c, data, mime, false)
}

// GetPublicPlanPhoto serves the plan backdrop to a visitor.
//
// This is the reason the plan photo moved out of localStorage at all: bed
// outlines over an empty frame tell a visitor nothing about the garden.
func (h *GardenHandler) GetPublicPlanPhoto(c *gin.Context) {
	data, mime, err := h.gardenService.GetPlanPhoto(c.Param("userId"))
	if err != nil {
		respondGardenError(c, err, "failed to load the plan photo")
		return
	}
	servePhoto(c, data, mime, true)
}

func (h *GardenHandler) DeletePlanPhoto(c *gin.Context) {
	if err := h.gardenService.DeletePlanPhoto(c.GetString("userID")); err != nil {
		respondGardenError(c, err, "failed to remove the plan photo")
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "plan photo removed"})
}

// --- Viewpoints

func (h *GardenHandler) CreateViewpoint(c *gin.Context) {
	var req model.SaveViewpointRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	viewpoint, err := h.gardenService.CreateViewpoint(c.GetString("userID"), &req)
	if err != nil {
		respondGardenError(c, err, "failed to create viewpoint")
		return
	}
	c.JSON(http.StatusCreated, viewpoint)
}

func (h *GardenHandler) UpdateViewpoint(c *gin.Context) {
	var req model.SaveViewpointRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	viewpoint, err := h.gardenService.UpdateViewpoint(c.GetString("userID"), c.Param("id"), &req)
	if err != nil {
		respondGardenError(c, err, "failed to update viewpoint")
		return
	}
	c.JSON(http.StatusOK, viewpoint)
}

func (h *GardenHandler) DeleteViewpoint(c *gin.Context) {
	if err := h.gardenService.DeleteViewpoint(c.GetString("userID"), c.Param("id")); err != nil {
		respondGardenError(c, err, "failed to delete viewpoint")
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "viewpoint deleted"})
}

// UploadViewpointPanorama takes raw image bytes with the type in Content-Type,
// as the plant and plan photo endpoints do.
func (h *GardenHandler) UploadViewpointPanorama(c *gin.Context) {
	body := http.MaxBytesReader(c.Writer, c.Request.Body, service.MaxPanoramaBytes+1)
	data, err := io.ReadAll(body)
	if err != nil {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "panorama exceeds the maximum size"})
		return
	}

	if err := h.gardenService.SetViewpointPhoto(
		c.GetString("userID"), c.Param("id"), data, c.ContentType(),
	); err != nil {
		respondGardenError(c, err, "failed to store the panorama")
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "panorama stored"})
}

func (h *GardenHandler) GetViewpointPanorama(c *gin.Context) {
	data, mime, err := h.gardenService.GetViewpointPhoto(c.GetString("userID"), c.Param("id"))
	if err != nil {
		respondGardenError(c, err, "failed to load the panorama")
		return
	}
	servePhoto(c, data, mime, false)
}

// GetPublicViewpointPanorama serves a panorama to a visitor. Without it a shared
// garden would list the tour's viewpoints and show none of them.
func (h *GardenHandler) GetPublicViewpointPanorama(c *gin.Context) {
	data, mime, err := h.gardenService.GetViewpointPhoto(c.Param("userId"), c.Param("id"))
	if err != nil {
		respondGardenError(c, err, "failed to load the panorama")
		return
	}
	servePhoto(c, data, mime, true)
}

// --- Occupations

func (h *GardenHandler) CreateOccupation(c *gin.Context) {
	var req model.SaveOccupationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	occupation, err := h.gardenService.CreateOccupation(c.GetString("userID"), &req)
	if err != nil {
		respondGardenError(c, err, "failed to create occupation")
		return
	}
	c.JSON(http.StatusCreated, occupation)
}

func (h *GardenHandler) UpdateOccupation(c *gin.Context) {
	var req model.SaveOccupationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	occupation, err := h.gardenService.UpdateOccupation(c.GetString("userID"), c.Param("id"), &req)
	if err != nil {
		respondGardenError(c, err, "failed to update occupation")
		return
	}
	c.JSON(http.StatusOK, occupation)
}

func (h *GardenHandler) DeleteOccupation(c *gin.Context) {
	if err := h.gardenService.DeleteOccupation(c.GetString("userID"), c.Param("id")); err != nil {
		respondGardenError(c, err, "failed to delete occupation")
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "occupation deleted"})
}
